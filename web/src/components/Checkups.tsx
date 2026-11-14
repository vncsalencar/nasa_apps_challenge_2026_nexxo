import { formatTime, timeOfHour, type Catalog, type Checkup, type CrewMember, type Snapshot } from '../api.ts'
import { t } from '../i18n.ts'

const ESCALATE_LABEL = {
  crew_medical_officer: t('If you confirm, the app tells the crew medical officer.'),
  flight_surgeon: t('If you confirm, the app tells the flight surgeons on the ground.'),
}

type Props = {
  snapshot: Snapshot
  catalog: Catalog
  // Show the check-ups of this crew member only. Without it, show the check-ups of all.
  crewId?: number
  // Show only the open check-ups, with no list of past answers.
  pendingOnly?: boolean
  // Show the question and the answers first. The reason and the advice open on request.
  compact?: boolean
  onAnswer: (checkup: Checkup, answer: 'confirmed' | 'dismissed') => void
}

export function Checkups({ snapshot, catalog, crewId, pendingOnly, compact, onAnswer }: Props) {
  const crewById = new Map<number, CrewMember>(snapshot.crew.map((member) => [member.id, member]))
  const ruleById = new Map(catalog.rules.map((rule) => [rule.id, rule]))
  const mine = snapshot.checkups.filter((checkup) => crewId === undefined || checkup.crewId === crewId)
  const pending = mine.filter((checkup) => checkup.status === 'pending')
  const answered = pendingOnly ? [] : mine.filter((checkup) => checkup.status !== 'pending').slice(0, 4)

  if (pendingOnly && pending.length === 0) return <p className="muted small">{t('No open check-ups.')}</p>
  if (mine.length === 0) return <p className="muted">{t('No check-ups. The app asks a question here when a value looks wrong.')}</p>

  return (
    <div className="checkups">
      {pending.map((checkup) => {
        const rule = ruleById.get(checkup.ruleId)
        if (!rule) return null
        return (
          <article key={checkup.id} className="checkup">
            <header>
              <strong>{rule.title}</strong>
              <span className="muted">
                {crewById.get(checkup.crewId)?.name} · {formatTime(timeOfHour(snapshot.mission.startTime, checkup.hour))}
              </span>
            </header>
            {!compact && <p>{checkup.reason}</p>}
            <p className="question">{rule.question}</p>
            <div className="row">
              <button type="button" className="primary" onClick={() => onAnswer(checkup, 'confirmed')}>
                {t('Yes')}
              </button>
              <button type="button" onClick={() => onAnswer(checkup, 'dismissed')}>
                {t('No, I feel fine')}
              </button>
            </div>
            {compact ? (
              <details className="muted small">
                <summary>{t('Why, and what to do')}</summary>
                <p>{checkup.reason}</p>
                <p>
                  {t('What to do: {action}', { action: rule.action })} {rule.escalate && ESCALATE_LABEL[rule.escalate]}
                </p>
              </details>
            ) : (
              <p className="muted small">
                {t('What to do: {action}', { action: rule.action })} {rule.escalate && ESCALATE_LABEL[rule.escalate]}
              </p>
            )}
          </article>
        )
      })}
      {pending.length === 0 && <p className="muted">{t('No open check-ups.')}</p>}
      {answered.length > 0 && (
        <ul className="plain small muted">
          {answered.map((checkup) => (
            <li key={checkup.id}>
              {t(checkup.status === 'confirmed' ? '{name}: {title}, symptom confirmed' : '{name}: {title}, no symptom', {
                name: crewById.get(checkup.crewId)?.name ?? '',
                title: ruleById.get(checkup.ruleId)?.title ?? '',
              })}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
