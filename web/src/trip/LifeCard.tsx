// The life support card of the trip page: the CO2 and the O2 of the cabin at the cursor of the
// mission, and from 24 hours before it to 48 hours after it. The card shows what it gets. It
// reads no live data. shared/trip/lifesupport.ts makes the forecast.
import { useId, useState, type ReactNode } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { LIMIT_1H_MMHG, STEPS_PER_HOUR, rollingMean } from '../../../shared/co2.ts'
import { O2_SOURCE } from '../../../shared/trip/lifesupport.ts'
import { O2_RANGE_MMHG, type Activity, type CabinForecast, type LifeSupport, type SourceRef } from '../../../shared/trip/types.ts'
import { Icon } from '../components/Icon.tsx'
import { LimitSays } from '../components/parts.tsx'
import { Tip } from '../components/Tip.tsx'
import { fmt, t, tn } from '../i18n.ts'
import { CDRA_LABEL } from '../texts.ts'
import { formatDuration } from '../view.ts'
import { Badge } from './Badge.tsx'
import '../components/chart.css'
import './life.css'

// A state is a shape, a word, and a color, as on the CO2 page.
const SHAPE = { normal: '●', caution: '▲', alert: '■' } as const
type Status = keyof typeof SHAPE

const ACTIVITY_NOW: Record<Activity, string> = {
  sleep: t('The crew sleeps'),
  nominal: t('The crew does normal work'),
  exercise: t('The crew exercises'),
}

// The width of the y axis and the space at the right of each chart, in px. The strip below the
// charts uses the same numbers, so its hours are below the same hours of the charts.
const AXIS_WIDTH = 40
const PLOT_RIGHT = 12
const LIMIT_TEXT = fmt(LIMIT_1H_MMHG, 1)

// A text of a preset or of a source can be empty. An empty text must not reach t().
const tx = (text: string | undefined) => (text ? t(text) : '')

// The line at the end of a tooltip that names a source of the trip and links to it.
export function RefLine({ source }: { source: SourceRef }) {
  const title = (tx(source.title) || tx(source.short)).replace(/\.$/, '')
  return (
    <span className="tip-source">
      {t('Source:')} {title}.{' '}
      {source.url ? (
        <a href={source.url} target="_blank" rel="noreferrer">
          {t('Open the source')}
        </a>
      ) : (
        t('This source has no link yet.')
      )}
      {source.credit && <span className="lf-credit">{source.credit}</span>}
    </span>
  )
}

// The short name of a source as a text that opens a tooltip with the full source.
export function RefCite({ source, says }: { source: SourceRef; says?: ReactNode }) {
  return (
    <Tip
      className="tip-line"
      tip={
        <>
          {says && <span className="tip-part">{says}</span>}
          <RefLine source={source} />
        </>
      }
    >
      {tx(source.short)}
    </Tip>
  )
}

// A small "i" that opens a tooltip.
export function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tip className="lf-info" label={label} tip={children}>
      <Icon name="info" size={16} />
    </Tip>
  )
}

type Props = {
  forecast: CabinForecast
  // The life support settings now.
  life: LifeSupport
  // The CO2 that ONE person makes in a full day and the O2 that ONE person uses in a full day, in kg,
  // with the metabolic rates and the schedule of the settings ("dailyTotals" of shared/trip/lifesupport.ts).
  nominalDailyCo2Kg: number
  nominalDailyO2Kg: number
  // The name of the metabolic rates that the model uses, and where they come from.
  metabolicLabel: string
  metabolicSource: SourceRef
}

type Alert = { id: string; status: Status; cause?: string; text: string }

