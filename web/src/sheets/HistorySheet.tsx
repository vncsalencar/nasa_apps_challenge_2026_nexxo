import { useEffect, useState } from 'react'
import { STATUS_LABEL, api, formatTime, missionDay, timeOfHour, type HistoryItem, type HistoryKind, type PersonalHistory } from '../api.ts'
import type { Ctx } from '../context.ts'
import { SHAPE, firstName } from '../derive.ts'
import { t, tn } from '../i18n.ts'
import './history.css'

// The personal history of the selected crew member: what this person entered, reported,
// answered and did, what the app asked, and which notifications this person got.
type Filter = 'all' | 'mine' | 'asked' | 'alert'
const FILTERS: { id: Filter; label: string; kinds: HistoryKind[] }[] = [
  { id: 'all', label: t('All'), kinds: ['entered', 'reported', 'asked', 'answered', 'action', 'said', 'alert'] },
  { id: 'mine', label: t('What you did'), kinds: ['entered', 'reported', 'answered', 'action', 'said'] },
  { id: 'asked', label: t('Questions'), kinds: ['asked', 'answered'] },
  { id: 'alert', label: t('Notifications'), kinds: ['alert'] },
]
const KIND_LABEL: Record<HistoryKind, string> = {
  entered: t('Entered'),
  reported: t('Reported'),
  asked: t('Question'),
  answered: t('Answer'),
  action: t('Action'),
  said: t('Said'),
  alert: t('Notification'),
}
// The list shows this many lines first. A button shows the older lines.
const FIRST_LINES = 40

export default function HistorySheet({ snapshot, crewId, s, open }: Ctx) {
  const { mission } = snapshot
  const [history, setHistory] = useState<PersonalHistory | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [showAll, setShowAll] = useState(false)

  // Load the list again when the mission gets a new event or a new notification.
  const change = `${snapshot.events[0]?.id ?? 0}-${snapshot.notifications[0]?.id ?? 0}-${mission.hour}`
  useEffect(() => {
    let current = true
    api<PersonalHistory>(`/missions/${mission.id}/crew/${crewId}/history`)
      .then((data) => {
        if (!current) return
        setHistory(data)
        setError(null)
      })
      .catch((cause: Error) => current && setError(cause.message))
    return () => {
      current = false
    }
  }, [mission.id, crewId, change])

  const kinds = FILTERS.find((item) => item.id === filter)!.kinds
  const lines = (history?.items ?? []).filter((item) => kinds.includes(item.kind))
  const shown = showAll ? lines : lines.slice(0, FIRST_LINES)
  // Group the lines by flight day, newest day first.
  const days: { day: number; items: HistoryItem[] }[] = []
  for (const item of shown) {
    const day = missionDay(item.hour)
    const last = days[days.length - 1]
    if (last?.day === day) last.items.push(item)
    else days.push({ day, items: [item] })
  }
  const today = missionDay(mission.hour - 1)
  const counts = history?.counts
  const count = (filterId: Filter) => (counts ? FILTERS.find((item) => item.id === filterId)!.kinds.reduce((sum, kind) => sum + counts[kind], 0) : 0)

  return (
    <div className="hi">
      <header className="hi-head">
        <h1>{t('Your history, {name}.', { name: firstName(s.member?.name) })}</h1>
        <p className="muted">{t('What you entered, reported and did, and what Nexxo asked and told you. Only your own lines. All times are UTC.')}</p>
      </header>

      {counts && (
        <div className="hi-facts">
          <div className="hi-fact">
            <strong className="display">{counts.entered}</strong>
            <span>{tn(counts.entered, 'value that you entered', 'values that you entered')}</span>
          </div>
          <div className="hi-fact">
            <strong className="display">{counts.reported}</strong>
            <span>{tn(counts.reported, 'symptom report', 'symptom reports')}</span>
          </div>
          <div className="hi-fact">
            <strong className="display">{counts.answered}</strong>
            <span>{tn(counts.answered, 'question that you answered', 'questions that you answered')}</span>
          </div>
          <div className="hi-fact">
            <strong className="display">{counts.alert}</strong>
            <span>{tn(counts.alert, 'notification that you got', 'notifications that you got')}</span>
          </div>
        </div>
      )}

      <div className="hi-filters" role="group" aria-label={t('Show')}>
        {FILTERS.map((item) => (
          <button type="button" key={item.id} className="pill" aria-pressed={filter === item.id} onClick={() => { setFilter(item.id); setShowAll(false) }}>
            {item.label} <span className="hi-count">{count(item.id)}</span>
          </button>
        ))}
      </div>

      {error && <p role="alert">{error}</p>}
      {!history && !error && <p className="muted">{t('Loading your history…')}</p>}
      {history && lines.length === 0 && (
        <p className="hi-empty muted">
          {filter === 'all' ? t('Your history is empty. It fills when you answer a question, report a symptom, or do the daily check-in.') : t('No line of this kind yet.')}
        </p>
      )}

      {days.map(({ day, items }) => (
        <section key={day} className="hi-day">
          <h2 className="hi-day-title">
            {t('Flight day {day}', { day })}
            {day === today && <span className="muted"> · {t('today')}</span>}
          </h2>
          <ol className="hi-list">
            {items.map((item) => (
              <li key={item.key} className={`hi-line hi-kind-${item.kind}`}>
                <time className="hi-time mono">{formatTime(timeOfHour(mission.startTime, item.hour), false)}</time>
                <span className="hi-mark" aria-hidden="true" />
                <div className="hi-text">
                  <p className="hi-meta">
                    <span className="hi-kind">{KIND_LABEL[item.kind]}</span>
                    {item.status && item.status !== 'normal' && (
                      <span className={`badge status-${item.status}`}>
                        <span aria-hidden="true">{SHAPE[item.status]}</span> {STATUS_LABEL[item.status]}
                      </span>
                    )}
                  </p>
                  <p className="hi-title">{item.title}</p>
                  {item.detail && <p className="hi-detail muted">{item.detail}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}

      {lines.length > shown.length && (
        <button type="button" className="btn hi-more" onClick={() => setShowAll(true)}>
          {tn(lines.length - shown.length, 'Show 1 older line', 'Show {count} older lines')}
        </button>
      )}

      <footer className="hi-foot">
        <span className="muted small">{t('The mission log shows the lines of all crew members and of the cabin.')}</span>
        <button type="button" className="btn" onClick={() => open('log')}>
          {t('Open the mission log')}
        </button>
      </footer>
    </div>
  )
}
