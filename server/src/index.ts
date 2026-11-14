import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import express, { type Request, type Response } from 'express'
import { baselineOf, missionDayOf } from './causes.ts'
import { addAssistantRoutes, modelIsOn } from './assistant.ts'
import { answerCheckup, crewName, endClaim, hourOf, markRead, reportSymptom, startClaim } from './actions.ts'
import { claimsOf } from './claims.ts'
import { crewFindings, runCrewPatterns } from './crew.ts'
import { db, transaction } from './db.ts'
import { HOUR_MS, dataset } from './dataset.ts'
import { addHistoryRoutes } from './history.ts'
import { LANGS, langOf, lowerFirst, missing, render, translateResponses, tx, txn } from './i18n.ts'
import { BODY_PARTS, INDICATORS, indicatorById, num, statusOf, type BodyPart } from './indicators.ts'
import { getSettings, insightCatalog, recentInsights, requestInsight, saveSettings, startInsights } from './insights/index.ts'
import { ROLES, emit, isRole, recordReading } from './monitor.ts'
import { RELATIONS } from './relations.ts'
import { RULES, runRules } from './rules.ts'
import { addSimulatorRoutes, stageOf } from './simulate.ts'
import {
  SCENARIOS,
  addCrew,
  advance,
  createMission,
  crewOf,
  deleteMission,
  findMission,
  resumeAutoRuns,
  setOffsets,
  setRole,
  startAutoRun,
  stopAutoRun,
  type Offsets,
} from './simulator.ts'

const port = Number(process.env.PORT ?? 3001)
const app = express()
app.use(express.json())
// Each response leaves the server in the language of the request. See i18n.ts.
app.use(translateResponses)
// For people who translate: the English texts that a language has no translation for yet.
app.get('/api/i18n/missing', (_request, response) => {
  response.json({ languages: LANGS, missing: Object.fromEntries(Object.entries(missing).map(([lang, texts]) => [lang, [...texts].sort()])) })
})

// Each open page keeps one connection here (Server-Sent Events). The server sends "changed"
// when the data of the mission changes, and the page then loads the new data. This is how
// a phone that controls the simulator updates the dashboard on another screen.
const listeners = new Map<string, Set<Response>>()
const lastEventId = db.prepare(`SELECT max(id) AS id FROM events WHERE mission_id = ?`)
function notify(missionId: string) {
  const id = lastEventId.get(missionId)?.id ?? 0
  for (const response of listeners.get(missionId) ?? []) response.write(`id: ${id}\ndata: changed\n\n`)
}
// A comment line each 25 seconds keeps the connection open through proxies.
setInterval(() => {
  for (const group of listeners.values()) for (const response of group) response.write(': ping\n\n')
}, 25_000).unref()

