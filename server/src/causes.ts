// Finds possible causes of a symptom or of a reading in the data of the mission.
// Each cause check reads the cabin data or the data of one crew member and returns
// one sentence of evidence, or null. The tables at the end say which checks belong
// to which symptom. They follow docs/health-indicator-map.md, sections 3.3 and 5.1.
//
// A cause check never makes a diagnosis. It shows which values in the data agree
// with a known cause, so that the crew member and the crew medical officer know where to look first.
import { db } from './db.ts'
import { tx } from './i18n.ts'
import type { Evidence } from './relations.ts'

const windowQuery = db.prepare(
  `SELECT avg(value) AS mean, max(value) AS high, count(*) AS count FROM readings
   WHERE mission_id = ? AND subject = ? AND indicator = ? AND hour > ? AND hour <= ?`,
)
const newestQuery = db.prepare(
  `SELECT value FROM readings WHERE mission_id = ? AND subject = ? AND indicator = ? AND hour <= ?
   ORDER BY hour DESC, id DESC LIMIT ?`,
)

// The personal baseline: the mean of the 14 days that end 3 days before "hour".
// The last 3 days stay out, so that a new problem does not change the baseline at once.
// null means that the mission has too few readings.
const BASELINE_DAYS = 14
const BASELINE_GAP_DAYS = 3
export function baselineOf(missionId: string, subject: string, indicator: string, hour: number): number | null {
  const row = windowQuery.get(missionId, subject, indicator, hour - (BASELINE_DAYS + BASELINE_GAP_DAYS) * 24, hour - BASELINE_GAP_DAYS * 24)
  return row && (row.count as number) >= 5 ? (row.mean as number) : null
}

export const missionDayOf = (hour: number) => Math.floor(hour / 24) + 1

// The data of one crew member and of the cabin at one hour.
export type Facts = {
  hour: number
  missionDay: number
  // The mean and the highest value of a cabin indicator in the last hours. null if no value exists.
  cabin: (indicator: string, hours: number) => { mean: number; high: number } | null
  // The newest values of the crew member, newest first.
  recent: (indicator: string, count: number) => number[]
  // The newest value of the crew member.
  value: (indicator: string) => number | undefined
  // The mean of the newest values of the crew member. undefined if fewer values exist.
  mean: (indicator: string, count: number) => number | undefined
  baseline: (indicator: string) => number | null
}

export function factsFor(missionId: string, crewId: number, hour: number): Facts {
  const subject = `crew:${crewId}`
  const recent = (indicator: string, count: number) =>
    newestQuery.all(missionId, subject, indicator, hour, count).map((row) => row.value as number)
  return {
    hour,
    missionDay: missionDayOf(hour),
    cabin: (indicator, hours) => {
      const row = windowQuery.get(missionId, 'env', indicator, hour - hours, hour)
      return row && (row.count as number) > 0 ? { mean: row.mean as number, high: row.high as number } : null
    },
    recent,
    value: (indicator) => recent(indicator, 1)[0],
    mean: (indicator, count) => {
      const values = recent(indicator, count)
      return values.length < count ? undefined : values.reduce((sum, value) => sum + value, 0) / count
    },
    baseline: (indicator) => baselineOf(missionId, subject, indicator, hour),
  }
}

export type Check = {
  id: string
  title: string
  // "cabin": the same for all crew members. "person": the data of one crew member. "flight": true for every long flight.
  scope: 'cabin' | 'person' | 'flight'
  // The relation in relations.ts or in the document that supports this cause.
  relation: string
  evidence: Evidence
  indicators: string[]
  // What the crew member or the crew can do about this cause.
  action: string
  // Returns the evidence, or null if the data does not support this cause.
  // The title, the action and the evidence are tx() tokens. See i18n.ts.
  // Each evidence text holds the unit and the decimals of its indicator, the same as in indicators.ts.
  test: (facts: Facts) => string | null
}

