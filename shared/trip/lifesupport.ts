// The life support forecast: CO2 and O2 in one volume of air that is fully mixed.
//
// The model moves in steps of 1 minute:
//   CO2 change = CO2 that the crew makes (by activity) − CO2 that the scrubber removes
//   O2 change  = O2 from the generator (or from the bottles) − O2 that the crew uses (by activity)
//
// The CO2 part uses the cabin model of shared/co2.ts: the same removal equation, and the same
// exact solution for each step. So with a constant activity it gives the balance of "modelOf".
//
// The crew members sleep at the same time, but they exercise one after the other (assumption:
// the spacecraft has one exercise device). So at each minute the rates of the crew are the sum
// over the crew members, each one by its own activity.
//
// The O2 value of this file is the inspired O2 partial pressure (PIO2), because the range of
// NASA-STD-3001 Volume 2 [V2 6003] (145 to 155 mmHg) is a range of PIO2:
//   PIO2 = (total pressure − 47 mmHg) × O2 fraction of the dry cabin gas
// 47 mmHg is the pressure of the water vapor in the airways at body temperature.
//
// docs/sources-life-support.md gives the exact quote, the place, and the URL of each number,
// and lists each assumption.
import { CDRA_RATE, DEFAULT_PARAMS, HISTORY_STEPS, STEP_MINUTES, advance, mmHgPerKg, modelOf } from '../co2.ts'
import {
  O2_RANGE_MMHG,
  type Activity,
  type CabinForecast,
  type CabinNow,
  type LifeSupport,
  type MetabolicId,
  type Schedule,
  type SourceRef,
} from './types.ts'

export const MINUTES_PER_DAY = 1440
// The forecast looks this far ahead for "hoursToCo2" and "hoursToO2".
export const LOOK_AHEAD_DAYS = 30

// ---------------------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------------------
const HIDH: SourceRef = {
  short: 'NASA HIDH, table 6.2-10',
  title: 'NASA Human Integration Design Handbook, NASA/SP-2010-3407 revision 1 (2014), table 6.2-10. The same table is in the NASA brief OCHMO-TB-004 revision D, page 6.',
  url: 'https://www.nasa.gov/wp-content/uploads/2015/03/human_integration_design_handbook_revision_1.pdf',
}
const EWERT_2019: SourceRef = {
  short: 'Ewert and Stromgren 2019',
  title: 'Ewert and Stromgren, "Astronaut Mass Balance for Long Duration Missions", ICES-2019-126 (NTRS 20190027563), table 1',
  url: 'https://ntrs.nasa.gov/citations/20190027563',
}
const STD_3001: SourceRef = {
  short: 'NASA-STD-3001 Vol. 2 [V2 6003]',
  title: 'NASA-STD-3001 Volume 2, revision F (2026), requirement [V2 6003] and table 6.2-1 "Inspired Oxygen Partial Pressure Exposure Ranges", page 51',
  url: 'https://standards.nasa.gov/system/files/tmp/NASA-STD-3001%20Vol%202%20Rev%20F.pdf',
}
const TAKADA_2023: SourceRef = {
  short: 'Takada et al. 2023',
  title: 'Takada and others, "Status of the Advanced Oxygen Generation Assembly", ICES-2023-311 (NTRS 20230008013)',
  url: 'https://ntrs.nasa.gov/citations/20230008013',
}
const ESA_ACLS: SourceRef = {
  short: 'ESA, Advanced Closed Loop System',
  title: 'European Space Agency, "Advanced Closed Loop System" (web page about the ACLS rack of the station)',
  url: 'https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Research/Advanced_Closed_Loop_System',
}
const CDRA_2005: SourceRef = {
  short: 'El Sherif and Knox 2005',
  title: 'El Sherif and Knox, "International Space Station Carbon Dioxide Removal Assembly (ISS CDRA) Concepts and Advancements" (NTRS 20050210002), equation 1. Also in OCHMO-TB-004.',
  url: 'https://ntrs.nasa.gov/citations/20050210002',
}

// ---------------------------------------------------------------------------------------
// The crew: O2 use and CO2 output of one person, by activity, in kg for each minute.
// ---------------------------------------------------------------------------------------
export type Metabolic = {
  label: string
  o2KgPerMin: Record<Activity, number>
  co2KgPerMin: Record<Activity, number>
  // What the source says, in short sentences, with the numbers.
  says: string
  source: SourceRef
  // The day of the source and the daily totals that the source prints, for one person.
  sourceDay: { sleepHours: number; exerciseMinutes: number; o2Kg: number; co2Kg: number }
  // How we got one "exercise" rate from the source, if the source has no such rate.
  mapping?: string
}

// The source of "exercise90" has two kinds of exercise: 30 minutes of aerobic exercise
// (O2 3.99 and CO2 5.22 g for each minute) and 60 minutes of resistive exercise (1.43 and 1.89).
// This app has one "exercise" activity. Our choice: the mean of the 90 minutes.
const EXERCISE90_O2_G_PER_MIN = (30 * 3.99 + 60 * 1.43) / 90
const EXERCISE90_CO2_G_PER_MIN = (30 * 5.22 + 60 * 1.89) / 90

export const EXERCISE90_MAPPING =
  'The paper gives two exercise rates: aerobic (O2 3.99 and CO2 5.22 g each minute, 30 minutes) and resistive (1.43 and 1.89 g each minute, 60 minutes). ' +
  'Our choice: one exercise rate, the mean of the 90 minutes (O2 2.28 and CO2 3.00 g each minute). The daily total matches the paper only when the schedule has 90 minutes of exercise.'

