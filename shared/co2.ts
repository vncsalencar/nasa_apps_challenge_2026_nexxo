// The math of the CO2 exposure panel. Pure functions with no imports, so the server, the web
// app, and the tests all use the same code. README.md lists the source of each number.

// ---------------------------------------------------------------------------------------
// Units. The EDA record gives CO2 in parts per million (ppm). The NASA limits use the
// partial pressure in mmHg: ppCO2 = ppm × total cabin pressure / 1,000,000.
// At 760 mmHg, 1 mmHg is about 1,316 ppm.
// ---------------------------------------------------------------------------------------
export const DEFAULT_PRESSURE_MMHG = 760

export function ppmToMmHg(ppm: number, totalPressureMmHg = DEFAULT_PRESSURE_MMHG): number {
  return (ppm * totalPressureMmHg) / 1_000_000
}

export function mmHgToPpm(mmHg: number, totalPressureMmHg = DEFAULT_PRESSURE_MMHG): number {
  return (mmHg * 1_000_000) / totalPressureMmHg
}

// ---------------------------------------------------------------------------------------
// Rolling averages. The record has one value each 5 minutes.
// ---------------------------------------------------------------------------------------
export const STEP_MINUTES = 5
export const STEPS_PER_HOUR = 60 / STEP_MINUTES

export type WindowId = 'hour' | 'day' | 'week'
export const WINDOWS: { id: WindowId; hours: number; steps: number }[] = [
  { id: 'hour', hours: 1, steps: STEPS_PER_HOUR },
  { id: 'day', hours: 24, steps: 24 * STEPS_PER_HOUR },
  { id: 'week', hours: 168, steps: 168 * STEPS_PER_HOUR },
]
// The count of values that the longest window needs.
export const HISTORY_STEPS = WINDOWS[WINDOWS.length - 1].steps

export type Average = {
  mean: number
  // How many values the average has. It is less than "steps" when the series is too short.
  count: number
  steps: number
}

// The mean of the last "steps" values. The last value of the list is the newest.
export function rollingMean(values: ArrayLike<number>, steps: number): Average | null {
  const count = Math.min(steps, values.length)
  if (count <= 0) return null
  let sum = 0
  for (let index = values.length - count; index < values.length; index++) sum += values[index]
  return { mean: sum / count, count, steps }
}

// ---------------------------------------------------------------------------------------
// Limit and headache risk.
// ---------------------------------------------------------------------------------------
// NASA-STD-3001 Volume 2 [V2 6004]: the 1-hour average must stay at or below this value.
export const LIMIT_1H_MMHG = 3.0

// Law and others, 2014 (J Occup Environ Med 56(5):477-83): the odds of a headache double for
// each +1 mmHg, and a 7-day average below 2.5 mmHg keeps the headache risk below 1%.
// The study used averages of 24 hours and of 7 days.
export const HEADACHE = {
  referenceMmHg: 2.5,
  oddsPerMmHg: 2,
  // The NASA abstract of the same study (NTRS 20140003857): 46 headaches in 1,716 observations.
  headaches: 46,
  observations: 1716,
  // Station data below this value is thin, so the panel shows no odds there. An earlier NASA
  // analysis (James and others, 2011) had only 20 crew reports with a 24-hour average below 2 mmHg.
  studyFloorMmHg: 2.0,
}

// The odds of a headache at this average, divided by the odds at 2.5 mmHg.
// This is an estimate for a group of people. It is not a diagnosis of one person.
export function relativeOdds(averageMmHg: number): number {
  return HEADACHE.oddsPerMmHg ** (averageMmHg - HEADACHE.referenceMmHg)
}

// ---------------------------------------------------------------------------------------
// Symptom bands that NASA documents report, by the CO2 partial pressure.
// ---------------------------------------------------------------------------------------
export type SourceId = 'std3001' | 'ochmo' | 'ntrs2015' | 'law2014' | 'counts2014' | 'james2011' | 'hidh' | 'bvad' | 'guide2015' | 'cdra2005' | 'eda'
// Where a band shows. "sleep" is not a place on the body, so the panel shows it as a label.
export type BandRegion = 'body' | 'brain' | 'head' | 'eyes' | 'airway' | 'face' | 'sleep'

export type Band = {
  id: string
  region: BandRegion
  // The first value of the band, in mmHg.
  from: number
  // The last value of the band. null: the source gives one value only, so the band is fully on from "from".
  to: number | null
  source: SourceId
  // How strong the color of this band can get, from 0 to 1. A more serious symptom gets a
  // stronger color. This order is our choice. It is not from a NASA document.
  weight: number
}

