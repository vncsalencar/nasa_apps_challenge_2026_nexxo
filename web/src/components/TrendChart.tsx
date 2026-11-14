import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SOURCE_LABEL, formatDay, formatRange, formatTime, timeOfHour, type Indicator, type Point } from '../api.ts'
import { fmt, t } from '../i18n.ts'

type Props = {
  indicator: Indicator
  points: Point[]
  startTime: string
  // The hour where the real NASA record ends. The chart draws a line there.
  recordHours: number
  // Hours where the crew member reported a symptom.
  symptomHours?: number[]
  // The first and last hour of the time range, so all charts share one time axis.
  range: [number, number]
}

export function TrendChart({ indicator, points, startTime, recordHours, symptomHours = [], range }: Props) {
  const data = points.map(([hour, value, source]) => ({ hour, value, source }))
  const values = points.map((point) => point[1])
  const low = Math.min(...values)
  const high = Math.max(...values)
  const pad = (high - low || 1) * 0.15
  const [normalLow, normalHigh] = indicator.normal
  const tick = (hour: number) => formatDay(timeOfHour(startTime, hour))

  return (
    <figure className="trend">
      <figcaption>
        <strong>{indicator.label}</strong> <span className="muted">({indicator.unit})</span>
        <span className="muted small"> · {t('normal: {range}', { range: formatRange(indicator.normal, indicator.unit) })}</span>
      </figcaption>
      {data.length === 0 ? (
        <p className="muted small">{t('No data in this time range.')}</p>
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={data} syncId="trends" syncMethod="value" margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis
              dataKey="hour"
              type="number"
              domain={range}
              tickFormatter={tick}
              tickCount={5}
              stroke="var(--axis)"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            />
            <YAxis
              domain={[low - pad, high + pad]}
              tickFormatter={(value: number) => fmt(value, indicator.decimals)}
              width={44}
              tickCount={4}
              allowDecimals={indicator.decimals > 0}
              stroke="var(--axis)"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            />
            {/* The green band is the normal range. */}
            <ReferenceArea
              y1={normalLow ?? undefined}
              y2={normalHigh ?? undefined}
              fill="var(--good)"
              fillOpacity={0.1}
              stroke="none"
              ifOverflow="hidden"
            />
            {recordHours > range[0] && recordHours <= range[1] && (
              <ReferenceLine
                x={recordHours - 0.5}
                stroke="var(--text-muted)"
                strokeDasharray="4 4"
                label={{ value: t('NASA record ends'), position: 'insideTopRight', fill: 'var(--text-muted)', fontSize: 10 }}
              />
            )}
            {symptomHours
              .filter((hour) => hour >= range[0])
              .map((hour, index) => (
                <ReferenceLine key={`${hour}-${index}`} x={hour} stroke="var(--critical)" strokeWidth={1.5} />
              ))}
            <Tooltip
              isAnimationActive={false}
              cursor={{ stroke: 'var(--text-muted)' }}
              content={({ active, payload }) => {
                const point = active && payload?.[0]?.payload
                if (!point) return null
                return (
                  <div className="tooltip">
                    <div className="muted">{formatTime(timeOfHour(startTime, point.hour))} UTC</div>
                    <div>
                      <strong>{fmt(point.value, indicator.decimals)}</strong> {indicator.unit}
                    </div>
                    <div className="muted">{SOURCE_LABEL[point.source] ?? point.source}</div>
                  </div>
                )
              }}
            />
            <Line
              dataKey="value"
              type="linear"
              stroke="var(--series)"
              strokeWidth={2}
              dot={data.length <= 60 ? { r: 2.5, fill: 'var(--series)', strokeWidth: 0 } : false}
              activeDot={{ r: 4, stroke: 'var(--surface)', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </figure>
  )
}