function snapshot(missionId: string) {
  const mission = findMission(missionId)
  if (!mission) return null
  const latest = db
    .prepare(
      `SELECT subject, indicator, value, hour, source FROM readings
       WHERE id IN (SELECT max(id) FROM readings WHERE mission_id = ? GROUP BY subject, indicator)`,
    )
    .all(missionId)
    .map((row) => ({ ...row, status: statusOf(row.indicator as string, row.value as number) }))
  const symptoms = db
    .prepare(
      `SELECT id, crew_id AS crewId, body_part AS bodyPart, name, status, hour, resolved_hour AS resolvedHour, explanation
       FROM symptoms WHERE mission_id = ? ORDER BY id DESC LIMIT 100`,
    )
    .all(missionId)
    // The possible causes that the server found at the time of the report. null for old rows.
    .map((row) => ({ ...row, explanation: row.explanation ? JSON.parse(row.explanation as string) : null }))
  const checkups = db
    .prepare(
      `SELECT id, crew_id AS crewId, rule_id AS ruleId, status, reason, hour, answered_hour AS answeredHour
       FROM checkups WHERE mission_id = ? ORDER BY (status = 'pending') DESC, id DESC LIMIT 60`,
    )
    .all(missionId)
  const notifications = db
    .prepare(
      `SELECT id, crew_id AS crewId, severity, title, body, topic, hour, read_hour AS readHour
       FROM notifications WHERE mission_id = ? ORDER BY id DESC LIMIT 120`,
    )
    .all(missionId)
  const events = db
    .prepare(`SELECT id, hour, actor, type, summary FROM events WHERE mission_id = ? ORDER BY id DESC LIMIT 80`)
    .all(missionId)
  const hour = mission.sim_hour - 1
  const crew = crewOf(missionId)
  // The personal baseline of each indicator of each crew member. The charts can draw it as a line.
  const baselines: Record<string, Record<string, number>> = {}
  for (const member of crew) {
    const subject = `crew:${member.id}`
    baselines[subject] = {}
    for (const indicator of INDICATORS) {
      if (indicator.kind !== 'vital') continue
      const value = baselineOf(missionId, subject, indicator.id, hour)
      if (value !== null) baselines[subject][indicator.id] = Number(value.toFixed(indicator.decimals + 1))
    }
  }
  return {
    mission: {
      id: mission.id,
      name: mission.name,
      startTime: mission.start_time,
      hour: mission.sim_hour,
      // The time of the newest readings.
      now: new Date(Date.parse(mission.start_time) + (mission.sim_hour - 1) * HOUR_MS).toISOString(),
      autoRun: mission.auto_run === 1,
      offsets: JSON.parse(mission.offsets) as Offsets,
      recordHours: dataset.hours,
    },
    crew,
    missionDay: missionDayOf(hour),
    baselines,
    // Patterns across the crew: a shared symptom, one crew member against the rest, a trend of the whole crew.
    findings: crewFindings(missionId, hour),
    latest,
    symptoms,
    checkups,
    notifications,
    // What the presenter chose for the audience screen, and how many pages are open on this mission.
    stage: stageOf(missionId),
    // true if the assistant uses the language model for this mission. false: it uses the fixed rules.
    assistantModel: modelIsOn(missionId),
    viewers: listeners.get(missionId)?.size ?? 0,
    // Who said "I am on it" for which problem.
    claims: claimsOf(missionId, mission.sim_hour - 1),
    events,
    llm: getSettings(missionId),
    insights: recentInsights(missionId),
  }
}

app.get('/api/catalog', (_request, response) => {
  response.json({
    indicators: INDICATORS,
    bodyParts: BODY_PARTS,
    roles: ROLES,
    rules: RULES.map(({ test: _test, ...rule }) => rule),
    // The relations between indicators, with what the model of the vitals does with each one.
    relations: RELATIONS,
    scenarios: Object.entries(SCENARIOS).map(([id, { label, about }]) => ({ id, label, about })),
    dataset,
    llmProviders: insightCatalog.providers,
  })
})

app.get('/api/missions', (_request, response) => {
  response.json(
    db.prepare(`SELECT id, name, sim_hour AS hour, created_at AS createdAt FROM missions ORDER BY created_at DESC`).all(),
  )
})

app.post('/api/missions', (request, response) => {
  const name = typeof request.body?.name === 'string' ? request.body.name.trim().slice(0, 60) : ''
  if (!name) {
    response.status(400).json({ error: tx('Send a name for the mission.') })
    return
  }
  response.status(201).json({ id: createMission(name) })
})

// All routes below need a mission that exists.
const mission = express.Router({ mergeParams: true })
app.use(
  '/api/missions/:missionId',
  (request, response, next) => {
    if (!findMission(String(request.params.missionId))) {
      response.status(404).json({ error: tx('This mission does not exist.') })
      return
    }
    next()
  },
  mission,
)

const idOf = (request: Request) => (request.params as { missionId: string }).missionId
// Who does the action. The page sends "simulator" or "crew:<id>". The server has no login yet.
const actorOf = (request: Request) => String(request.get('x-actor') ?? 'system').slice(0, 40)
function done(request: Request, response: Response) {
  notify(idOf(request))
  response.json(snapshot(idOf(request)))
}