const CHECK_LIST: Check[] = [
  {
    id: 'co2_very_high',
    title: tx('Very high cabin CO2'),
    scope: 'cabin',
    relation: 'R02, R03',
    evidence: 'strong',
    indicators: ['co2_partial_pressure'],
    action: tx('Leave this module. The crew must repair the CO2 removal system and tell the ground team.'),
    test: ({ cabin }) => {
      const now = cabin('co2_partial_pressure', 3)
      if (!now || now.mean < 4.5) return null
      return tx('Cabin CO2 was {value:2} mmHg on average in the last 3 hours. Fatigue and nausea occur above 4.5 mmHg.', { value: now.mean })
    },
  },
  {
    id: 'co2_high',
    title: tx('High cabin CO2'),
    scope: 'cabin',
    relation: 'R01',
    evidence: 'strong',
    indicators: ['co2_partial_pressure'],
    action: tx('Move to a module with better air flow. Ask the engineer to check the CO2 removal system.'),
    test: ({ cabin }) => {
      const now = cabin('co2_partial_pressure', 3)
      const day = cabin('co2_partial_pressure', 24)
      if (!now || !day || now.mean >= 4.5 || (now.mean < 2.8 && day.high <= 3)) return null
      return tx('Cabin CO2 was {mean:2} mmHg on average in the last 3 hours, and {high:2} mmHg at the highest in the last 24 hours. Crews report headaches from 2.8 mmHg.', { mean: now.mean, high: day.high })
    },
  },
  {
    id: 'co2_week',
    title: tx('Cabin CO2 high for many days'),
    scope: 'cabin',
    relation: 'R01, R06',
    evidence: 'strong',
    indicators: ['co2_7day_average'],
    action: tx('Ask the engineer to check the CO2 removal system and the air flow in the sleep area.'),
    test: ({ cabin }) => {
      const week = cabin('co2_partial_pressure', 168)
      if (!week || week.mean < 2.5) return null
      return tx('The 7-day average of cabin CO2 is {value:2} mmHg. The NASA target is 2.5 mmHg or less, because then the headache risk is under 1%.', { value: week.mean })
    },
  },
  {
    id: 'cabin_hot',
    title: tx('Hot cabin'),
    scope: 'cabin',
    relation: 'R20, R21',
    evidence: 'medium',
    indicators: ['cabin_temperature'],
    action: tx('Drink water, rest, and lower the temperature setting of the cabin.'),
    test: ({ cabin }) => {
      const now = cabin('cabin_temperature', 3)
      if (!now || now.mean <= 27) return null
      return tx('The cabin was {value:1} °C on average in the last 3 hours. The health zone of NASA ends at 27 °C. Heat raises heart rate and body temperature.', { value: now.mean })
    },
  },
  {
    id: 'cabin_uncomfortable',
    title: tx('Cabin too warm or too cold for sleep'),
    scope: 'cabin',
    relation: 'R19',
    evidence: 'weak',
    indicators: ['cabin_temperature'],
    action: tx('Change the temperature setting of the sleep area.'),
    test: ({ cabin }) => {
      const day = cabin('cabin_temperature', 24)
      if (!day || (day.mean >= 20 && day.mean <= 25)) return null
      return tx('The cabin was {value:1} °C on average in the last 24 hours. The comfort zone is 20 to 25 °C. Sleep gets worse outside it.', { value: day.mean })
    },
  },
  {
    id: 'air_dry',
    title: tx('Dry cabin air'),
    scope: 'cabin',
    relation: 'R22',
    evidence: 'medium',
    indicators: ['cabin_humidity'],
    action: tx('Use eye drops and skin cream as planned, and drink enough.'),
    test: ({ cabin }) => {
      const day = cabin('cabin_humidity', 24)
      if (!day || day.mean >= 30) return null
      return tx('The cabin humidity was {value:0} % on average in the last 24 hours. Air below 30% dries eyes, skin and airways.', { value: day.mean })
    },
  },
  {
    id: 'radiation_high',
    title: tx('High radiation dose'),
    scope: 'cabin',
    relation: 'R30',
    evidence: 'medium',
    indicators: ['radiation_dose_rate'],
    action: tx('Stay in the area with the most shielding. Report nausea, fatigue and skin changes for the next 24 hours.'),
    test: ({ cabin }) => {
      const days = cabin('radiation_dose_rate', 48)
      if (!days || days.high <= 0.5) return null
      return tx('The radiation dose was {value:2} mGy/day in the last 2 days. The NASA record of this mission stays near 0.3 mGy each day. A strong solar event can cause nausea and fatigue.', { value: days.high })
    },
  },
  {
    id: 'sleep_short',
    title: tx('Short sleep'),
    scope: 'person',
    relation: 'R10, R11',
    evidence: 'medium',
    indicators: ['sleep_duration'],
    action: tx('Protect the next sleep period: dim the lights early, and ask the commander to move hard tasks.'),
    test: ({ value, mean }) => {
      const night = value('sleep_duration')
      const three = mean('sleep_duration', 3)
      // Crews sleep about 6 hours on the station, so 6 hours is usual. Only a clearly short night counts.
      if (night === undefined || (night >= 5.5 && (three === undefined || three >= 5.5))) return null
      return three === undefined
        ? tx('You slept {night:1} h last night. Short sleep lowers mood and attention and raises fatigue the next day.', { night })
        : tx('You slept {night:1} h last night, and {three:1} h on average in the last 3 nights. Short sleep lowers mood and attention and raises fatigue the next day.', { night, three })
    },
  },
  {
    id: 'water_low',
    title: tx('Low water intake'),
    scope: 'person',
    relation: 'R50, T4',
    evidence: 'weak',
    indicators: ['water_intake'],
    action: tx('Drink 0.5 litres now. Drink 2.5 litres or more each day.'),
    test: ({ value }) => {
      const water = value('water_intake')
      if (water === undefined || water >= 2.5) return null
      return tx('You drank {value:1} L in the last day. The minimum is 2.5 litres. Low water can cause headache and dizziness, raise heart rate and lower blood pressure.', { value: water })
    },
  },
  {
    id: 'energy_low',
    title: tx('Low food intake'),
    scope: 'person',
    relation: 'R52, R53',
    evidence: 'medium',
    indicators: ['energy_intake'],
    action: tx('Eat the planned menu. Tell the crew medical officer if your appetite is low or food tastes different.'),
    test: ({ value, mean }) => {
      const last = value('energy_intake')
      const three = mean('energy_intake', 3)
      if (last === undefined || (last >= 80 && (three === undefined || three >= 85))) return null
      return three === undefined
        ? tx('You ate {last:0}% of your target in the last day. Low food intake lowers blood sugar, strength and mood.', { last })
        : tx('You ate {last:0}% of your target in the last day, and {three:0}% on average in the last 3 days. Low food intake lowers blood sugar, strength and mood.', { last, three })
    },
  },
  {
    id: 'glucose_low',
    title: tx('Low blood sugar'),
    scope: 'person',
    relation: 'R52',
    evidence: 'strong',
    indicators: ['blood_glucose'],
    action: tx('Eat or drink something with sugar now. Measure again in 15 minutes.'),
    test: ({ value }) => {
      const glucose = value('blood_glucose')
      if (glucose === undefined || glucose >= 70) return null
      return tx('Your last blood sugar was {value:0} mg/dL. Below 70 mg/dL a person can feel shaky, weak or dizzy.', { value: glucose })
    },
  },
  {
    id: 'glucose_high',
    title: tx('High blood sugar'),
    scope: 'person',
    relation: 'section 3.3',
    evidence: 'weak',
    indicators: ['blood_glucose'],
    action: tx('Measure again tomorrow before food. Check your food log and your medicines.'),
    test: ({ value }) => {
      const glucose = value('blood_glucose')
      if (glucose === undefined || glucose <= 125) return null
      return tx('Your last blood sugar before food was {value:0} mg/dL. The usual limit is 100 mg/dL. High blood sugar can blur vision.', { value: glucose })
    },
  },
  {
    id: 'fever',
    title: tx('Raised body temperature'),
    scope: 'person',
    relation: 'T3',
    evidence: 'medium',
    indicators: ['body_temperature'],
    action: tx('Rest, drink, and measure again in 2 hours. Keep distance from the crew and tell the crew medical officer.'),
    test: ({ value, baseline }) => {
      const temperature = value('body_temperature')
      const usual = baseline('body_temperature')
      if (temperature === undefined) return null
      if (temperature <= 38 && (usual === null || temperature < usual + 1)) return null
      return usual === null
        ? tx('Your body temperature is {value:1} °C. A fever can be the first sign of an infection.', { value: temperature })
        : tx('Your body temperature is {value:1} °C. That is {difference:1} °C above your usual {usual:1} °C. A fever can be the first sign of an infection.', { value: temperature, difference: temperature - usual, usual })
    },
  },
  {
    id: 'pressure_low',
    title: tx('Low blood pressure'),
    scope: 'person',
    relation: 'T4',
    evidence: 'weak',
    indicators: ['blood_pressure_systolic'],
    action: tx('Drink water with salt and eat. Measure again in 1 hour.'),
    test: ({ value }) => {
      const pressure = value('blood_pressure_systolic')
      if (pressure === undefined || pressure >= 90) return null
      return tx('Your last upper blood pressure was {value:0} mmHg. Below 90 mmHg a person can feel dizzy or weak.', { value: pressure })
    },
  },
  {
    id: 'pressure_high',
    title: tx('High blood pressure'),
    scope: 'person',
    relation: 'section 3.3',
    evidence: 'weak',
    indicators: ['blood_pressure_systolic'],
    action: tx('Rest for 5 minutes and measure again.'),
    test: ({ value }) => {
      const pressure = value('blood_pressure_systolic')
      if (pressure === undefined || pressure <= 140) return null
      return tx('Your last upper blood pressure was {value:0} mmHg. Above 140 mmHg it can cause headache.', { value: pressure })
    },
  },
  {
    id: 'heart_fast',
    title: tx('Fast heart rate at rest'),
    scope: 'person',
    relation: 'section 3.3',
    evidence: 'weak',
    indicators: ['heart_rate'],
    action: tx('Rest for 10 minutes and drink water. Then measure your blood pressure.'),
    test: ({ mean, baseline }) => {
      const rate = mean('heart_rate', 3)
      const usual = baseline('heart_rate')
      if (rate === undefined) return null
      if (rate <= 100 && (usual === null || rate < usual + 15)) return null
      return usual === null
        ? tx('Your heart rate was {value:0} bpm on average in the last 3 hours.', { value: rate })
        : tx('Your heart rate was {value:0} bpm on average in the last 3 hours. Your usual rate is {usual:0} bpm.', { value: rate, usual })
    },
  },
  {
    id: 'stress_high',
    title: tx('High stress'),
    scope: 'person',
    relation: 'R56, T2, T6',
    evidence: 'weak',
    indicators: ['stress_score'],
    action: tx('Take the planned free time. Talk with the crew medical officer if the stress stays.'),
    test: ({ value, mean }) => {
      const stress = value('stress_score')
      const three = mean('stress_score', 3)
      if (stress === undefined || (stress < 4 && (three === undefined || three < 3.5))) return null
      return three === undefined
        ? tx('You gave your stress a score of {value:0} of 5. Stress over days makes sleep worse and weakens the immune system.', { value: stress })
        : tx('You gave your stress a score of {value:0} of 5 ({three:1} on average in the last 3 days). Stress over days makes sleep worse and weakens the immune system.', { value: stress, three })
    },
  },
  {
    id: 'mood_low',
    title: tx('Low mood'),
    scope: 'person',
    relation: 'R62',
    evidence: 'weak',
    indicators: ['mood_score'],
    action: tx('Plan a call with family or friends. Keep your exercise and sleep times.'),
    test: ({ value }) => {
      const mood = value('mood_score')
      if (mood === undefined || mood > 2) return null
      return tx('You gave your mood a score of {value:0} of 5. Low mood lowers appetite and the wish to exercise.', { value: mood })
    },
  },
  {
    id: 'exercise_low',
    title: tx('Little exercise'),
    scope: 'person',
    relation: 'R40',
    evidence: 'strong',
    indicators: ['exercise_minutes'],
    action: tx('Plan the next exercise session at a time with less work.'),
    test: ({ mean }) => {
      const week = mean('exercise_minutes', 7)
      if (week === undefined || week >= 90) return null
      return tx('You did {value:0} min of exercise each day on average in the last 7 days. The plan is 120 minutes. Muscles and bones get weak fast in weightlessness.', { value: week })
    },
  },
  {
    id: 'long_flight',
    title: tx('Long time in weightlessness'),
    scope: 'flight',
    relation: 'R34',
    evidence: 'strong',
    indicators: [],
    action: tx('Do the near vision check for each eye. The crew medical officer plans an eye scan, and the ground team reads the images.'),
    test: ({ missionDay }) =>
      missionDay <= 30
        ? null
        : tx('This is day {day} of the mission. Eye changes from weightlessness (the syndrome SANS) get more likely after day 30. About 60% of crews on long flights have one sign or more.', { day: missionDay }),
  },
  {
    id: 'first_days',
    title: tx('First days in weightlessness'),
    scope: 'flight',
    relation: 'R32',
    evidence: 'strong',
    indicators: [],
    action: tx('Move your head slowly. Eat and drink small amounts often.'),
    test: ({ missionDay }) =>
      missionDay > 4 ? null : tx('This is day {day} of the mission. Space motion sickness is common in the first 2 to 4 days.', { day: missionDay }),
  },
  {
    id: 'fluid_shift',
    title: tx('Body fluid moves to the head'),
    scope: 'flight',
    relation: 'R35',
    evidence: 'medium',
    indicators: [],
    action: tx('Report this symptom again if it stays or gets worse.'),
    test: () => tx('Body fluid moves to the head in weightlessness. A blocked nose, a full face and a light headache are common in flight.'),
  },
  {
    id: 'spine_unloaded',
    title: tx('No load on the spine'),
    scope: 'flight',
    relation: 'section 4.4',
    evidence: 'weak',
    indicators: [],
    action: tx('Stretch in a curled position and keep the exercise plan.'),
    test: () => tx('Back pain is common in weightlessness, because the spine carries no load.'),
  },
]

