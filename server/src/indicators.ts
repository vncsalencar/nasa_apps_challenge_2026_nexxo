// The catalog of indicators. The web app gets it from /api/indicators,
// so the limits live in one place.
//
// The label, the texts and some units are tx() tokens (see i18n.ts). A response renders them in
// the language of the reader. Do not cut or compare them. Compare the "id".
import { tx } from './i18n.ts'

export type Status = 'normal' | 'caution' | 'alert'

export type Indicator = {
  id: string
  label: string
  unit: string
  kind: 'environment' | 'vital'
  // A value inside "normal" is green. A value inside "caution" is yellow. Other values are red.
  // null means that the range has no limit on that side.
  normal: [number | null, number | null]
  caution: [number | null, number | null]
  decimals: number
  // How often a new reading comes: each hour or each day.
  cadence: 'hour' | 'day'
  // The part of the body that the body view marks for this indicator.
  bodyPart?: BodyPart
  // Why the crew measures this, in simple words.
  why: string
  // Where the limits come from.
  limitSource: string
  // Where the values come from: the field of the NASA record, or the basis of the model.
  dataSource: string
  // true if the values are a real record from NASA. false if a model gives them.
  nasaRecord: boolean
  // true if the server computes the value from other indicators.
  computed: boolean
  // What to do when the value is above (high) or below (low) its normal range.
  advice: { high?: string; low?: string }
}

export type BodyPart = 'head' | 'chest' | 'abdomen' | 'arms' | 'legs'
export const BODY_PARTS: BodyPart[] = ['head', 'chest', 'abdomen', 'arms', 'legs']
// The word for a part of the body in a log line.
export const BODY_PART_WORD: Record<BodyPart, string> = {
  head: tx('head'),
  chest: tx('chest'),
  abdomen: tx('abdomen'),
  arms: tx('arms'),
  legs: tx('legs'),
}

const STD_3001 = 'NASA-STD-3001 Volume 2, chapter 6'
const CLINICAL = tx('Usual clinical range for an adult at rest. Not specific to spaceflight.')

const OSDR = 'NASA Open Science Data Repository, Environmental Data App, mission RR-6'
const NO_RECORD = tx('Model. NASA does not publish the vitals of crew members.')

// The ids and units follow docs/health-indicator-map.md.
// For the cabin, "dataSource" names the field of the NASA record and its unit.
const DATA_SOURCE: Record<string, string> = {
  co2_partial_pressure: tx(`${OSDR}, field "co2_iss" in ppm. We convert to mmHg at a cabin pressure of 760 mmHg, because the NASA limits and the live station telemetry (item USLAB000055) use mmHg.`),
  cabin_temperature: tx(`${OSDR}, field "temperature_iss" in °C. The live station telemetry has the same value as item USLAB000059.`),
  cabin_humidity: tx(`${OSDR}, field "rh_iss" in %.`),
  radiation_dose_rate: tx(`${OSDR}, fields "gcr" plus "saa" for each day. The page calls it the dose that the samples received, from a preliminary analysis, and prints no unit. We read the values as mGy.`),
  heart_rate: `${NO_RECORD} ${tx('Basis: Norsk and others, 2015, found no change of the 24-hour heart rate in flight.')}`,
  blood_pressure_systolic: `${NO_RECORD} ${tx('Basis: Norsk and others, 2015, found the 24-hour blood pressure 8 to 10 mmHg lower in flight.')}`,
  blood_pressure_diastolic: `${NO_RECORD} ${tx('Basis: Norsk and others, 2015, found the 24-hour blood pressure 8 to 10 mmHg lower in flight.')}`,
  body_temperature: `${NO_RECORD} ${tx('Basis: usual values of a healthy adult.')}`,
  blood_glucose: `${NO_RECORD} ${tx('Basis: usual values of a healthy adult before food.')}`,
  sleep_duration: `${NO_RECORD} ${tx('Basis: Barger and others, 2014, measured 6.09 hours of sleep each night on the station.')}`,
  mood_score: `${NO_RECORD} ${tx('Basis: our choice for the prototype. Short sleep, high stress and low food intake lower it (see relations.ts).')}`,
  co2_7day_average: tx('Computed each day from the hourly values of "Cabin CO2" in the last 7 days.'),
  radiation_dose_cumulative: tx('Computed each day: the sum of all daily values of "Radiation dose" since the start of the mission.'),
  stress_score: `${NO_RECORD} ${tx('Basis: our choice for the prototype. Short sleep raises it.')}`,
  fatigue_score: `${NO_RECORD} ${tx('Basis: our choice for the prototype. Short sleep and very high CO2 raise it.')}`,
  water_intake: `${NO_RECORD} ${tx('Basis: NASA-STD-3001 [V2 6110] provides 2.5 litres of water each day for each crew member, for drinks and for food. We use this number as the target of the intake.')}`,
  energy_intake: `${NO_RECORD} ${tx('Basis: our choice for the prototype. Very high CO2, heat and low mood lower it.')}`,
  exercise_minutes: `${NO_RECORD} ${tx('Basis: our choice of a plan of 120 minutes each day. Low mood and fatigue lower it.')}`,
}