// The alerts with a countdown. An alert shows when a system is not in its normal state, or
// when the model says that the value will leave its limit.
// "hoursToCo2" and "hoursToO2" give the time until the value crosses the target, from below or from above.
// "o2Status" is the state of the O2 value now.
function alertsOf(forecast: CabinForecast, life: LifeSupport, o2Status: Status): Alert[] {
  const alerts: Alert[] = []
  const { co2MmHg, o2MmHg } = forecast.now

  const toLimit = forecast.hoursToCo2(LIMIT_1H_MMHG)
  if (life.scrubber !== 'both' || toLimit !== null || co2MmHg >= LIMIT_1H_MMHG) {
    const cause = life.scrubber === 'one' ? t('CO2 scrubber on one bed') : life.scrubber === 'off' ? t('CO2 scrubber off') : undefined
    let status: Status = 'caution'
    let text = ''
    if (co2MmHg >= LIMIT_1H_MMHG) {
      status = 'alert'
      text =
        toLimit !== null && toLimit > 0
          ? t('CO2 is above {limit} mmHg now. It falls below {limit} mmHg in {time}', { limit: LIMIT_TEXT, time: formatDuration(toLimit) })
          : t('CO2 is at or above {limit} mmHg now', { limit: LIMIT_TEXT })
    } else if (toLimit === null) {
      status = 'normal'
      text = t('CO2 does not reach {limit} mmHg in the next 30 days', { limit: LIMIT_TEXT })
    } else text = t('CO2 reaches {limit} mmHg in {time}', { limit: LIMIT_TEXT, time: formatDuration(toLimit) })
    alerts.push({ id: 'co2', status, cause, text })
  }

  const { low, high } = O2_RANGE_MMHG
  const toLow = forecast.hoursToO2(low)
  const toHigh = forecast.hoursToO2(high)
  if (!life.ogaOn || toLow !== null || toHigh !== null || o2MmHg < low || o2MmHg > high) {
    const cause = life.ogaOn ? undefined : t('Oxygen generator off')
    let status: Status = 'caution'
    let text = ''
    if (o2MmHg < low) {
      status = o2Status
      text = toLow !== null && toLow > 0 ? t('O2 is below {value} mmHg now. It rises above {value} mmHg in {time}', { value: low, time: formatDuration(toLow) }) : t('O2 is below {value} mmHg now', { value: low })
    } else if (o2MmHg > high) {
      status = o2Status
      text = toHigh !== null && toHigh > 0 ? t('O2 is above {value} mmHg now. It falls below {value} mmHg in {time}', { value: high, time: formatDuration(toHigh) }) : t('O2 is above {value} mmHg now', { value: high })
    } else if (toLow !== null && (toHigh === null || toLow <= toHigh)) text = t('O2 falls below {value} mmHg in {time}', { value: low, time: formatDuration(toLow) })
    else if (toHigh !== null) text = t('O2 rises above {value} mmHg in {time}', { value: high, time: formatDuration(toHigh) })
    else {
      status = 'normal'
      text = t('O2 stays between {low} and {high} mmHg for the next 30 days', { low, high })
    }
    alerts.push({ id: 'o2', status, cause, text })
  }
  return alerts
}

type Run = { activity: Activity; from: number; to: number }

// The hours where the crew does one thing, in the order of the chart.
function runsOf(chart: CabinForecast['chart']): Run[] {
  const runs: Run[] = []
  for (const point of chart) {
    const last = runs[runs.length - 1]
    if (last && last.activity === point.activity) last.to = point.hour
    else {
      // A run ends where the next one starts, so the runs touch.
      if (last) last.to = point.hour
      runs.push({ activity: point.activity, from: point.hour, to: point.hour })
    }
  }
  return runs
}

// A scale that ends on round numbers and has at most 6 marks.
function scale(low: number, high: number, steps: number[]): { domain: [number, number]; ticks: number[]; step: number } {
  const step = steps.find((size) => (high - low) / size <= 5) ?? steps[steps.length - 1]
  const from = Math.floor(low / step + 1e-9) * step
  const to = Math.ceil(high / step - 1e-9) * step
  const ticks: number[] = []
  for (let value = from; value <= to + 1e-9; value += step) ticks.push(Number(value.toFixed(6)))
  return { domain: [from, to], ticks, step }
}

const hourTick = (hour: number) => (hour === 0 ? t('now') : hour < 0 ? t('−{hours} h', { hours: -hour }) : t('+{hours} h', { hours: hour }))
const hourText = (hour: number) => (hour === 0 ? t('Now') : hour < 0 ? t('{time} ago', { time: formatDuration(-hour) }) : t('in {time}', { time: formatDuration(hour) }))

