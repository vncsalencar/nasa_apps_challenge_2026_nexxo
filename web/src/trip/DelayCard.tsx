// The communication delay card of the trip page: how long a radio signal needs between the Earth
// and the spacecraft at the cursor, and a chart of this time over the mission.
// The card only shows what the geometry gives.
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { KM_PER_AU, type Geometry, type SourceRef } from '../../../shared/trip/types.ts'
import { fmt, t } from '../i18n.ts'
import { Badge, SourceTip } from './Badge.tsx'
import { dayNumber, dayTicks, groupNumber, lightText, valueScale } from './charts.ts'
import './charts.css'

type Props = {
  geometry: Geometry
  // The mission day of the cursor. It can be a fraction.
  day: number
  // The source of the trajectory, for the tooltip.
  source?: SourceRef
}

// From this light time on, the chart shows minutes in place of seconds.
const MINUTES_FROM_SECONDS = 120
// Below this light time, a talk with the ground is as on the Earth.
const TALK_SECONDS = 1
const MOST_POINTS = 600
// From this two-way time on, the card says that the crew must work without the ground.
const ALONE_SECONDS = 60

const TICK = { fill: 'var(--text-muted)', fontSize: 11 }

// One point of the chart. A real point has "real", a modelled point has "model".
// The point where the kind changes has both, so the two lines join.
type DelayRow = { day: number; seconds: number; modelled: boolean; real?: number; model?: number }

