import { useState } from 'react'
import type { Notification } from '../api.ts'
import type { Ctx } from '../context.ts'
import { SourceTag } from '../components/StatusBadge.tsx'
import { t, tn } from '../i18n.ts'
import { SEVERITY_CLASS, SEVERITY_SHAPE, SEVERITY_WORD, clockOf, describeAlert, type AlertView } from './alertModel.ts'
import './alerts.css'

// How many read notifications the quiet list shows.
const READ_LIMIT = 6
// The section "Do now" shows this many alerts first. A button shows the others.
const FIRST_ALERTS = 4
// A longer text of a notification stays closed until the crew member opens it.
const LONG_TEXT = 240

// Two English words that have another meaning on other screens: there "Answer" is the name of a line and
// "Read" is the state of one notification. Here "Answer" is the action of a button and "Read" is the title of a list.
// Another language needs a different word for each meaning. So each key here has a name in braces that
// stays empty: the English text is the same, and the key is a different one.
const ANSWER = t('Answer{action}', { action: '' })
const READ = t('Read{list}', { list: '' })


// One alert of the "Do now" section. The first card is the inverted light card.
function AlertCard({ view, lead }: { view: AlertView; lead: boolean }) {
  const { notification, indicator, reading } = view
  return (
    <article className={`al-card ${lead ? 'card-inverse al-lead' : 'card'}`}>
      <div className="al-meta">
        <span className={`al-status ${SEVERITY_CLASS[notification.severity]}`}>
          <span aria-hidden="true">{SEVERITY_SHAPE[notification.severity]}</span> {SEVERITY_WORD[notification.severity]} · {view.where}
        </span>
        <span className="al-soft">{view.time}</span>
      </div>
      <h3 className="al-title">{view.headline}</h3>
      {indicator && reading && view.value && (
        <div className="al-reading">
          <span className="al-value">
            {view.value}
            <span className="al-unit"> {indicator.unit}</span>
          </span>
          <span className="al-soft al-normal">
            {view.backToNormal ? t('Normal again now.') : t('Now.')}{' '}
            {view.normal} <SourceTag source={reading.source} />
          </span>
        </div>
      )}
      {view.detail &&
        (view.detail.length > LONG_TEXT ? (
          <details className="al-why">
            <summary>{t('Why Nexxo sent this')}</summary>
            <p className="al-detail">{view.detail}</p>
          </details>
        ) : (
          <p className="al-detail">{view.detail}</p>
        ))}
      {!indicator && view.steps.length > 0 && (
        <p className="al-todo">
          <strong>{t('What to do.')}</strong> {view.steps.join(' ')}
        </p>
      )}
      <div className="al-people">
        {view.others.length > 0 && (
          <span className="al-avatars" aria-hidden="true">
            {view.others.map((other) => (
              <span key={other.key} className="al-avatar">{other.initials}</span>
            ))}
          </span>
        )}
        <span>
          {view.othersText} {view.claimText && <strong>{view.claimText}</strong>}
        </span>
      </div>
      <button type="button" className={`btn btn-large al-main ${lead ? 'btn-primary' : 'al-outline'}`} onClick={() => void view.main.run()}>
        {view.main.label}
      </button>
      {(view.main.kind !== 'read' || view.finish) && (
        <div className="al-small">
          {view.finish && (
            <button type="button" className="al-quiet" onClick={() => void view.finish?.run()}>
              {view.finish.label}
            </button>
          )}
          {view.main.kind !== 'read' && (
            <button type="button" className="al-quiet" onClick={() => void view.read()}>
              {t('Mark as read')}
            </button>
          )}
        </div>
      )}
    </article>
  )
}