const COMPUTED = new Set(['co2_7day_average', 'radiation_dose_cumulative'])

const BASE: Omit<Indicator, 'dataSource' | 'nasaRecord' | 'computed' | 'advice'>[] = [
  {
    id: 'co2_partial_pressure',
    label: tx('Cabin CO2'),
    unit: 'mmHg',
    kind: 'environment',
    normal: [null, 2.8],
    caution: [null, 3.0],
    decimals: 2,
    cadence: 'hour',
    why: tx('CO2 builds up in a closed cabin. On the station, crews report headaches from about 2.8 mmHg.'),
    limitSource: tx(`${STD_3001}: the 1-hour average must stay at or below 3 mmHg. NASA OCHMO-TB-004: headaches occur from 2.8 mmHg.`),
  },
  {
    id: 'co2_7day_average',
    label: tx('Cabin CO2, 7-day average'),
    unit: 'mmHg',
    kind: 'environment',
    normal: [null, 2.5],
    caution: [null, 3.0],
    decimals: 2,
    cadence: 'day',
    why: tx('One hour of high CO2 is less important than many days of it. The average of 7 days shows the load on the crew.'),
    limitSource: tx('NASA OCHMO-TB-004: a 7-day average below 2.5 mmHg keeps the headache risk under 1%.'),
  },
  {
    id: 'cabin_temperature',
    label: tx('Cabin temperature'),
    unit: '°C',
    kind: 'environment',
    normal: [20, 25],
    caution: [18, 27],
    decimals: 1,
    cadence: 'hour',
    why: tx('Heat and cold change heart rate, sleep and how much water the body loses.'),
    limitSource: tx(`${STD_3001}: Crew Performance Environmental Zone 20 to 25 °C, Crew Health Environmental Limits 18 to 27 °C.`),
  },
  {
    id: 'cabin_humidity',
    label: tx('Cabin humidity'),
    unit: '%',
    kind: 'environment',
    normal: [30, 60],
    caution: [25, 75],
    decimals: 0,
    cadence: 'hour',
    why: tx('Dry air irritates eyes and skin. Wet air helps microbes grow.'),
    limitSource: tx(`${STD_3001}: Crew Performance Environmental Zone 30 to 60%, Crew Health Environmental Limits 25 to 75%.`),
  },
  {
    id: 'radiation_dose_rate',
    label: tx('Radiation dose'),
    unit: tx('mGy/day'),
    kind: 'environment',
    normal: [null, 0.5],
    caution: [null, 1.0],
    decimals: 2,
    cadence: 'day',
    why: tx('Radiation raises the risk of cancer and can cause nausea after a strong solar event.'),
    limitSource: tx(
      'Our choice for the prototype, with no NASA limit behind it: the record of this mission stays between 0.27 and 0.31 each day, so 0.5 is clearly above the usual dose. The real NASA limits are 250 mGy-Eq in 30 days for the blood-forming organs and 600 mSv for a career.',
    ),
  },
  {
    id: 'radiation_dose_cumulative',
    label: tx('Radiation dose, mission total'),
    unit: 'mGy',
    kind: 'environment',
    normal: [null, 300],
    caution: [null, 600],
    decimals: 1,
    cadence: 'day',
    why: tx('The cancer risk grows with the total dose of the career, not with the dose of one day.'),
    limitSource: tx(
      'Our choice for the prototype: caution at half of the NASA career limit of 600 mSv. The record gives mGy. The same dose in mSv is higher, because mSv also counts the type of particle. So this indicator shows less than the true share of the limit.',
    ),
  },
  {
    id: 'heart_rate',
    label: tx('Heart rate at rest'),
    unit: 'bpm',
    kind: 'vital',
    normal: [50, 100],
    caution: [40, 120],
    decimals: 0,
    cadence: 'hour',
    bodyPart: 'chest',
    why: tx('The heart works differently with no gravity. A fast rate at rest can show stress, fever, low water or high CO2.'),
    limitSource: CLINICAL,
  },
  {
    id: 'blood_pressure_systolic',
    label: tx('Blood pressure, upper'),
    unit: 'mmHg',
    kind: 'vital',
    normal: [90, 130],
    caution: [85, 140],
    decimals: 0,
    cadence: 'day',
    bodyPart: 'chest',
    why: tx('Body fluid moves to the head in flight. Blood pressure shows how the heart and the vessels adapt.'),
    limitSource: CLINICAL,
  },
  {
    id: 'blood_pressure_diastolic',
    label: tx('Blood pressure, lower'),
    unit: 'mmHg',
    kind: 'vital',
    normal: [60, 85],
    caution: [55, 90],
    decimals: 0,
    cadence: 'day',
    bodyPart: 'chest',
    why: tx('The lower number is the pressure between two heartbeats.'),
    limitSource: CLINICAL,
  },
  {
    id: 'body_temperature',
    label: tx('Body temperature'),
    unit: '°C',
    kind: 'vital',
    normal: [36.1, 37.5],
    caution: [35.5, 38.0],
    decimals: 1,
    cadence: 'day',
    bodyPart: 'head',
    why: tx('The immune system changes in flight. A fever can be the first sign of an infection.'),
    limitSource: CLINICAL,
  },
  {
    id: 'blood_glucose',
    label: tx('Blood sugar, before food'),
    unit: 'mg/dL',
    kind: 'vital',
    normal: [70, 100],
    caution: [60, 125],
    decimals: 0,
    cadence: 'day',
    bodyPart: 'abdomen',
    why: tx('Blood sugar shows if the food intake is right. Some medicines also change it.'),
    limitSource: CLINICAL,
  },
  {
    id: 'sleep_duration',
    label: tx('Sleep last night'),
    unit: 'h',
    kind: 'vital',
    normal: [6, 9.5],
    caution: [5, 10.5],
    decimals: 1,
    cadence: 'day',
    bodyPart: 'head',
    why: tx('Crews on the station sleep about 6 hours, less than planned. Low sleep hurts mood, attention and the immune system.'),
    limitSource: tx(
      'Our choice for one night: caution below 6 hours, alert below 5 hours. Adults need 7 hours or more, but crews sleep 6.09 hours on the station (Barger and others, 2014). A check-up starts after 3 short nights.',
    ),
  },
  {
    id: 'mood_score',
    label: tx('Mood'),
    unit: tx('of 5'),
    kind: 'vital',
    normal: [3, 5],
    caution: [2, 5],
    decimals: 0,
    cadence: 'day',
    bodyPart: 'head',
    why: tx('Isolation and confinement can lower mood. The crew member gives the score, from 1 (very low) to 5 (very good).'),
    limitSource: tx('Our choice for the prototype.'),
  },
  {
    id: 'stress_score',
    label: tx('Stress'),
    unit: tx('of 5'),
    kind: 'vital',
    normal: [1, 3],
    caution: [1, 4],
    decimals: 0,
    cadence: 'day',
    bodyPart: 'head',
    why: tx('Stress over many days weakens the immune system and makes sleep worse. The crew member gives the score, from 1 (calm) to 5 (very stressed).'),
    limitSource: tx('Our choice for the prototype.'),
  },
  {
    id: 'fatigue_score',
    label: tx('Fatigue'),
    unit: tx('of 5'),
    kind: 'vital',
    normal: [1, 3],
    caution: [1, 4],
    decimals: 0,
    cadence: 'day',
    bodyPart: 'head',
    why: tx('A tired crew member makes more errors. Short sleep and high CO2 cause fatigue. The crew member gives the score, from 1 (fresh) to 5 (exhausted).'),
    limitSource: tx('Our choice for the prototype. NASA OCHMO-TB-004: fatigue occurs above 4.5 mmHg of CO2.'),
  },
  {
    id: 'water_intake',
    label: tx('Water, last day'),
    unit: 'L',
    kind: 'vital',
    normal: [2.5, null],
    caution: [2.0, null],
    decimals: 1,
    cadence: 'day',
    bodyPart: 'abdomen',
    why: tx('Low water intake raises heart rate, lowers blood pressure, and raises the risk of kidney stones in flight.'),
    limitSource: tx(`${STD_3001}: [V2 6110] provides 2.5 litres of water each day for each crew member, for drinks and for food. We use it as the target of the intake. The caution limit of 2.0 litres is our choice.`),
  },
  {
    id: 'energy_intake',
    label: tx('Food, last day'),
    unit: tx('% of target'),
    kind: 'vital',
    normal: [90, null],
    caution: [70, null],
    decimals: 0,
    cadence: 'day',
    bodyPart: 'abdomen',
    why: tx('Crews often eat less than they need. Low food intake lowers blood sugar, body mass and mood.'),
    limitSource: tx('NASA-STD-3001 Volume 1 [V1 4020]: the crew must get 90% or more of the planned food energy. The alert limit of 70% is our choice.'),
  },
  {
    id: 'exercise_minutes',
    label: tx('Exercise, last day'),
    unit: 'min',
    kind: 'vital',
    normal: [108, null],
    caution: [60, null],
    decimals: 0,
    cadence: 'day',
    bodyPart: 'legs',
    why: tx('Exercise slows the loss of bone and muscle in weightlessness. Bone density falls 1 to 1.5% each month.'),
    limitSource: tx('NASA: crews on the station exercise about 2 hours each day. Our choice: normal is 90% or more of 120 minutes, alert is below 50%.'),
  },
]