export const METABOLIC: Record<MetabolicId, Metabolic> = {
  hidh: {
    label: 'NASA handbook rates',
    o2KgPerMin: { sleep: 3.6e-4, nominal: 5.68e-4, exercise: 39.4e-4 },
    co2KgPerMin: { sleep: 4.55e-4, nominal: 7.2e-4, exercise: 49.85e-4 },
    says:
      'One person uses 3.60 (sleep), 5.68 (nominal) and 39.40 (exercise at 75% of VO2max) × 10⁻⁴ kg of O2 each minute, and makes 4.55, 7.2 and 49.85 × 10⁻⁴ kg of CO2 each minute. ' +
      'The day of the handbook has 8 hours of sleep and 30 minutes of exercise. It gives 0.82 kg of O2 and 1.04 kg of CO2. The handbook assumes a respiratory quotient of 0.92.',
    source: HIDH,
    sourceDay: { sleepHours: 8, exerciseMinutes: 30, o2Kg: 0.82, co2Kg: 1.04 },
  },
  exercise90: {
    label: 'Long mission, 90 minutes of exercise',
    o2KgPerMin: { sleep: 0.37e-3, nominal: 0.59e-3, exercise: EXERCISE90_O2_G_PER_MIN / 1000 },
    co2KgPerMin: { sleep: 0.44e-3, nominal: 0.69e-3, exercise: EXERCISE90_CO2_G_PER_MIN / 1000 },
    says:
      'One person uses 0.37 (sleep) and 0.59 (nominal) g of O2 each minute, and makes 0.44 and 0.69 g of CO2 each minute. ' +
      'The day of the paper has 8 hours of sleep, 30 minutes of aerobic exercise and 60 minutes of resistive exercise. It gives 0.89 kg of O2 and 1.08 kg of CO2.',
    source: EWERT_2019,
    sourceDay: { sleepHours: 8, exerciseMinutes: 90, o2Kg: 0.89, co2Kg: 1.08 },
    mapping: EXERCISE90_MAPPING,
  },
}

const ACTIVITIES: Activity[] = ['sleep', 'nominal', 'exercise']

const finite = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback)
const mod = (value: number, size: number) => ((value % size) + size) % size

// What one crew member does at this minute of the day (0 to 1439).
//
// The crew members exercise one after the other. For each session, crew member 0 starts at the
// hour of the schedule, crew member 1 starts "exerciseMinutes" later, and so on. All crew members
// sleep at the same time. An exercise session wins over sleep: if a shifted session reaches the
// sleep time, the exercise still happens.
function memberActivityAt(schedule: Schedule, member: number, minuteOfDay: number): Activity {
  const minute = mod(finite(minuteOfDay, 0), MINUTES_PER_DAY)
  const length = Math.max(0, finite(schedule.exerciseMinutes, 0))
  for (const hour of schedule.exerciseStartHours) {
    if (mod(minute - finite(hour, 0) * 60 - member * length, MINUTES_PER_DAY) < length) return 'exercise'
  }
  const sleep = Math.min(24, Math.max(0, finite(schedule.sleepHours, 0))) * 60
  return mod(minute - finite(schedule.sleepStartHour, 0) * 60, MINUTES_PER_DAY) < sleep ? 'sleep' : 'nominal'
}

// What crew member 0 does at this minute of the day (0 to 1439).
export function activityAt(schedule: Schedule, minuteOfDay: number): Activity {
  return memberActivityAt(schedule, 0, minuteOfDay)
}

const scheduleKey = (schedule: Schedule) => `${schedule.sleepStartHour}|${schedule.sleepHours}|${schedule.exerciseStartHours.join(',')}|${schedule.exerciseMinutes}`

// The day of the whole crew.
type CrewDay = {
  // How many crew members are in each activity at each minute of the day: one list for sleep, nominal, and exercise.
  count: Float64Array[]
  // What the crew does as a group at each minute, as an index into ACTIVITIES.
  group: Uint8Array
  // The minutes of each activity of crew member 0.
  minutes: Record<Activity, number>
}
const crewDays = new Map<string, CrewDay>()
function crewDayOf(schedule: Schedule, crew: number): CrewDay {
  const persons = Math.max(0, finite(crew, 0))
  const key = `${scheduleKey(schedule)}#${persons}`
  const known = crewDays.get(key)
  if (known) return known
  const count = ACTIVITIES.map(() => new Float64Array(MINUTES_PER_DAY))
  const group = new Uint8Array(MINUTES_PER_DAY)
  const minutes: Record<Activity, number> = { sleep: 0, nominal: 0, exercise: 0 }
  // A crew count with a fraction (the page does not give one) counts the last crew member as a part of a person.
  const members = Math.ceil(persons)
  for (let minute = 0; minute < MINUTES_PER_DAY; minute++) {
    for (let member = 0; member < members; member++) {
      const activity = ACTIVITIES.indexOf(memberActivityAt(schedule, member, minute))
      count[activity][minute] += Math.min(1, persons - member)
    }
    const first = memberActivityAt(schedule, 0, minute)
    minutes[first] += 1
    // The group: "exercise" when at least one crew member exercises, "sleep" when all sleep, else "nominal".
    group[minute] = members === 0 ? ACTIVITIES.indexOf(first) : count[2][minute] > 0 ? 2 : count[1][minute] > 0 ? 1 : 0
  }
  const day = { count, group, minutes }
  if (crewDays.size >= 24) crewDays.clear()
  crewDays.set(key, day)
  return day
}

