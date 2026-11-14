// Watches the status of each indicator, sends notifications to the right roles,
// and keeps the history of the mission.
import { db } from './db.ts'
import { tx } from './i18n.ts'
import { indicatorById, num, statusOf, valueText, type Status } from './indicators.ts'

// The labels and the texts are tx() tokens (see i18n.ts). Compare the "id", not the label.
export const ROLES = [
  { id: 'commander', label: tx('Commander'), about: tx('Leads the crew. Gets the alerts of the station cabin.') },
  { id: 'medical_officer', label: tx('Crew medical officer'), about: tx('The doctor on board. Gets the health notifications of all crew members.') },
  { id: 'engineer', label: tx('Flight engineer'), about: tx('Keeps the systems of the station. Gets the notifications of the cabin sensors.') },
  { id: 'specialist', label: tx('Mission specialist'), about: tx('Does the science work. Gets only their own notifications.') },
] as const
export type RoleId = (typeof ROLES)[number]['id']
export const isRole = (value: unknown): value is RoleId => ROLES.some((role) => role.id === value)

const RANK: Record<Status, number> = { normal: 0, caution: 1, alert: 2 }
const STATUS_WORD: Record<Status, string> = { normal: tx('Normal'), caution: tx('Caution'), alert: tx('Alert') }
// The title of a health notification. Each status has its full sentence, because the word
// for the status changes its form in other languages.
const HEALTH_TITLE: Record<Status, string> = {
  normal: '{name}: {label} is normal',
  caution: '{name}: {label} is caution',
  alert: '{name}: {label} is alert',
}
// The ground team in a list of the people who got a notification.
export const GROUND_TEAM = tx('the flight surgeons on the ground')

// The app sends a notification about the same topic one time in 48 hours,
// unless the status gets worse.
const QUIET_HOURS = 48

const insertEvent = db.prepare(`INSERT INTO events (mission_id, hour, actor, type, summary) VALUES (?, ?, ?, ?, ?)`)
export function emit(missionId: string, hour: number, actor: string, type: string, summary: string) {
  insertEvent.run(missionId, hour, actor, type, summary)
}

type Member = { id: number; name: string; role: string }
const crewQuery = db.prepare(`SELECT id, name, role FROM crew WHERE mission_id = ? ORDER BY id`)
const crewOf = (missionId: string) => crewQuery.all(missionId) as Member[]

// The crew members with one of the roles. If nobody has the role, the commander gets
// the notification. If the mission has no commander, all crew members get it.
function withRoles(crew: Member[], roles: RoleId[]): Member[] {
  const found = crew.filter((member) => roles.includes(member.role as RoleId))
  if (found.length) return found
  const commanders = crew.filter((member) => member.role === 'commander')
  return commanders.length ? commanders : crew
}

const insertNotification = db.prepare(
  `INSERT INTO notifications (mission_id, crew_id, severity, title, body, topic, hour) VALUES (?, ?, ?, ?, ?, ?, ?)`,
)
const recentNotification = db.prepare(
  `SELECT 1 FROM notifications WHERE mission_id = ? AND topic = ? AND severity >= ? AND hour > ? LIMIT 1`,
)

export type Message = { severity: number; title: string; body: string; topic: string }

// Other parts of the server can listen for a status that changes to alert.
type AlertListener = (missionId: string, hour: number) => void
const alertListeners: AlertListener[] = []
export function onAlert(listener: AlertListener) {
  alertListeners.push(listener)
}

// Sends one message to some crew members, and to the ground team if "ground" is true.
function send(missionId: string, hour: number, recipients: Member[], message: Message, ground = false) {
  if (recentNotification.get(missionId, message.topic, message.severity, hour - QUIET_HOURS)) return
  const unique = [...new Map(recipients.map((member) => [member.id, member])).values()]
  for (const member of unique) {
    insertNotification.run(missionId, member.id, message.severity, message.title, message.body, message.topic, hour)
  }
  if (ground) insertNotification.run(missionId, null, message.severity, message.title, message.body, message.topic, hour)
  const names = unique.map((member) => member.name)
  if (ground) names.push(GROUND_TEAM)
  // The mission log of the web app finds the notifications of this line by the title at the end.
  // So each translation of this text must end with ": {title}".
  if (names.length) emit(missionId, hour, 'system', 'notification.sent', tx('Notified {names}: {title}', { names: names.join(', '), title: message.title }))
}

// Sends one message to all crew members with one of the roles.
export function sendToRoles(missionId: string, hour: number, roles: RoleId[], message: Message) {
  send(missionId, hour, withRoles(crewOf(missionId), roles), message)
}

