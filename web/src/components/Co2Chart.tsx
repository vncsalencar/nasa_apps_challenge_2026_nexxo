// The chart of the CO2 pressure: the last 24 hours and the next 24 hours from the model.
// Real values, simulated values, and the projection each have their own line.
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { LIMIT_1H_MMHG, mmHgToPpm } from '../../../shared/co2.ts'
import { fmt, t } from '../i18n.ts'
import { CHART_NEXT_HOURS, CHART_PAST_HOURS, formatDuration, mmHgText, ppmText, type ChartPoint } from '../view.ts'
import './chart.css'

const SOURCE_TEXT: Record<ChartPoint['source'], string> = {
  record: t('Real sensor value'),
  model: t('Simulated by the model'),
  manual: t('Set by the presenter'),
  projection: t('Projection of the model'),
}

type Props = {
  points: ChartPoint[]
  pressure: number
  // The values where a symptom band starts. The chart draws a thin line at each one that is in view.
  bandStarts: number[]
}

export default function Co2Chart({ points, pressure, bandStarts }: Props) {
  const values = points.flatMap((point) => [point.record, point.simulated, point.projection].filter((value): value is number => value !== undefined))
  // The limit of 3.0 mmHg is always in view. The scale ends on half steps.
  const low = Math.floor(Math.min(...values, LIMIT_1H_MMHG - 1) * 2) / 2
  const high = Math.ceil(Math.max(...values, LIMIT_1H_MMHG + 0.3) * 2) / 2
  const ticks: number[] = []
  for (let value = low; value <= high + 1e-9; value += high - low > 4 ? 1 : 0.5) ticks.push(value)
  const hasRecord = points.some((point) => point.record !== undefined)
  const hasSimulated = points.some((point) => point.simulated !== undefined)
  const hourTick = (hour: number) => (hour === 0 ? t('now') : hour < 0 ? t('−{hours} h', { hours: -hour }) : t('+{hours} h', { hours: hour }))

  return (
    <figure className="chart">
      <div className="chart-plot">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 14, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis
              dataKey="hour"
              type="number"
              domain={[-CHART_PAST_HOURS, CHART_NEXT_HOURS]}
              ticks={[-24, -12, 0, 12, 24]}
              tickFormatter={hourTick}
              stroke="var(--axis)"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            />
            <YAxis
              domain={[low, high]}
              ticks={ticks}
              tickFormatter={(value: number) => fmt(value, 1)}
              width={34}
              stroke="var(--axis)"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            />
            {bandStarts
              .filter((value) => value !== LIMIT_1H_MMHG && value > low && value < high)
              .map((value) => (
                <ReferenceLine key={value} y={value} stroke="var(--border-strong)" strokeDasharray="2 5" />
              ))}
            <ReferenceLine y={LIMIT_1H_MMHG} stroke="var(--critical)" strokeDasharray="6 4" />
            <ReferenceLine x={0} stroke="var(--text-muted)" />
            <Tooltip
              isAnimationActive={false}
              cursor={{ stroke: 'var(--text-muted)' }}
              content={({ active, payload }) => {
                const point = active ? (payload?.[0]?.payload as ChartPoint | undefined) : undefined
                const value = point?.record ?? point?.simulated ?? point?.projection
                if (!point || value === undefined) return null
                return (
                  <div className="chart-tip">
                    <div className="muted">{point.hour === 0 ? t('Now') : point.hour < 0 ? t('{time} ago', { time: formatDuration(-point.hour) }) : t('in {time}', { time: formatDuration(point.hour) })}</div>
                    <div>
                      <strong>{mmHgText(value)}</strong> · {ppmText(mmHgToPpm(value, pressure))}
                    </div>
                    <div className="muted">{SOURCE_TEXT[point.source]}</div>
                  </div>
                )
              }}
            />
            <Line dataKey="projection" type="linear" stroke="var(--text-muted)" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 4, stroke: 'var(--surface)', strokeWidth: 2 }} isAnimationActive={false} />
            <Line dataKey="record" type="linear" stroke="var(--series)" strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: 'var(--surface)', strokeWidth: 2 }} isAnimationActive={false} />
            <Line dataKey="simulated" type="linear" stroke="var(--sim)" strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: 'var(--surface)', strokeWidth: 2 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="chart-keys">
        {hasRecord && (
          <span className="chart-key">
            <i className="chart-line" style={{ background: 'var(--series)' }} /> {t('Real record')}
          </span>
        )}
        {hasSimulated && (
          <span className="chart-key">
            <i className="chart-line" style={{ background: 'var(--sim)' }} /> {t('Simulated')}
          </span>
        )}
        <span className="chart-key">
          <i className="chart-line chart-line-dashed" /> {t('Model projection')}
        </span>
        <span className="chart-key">
          <i className="chart-line chart-line-limit" /> {t('3.0 mmHg: NASA limit for the 1-hour average')}
        </span>
        <span className="chart-key">
          <i className="chart-line chart-line-fine" /> {t('Start of a symptom band')}
        </span>
      </figcaption>
    </figure>
  )
}