// What the crew does as a group at this minute of the day: "sleep" when all crew members sleep,
// "exercise" when at least one crew member exercises, else "nominal".
export function crewActivityAt(schedule: Schedule, crew: number, minuteOfDay: number): Activity {
  return ACTIVITIES[crewDayOf(schedule, crew).group[Math.floor(mod(finite(minuteOfDay, 0), MINUTES_PER_DAY))]]
}

// How many minutes of a day one crew member spends in each activity.
export function minutesByActivity(schedule: Schedule): Record<Activity, number> {
  return { ...crewDayOf(schedule, 1).minutes }
}

// The O2 that one person uses and the CO2 that one person makes in a full day, in kg.
export function dailyTotals(life: Pick<LifeSupport, 'metabolic' | 'schedule'>): { o2Kg: number; co2Kg: number } {
  const rates = METABOLIC[life.metabolic] ?? METABOLIC.hidh
  const { minutes } = crewDayOf(life.schedule, 1)
  let o2Kg = 0
  let co2Kg = 0
  for (const activity of ACTIVITIES) {
    o2Kg += minutes[activity] * rates.o2KgPerMin[activity]
    co2Kg += minutes[activity] * rates.co2KgPerMin[activity]
  }
  return { o2Kg, co2Kg }
}

// The O2 that the whole crew uses and the CO2 that the whole crew makes in a full day, in kg.
// This is the crew count × "dailyTotals", unless a shifted exercise session reaches the sleep time.
export function crewDailyTotals(life: Pick<LifeSupport, 'crew' | 'metabolic' | 'schedule'>): { o2Kg: number; co2Kg: number } {
  const rates = METABOLIC[life.metabolic] ?? METABOLIC.hidh
  const { count } = crewDayOf(life.schedule, life.crew)
  let o2Kg = 0
  let co2Kg = 0
  ACTIVITIES.forEach((activity, index) => {
    let minutes = 0
    for (let minute = 0; minute < MINUTES_PER_DAY; minute++) minutes += count[index][minute]
    o2Kg += minutes * rates.o2KgPerMin[activity]
    co2Kg += minutes * rates.co2KgPerMin[activity]
  })
  return { o2Kg, co2Kg }
}

// ---------------------------------------------------------------------------------------
// O2: pressure, range, generator, bottles, and the Sabatier reactor.
// ---------------------------------------------------------------------------------------
const CO2_KG_PER_MOL = 0.04401
export const O2_KG_PER_MOL = 0.031998
// The pressure of the water vapor in the airways at body temperature, in mmHg (NASA-STD-3001 Volume 2, table 6.2-1).
export const WATER_VAPOR_MMHG = 47

// How much the O2 partial pressure of the dry cabin gas rises when 1 kg of O2 enters the cabin, in mmHg.
// The same ideal gas formula as "mmHgPerKg" of shared/co2.ts, with the molar mass of O2.
export function mmHgPerKgO2(params: Pick<LifeSupport, 'freeVolumeM3' | 'temperatureC'>): number {
  return (mmHgPerKg(params) * CO2_KG_PER_MOL) / O2_KG_PER_MOL
}

// The inspired O2 partial pressure for an O2 partial pressure of the dry cabin gas, and back.
// The model holds the total pressure of the cabin constant.
export function inspiredO2MmHg(cabinO2MmHg: number, totalPressureMmHg: number): number {
  return (cabinO2MmHg * (totalPressureMmHg - WATER_VAPOR_MMHG)) / totalPressureMmHg
}
export function cabinO2MmHg(inspiredMmHg: number, totalPressureMmHg: number): number {
  return (inspiredMmHg * totalPressureMmHg) / (totalPressureMmHg - WATER_VAPOR_MMHG)
}

export const O2_SOURCE = {
  // The quantity of each O2 value of this model.
  quantity: 'Inspired O2 partial pressure (PIO2)',
  formula: 'PIO2 = (total pressure − 47 mmHg) × O2 fraction of the dry cabin gas',
  range: O2_RANGE_MMHG,
  // The cabin starts here: the middle of the range.
  startMmHg: (O2_RANGE_MMHG.low + O2_RANGE_MMHG.high) / 2,
  // Mild hypoxia lower limit: a 1-hour average, acceptable for an unlimited time with monitoring. And its absolute lower limit.
  mildHypoxiaMmHg: 127,
  absoluteLowMmHg: 122,
  // The upper limit for an unlimited time (hyperoxia).
  highLimitMmHg: 356,
  says:
    'The system must keep the inspired O2 partial pressure (PIO2) in the ranges of table 6.2-1. The target range for normal O2 is 145 to 155 mmHg. ' +
    'The lower limit for mild hypoxia is 127 mmHg as a 1-hour average, with an absolute lower limit of 122 mmHg. The upper limit for an unlimited time is 356 mmHg.',
  source: STD_3001,
}

export const OGA = {
  // The top rate of the oxygen generator of the station, in kg of O2 for each day.
  maxKgPerDay: 9.25,
  // The crew that this rate can supply, and the O2 use of one person that NASA assumes for this number.
  crewAtMax: 10.88,
  o2PerPersonKgDay: 0.85,
  // NASA designs the next generator (AOGA) for this mission.
  futureCrew: 4,
  futureYears: 3,
  says:
    'The oxygen generator of the station (OGA) makes O2 from water by electrolysis, at a rate that the crew selects, up to 9.25 kg each day. ' +
    'NASA says that this can supply 10.88 persons at 0.85 kg of O2 for each person and day. NASA designs the next generator for a crew of 4 and a mission of 3 years.',
  source: TAKADA_2023,
}

