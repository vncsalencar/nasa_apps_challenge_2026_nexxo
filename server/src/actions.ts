// The actions of a crew member. The API routes and the assistant both call these functions,
// so a tap and a spoken command do exactly the same thing.
import { describeExplanation, explainSymptom, type Explanation } from './causes.ts'
import { claim, finishClaim } from './claims.ts'
import { runCrewPatterns } from './crew.ts'
import { db, transaction } from './db.ts'
import { tx, txn } from './i18n.ts'
import { BODY_PART_WORD, type BodyPart } from './indicators.ts'
import { emit, notifySymptom } from './monitor.ts'
import { ruleById, type Rule } from './rules.ts'
import { crewOf, findMission } from './simulator.ts'

// The hour of the newest readings. Actions of people get this hour.
export const hourOf = (missionId: string) => findMission(missionId)!.sim_hour - 1
export const crewName = (missionId: string, crewId: number) =>
  crewOf(missionId).find((member) => member.id === crewId)?.name ?? tx('A crew member')

// A list of names in a sentence: "Mina and Jonas and Priya".
const listOf = (names: string[]) => names.reduce((list, name) => tx('{list} and {name}', { list, name }))

const insertSymptom = db.prepare(
  `INSERT INTO symptoms (mission_id, crew_id, body_part, name, hour, explanation) VALUES (?, ?, ?, ?, ?, ?)`,
)

// Records a symptom, looks in the data for possible causes, and tells the medical officers.
// "name" is the English name of the symptom, for example "Headache". The database keeps it.
// A text for a person shows its translation: tx(name).
export function reportSymptom(missionId: string, crewId: number, bodyPart: BodyPart, name: string, actor: string): Explanation {
  const hour = hourOf(missionId)
  const symptom = name.trim().slice(0, 60)
  return transaction(() => {
    // Look in the data for the possible causes of this symptom, and for other crew members with the same symptom.
    const explanation = explainSymptom(missionId, crewId, symptom, hour)
    insertSymptom.run(missionId, crewId, bodyPart, symptom, hour, JSON.stringify(explanation))
    emit(missionId, hour, actor, 'symptom.reported', tx('{name} reported the symptom "{symptom}" ({part}).', { name: crewName(missionId, crewId), symptom: tx(symptom), part: BODY_PART_WORD[bodyPart] }))
    notifySymptom(missionId, hour, crewId, symptom, describeExplanation(explanation), explanation.urgent ? 'flight_surgeon' : 'crew_medical_officer')
    runCrewPatterns(missionId, hour)
    return explanation
  })
}

// Answers an open check-up. "confirmed" also records the symptom of the rule and tells the
// people that the rule names. Returns the rule, or null if the check-up is not open.
export function answerCheckup(missionId: string, checkupId: number, answer: 'confirmed' | 'dismissed', actor: string): Rule | null {
  const checkup = db
    .prepare(`SELECT crew_id, rule_id, reason FROM checkups WHERE id = ? AND mission_id = ? AND status = 'pending'`)
    .get(checkupId, missionId) as { crew_id: number; rule_id: string; reason: string } | undefined
  const rule = checkup && ruleById.get(checkup.rule_id)
  if (!checkup || !rule) return null
  const hour = hourOf(missionId)
  transaction(() => {
    db.prepare(`UPDATE checkups SET status = ?, answered_hour = ? WHERE id = ?`).run(answer, hour, checkupId)
    const answered = { name: crewName(missionId, checkup.crew_id), question: rule.question }
    emit(missionId, hour, actor, 'checkup.answered', answer === 'confirmed' ? tx('{name} answered "yes" to "{question}"', answered) : tx('{name} answered "no" to "{question}"', answered))
    if (answer === 'confirmed') {
      const explanation = explainSymptom(missionId, checkup.crew_id, rule.symptom.name, hour)
      insertSymptom.run(missionId, checkup.crew_id, rule.symptom.bodyPart, rule.symptom.name, hour, JSON.stringify(explanation))
      const count = explanation.others.length
      const others = count ? ` ${txn(count, '{names} also reports this symptom.', '{names} also report this symptom.', { names: listOf(explanation.others) })}` : ''
      // "What to do:" is a key of its own. The web app looks for this marker in the text.
      notifySymptom(missionId, hour, checkup.crew_id, rule.symptom.name, `${checkup.reason}${others} ${tx('What to do:')} ${rule.action}`, rule.escalate)
    }
    // An answer can complete a crew pattern, for example one "yes" and three "no" for the same cabin value.
    runCrewPatterns(missionId, hour)
  })
  return rule
}

// "I am on it": the crew member claims a problem. Returns false if this person already works on it.
export function startClaim(missionId: string, crewId: number, topic: string, label: string, actor: string): boolean {
  const hour = hourOf(missionId)
  if (!claim(missionId, topic, crewId, hour)) return false
  emit(missionId, hour, actor, 'claim.started', tx('{name} said "I am on it" for: {label}.', { name: crewName(missionId, crewId), label }))
  return true
}

export function endClaim(missionId: string, claimId: number, crewId: number, actor: string) {
  const hour = hourOf(missionId)
  finishClaim(missionId, claimId, hour)
  emit(missionId, hour, actor, 'claim.done', tx('{name} finished the work on a problem.', { name: crewName(missionId, crewId) }))
}

export function markRead(missionId: string, notificationId: number) {
  db.prepare(`UPDATE notifications SET read_hour = ? WHERE id = ? AND mission_id = ? AND read_hour IS NULL`).run(hourOf(missionId), notificationId, missionId)
}

// Marks all notifications of one crew member as read. Returns how many.
export function markAllRead(missionId: string, crewId: number): number {
  return Number(
    db.prepare(`UPDATE notifications SET read_hour = ? WHERE mission_id = ? AND crew_id = ? AND read_hour IS NULL`).run(hourOf(missionId), missionId, crewId).changes,
  )
}
