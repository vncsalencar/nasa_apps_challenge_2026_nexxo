import { lang, t } from './i18n.ts'
import { useCallback, useEffect, useState } from 'react'

export type Status = 'normal' | 'caution' | 'alert'
export type BodyPart = 'head' | 'chest' | 'abdomen' | 'arms' | 'legs'
type Range = [number | null, number | null]

export type Indicator = {
  id: string
  label: string
  unit: string
  kind: 'environment' | 'vital'
  normal: Range
  caution: Range
  decimals: number
  cadence: 'hour' | 'day'
  bodyPart?: BodyPart
  why: string
  limitSource: string
  dataSource: string
  nasaRecord: boolean
  // true if the server computes the value from other indicators.
  computed: boolean
  // What to do when the value is above (high) or below (low) its normal range.
  advice?: { high?: string; low?: string }
}

export type Rule = {
  id: string
  title: string
  question: string
  action: string
  escalate: 'crew_medical_officer' | 'flight_surgeon' | null
  symptom: { bodyPart: BodyPart; name: string }
  // "cabin": the trigger is a cabin value. "person": the trigger is a value of one crew member.
  scope: 'cabin' | 'person'
  // The ids of the cause checks that the server runs when the rule starts a check-up.
  context: string[]
}

export type Catalog = {
  indicators: Indicator[]
  bodyParts: BodyPart[]
  roles: { id: string; label: string; about: string }[]
  llmProviders: { id: string; label: string; defaultModel: string; defaultBaseUrl: string; about: string }[]
  rules: Rule[]
  relations: Relation[]
  scenarios: { id: string; label: string; about: string }[]
  dataset: {
    source: { name: string; url: string; mission: string; retrievedAt: string; notes: string[] }
    startTime: string
    hours: number
  }
}

export type Reading = {
  subject: string
  indicator: string
  value: number
  hour: number
  source: string
  status: Status
}
export type CrewMember = { id: number; name: string; role: string }
export type Symptom = {
  id: number
  crewId: number
  bodyPart: BodyPart
  name: string
  status: 'open' | 'resolved'
  hour: number
  resolvedHour: number | null
  // The possible causes that the server found at the time of the report. null for old rows.
  explanation: Explanation | null
}
// One possible cause of a symptom that the server found in the data.
export type Cause = {
  id: string
  title: string
  // "cabin": the same for all crew members. "person": the data of one crew member. "flight": true for every long flight.
  scope: 'cabin' | 'person' | 'flight'
  relation: string
  evidence: 'strong' | 'medium' | 'weak'
  indicators: string[]
  action: string
  detail: string
}
export type Explanation = { urgent: boolean; causes: Cause[]; others: string[] }
// A pattern across the crew, for example the same symptom in two crew members.
export type Finding = {
  id: string
  scope: 'crew' | 'individual'
  // 1 is caution, 2 is alert.
  severity: 1 | 2
  title: string
  detail: string
  action: string
  crewIds: number[]
  indicators: string[]
  roles: string[]
  ground: boolean
}
export type Relation = {
  id: string
  cause: string
  effect: string
  direction: 'same' | 'opposite'
  delay: string
  evidence: 'strong' | 'medium' | 'weak'
  model: string | null
}
export type Checkup = {
  id: number
  crewId: number
  ruleId: string
  status: 'pending' | 'confirmed' | 'dismissed'
  reason: string
  hour: number
  answeredHour: number | null
}
export type Notification = {
  id: number
  // null means the flight surgeons on the ground.
  crewId: number | null
  // 0 is information, 1 is caution, 2 is alert.
  severity: number
  title: string
  body: string
  // What the notification is about, for example "env:co2_partial_pressure" or "crew:3:heart_rate".
  topic: string
  hour: number
  readHour: number | null
}
// "I am on it": a crew member works on the problem with this topic.
export type Claim = { id: number; topic: string; crewId: number; hour: number; doneHour: number | null }
export type LlmSettings = {
  enabled: boolean
  provider: string
  model: string
  baseUrl: string
  autoOnAlert: boolean
  canNotify: boolean
}
export type Insight = {
  summary: string
  findings: { title: string; detail: string; severity: 'info' | 'caution' | 'alert'; indicators: string[] }[]
  actions: { title: string; detail: string; role: string; urgency: 'now' | 'today' | 'routine' }[]
  confidence: 'low' | 'medium' | 'high'
}
export type InsightRecord = {
  id: number
  hour: number
  status: 'pending' | 'done' | 'failed'
  trigger: string
  provider: string
  model: string
  result: Insight | null
  error: string | null
}
export type HistoryEvent = { id: number; hour: number; actor: string; type: string; summary: string }
export type Snapshot = {
  mission: {
    id: string
    name: string
    startTime: string
    hour: number
    now: string
    autoRun: boolean
    offsets: Record<string, number>
    recordHours: number
  }
  crew: CrewMember[]
  missionDay: number
  // The personal baseline of each indicator, by subject ("crew:<id>") and indicator id.
  baselines: Record<string, Record<string, number>>
  findings: Finding[]
  latest: Reading[]
  symptoms: Symptom[]
  checkups: Checkup[]
  notifications: Notification[]
  claims: Claim[]
  // What the presenter chose for the audience screen. Each change raises "rev".
  stage: { crewId: number | null; mode: string | null; sheet: string | null; rev: number }
  // How many pages are open on this mission now.
  viewers: number
  // true if the assistant uses the language model for this mission. false: it uses the fixed rules.
  assistantModel: boolean
  events: HistoryEvent[]
  llm: LlmSettings
  insights: InsightRecord[]
}
export type MissionSummary = { id: string; name: string; hour: number; createdAt: string }
// One point of a series: [hour, value, source].
export type Point = [number, number, string]
export type Series = Record<string, Point[]>

