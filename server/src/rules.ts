// The rules that start a check-up. A check-up is a question that the app asks a crew member
// when the data looks wrong. The crew member confirms or dismisses it.
import { baselineOf, describeContext, factsFor } from './causes.ts'
import { db } from './db.ts'
import { lowerFirst, tx } from './i18n.ts'
import { emit } from './monitor.ts'
import type { BodyPart } from './indicators.ts'

export type Rule = {
  id: string
  title: string
  question: string
  // What the crew member can do. The app shows it with the question.
  action: string
  // Who must know if the crew member confirms.
  escalate: 'crew_medical_officer' | 'flight_surgeon' | null
  // The symptom that the app records if the crew member confirms. The name stays plain English:
  // the database stores it and other code compares it. Use tx(name) to show it to a person.
  symptom: { bodyPart: BodyPart; name: string }
  // "cabin": the trigger is a cabin value, so all crew members get the question.
  // "person": the trigger is a value of one crew member.
  scope: 'cabin' | 'person'
  // The cause checks in causes.ts that the app runs when the rule starts a check-up.
  // The app adds what they find to the reason, so the crew member sees the context.
  context: string[]
  // Returns the reason for the check-up, or null if the data is fine.
  // The title, the question, the action and the reason are tx() tokens. See i18n.ts.
  test: (last: Last, crewSubject: string, baseline: Baseline) => string | null
}

// The newest values of one indicator, newest first.
type Last = (subject: string, indicator: string, count: number) => number[]

// The personal baseline of one indicator, or null if the mission has too few readings.
type Baseline = (subject: string, indicator: string) => number | null

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length
const all = (values: number[], count: number, check: (value: number) => boolean) =>
  values.length >= count && values.every(check)