export default function AlertsSheet(ctx: Ctx) {
  const { snapshot, s, crewId, open } = ctx
  const [allAlerts, setAllAlerts] = useState(false)
  const mine = snapshot.notifications.filter((notification) => notification.crewId === crewId)
  // One problem is one entry: of the unread notifications with the same topic, show the most severe, then the newest.
  // The newest notification has the highest id.
  const byTopic = new Map<string, Notification>()
  for (const notification of mine.filter((candidate) => candidate.readHour === null)) {
    const kept = byTopic.get(notification.topic)
    if (!kept || notification.severity > kept.severity || (notification.severity === kept.severity && notification.id > kept.id)) {
      byTopic.set(notification.topic, notification)
    }
  }
  const unread = [...byTopic.values()].sort((a, b) => b.id - a.id)
  const alerts = unread.filter((notification) => notification.severity >= 2).map((notification) => describeAlert(ctx, notification))
  const waiting = unread.filter((notification) => notification.severity < 2).map((notification) => describeAlert(ctx, notification))
  const read = mine.filter((notification) => notification.readHour !== null).sort((a, b) => b.id - a.id)
  const cautions = waiting.filter((view) => view.notification.severity === 1).length

  // The one small action of a row: it opens the right screen and marks the notification as read.
  // "I am on it" keeps the notification, so the crew member can report the end of the work here.
  const rowAction = async (view: AlertView) => {
    if (view.finish) {
      await view.finish.run()
      await view.read()
    } else if (view.main.kind === 'claim') await view.main.run()
    else if (view.main.kind === 'open') {
      void view.read()
      void view.main.run()
    } else await view.read()
  }

  return (
    <div className="al">
      <header className="al-head">
        <h1>
          {alerts.length === 0 ? t('No alert needs you now.') : tn(alerts.length, '1 alert needs you now.', '{count} alerts need you now.')}
        </h1>
        <p>
          {waiting.length === 0
            ? alerts.length === 0 ? t('You have read all your notifications.') : t('Nothing else waits for you.')
            : tn(waiting.length, '1 notification can wait until later today.', '{count} notifications can wait until later today.')}
        </p>
      </header>

      {/* The open check-ups are also work for now. So their card is in the same group as the alerts. */}
      {(alerts.length > 0 || s.pending.length > 0) && (
        <section className="al-section" aria-label={t('Do now')}>
          <div className="al-section-head">
            <h2>{t('Do now')}</h2>
            {alerts.length > 0 ? (
              <span className="status-alert">
                <span aria-hidden="true">■</span> {tn(alerts.length, '1 alert', '{count} alerts')}
              </span>
            ) : (
              <span className="muted">{tn(s.pending.length, '1 check-up', '{count} check-ups')}</span>
            )}
          </div>
          {(allAlerts ? alerts : alerts.slice(0, FIRST_ALERTS)).map((view, index) => (
            <AlertCard key={view.notification.id} view={view} lead={index === 0} />
          ))}
          {!allAlerts && alerts.length > FIRST_ALERTS && (
            <button type="button" className="btn al-more-alerts" onClick={() => setAllAlerts(true)}>
              {tn(alerts.length - FIRST_ALERTS, 'Show the 1 other alert', 'Show the {count} other alerts')}
            </button>
          )}
          {s.pending.length > 0 && (
            <div className="card al-checkups">
              <span>
                <strong>{tn(s.pending.length, '1 check-up waits for your answer.', '{count} check-ups wait for your answer.')}</strong>
                <span className="al-row-sub">{t('Each one is a question with two answers.')}</span>
              </span>
              <button type="button" className="btn" onClick={() => open('checkups')}>
                {ANSWER}
              </button>
            </div>
          )}
        </section>
      )}

      {waiting.length > 0 && (
        <section className="al-section" aria-label={t('Can wait')}>
          <div className="al-section-head">
            <h2>{t('Can wait')}</h2>
            <span className={cautions > 0 ? 'status-caution' : 'muted'}>
              {cautions > 0 ? (
                <>
                  <span aria-hidden="true">▲</span> {tn(cautions, '1 caution', '{count} cautions')}
                </>
              ) : (
                tn(waiting.length, '1 notification', '{count} notifications')
              )}
            </span>
          </div>
          <ul className="plain card al-rows">
            {waiting.map((view) => {
              const { notification, indicator } = view
              const label = view.finish ? t('Work is done') : view.main.short
              return (
                <li key={notification.id} className="al-row">
                  <span className="al-row-text">
                    <span className="al-row-title">
                      <span className={`al-shape ${SEVERITY_CLASS[notification.severity]}`} role="img" aria-label={SEVERITY_WORD[notification.severity]}>
                        {SEVERITY_SHAPE[notification.severity]}
                      </span>
                      {view.headline}
                    </span>
                    <span className="al-row-sub">
                      {indicator && view.value && !view.backToNormal
                        ? `${view.value} ${indicator.unit}. ${view.normal}`
                        : view.backToNormal ? t('The value is normal again now.') : view.steps.length > 0 ? view.steps.join(' ') : notification.body}
                      {view.claimText && ` ${view.claimText}`}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="btn al-row-action"
                    aria-label={`${view.finish ? view.finish.label : view.main.label}: ${view.headline}`}
                    onClick={() => void rowAction(view)}
                  >
                    {label}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {read.length > 0 && (
        <section className="al-section al-read" aria-label={READ}>
          <div className="al-section-head">
            <h2>{READ}</h2>
            <span className="muted">{read.length}</span>
          </div>
          <ul className="plain al-read-list">
            {read.slice(0, READ_LIMIT).map((notification) => (
              <li key={notification.id} className="al-read-row">
                <span>
                  <span className={`al-shape ${SEVERITY_CLASS[notification.severity]}`} role="img" aria-label={SEVERITY_WORD[notification.severity]}>
                    {SEVERITY_SHAPE[notification.severity]}
                  </span>
                  {notification.title}
                </span>
                <span className="al-read-time">{clockOf(ctx, notification.hour)}</span>
              </li>
            ))}
          </ul>
          {read.length > READ_LIMIT && <p className="muted small al-more">{tn(read.length - READ_LIMIT, 'And 1 older.', 'And {count} older.')}</p>}
        </section>
      )}

      <button type="button" className="al-history" onClick={() => open('log')}>
        <span>
          {read.length > 0 && (
            <>
              <span className="al-shape status-normal" aria-hidden="true">●</span>
              {tn(read.length, '1 notification read', '{count} notifications read')}
            </>
          )}
        </span>
        <span className="muted">{t('See the mission log')}</span>
      </button>
    </div>
  )
}
