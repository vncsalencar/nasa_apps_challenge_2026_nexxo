import { formatTime, timeOfHour, type Notification, type Snapshot } from '../api.ts'
import { t } from '../i18n.ts'

const SEVERITY_WORD = [t('Information'), t('Caution'), t('Alert')]
const SEVERITY_SHAPE = ['●', '▲', '■']
const SEVERITY_CLASS = ['', 'status-caution', 'status-alert']

type NotificationsProps = {
  snapshot: Snapshot
  // Show the notifications of this crew member. "all" shows each one with the name of who got it.
  crewId: number | 'all'
  onRead: (notification: Notification) => void
}

export function Notifications({ snapshot, crewId, onRead }: NotificationsProps) {
  const nameOf = (id: number | null) =>
    id === null ? t('Flight surgeons on the ground') : (snapshot.crew.find((member) => member.id === id)?.name ?? t('Crew member'))
  const list = snapshot.notifications.filter((notification) => crewId === 'all' || notification.crewId === crewId).slice(0, 12)
  if (list.length === 0) return <p className="muted small">{t('No notifications.')}</p>
  return (
    <ul className="plain">
      {list.map((notification) => (
        <li key={notification.id} className={`notification severity-${notification.severity} ${notification.readHour !== null ? 'read' : ''}`}>
          <span className="row spread wrap">
            <strong>{notification.title}</strong>
            <span className={`badge ${SEVERITY_CLASS[notification.severity]}`}>
              <span aria-hidden="true">{SEVERITY_SHAPE[notification.severity]}</span> {SEVERITY_WORD[notification.severity]}
            </span>
          </span>
          <p className="small">{notification.body}</p>
          <span className="row spread wrap small muted">
            <span>
              {crewId === 'all' && `${t('To {name}', { name: nameOf(notification.crewId) })} · `}
              {formatTime(timeOfHour(snapshot.mission.startTime, notification.hour))}
            </span>
            {notification.readHour === null && crewId !== 'all' && (
              <button type="button" className="chip" onClick={() => onRead(notification)}>
                {t('Mark as read')}
              </button>
            )}
            {notification.readHour !== null && <span>{t('Read')}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

// The history of the mission: what people did and what the app did, newest first.
export function History({ snapshot }: { snapshot: Snapshot }) {
  const actorName = (actor: string) => {
    if (actor === 'simulator') return t('Simulator')
    if (actor === 'system') return 'Nexxo'
    if (actor === 'ai') return t('Language model')
    const id = Number(actor.split(':')[1])
    return snapshot.crew.find((member) => member.id === id)?.name ?? actor
  }
  if (snapshot.events.length === 0) return <p className="muted small">{t('Nothing yet.')}</p>
  return (
    <ul className="plain history">
      {snapshot.events.map((event) => (
        <li key={event.id}>
          <span className="muted">
            {formatTime(timeOfHour(snapshot.mission.startTime, event.hour))}
            <br />
            {actorName(event.actor)}
          </span>
          <span>{event.summary}</span>
        </li>
      ))}
    </ul>
  )
}
