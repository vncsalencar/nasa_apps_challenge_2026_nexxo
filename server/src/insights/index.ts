// Optional insights from a language model. Each mission can turn them on or off.
// The fixed rules in rules.ts and monitor.ts always run. An insight only adds to them.
import { baselineOf } from '../causes.ts'
import { crewFindings } from '../crew.ts'
import { db } from '../db.ts'
import { HOUR_MS } from '../dataset.ts'
import { localize, tx, type Lang } from '../i18n.ts'
import { INDICATORS, statusOf } from '../indicators.ts'
import { RELATIONS } from '../relations.ts'
import { ROLES, emit, onAlert, sendToRoles, type RoleId } from '../monitor.ts'
import { anthropicProvider } from './anthropic.ts'
import { localProvider } from './local.ts'
import { Problem, systemPromptFor, type Insight, type Provider } from './schema.ts'

export const PROVIDERS = [
  {
    id: 'anthropic',
    label: tx('Claude (Anthropic API)'),
    defaultModel: 'claude-opus-5-5',
    defaultBaseUrl: '',
    about: tx('Needs a link to Earth and the variable ANTHROPIC_API_KEY on the server.'),
    run: anthropicProvider,
  },
  {
    id: 'local',
    label: tx('Local model (for example Ollama)'),
    defaultModel: 'llama3.2',
    defaultBaseUrl: process.env.LOCAL_LLM_BASE_URL ?? 'http://localhost:11434/v1',
    about: tx('Runs on a computer on board. Needs a server with the "chat completions" API.'),
    run: localProvider,
  },
] satisfies { id: string; label: string; defaultModel: string; defaultBaseUrl: string; about: string; run: Provider }[]

db.exec(`
  CREATE TABLE IF NOT EXISTS llm_settings (
    mission_id TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 0,
    provider TEXT NOT NULL DEFAULT 'anthropic',
    model TEXT NOT NULL DEFAULT '',
    base_url TEXT NOT NULL DEFAULT '',
    -- 1: ask for an insight when a status changes to alert.
    auto_on_alert INTEGER NOT NULL DEFAULT 0,
    -- 1: send the actions of an insight to the roles as notifications.
    can_notify INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS insights (
    id INTEGER PRIMARY KEY,
    mission_id TEXT NOT NULL,
    hour INTEGER NOT NULL,
    -- pending, done, or failed
    status TEXT NOT NULL,
    -- Why the app asked: "manual" or "alert".
    trigger TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    -- The insight as JSON (see schema.ts), or NULL.
    result TEXT,
    error TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
`)

export type LlmSettings = {
  enabled: boolean
  provider: string
  model: string
  baseUrl: string
  autoOnAlert: boolean
  canNotify: boolean
}

export function getSettings(missionId: string): LlmSettings {
  const row = db.prepare(`SELECT * FROM llm_settings WHERE mission_id = ?`).get(missionId)
  const provider = PROVIDERS.find((candidate) => candidate.id === row?.provider) ?? PROVIDERS[0]
  return {
    enabled: row?.enabled === 1,
    provider: provider.id,
    model: (row?.model as string) || provider.defaultModel,
    baseUrl: (row?.base_url as string) || provider.defaultBaseUrl,
    autoOnAlert: row?.auto_on_alert === 1,
    canNotify: row?.can_notify === 1,
  }
}

export function saveSettings(missionId: string, input: Partial<LlmSettings>) {
  const current = getSettings(missionId)
  const provider = PROVIDERS.find((candidate) => candidate.id === input.provider) ?? PROVIDERS.find((candidate) => candidate.id === current.provider)!
  const changedProvider = provider.id !== current.provider
  const next = {
    enabled: input.enabled ?? current.enabled,
    provider: provider.id,
    // A new provider starts with its own default model and address.
    model: String(input.model ?? (changedProvider ? provider.defaultModel : current.model)).trim().slice(0, 80) || provider.defaultModel,
    baseUrl: String(input.baseUrl ?? (changedProvider ? provider.defaultBaseUrl : current.baseUrl)).trim().slice(0, 200),
    autoOnAlert: input.autoOnAlert ?? current.autoOnAlert,
    canNotify: input.canNotify ?? current.canNotify,
  }
  db.prepare(
    `INSERT INTO llm_settings (mission_id, enabled, provider, model, base_url, auto_on_alert, can_notify)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (mission_id) DO UPDATE SET enabled = excluded.enabled, provider = excluded.provider,
       model = excluded.model, base_url = excluded.base_url, auto_on_alert = excluded.auto_on_alert, can_notify = excluded.can_notify`,
  ).run(missionId, Number(next.enabled), next.provider, next.model, next.baseUrl, Number(next.autoOnAlert), Number(next.canNotify))
  return next
}

export function recentInsights(missionId: string) {
  return db
    .prepare(`SELECT id, hour, status, trigger, provider, model, result, error FROM insights WHERE mission_id = ? ORDER BY id DESC LIMIT 5`)
    .all(missionId)
    .map((row) => ({ ...row, result: row.result ? (JSON.parse(row.result as string) as Insight) : null }))
}