export const RULES: Rule[] = [
  {
    id: 'co2_headache',
    scope: 'cabin',
    context: ['co2_week', 'sleep_short', 'water_low'],
    title: tx('High CO2 in the cabin'),
    question: tx('Do you have a headache?'),
    action: tx('Move to a module with better air flow. Tell the crew to check the CO2 removal system.'),
    escalate: 'crew_medical_officer',
    symptom: { bodyPart: 'head', name: 'Headache' },
    test: (last) => {
      const values = last('env', 'co2_partial_pressure', 3)
      if (values.length < 3 || mean(values) < 2.8 || mean(values) >= 4.5) return null
      return tx('Cabin CO2 was {value:2} mmHg on average in the last 3 hours. Crews report headaches from 2.8 mmHg.', { value: mean(values) })
    },
  },
  {
    id: 'co2_severe',
    scope: 'cabin',
    context: ['energy_low', 'sleep_short'],
    title: tx('Very high CO2 in the cabin'),
    question: tx('Do you feel very tired or sick in the stomach?'),
    action: tx('Leave this module now. The crew must repair the CO2 removal system and tell the ground team.'),
    escalate: 'flight_surgeon',
    symptom: { bodyPart: 'abdomen', name: 'Nausea' },
    test: (last) => {
      const values = last('env', 'co2_partial_pressure', 3)
      if (values.length < 3 || mean(values) < 4.5) return null
      return tx('Cabin CO2 was {value:2} mmHg on average in the last 3 hours. Fatigue and nausea occur above 4.5 mmHg.', { value: mean(values) })
    },
  },
  {
    id: 'radiation_high',
    scope: 'cabin',
    context: [],
    title: tx('High radiation dose'),
    question: tx('Do you feel nausea or unusual tiredness?'),
    action: tx('Stay in the area of the cabin with the most shielding until the dose falls.'),
    escalate: 'flight_surgeon',
    symptom: { bodyPart: 'abdomen', name: 'Nausea' },
    test: (last) => {
      const [value] = last('env', 'radiation_dose_rate', 1)
      if (value === undefined || value <= 0.5) return null
      return tx('The radiation dose was {value:2} mGy in the last day. The NASA record of this mission stays near 0.3 mGy each day.', { value })
    },
  },
  {
    id: 'cabin_hot',
    scope: 'cabin',
    context: ['water_low', 'fever', 'heart_fast'],
    title: tx('Hot cabin'),
    question: tx('Do you feel hot, thirsty or dizzy?'),
    action: tx('Drink water and lower the temperature setting of the cabin.'),
    escalate: null,
    symptom: { bodyPart: 'head', name: 'Heat stress' },
    test: (last) => {
      const values = last('env', 'cabin_temperature', 3)
      if (!all(values, 3, (value) => value > 27)) return null
      return tx('The cabin was above 27 °C for 3 hours. The health zone of NASA ends at 27 °C.')
    },
  },
  {
    id: 'heart_rate_high',
    scope: 'person',
    context: ['cabin_hot', 'co2_very_high', 'co2_high', 'fever', 'water_low', 'stress_high', 'sleep_short'],
    title: tx('Fast heart rate at rest'),
    question: tx('Do you feel chest pain or a pounding heart?'),
    action: tx('Rest for 10 minutes, drink water, then measure your blood pressure.'),
    escalate: 'flight_surgeon',
    symptom: { bodyPart: 'chest', name: 'Palpitations' },
    test: (last, crew) => {
      const values = last(crew, 'heart_rate', 3)
      if (!all(values, 3, (value) => value > 100)) return null
      return tx('Your heart rate at rest was above 100 bpm for 3 hours (now {value:0} bpm).', { value: values[0] })
    },
  },
  {
    id: 'heart_rate_low',
    scope: 'person',
    context: ['pressure_low', 'energy_low'],
    title: tx('Slow heart rate'),
    question: tx('Do you feel dizzy or faint?'),
    action: tx('Sit down and hold on to a handrail. Measure your blood pressure.'),
    escalate: 'crew_medical_officer',
    symptom: { bodyPart: 'head', name: 'Dizziness' },
    test: (last, crew) => {
      const values = last(crew, 'heart_rate', 3)
      if (!all(values, 3, (value) => value < 50)) return null
      return tx('Your heart rate was below 50 bpm for 3 hours (now {value:0} bpm).', { value: values[0] })
    },
  },
  {
    id: 'fever',
    scope: 'person',
    context: ['cabin_hot', 'heart_fast', 'stress_high', 'sleep_short'],
    title: tx('Fever'),
    question: tx('Do you have chills, a sore throat or a cough?'),
    action: tx('Rest, drink water, and measure your temperature again in 2 hours. Keep distance from the crew.'),
    escalate: 'crew_medical_officer',
    symptom: { bodyPart: 'head', name: 'Fever' },
    test: (last, crew, baseline) => {
      const [value] = last(crew, 'body_temperature', 1)
      if (value === undefined) return null
      // Body temperature at rest rises about 1 °C in long flights, so the personal baseline is the better limit.
      const usual = baseline(crew, 'body_temperature')
      if (usual === null ? value <= 38 : value < usual + 1) return null
      const above = usual === null ? '' : ` ${tx('That is {difference:1} °C above your usual value.', { difference: value - usual })}`
      return `${tx('Your body temperature is {value:1} °C.', { value })}${above} ${tx('The immune system is weaker in flight, so a fever needs attention.')}`
    },
  },
  {
    id: 'pressure_high',
    scope: 'person',
    context: ['stress_high', 'co2_high', 'sleep_short'],
    title: tx('High blood pressure'),
    question: tx('Do you have a headache or blurred vision?'),
    action: tx('Rest for 5 minutes and measure again. Do not do hard exercise today.'),
    escalate: 'flight_surgeon',
    symptom: { bodyPart: 'head', name: 'Blurred vision' },
    test: (last, crew) => {
      const [value] = last(crew, 'blood_pressure_systolic', 1)
      if (value === undefined || value <= 140) return null
      return tx('Your upper blood pressure is {value:0} mmHg. Fluid moves to the head in flight and can also change vision.', { value })
    },
  },
  {
    id: 'pressure_low',
    scope: 'person',
    context: ['water_low', 'energy_low', 'cabin_hot'],
    title: tx('Low blood pressure'),
    question: tx('Do you feel dizzy or weak?'),
    action: tx('Drink water with salt and eat. Measure again in 1 hour.'),
    escalate: 'crew_medical_officer',
    symptom: { bodyPart: 'head', name: 'Dizziness' },
    test: (last, crew) => {
      const [value] = last(crew, 'blood_pressure_systolic', 1)
      if (value === undefined || value >= 85) return null
      return tx('Your upper blood pressure is {value:0} mmHg. Low water or low food intake can cause this.', { value })
    },
  },
  {
    id: 'glucose_low',
    scope: 'person',
    context: ['energy_low', 'mood_low'],
    title: tx('Low blood sugar'),
    question: tx('Do you feel shaky, sweaty or confused?'),
    action: tx('Eat or drink something with sugar now. Measure again in 15 minutes.'),
    escalate: 'crew_medical_officer',
    symptom: { bodyPart: 'abdomen', name: 'Low blood sugar signs' },
    test: (last, crew) => {
      const [value] = last(crew, 'blood_glucose', 1)
      if (value === undefined || value >= 60) return null
      return tx('Your blood sugar is {value:0} mg/dL. A missed meal or a medicine can cause this.', { value })
    },
  },
  {
    id: 'glucose_high',
    scope: 'person',
    context: ['stress_high', 'fever', 'exercise_low'],
    title: tx('High blood sugar'),
    question: tx('Are you very thirsty, or do you urinate more than usual?'),
    action: tx('Drink water. Measure again tomorrow before food. Check your food log and your medicines.'),
    escalate: 'flight_surgeon',
    symptom: { bodyPart: 'abdomen', name: 'High blood sugar signs' },
    test: (last, crew) => {
      const [value] = last(crew, 'blood_glucose', 1)
      if (value === undefined || value <= 125) return null
      return tx('Your blood sugar before food is {value:0} mg/dL. The usual limit is 100.', { value })
    },
  },
  {
    id: 'sleep_debt',
    scope: 'person',
    context: ['co2_very_high', 'co2_high', 'co2_week', 'cabin_uncomfortable', 'stress_high'],
    title: tx('Not enough sleep'),
    question: tx('Do you feel too tired to work safely?'),
    action: tx('Ask the commander to move hard tasks. Avoid caffeine 6 hours before sleep and dim the lights early.'),
    escalate: 'crew_medical_officer',
    symptom: { bodyPart: 'head', name: 'Fatigue' },
    test: (last, crew) => {
      const values = last(crew, 'sleep_duration', 3)
      if (!all(values, 3, (value) => value < 5.5)) return null
      return tx('You slept less than 5.5 hours for 3 nights ({value:1} hours on average).', { value: mean(values) })
    },
  },
  {
    id: 'mood_low',
    scope: 'person',
    context: ['sleep_short', 'stress_high', 'energy_low', 'exercise_low'],
    title: tx('Low mood'),
    question: tx('Do you want to talk with the crew medical officer or the ground team?'),
    action: tx('Plan a call with family or friends, and keep your exercise and sleep times.'),
    escalate: 'flight_surgeon',
    symptom: { bodyPart: 'head', name: 'Low mood' },
    test: (last, crew) => {
      const values = last(crew, 'mood_score', 2)
      if (!all(values, 2, (value) => value <= 2)) return null
      return tx('You gave your mood a score of 2 or less for 2 days.')
    },
  },
  {
    id: 'co2_week',
    scope: 'cabin',
    context: ['co2_high', 'cabin_uncomfortable', 'stress_high'],
    title: tx('CO2 high for many days'),
    question: tx('Did you wake with a headache in the last days?'),
    action: tx('Check the air flow in your sleep area. Sleep in another place for one night and compare.'),
    escalate: 'crew_medical_officer',
    symptom: { bodyPart: 'head', name: 'Headache' },
    test: (last, crew) => {
      const [week] = last('env', 'co2_7day_average', 1)
      const nights = last(crew, 'sleep_duration', 2)
      if (week === undefined || week < 2.5 || !all(nights, 2, (value) => value < 6)) return null
      return tx('The 7-day average of cabin CO2 is {value:2} mmHg, and you slept less than 6 hours for 2 nights. The NASA target for this average is 2.5 mmHg or less.', { value: week })
    },
  },
  {
    id: 'nutrition_low',
    scope: 'person',
    context: ['glucose_low', 'mood_low', 'co2_very_high', 'cabin_hot', 'stress_high'],
    title: tx('Low food intake'),
    question: tx('Is your appetite low, or does food taste different?'),
    action: tx('Eat the planned menu and add an energy drink from the stock. Measure your blood sugar before food tomorrow.'),
    escalate: 'crew_medical_officer',
    symptom: { bodyPart: 'abdomen', name: 'No appetite' },
    test: (last, crew) => {
      const values = last(crew, 'energy_intake', 3)
      if (!all(values, 3, (value) => value < 70)) return null
      return tx('You ate less than 70% of your target for 3 days ({value:0}% on average). Low food intake lowers blood sugar, strength and mood.', { value: mean(values) })
    },
  },
  {
    id: 'water_low',
    scope: 'person',
    context: ['cabin_hot', 'air_dry', 'pressure_low', 'heart_fast'],
    title: tx('Low water intake'),
    question: tx('Is your urine dark, or do you have pain in the side of your lower back?'),
    action: tx('Drink 0.5 litres now, and 2.5 litres or more each day. Low water raises the risk of kidney stones in flight.'),
    escalate: 'crew_medical_officer',
    symptom: { bodyPart: 'abdomen', name: 'Dehydration signs' },
    test: (last, crew) => {
      const values = last(crew, 'water_intake', 2)
      if (!all(values, 2, (value) => value < 2)) return null
      return tx('You drank less than 2 litres for 2 days ({value:1} litres on average). The minimum is 2.5 litres.', { value: mean(values) })
    },
  },
  {
    id: 'exercise_missed',
    scope: 'person',
    context: ['mood_low', 'sleep_short', 'energy_low', 'fever'],
    title: tx('Missed exercise'),
    question: tx('Did pain or weakness stop your exercise?'),
    action: tx('Plan the next session at a time with less work. Tell the crew medical officer if pain is the reason.'),
    escalate: 'crew_medical_officer',
    symptom: { bodyPart: 'legs', name: 'Weakness' },
    test: (last, crew) => {
      const values = last(crew, 'exercise_minutes', 3)
      if (!all(values, 3, (value) => value < 60)) return null
      return tx('You did less than 60 minutes of exercise for 3 days ({value:0} minutes on average). The plan is 120 minutes. Bone and muscle loss is fast in weightlessness.', { value: mean(values) })
    },
  },
  {
    id: 'stress_long',
    scope: 'person',
    context: ['sleep_short', 'mood_low', 'co2_week'],
    title: tx('High stress for 3 days'),
    question: tx('Do you want to talk with the crew medical officer or the ground team?'),
    action: tx('Take the planned free time, plan a contact with family, and do your exercise session.'),
    escalate: 'crew_medical_officer',
    symptom: { bodyPart: 'head', name: 'Stress' },
    test: (last, crew) => {
      const values = last(crew, 'stress_score', 3)
      if (!all(values, 3, (value) => value >= 4)) return null
      return tx('You gave your stress a score of 4 or more for 3 days. Stress over days makes sleep worse and weakens the immune system.')
    },
  },
  {
    id: 'fatigue_high',
    scope: 'person',
    context: ['sleep_short', 'co2_very_high', 'co2_high', 'co2_week', 'energy_low', 'fever', 'radiation_high'],
    title: tx('High fatigue'),
    question: tx('Do you feel too tired to work safely?'),
    action: tx('Ask the commander to move hard tasks. Sleep the full period tonight.'),
    escalate: 'crew_medical_officer',
    symptom: { bodyPart: 'head', name: 'Fatigue' },
    test: (last, crew) => {
      const values = last(crew, 'fatigue_score', 2)
      if (!all(values, 2, (value) => value >= 4)) return null
      return tx('You gave your fatigue a score of 4 or more for 2 days.')
    },
  },
]