export const BANDS: Band[] = [
  { id: 'fatigue', region: 'body', from: 2.3, to: 2.7, source: 'ntrs2015', weight: 0.35 },
  { id: 'cognition', region: 'brain', from: 2.7, to: 3.0, source: 'ntrs2015', weight: 0.6 },
  { id: 'headache_ochmo', region: 'head', from: 2.8, to: 4.5, source: 'ochmo', weight: 0.8 },
  { id: 'headache_ntrs', region: 'head', from: 3.0, to: 3.4, source: 'ntrs2015', weight: 0.8 },
  { id: 'vision', region: 'eyes', from: 3.5, to: null, source: 'ochmo', weight: 0.9 },
  { id: 'cough', region: 'airway', from: 3.5, to: null, source: 'ochmo', weight: 0.9 },
  { id: 'sleep', region: 'sleep', from: 3.5, to: null, source: 'ochmo', weight: 0.9 },
  { id: 'face', region: 'face', from: 4.5, to: 5.0, source: 'ochmo', weight: 1 },
  { id: 'malaise', region: 'body', from: 4.5, to: null, source: 'ochmo', weight: 1 },
]

// How far the value is into the band: 0 below the start, 1 at or above the end.
export function intensity(mmHg: number, band: Pick<Band, 'from' | 'to'>): number {
  if (mmHg < band.from) return 0
  if (band.to === null || band.to <= band.from) return 1
  return Math.min(1, (mmHg - band.from) / (band.to - band.from))
}

// The strength of the color of each region: the strongest of its bands, each one as intensity × weight.
export function regionHeat(mmHg: number): Record<BandRegion, number> {
  const heat: Record<BandRegion, number> = { body: 0, brain: 0, head: 0, eyes: 0, airway: 0, face: 0, sleep: 0 }
  for (const band of BANDS) heat[band.region] = Math.max(heat[band.region], intensity(mmHg, band) * band.weight)
  return heat
}

// The values that the countdown uses: the 1-hour limit and the start of each band, lowest first.
export function thresholds(): number[] {
  return [...new Set([LIMIT_1H_MMHG, ...BANDS.map((band) => band.from)])].sort((a, b) => a - b)
}

// ---------------------------------------------------------------------------------------
// The cabin model: one volume of air that is fully mixed.
//
//   dC/dt = (CO2 that the crew makes − CO2 that the station removes) / free volume of the cabin
//
// The CDRA is the Carbon Dioxide Removal Assembly of the station. NASA gives its minimum
// removal rate with both beds as an equation (El Sherif and Knox, 2005, also in OCHMO-TB-004):
//
//   kg of CO2 each day = 1.723 × ppCO2 in mmHg − 0.37975     (for 2.0 to 3.9 mmHg)
//
// The rate rises with the CO2 pressure, so the cabin moves to a balance. At about 3.7 mmHg
// the equation gives 6 kg each day, the "6 person-equivalents" of the NASA documents.
// The model also uses the equation outside 2.0 to 3.9 mmHg, which is an assumption.
//
// The real exposure near the face can be higher than the model says, because CO2 stays in
// pockets where the air does not move in microgravity.
// ---------------------------------------------------------------------------------------
export type Cdra = 'both' | 'one' | 'off'
export const CDRA_STATES: Cdra[] = ['both', 'one', 'off']
export const CDRA_RATE = { kgPerDayPerMmHg: 1.723, offsetKgPerDay: 0.37975, validFromMmHg: 2.0, validToMmHg: 3.9 }

export type ModelParams = {
  totalPressureMmHg: number
  co2PerPersonKgDay: number
  freeVolumeM3: number
  temperatureC: number
  // What one bed removes, as a part of what both beds remove.
  oneBedShare: number
  // What the other systems of the station remove (a second CDRA, the Russian Vozdukh system),
  // as a multiple of one CDRA with both beds. They work in all three states of the CDRA.
  otherRemoval: number
}

// README.md gives the source of each value, and says which ones are assumptions.
export const DEFAULT_PARAMS: ModelParams = {
  totalPressureMmHg: DEFAULT_PRESSURE_MMHG,
  // NASA HIDH, table 6.2-10, and NASA BVAD (2015 and revision 1): 1.04 kg for each person and day.
  co2PerPersonKgDay: 1.04,
  // The pressurized volume of the station in the NASA reference guide of 2015. Assumption: all of it is air.
  freeVolumeM3: 916,
  temperatureC: 22.5,
  // El Sherif and Knox, 2005: one bed gives 3 of the 6 person-equivalents.
  oneBedShare: 0.5,
  // Assumption, set from the RR-9 record: with 6 persons the record stays near 2.65 mmHg.
  otherRemoval: 0.5,
}