// What to do when a value is above or below its normal range. Short, direct, one action.
const ADVICE: Record<string, { high?: string; low?: string }> = {
  body_temperature: { high: tx('Rest, drink water, and measure again in 2 hours.'), low: tx('Get warm and measure again in 30 minutes.') },
  heart_rate: { high: tx('Rest for 10 minutes, drink water, then measure your blood pressure.'), low: tx('Sit down, hold a handrail, and measure your blood pressure.') },
  blood_pressure_systolic: { high: tx('Rest for 5 minutes and measure again. No hard exercise today.'), low: tx('Drink water with salt and eat. Measure again in 1 hour.') },
  blood_pressure_diastolic: { high: tx('Rest for 5 minutes and measure again. No hard exercise today.'), low: tx('Drink water with salt and eat. Measure again in 1 hour.') },
  blood_glucose: { high: tx('Drink water. Measure again tomorrow before food.'), low: tx('Eat or drink something with sugar now. Measure again in 15 minutes.') },
  sleep_duration: { low: tx('Go to sleep earlier tonight. Dim the lights 1 hour before.') },
  mood_score: { low: tx('Plan a call with family or friends. Keep your exercise and sleep times.') },
  stress_score: { high: tx('Take a 10-minute break now. Tell the commander if the workload is too high.') },
  fatigue_score: { high: tx('Move hard tasks to another day if you can. Sleep earlier tonight.') },
  water_intake: { low: tx('Drink water now. The target is 2.5 litres each day.') },
  energy_intake: { low: tx('Eat your planned meals today.') },
  exercise_minutes: { low: tx('Do your exercise session today.') },
  co2_partial_pressure: { high: tx('Move to a module with better air flow. The engineers check the CO2 removal system.') },
  co2_7day_average: { high: tx('The CO2 was high for days. The engineers check the CO2 removal system.') },
  cabin_temperature: { high: tx('Drink water. Lower the temperature setting of the cabin.'), low: tx('Raise the temperature setting of the cabin.') },
  cabin_humidity: { high: tx('Tell the engineers. Wet air helps microbes grow.'), low: tx('Drink water. Dry air irritates eyes and skin.') },
  radiation_dose_rate: { high: tx('Stay in the area with the most shielding until the dose falls.') },
  radiation_dose_cumulative: { high: tx('Tell the flight surgeons. Plan your time in the shielded area.') },
}