export async function api<T>(path: string, body?: unknown, method?: string, actor?: string): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: method ?? (body === undefined ? 'GET' : 'POST'),
    // The server answers in the language of the page.
    headers: { 'x-lang': lang, ...(body === undefined ? {} : { 'content-type': 'application/json', ...(actor ? { 'x-actor': actor } : {}) }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error ?? t('The server answered {status}.', { status: response.status }))
  return data as T
}

let catalogPromise: Promise<Catalog> | null = null
export function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  useEffect(() => {
    catalogPromise ??= api<Catalog>('/catalog')
    catalogPromise.then(setCatalog).catch(() => (catalogPromise = null))
  }, [])
  return catalog
}

// Loads a mission and loads it again each time the server reports a change.
// "version" grows with each change, so other hooks can load their data again too.
// "actor" tells the server who does the actions on this page: "simulator" or "crew:<id>".
export function useMission(missionId: string, actor: string) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true
    const load = () =>
      api<Snapshot>(`/missions/${missionId}`)
        .then((data) => {
          if (!active) return
          setSnapshot(data)
          setError(null)
          setVersion((current) => current + 1)
        })
        .catch((cause: Error) => active && setError(cause.message))
    load()
    const events = new EventSource(`/api/missions/${missionId}/events`)
    events.onmessage = load
    return () => {
      active = false
      events.close()
    }
  }, [missionId])

  // Sends a change to the server. The server answers with the new state of the mission.
  const send = useCallback(
    (path: string, body: unknown = {}, actorOfThisAction = actor) =>
      api<Snapshot>(`/missions/${missionId}${path}`, body, 'POST', actorOfThisAction)
        .then(setSnapshot)
        .catch((cause: Error) => setError(cause.message)),
    [missionId, actor],
  )
  return { snapshot, error, version, send }
}

export function useSeries(missionId: string, subject: string, hours: number, version: number) {
  const [series, setSeries] = useState<Series>({})
  useEffect(() => {
    let active = true
    api<Series>(`/missions/${missionId}/series?subject=${encodeURIComponent(subject)}&hours=${hours}`)
      .then((data) => active && setSeries(data))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [missionId, subject, hours, version])
  return series
}

const HOUR_MS = 3_600_000
export function timeOfHour(startTime: string, hour: number) {
  return new Date(Date.parse(startTime) + hour * HOUR_MS)
}
export function formatTime(date: Date, withDate = true) {
  return date.toLocaleString(lang === 'en' ? 'en-GB' : lang, {
    timeZone: 'UTC',
    ...(withDate ? { day: '2-digit', month: 'short' } : {}),
    hour: '2-digit',
    minute: '2-digit',
  })
}
// A day with no time, for example "14 Nov". It follows the language like formatTime().
export function formatDay(date: Date) {
  return date.toLocaleDateString(lang === 'en' ? 'en-GB' : lang, { timeZone: 'UTC', day: '2-digit', month: 'short' })
}
// A number with all its decimals and the decimal sign of the language: 36.1 in English, 36,1 in Portuguese.
// For a fixed count of decimals, use fmt() from i18n.ts.
export function formatNumber(value: number) {
  return lang === 'en' ? String(value) : String(value).replace('.', ',')
}
export function missionDay(hour: number) {
  return Math.floor(hour / 24) + 1
}

export const STATUS_LABEL: Record<Status, string> = { normal: t('Normal'), caution: t('Caution'), alert: t('Alert') }
export const SOURCE_LABEL: Record<string, string> = {
  nasa: t('NASA record'),
  nasa_replay: t('NASA record, replayed'),
  simulated: t('Model'),
  computed: t('Computed'),
  admin: t('Simulator'),
  crew: t('Crew entry'),
}
export const STATUS_ORDER: Status[] = ['normal', 'caution', 'alert']
export function worst(statuses: Status[]): Status {
  return statuses.reduce<Status>(
    (current, status) => (STATUS_ORDER.indexOf(status) > STATUS_ORDER.indexOf(current) ? status : current),
    'normal',
  )
}
// A range in words, for example "36.1 to 37.5 °C" or "up to 2.8 mmHg". An empty unit gives the range with no unit.
export function formatRange([low, high]: Range, unit: string) {
  const values = { low: low === null ? '' : formatNumber(low), high: high === null ? '' : formatNumber(high), unit }
  if (!unit) return low === null ? t('up to {high}', values) : high === null ? t('{low} or more', values) : t('{low} to {high}', values)
  if (low === null) return t('up to {high} {unit}', values)
  if (high === null) return t('{low} {unit} or more', values)
  return t('{low} to {high} {unit}', values)
}

// The answer of the assistant to one sentence of a crew member.
export type AssistantReply = {
  reply: string
  did: string[]
  show: { sheet?: string | null; mode?: string } | null
  expectsAnswer: boolean
  source: 'rules' | 'model'
}

// One line of the personal history of a crew member.
export type HistoryKind = 'entered' | 'reported' | 'asked' | 'answered' | 'action' | 'said' | 'alert'
export type HistoryItem = { key: string; hour: number; kind: HistoryKind; title: string; detail: string | null; status: Status | null }
export type PersonalHistory = { items: HistoryItem[]; counts: Record<HistoryKind, number> }
