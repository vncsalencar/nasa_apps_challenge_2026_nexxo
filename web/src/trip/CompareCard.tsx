// The comparison card of the trip page: the total dose of two or three missions on one chart.
// All lines have one unit. A mission that has no values in this unit is not on the chart, and
// the card tells why.
import { useId } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DoseSeries, DoseUnit, Preset, PresetId } from '../../../shared/trip/types.ts'
import { fmt, t } from '../i18n.ts'
import { Badge } from './Badge.tsx'
import { dayTicks, doseText, lastTotal, MISSION_LOOK, seriesDays, totalLine, unitName, valueScale } from './charts.ts'
import './charts.css'

type Props = {
  // The missions on the chart, at most 3, all in "unit".
  items: { preset: Preset; series: DoseSeries }[]
  // The selected missions that the chart cannot show in this unit, each with its reason.
  hidden: { preset: Preset; reason: string }[]
  unit: DoseUnit
  // All missions that a person can choose, and the ids of the chosen ones.
  all: Preset[]
  selected: PresetId[]
  onSelect?: (ids: PresetId[]) => void
}

const MOST = 3
const TICK = { fill: 'var(--text-muted)', fontSize: 11 }
const dayText = (day: number) => fmt(day, Number.isInteger(Number(day.toFixed(6))) ? 0 : 1)

// A short sample of the line of a mission, with its color and its dashes.
function Sample({ id }: { id: PresetId }) {
  const look = MISSION_LOOK[id]
  return (
    <svg className="cmp-sample" viewBox="0 0 26 8" width="26" height="8" aria-hidden="true">
      <line x1="1" y1="4" x2="25" y2="4" stroke={look.color} strokeWidth="3" strokeLinecap="round" strokeDasharray={look.dash} />
    </svg>
  )
}

type Row = { day: number } & Partial<Record<PresetId, number>>

export function CompareCard({ items, hidden, unit, all, selected, onSelect }: Props) {
  const labelId = useId()
  const shown = items.slice(0, MOST)
  // One row for each mission day that a line has. A mission that is shorter than the chart ends early.
  const byDay = new Map<number, Row>()
  for (const item of shown) {
    for (const point of totalLine(item.series)) {
      const key = Number(point.day.toFixed(6))
      const row = byDay.get(key) ?? { day: key }
      row[item.preset.id] = point.total
      byDay.set(key, row)
    }
  }
  const rows = [...byDay.values()].sort((a, b) => a.day - b.day)
  const days = Math.max(0, ...shown.map((item) => seriesDays(item.series)))
  const scale = valueScale(Math.max(0, ...shown.map((item) => lastTotal(item.series)?.total ?? 0)))

  const toggle = (id: PresetId) => {
    if (!onSelect) return
    if (selected.includes(id)) {
      if (selected.length > 1) onSelect(selected.filter((item) => item !== id))
    } else if (selected.length < MOST) onSelect([...selected, id])
  }

  return (
    <section className="card cmp">
      <header className="tc-head">
        <div>
          <h2 className="tc-h2">{t('Compare missions')}</h2>
          <p className="tc-legend">{t('Total dose in {unit}, by mission day.', { unit: unitName(unit) })}</p>
        </div>
      </header>

      {onSelect && (
        <div className="cmp-pick">
          <span className="label" id={labelId}>
            {t('Missions on the chart ({count} of {most})', { count: selected.length, most: MOST })}
          </span>
          <div className="cmp-chips" role="group" aria-labelledby={labelId}>
            {all.map((preset) => {
              const on = selected.includes(preset.id)
              const locked = on ? selected.length <= 1 : selected.length >= MOST
              return (
                <button key={preset.id} type="button" className="pill cmp-chip" aria-pressed={on} disabled={locked && !on} aria-disabled={locked} onClick={() => toggle(preset.id)}>
                  <Sample id={preset.id} />
                  {t(preset.name)}
                </button>
              )
            })}
          </div>
          <span className="muted small">{selected.length >= MOST ? t('The chart has room for 3 missions. Remove one to add another.') : t('Choose up to 3 missions. One mission always stays.')}</span>
        </div>
      )}

      <figure className="tc-chart">
        {shown.length > 0 && rows.length > 1 ? (
          <div className="tc-plot">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 14, right: 14, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--grid)" vertical={false} />
                <XAxis dataKey="day" type="number" domain={[0, days]} ticks={dayTicks(days)} tickFormatter={(value: number) => fmt(value)} stroke="var(--axis)" tick={TICK} />
                <YAxis domain={[0, scale.top]} ticks={scale.ticks} tickFormatter={(value: number) => fmt(value, scale.decimals)} width={40} stroke="var(--axis)" tick={TICK} />
                <Tooltip
                  isAnimationActive={false}
                  cursor={{ stroke: 'var(--text-muted)' }}
                  content={({ active, payload }) => {
                    const row = active ? (payload?.[0]?.payload as Row | undefined) : undefined
                    if (!row) return null
                    return (
                      <div className="tc-tip">
                        <div className="muted">{t('From the start to day {day}', { day: dayText(row.day) })}</div>
                        {shown.map((item) => {
                          const value = row[item.preset.id]
                          return (
                            <div key={item.preset.id} className="cmp-tip-row">
                              <Sample id={item.preset.id} />
                              <span>{t(item.preset.name)}</span>
                              <strong>{value === undefined ? t('no value') : doseText(value, unit)}</strong>
                            </div>
                          )
                        })}
                      </div>
                    )
                  }}
                />
                {shown.map((item) => (
                  <Line
                    key={item.preset.id}
                    dataKey={item.preset.id}
                    type="linear"
                    stroke={MISSION_LOOK[item.preset.id].color}
                    strokeWidth={2}
                    strokeDasharray={MISSION_LOOK[item.preset.id].dash}
                    dot={false}
                    activeDot={{ r: 4, stroke: 'var(--surface)', strokeWidth: 2 }}
                    connectNulls
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="tc-empty">{t('No data: no selected mission has a total in {unit}.', { unit: unitName(unit) })}</p>
        )}
        <figcaption>
          <ul className="cmp-legend">
            {shown.map((item) => {
              const end = lastTotal(item.series)
              const length = seriesDays(item.series)
              return (
                <li key={item.preset.id} className="cmp-item">
                  <span className="cmp-name">
                    <Sample id={item.preset.id} />
                    {t(item.preset.name)}
                  </span>
                  <Badge kind={item.preset.badge} />
                  <span className="cmp-total">
                    {!end
                      ? t('no data')
                      : item.series.incomplete && end.day < length - 1e-9
                        ? t('{total} up to day {day}. Not complete: the days after it have no data.', { total: doseText(end.total, unit), day: dayText(end.day) })
                        : t('{total} at the end of the mission (day {day})', { total: doseText(end.total, unit), day: dayText(end.day) })}
                  </span>
                </li>
              )
            })}
          </ul>
        </figcaption>
      </figure>

      {hidden.length > 0 && (
        <div className="cmp-hidden">
          <h3 className="tc-h3">{t('Not on this chart')}</h3>
          <ul>
            {hidden.map((item) => (
              <li key={item.preset.id}>
                <strong>{t(item.preset.name)}:</strong> {t(item.reason)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="tc-note">
        {t('The missions differ in shielding, in instrument, and in the state of the solar cycle. So the lines show what each instrument measured, not which trip is safer.')}
      </p>
    </section>
  )
}

export default CompareCard
