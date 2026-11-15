// Turns the trip settings of the simulator into what the trip page shows: the geometry of the
// mission, the radiation dose, the CO2 and the O2 of the cabin, and the effects on the body.
// All math is in shared/trip/. This file only joins the parts.
//
// Two steps, so a drag of the mission day stays fast:
//   tripPlan(trip)            what depends on the mission and its settings, not on the day
//   tripNow(trip, plan, day)  what depends on the day of the cursor
import { ppmToMmHg } from '../../../shared/co2.ts'
import { issCalibration, type IssCalibration } from '../../../shared/trip/calibration.ts'
import { defaultTrip } from '../../../shared/trip/defaults.ts'
import { bodyEffects, figureHeat } from '../../../shared/trip/effects.ts'
import type { EffectsInput } from '../../../shared/trip/effects-types.ts'
import { buildGeometry } from '../../../shared/trip/geometry.ts'
import { cabinForecast, dailyTotals, METABOLIC } from '../../../shared/trip/lifesupport.ts'
import { PRESET_BY_ID } from '../../../shared/trip/presets/index.ts'
import { rateIn } from '../../../shared/trip/timeline.ts'
import { compareDose, doseAt, doseSeries, seriesUnits, type RealDose } from '../../../shared/trip/radiation.ts'
import type { DoseSeries, DoseUnit, LifeSupport, Preset, SourceRef, TrajectoryFile, TripState } from '../../../shared/trip/types.ts'
import type { About } from '../live.ts'
import { feedOfForecast, viewFrom } from '../view.ts'

// The data files of the trip. Scripts made them one time, so the page needs no network.
const DATA = import.meta.glob('./data/*.json', { eager: true, import: 'default' }) as Record<string, unknown>
const dataOf = (name: string) => DATA[`./data/${name}.json`]
// The trajectory files by name, for the geometry.
export const TRAJECTORIES = Object.fromEntries(
  Object.entries(DATA)
    .map(([path, value]) => [path.slice('./data/'.length, -'.json'.length), value] as const)
    .filter(([, value]) => typeof value === 'object' && value !== null && 'craft' in value),
) as Record<string, TrajectoryFile>

// A measured dose series with one value for each day. A day with no measurement is null.
// "missionDayOfStart": the mission day of the first value, if the series starts after the launch.
type DoseFile = { unit: DoseUnit; total: (number | null)[]; missionDayOfStart?: number; source: SourceRef & { credit?: string }; note?: string }
const doseFile = (name: string) => dataOf(name) as DoseFile | undefined
// The real series of a preset, if the app has one: the EDA record for the station, Liulin-MO for the ExoMars cruise.
// "measuredDays" and "days" tell how many days of the series are real measurements.
export function realDoseOf(preset: Preset): { real: RealDose; file: DoseFile; measuredDays: number; days: number } | null {
  const file = preset.id === 'iss' ? doseFile('eda-rr9-radiation') : preset.id === 'tgo' ? doseFile('liulin-cruise') : undefined
  if (!file || !Array.isArray(file.total) || file.total.length === 0) return null
  // A day with no measurement gets the published mean of the phase in the same unit. The page says how many days are measured.
  const cruise = preset.phases.find((phase) => phase.kind === 'cruise' || phase.kind === 'leo') ?? preset.phases[0]
  const fill = rateIn(cruise.rate, file.unit)?.value
  const lead = Math.max(0, Math.round(file.missionDayOfStart ?? 0))
  if (fill === undefined && (lead > 0 || file.total.some((value) => value === null))) return null
  const daily = [...new Array<number | null>(lead).fill(null), ...file.total].map((value) => value ?? (fill as number))
  const measuredDays = file.total.filter((value) => value !== null).length
  // The station flies the same orbit again and again, so its record repeats. A cruise does not repeat.
  return { real: { unit: file.unit, daily, loop: preset.id === 'iss' }, file, measuredDays, days: daily.length }
}

// The settings that change the plan of the mission. The page computes the plan again only when this text changes.
export function planKey(trip: TripState): string {
  return JSON.stringify([trip.preset, trip.solar, trip.doseUnit, trip.surfaceDays, trip.returnTrip, trip.customDays, trip.customRate, trip.customUnit, trip.storms, trip.compare])
}

export function tripPlan(trip: TripState) {
  const preset = PRESET_BY_ID[trip.preset]
  const geometry = buildGeometry(preset, TRAJECTORIES, trip)
  const measured = realDoseOf(preset)
  const series = doseSeries(preset, trip, trip.storms, measured?.real)
  // The comparison: the mission on the screen with its settings, each other mission with its first settings.
  const compared = trip.compare.map((id) => {
    const other = PRESET_BY_ID[id]
    if (id === trip.preset) return { preset: other, series }
    const options = { ...defaultTrip(other), doseUnit: trip.doseUnit }
    return { preset: other, series: doseSeries(other, options, [], realDoseOf(other)?.real) }
  })
  return { preset, geometry, measured, series, units: seriesUnits(preset, trip), comparison: compareDose(compared, trip.doseUnit) }
}
export type TripPlan = ReturnType<typeof tripPlan>

// The life support of the mission with nothing wrong, with the crew, the cabin, and the schedule of now.
const nominalOf = (life: LifeSupport): LifeSupport => ({ ...life, scrubber: 'both', ogaOn: true, ogaKgPerDay: null })

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / (values.length || 1)

// The dose of the days before the cursor: the total now minus the total "days" before.
function doseOfLast(series: DoseSeries, day: number, days: number): number | null {
  const now = doseAt(series, day).total
  if (now === null) return null
  const before = day > days ? doseAt(series, day - days).total : 0
  return before === null ? null : now - before
}

export function tripNow(trip: TripState, plan: TripPlan, day: number) {
  const { series } = plan
  const doseNow = doseAt(series, day)
  const stormNow = trip.storms.some((storm) => day >= storm.day && day <= storm.day + storm.hours / 24)

  // CO2 and O2. A failure starts at the day where the presenter set it.
  const forecast = cabinForecast(nominalOf(trip.life), trip.life, trip.lifeChangedDay, day)
  const co2 = viewFrom(feedOfForecast(forecast, trip.life.totalPressureMmHg))

  // The effects on the body.
  const input: EffectsInput = {
    co2MmHg: forecast.now.co2MmHg,
    co2HourMeanMmHg: mean(forecast.pastCo2MmHg.slice(-12)),
    o2MmHg: forecast.now.o2MmHg,
    dose: { unit: series.unit, total: doseNow.total, last30Days: doseOfLast(series, day, 30), lastYear: doseOfLast(series, day, 365), today: doseNow.rate },
    stormNow,
  }
  const effects = bodyEffects(input, { totalPressureMmHg: trip.life.totalPressureMmHg })

  return {
    place: plan.geometry.at(day),
    forecast,
    co2,
    person: dailyTotals(trip.life),
    metabolic: METABOLIC[trip.life.metabolic],
    effects,
    figure: figureHeat(effects),
  }
}

// The check of the cabin model against the real CO2 record of the station. The server sends the
// hourly means of the record. The result does not change, so the page computes it one time.
let calibration: { key: string; result: IssCalibration } | null = null
export function calibrationOf(about: About): IssCalibration {
  const key = `${about.startTime}-${about.hourly.length}`
  if (calibration?.key !== key) calibration = { key, result: issCalibration(about.hourly, Date.parse(about.startTime)) }
  return calibration.result
}

// The mean of the real record in mmHg, for a text of the page.
export const recordMeanMmHg = (about: About) => ppmToMmHg(mean(about.hourly))