export const SABATIER = {
  // The part of the CO2 that the system converts (ESA: "recycles half of the carbon dioxide").
  co2Share: 0.5,
  // The crew that one system serves (ESA: "produce oxygen for three astronauts").
  crew: 3,
  // CO2 + 4 H2 → CH4 + 2 H2O, then 2 H2O → 2 H2 + O2: each mol of CO2 that reacts gives 1 mol of O2 back.
  o2MolPerCo2Mol: 1,
  // The reaction needs 4 mol of H2 for each mol of CO2. The generator makes 2 mol of H2 for each mol of O2.
  // So the reactor can return at most half of the O2 that the generator makes.
  o2SharePerGeneratorO2: 0.5,
  reaction: 'CO2 + 4 H2 → CH4 + 2 H2O',
  says:
    'The Advanced Closed Loop System of ESA on the station has a Sabatier reactor. It makes water and methane from CO2 and hydrogen. Electrolysis then makes O2 from the water. ' +
    'ESA says that the system recycles half of the CO2 and produces O2 for three astronauts.',
  source: ESA_ACLS,
}

export const SCRUBBER = {
  ...CDRA_RATE,
  oneBedShare: DEFAULT_PARAMS.oneBedShare,
  says:
    'The CO2 removal system of the station (CDRA) with both beds removes at least 1.723 × ppCO2 − 0.37975 kg of CO2 each day, for 2.0 to 3.9 mmHg. ' +
    'One bed removes half of that. The model also uses the equation outside 2.0 to 3.9 mmHg, which is an assumption.',
  source: CDRA_2005,
}

// How many "CDRA with both beds" remove CO2 in this state:
//   (both beds: 1, one bed: 0.5, off: 0) × scrubberUnits + otherUnits
// "otherUnits" is other removal that always works. Only the station has it.
export function scrubberUnitsNow(life: Pick<LifeSupport, 'scrubber' | 'scrubberUnits' | 'otherUnits'>): number {
  const share = life.scrubber === 'both' ? 1 : life.scrubber === 'one' ? DEFAULT_PARAMS.oneBedShare : 0
  return share * Math.max(0, finite(life.scrubberUnits, 1)) + Math.max(0, finite(life.otherUnits ?? 0, 0))
}

// The O2 that the whole crew uses in a full day, in kg.
export function crewO2KgPerDay(life: Pick<LifeSupport, 'crew' | 'metabolic' | 'schedule'>): number {
  return crewDailyTotals(life).o2Kg
}

// The O2 that the generator makes now, in kg for each day. 0 when it is off.
// A rate of null means: as much as the crew uses in a full day, so the O2 stays level.
export function generatorKgPerDay(life: Pick<LifeSupport, 'crew' | 'metabolic' | 'schedule' | 'ogaOn' | 'ogaKgPerDay'>): number {
  if (!life.ogaOn) return 0
  return life.ogaKgPerDay === null ? crewO2KgPerDay(life) : Math.max(0, finite(life.ogaKgPerDay, 0))
}

// The part of the O2 that the crew uses that comes back from the CO2, from 0 to 1.
//
//   O2 back = the smaller of
//     0.5 × the CO2 of the crew that one system serves (3 persons at most), 1 mol of O2 for each mol of CO2
//     0.5 × the O2 that the generator makes (the hydrogen limit)
//   closure = O2 back / O2 that the crew uses, all in mol
//
// The reactor gets its hydrogen from the generator, so the closure is 0 with the generator off.
export function o2LoopClosure(life: LifeSupport): number {
  if (!life.sabatier || !life.ogaOn) return 0
  const crew = Math.max(0, finite(life.crew, 0))
  const day = crewDailyTotals(life)
  const usedMol = day.o2Kg / O2_KG_PER_MOL
  if (!(usedMol > 0)) return 0
  const co2Mol = (Math.min(1, SABATIER.crew / crew) * day.co2Kg) / CO2_KG_PER_MOL
  const fromCo2 = SABATIER.co2Share * co2Mol * SABATIER.o2MolPerCo2Mol
  const fromHydrogen = SABATIER.o2SharePerGeneratorO2 * (generatorKgPerDay(life) / O2_KG_PER_MOL)
  return Math.min(1, Math.max(0, Math.min(fromCo2, fromHydrogen) / usedMol))
}

// ---------------------------------------------------------------------------------------
// One step of the model.
// ---------------------------------------------------------------------------------------
// The air of the cabin at one moment. "o2MmHg" is the inspired O2 partial pressure.
export type CabinState = { co2MmHg: number; o2MmHg: number; bottledO2Kg: number }

// The numbers of one set of settings, ready for the steps. Each list has one value for each minute of the day.
export type Stepper = {
  life: LifeSupport
  // CO2. The rise from the crew, in mmHg for each minute.
  co2PerMinute: Float64Array
  // The value where the crew of this minute and the removal are in balance, in mmHg. Infinity when nothing removes CO2.
  balance: Float64Array
  // The part of the CO2 above "zero" that the scrubber removes each hour, and the CO2 pressure below which it removes nothing.
  removal: number
  zero: number
  // The part of the distance to the balance that stays after 1 minute. 1 when nothing removes CO2.
  decay: number
  removes: boolean
  // O2. The use of the crew, and the output of the generator, in kg for each minute.
  o2UseKg: Float64Array
  generatorKg: number
  // The rise of the inspired O2 partial pressure for 1 kg of O2, in mmHg.
  inspiredPerKg: number
  // No partial pressure can be above the total pressure. For the inspired O2 the top is the total pressure − 47 mmHg.
  co2TopMmHg: number
  o2TopMmHg: number
}

