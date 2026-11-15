// The radiation card of the trip page: the dose rate and the total dose at the cursor, where
// the rate of this phase comes from, and two charts over the whole mission.
// The card only shows what it gets. It converts no unit and it never shows a zero for a missing value.
import type { ReactNode } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CAREER_LIMIT } from '../../../shared/trip/limits.ts'
import { doseAt } from '../../../shared/trip/radiation.ts'
import { rateIn } from '../../../shared/trip/timeline.ts'
import type { ChartBadge, DoseSeries, DoseUnit, PhaseSpan, Preset, Rate, SolarId } from '../../../shared/trip/types.ts'
import { fmt, t } from '../i18n.ts'
import { Badge, SourceTip } from './Badge.tsx'
import { dayNumber, dayTicks, doseNumber, doseText, lastTotal, seriesDays, totalLine, unitName, valueScale } from './charts.ts'
import './charts.css'

type Props = {
  preset: Preset
  series: DoseSeries
  // The mission day of the cursor. It can be a fraction.
  day: number
  // The solar-cycle setting. null: the preset has no solar-cycle choice.
  solar: SolarId | null
  // The units that this mission can show.
  units: DoseUnit[]
  onUnit?: (unit: DoseUnit) => void
}

// A storm day is "far above" the other days from this factor on. Then the scale of the first
// chart fits the days with no storm, so the phases stay visible, and a text gives the storm dose.
const CLIP_FROM = 4
// The line of the career limit is in view when the total reaches this part of the limit.
const LIMIT_IN_VIEW = 0.25

const TICK = { fill: 'var(--text-muted)', fontSize: 11 }
const dayText = (day: number) => fmt(day, Number.isInteger(Number(day.toFixed(6))) ? 0 : 1)
const solarText = (solar: SolarId) => (solar === 'max' ? t('Near solar maximum') : t('Declining phase of the solar cycle'))
const otherUnit = (unit: DoseUnit): DoseUnit => (unit === 'mSv' ? 'mGy' : 'mSv')
// A text of the data, or "no data" if the data has none.
const orNoData = (text: string) => (text ? t(text) : <span className="muted">{t('no data')}</span>)

// How many decimals a number of a source has, up to 4.
function decimalsOf(value: number): number {
  let decimals = 0
  while (decimals < 4 && Math.abs(value * 10 ** decimals - Math.round(value * 10 ** decimals)) > 1e-9) decimals += 1
  return decimals
}

// The rate of one phase as a text: "1.84 ± 0.33 mSv each day". null: no value in this unit.
function rateText(rate: Rate, unit: DoseUnit): string | null {
  const value = rateIn(rate, unit)
  if (!value) return null
  // The value and its uncertainty show the same number of decimals: 1.10 ± 0.14.
  const decimals = value.plusMinus === undefined ? 0 : Math.max(decimalsOf(value.value), decimalsOf(value.plusMinus))
  const number = value.plusMinus === undefined ? doseNumber(value.value) : `${fmt(value.value, decimals)} ± ${fmt(value.plusMinus, decimals)}`
  return t('{value} {unit} each day', { value: number, unit })
}

// Why a phase has no value in the unit of the chart.
function whyNoData(rate: Rate, unit: DoseUnit): string {
  const other = otherUnit(unit)
  if (rateIn(rate, other)) return t('The source gives this rate only in {other}. The page converts nothing, so this phase has no value in {unit}.', { other: unitName(other), unit })
  return t('We found no value for this phase that we could check.')
}

type DayRow = { day: number; from: number; rate: number | null; total: number | null; phase: string }

