import type { BodyPart } from './api.ts'
import { t } from './i18n.ts'

// The symptoms that a crew member can report on each part of the body.
// The names are identifiers: the server stores the English name and looks a symptom up by it.
// So a page sends the English name to the server and shows symptomLabel(name) to the person.
export const SYMPTOM_OPTIONS: Record<BodyPart, string[]> = {
  head: ['Headache', 'Dizziness', 'Blurred vision', 'Fatigue', 'Stuffy nose', 'Low mood'],
  chest: ['Chest pain', 'Palpitations', 'Cough', 'Short of breath'],
  abdomen: ['Nausea', 'Stomach pain', 'No appetite', 'Back pain'],
  arms: ['Muscle pain', 'Numbness', 'Skin rash'],
  legs: ['Muscle pain', 'Weakness', 'Joint pain'],
}

// The English names of the parts of the body. Show bodyPartLabel(part) to the person.
export const BODY_PART_LABEL: Record<BodyPart, string> = { head: 'Head', chest: 'Chest', abdomen: 'Abdomen', arms: 'Arms', legs: 'Legs' }

// The name of a symptom in the language of the page. The translations are in locales/<language>/shared.ts.
export function symptomLabel(name: string) {
  return t(name)
}
// The name of a part of the body in the language of the page.
export function bodyPartLabel(part: BodyPart) {
  return t(BODY_PART_LABEL[part])
}