// The data that the model gets, as JSON in plain English. It holds no simulator settings, so the model
// must find the cause of a problem from the readings, as it would on a real mission.
// Labels, reasons and log lines are tx() tokens, so the server renders them to English first.
function buildContext(missionId: string) {
  const mission = db.prepare(`SELECT name, start_time, sim_hour FROM missions WHERE id = ?`).get(missionId) as {
    name: string
    start_time: string
    sim_hour: number
  }
  const hour = mission.sim_hour - 1
  const time = (value: number) => new Date(Date.parse(mission.start_time) + value * HOUR_MS).toISOString().slice(0, 16) + 'Z'
  const crew = db.prepare(`SELECT id, name, role FROM crew WHERE mission_id = ?`).all(missionId) as { id: number; name: string; role: string }[]
  const nameOf = (id: number) => crew.find((member) => member.id === id)?.name ?? `crew ${id}`

  // For each subject and indicator: the newest value, and the mean, lowest and highest value of the last day and week.
  const stats = db.prepare(
    `SELECT subject, indicator,
       round(avg(CASE WHEN hour > ?2 - 24 THEN value END), 2) AS mean_24h,
       round(min(CASE WHEN hour > ?2 - 24 THEN value END), 2) AS min_24h,
       round(max(CASE WHEN hour > ?2 - 24 THEN value END), 2) AS max_24h,
       round(avg(value), 2) AS mean_7d
     FROM readings WHERE mission_id = ?1 AND hour > ?2 - 168 GROUP BY subject, indicator`,
  ).all(missionId, hour) as Record<string, number | string>[]
  const latest = db.prepare(
    `SELECT subject, indicator, value, hour, source FROM readings
     WHERE id IN (SELECT max(id) FROM readings WHERE mission_id = ? GROUP BY subject, indicator)`,
  ).all(missionId) as { subject: string; indicator: string; value: number; hour: number; source: string }[]
  const readings = (subject: string) =>
    latest
      .filter((row) => row.subject === subject)
      .map((row) => {
        const { subject: _subject, indicator: _indicator, ...numbers } = stats.find((stat) => stat.subject === subject && stat.indicator === row.indicator) ?? {}
        return { indicator: row.indicator, value: row.value, status: statusOf(row.indicator, row.value), measured_at: time(row.hour), source: row.source, ...numbers }
      })

  // One value for each of the last 7 days, oldest first, so the model can compare the days of
  // different indicators. For an hourly indicator the value is the mean of the day. null means no reading.
  const DAYS = 7
  const daily = db.prepare(
    `SELECT subject, indicator, CAST((?2 - hour) / 24 AS INTEGER) AS days_ago, round(avg(value), 2) AS mean
     FROM readings WHERE mission_id = ?1 AND hour > ?2 - 24 * ?3 AND hour <= ?2 GROUP BY subject, indicator, days_ago`,
  ).all(missionId, hour, DAYS) as { subject: string; indicator: string; days_ago: number; mean: number }[]
  const lastDays = (subject: string) => {
    const series: Record<string, (number | null)[]> = {}
    for (const row of daily) {
      if (row.subject !== subject) continue
      series[row.indicator] ??= new Array<number | null>(DAYS).fill(null)
      series[row.indicator][DAYS - 1 - row.days_ago] = row.mean
    }
    return series
  }
  const baselines = (subject: string) =>
    Object.fromEntries(
      INDICATORS.filter((indicator) => indicator.kind === 'vital').flatMap((indicator) => {
        const value = baselineOf(missionId, subject, indicator.id, hour)
        return value === null ? [] : [[indicator.id, Number(value.toFixed(2))]]
      }),
    )

  const symptoms = db.prepare(`SELECT crew_id, body_part, name, status, hour FROM symptoms WHERE mission_id = ? AND hour > ? ORDER BY id DESC LIMIT 30`).all(missionId, hour - 168) as { crew_id: number; body_part: string; name: string; status: string; hour: number }[]
  const checkups = db.prepare(`SELECT crew_id, rule_id, status, reason, hour FROM checkups WHERE mission_id = ? AND hour > ? ORDER BY id DESC LIMIT 20`).all(missionId, hour - 72) as { crew_id: number; rule_id: string; status: string; reason: string; hour: number }[]
  const changes = db.prepare(`SELECT hour, summary FROM events WHERE mission_id = ? AND type = 'status.changed' AND hour > ? ORDER BY id DESC LIMIT 25`).all(missionId, hour - 72) as { hour: number; summary: string }[]

  const context = {
    mission: { name: mission.name, day: Math.floor(hour / 24) + 1, time: time(hour) },
    limits: INDICATORS.map(({ id, label, unit, kind, normal, caution, why }) => ({ id, label, unit, kind, normal, caution, why })),
    relations: RELATIONS.map(({ model: _model, ...relation }) => relation),
    cabin: readings('env'),
    cabin_last_7_days: lastDays('env'),
    crew: crew.map((member) => ({
      name: member.name,
      role: member.role,
      readings: readings(`crew:${member.id}`),
      personal_baseline: baselines(`crew:${member.id}`),
      last_7_days: lastDays(`crew:${member.id}`),
      symptoms: symptoms.filter((symptom) => symptom.crew_id === member.id).map((symptom) => ({ name: symptom.name, body_part: symptom.body_part, status: symptom.status, reported_at: time(symptom.hour) })),
    })),
    crew_patterns: crewFindings(missionId, hour).map(({ scope, severity, title, detail, crewIds, indicators }) => ({
      scope,
      severity: severity === 2 ? 'alert' : 'caution',
      title,
      detail,
      crew: crewIds.map(nameOf),
      indicators,
    })),
    check_ups_last_3_days: checkups.map((checkup) => ({ crew: nameOf(checkup.crew_id), rule: checkup.rule_id, answer: checkup.status, reason: checkup.reason, asked_at: time(checkup.hour) })),
    status_changes_last_3_days: changes.map((change) => ({ at: time(change.hour), what: change.summary })),
  }
  return JSON.stringify(localize(context, 'en'))
}

