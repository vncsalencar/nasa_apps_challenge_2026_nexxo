// The personal history of one crew member: what this person entered, reported, answered and did,
// what the app asked, and which notifications this person got. The mission log shows all crew
// members and the cabin. This list shows one person only.
import type { Request, Router } from 'express'
import { db } from './db.ts'
import { lowerFirst, render, tx } from './i18n.ts'
import { indicatorById, statusOf, valueText, type Status } from './indicators.ts'
import { ruleById } from './rules.ts'
import { crewOf } from './simulator.ts'

export type HistoryKind = 'entered' | 'reported' | 'asked' | 'answered' | 'action' | 'said' | 'alert'

export type HistoryItem = {
  key: string
  hour: number
  kind: HistoryKind
  title: string
  detail: string | null
  status: Status | null
}

const SEVERITY: Status[] = ['normal', 'caution', 'alert']
const LIMIT = 300

export function historyOf(missionId: string, crewId: number) {
  const items: HistoryItem[] = []
  const add = (key: string, hour: number, kind: HistoryKind, title: string, detail: string | null = null, status: Status | null = null) =>
    items.push({ key, hour, kind, title, detail, status })

  // Values that the crew member typed in, for example in the daily check-in.
  const readings = db
    .prepare(`SELECT id, indicator, value, hour FROM readings WHERE mission_id = ? AND subject = ? AND source = 'crew' ORDER BY id DESC LIMIT ?`)
    .all(missionId, `crew:${crewId}`, LIMIT) as { id: number; indicator: string; value: number; hour: number }[]
  for (const row of readings) {
    const indicator = indicatorById.get(row.indicator)
    if (!indicator) continue
    add(`reading-${row.id}`, row.hour, 'entered', tx('You entered {label}: {value}', { label: lowerFirst(indicator.label), value: valueText(indicator, row.value) }), null, statusOf(row.indicator, row.value))
  }

  const symptoms = db
    .prepare(`SELECT id, name, body_part, hour, resolved_hour FROM symptoms WHERE mission_id = ? AND crew_id = ? ORDER BY id DESC LIMIT ?`)
    .all(missionId, crewId, LIMIT) as { id: number; name: string; body_part: string; hour: number; resolved_hour: number | null }[]
  for (const row of symptoms) {
    // The database keeps the English name of the symptom.
    const symptom = tx(row.name)
    add(`symptom-${row.id}`, row.hour, 'reported', tx('You reported: {symptom}', { symptom }), row.resolved_hour === null ? tx('Still open.') : null, 'caution')
    if (row.resolved_hour !== null) add(`symptom-${row.id}-gone`, row.resolved_hour, 'reported', tx('You reported that this is gone: {symptom}', { symptom }), null, 'normal')
  }

  const checkups = db
    .prepare(`SELECT id, rule_id, status, reason, hour, answered_hour FROM checkups WHERE mission_id = ? AND crew_id = ? ORDER BY id DESC LIMIT ?`)
    .all(missionId, crewId, LIMIT) as { id: number; rule_id: string; status: string; reason: string; hour: number; answered_hour: number | null }[]
  for (const row of checkups) {
    const question = ruleById.get(row.rule_id)?.question ?? row.rule_id
    add(`checkup-${row.id}`, row.hour, 'asked', tx('Nexxo asked: {question}', { question }), row.status === 'pending' ? `${row.reason} ${tx('No answer yet.')}` : row.reason)
    if (row.answered_hour !== null) {
      const yes = row.status === 'confirmed'
      add(`checkup-${row.id}-answer`, row.answered_hour, 'answered', yes ? tx('You answered yes: {question}', { question }) : tx('You answered no: {question}', { question }), null, yes ? 'caution' : 'normal')
    }
  }

  const claims = db
    .prepare(`SELECT id, topic, hour, done_hour FROM claims WHERE mission_id = ? AND crew_id = ? ORDER BY id DESC LIMIT ?`)
    .all(missionId, crewId, LIMIT) as { id: number; topic: string; hour: number; done_hour: number | null }[]
  for (const row of claims) {
    const label = indicatorById.get(row.topic.split(':').pop() ?? '')?.label ?? row.topic
    add(`claim-${row.id}`, row.hour, 'action', tx('You said "I am on it": {label}', { label }), row.done_hour === null ? tx('The work is still open.') : null)
    if (row.done_hour !== null) add(`claim-${row.id}-done`, row.done_hour, 'action', tx('You finished the work: {label}', { label }), null, 'normal')
  }

  // What the crew member said or typed to the assistant.
  const said = db
    .prepare(`SELECT id, hour, summary FROM events WHERE mission_id = ? AND actor = ? AND type = 'assistant.command' ORDER BY id DESC LIMIT ?`)
    .all(missionId, `crew:${crewId}`, LIMIT) as { id: number; hour: number; summary: string }[]
  for (const row of said) {
    // The log line is: <name> said to Nexxo: "<text>". It can be a tx() token, so render it to
    // English first. Then take the part in quotation marks, which is what the person said.
    const line = render(row.summary, 'en')
    const text = line.slice(line.indexOf('"'))
    add(`said-${row.id}`, row.hour, 'said', tx('You said to Nexxo: {text}', { text }))
  }

  const notifications = db
    .prepare(`SELECT id, severity, title, body, hour, read_hour FROM notifications WHERE mission_id = ? AND crew_id = ? ORDER BY id DESC LIMIT ?`)
    .all(missionId, crewId, LIMIT) as { id: number; severity: number; title: string; body: string; hour: number; read_hour: number | null }[]
  for (const row of notifications) {
    add(`notification-${row.id}`, row.hour, 'alert', tx('You got: {title}', { title: row.title }), row.read_hour === null ? `${row.body} ${tx('Not read yet.')}` : row.body, SEVERITY[row.severity] ?? 'normal')
  }

  // Newest first. Items of the same hour keep the order of the lists above.
  items.sort((a, b) => b.hour - a.hour)
  const counts: Record<HistoryKind, number> = { entered: 0, reported: 0, asked: 0, answered: 0, action: 0, said: 0, alert: 0 }
  for (const item of items) counts[item.kind]++
  return { items: items.slice(0, LIMIT), counts }
}

export function addHistoryRoutes(mission: Router, idOf: (request: Request) => string) {
  mission.get('/crew/:crewId/history', (request, response) => {
    const id = idOf(request)
    const crewId = Number(request.params.crewId)
    if (!crewOf(id).some((member) => member.id === crewId)) {
      response.status(404).json({ error: tx('This crew member does not exist.') })
      return
    }
    response.json(historyOf(id, crewId))
  })
}
