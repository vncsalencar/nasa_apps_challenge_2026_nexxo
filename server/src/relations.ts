// The relations between indicators that the server uses.
// The ids R01 to R62 come from docs/health-indicator-map.md, section 5.1.
// The ids T1 to T7 are team choices from the cause tables in section 3.3 of that document.
//
// Three parts of the server read this file:
// - The model of the crew vitals (dataset.ts) uses the numbers in MODEL.
// - The cause checks (causes.ts) name the relation that supports each cause.
// - The language model gets the table as context (insights/index.ts).
//
// "delay" and "model" are tx() tokens (see i18n.ts). The catalog route renders them for the reader.
import { tx } from './i18n.ts'

// The numbers of the model. They are team choices for the prototype. No source gives them.
export const MODEL = {
  // Sleep: hours lost for each mmHg of night CO2 above 2.5 mmHg.
  sleepPerCo2: 0.9,
  co2SleepFrom: 2.5,
  // Sleep: hours lost for each °C of night cabin temperature outside 20 to 25 °C.
  sleepPerDegree: 0.25,
  // Sleep: hours lost for each point of stress above 3 the day before.
  sleepPerStress: 0.3,
  // Stress: points for each hour of sleep below 6.
  stressPerSleepHour: 0.6,
  // Fatigue: points for each hour of sleep below 6.1 (the mean on the station).
  fatiguePerSleepHour: 0.8,
  // Fatigue: points when the 24-hour mean of CO2 is above 4.5 mmHg.
  fatigueAtHighCo2: 1.5,
  // Mood: points lost for each hour of sleep below 6.1.
  moodPerSleepHour: 0.6,
  // Mood: points lost for each point of stress above 3.
  moodPerStress: 0.4,
  // Mood: points lost for each % of food intake below 80%.
  moodPerEnergy: 0.02,
  // Food intake: % lost when the 24-hour mean of CO2 is above 4.5 mmHg (nausea).
  energyAtHighCo2: 15,
  // Food intake: % lost for each °C of cabin temperature above 27 °C.
  energyPerDegree: 3,
  // Food intake: % lost when mood was 2 or less the day before.
  energyAtLowMood: 8,
  // Exercise: minutes lost when mood was 2 or less the day before.
  exerciseAtLowMood: 30,
  // Exercise: minutes lost for each point of fatigue above 3.
  exercisePerFatigue: 20,
  // Blood sugar: mg/dL lost for each % of food intake below 85%.
  glucosePerEnergy: 0.3,
  // Blood sugar: mg/dL added for each point of stress above 3.
  glucosePerStress: 3,
  // Blood pressure, upper: mmHg lost for each litre of water below 2.2 litres.
  pressurePerWater: 8,
  // Blood pressure, upper: mmHg added for each point of stress above 3.
  pressurePerStress: 4,
  // Body temperature: °C added for each °C of cabin temperature above 27 °C.
  bodyPerCabinDegree: 0.1,
  // Heart rate: bpm added for each °C of cabin temperature above 25 °C.
  heartPerCabinDegree: 2,
  // Heart rate: bpm added for each mmHg of CO2 above 3 mmHg.
  heartPerCo2: 3,
  // Heart rate: bpm added for each °C of body temperature above the usual value of the person plus 0.4 °C.
  heartPerFeverDegree: 10,
  // Heart rate: bpm added for each litre of water below 2.2 litres.
  heartPerWater: 6,
  // Heart rate: bpm added for each point of stress above 3.
  heartPerStress: 2,
}

export type Evidence = 'strong' | 'medium' | 'weak'

export type Relation = {
  id: string
  cause: string
  effect: string
  // "same": the effect rises when the cause rises. "opposite": the effect falls when the cause rises.
  direction: 'same' | 'opposite'
  delay: string
  // "weak" also covers the relations that the document marks as "team guess".
  evidence: Evidence
  // What the model of the vitals does with this relation. null means that the model does not use it.
  model: string | null
}

const M = MODEL
// The count of decimals after each name must fit the number in MODEL: {value:1} prints 0.9 in
// English and 0,9 in Portuguese. A whole number needs no count.

