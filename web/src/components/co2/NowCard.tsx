// Card 1 of the CO2 cards: the value now, and the 1-hour average against the NASA limit.
// The page gives the view and the texts that depend on where the value comes from.
import type { ReactNode } from 'react'
import { LIMIT_1H_MMHG } from '../../../../shared/co2.ts'
import { fmt, t, tn } from '../../i18n.ts'
import { SOURCE } from '../../live.ts'
import { REGION_LABEL, WINDOW_LABEL } from '../../texts.ts'
import { mmHgText, ppmText, type Co2View } from '../../view.ts'
import { Cite, LimitSays } from '../parts.tsx'
import { Tip } from '../Tip.tsx'
import { Meter } from './Meter.tsx'
import { SHAPE, type Status } from './status.ts'
import './cards.css'
import './now.css'

type Props = {
  view: Co2View
  // The tag next to the label, for example "Simulated value from the cabin model". It tells where the value now comes from.
  sourceText: string
  // The tooltip of the ppm value: how the page converts between ppm and mmHg, with the source if there is one.
  ppmTip: ReactNode
}

export function NowCard({ view, sourceText, ppmTip }: Props) {
  const hour = view.windows[0]
  const active = view.bands.filter((item) => item.intensity > 0)
  const regions = [...new Set(active.map((item) => REGION_LABEL[item.band.region]))]
  const status: Status = view.overLimit ? 'alert' : active.length ? 'caution' : 'normal'
  const headline = view.overLimit
    ? t('The 1-hour average is above the NASA limit.')
    : active.length
      ? tn(regions.length, 'In the range of reported symptoms: {regions}.', 'In the range of reported symptoms: {regions}.', { regions: regions.join(', ') })
      : t('Below each symptom band that NASA reports.')

  return (
    <section className="card xp-now" aria-label={t('Cabin CO2 now')}>
      <div className="xp-now-head">
        <span className="label">{t('Cabin CO2 now')}</span>
        {/* Only a value of the real record gets the plain tag. */}
        <span className={view.nowSource === SOURCE.record ? 'xp-tag' : 'xp-tag xp-tag-sim'}>{sourceText}</span>
      </div>
      <div className="xp-number">
        <span className="xp-digits display">{fmt(view.now, 2)}</span>
        <span className="xp-unit">mmHg</span>
      </div>
      <p className="xp-also">
        <Tip className="tip-line" tip={ppmTip}>
          {ppmText(view.nowPpm)}
        </Tip>
        {view.lastHour !== null && (
          <span className="muted">
            {' · '}
            {view.lastHour >= 0 ? t('+{change} mmHg in the last hour', { change: fmt(view.lastHour, 2) }) : t('−{change} mmHg in the last hour', { change: fmt(-view.lastHour, 2) })}
          </span>
        )}
      </p>
      <p className={`xp-state status-${status}`}>
        <span aria-hidden="true">{SHAPE[status]}</span> {headline}
      </p>
      <div className="xp-limit">
        <div className="xp-limit-text">
          <span>
            {WINDOW_LABEL.hour}: <strong>{mmHgText(hour.mmHg)}</strong>
          </span>
          <Cite source="std3001" own says={<LimitSays />}>
            {t('limit 3.0 mmHg')}
          </Cite>
        </div>
        <Meter value={hour.mmHg} reference={LIMIT_1H_MMHG} status={view.overLimit ? 'alert' : 'normal'} label={t('{value} of the limit of 3.0 mmHg', { value: mmHgText(hour.mmHg) })} />
      </div>
    </section>
  )
}