// The settings with each number inside safe limits, so the model always gives finite values.
function clean(life: LifeSupport): LifeSupport {
  return {
    ...life,
    crew: Math.max(0, finite(life.crew, 0)),
    freeVolumeM3: Math.max(0.1, finite(life.freeVolumeM3, DEFAULT_PARAMS.freeVolumeM3)),
    temperatureC: Math.max(-200, finite(life.temperatureC, DEFAULT_PARAMS.temperatureC)),
    totalPressureMmHg: Math.max(WATER_VAPOR_MMHG + 1, finite(life.totalPressureMmHg, DEFAULT_PARAMS.totalPressureMmHg)),
    metabolic: METABOLIC[life.metabolic] ? life.metabolic : 'hidh',
    scrubberUnits: Math.max(0, finite(life.scrubberUnits, 1)),
    otherUnits: Math.max(0, finite(life.otherUnits ?? 0, 0)),
    ogaKgPerDay: life.ogaKgPerDay === null ? null : Math.max(0, finite(life.ogaKgPerDay, 0)),
    bottledO2Kg: Math.max(0, finite(life.bottledO2Kg, 0)),
  }
}

// The parts of the settings that change the gas in the cabin. The Sabatier reactor is not one of them.
const lifeKey = (life: LifeSupport) =>
  [
    life.crew,
    life.freeVolumeM3,
    life.temperatureC,
    life.totalPressureMmHg,
    life.metabolic,
    scheduleKey(life.schedule),
    life.scrubber,
    life.scrubberUnits,
    life.otherUnits ?? 0,
    life.ogaOn,
    life.ogaKgPerDay,
    life.bottledO2Kg,
  ].join(';')

function remember<Value>(cache: Map<string, Value>, key: string, size: number, make: () => Value): Value {
  const known = cache.get(key)
  if (known !== undefined) return known
  const value = make()
  // The oldest entry goes first: a Map keeps the order in which the entries came.
  if (cache.size >= size) cache.delete(cache.keys().next().value as string)
  cache.set(key, value)
  return value
}

const steppers = new Map<string, Stepper>()

export function stepperOf(settings: LifeSupport): Stepper {
  return remember(steppers, lifeKey(settings), 12, () => {
    const life = clean(settings)
    const rates = METABOLIC[life.metabolic]
    // The model of shared/co2.ts for 1 kg of CO2 each day, with all the removal of this state as "other removal".
    const base = modelOf(
      {
        ...DEFAULT_PARAMS,
        totalPressureMmHg: life.totalPressureMmHg,
        freeVolumeM3: life.freeVolumeM3,
        temperatureC: life.temperatureC,
        co2PerPersonKgDay: 1,
        otherRemoval: scrubberUnitsNow(life),
      },
      1,
      'off',
    )
    const { count } = crewDayOf(life.schedule, life.crew)
    const co2PerMinute = new Float64Array(MINUTES_PER_DAY)
    const balance = new Float64Array(MINUTES_PER_DAY)
    const o2UseKg = new Float64Array(MINUTES_PER_DAY)
    for (let minute = 0; minute < MINUTES_PER_DAY; minute++) {
      let co2Kg = 0
      let o2Kg = 0
      ACTIVITIES.forEach((activity, index) => {
        co2Kg += count[index][minute] * rates.co2KgPerMin[activity]
        o2Kg += count[index][minute] * rates.o2KgPerMin[activity]
      })
      // The rise in mmHg for each hour, for the kg of CO2 that the crew makes each day at the rate of this minute.
      const perHour = co2Kg * MINUTES_PER_DAY * base.generation
      co2PerMinute[minute] = perHour / 60
      balance[minute] = base.removal > 0 ? base.zero + perHour / base.removal : Infinity
      o2UseKg[minute] = o2Kg
    }
    return {
      life,
      co2PerMinute,
      balance,
      removal: base.removal,
      zero: base.zero,
      decay: Math.exp(-base.removal / 60),
      removes: base.removal > 0,
      o2UseKg,
      generatorKg: generatorKgPerDay(life) / MINUTES_PER_DAY,
      inspiredPerKg: inspiredO2MmHg(mmHgPerKgO2(life), life.totalPressureMmHg),
      co2TopMmHg: life.totalPressureMmHg,
      o2TopMmHg: life.totalPressureMmHg - WATER_VAPOR_MMHG,
    }
  })
}