export function RadiationCard({ preset, series, day, solar, units, onUnit }: Props) {
  const unit = series.unit
  const days = seriesDays(series)
  const cursor = Math.min(Math.max(Number.isFinite(day) ? day : 0, 0), days)
  const now = series.points.length ? doseAt(series, cursor) : { rate: null, total: null, phaseId: '' }
  const current = series.rates.find((item) => item.span.phase.id === now.phaseId) ?? series.rates[0]
  const phaseLabel = (id: string) => {
    const found = series.rates.find((item) => item.span.phase.id === id)
    return found ? t(found.span.phase.label) : ''
  }
  const limit = unit === 'mSv' && CAREER_LIMIT.mSv > 0 ? CAREER_LIMIT.mSv : null
  const end = lastTotal(series)
  const missing = series.rates.filter((item) => rateIn(item.rate, unit) === null)

  // Chart 1: the dose of each day. The rate of a point is the dose of the day that ends at the point.
  const rows: DayRow[] = series.points.map((point, index) => ({
    day: point.day,
    from: index === 0 ? 0 : series.points[index - 1].day,
    rate: point.rate,
    total: point.total,
    phase: phaseLabel(point.phaseId),
  }))
  const stormSpans = series.storms.map((storm) => ({ storm, from: storm.day, to: storm.day + Math.max(0, storm.hours) / 24 }))
  // Does the day of this row hold a part of a storm.
  const inStorm = (row: DayRow) => stormSpans.some((span) => (span.to > span.from ? span.from < row.day && span.to > row.from : span.from >= row.from && span.from < row.day))
  const quietPeak = Math.max(0, ...rows.filter((row) => row.rate !== null && !inStorm(row)).map((row) => row.rate as number))
  const peak = Math.max(0, ...rows.map((row) => row.rate ?? 0))
  const clipped = quietPeak > 0 && peak > quietPeak * CLIP_FROM
  const rateScale = valueScale(clipped ? quietPeak * 1.2 : peak)
  // The parts of the mission with no data, as runs of days.
  const gaps: { from: number; to: number }[] = []
  for (const row of rows.slice(1)) {
    if (row.rate !== null) continue
    const last = gaps[gaps.length - 1]
    if (last && Math.abs(last.to - row.from) < 1e-9) last.to = row.day
    else gaps.push({ from: row.from, to: row.day })
  }
  // The row of the day that holds the cursor, as doseAt() selects it.
  const cursorRow = rows.find((row) => row.day > cursor) ?? rows[rows.length - 1]
  const stormNow = Boolean(cursorRow) && inStorm(cursorRow)

  // Chart 2: the total dose, with the career limit if the unit is mSv.
  const totals = totalLine(series)
  const limitInView = limit !== null && (series.limitDay !== null || (end !== null && end.total >= limit * LIMIT_IN_VIEW))
  const totalScale = valueScale(Math.max(end?.total ?? 0, limitInView && limit !== null ? limit * 1.04 : 0))
  const ticks = dayTicks(days)
  const boundaries = series.rates.slice(1).map((item) => item.span.fromDay)
  // The badges of the rates that the charts use. A phase with no value in this unit has no badge here.
  const badges: ChartBadge[] = [...new Set(series.rates.filter((item) => rateIn(item.rate, unit) !== null).map((item) => item.rate.badge))]
  const hasFlight = series.rates.some((item) => item.span.phase.kind === 'cruise' || item.span.phase.kind === 'return')
  const says = current ? (current.rate.unit !== unit && current.rate.other?.unit === unit ? current.rate.other.says : current.rate.says) : ''
  const solarRate = solar !== null ? preset.solar?.[solar] : undefined

  const limitTip = limit !== null && (
    <SourceTip
      source={CAREER_LIMIT.source}
      says={
        <>
          <strong>{t('The career limit is {limit} mSv.', { limit: fmt(limit) })}</strong>
          {CAREER_LIMIT.says && (
            <>
              <br />
              {t(CAREER_LIMIT.says)}
            </>
          )}
        </>
      }
    />
  )

  return (
    <section className="card rad">
      <header className="tc-head">
        <div>
          <h2 className="tc-h2">{t('Radiation dose')}</h2>
          <p className="tc-legend">{t(preset.name)}</p>
        </div>
        <Badge kind={preset.badge} />
      </header>

      <div className="rad-top">
      <div className="rad-main">
      <div className="rad-unit">
        <span>
          <span className="label">{t('Unit:')}</span> <strong>{unitName(unit)}</strong>
        </span>
        {units.length > 1 && onUnit && (
          <div className="segmented rad-switch" role="group" aria-label={t('Unit of the dose')}>
            {units.map((item) => (
              <button key={item} type="button" aria-pressed={item === unit} aria-label={unitName(item)} onClick={() => onUnit(item)}>
                {item}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rad-now">
        <div className="rad-stat">
          <span className="label">{t('Dose rate on day {day}', { day: dayNumber(cursor) })}</span>
          {now.rate === null ? (
            <span className="display rad-none">{t('No data')}</span>
          ) : (
            <span className="rad-value">
              <span className="display rad-digits">{doseNumber(now.rate)}</span>
              <span className="rad-per">{t('{unit} each day', { unit })}</span>
            </span>
          )}
          {now.rate === null && current && <span className="rad-sub">{whyNoData(current.rate, unit)}</span>}
          {now.rate !== null && stormNow && <span className="rad-sub rad-whatif-text">{t('This day has a part of a what-if storm.')}</span>}
        </div>
        <div className="rad-stat">
          <span className="label">{t('Total dose from the start to day {day}', { day: fmt(cursor, Number.isInteger(cursor) ? 0 : 1) })}</span>
          {now.total === null ? (
            <span className="display rad-none">{t('No data')}</span>
          ) : (
            <span className="rad-value">
              <span className="display rad-digits">{doseNumber(now.total)}</span>
              <span className="rad-per">{unit}</span>
            </span>
          )}
          {now.total === null && <span className="rad-sub">{t('A phase before this day has no checked value, so the page cannot give a total.')}</span>}
          {now.total !== null && limit !== null && (
            <span className="rad-sub">
              {t('{percent}% of the career limit of {limit} mSv', { percent: fmt((now.total / limit) * 100), limit: fmt(limit) })} {limitTip}
            </span>
          )}
        </div>
      </div>
      <p className="tc-note">
        {t('Dose equivalent (mSv) and absorbed dose (mGy) are different quantities. The page converts nothing: each value is the value that the source gives in this unit.')}
      </p>
      </div>
      <div className="rad-main">

      {current && (
        <div className="rad-phase">
          <div className="rad-phase-head">
            <h3 className="tc-h3">{t('Phase now: {phase}', { phase: t(current.span.phase.label) })}</h3>
            <span className="muted small">{t('day {from} to day {to}', { from: dayText(current.span.fromDay), to: dayText(current.span.toDay) })}</span>
          </div>
          <dl className="rad-facts">
            <div>
              <dt>{t('Rate of this phase')}</dt>
              <dd>
                {rateText(current.rate, unit) ?? <span className="muted">{t('no data')}</span>} {rateIn(current.rate, unit) && <Badge kind={current.rate.badge} />}
              </dd>
            </div>
            <div>
              <dt>{t('Instrument')}</dt>
              <dd>{orNoData(current.rate.instrument)}</dd>
            </div>
            <div>
              <dt>{t('Shielding')}</dt>
              <dd>{orNoData(current.rate.shielding)}</dd>
            </div>
            <div>
              <dt>{t('Solar cycle at the measurement')}</dt>
              <dd>{orNoData(current.rate.solar)}</dd>
            </div>
            {current.rate.proxyOf && (
              <div>
                <dt>{t('Proxy')}</dt>
                <dd>{t('Proxy of {mission}: the value comes from that mission, not from this one.', { mission: t(current.rate.proxyOf) })}</dd>
              </div>
            )}
            <div className="rad-fact-wide">
              <dt>{t('What the source says')}</dt>
              <dd>
                {orNoData(says)}{' '}
                <SourceTip source={current.rate.source}>
                  {current.rate.source.short}
                </SourceTip>
              </dd>
            </div>
            {current.span.phase.note && (
              <div className="rad-fact-wide">
                <dt>{t('Note')}</dt>
                <dd>{t(current.span.phase.note)}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
      {solar !== null && solarRate && (
        <p className="rad-solar">
          <span className="label">{t('Solar-cycle setting:')}</span> <strong>{solarText(solar)}</strong>.{' '}
          {t('The flight phases use the rate of {instrument} ({shielding}).', { instrument: t(solarRate.instrument) || t('no data'), shielding: t(solarRate.shielding) || t('no data') })}
        </p>
      )}

      </div>
      </div>

      <div className="rad-charts">
      <figure className="tc-chart rad-chart">
        <div className="tc-chart-head">
          <h3 className="tc-h3">{t('Dose for each day, in {unit}', { unit })}</h3>
          <span className="tc-badges">
            {badges.map((kind) => (
              <Badge key={kind} kind={kind} />
            ))}
            {series.storms.length > 0 && <span className="tc-whatif">{t('WHAT-IF STORM')}</span>}
          </span>
        </div>
        <div className="tc-plot">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 22, right: 14, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis dataKey="day" type="number" domain={[0, days]} ticks={ticks} tickFormatter={(value: number) => fmt(value)} stroke="var(--axis)" tick={TICK} />
              <YAxis domain={[0, rateScale.top]} ticks={rateScale.ticks} tickFormatter={(value: number) => fmt(value, rateScale.decimals)} width={40} stroke="var(--axis)" tick={TICK} allowDataOverflow />
              {gaps.map((gap) => (
                <ReferenceArea key={gap.from} x1={gap.from} x2={gap.to} fill="var(--border)" fillOpacity={0.45} stroke="var(--border-strong)" strokeDasharray="3 4" label={{ value: t('no data'), fill: 'var(--text-muted)', fontSize: 11 }} />
              ))}
              {boundaries.map((value) => (
                <ReferenceLine key={value} x={value} stroke="var(--border-strong)" strokeDasharray="2 5" />
              ))}
              {stormSpans
                .filter((span) => span.from <= days)
                .map((span, index) => (
                  <ReferenceArea key={`area-${index}`} x1={span.from} x2={Math.min(span.to, days)} fill="var(--warning)" fillOpacity={0.25} ifOverflow="hidden" />
                ))}
              {stormSpans
                .filter((span) => span.from <= days)
                .map((span, index) => (
                  <ReferenceLine key={`line-${index}`} x={span.from} stroke="var(--warning)" strokeWidth={1.5} label={{ value: `▲ ${t('storm')}`, position: 'top', fill: 'var(--text-soft)', fontSize: 11 }} />
                ))}
              <ReferenceLine x={cursor} stroke="var(--text-soft)" />
              <Tooltip
                isAnimationActive={false}
                cursor={{ stroke: 'var(--text-muted)' }}
                content={({ active, payload }) => {
                  const row = active ? (payload?.[0]?.payload as DayRow | undefined) : undefined
                  if (!row) return null
                  return (
                    <div className="tc-tip">
                      <div className="muted">
                        {t('Day {day}', { day: dayNumber(row.from) })} · {row.phase}
                      </div>
                      <div>{row.rate === null ? t('No data') : <strong>{t('{value} {unit} each day', { value: doseNumber(row.rate), unit })}</strong>}</div>
                      {row.rate !== null && inStorm(row) && <div className="muted">{t('With a what-if storm')}</div>}
                    </div>
                  )
                }}
              />
              <Line dataKey="rate" type="stepBefore" stroke="var(--series)" strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: 'var(--surface)', strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <figcaption className="tc-keys">
          <span className="tc-key">
            <i className="tc-line" style={{ background: 'var(--series)' }} /> {t('Dose of the day')}
          </span>
          <span className="tc-key">
            <i className="tc-line tc-line-cursor" /> {t('Cursor: day {day}', { day: dayNumber(cursor) })}
          </span>
          {boundaries.length > 0 && (
            <span className="tc-key">
              <i className="tc-line tc-line-fine" /> {t('Start of a phase')}
            </span>
          )}
          {series.storms.length > 0 && (
            <span className="tc-key">
              <i className="tc-swatch tc-swatch-storm" /> {t('What-if storm')}
            </span>
          )}
          {gaps.length > 0 && (
            <span className="tc-key">
              <i className="tc-swatch tc-swatch-gap" /> {t('No data')}
            </span>
          )}
        </figcaption>
        {series.storms.length > 0 && (
          <ul className="rad-storms">
            {series.storms.map((storm, index) => (
              <li key={index}>{t('What-if storm on day {day}: +{dose} in {hours} h.', { day: dayText(storm.day), dose: doseText(storm.dose, unit), hours: fmt(storm.hours) })}</li>
            ))}
            {clipped && <li>{t('The storm days are far above the other days. The scale of this chart fits the days with no storm, so the line leaves the chart at a storm.')}</li>}
          </ul>
        )}
        <ul className="rad-rates">
          {series.rates.map((item) => (
            <PhaseRow key={item.span.phase.id} span={item.span} rate={item.rate} unit={unit} active={item === current} />
          ))}
        </ul>
      </figure>

      <figure className="tc-chart rad-chart">
        <div className="tc-chart-head">
          <h3 className="tc-h3">{t('Total dose over the mission, in {unit}', { unit })}</h3>
          <span className="tc-badges">
            {badges.map((kind) => (
              <Badge key={kind} kind={kind} />
            ))}
            {series.storms.length > 0 && <span className="tc-whatif">{t('WHAT-IF STORM')}</span>}
          </span>
        </div>
        {totals.length > 1 ? (
          <div className="tc-plot">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={totals} margin={{ top: 22, right: 14, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--grid)" vertical={false} />
                <XAxis dataKey="day" type="number" domain={[0, days]} ticks={ticks} tickFormatter={(value: number) => fmt(value)} stroke="var(--axis)" tick={TICK} />
                <YAxis domain={[0, totalScale.top]} ticks={totalScale.ticks} tickFormatter={(value: number) => fmt(value, totalScale.decimals)} width={40} stroke="var(--axis)" tick={TICK} />
                {gaps.map((gap) => (
                  <ReferenceArea key={gap.from} x1={gap.from} x2={gap.to} fill="var(--border)" fillOpacity={0.45} stroke="var(--border-strong)" strokeDasharray="3 4" label={{ value: t('no data'), fill: 'var(--text-muted)', fontSize: 11 }} />
                ))}
                {boundaries.map((value) => (
                  <ReferenceLine key={value} x={value} stroke="var(--border-strong)" strokeDasharray="2 5" />
                ))}
                {limitInView && limit !== null && <ReferenceLine y={limit} stroke="var(--critical)" strokeDasharray="6 4" />}
                <ReferenceLine x={cursor} stroke="var(--text-soft)" />
                <Tooltip
                  isAnimationActive={false}
                  cursor={{ stroke: 'var(--text-muted)' }}
                  content={({ active, payload }) => {
                    const row = active ? (payload?.[0]?.payload as { day: number; total: number } | undefined) : undefined
                    if (!row) return null
                    return (
                      <div className="tc-tip">
                        <div className="muted">{t('From the start to day {day}', { day: dayText(row.day) })}</div>
                        <div>
                          <strong>{doseText(row.total, unit)}</strong>
                        </div>
                        {limit !== null && <div className="muted">{t('{percent}% of the career limit', { percent: fmt((row.total / limit) * 100) })}</div>}
                      </div>
                    )
                  }}
                />
                <Line dataKey="total" type="linear" stroke="var(--series)" strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: 'var(--surface)', strokeWidth: 2 }} isAnimationActive={false} />
                {series.limitDay !== null && limit !== null && (
                  <ReferenceDot
                    x={series.limitDay}
                    y={limit}
                    r={6}
                    fill="var(--critical)"
                    stroke="var(--surface)"
                    strokeWidth={2}
                    label={{ value: t('day {day}', { day: dayNumber(series.limitDay) }), position: 'top', fill: 'var(--text)', fontSize: 12, offset: 10 }}
                  />
                )}
                {now.total !== null && <ReferenceDot x={cursor} y={now.total} r={4} fill="var(--series)" stroke="var(--surface)" strokeWidth={2} />}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="tc-empty">{t('No data: the first phase of this mission has no checked value in {unit}, so the page cannot give a total.', { unit })}</p>
        )}
        <figcaption className="tc-keys">
          <span className="tc-key">
            <i className="tc-line" style={{ background: 'var(--series)' }} /> {t('Total dose')}
          </span>
          <span className="tc-key">
            <i className="tc-line tc-line-cursor" /> {t('Cursor: day {day}', { day: dayNumber(cursor) })}
          </span>
          {limitInView && limit !== null && (
            <span className="tc-key">
              <i className="tc-line tc-line-limit" /> {t('{limit} mSv: career limit', { limit: fmt(limit) })} {limitTip}
            </span>
          )}
          {series.limitDay !== null && (
            <span className="tc-key">
              <i className="tc-dot tc-dot-limit" /> {t('The total passes the limit')}
            </span>
          )}
        </figcaption>
        <Verdict series={series} limit={limit} limitInView={limitInView} limitTip={limitTip} />
        {missing.length > 0 && (
          <ul className="rad-missing">
            {missing.map((item) => (
              <li key={item.span.phase.id}>
                <strong>{t('No data for the phase "{phase}".', { phase: t(item.span.phase.label) })}</strong> {whyNoData(item.rate, unit)}
              </li>
            ))}
          </ul>
        )}
      </figure>
      </div>

      <div className="rad-notes">
        <h3 className="tc-h3">{t('What to know about these numbers')}</h3>
        <ul>
          <li>{t('A storm is a what-if scenario, not a forecast. Nobody can forecast when a solar particle event starts or how strong it is.')}</li>
          {hasFlight && <li>{t('The dose rate of the flight is flat on purpose. It changes very little between 1 and 1.5 AU from the Sun. 1 AU is the distance from the Sun to the Earth.')}</li>}
          {preset.flags.map((flag) => (
            <li key={flag}>{t(flag)}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}

// One phase under the first chart: its days, its rate or "no data", and its badge.
function PhaseRow({ span, rate, unit, active }: { span: PhaseSpan; rate: Rate; unit: DoseUnit; active: boolean }) {
  const text = rateText(rate, unit)
  return (
    <li className={active ? 'rad-rate rad-rate-on' : 'rad-rate'}>
      <span className="rad-rate-name">
        {t(span.phase.label)}
        {active && <span className="hide"> {t('(the phase of the cursor)')}</span>}
      </span>
      <span className="rad-rate-value">{text ?? <span className="rad-rate-none">{t('no data')}</span>}</span>
      <span className="rad-rate-foot">
        <span className="rad-rate-days">{t('day {from} to day {to}', { from: dayText(span.fromDay), to: dayText(span.toDay) })}</span>
        {text !== null && <Badge kind={rate.badge} />}
      </span>
    </li>
  )
}

// The sentence under the second chart: does the total pass the career limit.
function Verdict({ series, limit, limitInView, limitTip }: { series: DoseSeries; limit: number | null; limitInView: boolean; limitTip: ReactNode }) {
  const end = lastTotal(series)
  if (limit === null) {
    return <p className="rad-verdict">{t('The career limit is a dose equivalent in mSv. This chart shows the absorbed dose in mGy, so it has no limit line.')}</p>
  }
  if (series.limitDay !== null) {
    return (
      <p className="rad-verdict rad-verdict-over">
        <span aria-hidden="true">▲</span> {t('The total passes the career limit of {limit} mSv on day {day}.', { limit: fmt(limit), day: dayNumber(series.limitDay) })} {!limitInView && limitTip}
      </p>
    )
  }
  if (!end) return null
  if (series.incomplete) {
    return (
      <p className="rad-verdict">
        {t('The total is not complete: it stops on day {day} at {percent}% of the career limit of {limit} mSv. The days with no data add an unknown dose.', {
          day: dayText(end.day),
          percent: fmt((end.total / limit) * 100),
          limit: fmt(limit),
        })}{' '}
        {!limitInView && limitTip}
      </p>
    )
  }
  return (
    <p className="rad-verdict">
      {t('The total stays below the career limit of {limit} mSv: {percent}% at the end.', { limit: fmt(limit), percent: fmt((end.total / limit) * 100) })}
      {!limitInView && <> {t('The limit is far above this chart, so the chart has no limit line.')}</>} {!limitInView && limitTip}
    </p>
  )
}

export default RadiationCard
