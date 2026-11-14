import { useState } from 'react'
import { STATUS_LABEL, formatTime, missionDay, timeOfHour, type HistoryEvent, type Notification, type Status } from '../api.ts'
import { SourceTag } from '../components/StatusBadge.tsx'
import type { Ctx } from '../context.ts'
import { SHAPE } from '../derive.ts'
import { lang, t, tn } from '../i18n.ts'
import { initialsOf } from './alertModel.ts'
import './log.css'

type Filter = 'all' | 'health' | 'cabin' | 'checkups' | 'sent'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: t('All') },
  { id: 'health', label: t('Health') },
  { id: 'cabin', label: t('Cabin') },
  { id: 'checkups', label: t('Check-ups') },
  { id: 'sent', label: t('Sent') },
]
// The log shows this many lines first. A button shows the older lines.
const FIRST_LINES = 30
const SEVERITY_STATUS: Status[] = ['normal', 'caution', 'alert']
const lower = (text: string) => text.toLocaleLowerCase(lang)

// The words for each status: in the language of the page, and in English for a line from before the translation.
const STATUS_WORDS: [Status, string][] = (
  [
    ['normal', 'Normal'],
    ['caution', 'Caution'],
    ['alert', 'Alert'],
  ] as [Status, string][]
).flatMap(([status, english]) => [...new Set([lower(STATUS_LABEL[status]), lower(english)])].map((word): [Status, string] => [status, word]))

// The new status of a line "... changed from <old status> to <new status> (<value>)": the status word that comes last.
// An event has no field for its status, so this function reads the words of the status in the line.
function lastStatus(summary: string): Status | null {
  const text = lower(summary)
  let found: Status | null = null
  let position = -1
  for (const [status, word] of STATUS_WORDS) {
    const at = text.lastIndexOf(word)
    if (at > position) [found, position] = [status, at]
  }
  return found
}

// A short word for the kind of a line, by the type of the event.
const KIND: Record<string, string> = {
  'checkup.asked': t('Question'),
  'checkup.answered': t('Answer'),
  'symptom.reported': t('Symptom'),
  'symptom.resolved': t('Symptom gone'),
  'claim.started': t('I am on it'),
  'claim.done': t('Work done'),
  'reading.entered': t('Crew entry'),
  'notification.sent': t('Sent'),
  'clock.advanced': t('Clock'),
  'clock.auto_run': t('Clock'),
  'simulator.offsets': t('Demo'),
  'simulator.scenario': t('Demo'),
  'simulator.set': t('Demo'),
  'simulator.reset': t('Demo'),
  'test.notification': t('Test'),
  'test.checkup': t('Test'),
  'assistant.command': t('Said to Nexxo'),
  'mission.created': t('Mission start'),
  'crew.added': t('Crew'),
  'crew.role': t('Crew'),
  'llm.settings': t('Settings'),
  'insight.requested': t('Insight'),
  'insight.done': t('Insight'),
  'insight.failed': t('Insight'),
}

type Line = {
  event: HistoryEvent
  who: string
  initials: string
  text: string
  kind: string
  status: Status | null
  // The people who got the notification, if the line is a notification.
  sentTo: string[]
  kinds: Filter[]
}