export const CHECKS = new Map(CHECK_LIST.map((check) => [check.id, check]))

// The names of the symptoms that the app offers (web/src/symptoms.ts) or records from a check-up (rules.ts).
// Each name has a translation in locales/pt-BR/medical.ts.
const SYMPTOM_NAMES = new Set([
  'Headache', 'Dizziness', 'Blurred vision', 'Fatigue', 'Stuffy nose', 'Low mood',
  'Chest pain', 'Palpitations', 'Cough', 'Short of breath',
  'Nausea', 'Stomach pain', 'No appetite', 'Back pain',
  'Muscle pain', 'Numbness', 'Skin rash', 'Weakness', 'Joint pain',
  'Heat stress', 'Fever', 'Low blood sugar signs', 'High blood sugar signs', 'Dehydration signs', 'Stress',
])
// The name of a symptom for a person. The database stores the English name, and a known name gets a translation.
// A name that a crew member wrote in their own words stays as it is.
export const symptomText = (name: string) => (SYMPTOM_NAMES.has(name) ? tx(name) : name)

// The checks for each symptom, most important first. The keys are symptom names in lower case.
// The keys stay English: the database stores the English name of a symptom.
const SYMPTOM_CHECKS: Record<string, string[]> = {
  headache: ['co2_very_high', 'co2_high', 'co2_week', 'sleep_short', 'water_low', 'pressure_high', 'fever', 'glucose_low', 'stress_high', 'fluid_shift'],
  dizziness: ['pressure_low', 'water_low', 'glucose_low', 'cabin_hot', 'co2_very_high', 'energy_low', 'first_days'],
  'blurred vision': ['long_flight', 'glucose_high', 'pressure_high', 'air_dry'],
  fatigue: ['sleep_short', 'co2_very_high', 'co2_high', 'energy_low', 'fever', 'radiation_high', 'water_low', 'mood_low'],
  'stuffy nose': ['fluid_shift', 'air_dry', 'fever'],
  'low mood': ['sleep_short', 'stress_high', 'energy_low', 'co2_high', 'exercise_low'],
  'chest pain': ['heart_fast', 'pressure_high', 'fever', 'stress_high', 'co2_very_high', 'co2_high'],
  palpitations: ['heart_fast', 'cabin_hot', 'water_low', 'fever', 'stress_high', 'co2_very_high', 'co2_high', 'glucose_low', 'sleep_short'],
  cough: ['fever', 'air_dry'],
  'short of breath': ['co2_very_high', 'co2_high', 'heart_fast', 'fever'],
  nausea: ['co2_very_high', 'radiation_high', 'first_days', 'cabin_hot', 'glucose_low'],
  'stomach pain': ['energy_low', 'water_low', 'stress_high'],
  'no appetite': ['co2_very_high', 'mood_low', 'stress_high', 'cabin_hot', 'fever'],
  'back pain': ['spine_unloaded', 'exercise_low'],
  'muscle pain': ['exercise_low', 'water_low'],
  weakness: ['exercise_low', 'energy_low', 'glucose_low', 'sleep_short', 'fever'],
  'skin rash': ['air_dry', 'stress_high', 'radiation_high', 'fever'],
  'heat stress': ['cabin_hot', 'water_low', 'fever'],
  fever: ['fever', 'cabin_hot', 'sleep_short', 'stress_high'],
  'low blood sugar signs': ['glucose_low', 'energy_low'],
  'dehydration signs': ['water_low', 'cabin_hot', 'air_dry', 'pressure_low', 'heart_fast'],
  stress: ['stress_high', 'sleep_short', 'co2_week'],
  'high blood sugar signs': ['glucose_high', 'stress_high', 'fever'],
}

