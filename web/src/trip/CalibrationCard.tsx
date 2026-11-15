// The check of the cabin model against real data: the CO2 record of the station during the
// mission RR-9, next to what the model gives for the same hours with the real crew counts.
// The card shows what it gets. shared/trip/calibration.ts makes the result.
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { SourceRef } from '../../../shared/trip/types.ts'
import { Tip } from '../components/Tip.tsx'
import { fmt, t, tn } from '../i18n.ts'
import { Badge } from './Badge.tsx'
import { Info, RefLine } from './LifeCard.tsx'
import '../components/chart.css'
import './life.css'

export type CalibrationResult = {
  // The hours from the start of the record, and the CO2 of the record and of the model at each one, in mmHg.
  hours: number[]
  realMmHg: number[]
  modelMmHg: number[]
  // The root of the mean of the squared errors, and the mean error (model − real), in mmHg. NaN: the record has no value.
  rmsMmHg: number
  meanErrorMmHg: number
  // The crew count of the station from each hour on.
  crew: { fromHour: number; count: number; source: SourceRef }[]
  // What the station removes for each mmHg of CO2, in kg of CO2 each day, after the calibration.
  removalPerMmHgKgDay: number
  note: string
}

type Props = {
  result: CalibrationResult
  // The credit line that the owner of the data asks for.
  credit: string
  // The short name of the mission of the record.
  mission?: string
}

type Point = { hour: number; real?: number; model?: number }

const AXIS_WIDTH = 40
const PLOT_RIGHT = 12
const HOURS_PER_DAY = 24

// A number with its sign: "−0.09", "+0.05".
const signed = (value: number, decimals: number) => (value < 0 ? `−${fmt(-value, decimals)}` : value > 0 ? `+${fmt(value, decimals)}` : fmt(0, decimals))
const finite = (value: number | undefined) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined)