mission.get('/', (request, response) => {
  response.json(snapshot(idOf(request)))
})

mission.delete('/', (request, response) => {
  deleteMission(idOf(request))
  notify(idOf(request))
  response.json({ deleted: true })
})

mission.get('/events', (request, response) => {
  const id = idOf(request)
  response.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
  })
  response.write('retry: 2000\n\n')
  if (!listeners.has(id)) listeners.set(id, new Set())
  listeners.get(id)!.add(response)
  request.on('close', () => listeners.get(id)?.delete(response))
})

// The history of all indicators of one subject ("env" or "crew:<id>") for the last hours.
// Each point is [hour, value, source].
mission.get('/series', (request, response) => {
  const id = idOf(request)
  const subject = String(request.query.subject ?? 'env')
  const hours = Math.min(Number(request.query.hours) || 168, 100_000)
  const from = findMission(id)!.sim_hour - hours
  const rows = db
    .prepare(
      `SELECT indicator, hour, value, source FROM readings
       WHERE mission_id = ? AND subject = ? AND hour >= ? ORDER BY hour, id`,
    )
    .all(id, subject, from) as { indicator: string; hour: number; value: number; source: string }[]
  const series: Record<string, [number, number, string][]> = {}
  for (const row of rows) (series[row.indicator] ??= []).push([row.hour, row.value, row.source])
  response.json(series)
})

mission.post('/advance', (request, response) => {
  const id = idOf(request)
  const hours = Math.min(Math.max(Math.round(Number(request.body?.hours) || 1), 1), 24 * 14)
  emit(id, hourOf(id), actorOf(request), 'clock.advanced', txn(hours, 'Moved the mission clock forward by {count} hour.', 'Moved the mission clock forward by {count} hours.'))
  advance(id, hours)
  done(request, response)
})

mission.post('/auto-run', (request, response) => {
  const id = idOf(request)
  const enabled = Boolean(request.body?.enabled)
  if (enabled) startAutoRun(id, notify)
  else stopAutoRun(id)
  emit(id, hourOf(id), actorOf(request), 'clock.auto_run', enabled ? tx('Started the mission clock.') : tx('Stopped the mission clock.'))
  done(request, response)
})

// Describes the offsets in words, for the history.
function describeOffsets(missionId: string, offsets: Offsets) {
  const crew = crewOf(missionId)
  const parts = Object.entries(offsets).map(([key, value]) => {
    const indicator = indicatorById.get(key.slice(key.lastIndexOf(':') + 1))
    const label = indicator ? lowerFirst(indicator.label) : key
    // The change with its sign and its unit, for example "+1.2 mmHg".
    const change = `${value > 0 ? '+' : ''}${num(value)}${indicator ? ` ${indicator.unit}` : ''}`
    if (key.startsWith('env:')) return tx('cabin {label} {change}', { label, change })
    const name = crew.find((member) => key.startsWith(`crew:${member.id}:`))?.name
    return name ? tx('{name} {label} {change}', { name, label, change }) : tx('crew {label} {change}', { label, change })
  })
  return parts.length ? parts.join(', ') : tx('none')
}

mission.post('/offsets', (request, response) => {
  const id = idOf(request)
  setOffsets(id, request.body?.offsets ?? {})
  const offsets = JSON.parse(findMission(id)!.offsets) as Offsets
  emit(id, hourOf(id), actorOf(request), 'simulator.offsets', tx('Set the simulator changes: {changes}.', { changes: describeOffsets(id, offsets) }))
  done(request, response)
})

mission.post('/scenario', (request, response) => {
  const id = idOf(request)
  const scenario = SCENARIOS[String(request.body?.id)]
  if (!scenario) {
    response.status(400).json({ error: tx('This scenario does not exist.') })
    return
  }
  const current = JSON.parse(findMission(id)!.offsets) as Offsets
  setOffsets(id, { ...current, ...scenario.offsets(crewOf(id).map((member) => member.id)) })
  emit(id, hourOf(id), actorOf(request), 'simulator.scenario', tx('Started the scenario "{label}".', { label: scenario.label }))
  done(request, response)
})

