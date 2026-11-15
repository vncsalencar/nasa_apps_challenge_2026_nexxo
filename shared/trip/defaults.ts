// The first settings of the trip for one mission preset.
import { DEFAULT_PRESSURE_MMHG } from '../co2.ts'
import { ISS_OTHER_UNITS } from './calibration.ts'
import { rateIn } from './timeline.ts'
import { DEFAULT_SCHEDULE, type DoseUnit, type LifeSupport, type Preset, type TripState } from './types.ts'

// Assumption: a cabin other than the station has one scrubber like a CDRA for each 2 persons.
// With it, the CO2 of a usual day stays near or below the limit, also while a person exercises.
const PERSONS_PER_SCRUBBER = 2

// The life support of a preset with nothing wrong: the scrubber on both beds, and the oxygen
// generator on at the rate that the crew uses.
export function nominalLife(preset: Preset, crew = preset.crew, freeVolumeM3 = preset.cabin.freeVolumeM3): LifeSupport {
  const station = preset.id === 'iss'
  return {
    crew,
    freeVolumeM3,
    temperatureC: 22.5,
    totalPressureMmHg: DEFAULT_PRESSURE_MMHG,
    metabolic: 'hidh',
    schedule: { ...DEFAULT_SCHEDULE, exerciseStartHours: [...DEFAULT_SCHEDULE.exerciseStartHours] },
    scrubber: 'both',
    // The station has one CDRA and other CO2 removal. The amount of the other removal is set
    // from the real CO2 record of the station (see shared/trip/calibration.ts).
    scrubberUnits: station ? 1 : preset.crew / PERSONS_PER_SCRUBBER,
    otherUnits: station ? ISS_OTHER_UNITS : 0,
    ogaOn: true,
    ogaKgPerDay: null,
    bottledO2Kg: 0,
    sabatier: false,
  }
}

// The unit of the radiation charts at the start: the unit in which the most phases of the
// mission have a value. With the same count, the dose equivalent (mSv), because the career limit uses it.
function firstUnit(preset: Preset): DoseUnit {
  const count = (unit: DoseUnit) => preset.phases.filter((phase) => rateIn(phase.rate, unit) !== null).length
  return count('mGy') > count('mSv') ? 'mGy' : 'mSv'
}

export function defaultTrip(preset: Preset): TripState {
  const cruise = preset.phases.find((phase) => phase.kind === 'cruise') ?? preset.phases[0]
  return {
    preset: preset.id,
    day: 0,
    playing: false,
    speed: 0.25,
    solar: 'max',
    doseUnit: firstUnit(preset),
    storms: [],
    surfaceDays: preset.surfaceStay?.defaultDays ?? 0,
    returnTrip: Boolean(preset.returnTrip),
    customDays: cruise.days,
    customRate: cruise.rate.value ?? 0,
    customUnit: cruise.rate.unit,
    life: nominalLife(preset),
    lifeChangedDay: 0,
    compare: [preset.id],
  }
}