export function CalibrationCard({ result, credit, mission = 'RR-9' }: Props) {
  const points: Point[] = result.hours.map((hour, index) => ({ hour, real: finite(result.realMmHg[index]), model: finite(result.modelMmHg[index]) }))
  const first = result.hours[0] ?? 0
  const last = result.hours[result.hours.length - 1] ?? 1
  const span = last - first || 1
  const at = (hour: number) => Math.min(100, Math.max(0, ((hour - first) / span) * 100))

  // A long record gets a time axis in days. A short one gets hours.
  const inDays = span > 4 * HOURS_PER_DAY
  const unit = inDays ? HOURS_PER_DAY : 1
  const step = ([1, 2, 5, 7, 14, 28, 56, 112].find((size) => span / unit / size <= 8) ?? 112) * unit
  const hourTicks: number[] = []
  for (let hour = Math.ceil(first / step) * step; hour <= last; hour += step) hourTicks.push(hour)

  const values = points.flatMap((point) => [point.real, point.model]).filter((value): value is number => value !== undefined)
  const low = values.length ? Math.floor(Math.min(...values) * 2) / 2 : 0
  const high = values.length ? Math.ceil(Math.max(...values) * 2) / 2 : 1
  const valueStep = high - low > 4 ? 1 : 0.5
  const valueTicks: number[] = []
  for (let value = low; value <= high + 1e-9; value += valueStep) valueTicks.push(value)

  // Each crew count holds from its hour to the hour of the next one.
  const crews = result.crew
    .map((item, index) => ({ ...item, from: Math.max(item.fromHour, first), to: Math.min(result.crew[index + 1]?.fromHour ?? last, last) }))
    .filter((item) => item.to > item.from)
  const changes = crews.slice(1).map((item) => item.from)
  const timeText = (hour: number) => (inDays ? t('Day {day} of the record', { day: fmt((hour - first) / HOURS_PER_DAY, 1) }) : t('Hour {hour} of the record', { hour: fmt(hour - first, 1) }))

  return (
    <section className="card cal" aria-label={t('Model check')}>
      <div className="lf-head">
        <div>
          <h2 className="lf-h2">{t('Model check')}</h2>
          <p className="lf-legend">{t('The cabin model next to the real CO2 record of the station during the mission {mission}, with the real crew counts.', { mission })}</p>
        </div>
      </div>

      <div className="cal-keys">
        <span className="cal-key">
          <i className="chart-line" style={{ background: 'var(--series)' }} /> {t('Station record')} <Badge kind="real-data" />
        </span>
        <span className="cal-key">
          <i className="chart-line" style={{ background: 'var(--sim)' }} /> {t('Cabin model')} <Badge kind="modelled" />
        </span>
      </div>

      <figure className="cal-figure">
        {crews.length > 0 && (
          <div className="cal-crew" style={{ marginLeft: AXIS_WIDTH, marginRight: PLOT_RIGHT }}>
            <div className="cal-crew-name">{t('Persons on the station')}</div>
            <div className="cal-crew-strip">
              {crews.map((item) => (
                <span key={item.from} className="cal-crew-run" style={{ left: `${at(item.from)}%`, width: `${at(item.to) - at(item.from)}%` }}>
                  <Tip
                    className="tip-line"
                    tip={
                      <span className="tip-part">
                        {tn(item.count, '{count} person on the station in this part of the record.', '{count} persons on the station in this part of the record.')}
                        <RefLine source={item.source} />
                      </span>
                    }
                  >
                    {item.count}
                  </Tip>
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="cal-plot">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: PLOT_RIGHT, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis
                dataKey="hour"
                type="number"
                domain={[first, last]}
                ticks={hourTicks}
                tickFormatter={(hour: number) => fmt((hour - first) / unit)}
                minTickGap={10}
                stroke="var(--axis)"
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              />
              <YAxis domain={[low, high]} ticks={valueTicks} tickFormatter={(value: number) => fmt(value, 1)} width={AXIS_WIDTH} stroke="var(--axis)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              {changes.map((hour) => (
                <ReferenceLine key={hour} x={hour} stroke="var(--border-strong)" strokeDasharray="2 5" />
              ))}
              <Tooltip
                isAnimationActive={false}
                cursor={{ stroke: 'var(--text-muted)' }}
                content={({ active, payload }) => {
                  const point = active ? (payload?.[0]?.payload as Point | undefined) : undefined
                  if (!point) return null
                  return (
                    <div className="chart-tip">
                      <div className="muted">{timeText(point.hour)}</div>
                      {point.real !== undefined && (
                        <div className="cal-tip-row">
                          <i className="chart-line" style={{ background: 'var(--series)' }} /> {t('Record')} <strong>{fmt(point.real, 2)} mmHg</strong>
                        </div>
                      )}
                      {point.model !== undefined && (
                        <div className="cal-tip-row">
                          <i className="chart-line" style={{ background: 'var(--sim)' }} /> {t('Model')} <strong>{fmt(point.model, 2)} mmHg</strong>
                        </div>
                      )}
                    </div>
                  )
                }}
              />
              <Line dataKey="real" type="linear" stroke="var(--series)" strokeWidth={1.5} dot={false} activeDot={{ r: 4, stroke: 'var(--surface)', strokeWidth: 2 }} isAnimationActive={false} />
              <Line dataKey="model" type="linear" stroke="var(--sim)" strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: 'var(--surface)', strokeWidth: 2 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <figcaption className="cal-axis">
          {inDays ? t('CO2 partial pressure in mmHg, by the days from the start of the record') : t('CO2 partial pressure in mmHg, by the hours from the start of the record')}
          {changes.length > 0 && ` · ${t('A dotted line marks where the crew count changed.')}`}
        </figcaption>
      </figure>

      <dl className="lf-facts cal-facts">
        <div>
          <dt>
            {t('Error of the model')}{' '}
            <Info label={t('About the error of the model')}>
              <span className="tip-part">{t('RMS error: the root of the mean of the squared differences between the model and the record. It tells how far the model is from the record at a usual hour.')}</span>
              <span className="tip-part">{t('Mean error: the mean of the model minus the record. A negative value means that the model is lower than the record on average.')}</span>
            </Info>
          </dt>
          <dd>
            {Number.isFinite(result.rmsMmHg) && Number.isFinite(result.meanErrorMmHg)
              ? t('RMS error {rms} mmHg, mean error {mean} mmHg', { rms: fmt(result.rmsMmHg, 2), mean: signed(result.meanErrorMmHg, 2) })
              : t('No data: the record has no value to compare')}
          </dd>
        </div>
        <div>
          <dt>{t('Calibrated removal')}</dt>
          <dd>{t('The station removes {rate} kg of CO2 each day for each mmHg', { rate: fmt(result.removalPerMmHgKgDay, 2) })}</dd>
        </div>
      </dl>

      <div className="lf-notes">
        {result.note && <p>{t(result.note)}</p>}
        {credit && <p>{credit}</p>}
      </div>
    </section>
  )
}