// Moves the state by 1 minute. "minuteOfDay" (0 to 1439, a whole number) is the minute that starts now.
// It changes "state" and returns it.
export function stepCabin(stepper: Stepper, state: CabinState, minuteOfDay: number): CabinState {
  // CO2: the exact solution of the equation of shared/co2.ts for 1 minute.
  let co2 = state.co2MmHg
  if (!stepper.removes) co2 += stepper.co2PerMinute[minuteOfDay]
  else if (co2 >= stepper.zero) co2 = stepper.balance[minuteOfDay] + (co2 - stepper.balance[minuteOfDay]) * stepper.decay
  else co2 = advance(co2, 1 / 60, { generation: stepper.co2PerMinute[minuteOfDay] * 60, removal: stepper.removal, zero: stepper.zero, balance: stepper.balance[minuteOfDay] })
  state.co2MmHg = Math.min(stepper.co2TopMmHg, Math.max(0, co2))

  // O2: the generator makes a constant amount. With the generator off, the bottles give what the crew uses.
  const use = stepper.o2UseKg[minuteOfDay]
  let supply = stepper.generatorKg
  if (!stepper.life.ogaOn) {
    supply = Math.min(use, state.bottledO2Kg)
    state.bottledO2Kg -= supply
  }
  state.o2MmHg = Math.min(stepper.o2TopMmHg, Math.max(0, state.o2MmHg + (supply - use) * stepper.inspiredPerKg))
  return state
}

// A direct run of the model: the state after "minutes" steps, from "start" at the minute "fromMinute"
// (minutes from the start of mission day 0). "visit" gets the state before each step and after the last one.
export function runCabin(
  life: LifeSupport,
  start: CabinState,
  fromMinute: number,
  minutes: number,
  visit?: (state: CabinState, minute: number) => void,
): CabinState {
  const stepper = stepperOf(life)
  const state = { ...start }
  for (let index = 0; index < minutes; index++) {
    visit?.(state, fromMinute + index)
    stepCabin(stepper, state, mod(fromMinute + index, MINUTES_PER_DAY))
  }
  visit?.(state, fromMinute + minutes)
  return state
}

// ---------------------------------------------------------------------------------------
// The daily pattern: the day that repeats when the settings stay the same.
// ---------------------------------------------------------------------------------------
export type DailyPattern = {
  // The value at the start of each minute of the day (1440 values).
  co2MmHg: Float64Array
  o2MmHg: Float64Array
  // The mean CO2 of the day. null: the CO2 has no day that repeats, because nothing removes CO2.
  meanCo2MmHg: number | null
  // true: the O2 at the end of the day is the O2 at its start.
  o2Level: boolean
}

// Two values that are closer than this are the same value, in mmHg and in kg.
const SAME = 1e-9

const patterns = new Map<string, DailyPattern>()

// The model runs day after day until one day repeats. To get there with fewer days, each round
// uses two days to estimate where the start of the day stops moving (Aitken's method), and the
// loop ends only when a real run of one day gives its own start value again.
export function dailyPattern(settings: LifeSupport): DailyPattern {
  return remember(patterns, lifeKey(settings), 12, () => {
    const stepper = stepperOf(settings)
    const middle = O2_SOURCE.startMmHg
    const state: CabinState = { co2MmHg: 0, o2MmHg: middle, bottledO2Kg: stepper.life.bottledO2Kg }
    const oneDay = (co2: number) => {
      state.co2MmHg = co2
      for (let minute = 0; minute < MINUTES_PER_DAY; minute++) stepCabin(stepper, state, minute)
      return state.co2MmHg
    }

    // CO2 at the start of the day. With no removal, no day repeats: the pattern is then the first day from 0 mmHg.
    let start = 0
    if (stepper.removes) {
      start = stepper.balance[0]
      for (let round = 0; round < 200; round++) {
        const first = oneDay(start)
        if (Math.abs(first - start) < SAME / 10) break
        const second = oneDay(first)
        const factor = (second - first) / (first - start)
        start = Math.max(0, Number.isFinite(factor) && Math.abs(factor) < 1 ? first + (second - first) / (1 - factor) : second)
      }
    }

    const co2MmHg = new Float64Array(MINUTES_PER_DAY)
    const o2MmHg = new Float64Array(MINUTES_PER_DAY)
    state.co2MmHg = start
    state.o2MmHg = middle
    state.bottledO2Kg = stepper.life.bottledO2Kg
    let sumCo2 = 0
    let sumO2 = 0
    for (let minute = 0; minute < MINUTES_PER_DAY; minute++) {
      co2MmHg[minute] = state.co2MmHg
      o2MmHg[minute] = state.o2MmHg
      sumCo2 += state.co2MmHg
      sumO2 += state.o2MmHg
      stepCabin(stepper, state, minute)
    }
    // When the O2 is level over the day, the mean of the day is the middle of the range.
    const o2Level = Math.abs(state.o2MmHg - middle) < 1e-6
    if (o2Level) {
      const shift = middle - sumO2 / MINUTES_PER_DAY
      for (let minute = 0; minute < MINUTES_PER_DAY; minute++) o2MmHg[minute] = Math.min(stepper.o2TopMmHg, Math.max(0, o2MmHg[minute] + shift))
    }
    return { co2MmHg, o2MmHg, meanCo2MmHg: stepper.removes ? sumCo2 / MINUTES_PER_DAY : null, o2Level }
  })
}

// ---------------------------------------------------------------------------------------
// The cabin after the settings changed: the state at the end of each day from the change.
// ---------------------------------------------------------------------------------------
// A known state "day" days after the change. With "perDay", each of the next "days" days adds
// the same amount, so the model can jump over them with no steps.
type Mark = { day: number; state: CabinState; perDay?: CabinState; days?: number }

type Run = {
  nominal: DailyPattern
  nominalLife: LifeSupport
  stepper: Stepper
  changeMinute: number
  marks: Mark[]
  // The change of the last day that the run made step by step.
  lastChange: CabinState | null
}

const runs = new Map<string, Run>()

