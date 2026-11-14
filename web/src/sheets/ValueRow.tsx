// One value as a large tile. A click opens the tile: what to do, the trend, the status in words,
// the normal range, and why the app measures the value.
// The Cabin sheet and the Body sheet use it. The styles (vr-) are in body.css.
import { Children, Suspense, lazy, useState, useSyncExternalStore, type ReactNode, type TransitionEvent } from 'react'
import { STATUS_LABEL, formatRange, formatTime, timeOfHour, type Indicator, type Point, type Reading, type Snapshot } from '../api.ts'
import { Icon } from '../components/Icon.tsx'
import { RangeBar } from '../components/RangeBar.tsx'
import { SourceTag } from '../components/StatusBadge.tsx'
import { SHAPE, adviceFor } from '../derive.ts'
import { fmt, t } from '../i18n.ts'
import './body.css'

// The chart library is large. The page loads it when the person opens the first tile.
const TrendChart = lazy(() => import('../components/TrendChart.tsx').then((module) => ({ default: module.TrendChart })))

const RANGES = [
  { hours: 24, label: t('24 hours') },
  { hours: 168, label: t('7 days') },
  { hours: 720, label: t('30 days') },
]

type Props = {
  indicator: Indicator
  reading: Reading | undefined
  // The readings of the last 30 days, each one as [hour, value, source].
  points: Point[]
  snapshot: Snapshot
  // The usual value of this person. Give it for a body value only.
  baseline?: number
  symptomHours?: number[]
  open: boolean
  onToggle: () => void
  // A quiet tile is smaller. Use it for a value that the server computes from other values.
  quiet?: boolean
}

// A number with the decimals that it has, in the way of the language: 3, or 37.5 in English and 37,5 in Portuguese.
const plain = (value: number) => fmt(value, (String(value).split('.')[1] ?? '').length)

// Says the status in one sentence, with the limit that the value passed.
function statusSentence(indicator: Indicator, reading: Reading) {
  // A space that does not break keeps the number and its unit on one line.
  const unit = ` ${indicator.unit}`
  const value = `${fmt(reading.value, indicator.decimals)}${unit}`
  if (reading.status === 'normal') return t('{value} is in the normal range.', { value })
  const [low, high] = indicator.normal
  const side = high !== null && reading.value > high ? 'above' : low !== null && reading.value < low ? 'below' : null
  if (!side) return t('{value} is not normal.', { value })
  const limit = indicator.caution[side === 'above' ? 1 : 0]
  const pastLimit = limit !== null && (side === 'above' ? reading.value > limit : reading.value < limit)
  if (reading.status === 'alert' && pastLimit) {
    const names = { value, limit: `${plain(limit)}${unit}` }
    return side === 'above' ? t('{value} is above the alert limit of {limit}.', names) : t('{value} is below the alert limit of {limit}.', names)
  }
  return side === 'above' ? t('{value} is above the normal range.', { value }) : t('{value} is below the normal range.', { value })
}

// Says how far the value is from the usual value of this person.
function distanceSentence(indicator: Indicator, value: number, baseline: number) {
  const distance = Number(value.toFixed(indicator.decimals)) - Number(baseline.toFixed(indicator.decimals))
  if (Number(Math.abs(distance).toFixed(indicator.decimals)) === 0) return t('The value now is the same.')
  const names = { distance: fmt(Math.abs(distance), indicator.decimals), unit: indicator.unit }
  return distance > 0 ? t('The value now is {distance} {unit} above it.', names) : t('The value now is {distance} {unit} below it.', names)
}

// Puts the tiles in two columns on a wide screen, and in one column on a phone.
// Each column is on its own. So an open tile moves only the tiles below it, and no tile jumps to the side.
const WIDE = '(min-width: 720px)'
const watchWidth = (onChange: () => void) => {
  const query = window.matchMedia(WIDE)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}
export function ValueGrid({ children }: { children: ReactNode }) {
  const wide = useSyncExternalStore(watchWidth, () => window.matchMedia(WIDE).matches)
  const tiles = Children.toArray(children)
  if (!wide || tiles.length < 2) return <div className="vr-grid">{tiles}</div>
  return (
    <div className="vr-grid vr-grid-two">
      <div className="vr-col">{tiles.filter((_, index) => index % 2 === 0)}</div>
      <div className="vr-col">{tiles.filter((_, index) => index % 2 === 1)}</div>
    </div>
  )
}

