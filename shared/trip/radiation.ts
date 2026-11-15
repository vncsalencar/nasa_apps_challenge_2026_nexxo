// The radiation forecast of a mission: the dose of each mission day and the total dose.
//
// The math is simple on purpose. Each phase has a measured dose rate for each day (a published
// mean), and the total dose is the sum over the days. The rules that keep the forecast honest:
//   - A series has one unit. Absorbed dose (mGy) and dose equivalent (mSv) are different
//     quantities, and this file never converts one into the other.
//   - A phase with no value in the unit of the series has no data. From the first day with no
//     data on, the total is null.
//   - The rate of a phase is flat. It does not change with the distance from the Sun.
//   - A solar particle event ("storm") is a what-if scenario of the presenter, not a forecast.
import { CAREER_LIMIT } from './limits.ts'
import { missionDays, rateIn, timeline, type TripOptions } from './timeline.ts'
import type { DosePoint, DoseSeries, DoseUnit, PhaseSpan, Preset, Storm } from './types.ts'

// The page imports the career limit from this file, with the rest of the radiation math.
export { CAREER_LIMIT }

// A measured series with one value for each day, from the first mission day on. For example
// the dose on the ISS from the NASA Environmental Data Application, or the dose of ExoMars TGO
// from the Liulin-MO instrument.
export type RealDose = {
  unit: DoseUnit
  daily: number[]
  // true: the series starts again after its end. false: the days after its end use the rate of the phase.
  loop: boolean
}

export type CompareItem = { preset: Preset; series: DoseSeries }

// Two moments that are closer than this are the same moment. The sum of the phase lengths can
// be wrong by a very small amount, for example 25.499999999999996 in place of 25.5.
const EPSILON = 1e-9

// The length of the part of [from, to] that is inside [start, end].
const overlap = (from: number, to: number, start: number, end: number) => Math.max(0, Math.min(to, end) - Math.max(from, start))

// A storm with no length puts all its dose at one moment.
const instant = (storm: Storm) => !(storm.hours > 0)

const usable = (storm: Storm) => Number.isFinite(storm.day) && Number.isFinite(storm.dose) && storm.dose > 0 && !Number.isNaN(storm.hours)

// The dose that the storms add between two mission days. Each storm spreads its dose evenly
// over its hours.
function stormDose(storms: Storm[], from: number, to: number): number {
  let dose = 0
  for (const storm of storms) {
    const days = storm.hours / 24
    if (instant(storm)) dose += from <= storm.day && storm.day < to ? storm.dose : 0
    else dose += (storm.dose * overlap(from, to, storm.day, storm.day + days)) / days
  }
  return dose
}

// The id of the phase that fills most of the time between two mission days.
function mainPhase(spans: PhaseSpan[], from: number, to: number): string {
  let best = spans[spans.length - 1]
  let most = 0
  for (const span of spans) {
    const part = overlap(from, to, span.fromDay, span.toDay)
    if (part > most) {
      most = part
      best = span
    }
  }
  return best.phase.id
}

// The dose of each mission day and the total dose, in the unit "options.doseUnit".
//
// points[0] is day 0 with a total of 0. Each next point is the end of one mission day. If the
// mission ends inside a day, the last point is at the exact end.
// The "rate" of a point is the dose of that day, with the part of each storm in it. A phase can
// be shorter than a day, so each phase counts for the part of the day that it fills. For a last
// point that covers less than one day, "rate" is the dose divided by that part of a day.
// If "real" has the unit of the series, its values replace the phase rate, day by day.
export function doseSeries(preset: Preset, options: TripOptions, storms: Storm[], real?: RealDose): DoseSeries {
  const unit = options.doseUnit
  const spans = timeline(preset, options)
  const rates = spans.map((span) => ({ span, rate: span.phase.rate }))
  // The dose of each phase for each day in the unit of the series. null: the source has no value in this unit.
  const values = spans.map((span) => {
    const value = rateIn(span.phase.rate, unit)?.value
    return typeof value === 'number' && Number.isFinite(value) ? value : null
  })
  const measured = real && real.unit === unit && real.daily.length > 0 ? real : null
  const active = storms.filter(usable)
  // The career limit is a dose equivalent, so it applies only to a series in mSv.
  const limit = unit === 'mSv' && CAREER_LIMIT.mSv > 0 ? CAREER_LIMIT.mSv : null

  // The dose between two moments of one mission day, without the storms. null: no data.
  const quietDose = (from: number, to: number): number | null => {
    if (measured) {
      const index = Math.floor(from + EPSILON)
      if (measured.loop || index < measured.daily.length) {
        const value = measured.daily[index % measured.daily.length]
        return Number.isFinite(value) ? value * (to - from) : null
      }
    }
    let dose = 0
    for (let i = 0; i < spans.length; i++) {
      const part = overlap(from, to, spans[i].fromDay, spans[i].toDay)
      if (part <= EPSILON) continue
      const value = values[i]
      if (value === null) return null
      dose += value * part
    }
    return dose
  }

  // The moment between two points when the total reaches the limit. The rate changes inside a
  // day where a phase or a storm starts or ends, so this function goes from change to change.
  const limitMoment = (from: number, to: number, before: number, target: number): number => {
    const moments = [from, to]
    for (const span of spans) moments.push(span.fromDay, span.toDay)
    for (const storm of active) moments.push(storm.day, storm.day + Math.max(0, storm.hours) / 24)
    const cuts = [...new Set(moments.filter((moment) => moment >= from && moment <= to))].sort((a, b) => a - b)
    let sum = before
    for (let i = 0; i + 1 < cuts.length; i++) {
      const start = cuts[i]
      const stop = cuts[i + 1]
      // The dose that arrives at the moment "start", all at one time.
      const jump = active.reduce((dose, storm) => (instant(storm) && storm.day === start ? dose + storm.dose : dose), 0)
      if (sum + jump >= target) return start
      const dose = (quietDose(start, stop) ?? 0) + stormDose(active, start, stop)
      if (sum + dose >= target) return start + ((stop - start) * (target - sum - jump)) / (dose - jump)
      sum += dose
    }
    return to
  }

  // The end of each mission day, and the exact end of the mission if it is inside a day.
  const length = missionDays(spans)
  const end = Math.abs(length - Math.round(length)) < EPSILON ? Math.round(length) : length
  const ends: number[] = []
  for (let day = 1; day <= Math.floor(end); day++) ends.push(day)
  if (end > Math.floor(end)) ends.push(end)

  const points: DosePoint[] = []
  let total: number | null = 0
  let limitDay: number | null = null
  let from = 0
  for (const to of ends) {
    const quiet = quietDose(from, to)
    // A day with no data stays "no data". A storm does not make a value for it.
    const dose = quiet === null ? null : quiet + stormDose(active, from, to)
    if (limit !== null && limitDay === null && total !== null && dose !== null && total + dose >= limit) {
      limitDay = limitMoment(from, to, total, limit)
    }
    total = total === null || dose === null ? null : total + dose
    points.push({ day: to, rate: dose === null ? null : dose / (to - from), total, phaseId: mainPhase(spans, from, to) })
    from = to
  }
  // Day 0: no dose yet. It has the rate and the phase of the first day, so a chart can start there.
  points.unshift({ day: 0, rate: points[0]?.rate ?? null, total: 0, phaseId: points[0]?.phaseId ?? '' })

  return { unit, points, rates, storms: [...storms], limitDay, incomplete: points.some((point) => point.day > 0 && point.rate === null) }
}