type AirChartProps = {
  points: CabinForecast['chart']
  dataKey: 'co2MmHg' | 'o2MmHg'
  name: string
  decimals: number
  axis: ReturnType<typeof scale>
  hours: [number, number]
  runs: Run[]
  syncId: string
  // The limit line or the band of the normal range.
  marks: ReactNode
}

// One chart of the cabin air. The CO2 and the O2 each get their own chart, because their scales differ.
function AirChart({ points, dataKey, name, decimals, axis, hours, runs, syncId, marks }: AirChartProps) {
  // A narrow chart has a mark each 24 hours. A wider one has a mark each 12 hours.
  const [narrow, setNarrow] = useState(false)
  const step = narrow ? 24 : 12
  const hourTicks: number[] = []
  for (let hour = Math.ceil(hours[0] / step) * step; hour <= hours[1]; hour += step) hourTicks.push(hour)
  return (
    <div className="lf-chart">
      <div className="lf-chart-name">{name}</div>
      <div className="lf-plot">
        <ResponsiveContainer width="100%" height="100%" onResize={(width) => setNarrow(width < 300)}>
          <LineChart data={points} syncId={syncId} margin={{ top: 8, right: PLOT_RIGHT, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis dataKey="hour" type="number" domain={hours} ticks={hourTicks} tickFormatter={hourTick} interval={0} stroke="var(--axis)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
            <YAxis domain={axis.domain} ticks={axis.ticks} tickFormatter={(value: number) => fmt(value, axis.step < 1 ? 1 : 0)} width={AXIS_WIDTH} stroke="var(--axis)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
            {/* A calm shade where the crew sleeps. The strip below the charts also shows the exercise. */}
            {runs
              .filter((run) => run.activity === 'sleep')
              .map((run) => (
                <ReferenceArea key={run.from} x1={run.from} x2={run.to} fill="var(--text)" fillOpacity={0.045} stroke="none" ifOverflow="hidden" />
              ))}
            {marks}
            <ReferenceLine x={0} stroke="var(--text-muted)" />
            <Tooltip
              isAnimationActive={false}
              cursor={{ stroke: 'var(--text-muted)' }}
              content={({ active, payload }) => {
                const point = active ? (payload?.[0]?.payload as CabinForecast['chart'][number] | undefined) : undefined
                if (!point) return null
                return (
                  <div className="chart-tip">
                    <div className="muted">{hourText(point.hour)}</div>
                    <div>
                      <strong>
                        {fmt(point[dataKey], decimals)} mmHg
                      </strong>
                    </div>
                    <div className="muted">{ACTIVITY_NOW[point.activity]}</div>
                  </div>
                )
              }}
            />
            <Line dataKey={dataKey} type="linear" stroke="var(--sim)" strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: 'var(--surface)', strokeWidth: 2 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function LifeCard({ forecast, life, nominalDailyCo2Kg, nominalDailyO2Kg, metabolicLabel, metabolicSource }: Props) {
  const syncId = useId()
  const { now, chart } = forecast
  const { low, high } = O2_RANGE_MMHG

  // The NASA limit is for the average of one hour, so the state of the CO2 uses that average.
  const hourMean = rollingMean(forecast.pastCo2MmHg, STEPS_PER_HOUR)?.mean ?? now.co2MmHg
  const co2Status: Status = hourMean > LIMIT_1H_MMHG ? 'alert' : now.co2MmHg > LIMIT_1H_MMHG ? 'caution' : 'normal'
  const co2Word =
    co2Status === 'alert'
      ? t('The 1-hour average is above the NASA limit')
      : co2Status === 'caution'
        ? t('Above {limit} mmHg now. The 1-hour average is within the limit', { limit: LIMIT_TEXT })
        : t('Within the NASA limit')
  // The O2 has a normal range, and outside it a lower limit for the average of one hour and an upper limit.
  const lastHourO2 = chart.filter((point) => point.hour > -1 && point.hour <= 0).map((point) => point.o2MmHg)
  const hourMeanO2 = lastHourO2.length ? lastHourO2.reduce((sum, value) => sum + value, 0) / lastHourO2.length : now.o2MmHg
  const tooLow = hourMeanO2 < O2_SOURCE.mildHypoxiaMmHg
  const tooHigh = now.o2MmHg > O2_SOURCE.highLimitMmHg
  const o2Status: Status = tooLow || tooHigh ? 'alert' : now.o2MmHg < low || now.o2MmHg > high ? 'caution' : 'normal'
  const o2Word = tooLow
    ? t('The 1-hour average is below {value} mmHg, the lower limit for mild hypoxia', { value: O2_SOURCE.mildHypoxiaMmHg })
    : tooHigh
      ? t('Above {value} mmHg, the upper limit', { value: O2_SOURCE.highLimitMmHg })
      : now.o2MmHg < low
        ? t('Below the normal range')
        : now.o2MmHg > high
          ? t('Above the normal range')
          : t('In the normal range')

  const alerts = alertsOf(forecast, life, o2Status)
  const runs = runsOf(chart)
  const hours: [number, number] = chart.length ? [chart[0].hour, chart[chart.length - 1].hour] : [-24, 48]
  const span = hours[1] - hours[0] || 1
  const at = (hour: number) => `${((hour - hours[0]) / span) * 100}%`
  const co2Values = chart.map((point) => point.co2MmHg)
  const o2Values = chart.map((point) => point.o2MmHg)
  // The limit and the normal range are always in view.
  const co2Axis = scale(Math.min(...co2Values, LIMIT_1H_MMHG - 1), Math.max(...co2Values, LIMIT_1H_MMHG + 0.3), [0.5, 1, 2, 5, 10, 20, 50, 100])
  const o2Axis = scale(Math.min(...o2Values, low - 2), Math.max(...o2Values, high + 2), [5, 10, 20, 50, 100])

  // The lower limit of the O2 shows in the chart when the O2 falls far enough.
  const showLowLimit = o2Axis.domain[0] <= O2_SOURCE.mildHypoxiaMmHg
  // A generator with no rate of its own makes what the crew uses in a day.
  const ogaKgPerDay = life.ogaKgPerDay ?? nominalDailyO2Kg * life.crew
  const scrubberStatus: Status = life.scrubber === 'both' ? 'normal' : life.scrubber === 'one' ? 'caution' : 'alert'
  const hasBottles = life.bottledO2Kg > 0 || now.bottledO2Kg > 0

  return (
    <section className="card lf" aria-label={t('Cabin air')}>
      <div className="lf-head">
        <div>
          <h2 className="lf-h2">{t('Cabin air')}</h2>
          <p className="lf-legend">{t('The CO2 and the O2 of the cabin at this point of the mission, from a model of the cabin air.')}</p>
        </div>
        <Badge kind="modelled" />
      </div>

      <div className="lf-main">
        <div className="lf-side">
          <div className="lf-values">
            <div className="lf-value">
              <span className="label">{t('CO2 partial pressure now')}</span>
              <div className="lf-number">
                <span className="lf-digits display">{fmt(now.co2MmHg, 2)}</span>
                <span className="lf-unit">mmHg</span>
              </div>
              <p className={`lf-state status-${co2Status}`}>
                <span aria-hidden="true">{SHAPE[co2Status]}</span> {co2Word}
              </p>
              <p className="lf-ref">
                {t('1-hour average {value} mmHg', { value: fmt(hourMean, 2) })}
                {' · '}
                <Tip className="tip-line" tip={<LimitSays />}>
                  {t('limit 3.0 mmHg')}
                </Tip>
              </p>
            </div>
            <div className="lf-value">
              <span className="label">{t('Inspired O2 partial pressure now')}</span>
              <div className="lf-number">
                <span className="lf-digits display">{fmt(now.o2MmHg, 1)}</span>
                <span className="lf-unit">mmHg</span>
              </div>
              <p className={`lf-state status-${o2Status}`}>
                <span aria-hidden="true">{SHAPE[o2Status]}</span> {o2Word}
              </p>
              <p className="lf-ref">
                <Tip
                  className="tip-line"
                  tip={
                    <>
                      <span className="tip-part">
                        <strong>{t(O2_SOURCE.quantity)}</strong>
                        <br />
                        {t(O2_SOURCE.formula)}
                      </span>
                      <span className="tip-part">
                        {t(O2_SOURCE.says)}
                        <RefLine source={O2_SOURCE.source} />
                      </span>
                    </>
                  }
                >
                  {t('normal range {low} to {high} mmHg', { low, high })}
                </Tip>
              </p>
            </div>
          </div>

          <ul className="lf-alerts" aria-label={t('Alerts')}>
            {alerts.map((alert) => (
              <li key={alert.id} className={`lf-alert lf-alert-${alert.status}`}>
                <span className={`lf-alert-shape status-${alert.status}`} aria-hidden="true">
                  {SHAPE[alert.status]}
                </span>
                <span>
                  {alert.cause && <span className="lf-alert-cause">{alert.cause}</span>}
                  <span className="lf-alert-text">{alert.text}</span>
                </span>
              </li>
            ))}
            {alerts.length === 0 && (
              <li className="lf-alert lf-alert-normal">
                <span className="lf-alert-shape status-normal" aria-hidden="true">
                  {SHAPE.normal}
                </span>
                <span className="lf-alert-text">{t('No alert: the model keeps the CO2 and the O2 within their limits for the next 30 days.')}</span>
              </li>
            )}
          </ul>

          <dl className="lf-facts">
            <div>
              <dt>{t('Crew now')}</dt>
              <dd>{ACTIVITY_NOW[now.activity]}</dd>
            </div>
            <div>
              <dt>
                {t('Mean CO2 of a full day')}{' '}
                <Info label={t('About the mean CO2 of a full day')}>{t('The mean CO2 of a full day with the settings now, after the cabin reached its daily pattern.')}</Info>
              </dt>
              <dd>{forecast.dailyMeanCo2MmHg === null ? t('No daily level: the CO2 rises') : `${fmt(forecast.dailyMeanCo2MmHg, 2)} mmHg`}</dd>
            </div>
            {hasBottles && (
              <div>
                <dt>{t('O2 in the bottles')}</dt>
                <dd>{t('{mass} kg', { mass: fmt(now.bottledO2Kg, 1) })}</dd>
              </div>
            )}
          </dl>
        </div>

        <figure className="lf-charts">
          <AirChart
            points={chart}
            dataKey="co2MmHg"
            name={t('CO2 partial pressure, mmHg')}
            decimals={2}
            axis={co2Axis}
            hours={hours}
            runs={runs}
            syncId={syncId}
            marks={<ReferenceLine y={LIMIT_1H_MMHG} stroke="var(--critical)" strokeDasharray="6 4" />}
          />
          <AirChart
            points={chart}
            dataKey="o2MmHg"
            name={t('Inspired O2 partial pressure, mmHg')}
            decimals={1}
            axis={o2Axis}
            hours={hours}
            runs={runs}
            syncId={syncId}
            marks={[
              <ReferenceArea key="band" y1={low} y2={high} fill="var(--good)" fillOpacity={0.09} stroke="none" ifOverflow="hidden" />,
              <ReferenceLine key="low" y={low} stroke="var(--good)" strokeOpacity={0.7} strokeDasharray="2 4" />,
              <ReferenceLine key="high" y={high} stroke="var(--good)" strokeOpacity={0.7} strokeDasharray="2 4" />,
              showLowLimit && <ReferenceLine key="limit" y={O2_SOURCE.mildHypoxiaMmHg} stroke="var(--critical)" strokeDasharray="6 4" />,
            ]}
          />
          <div className="lf-strip-box" style={{ marginLeft: AXIS_WIDTH, marginRight: PLOT_RIGHT }}>
            <div className="lf-strip" role="img" aria-label={t('The hours where the crew sleeps and where it exercises')}>
              {runs
                .filter((run) => run.activity !== 'nominal')
                .map((run) => (
                  <i key={run.from} className={`lf-run lf-run-${run.activity}`} style={{ left: at(run.from), width: `${((run.to - run.from) / span) * 100}%` }} />
                ))}
              {hours[0] <= 0 && hours[1] >= 0 && <i className="lf-strip-now" style={{ left: at(0) }} />}
            </div>
          </div>
          <figcaption className="chart-keys">
            <span className="chart-key">
              <i className="chart-line" style={{ background: 'var(--sim)' }} /> {t('Cabin model')}
            </span>
            <span className="chart-key">
              <i className="chart-line chart-line-limit" /> {t('3.0 mmHg: NASA limit for the 1-hour average of the CO2')}
            </span>
            <span className="chart-key">
              <i className="lf-key lf-key-band" /> {t('{low} to {high} mmHg: normal range of the O2', { low, high })}
            </span>
            {showLowLimit && (
              <span className="chart-key">
                <i className="chart-line chart-line-limit" /> {t('{value} mmHg: lower O2 limit for the 1-hour average (mild hypoxia)', { value: O2_SOURCE.mildHypoxiaMmHg })}
              </span>
            )}
            <span className="chart-key">
              <i className="lf-key lf-run-sleep" /> {t('The crew sleeps')}
            </span>
            <span className="chart-key">
              <i className="lf-key lf-run-exercise" /> {t('The crew exercises')}
            </span>
          </figcaption>
        </figure>
      </div>

      <ul className="lf-systems" aria-label={t('State of the systems')}>
        <li>
          <span className="lf-system-name">{t('CO2 scrubber')}</span>{' '}
          <span className={life.scrubber === 'both' ? 'lf-system-value' : `lf-system-value status-${scrubberStatus}`}>
            {life.scrubber !== 'both' && <span aria-hidden="true">{SHAPE[scrubberStatus]} </span>}
            {CDRA_LABEL[life.scrubber].toLowerCase()}
          </span>
        </li>
        <li>
          <span className="lf-system-name">{t('Oxygen generator')}</span>{' '}
          {life.ogaOn ? (
            <span className="lf-system-value">{t('on, {rate} kg of O2 each day', { rate: fmt(ogaKgPerDay, 2) })}</span>
          ) : (
            <span className="lf-system-value status-alert">
              <span aria-hidden="true">{SHAPE.alert} </span>
              {t('off')}
            </span>
          )}
        </li>
        <li>
          <span className="lf-system-name">{t('Sabatier reactor')}</span>{' '}
          <span className="lf-system-value">{life.sabatier ? t('on, O2 loop closure {percent}%', { percent: Math.round(forecast.o2LoopClosure * 100) }) : t('off')}</span>{' '}
          <Info label={t('About the Sabatier reactor')}>
            {t('O2 loop closure: the part of the O2 that the crew uses that comes back from the CO2. The Sabatier reactor makes water from the CO2, and the generator makes O2 from that water. The reactor does not change the gas in the cabin.')}
          </Info>
        </li>
        <li>
          <span className="lf-system-name">{t('Crew')}</span> <span className="lf-system-value">{tn(life.crew, '{count} person', '{count} persons')}</span>
        </li>
        <li>
          <span className="lf-system-name">{t('Cabin')}</span> <span className="lf-system-value">{t('{volume} m³ of free volume', { volume: fmt(life.freeVolumeM3) })}</span>
        </li>
      </ul>

      <div className="lf-notes">
        {/* The task of the hackathon team fixes this label text. */}
        <p>{t('Well-mixed model: real local exposure near the face can be higher (microgravity pockets).')}</p>
        <p>
          {t('Metabolic rates of the model:')} <RefCite source={{ ...metabolicSource, short: metabolicLabel }} />
          {'. '}
          {t('With these rates and the schedule of the crew, one person makes {co2} kg of CO2 and uses {o2} kg of O2 each day.', { co2: fmt(nominalDailyCo2Kg, 2), o2: fmt(nominalDailyO2Kg, 2) })}{' '}
          {t('The sources give different rates, so the card names the rates that the model uses.')}
        </p>
      </div>
    </section>
  )
}
