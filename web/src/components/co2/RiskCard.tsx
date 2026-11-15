// Card 3 of the CO2 cards: the headache risk from the three averages. Each average has its own reference.
import type { ReactNode } from 'react'
import { HEADACHE, LIMIT_1H_MMHG, relativeOdds } from '../../../../shared/co2.ts'
import { fmt, t } from '../../i18n.ts'
import { SOURCES, WINDOW_LABEL } from '../../texts.ts'
import { formatDuration, mmHgText, type Co2View, type WindowView } from '../../view.ts'
import { Cite, LimitSays, OddsSays } from '../parts.tsx'
import { Meter } from './Meter.tsx'
import { SHAPE, type Status } from './status.ts'
import './cards.css'
import './risk.css'

export function RiskCard({ view }: { view: Co2View }) {
  const [hour, day, week] = view.windows
  const oddsText = (odds: number) => `×${fmt(odds, 2)}`
  // The scale of the gauge: the 7-day average from 2 to 4.5 mmHg. Each +1 mmHg doubles the odds.
  const GAUGE = { low: HEADACHE.studyFloorMmHg, high: 4.5 }
  const at = (mmHg: number) => `${Math.min(100, Math.max(0, ((mmHg - GAUGE.low) / (GAUGE.high - GAUGE.low)) * 100))}%`
  const weekStatus: Status = week.mmHg < HEADACHE.referenceMmHg ? 'normal' : 'caution'

  const row = (window: WindowView, status: Status | 'none', reference: number, text: string, cite: ReactNode) => (
    <li className="xp-window">
      <div className="xp-window-top">
        <span className="xp-window-name">{WINDOW_LABEL[window.id]}</span>
        <span className="xp-window-value display">
          {fmt(window.mmHg, 2)} <small>mmHg</small>
        </span>
      </div>
      <Meter value={window.mmHg} reference={reference} status={status} label={`${WINDOW_LABEL[window.id]}: ${mmHgText(window.mmHg)}. ${text}`} />
      <div className="xp-window-foot">
        <span className={status === 'none' ? '' : `status-${status}`}>
          {status !== 'none' && <span aria-hidden="true">{SHAPE[status]} </span>}
          {text}
        </span>
        {cite}
      </div>
      {!window.complete && <p className="xp-partial">{t('Only {time} of data yet for this average.', { time: formatDuration(window.hoursOfData) })}</p>}
    </li>
  )
  const oddsOf = (window: WindowView) =>
    window.mmHg >= HEADACHE.studyFloorMmHg ? t('Headache odds {odds} of the odds at 2.5 mmHg', { odds: oddsText(relativeOdds(window.mmHg)) }) : t('Below 2 mmHg: too few data for an estimate')

  return (
    <section className="card xp-risk" aria-label={t('Headache risk')}>
      <div className="xp-card-head">
        <h2 className="xp-h2">{t('Headache risk')}</h2>
        <Cite source="law2014" own says={<OddsSays />} />
      </div>

      <div className="xp-odds">
        <div className="xp-odds-number">
          <span className="xp-odds-digits display">{view.odds === null ? '–' : oddsText(view.odds)}</span>
          <span className="xp-odds-what">
            {view.odds === null
              ? t('No estimate: the 7-day average is below 2 mmHg, where the station data is thin.')
              : t('the odds of a headache, compared with the odds at a 7-day average of 2.5 mmHg')}
          </span>
        </div>
        <div className="gauge" role="img" aria-label={view.odds === null ? t('No estimate') : t('Relative odds {odds}', { odds: oddsText(view.odds) })}>
          <div className="gauge-bar">
            <span className="gauge-mark" style={{ left: at(HEADACHE.referenceMmHg) }} />
            <span className={`gauge-dot meter-${view.odds === null ? 'none' : weekStatus}`} style={{ left: at(week.mmHg) }} />
          </div>
          <div className="gauge-ticks" aria-hidden="true">
            {[2, 2.5, 3.5, 4.5].map((mmHg) => (
              <span key={mmHg} style={{ left: at(mmHg) }}>
                ×{fmt(relativeOdds(mmHg), mmHg === 2 ? 1 : 0)}
              </span>
            ))}
          </div>
        </div>
        {/* The task of the hackathon team fixes this label text. */}
        <p className="xp-estimate">{t('population-level estimate, not a diagnosis')}</p>
      </div>

      <ul className="xp-windows">
        {row(
          hour,
          hour.mmHg > LIMIT_1H_MMHG ? 'alert' : 'normal',
          LIMIT_1H_MMHG,
          hour.mmHg > LIMIT_1H_MMHG ? t('Above the NASA limit of 3.0 mmHg') : t('{percent}% of the NASA limit of 3.0 mmHg', { percent: Math.round((hour.mmHg / LIMIT_1H_MMHG) * 100) }),
          <Cite source="std3001" own says={<LimitSays />}>
            {SOURCES.std3001.short}
          </Cite>,
        )}
        {row(
          day,
          'none',
          HEADACHE.referenceMmHg,
          oddsOf(day),
          <Cite source="law2014" own says={<OddsSays />}>
            {SOURCES.law2014.short}
          </Cite>,
        )}
        {row(
          week,
          weekStatus,
          HEADACHE.referenceMmHg,
          week.mmHg < HEADACHE.referenceMmHg ? t('Below 2.5 mmHg: headache risk under 1%') : t('At or above 2.5 mmHg: headache risk of 1% or more'),
          <Cite
            source="ochmo"
            says={
              <>
                <strong>{t('To keep the risk of a headache below 1%, the 7-day average must stay below 2.5 mmHg.')}</strong>
                <br />
                {t('The brief takes this number from the study of Law and others, 2014.')}
              </>
            }
          >
            {SOURCES.ochmo.short}
          </Cite>,
        )}
      </ul>
      <p className="xp-note">{t('The mark on each bar is the reference of that average. A 1-hour value is never compared with the 7-day reference.')}</p>
    </section>
  )
}