export const INDICATORS: Indicator[] = BASE.map((indicator) => ({
  ...indicator,
  advice: ADVICE[indicator.id] ?? {},
  dataSource: DATA_SOURCE[indicator.id],
  nasaRecord: indicator.kind === 'environment',
  computed: COMPUTED.has(indicator.id),
}))

export const indicatorById = new Map(INDICATORS.map((indicator) => [indicator.id, indicator]))

// A number for a person, in the way of the language: 38.7 in English and 38,7 in Portuguese.
// With no "decimals", the number keeps the decimals that it has: 2.8 stays 2.8 and 20 stays 20.
export function num(value: number, decimals?: number): string {
  const places = decimals ?? String(value).split('.')[1]?.length ?? 0
  return tx(`{value:${Math.min(places, 9)}}`, { value })
}

// A value with its unit, for example "3.65 mmHg".
export function valueText(indicator: Indicator, value: number): string {
  return `${num(value, indicator.decimals)} ${indicator.unit}`
}

function inside(value: number, [low, high]: [number | null, number | null]) {
  return (low === null || value >= low) && (high === null || value <= high)
}

export function statusOf(indicatorId: string, value: number): Status {
  const indicator = indicatorById.get(indicatorId)
  if (!indicator || inside(value, indicator.normal)) return 'normal'
  return inside(value, indicator.caution) ? 'caution' : 'alert'
}

// The one thing to do for a value that is not normal.
export function adviceFor(indicatorId: string, value: number): string {
  const indicator = indicatorById.get(indicatorId)
  if (!indicator) return ''
  const [low, high] = indicator.normal
  const side = high !== null && value > high ? 'high' : low !== null && value < low ? 'low' : null
  return (side && indicator.advice[side]) || tx('Measure again later today.')
}