// The document marks these symptoms as an emergency (section 2.5).
const URGENT = new Set(['chest pain', 'short of breath'])
// "symptom" is the stored English name here, never a tx() token.
export const isUrgent = (symptom: string) => URGENT.has(symptom.trim().toLowerCase())
export const checksOfSymptom = (symptom: string) => SYMPTOM_CHECKS[symptom.trim().toLowerCase()] ?? []

export type Cause = Pick<Check, 'id' | 'title' | 'scope' | 'relation' | 'evidence' | 'indicators' | 'action'> & { detail: string }

// Runs some checks and returns the ones that the data supports.
export function findCauses(facts: Facts, checkIds: string[]): Cause[] {
  const causes: Cause[] = []
  for (const id of checkIds) {
    const check = CHECKS.get(id)
    const detail = check?.test(facts)
    if (!check || !detail) continue
    const { test: _test, ...rest } = check
    causes.push({ ...rest, detail })
  }
  return causes
}

export type Explanation = {
  urgent: boolean
  causes: Cause[]
  // The names of the other crew members with the same open symptom in the last 48 hours.
  others: string[]
}

const othersQuery = db.prepare(
  `SELECT DISTINCT crew.name AS name FROM symptoms JOIN crew ON crew.id = symptoms.crew_id
   WHERE symptoms.mission_id = ? AND lower(symptoms.name) = lower(?) AND symptoms.crew_id != ?
     AND symptoms.status = 'open' AND symptoms.hour > ?`,
)