mission.post('/crew', (request, response) => {
  const id = idOf(request)
  const name = typeof request.body?.name === 'string' ? request.body.name.trim().slice(0, 40) : ''
  const role = request.body?.role
  if (!name || !isRole(role)) {
    response.status(400).json({ error: tx('Send a name and a role.') })
    return
  }
  addCrew(id, name, role)
  const label = ROLES.find((candidate) => candidate.id === role)!.label
  emit(id, hourOf(id), actorOf(request), 'crew.added', tx('Added {name} to the crew as {role}.', { name, role: lowerFirst(label) }))
  done(request, response)
})

mission.post('/crew/:crewId/role', (request, response) => {
  const id = idOf(request)
  const crewId = Number(request.params.crewId)
  const role = request.body?.role
  if (!isRole(role)) {
    response.status(400).json({ error: tx('This role does not exist.') })
    return
  }
  setRole(id, crewId, role)
  const label = ROLES.find((candidate) => candidate.id === role)!.label
  emit(id, hourOf(id), actorOf(request), 'crew.role', tx('Changed the role of {name} to {role}.', { name: crewName(id, crewId), role: lowerFirst(label) }))
  done(request, response)
})

// One measurement that a person types in. It gets the time of the newest readings.
mission.post('/readings', (request, response) => {
  const id = idOf(request)
  const { subject, indicator, value } = request.body ?? {}
  // The subject must exist, and the indicator must belong to it.
  const knownSubject =
    typeof subject === 'string' &&
    indicatorById.has(indicator) &&
    (subject === 'env'
      ? indicatorById.get(indicator)!.kind === 'environment'
      : indicatorById.get(indicator)!.kind === 'vital' && crewOf(id).some((member) => `crew:${member.id}` === subject))
  if (!knownSubject || typeof value !== 'number' || !Number.isFinite(value)) {
    response.status(400).json({ error: tx('Send subject, indicator and value (a number).') })
    return
  }
  const hour = hourOf(id)
  const source = actorOf(request).startsWith('crew:') ? 'crew' : 'admin'
  transaction(() => {
    recordReading(id, hour, { subject, indicator, value, source })
    emit(id, hour, actorOf(request), 'reading.entered', tx('Entered {label}: {value}.', { label: lowerFirst(indicatorById.get(indicator)!.label), value: `${num(value)} ${indicatorById.get(indicator)!.unit}` }))
    runRules(id, hour)
    runCrewPatterns(id, hour)
  })
  done(request, response)
})

mission.post('/symptoms', (request, response) => {
  const id = idOf(request)
  const { crewId, bodyPart, name } = request.body ?? {}
  const valid =
    typeof crewId === 'number' && BODY_PARTS.includes(bodyPart as BodyPart) && typeof name === 'string' && name.trim()
  if (!valid) {
    response.status(400).json({ error: tx('Send crewId, bodyPart and name.') })
    return
  }
  reportSymptom(id, crewId, bodyPart as BodyPart, name, actorOf(request))
  done(request, response)
})

// The crew member reports that a symptom is gone.
mission.post('/symptoms/:symptomId/resolve', (request, response) => {
  const id = idOf(request)
  const symptom = db
    .prepare(`SELECT crew_id, name FROM symptoms WHERE id = ? AND mission_id = ? AND status = 'open'`)
    .get(Number(request.params.symptomId), id) as { crew_id: number; name: string } | undefined
  if (symptom) {
    db.prepare(`UPDATE symptoms SET status = 'resolved', resolved_hour = ? WHERE id = ?`).run(
      hourOf(id),
      Number(request.params.symptomId),
    )
    emit(id, hourOf(id), actorOf(request), 'symptom.resolved', tx('{name} reported that the symptom "{symptom}" is gone.', { name: crewName(id, symptom.crew_id), symptom: tx(symptom.name) }))
  }
  done(request, response)
})

