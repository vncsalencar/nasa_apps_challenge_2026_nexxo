// Helpers that the radiation card, the delay card, and the comparison card share:
// texts of units and days, the points of the charts, and the look of each mission.
import type { DoseSeries, DoseUnit, PresetId } from '../../../shared/trip/types.ts'
import { fmt, lang, t } from '../i18n.ts'

// The unit with its quantity. A card shows this text one time, so nobody mixes the two quantities.
export const unitName = (unit: DoseUnit) => (unit === 'mSv' ? t('mSv (dose equivalent)') : t('mGy (absorbed dose)'))

// A dose value with the digits that its size needs: 662, 23.9, 1.84, 0.481. It adds no zero
// at the end, so a value of a source keeps the digits of the source: 0.64 stays 0.64.
export function doseNumber(value: number): string {
  const size = Math.abs(value)
  return value.toLocaleString(lang, { maximumFractionDigits: size >= 100 ? 0 : size >= 10 ? 1 : size >= 1 ? 2 : size >= 0.1 ? 3 : 4, useGrouping: false })
}
export const doseText = (value: number, unit: DoseUnit) => `${doseNumber(value)} ${unit}`

// A whole number with the group marks of the language: 384,400.
export const groupNumber = (value: number) => Math.round(value).toLocaleString(lang)

// The mission day that a cursor is in. The cursor can be a fraction: 12.5 is noon of day 12.
export const dayNumber = (day: number) => Math.floor(day + 1e-9)

// The length of the mission of a dose series, in days. The last point is at the end of the mission.
export function seriesDays(series: DoseSeries): number {
  const last = series.points[series.points.length - 1]
  return last ? last.day : 0
}

// The points of the total dose that have a value. The total stops at the first day with no data.
export function totalLine(series: DoseSeries): { day: number; total: number }[] {
  const line: { day: number; total: number }[] = []
  for (const point of series.points) {
    if (point.total === null) break
    line.push({ day: point.day, total: point.total })
  }
  return line
}

// The last total that the series has, and its mission day. null: the series has no total after day 0.
export function lastTotal(series: DoseSeries): { day: number; total: number } | null {
  const line = totalLine(series)
  return line.length > 1 ? line[line.length - 1] : null
}

// The ticks of the day axis: round steps, and at most "most" ticks, so a phone has room for them.
export function dayTicks(days: number, most = 6): number[] {
  if (!(days > 0)) return [0]
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000]
  const step = steps.find((size) => days / size <= most - 1) ?? 2000
  const ticks: number[] = []
  for (let tick = 0; tick <= days + 1e-9; tick += step) ticks.push(tick)
  return ticks
}

// A round top for a value axis, and its ticks: 1, 2, or 5 times a power of ten for each step.
// "decimals" is the number of decimals that a tick needs.
export function valueScale(max: number, most = 5): { top: number; ticks: number[]; decimals: number } {
  if (!(max > 0)) return { top: 1, ticks: [0, 1], decimals: 0 }
  const raw = max / (most - 1)
  const power = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((size) => size * power).find((size) => size >= raw - 1e-12) ?? 10 * power
  const top = Math.ceil(max / step - 1e-9) * step
  const ticks: number[] = []
  for (let i = 0; i * step <= top + step * 1e-6; i++) ticks.push(Number((i * step).toPrecision(12)))
  let decimals = 0
  while (decimals < 6 && Math.abs(step * 10 ** decimals - Math.round(step * 10 ** decimals)) > 1e-9) decimals += 1
  return { top: Number(top.toPrecision(12)), ticks, decimals }
}

// The light time in the unit that fits: seconds below 2 minutes, then minutes and seconds.
export function lightText(seconds: number): string {
  if (seconds < 120) return t('{value} s', { value: fmt(seconds, seconds < 0.1 ? 3 : seconds < 10 ? 2 : 1) })
  let minutes = Math.floor(seconds / 60)
  let rest = Math.round(seconds - minutes * 60)
  if (rest === 60) {
    minutes += 1
    rest = 0
  }
  return t('{minutes} min {seconds} s', { minutes, seconds: rest })
}

// The look of each mission on the comparison chart. The color follows the mission, not its place
// in the list. The seven colors keep their distance for each pair, also for people who do not
// see red and green well (checked with the palette validator on the surface color of a card).
// Ten missions need more than seven looks, so three missions use a color again with a dashed line.
export const MISSION_LOOK: Record<PresetId, { color: string; dash?: string }> = {
  iss: { color: '#258e6a' },
  artemis1: { color: '#7361e4' },
  artemis2: { color: '#c276a2' },
  gateway: { color: '#0e6a9b' },
  msl: { color: '#c98500' },
  tgo: { color: '#d33d2c' },
  'mars-reference': { color: '#069ce4' },
  'lunar-orbit': { color: '#c98500', dash: '7 5' },
  'lunar-surface': { color: '#7361e4', dash: '7 5' },
  custom: { color: '#258e6a', dash: '2 4' },
}
