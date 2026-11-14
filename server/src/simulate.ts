// The functions of the simulator for a live demo. Each one has an effect at once:
// set a value now and hold it, send a test alert to a role or a person, ask one check-up
// by hand, reset the mission between two runs, and choose what the audience screen shows.
//
// Honest data: a value that the simulator sets has the source "admin" (the page shows
// "Simulator"). A test alert and a test check-up say "TEST" in their text and in the log.
import type { Request, Response, Router } from 'express'
import { runCrewPatterns } from './crew.ts'
import { HOUR_MS } from './dataset.ts'
import { db, transaction } from './db.ts'
import { lowerFirst, tx } from './i18n.ts'
import { indicatorById, valueText } from './indicators.ts'
import { GROUND_TEAM, ROLES, emit, isRole, recordReading } from './monitor.ts'
import { ruleById, runRules } from './rules.ts'
import { advance, crewOf, findMission, reloadRecord, setOffsets, stopAutoRun, type Offsets } from './simulator.ts'

db.exec(`
  -- What the presenter wants the audience screen to show. Each change raises "rev",
  -- and each open dashboard then follows.
  CREATE TABLE IF NOT EXISTS stage (
    mission_id TEXT PRIMARY KEY,
    crew_id INTEGER,
    mode TEXT,
    sheet TEXT,
    rev INTEGER NOT NULL DEFAULT 0
  );
`)

export function stageOf(missionId: string) {
  const row = db.prepare(`SELECT crew_id AS crewId, mode, sheet, rev FROM stage WHERE mission_id = ?`).get(missionId)
  return (row ?? { crewId: null, mode: null, sheet: null, rev: 0 }) as { crewId: number | null; mode: string | null; sheet: string | null; rev: number }
}

const MODES = ['readiness', 'bridge', 'companion']
const SHEETS = ['body', 'cabin', 'checkups', 'alerts', 'history', 'log']

type Helpers = { idOf: (request: Request) => string; done: (request: Request, response: Response) => void }