export function DelayCard({ geometry, day, source }: Props) {
  const cursor = Math.min(Math.max(Number.isFinite(day) ? day : 0, 0), geometry.days)
  const place = geometry.at(cursor)
  const oneWay = place.lightSeconds
  const twoWay = oneWay * 2

  const inMinutes = Math.max(0, ...geometry.delay.map((point) => point.seconds)) >= MINUTES_FROM_SECONDS
  const scaleOf = (seconds: number) => (inMinutes ? seconds / 60 : seconds)
  // A long mission can have thousands of samples. The chart keeps about 600 of them, and each point where the kind changes.
  const each = Math.ceil(geometry.delay.length / MOST_POINTS)
  const kept = geometry.delay.filter((point, index, all) => index % each === 0 || index === all.length - 1 || point.modelled !== all[index - 1].modelled || point.modelled !== all[index + 1].modelled)
  const rows: DelayRow[] = kept.map((point) => ({ day: point.day, seconds: point.seconds, modelled: point.modelled, [point.modelled ? 'model' : 'real']: scaleOf(point.seconds) }))
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].modelled !== rows[i - 1].modelled) rows[i - 1][rows[i].modelled ? 'model' : 'real'] = scaleOf(rows[i - 1].seconds)
  }
  const hasReal = geometry.delay.some((point) => !point.modelled)
  const hasModel = geometry.delay.some((point) => point.modelled)
  const scale = valueScale(Math.max(0, ...rows.map((row) => scaleOf(row.seconds)), scaleOf(oneWay)))

  const distance =
    geometry.frame === 'sun'
      ? t('{million} million km ({au} AU)', { million: fmt(place.earthDistanceKm / 1e6, 1), au: fmt(place.earthDistanceKm / KM_PER_AU, 3) })
      : t('{km} km', { km: groupNumber(place.earthDistanceKm) })

  return (
    <section className="card delay">
      <header className="tc-head">
        <div>
          <h2 className="tc-h2">{t('Communication delay')}</h2>
          <p className="tc-legend">{t('The time that a radio signal needs between the Earth and the spacecraft.')}</p>
        </div>
        <Badge kind={place.modelled ? 'modelled' : 'real-data'} />
      </header>

      <div className="delay-now">
        <div className="delay-stat">
          <span className="label">{t('One-way light time on day {day}', { day: dayNumber(cursor) })}</span>
          <span className="display delay-digits">{lightText(oneWay)}</span>
        </div>
        <dl className="delay-facts">
          <div>
            <dt>{t('Two ways')}</dt>
            <dd>{lightText(twoWay)}</dd>
          </div>
          <div>
            <dt>{t('Distance from the Earth')}</dt>
            <dd>
              {distance}{' '}
              <SourceTip
                source={source}
                says={
                  <>
                    <strong>{t('light time = distance ÷ speed of light (299,792.458 km each second)')}</strong>
                    <br />
                    {t('The distance is from the centre of the Earth to the spacecraft. A radio signal moves at the speed of light.')}
                    {place.modelled && (
                      <>
                        <br />
                        {t('The model of this app made the place of the spacecraft on this day. It is not from a real trajectory.')}
                      </>
                    )}
                  </>
                }
              />
            </dd>
          </div>
        </dl>
      </div>
      <p className="delay-story">
        {oneWay < TALK_SECONDS
          ? t('A talk with the ground is as on the Earth: the signal needs less than 1 second.')
          : t('Ground support delayed {oneWay}: a question and its answer need {twoWay}.', { oneWay: lightText(oneWay), twoWay: lightText(twoWay) })}
        {twoWay >= ALONE_SECONDS && <> {t('The crew must work without the ground in this time.')}</>}
      </p>

      <figure className="tc-chart">
        <div className="tc-chart-head">
          <h3 className="tc-h3">{inMinutes ? t('One-way light time over the mission, in minutes') : t('One-way light time over the mission, in seconds')}</h3>
          <span className="tc-badges">
            {hasReal && <Badge kind="real-data" />}
            {hasModel && <Badge kind="modelled" />}
          </span>
        </div>
        {rows.length > 1 ? (
          <div className="tc-plot">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 14, right: 14, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--grid)" vertical={false} />
                <XAxis dataKey="day" type="number" domain={[0, geometry.days]} ticks={dayTicks(geometry.days)} tickFormatter={(value: number) => fmt(value)} stroke="var(--axis)" tick={TICK} />
                <YAxis domain={[0, scale.top]} ticks={scale.ticks} tickFormatter={(value: number) => fmt(value, scale.decimals)} width={40} stroke="var(--axis)" tick={TICK} />
                <ReferenceLine x={cursor} stroke="var(--text-soft)" />
                <Tooltip
                  isAnimationActive={false}
                  cursor={{ stroke: 'var(--text-muted)' }}
                  content={({ active, payload }) => {
                    const row = active ? (payload?.[0]?.payload as DelayRow | undefined) : undefined
                    if (!row) return null
                    return (
                      <div className="tc-tip">
                        <div className="muted">{t('Day {day}', { day: fmt(row.day, Number.isInteger(row.day) ? 0 : 1) })}</div>
                        <div>
                          <strong>{lightText(row.seconds)}</strong> · {t('two ways: {time}', { time: lightText(row.seconds * 2) })}
                        </div>
                        <div className="muted">{row.modelled ? t('Place from the model of this app') : t('Place from the real trajectory')}</div>
                      </div>
                    )
                  }}
                />
                <Line dataKey="model" type="linear" stroke="var(--sim)" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 4, stroke: 'var(--surface)', strokeWidth: 2 }} isAnimationActive={false} />
                <Line dataKey="real" type="linear" stroke="var(--series)" strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: 'var(--surface)', strokeWidth: 2 }} isAnimationActive={false} />
                <ReferenceDot x={cursor} y={scaleOf(oneWay)} r={4} fill={place.modelled ? 'var(--sim)' : 'var(--series)'} stroke="var(--surface)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="tc-empty">{t('No data: this mission has no path for the chart.')}</p>
        )}
        <figcaption className="tc-keys">
          {hasReal && (
            <span className="tc-key">
              <i className="tc-line" style={{ background: 'var(--series)' }} /> {t('Real trajectory')}
            </span>
          )}
          {hasModel && (
            <span className="tc-key">
              <i className="tc-line tc-line-model" /> {t('Modelled path')}
            </span>
          )}
          <span className="tc-key">
            <i className="tc-line tc-line-cursor" /> {t('Cursor: day {day}', { day: dayNumber(cursor) })}
          </span>
        </figcaption>
      </figure>
    </section>
  )
}

export default DelayCard