// The possible causes of a symptom that a crew member reports now.
export function explainSymptom(missionId: string, crewId: number, symptom: string, hour: number): Explanation {
  return {
    urgent: isUrgent(symptom),
    causes: findCauses(factsFor(missionId, crewId, hour), checksOfSymptom(symptom)),
    others: othersQuery.all(missionId, symptom.trim(), crewId, hour - 48).map((row) => row.name as string),
  }
}

// The evidence of some causes as one numbered list: "(1) ... (2) ...".
export const numbered = (causes: Cause[]) => causes.map((cause, index) => `(${index + 1}) ${cause.detail}`).join(' ')

// The explanation as text for a notification. Each part is a full sentence, so the parts join with a space.
export function describeExplanation(explanation: Explanation): string {
  const parts: string[] = []
  if (explanation.urgent) parts.push(tx('This symptom can be an emergency. Tell the crew medical officer and the ground team now.'))
  if (explanation.causes.length) {
    parts.push(tx('Possible causes in the data: {list}', { list: numbered(explanation.causes) }))
    parts.push(tx('First step: {action}', { action: explanation.causes[0].action }))
  } else {
    parts.push(tx('The data of the last days shows no cause for this symptom. Ask the crew member how it started.'))
  }
  if (explanation.others.length === 1) {
    parts.push(tx('{name} also reports this symptom. Look for a cause that they share.', { name: explanation.others[0] }))
  } else if (explanation.others.length) {
    // "A and B and C".
    const names = explanation.others.reduce((first, second) => tx('{first} and {second}', { first, second }))
    parts.push(tx('{names} also report this symptom. Look for a cause that they share.', { names }))
  } else {
    parts.push(tx('No other crew member reports this symptom.'))
  }
  return parts.join(' ')
}

// Other values that can be part of the cause of a check-up, as one sentence. Empty if the data shows none.
export function describeContext(facts: Facts, checkIds: string[]): string {
  const causes = findCauses(facts, checkIds)
  if (!causes.length) return ''
  return ` ${tx('Other values that can be part of the cause: {list}', { list: numbered(causes) })}`
}