export default function LogSheet({ snapshot, catalog }: Ctx) {
  const [filter, setFilter] = useState<Filter>('all')
  const [showAll, setShowAll] = useState(false)
  const { mission, crew } = snapshot
  const today = missionDay(mission.hour - 1)
  const clock = (hour: number) => formatTime(timeOfHour(mission.startTime, hour), false)
  const dayStart = (day: number) => formatTime(timeOfHour(mission.startTime, (day - 1) * 24))
  // The date under the time, in a narrow column: "03 Feb" in English. The short month of Portuguese ("03 de fev.")
  // is too wide for the column, so Portuguese gets the date in numbers: "03/02".
  const dateOf = (hour: number) =>
    timeOfHour(mission.startTime, hour).toLocaleDateString(lang === 'en' ? 'en-GB' : lang, { timeZone: 'UTC', day: '2-digit', month: lang === 'en' ? 'short' : '2-digit' })
  const nameOf = (id: number | null) =>
    id === null ? t('Flight surgeons') : (crew.find((member) => member.id === id)?.name ?? t('A crew member'))
  // The labels of the cabin values come from the server in the language of the page, as the lines of the log do.
  const cabinLabels = catalog.indicators.filter((indicator) => indicator.kind === 'environment').map((indicator) => lower(indicator.label))
  const ruleOf = (id: string) => catalog.rules.find((rule) => rule.id === id)

  const lines: Line[] = snapshot.events.map((event) => {
    const { type, summary } = event
    let who = event.actor
    let initials = '?'
    if (event.actor === 'simulator') [who, initials] = [t('Simulator'), 'S']
    else if (event.actor === 'system') [who, initials] = ['Nexxo', 'N']
    else if (event.actor === 'ai') [who, initials] = [t('Language model'), t('LM')]
    else if (event.actor.startsWith('crew:')) {
      who = nameOf(Number(event.actor.split(':')[1]))
      initials = initialsOf(who)
    }

    let text = summary
    let kind = KIND[type] ?? type
    let status: Status | null = null
    let sentTo: string[] = []
    // Is the line about the cabin? An event has no field for this. So each type of event uses the data that
    // tells it and that does not depend on the language: a name, a topic, a rule. The words of the text do not decide.
    let cabin = false
    if (type === 'status.changed') {
      // The text of a body value starts with the name of the crew member. The text of a cabin value does not.
      cabin = !crew.some((member) => summary.startsWith(`${member.name}:`))
      status = lastStatus(summary)
      kind = cabin ? t('Cabin') : t('Health')
    } else if (type === 'notification.sent') {
      // The notifications of this line: the same hour, and the text ends with their title.
      // The title and the line come from the server in the same language.
      const sameHour: Notification[] = snapshot.notifications.filter((notification) => notification.hour === event.hour)
      let sent = sameHour.filter((notification) => summary.endsWith(`: ${notification.title}`))
      if (sent.length === 0) sent = sameHour.filter((notification) => summary.includes(notification.title))
      if (sent.length > 0) {
        text = sent[0].title
        status = SEVERITY_STATUS[sent[0].severity] ?? null
        sentTo = [...new Set(sent.map((notification) => nameOf(notification.crewId)))]
        cabin = sent[0].topic.startsWith('env:')
      }
    } else if (type === 'claim.started') {
      // The topic of the claim tells it. Only a problem of the cabin has "I am on it", so an old claim is a cabin line too.
      const claims = snapshot.claims.filter((claim) => claim.hour === event.hour && event.actor === `crew:${claim.crewId}`)
      cabin = claims.length === 0 || claims.some((claim) => claim.topic.startsWith('env:'))
    } else if (type === 'checkup.asked') {
      // The rule of the question tells if a cabin value started it. The line names the crew member and the question.
      const asked = snapshot.checkups.filter((checkup) => checkup.hour === event.hour && summary.includes(nameOf(checkup.crewId)))
      const exact = asked.filter((checkup) => summary.includes(ruleOf(checkup.ruleId)?.question ?? '\n'))
      cabin = (exact.length > 0 ? exact : asked).some((checkup) => ruleOf(checkup.ruleId)?.scope === 'cabin')
    } else {
      // Other lines, for example a change of the simulator, name the value with its label.
      const line = lower(summary)
      cabin = cabinLabels.some((label) => line.includes(label))
    }
    const kinds: Filter[] = ['all']
    if (cabin) kinds.push('cabin')
    if (type.startsWith('checkup.')) kinds.push('checkups')
    if (type === 'notification.sent') kinds.push('sent')
    if (type.startsWith('symptom.') || (!cabin && (type === 'status.changed' || type === 'notification.sent' || type === 'reading.entered'))) {
      kinds.push('health')
    }
    return { event, who, initials, text, kind, status, sentTo, kinds }
  })

  const shown = lines.filter((line) => line.kinds.includes(filter))
  const visible = showAll ? shown : shown.slice(0, FIRST_LINES)
  // Group the lines by mission day. The events are sorted, so each day is one block.
  const days: { day: number; lines: Line[] }[] = []
  for (const line of visible) {
    const day = missionDay(line.event.hour)
    const last = days[days.length - 1]
    if (last?.day === day) last.lines.push(line)
    else days.push({ day, lines: [line] })
  }
  const ground = snapshot.notifications.filter((notification) => notification.crewId === null)

  return (
    <div className="lg">
      <header className="lg-head">
        <h1>{t('Mission log, flight day {day}.', { day: today })}</h1>
        <p className="muted">{t('Who did what, and when. The newest line is on top. All times are UTC.')}</p>
      </header>

      <section className="card lg-ground" aria-label={t('Sent to the ground')}>
        <span className="lg-label">{t('Sent to the ground')}</span>
        {ground.length === 0 ? (
          <p className="lg-ground-none">{t('Nothing went to the ground.')}</p>
        ) : (
          <>
            <p className="lg-ground-count display">
              {tn(ground.length, '1 notification went to the flight surgeons.', '{count} notifications went to the flight surgeons.')}
            </p>
            <ul className="plain lg-ground-list">
              {ground.slice(0, 3).map((notification) => {
                const status = SEVERITY_STATUS[notification.severity] ?? 'normal'
                return (
                  <li key={notification.id}>
                    <span className="lg-ground-time">{formatTime(timeOfHour(mission.startTime, notification.hour))}</span>
                    <span>
                      {notification.severity > 0 && (
                        <span className={`status-${status} lg-shape`} role="img" aria-label={STATUS_LABEL[status]}>{SHAPE[status]}</span>
                      )}
                      {notification.title}
                    </span>
                  </li>
                )
              })}
            </ul>
            {ground.length > 3 && <p className="muted small lg-ground-more">{tn(ground.length - 3, 'And 1 older.', 'And {count} older.')}</p>}
          </>
        )}
      </section>

      <div className="lg-filters" role="group" aria-label={t('Kind of line')}>
        {FILTERS.map((item) => (
          <button
            type="button"
            key={item.id}
            className="pill"
            aria-pressed={filter === item.id}
            onClick={() => {
              setFilter(item.id)
              setShowAll(false)
            }}
          >
            {item.label} <span className="lg-count">{lines.filter((line) => line.kinds.includes(item.id)).length}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 && <p className="muted">{t('The log has no line of this kind.')}</p>}
      {days.map(({ day, lines: dayLines }) => (
        <section key={day} className="lg-day" aria-label={t('Flight day {day}', { day })}>
          <h2 className="lg-day-head">
            {t('Flight day {day}', { day })}
            <span className="lg-day-note">{day === today ? t('today · starts {time}', { time: dayStart(day) }) : t('starts {time}', { time: dayStart(day) })}</span>
          </h2>
          <ol className="plain card lg-list">
            {dayLines.map(({ event, who, initials, text, kind, status, sentTo }, index) => {
              // Lines of the same hour show the time one time, on their first line.
              const same = index > 0 && dayLines[index - 1].event.hour === event.hour
              return (
                <li key={event.id} className={`lg-line ${same ? 'lg-same' : ''}`}>
                  <span className="lg-time" aria-hidden={same}>
                    {clock(event.hour)}
                    {/* A mission day starts at the hour of the launch, so it has two dates. Show the date where it changes. */}
                    {dateOf(event.hour) !== (index > 0 ? dateOf(dayLines[index - 1].event.hour) : '') && <span className="lg-date">{dateOf(event.hour)}</span>}
                  </span>
                  <div className="lg-body">
                    <div className="lg-who">
                      {same && <span className="lg-sr">{clock(event.hour)}</span>}
                      <span className="lg-avatar" aria-hidden="true">{initials}</span>
                      <span className="lg-name">{who}</span>
                      <span className={`lg-tag ${status ? `status-${status}` : ''}`}>
                        {status && (
                          <>
                            <span aria-hidden="true">{SHAPE[status]}</span> {STATUS_LABEL[status]} ·{' '}
                          </>
                        )}
                        {kind}
                      </span>
                    </div>
                    <span className="lg-text">{text}</span>
                    {sentTo.length > 0 && (
                      <div className="lg-sent">
                        <span className="lg-sent-label">{t('Sent to')}</span>
                        {sentTo.map((name) => (
                          <span key={name} className="lg-chip">{name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      ))}
      {shown.length > visible.length && (
        <button type="button" className="btn lg-older" onClick={() => setShowAll(true)}>
          {tn(shown.length - visible.length, 'Show the 1 older line', 'Show the {count} older lines')}
        </button>
      )}

      <details className="lg-sources">
        <summary>{t('Where the data comes from')}</summary>
        <p className="muted small">{t('Cabin values are a NASA sensor record. Body values come from a model.')}</p>
        <ul className="plain">
          {catalog.indicators.map((indicator) => (
            <li key={indicator.id}>
              <span className="lg-source-head">
                <strong>{indicator.label}</strong>
                <SourceTag source={indicator.nasaRecord ? 'nasa' : 'simulated'} />
              </span>
              <span className="muted small">{indicator.dataSource}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}