// The values at the cursor. "rate" is the dose of the mission day that holds the cursor.
// "total" is interpolated between the start and the end of that day. "phaseId" is the phase
// at the exact moment of the cursor.
export function doseAt(series: DoseSeries, day: number): { rate: number | null; total: number | null; phaseId: string } {
  const { points, rates } = series
  const last = points[points.length - 1]
  const at = Math.min(Math.max(Number.isFinite(day) ? day : 0, 0), last.day)
  const found = points.findIndex((point) => point.day > at)
  const index = found < 0 ? points.length - 1 : found
  const next = points[index]
  const before = points[Math.max(index - 1, 0)]

  let total: number | null
  if (at <= before.day) total = before.total
  else if (at >= next.day) total = next.total
  else if (before.total === null || next.total === null) total = null
  else total = before.total + ((next.total - before.total) * (at - before.day)) / (next.day - before.day)

  const span = rates.length ? (rates.find((item) => at < item.span.toDay) ?? rates[rates.length - 1]).span : null
  return { rate: next.rate, total, phaseId: span ? span.phase.id : next.phaseId }
}

// The units that the page can offer for this mission: the units in which each phase has a
// value. If no unit covers the whole mission, the units in which at least one phase has a value.
// The unit that covers the most days is first. If two units cover the same days, the first one
// is the unit that is the main value of the source for more days.
export function seriesUnits(preset: Preset, options: TripOptions): DoseUnit[] {
  const spans = timeline(preset, options)
  const units: DoseUnit[] = ['mSv', 'mGy']
  const scores = units.map((unit) => {
    const covered = spans.filter((span) => rateIn(span.phase.rate, unit) !== null)
    const days = (list: PhaseSpan[]) => list.reduce((sum, span) => sum + span.phase.days, 0)
    return { unit, phases: covered.length, days: days(covered), mainDays: days(covered.filter((span) => span.phase.rate.unit === unit)) }
  })
  const whole = scores.filter((score) => spans.length > 0 && score.phases === spans.length)
  const offered = whole.length ? whole : scores.filter((score) => score.phases > 0)
  return offered.sort((a, b) => b.days - a.days || b.mainDays - a.mainDays).map((score) => score.unit)
}

const QUANTITY: Record<DoseUnit, string> = { mSv: 'mSv (dose equivalent)', mGy: 'mGy (absorbed dose)' }

// The reasons that compareDose gives. The page shows them with t(), so each one needs a translation.
export const compareReasons = {
  otherUnit: (has: DoseUnit, wanted: DoseUnit) => `The values of this mission are in ${QUANTITY[has]}. This chart shows ${QUANTITY[wanted]}.`,
  noValues: (wanted: DoseUnit) => `This mission has no values in ${QUANTITY[wanted]}.`,
  noTotal: (wanted: DoseUnit) => `The first days of this mission have no value in ${QUANTITY[wanted]}, so the chart cannot show a total.`,
}

// The comparison chart shows the totals of some missions on one axis, so all of them must have
// one unit. A series in the other unit, or a series with no total, goes to "hidden" with the reason.
// A series that has a total for its first days only stays in "shown".
export function compareDose(items: CompareItem[], unit: DoseUnit): { shown: CompareItem[]; hidden: { preset: Preset; reason: string }[] } {
  const shown: CompareItem[] = []
  const hidden: { preset: Preset; reason: string }[] = []
  for (const item of items) {
    const days = item.series.points.filter((point) => point.day > 0)
    if (item.series.unit !== unit) hidden.push({ preset: item.preset, reason: compareReasons.otherUnit(item.series.unit, unit) })
    else if (days.every((point) => point.rate === null)) hidden.push({ preset: item.preset, reason: compareReasons.noValues(unit) })
    else if (days.every((point) => point.total === null)) hidden.push({ preset: item.preset, reason: compareReasons.noTotal(unit) })
    else shown.push(item)
  }
  return { shown, hidden }
}