export function addSimulatorRoutes(mission: Router, { idOf, done }: Helpers) {
  const fail = (response: Response, error: string) => {
    response.status(400).json({ error })
  }
  const nowHour = (missionId: string) => findMission(missionId)!.sim_hour - 1

  // Checks that the subject exists and that the indicator belongs to it.
  // Returns the name of the crew member for the log, "cabin" for the cabin, or null if the pair is wrong.
  function nameOf(missionId: string, subject: unknown, indicatorId: unknown): string | null {
    const indicator = typeof indicatorId === 'string' ? indicatorById.get(indicatorId) : undefined
    if (!indicator || typeof subject !== 'string') return null
    if (subject === 'env') return indicator.kind === 'environment' ? 'cabin' : null
    const member = crewOf(missionId).find((candidate) => `crew:${candidate.id}` === subject)
    return member && indicator.kind === 'vital' ? member.name : null
  }

  // Set one value now. The simulator also keeps the value in the next hours (it changes the
  // offset of this value). "value": null goes back to the record. "hours" moves the clock
  // after the change, for a rule that needs some hours of data.
  mission.post('/simulate/set', (request, response) => {
    const id = idOf(request)
    const { subject, indicator: indicatorId, value } = request.body ?? {}
    const who = nameOf(id, subject, indicatorId)
    if (!who || !(value === null || (typeof value === 'number' && Number.isFinite(value)))) {
      return fail(response, tx('Send subject ("env" or "crew:<id>"), an indicator of that subject, and value (a number, or null for the record).'))
    }
    const indicator = indicatorById.get(indicatorId)!
    const offsets = JSON.parse(findMission(id)!.offsets) as Offsets
    const key = `${subject}:${indicatorId}`
    const oldOffset = offsets[key] ?? 0
    const hour = nowHour(id)
    const newest = db
      .prepare(`SELECT value FROM readings WHERE mission_id = ? AND subject = ? AND indicator = ? ORDER BY hour DESC, id DESC LIMIT 1`)
      .get(id, subject, indicatorId) as { value: number } | undefined
    // The value of the record or of the model, with no change of the simulator.
    const base = newest ? newest.value - oldOffset : (value ?? 0)
    const target = value ?? base
    setOffsets(id, { ...offsets, [key]: target - base })
    transaction(() => {
      // One value for each hour: a second change in the same hour replaces the first.
      db.prepare(`DELETE FROM readings WHERE mission_id = ? AND subject = ? AND indicator = ? AND hour = ? AND source = 'admin'`).run(id, subject, indicatorId, hour)
      recordReading(id, hour, { subject, indicator: indicatorId, value: Number(target.toFixed(indicator.decimals + 1)), source: 'admin' })
      // The cabin and a crew member have their own sentences, because the word order differs in other languages.
      const cabin = subject === 'env'
      const label = lowerFirst(indicator.label)
      const text =
        value === null
          ? cabin
            ? tx('Set cabin {label} back to the record.', { label })
            : tx('Set {name} {label} back to the record.', { name: who, label })
          : cabin
            ? tx('Set cabin {label} to {value} now.', { label, value: valueText(indicator, target) })
            : tx('Set {name} {label} to {value} now.', { name: who, label, value: valueText(indicator, target) })
      emit(id, hour, 'simulator', 'simulator.set', text)
      runRules(id, hour)
      runCrewPatterns(id, hour)
    })
    const hours = Math.min(Math.max(Math.round(Number(request.body?.hours) || 0), 0), 24)
    if (hours > 0) advance(id, hours)
    done(request, response)
  })

  // A test alert to some roles, to some crew members, or to the ground. No reading is behind it.
  mission.post('/simulate/notification', (request, response) => {
    const id = idOf(request)
    const body = request.body ?? {}
    const roles: string[] = Array.isArray(body.roles) ? body.roles.filter(isRole) : []
    const crewIds: number[] = Array.isArray(body.crewIds) ? body.crewIds.map(Number) : []
    const crew = crewOf(id).filter((member) => roles.includes(member.role) || crewIds.includes(member.id))
    const ground = Boolean(body.ground)
    if (crew.length === 0 && !ground) return fail(response, tx('No crew member matches. Send roles, crewIds, or ground: true.'))
    const severity = [0, 1, 2].includes(body.severity) ? (body.severity as number) : 2
    // The title and the text that the presenter typed stay as they are. The words around them get a translation.
    const title = tx('TEST: {title}', { title: typeof body.title === 'string' && body.title.trim() ? body.title.trim().slice(0, 80) : tx('This is a test alert') })
    const text = `${typeof body.body === 'string' && body.body.trim() ? body.body.trim().slice(0, 300) + ' ' : ''}${tx('The simulator sent this test. No reading is behind it.')}`
    const hour = nowHour(id)
    const topic = `test:${Date.now()}`
    const insert = db.prepare(`INSERT INTO notifications (mission_id, crew_id, severity, title, body, topic, hour) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    transaction(() => {
      for (const member of crew) insert.run(id, member.id, severity, title, text, topic, hour)
      if (ground) insert.run(id, null, severity, title, text, topic, hour)
      const names = crew.map((member) => member.name)
      if (ground) names.push(GROUND_TEAM)
      emit(id, hour, 'simulator', 'test.notification', tx('TEST: the simulator sent "{title}" to {names}.', { title, names: names.join(', ') }))
    })
    done(request, response)
  })

  // One check-up for one crew member, by hand.
  mission.post('/simulate/checkup', (request, response) => {
    const id = idOf(request)
    const crewId = Number(request.body?.crewId)
    const rule = ruleById.get(String(request.body?.ruleId))
    const member = crewOf(id).find((candidate) => candidate.id === crewId)
    if (!rule || !member) return fail(response, tx('Send crewId and ruleId.'))
    const hour = nowHour(id)
    db.prepare(`INSERT INTO checkups (mission_id, crew_id, rule_id, reason, hour) VALUES (?, ?, ?, ?, ?)`).run(
      id,
      crewId,
      rule.id,
      tx('TEST from the simulator. No reading started this question.'),
      hour,
    )
    emit(id, hour, 'simulator', 'test.checkup', tx('TEST: the simulator asked {name}: "{question}"', { name: member.name, question: rule.question }))
    done(request, response)
  })

  // Reset between two demo runs. The address of the mission, the crew and the roles stay.
  //   scope "alerts": remove the alerts, questions, symptoms and claims, and all changes of the simulator.
  //   scope "mission": also remove all readings and the log, and load the NASA record again.
  mission.post('/simulate/reset', (request, response) => {
    const id = idOf(request)
    const full = request.body?.scope === 'mission'
    if (full) stopAutoRun(id)
    transaction(() => {
      const tables = ['notifications', 'checkups', 'claims', 'symptoms', 'indicator_status']
      if (full) tables.push('readings', 'insights', 'events')
      for (const table of tables) db.prepare(`DELETE FROM ${table} WHERE mission_id = ?`).run(id)
      // The values that the simulator made also go. If they stay, the rules ask the same questions again.
      if (!full) db.prepare(`DELETE FROM readings WHERE mission_id = ? AND source = 'admin'`).run(id)
      setOffsets(id, {})
      if (full) reloadRecord(id)
    })
    emit(id, nowHour(id), 'simulator', 'simulator.reset', full ? tx('Reset the mission to the end of the NASA record.') : tx('Removed the alerts, questions and symptoms, and all changes of the simulator.'))
    // One new hour of plain record values, so each screen shows the clean state.
    if (!full) advance(id, 1)
    done(request, response)
  })

  // Choose what the audience screen shows: the crew member, the home view, and the open screen.
  mission.post('/simulate/stage', (request, response) => {
    const id = idOf(request)
    const current = stageOf(id)
    const body = request.body ?? {}
    const crewId = crewOf(id).some((member) => member.id === Number(body.crewId)) ? Number(body.crewId) : current.crewId
    const mode = MODES.includes(body.mode) ? body.mode : current.mode
    const sheet = body.sheet === null ? null : SHEETS.includes(body.sheet) ? body.sheet : 'sheet' in body ? null : current.sheet
    db.prepare(
      `INSERT INTO stage (mission_id, crew_id, mode, sheet, rev) VALUES (?, ?, ?, ?, 1)
       ON CONFLICT (mission_id) DO UPDATE SET crew_id = excluded.crew_id, mode = excluded.mode, sheet = excluded.sheet, rev = rev + 1`,
    ).run(id, crewId, mode, sheet)
    done(request, response)
  })

  // Move the clock to the next time that the day reaches this hour, for example 7 for the morning values.
  mission.post('/simulate/advance-to', (request, response) => {
    const id = idOf(request)
    const wanted = Math.min(23, Math.max(0, Math.round(Number(request.body?.hourOfDay) || 0)))
    const row = findMission(id)!
    const now = new Date(Date.parse(row.start_time) + (row.sim_hour - 1) * HOUR_MS).getUTCHours()
    const hours = (wanted - now + 24) % 24 || 24
    emit(id, nowHour(id), 'simulator', 'clock.advanced', tx('Moved the mission clock forward by {hours} hours, to {time}.', { hours, time: `${String(wanted).padStart(2, '0')}:00` }))
    advance(id, hours)
    done(request, response)
  })
}

export const simulatorCatalog = { roles: ROLES.map((role) => role.id), modes: MODES, sheets: SHEETS }