// The crew member answers a check-up. "confirmed" also records the symptom of the rule
// and tells the people that the rule names.
mission.post('/checkups/:checkupId/answer', (request, response) => {
  const id = idOf(request)
  const answer = request.body?.answer === 'confirmed' ? 'confirmed' : 'dismissed'
  if (!answerCheckup(id, Number(request.params.checkupId), answer, actorOf(request))) {
    response.status(404).json({ error: tx('This check-up is not open.') })
    return
  }
  done(request, response)
})

// The settings of the language model for this mission.
mission.post('/llm', (request, response) => {
  const id = idOf(request)
  const body = request.body ?? {}
  const next = saveSettings(id, {
    enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
    provider: typeof body.provider === 'string' ? body.provider : undefined,
    model: typeof body.model === 'string' ? body.model : undefined,
    baseUrl: typeof body.baseUrl === 'string' ? body.baseUrl : undefined,
    autoOnAlert: typeof body.autoOnAlert === 'boolean' ? body.autoOnAlert : undefined,
    canNotify: typeof body.canNotify === 'boolean' ? body.canNotify : undefined,
  })
  emit(
    id,
    hourOf(id),
    actorOf(request),
    'llm.settings',
    next.enabled ? tx('Set the insights to {provider}, model {model}.', { provider: next.provider, model: next.model }) : tx('Turned the insights off.'),
  )
  done(request, response)
})

// Asks the model for an insight now. The result arrives later through the "changed" message.
// The model writes the insight in the language of the person who asks.
mission.post('/insights', (request, response) => {
  const problem = requestInsight(idOf(request), 'manual', actorOf(request), langOf(request))
  if (problem) {
    response.status(409).json({ error: problem })
    return
  }
  done(request, response)
})

addSimulatorRoutes(mission, { idOf, done })
addAssistantRoutes(mission, { idOf, notify })
addHistoryRoutes(mission, idOf)

// "I am on it": the crew member claims a problem. The topic is the topic of a notification.
mission.post('/claims', (request, response) => {
  const id = idOf(request)
  const topic = typeof request.body?.topic === 'string' ? request.body.topic.slice(0, 80) : ''
  const crewId = Number(actorOf(request).split(':')[1])
  if (!topic || !crewOf(id).some((member) => member.id === crewId)) {
    response.status(400).json({ error: tx('Send a topic, as a crew member.') })
    return
  }
  // The page sends the label in its own language. If the label is the title of a notification about
  // this topic, the log keeps the stored title. The log line then reads in the language of each reader.
  const sent = typeof request.body?.label === 'string' ? request.body.label.slice(0, 80) : topic
  const titles = db.prepare(`SELECT DISTINCT title FROM notifications WHERE mission_id = ? AND topic = ?`).all(id, topic) as { title: string }[]
  const label = titles.find((row) => render(row.title, langOf(request)).slice(0, 80) === sent)?.title ?? sent
  startClaim(id, crewId, topic, label, actorOf(request))
  done(request, response)
})

// The crew member reports that the work on a problem is done.
mission.post('/claims/:claimId/done', (request, response) => {
  const id = idOf(request)
  endClaim(id, Number(request.params.claimId), Number(actorOf(request).split(':')[1]), actorOf(request))
  done(request, response)
})

mission.post('/notifications/:notificationId/read', (request, response) => {
  const id = idOf(request)
  markRead(id, Number(request.params.notificationId))
  done(request, response)
})

// In production, the server also sends the built React app.
// In development, Vite serves the React app and forwards /api to this server.
const webDist = resolve(process.env.WEB_DIST ?? '../web/dist')
if (existsSync(webDist)) {
  app.use(express.static(webDist))
  app.use((_request, response) => {
    response.sendFile(join(webDist, 'index.html'))
  })
}

resumeAutoRuns(notify)
startInsights(notify)
app.listen(port, () => {
  console.log(`Nexxo server listens on http://localhost:${port}`)
})