const SEVERITY = { routine: 0, today: 1, now: 2 }
const running = new Set<string>()
let onChange: (missionId: string) => void = () => {}

// Asks the model for an insight. The answer arrives later: this function returns at once,
// and the page gets the result through the "changed" message.
// "lang" is the language of the person who asks. The model writes the insight in this language one
// time, and the server stores it. An insight that starts by itself after an alert has no person, so it is English.
// Returns null, or the problem as a text for the person.
export function requestInsight(missionId: string, trigger: 'manual' | 'alert', actor: string, lang: Lang = 'en'): string | null {
  const settings = getSettings(missionId)
  if (!settings.enabled) return tx('Insights are off for this mission.')
  if (running.has(missionId)) return tx('The model already works on an insight.')
  const provider = PROVIDERS.find((candidate) => candidate.id === settings.provider)!
  const hour = (db.prepare(`SELECT sim_hour FROM missions WHERE id = ?`).get(missionId)!.sim_hour as number) - 1
  const insightId = Number(
    db.prepare(`INSERT INTO insights (mission_id, hour, status, trigger, provider, model) VALUES (?, ?, 'pending', ?, ?, ?)`).run(missionId, hour, trigger, provider.id, settings.model).lastInsertRowid,
  )
  emit(
    missionId,
    hour,
    actor,
    'insight.requested',
    trigger === 'alert'
      ? tx('Asked the model {model} for an insight, because a status changed to alert.', { model: settings.model })
      : tx('Asked the model {model} for an insight.', { model: settings.model }),
  )
  running.add(missionId)

  provider
    .run({ model: settings.model, baseUrl: settings.baseUrl, system: systemPromptFor(lang), context: buildContext(missionId) })
    .then(({ insight, model }) => {
      db.prepare(`UPDATE insights SET status = 'done', result = ?, model = ? WHERE id = ?`).run(JSON.stringify(insight), model, insightId)
      emit(missionId, hour, 'ai', 'insight.done', tx('Insight from {model}: {summary}', { model, summary: insight.summary }))
      if (!getSettings(missionId).canNotify) return
      for (const action of insight.actions) {
        sendToRoles(missionId, hour, [action.role as RoleId], {
          severity: SEVERITY[action.urgency],
          // The model wrote the title and the detail in the language of the person who asked.
          title: tx('AI suggestion: {title}', { title: action.title }),
          body: `${action.detail} ${tx('A language model ({model}) wrote this text. Check it before you act.', { model })}`,
          topic: `insight:${insightId}:${action.role}:${action.title}`,
        })
      }
    })
    .catch((error: Error) => {
      // The message of a Problem is a token: do not cut it. Other messages are plain English text.
      const known = error instanceof Problem
      db.prepare(`UPDATE insights SET status = 'failed', error = ? WHERE id = ?`).run(known ? error.message : error.message.slice(0, 400), insightId)
      emit(missionId, hour, 'ai', 'insight.failed', tx('The insight failed: {error}', { error: known ? error.message : error.message.slice(0, 200) }))
    })
    .finally(() => {
      running.delete(missionId)
      onChange(missionId)
    })
  return null
}

// At most one automatic insight in each 12 hours of the mission, so the model cannot flood the crew or the bill.
const AUTO_QUIET_HOURS = 12

export function startInsights(notify: (missionId: string) => void) {
  onChange = notify
  // A request that was open when the server stopped can never finish.
  db.prepare(`UPDATE insights SET status = 'failed', error = ? WHERE status = 'pending'`).run(tx('The server restarted.'))
  onAlert((missionId, hour) => {
    const settings = getSettings(missionId)
    if (!settings.enabled || !settings.autoOnAlert) return
    // Wait until the transaction that wrote the reading ends. Then the model sees all new readings.
    setTimeout(() => {
      const recent = db.prepare(`SELECT 1 FROM insights WHERE mission_id = ? AND trigger = 'alert' AND hour > ? LIMIT 1`).get(missionId, hour - AUTO_QUIET_HOURS)
      if (!recent) requestInsight(missionId, 'alert', 'system')
    }, 50)
  })
}

export const insightCatalog = {
  providers: PROVIDERS.map(({ run: _run, ...provider }) => provider),
  roles: ROLES.map((role) => role.id),
}