function runOf(nominal: LifeSupport, current: LifeSupport, changeMinute: number): Run {
  return remember(runs, `${lifeKey(nominal)}>${lifeKey(current)}@${changeMinute}`, 6, () => {
    const pattern = dailyPattern(nominal)
    const stepper = stepperOf(current)
    const minute = mod(changeMinute, MINUTES_PER_DAY)
    const state: CabinState = { co2MmHg: pattern.co2MmHg[minute], o2MmHg: pattern.o2MmHg[minute], bottledO2Kg: stepper.life.bottledO2Kg }
    return { nominal: pattern, nominalLife: clean(nominal), stepper, changeMinute, marks: [{ day: 0, state }], lastChange: null }
  })
}

// How many more days the same change for each day stays exact: until a value comes near one of its limits.
function daysOfSameChange(run: Run, state: CabinState, perDay: CabinState, low: number, high: number): number {
  const { stepper } = run
  let days = Infinity
  // CO2 with no removal rises in a straight line until it reaches the top.
  if (perDay.co2MmHg > 0) days = Math.min(days, (stepper.co2TopMmHg - state.co2MmHg) / perDay.co2MmHg - 1)
  // O2 moves in a straight line while no minute of the day touches 0 or the top.
  // "low" and "high" are the lowest and highest O2 of the last day, as a distance from its start.
  if (perDay.o2MmHg < 0) days = Math.min(days, (state.o2MmHg + low) / -perDay.o2MmHg - 1)
  if (perDay.o2MmHg > 0) days = Math.min(days, (stepper.o2TopMmHg - state.o2MmHg - high) / perDay.o2MmHg - 1)
  // The bottles give the same amount each day until they are empty.
  if (perDay.bottledO2Kg < 0) days = Math.min(days, state.bottledO2Kg / -perDay.bottledO2Kg - 1)
  return days === Infinity ? Infinity : Math.max(0, Math.floor(days))
}

// The state "day" whole days after the change.
function stateAtDay(run: Run, day: number): CabinState {
  const { stepper, marks } = run
  for (;;) {
    const mark = marks[marks.length - 1]
    if (day <= mark.day + (mark.days ?? 0)) break
    // Jump to the end of the days with the same change, or make one more day step by step.
    if (mark.perDay && mark.days) {
      const days = mark.days
      marks.push({
        day: mark.day + days,
        state: {
          co2MmHg: mark.state.co2MmHg + days * mark.perDay.co2MmHg,
          o2MmHg: mark.state.o2MmHg + days * mark.perDay.o2MmHg,
          bottledO2Kg: Math.max(0, mark.state.bottledO2Kg + days * mark.perDay.bottledO2Kg),
        },
      })
      run.lastChange = null
      continue
    }
    const state = { ...mark.state }
    const startMinute = mod(run.changeMinute, MINUTES_PER_DAY)
    let low = 0
    let high = 0
    for (let index = 0; index < MINUTES_PER_DAY; index++) {
      stepCabin(stepper, state, (startMinute + index) % MINUTES_PER_DAY)
      const moved = state.o2MmHg - mark.state.o2MmHg
      if (moved < low) low = moved
      if (moved > high) high = moved
    }
    const change: CabinState = {
      co2MmHg: state.co2MmHg - mark.state.co2MmHg,
      o2MmHg: state.o2MmHg - mark.state.o2MmHg,
      bottledO2Kg: state.bottledO2Kg - mark.state.bottledO2Kg,
    }
    const next: Mark = { day: mark.day + 1, state }
    const still = Math.abs(change.co2MmHg) < SAME && Math.abs(change.o2MmHg) < SAME && Math.abs(change.bottledO2Kg) < SAME
    const last = run.lastChange
    if (still) {
      // The day repeats, so each next day is the same day.
      next.perDay = { co2MmHg: 0, o2MmHg: 0, bottledO2Kg: 0 }
      next.days = Infinity
    } else if (
      last &&
      Math.abs(change.co2MmHg - last.co2MmHg) < SAME &&
      Math.abs(change.o2MmHg - last.o2MmHg) < SAME &&
      Math.abs(change.bottledO2Kg - last.bottledO2Kg) < SAME &&
      (!stepper.removes || Math.abs(change.co2MmHg) < SAME)
    ) {
      // Two days in a row changed by the same amount: the CO2 repeats (or rises in a straight line
      // with no removal), and the O2 and the bottles move in a straight line.
      const perDay = { ...change, co2MmHg: stepper.removes ? 0 : change.co2MmHg }
      const days = daysOfSameChange(run, state, perDay, low, high)
      if (days >= 1) {
        next.perDay = perDay
        next.days = days
      }
    }
    run.lastChange = change
    marks.push(next)
  }
  // The last mark at or before this day.
  let index = marks.length - 1
  while (marks[index].day > day) index--
  const mark = marks[index]
  const days = day - mark.day
  if (days === 0 || !mark.perDay) return { ...mark.state }
  return {
    co2MmHg: mark.state.co2MmHg + days * mark.perDay.co2MmHg,
    o2MmHg: mark.state.o2MmHg + days * mark.perDay.o2MmHg,
    bottledO2Kg: Math.max(0, mark.state.bottledO2Kg + days * mark.perDay.bottledO2Kg),
  }
}