// Sends one message to the crew members with some roles, to some named crew members,
// and to the ground team if "ground" is true.
export function notify(
  missionId: string,
  hour: number,
  to: { roles?: RoleId[]; crewIds?: number[]; ground?: boolean },
  message: Message,
) {
  const crew = crewOf(missionId)
  const recipients = [
    ...crew.filter((member) => to.crewIds?.includes(member.id)),
    ...(to.roles?.length ? withRoles(crew, to.roles) : []),
  ]
  send(missionId, hour, recipients, message, to.ground ?? false)
}

function formatRange([low, high]: [number | null, number | null], unit: string) {
  if (low === null) return tx('up to {high} {unit}', { high: num(high!), unit })
  if (high === null) return tx('{low} {unit} or more', { low: num(low), unit })
  return tx('{low} to {high} {unit}', { low: num(low), high: num(high), unit })
}

const insertReading = db.prepare(
  `INSERT INTO readings (mission_id, subject, indicator, value, hour, source) VALUES (?, ?, ?, ?, ?, ?)`,
)
const getStatus = db.prepare(`SELECT status FROM indicator_status WHERE mission_id = ? AND subject = ? AND indicator = ?`)
const setStatus = db.prepare(
  `INSERT INTO indicator_status (mission_id, subject, indicator, status, value, since_hour) VALUES (?, ?, ?, ?, ?, ?)
   ON CONFLICT (mission_id, subject, indicator)
   DO UPDATE SET status = excluded.status, value = excluded.value, since_hour = excluded.since_hour`,
)

type Reading = { subject: string; indicator: string; value: number; source: string }

// Saves one reading and checks if the status of the indicator changed.
// All readings go through this function. "silent" is for the load of the past record:
// the server keeps the status but sends no notification.
export function recordReading(missionId: string, hour: number, reading: Reading, silent = false) {
  insertReading.run(missionId, reading.subject, reading.indicator, reading.value, hour, reading.source)
  const status = statusOf(reading.indicator, reading.value)
  const before = (getStatus.get(missionId, reading.subject, reading.indicator)?.status ?? 'normal') as Status
  if (status === before) return
  setStatus.run(missionId, reading.subject, reading.indicator, status, reading.value, hour)
  if (silent) return
  if (status === 'alert') for (const listener of alertListeners) listener(missionId, hour)

  const indicator = indicatorById.get(reading.indicator)!
  const crew = crewOf(missionId)
  const value = valueText(indicator, reading.value)
  const normal = tx('Normal: {range}.', { range: formatRange(indicator.normal, indicator.unit) })
  const change = { label: indicator.label, before: STATUS_WORD[before], after: STATUS_WORD[status], value }
  const topic = `${reading.subject}:${reading.indicator}`

  if (reading.subject === 'env') {
    emit(missionId, hour, 'system', 'status.changed', tx('{label} changed from {before} to {after} ({value}).', change))
    if (RANK[status] <= RANK[before]) return
    // The engineers keep the systems of the cabin. An alert also goes to the commander.
    const roles: RoleId[] = status === 'alert' ? ['engineer', 'commander'] : ['engineer']
    send(missionId, hour, withRoles(crew, roles), {
      severity: RANK[status],
      title: tx('{label}: {status}', { label: indicator.label, status: STATUS_WORD[status] }),
      body: `${tx('The sensor reads {value}.', { value })} ${normal} ${tx('Check the system and check that the sensor works.')}`,
      topic,
    })
    return
  }

  const member = crew.find((candidate) => `crew:${candidate.id}` === reading.subject)
  if (!member) return
  emit(missionId, hour, 'system', 'status.changed', tx('{name}: {label} changed from {before} to {after} ({value}).', { name: member.name, ...change }))
  if (RANK[status] <= RANK[before]) return
  // The crew member and the medical officers get the health notifications.
  send(missionId, hour, [member, ...withRoles(crew, ['medical_officer'])], {
    severity: RANK[status],
    title: tx(HEALTH_TITLE[status], { name: member.name, label: indicator.label }),
    body: `${tx('The value is {value}.', { value })} ${normal} ${indicator.why}`,
    topic,
  })
}

// A crew member reported a symptom, or confirmed the question of a check-up.
// "symptom" is the English name of the symptom. The topic keeps it. The title shows its translation.
export function notifySymptom(
  missionId: string,
  hour: number,
  crewId: number,
  symptom: string,
  reason: string,
  escalate: 'crew_medical_officer' | 'flight_surgeon' | null,
) {
  const crew = crewOf(missionId)
  const member = crew.find((candidate) => candidate.id === crewId)
  if (!member) return
  send(
    missionId,
    hour,
    withRoles(crew, ['medical_officer']),
    {
      severity: escalate === 'flight_surgeon' ? 2 : 1,
      title: tx('{name} reports: {symptom}', { name: member.name, symptom: tx(symptom) }),
      body: reason,
      topic: `crew:${crewId}:symptom:${symptom}`,
    },
    escalate === 'flight_surgeon',
  )
}