export function ValueRow({ indicator, reading, points, snapshot, baseline, symptomHours, open, onToggle, quiet }: Props) {
  const [hours, setHours] = useState(168)
  // The content stays in the page while the tile closes, so the tile can move shut.
  const [filled, setFilled] = useState(open)
  if (open && !filled) setFilled(true)
  const emptyAfterClose = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && event.propertyName === 'grid-template-rows' && !open) setFilled(false)
  }

  const status = reading?.status ?? 'normal'
  const bodyId = `vr-${indicator.id}`
  // A value that comes one time each day has no trend in 24 hours.
  const ranges = indicator.cadence === 'day' ? RANGES.filter((range) => range.hours > 24) : RANGES
  const lastHour = snapshot.mission.hour - 1
  const firstHour = lastHour - hours
  const shown = points.filter((point) => point[0] >= firstHour)
  const steps = reading && reading.status !== 'normal' ? adviceFor(indicator, reading.value).split(/(?<=[.!?])\s+/).filter(Boolean) : []

  return (
    <div className={`vr-row ${quiet ? 'vr-quiet' : ''} ${open ? 'vr-open' : ''}`} data-indicator={indicator.id}>
      <button type="button" className="vr-head" aria-expanded={open} aria-controls={bodyId} onClick={onToggle}>
        <span className="vr-top">
          <span className="vr-label">{indicator.label}</span>
          {reading ? (
            <span className={`vr-status status-${status}`}>
              <span aria-hidden="true">{SHAPE[status]}</span> {STATUS_LABEL[status]}
            </span>
          ) : (
            <span className="vr-status vr-none">{t('No value yet')}</span>
          )}
        </span>
        {reading && (
          <span className="vr-mid">
            <span className="vr-value display">
              {fmt(reading.value, indicator.decimals)}
              <span className="vr-unit"> {indicator.unit}</span>
            </span>
            <span className="vr-bar">
              <RangeBar indicator={indicator} value={reading.value} status={status} baseline={baseline} />
            </span>
          </span>
        )}
        <span className="vr-foot">
          <span className="vr-normal">{t('Normal is {range}', { range: formatRange(indicator.normal, indicator.unit) })}</span>
          <span className="vr-more">
            {open ? t('Close') : t('Details')}
            <Icon name="chevron" size={18} />
          </span>
        </span>
      </button>

      <div className="vr-fold" id={bodyId} onTransitionEnd={emptyAfterClose}>
        <div className="vr-fold-in">
          {filled && (
            <div className="vr-body">
              {steps.length > 0 && (
                <div className="vr-do">
                  <span className="vr-do-label">{t('What to do')}</span>
                  {steps.length === 1 ? (
                    <p className="vr-do-text">{steps[0]}</p>
                  ) : (
                    <ol className="vr-do-steps">
                      {steps.map((step, index) => (
                        <li key={step}>
                          <span className="vr-do-number" aria-hidden="true">{index + 1}</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}

              <div className="vr-trend">
                <div className="vr-ranges" role="group" aria-label={t('Time range of the chart')}>
                  {ranges.map((range) => (
                    <button type="button" key={range.hours} className="pill" aria-pressed={hours === range.hours} onClick={() => setHours(range.hours)}>
                      {range.label}
                    </button>
                  ))}
                </div>
                <div className="vr-chart">
                  <Suspense fallback={<p className="vr-wait">{t('Loading the chart…')}</p>}>
                    <TrendChart
                      indicator={indicator}
                      points={shown}
                      startTime={snapshot.mission.startTime}
                      recordHours={snapshot.mission.recordHours}
                      symptomHours={symptomHours}
                      range={[firstHour, lastHour]}
                    />
                  </Suspense>
                </div>
                {symptomHours && symptomHours.some((hour) => hour >= firstHour) && (
                  <p className="vr-legend">
                    <span className="vr-legend-line" aria-hidden="true" /> {t('A red line shows the time of a symptom report.')}
                  </p>
                )}
              </div>

              <dl className="vr-facts">
                {reading && (
                  <div>
                    <dt>{t('Status')}</dt>
                    <dd>
                      <span className={`vr-word status-${status}`}>
                        <span aria-hidden="true">{SHAPE[status]}</span> {STATUS_LABEL[status]}
                      </span>{' '}
                      {statusSentence(indicator, reading)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt>{t('Normal range')}</dt>
                  <dd>{formatRange(indicator.normal, indicator.unit)}</dd>
                </div>
                {baseline !== undefined && (
                  <div>
                    <dt>{t('Your usual')}</dt>
                    <dd>
                      {fmt(baseline, indicator.decimals)} {indicator.unit}. {reading && distanceSentence(indicator, reading.value, baseline)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt>{t('Why the app measures this')}</dt>
                  <dd>{indicator.why}</dd>
                </div>
              </dl>

              {reading && (
                <p className="vr-source">
                  <SourceTag source={reading.source} /> {t('Measured {time} UTC', { time: formatTime(timeOfHour(snapshot.mission.startTime, reading.hour)) })}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