// The limits of each setting, for the controls of the simulator and for the checks of the server.
export const PARAM_LIMITS: Record<keyof ModelParams, { min: number; max: number; step: number }> = {
  totalPressureMmHg: { min: 400, max: 800, step: 1 },
  co2PerPersonKgDay: { min: 0.5, max: 2, step: 0.01 },
  freeVolumeM3: { min: 50, max: 1500, step: 1 },
  temperatureC: { min: 15, max: 30, step: 0.5 },
  oneBedShare: { min: 0.1, max: 1, step: 0.05 },
  otherRemoval: { min: 0, max: 3, step: 0.05 },
}
export const CREW_LIMITS = { min: 1, max: 7 }

const GAS_CONSTANT = 8.314462618 // J for each mol and kelvin
const CO2_KG_PER_MOL = 0.04401
const PA_PER_MMHG = 133.322

// How much the CO2 pressure rises when 1 kg of CO2 enters the cabin air, in mmHg.
// From the ideal gas law: pressure = amount × R × temperature / volume.
export function mmHgPerKg(params: Pick<ModelParams, 'freeVolumeM3' | 'temperatureC'>): number {
  const mol = 1 / CO2_KG_PER_MOL
  return (mol * GAS_CONSTANT * (params.temperatureC + 273.15)) / params.freeVolumeM3 / PA_PER_MMHG
}

// The model for one crew count and one state of the CDRA. With these three numbers:
//   change each hour = generation − removal × (CO2 pressure − zero), and no removal below "zero".
export type Model = {
  // The rise from the crew alone, in mmHg for each hour.
  generation: number
  // The part of the CO2 above "zero" that the station removes each hour. 0 when nothing removes CO2.
  removal: number
  // Below this CO2 pressure the equation of the removal rate gives nothing, in mmHg.
  zero: number
  // The value where the crew and the removal are in balance, in mmHg. Infinity when nothing removes CO2.
  balance: number
}

// How many "CDRA with both beds" the station has in this state.
export function removalUnits(params: Pick<ModelParams, 'oneBedShare' | 'otherRemoval'>, cdra: Cdra): number {
  return (cdra === 'both' ? 1 : cdra === 'one' ? params.oneBedShare : 0) + params.otherRemoval
}

export function modelOf(params: ModelParams, crew: number, cdra: Cdra): Model {
  const perKgEachDay = mmHgPerKg(params) / 24
  const generation = crew * params.co2PerPersonKgDay * perKgEachDay
  const removal = removalUnits(params, cdra) * CDRA_RATE.kgPerDayPerMmHg * perKgEachDay
  const zero = CDRA_RATE.offsetKgPerDay / CDRA_RATE.kgPerDayPerMmHg
  return { generation, removal, zero, balance: removal > 0 ? zero + generation / removal : Infinity }
}

// The change of the CO2 pressure at this value, in mmHg for each hour.
export function rateAt(mmHg: number, model: Model): number {
  return model.generation - model.removal * Math.max(0, mmHg - model.zero)
}

// The CO2 pressure after some hours. This is the exact solution of the equation above.
export function advance(mmHg: number, hours: number, model: Model): number {
  if (model.removal === 0) return mmHg + model.generation * hours
  let value = mmHg
  let rest = hours
  if (value < model.zero) {
    // Below "zero" nothing removes CO2, so the value rises in a straight line.
    const toZero = (model.zero - value) / model.generation
    if (rest <= toZero) return value + model.generation * rest
    value = model.zero
    rest -= toZero
  }
  return model.balance + (value - model.balance) * Math.exp(-model.removal * rest)
}

// The hours until the CO2 pressure reaches the target. 0: it is at the target now.
// null: the model never reaches the target from this value.
export function timeTo(mmHg: number, target: number, model: Model): number | null {
  if (mmHg === target) return 0
  const straight = (from: number, to: number) => (model.generation > 0 && to > from ? (to - from) / model.generation : null)
  if (model.removal === 0) return straight(mmHg, target)
  if (mmHg < model.zero) {
    if (target <= model.zero) return straight(mmHg, target)
    const rest = timeTo(model.zero, target, model)
    return rest === null ? null : (model.zero - mmHg) / model.generation + rest
  }
  // The value moves from "mmHg" toward the balance, and it never passes the balance.
  const ratio = (target - model.balance) / (mmHg - model.balance)
  if (!(ratio > 0 && ratio < 1)) return null
  return -Math.log(ratio) / model.removal
}

// The CO2 pressure for the next hours, one value each "stepMinutes". The first value is the value now.
export function project(mmHg: number, hours: number, model: Model, stepMinutes = STEP_MINUTES): number[] {
  const count = Math.floor((hours * 60) / stepMinutes)
  const values: number[] = []
  for (let index = 0; index <= count; index++) values.push(advance(mmHg, (index * stepMinutes) / 60, model))
  return values
}
