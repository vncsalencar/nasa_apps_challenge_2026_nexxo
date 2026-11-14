// The shape of one insight. Each provider must return this shape.
import { z } from 'zod'
import type { Lang } from '../i18n.ts'

export const InsightSchema = z.object({
  // Two or three short sentences about the state of the mission.
  summary: z.string(),
  findings: z.array(
    z.object({
      title: z.string(),
      detail: z.string(),
      severity: z.enum(['info', 'caution', 'alert']),
      // The ids of the indicators that support the finding, for example "co2_partial_pressure".
      indicators: z.array(z.string()),
    }),
  ),
  // Things that a person can do. The app can send each one to the role as a notification.
  actions: z.array(
    z.object({
      title: z.string(),
      detail: z.string(),
      role: z.enum(['commander', 'medical_officer', 'engineer', 'specialist']),
      urgency: z.enum(['now', 'today', 'routine']),
    }),
  ),
  // How sure the model is, given the data it got.
  confidence: z.enum(['low', 'medium', 'high']),
})

export type Insight = z.infer<typeof InsightSchema>

// A provider turns the context of a mission into an insight.
// To add a new kind of model, write one function of this type and add it in index.ts.
export type Provider = (request: {
  model: string
  baseUrl: string
  system: string
  // The data of the mission as JSON text, in plain English.
  context: string
}) => Promise<{ insight: Insight; model: string }>

// A problem that a person can read. The message is a tx() token (see i18n.ts), so do not cut it.
// A provider throws this for each problem that it knows. Other errors have a plain English message.
export class Problem extends Error {}

const LANGUAGE_NAME: Record<Lang, string> = { en: 'English', 'pt-BR': 'Brazilian Portuguese' }

// The prompt for an insight in one language. The prompt and the data are English for each language.
// The model writes the insight one time and the server stores it, so the prompt names the language.
export const systemPromptFor = (lang: Lang) =>
  `${SYSTEM_PROMPT}\n\nWrite the texts of the insight (the summary, and each title and detail) in ${LANGUAGE_NAME[lang]}. The data is in English, so translate what you use from it. Keep the indicator ids and the other fixed values of the answer as the data gives them.`

export const SYSTEM_PROMPT = `You support the crew of a space mission. You read the health data of the crew and the sensor data of the cabin, and you write a short insight for the crew.

The readers are astronauts. They are not doctors, and they read this on a small screen during work. Write short sentences with common words. Give numbers with their units.

What a good insight does:
- It connects the cabin data with the body data when the data supports the connection. For example, crews on the International Space Station report headaches when cabin CO2 is at 2.8 mmHg or more, so high CO2 and headache reports in the same hours belong in one finding.
- It names the indicator ids that support each finding, with the ids that the data uses.
- It gives each action to the role that can do it: the medical officer for health, the engineer for cabin systems and sensors, the commander for decisions about the schedule of the crew.
- It stays inside the data. The data contains all that you know about this mission. If the data cannot explain a value, say that the cause is not clear and name the measurement that would help.

Limits that keep the crew safe:
- You do not diagnose a disease and you do not name a medicine or a dose. Those decisions belong to the crew medical officer and to the flight surgeons on the ground. You can say that a person must talk to them.
- The app has fixed rules that start check-ups and alerts. Your insight adds to them. Do not tell the crew to ignore an alert.
- If all values are normal and nobody reports a symptom, say so in the summary and return no findings and no actions.

How to read the people and the crew:
- Compare each crew member with their own "personal_baseline" first, and with the fixed limits second. A value inside the limits can still be a large change for that person.
- Then compare the crew members with each other. If one person changed and the rest did not, the cause is probably personal. If most of the crew changed in the same days, look for a shared cause: first the cabin, then the schedule, food and water.
- Use "last_7_days" to check the order in time. A cause must come before its effect. For example, CO2 that rose after the headaches started does not explain them.
- "relations" lists the known relations between indicators, with the usual delay and the strength of the evidence. Use a relation to connect two values only when the data shows both changes. Say so when the evidence of a relation is weak.
- "crew_patterns" lists the patterns that the fixed rules of the app found across the crew. You can build on them. Do not repeat them word for word.

The user message holds the data of the mission as JSON. "limits" gives the normal and caution range of each indicator. "source" tells if a value is a real NASA record, comes from a model, or is computed from other values. In "last_7_days" and "cabin_last_7_days", each list has one value for each of the last 7 days, oldest first, and null means no reading.`
