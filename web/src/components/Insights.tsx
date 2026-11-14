import { formatTime, timeOfHour, type Catalog, type Insight, type Snapshot } from '../api.ts'
import { t } from '../i18n.ts'
import { StatusBadge } from './StatusBadge.tsx'

const SEVERITY_STATUS = { info: 'normal', caution: 'caution', alert: 'alert' } as const
const URGENCY_WORD = { now: t('Now'), today: t('Today'), routine: t('When you have time') }
// Who wrote the insight and how sure the model is. One full sentence for each confidence.
const wrote = (confidence: Insight['confidence'], model: string, time: string) =>
  confidence === 'low'
    ? t('{model} wrote this at {time}, confidence: low.', { model, time })
    : confidence === 'medium'
      ? t('{model} wrote this at {time}, confidence: medium.', { model, time })
      : t('{model} wrote this at {time}, confidence: high.', { model, time })

// Shows the newest insight of the language model. The panel says clearly that a model wrote the text.
export function InsightPanel({ snapshot, catalog, onRequest }: { snapshot: Snapshot; catalog: Catalog; onRequest: () => void }) {
  const { llm, insights } = snapshot
  if (!llm.enabled) return null
  const pending = insights.some((insight) => insight.status === 'pending')
  const newest = insights.find((insight) => insight.status !== 'pending')
  const roleLabel = (role: string) => catalog.roles.find((candidate) => candidate.id === role)?.label ?? role
  const labelOf = (id: string) => catalog.indicators.find((indicator) => indicator.id === id)?.label ?? id

  return (
    <section className="panel" aria-labelledby="insight-title">
      <div className="row spread wrap">
        <h2 id="insight-title">
          {t('Insight')} <span className="source">{t('Written by a language model')}</span>
        </h2>
        <button type="button" disabled={pending} onClick={onRequest}>
          {pending ? t('The model works…') : t('Ask for a new insight')}
        </button>
      </div>
      {!newest && !pending && <p className="muted small">{t('No insight yet.')}</p>}
      {newest?.status === 'failed' && <p role="alert">{t('The last insight failed: {error}', { error: newest.error ?? '' })}</p>}
      {newest?.result && (
        <>
          <p>{newest.result.summary}</p>
          {newest.result.findings.length > 0 && (
            <ul className="plain">
              {newest.result.findings.map((finding, index) => (
                <li key={index} className="notification">
                  <span className="row spread wrap">
                    <strong>{finding.title}</strong>
                    <StatusBadge status={SEVERITY_STATUS[finding.severity]} />
                  </span>
                  <p className="small">{finding.detail}</p>
                  {finding.indicators.length > 0 && <span className="small muted">{t('Based on: {list}', { list: finding.indicators.map(labelOf).join(', ') })}</span>}
                </li>
              ))}
            </ul>
          )}
          {newest.result.actions.length > 0 && (
            <>
              <h3>{t('Suggested actions')}</h3>
              <ul className="plain">
                {newest.result.actions.map((action, index) => (
                  <li key={index} className="notification">
                    <strong>{action.title}</strong>
                    <p className="small">{action.detail}</p>
                    <span className="small muted">
                      {t('For: {role} · {urgency}', { role: roleLabel(action.role), urgency: URGENCY_WORD[action.urgency] })}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="muted small spaced">
            {wrote(newest.result.confidence, newest.model, formatTime(timeOfHour(snapshot.mission.startTime, newest.hour)))}{' '}
            {t('A model can be wrong. The check-ups and alerts of the app do not depend on it.')}
          </p>
        </>
      )}
    </section>
  )
}
