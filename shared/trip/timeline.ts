// The phases of a mission with the settings of the simulator: which phases the flight has,
// how long each one is, and which radiation rate each one uses. The geometry and the
// radiation forecast both use this list, so they always agree on the days.
import type { Phase, PhaseSpan, Preset, Rate, TripState } from './types.ts'

export type TripOptions = Pick<TripState, 'solar' | 'doseUnit' | 'surfaceDays' | 'returnTrip' | 'customDays' | 'customRate' | 'customUnit'>

export function timeline(preset: Preset, options: TripOptions): PhaseSpan[] {
  const spans: PhaseSpan[] = []
  let day = 0
  for (const phase of preset.phases) {
    // The return flight is optional.
    if (preset.returnTrip?.phaseId === phase.id && !options.returnTrip) continue
    let days = phase.days
    let rate: Rate = phase.rate
    if (preset.surfaceStay?.phaseId === phase.id) days = options.surfaceDays
    const flight = phase.kind === 'cruise' || phase.kind === 'return'
    // The solar-cycle setting selects the instrument of the cruise rate.
    if (preset.solar && flight) rate = preset.solar[options.solar]
    // The custom preset takes its length and its rate from the simulator.
    if (preset.id === 'custom' && phase.kind === 'cruise') {
      days = options.customDays
      rate = { ...rate, value: options.customRate, unit: options.customUnit, other: undefined }
    }
    if (!(days > 0)) continue
    const used: Phase = { ...phase, days, rate }
    spans.push({ phase: used, fromDay: day, toDay: day + days })
    day += days
  }
  return spans
}

export const missionDays = (spans: PhaseSpan[]) => (spans.length ? spans[spans.length - 1].toDay : 0)

// The phase of a mission day. A day after the end gives the last phase.
export function spanAt(spans: PhaseSpan[], day: number): PhaseSpan {
  return spans.find((span) => day < span.toDay) ?? spans[spans.length - 1]
}

// The rate of a phase in the wanted unit: the main value, or the same measurement as the other
// quantity if the source gives it. null: the source has no value in this unit.
export function rateIn(rate: Rate, unit: Rate['unit']): { value: number; plusMinus?: number } | null {
  if (rate.unit === unit) return rate.value === null ? null : { value: rate.value, plusMinus: rate.plusMinus }
  if (rate.other?.unit === unit) return { value: rate.other.value, plusMinus: rate.other.plusMinus }
  return null
}