export const RELATIONS: Relation[] = [
  { id: 'R01', cause: 'co2_partial_pressure', effect: 'symptom.headache', direction: 'same', delay: tx('hours to days'), evidence: 'strong', model: null },
  { id: 'R02', cause: 'co2_partial_pressure', effect: 'fatigue_score', direction: 'same', delay: tx('hours'), evidence: 'strong', model: tx('Fatigue rises {value:1} points when the 24-hour mean of CO2 is above 4.5 mmHg.', { value: M.fatigueAtHighCo2 }) },
  { id: 'R03', cause: 'co2_partial_pressure', effect: 'symptom.nausea', direction: 'same', delay: tx('hours'), evidence: 'strong', model: tx('Food intake falls {value}% when the 24-hour mean of CO2 is above 4.5 mmHg.', { value: M.energyAtHighCo2 }) },
  { id: 'R04', cause: 'co2_partial_pressure', effect: 'heart_rate', direction: 'same', delay: tx('minutes to hours'), evidence: 'weak', model: tx('Heart rate rises {value} bpm for each mmHg of CO2 above 3 mmHg.', { value: M.heartPerCo2 }) },
  { id: 'R06', cause: 'co2_partial_pressure', effect: 'sleep_duration', direction: 'opposite', delay: tx('same night'), evidence: 'weak', model: tx('Sleep falls {value:1} hours for each mmHg of night CO2 above {limit:1} mmHg.', { value: M.sleepPerCo2, limit: M.co2SleepFrom }) },
  { id: 'R10', cause: 'sleep_duration', effect: 'mood_score', direction: 'same', delay: tx('next day'), evidence: 'medium', model: tx('Mood falls {value:1} points for each hour of sleep below 6.1 hours.', { value: M.moodPerSleepHour }) },
  { id: 'R11', cause: 'sleep_duration', effect: 'fatigue_score', direction: 'opposite', delay: tx('next day'), evidence: 'medium', model: tx('Fatigue rises {value:1} points for each hour of sleep below 6.1 hours.', { value: M.fatiguePerSleepHour }) },
  { id: 'R19', cause: 'cabin_temperature', effect: 'sleep_duration', direction: 'opposite', delay: tx('same night'), evidence: 'weak', model: tx('Sleep falls {value:2} hours for each °C of night cabin temperature outside 20 to 25 °C.', { value: M.sleepPerDegree }) },
  { id: 'R20', cause: 'cabin_temperature', effect: 'body_temperature', direction: 'same', delay: tx('hours'), evidence: 'medium', model: tx('Body temperature rises {value:1} °C for each °C of cabin temperature above 27 °C.', { value: M.bodyPerCabinDegree }) },
  { id: 'R21', cause: 'cabin_temperature', effect: 'heart_rate', direction: 'same', delay: tx('minutes to hours'), evidence: 'weak', model: tx('Heart rate rises {value} bpm for each °C of cabin temperature above 25 °C.', { value: M.heartPerCabinDegree }) },
  { id: 'R22', cause: 'cabin_humidity', effect: 'symptom.skin_rash', direction: 'opposite', delay: tx('days'), evidence: 'medium', model: null },
  { id: 'R29', cause: 'radiation_dose_rate', effect: 'radiation_dose_cumulative', direction: 'same', delay: tx('at once (it is the sum)'), evidence: 'strong', model: tx('The server adds all daily doses of the mission.') },
  { id: 'R30', cause: 'radiation_dose_rate', effect: 'symptom.nausea', direction: 'same', delay: tx('hours'), evidence: 'medium', model: null },
  { id: 'R32', cause: 'mission_day', effect: 'symptom.nausea', direction: 'opposite', delay: tx('the first 2 to 4 days'), evidence: 'strong', model: null },
  { id: 'R34', cause: 'mission_day', effect: 'symptom.blurred_vision', direction: 'same', delay: tx('months'), evidence: 'strong', model: null },
  { id: 'R35', cause: 'mission_day', effect: 'symptom.congestion', direction: 'same', delay: tx('hours'), evidence: 'medium', model: null },
  { id: 'R40', cause: 'exercise_minutes', effect: 'symptom.muscle_weakness', direction: 'opposite', delay: tx('weeks'), evidence: 'strong', model: null },
  { id: 'R50', cause: 'water_intake', effect: 'heart_rate', direction: 'opposite', delay: tx('hours'), evidence: 'weak', model: tx('Heart rate rises {value} bpm for each litre of water below 2.2 litres.', { value: M.heartPerWater }) },
  { id: 'R52', cause: 'energy_intake', effect: 'blood_glucose', direction: 'same', delay: tx('hours'), evidence: 'strong', model: tx('Blood sugar falls {value:1} mg/dL for each % of food intake below 85%.', { value: M.glucosePerEnergy }) },
  { id: 'R53', cause: 'energy_intake', effect: 'mood_score', direction: 'same', delay: tx('days'), evidence: 'weak', model: tx('Mood falls {value:2} points for each % of food intake below 80%.', { value: M.moodPerEnergy }) },
  { id: 'R56', cause: 'stress_score', effect: 'symptom.skin_rash', direction: 'same', delay: tx('days to weeks'), evidence: 'medium', model: null },
  { id: 'R62', cause: 'mood_score', effect: 'exercise_minutes', direction: 'same', delay: tx('days'), evidence: 'weak', model: tx('Exercise falls {value} minutes when mood was 2 or less the day before.', { value: M.exerciseAtLowMood }) },
  { id: 'T1', cause: 'sleep_duration', effect: 'stress_score', direction: 'opposite', delay: tx('next day'), evidence: 'weak', model: tx('Stress rises {value:1} points for each hour of sleep below 6 hours.', { value: M.stressPerSleepHour }) },
  { id: 'T2', cause: 'stress_score', effect: 'blood_pressure_systolic', direction: 'same', delay: tx('hours'), evidence: 'weak', model: tx('Upper blood pressure rises {value} mmHg for each point of stress above 3.', { value: M.pressurePerStress }) },
  { id: 'T3', cause: 'body_temperature', effect: 'heart_rate', direction: 'same', delay: tx('hours'), evidence: 'weak', model: tx('Heart rate rises {value} bpm for each °C of fever.', { value: M.heartPerFeverDegree }) },
  { id: 'T4', cause: 'water_intake', effect: 'blood_pressure_systolic', direction: 'same', delay: tx('hours'), evidence: 'weak', model: tx('Upper blood pressure falls {value} mmHg for each litre of water below 2.2 litres.', { value: M.pressurePerWater }) },
  { id: 'T5', cause: 'stress_score', effect: 'blood_glucose', direction: 'same', delay: tx('hours'), evidence: 'weak', model: tx('Blood sugar rises {value} mg/dL for each point of stress above 3.', { value: M.glucosePerStress }) },
  { id: 'T6', cause: 'stress_score', effect: 'mood_score', direction: 'opposite', delay: tx('same day'), evidence: 'weak', model: tx('Mood falls {value:1} points for each point of stress above 3.', { value: M.moodPerStress }) },
  { id: 'T7', cause: 'fatigue_score', effect: 'exercise_minutes', direction: 'opposite', delay: tx('same day'), evidence: 'weak', model: tx('Exercise falls {value} minutes for each point of fatigue above 3.', { value: M.exercisePerFatigue }) },
]