// Calls "visit" with the state at each minute from "fromMinute" to "toMinute" (both included).
// Before the change the cabin has the daily pattern of the nominal settings. From the change on,
// the model runs with the settings now.
function walk(run: Run, fromMinute: number, toMinute: number, visit: (state: CabinState, minute: number) => void) {
  const { nominal, stepper, changeMinute } = run
  const state: CabinState = { co2MmHg: 0, o2MmHg: 0, bottledO2Kg: run.nominalLife.bottledO2Kg }
  let minute = fromMinute
  for (; minute <= toMinute && minute < changeMinute; minute++) {
    const ofDay = mod(minute, MINUTES_PER_DAY)
    state.co2MmHg = nominal.co2MmHg[ofDay]
    state.o2MmHg = nominal.o2MmHg[ofDay]
    visit(state, minute)
  }
  if (minute > toMinute) return
  // The state at the first minute after the change: from the end of the last whole day, step by step.
  const day = Math.floor((minute - changeMinute) / MINUTES_PER_DAY)
  const after = stateAtDay(run, day)
  for (let at = changeMinute + day * MINUTES_PER_DAY; at < minute; at++) stepCabin(stepper, after, mod(at, MINUTES_PER_DAY))
  for (; minute <= toMinute; minute++) {
    visit(after, minute)
    if (minute < toMinute) stepCabin(stepper, after, mod(minute, MINUTES_PER_DAY))
  }
}

// The hours until the series crosses the target. The series has one value each minute and starts now.
function hoursTo(values: Float64Array, target: number): number | null {
  if (!Number.isFinite(target)) return null
  const first = values[0] - target
  if (first === 0) return 0
  for (let index = 1; index < values.length; index++) {
    const here = values[index] - target
    if (here === 0 || here > 0 !== first > 0) {
      const before = values[index - 1] - target
      return (index - 1 + before / (before - here)) / 60
    }
  }
  return null
}

// ---------------------------------------------------------------------------------------
// The forecast that the page shows.
// ---------------------------------------------------------------------------------------
const CHART_HOURS_BEFORE = 24
const CHART_HOURS_AFTER = 48
const NEXT_HOURS = 24

// The CO2 and O2 of the cabin at one mission day.
//   nominal     the settings of the preset with nothing wrong
//   current     the settings now
//   changedDay  the mission day when the settings changed from "nominal" to "current"
//   day         the mission day of the cursor. Its fraction is the time of day: 12.5 is noon of day 12.
// Before "changedDay" the cabin has the daily pattern of "nominal". From "changedDay" on it runs with
// "current", from the state of the nominal pattern at that time of day. The times are rounded to the minute.
export function cabinForecast(nominal: LifeSupport, current: LifeSupport, changedDay: number, day: number): CabinForecast {
  const changeMinute = Math.round(finite(changedDay, 0) * MINUTES_PER_DAY)
  const nowMinute = Math.round(finite(day, 0) * MINUTES_PER_DAY)
  const run = runOf(nominal, current, changeMinute)
  // The settings as the caller gave them. The cached copies can hold an older state of the Sabatier reactor.
  const lifeAt = (minute: number) => (minute < changeMinute ? nominal : current)

  // One walk from 7 days before now to 48 hours after now.
  const pastCo2MmHg: number[] = []
  const chart: CabinForecast['chart'] = []
  const nextCo2MmHg: number[] = []
  const firstPast = nowMinute - (HISTORY_STEPS - 1) * STEP_MINUTES
  const firstChart = nowMinute - CHART_HOURS_BEFORE * 60
  let now: CabinNow = { co2MmHg: 0, o2MmHg: 0, activity: 'nominal', bottledO2Kg: 0 }
  walk(run, firstPast, nowMinute + CHART_HOURS_AFTER * 60, (state, minute) => {
    const offset = minute - nowMinute
    if (offset % STEP_MINUTES !== 0) return
    if (offset <= 0) pastCo2MmHg.push(state.co2MmHg)
    if (offset >= 0 && offset <= NEXT_HOURS * 60) nextCo2MmHg.push(state.co2MmHg)
    const life = lifeAt(minute)
    const activity = crewActivityAt(life.schedule, life.crew, mod(minute, MINUTES_PER_DAY))
    if (minute >= firstChart) chart.push({ hour: offset / 60, co2MmHg: state.co2MmHg, o2MmHg: state.o2MmHg, activity })
    if (offset === 0) now = { co2MmHg: state.co2MmHg, o2MmHg: state.o2MmHg, activity, bottledO2Kg: state.bottledO2Kg }
  })

  // The next 30 days, one value each minute. The page does not always ask for them, so they wait for the first call.
  let ahead: { co2: Float64Array; o2: Float64Array } | null = null
  const lookAhead = () => {
    if (ahead) return ahead
    const count = LOOK_AHEAD_DAYS * MINUTES_PER_DAY + 1
    const co2 = new Float64Array(count)
    const o2 = new Float64Array(count)
    walk(run, nowMinute, nowMinute + count - 1, (state, minute) => {
      co2[minute - nowMinute] = state.co2MmHg
      o2[minute - nowMinute] = state.o2MmHg
    })
    ahead = { co2, o2 }
    return ahead
  }

  const lifeNow = lifeAt(nowMinute)
  return {
    now,
    pastCo2MmHg,
    chart,
    nextCo2MmHg,
    hoursToCo2: (targetMmHg) => hoursTo(lookAhead().co2, targetMmHg),
    hoursToO2: (targetMmHg) => hoursTo(lookAhead().o2, targetMmHg),
    dailyMeanCo2MmHg: dailyPattern(lifeNow).meanCo2MmHg,
    o2LoopClosure: o2LoopClosure(lifeNow),
  }
}