export const ruleById = new Map(RULES.map((rule) => [rule.id, rule]))

// The app asks the same question to the same crew member one time in 24 hours at most.
const QUIET_HOURS = 24

const lastValues = db.prepare(
  `SELECT value FROM readings
   WHERE mission_id = ? AND subject = ? AND indicator = ?
   ORDER BY hour DESC, id DESC LIMIT ?`,
)
const recentCheckup = db.prepare(
  `SELECT 1 FROM checkups
   WHERE mission_id = ? AND crew_id = ? AND rule_id = ? AND (status = 'pending' OR hour > ?) LIMIT 1`,
)
const openSymptom = db.prepare(
  `SELECT 1 FROM symptoms WHERE mission_id = ? AND crew_id = ? AND name = ? AND status = 'open' LIMIT 1`,
)
const insertCheckup = db.prepare(
  `INSERT INTO checkups (mission_id, crew_id, rule_id, reason, hour) VALUES (?, ?, ?, ?, ?)`,
)
const crewOf = db.prepare(`SELECT id, name FROM crew WHERE mission_id = ? ORDER BY id`)

// Checks all rules for all crew members. "hour" is the hour of the newest readings.
export function runRules(missionId: string, hour: number) {
  const last: Last = (subject, indicator, count) =>
    lastValues.all(missionId, subject, indicator, count).map((row) => row.value as number)
  const crew = crewOf.all(missionId) as { id: number; name: string }[]

  const baseline: Baseline = (subject, indicator) => baselineOf(missionId, subject, indicator, hour)

  for (const rule of RULES) {
    for (const member of crew) {
      const reason = rule.test(last, `crew:${member.id}`, baseline)
      if (!reason) continue
      if (recentCheckup.get(missionId, member.id, rule.id, hour - QUIET_HOURS)) continue
      if (openSymptom.get(missionId, member.id, rule.symptom.name)) continue
      // The reason names the trigger. The context names the other values that agree with a known cause.
      const context = describeContext(factsFor(missionId, member.id, hour), rule.context)
      insertCheckup.run(missionId, member.id, rule.id, reason + context, hour)
      emit(missionId, hour, 'system', 'checkup.asked', tx('Asked {name}: "{question}" Reason: {title}.', { name: member.name, question: rule.question, title: lowerFirst(rule.title) }))
    }
  }
}
