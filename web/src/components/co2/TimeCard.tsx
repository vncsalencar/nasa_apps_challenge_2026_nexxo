// Card 4 of the CO2 cards: the time until the model reaches the limit and each symptom band,
// with the chart of the last 24 hours and the next 24 hours. The page tells which model it is.
import { Suspense, lazy, type ReactNode } from 'react'
import { fmt, t } from '../../i18n.ts'
import { formatDuration, mmHgText, type Co2View, type Countdown } from '../../view.ts'
import { ThresholdTip } from '../parts.tsx'
import { Tip } from '../Tip.tsx'
import type { Status } from './status.ts'
import './cards.css'
import './time.css'

// The chart loads after the first paint, because it brings a large library.
const Co2Chart = lazy(() => import('../Co2Chart.tsx'))

type Props = {
  view: Co2View
  // The line in the head of the card with the inputs of the model, for example "6 persons · CDRA: both beds"
  // and a tooltip that tells how the model works.
  inputs: ReactNode
  // The end of the note below the chart: what the projection starts from and what it uses.
  // The card puts the fixed sentence about the well-mixed model before it.
  note: ReactNode
  // What "view.balance" is. "level": the value where the model stops (the cabin model of the CO2 page).
  // "dailyMean": the mean of a full day of a model with a daily pattern (the trip page).
  steady?: 'level' | 'dailyMean'
}

// What the model says for one value of the countdown.
function crossing(item: Countdown): { text: string; tone: 'soon' | 'never' | 'above' } {
  if (item.side === 'below') return item.hours === null ? { text: t('not reached'), tone: 'never' } : { text: t('in {time}', { time: formatDuration(item.hours) }), tone: 'soon' }
  if (item.hours === null || item.hours === 0) return { text: t('above now'), tone: 'above' }
  return { text: t('above now, below in {time}', { time: formatDuration(item.hours) }), tone: 'above' }
}

export function TimeCard({ view, inputs, note, steady = 'level' }: Props) {
  const limit = view.toLimit
  const { balance, rate } = view
  const hasBalance = Number.isFinite(balance)
  const levels =
    steady === 'level'
      ? hasBalance
        ? t('The model levels at {value}.', { value: mmHgText(balance) })
        : t('Nothing removes CO2, so the value rises without an end.')
      : hasBalance
        ? t('The mean of a full day is {value}.', { value: mmHgText(balance) })
        : t('The model reaches no steady daily pattern.')
  let big: string
  let what: string
  let status: Status
  // A time is short, so it gets the large letters. A sentence gets smaller letters.
  let isTime = true
  if (limit.side === 'below' && limit.hours !== null) {
    big = formatDuration(limit.hours)
    what = t('until the model reaches 3.0 mmHg')
    status = limit.hours <= 6 ? 'alert' : 'caution'
  } else if (limit.side === 'below') {
    big = t('Not reached')
    what = t('The model stays below 3.0 mmHg.') + ' ' + levels
    status = 'normal'
    isTime = false
  } else if (limit.hours !== null && limit.hours > 0) {
    big = formatDuration(limit.hours)
    what = t('until the model falls below 3.0 mmHg. The value is above it now.')
    status = 'alert'
  } else {
    big = t('Above 3.0 mmHg')
    what = t('The model stays above 3.0 mmHg.') + ' ' + levels
    status = 'alert'
    isTime = false
  }

  return (
    <section className="card xp-time" aria-label={t('Time to limit')}>
      <div className="xp-card-head">
        <h2 className="xp-h2">{t('Time to limit')}</h2>
        <span className="xp-inputs">{inputs}</span>
      </div>

      <div className="xp-time-main">
        <div className="xp-count">
          <span className={`xp-count-digits display status-${status} ${isTime ? '' : 'xp-count-words'}`}>{big}</span>
          <span className="xp-count-what">{what}</span>
          <span className="xp-count-rate muted">
            {rate >= 0 ? t('Now: +{rate} mmHg each hour', { rate: fmt(rate, 3) }) : t('Now: −{rate} mmHg each hour', { rate: fmt(-rate, 3) })}
            {hasBalance && ` · ${steady === 'level' ? t('balance at {value}', { value: mmHgText(balance) }) : t('daily mean {value}', { value: mmHgText(balance) })}`}
          </span>
          <ul className="xp-crossings">
            {view.countdowns.map((item) => {
              const cross = crossing(item)
              return (
                <li key={item.target} className={`xp-cross xp-cross-${cross.tone}`}>
                  <Tip className="tip-line" tip={<ThresholdTip target={item.target} />}>
                    <span className="mono">{fmt(item.target, 1)} mmHg</span>
                  </Tip>
                  <span className="xp-cross-when">{cross.text}</span>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="xp-chart">
          <Suspense fallback={<div className="chart-plot" />}>
            <Co2Chart points={view.chart} pressure={view.pressure} bandStarts={view.countdowns.map((item) => item.target)} />
          </Suspense>
        </div>
      </div>
      {/* The task of the hackathon team fixes the first sentence of this label. */}
      <p className="xp-note">
        {t('Well-mixed model: real local exposure near the face can be higher (microgravity pockets).')} {note}
      </p>
    </section>
  )
}
