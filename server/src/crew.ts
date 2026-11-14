// Patterns across the crew. The rules in rules.ts look at one crew member at a time.
// This file compares the crew members with each other and with the cabin:
// - The same symptom in two or more crew members points to a cause that they share.
// - A change in one crew member only points to a personal cause.
// - A change in the whole crew points to the cabin, the schedule, or the team.
import { CHECKS, checksOfSymptom, factsFor, findCauses, isUrgent, numbered, symptomText, type Facts } from './causes.ts'
import { db } from './db.ts'
import { lowerFirst, tx, txn } from './i18n.ts'
import { indicatorById } from './indicators.ts'
import { notify, type RoleId } from './monitor.ts'
import { RULES } from './rules.ts'

export type Finding = {
  // Stable for the same pattern and the same people, so the app sends one notification for it.
  id: string
  // "crew": two or more crew members. "individual": one crew member against the rest.
  scope: 'crew' | 'individual'
  // 1 is caution, 2 is alert.
  severity: 1 | 2
  title: string
  detail: string
  action: string
  crewIds: number[]
  indicators: string[]
  // Who gets the notification. An individual finding also goes to the crew member.
  roles: RoleId[]
  ground: boolean
}

type Member = { id: number; name: string }
const crewQuery = db.prepare(`SELECT id, name FROM crew WHERE mission_id = ? ORDER BY id`)
const openSymptoms = db.prepare(
  `SELECT crew_id AS crewId, name FROM symptoms WHERE mission_id = ? AND status = 'open' AND hour > ? ORDER BY id`,
)
const answeredCheckups = db.prepare(
  `SELECT crew_id AS crewId, rule_id AS ruleId, status FROM checkups
   WHERE mission_id = ? AND hour > ? AND status != 'pending' ORDER BY id`,
)

const SYMPTOM_WINDOW_HOURS = 48
// The cabin checks that can explain a change in the whole crew.
const CABIN_CHECKS = [...CHECKS.values()].filter((check) => check.scope === 'cabin').map((check) => check.id)
const INFECTION_SIGNS = new Set(['fever', 'cough'])

// The daily indicators that the app compares across the crew.
// "gap": how far one crew member must move from the personal baseline, more than the rest of the crew, to count.
// "trend": how far the mean of the crew must move from its baseline to count.
// The gaps are about 2.5 times the usual day-to-day spread of a 3-day mean, so chance gives few findings.
// "words": what the crew member does, for the title: "{name} {words} than usual" and "The whole crew {words} than usual".
const COMPARED: { id: string; worse: 'low' | 'high'; gap: number; trend: number; words: string }[] = [
  { id: 'sleep_duration', worse: 'low', gap: 1.2, trend: 0.8, words: tx('sleeps less') },
  { id: 'mood_score', worse: 'low', gap: 1.5, trend: 0.8, words: tx('has a lower mood') },
  { id: 'stress_score', worse: 'high', gap: 1.3, trend: 0.8, words: tx('has more stress') },
  { id: 'fatigue_score', worse: 'high', gap: 1.5, trend: 0.8, words: tx('is more tired') },
  { id: 'energy_intake', worse: 'low', gap: 15, trend: 12, words: tx('eats less') },
  { id: 'water_intake', worse: 'low', gap: 0.6, trend: 0.5, words: tx('drinks less') },
  { id: 'exercise_minutes', worse: 'low', gap: 30, trend: 25, words: tx('exercises less') },
]

// "A", "A and B", "A, B and C".
const list = (names: string[]) =>
  names.length <= 1 ? names.join('') : tx('{list} and {last}', { list: names.slice(0, -1).join(', '), last: names[names.length - 1] })
// A value with the unit of its indicator and 1 decimal or more, for example "4.6 h". The unit can be a tx() token.
const show = (indicator: string, value: number) => {
  const { decimals, unit } = indicatorById.get(indicator)!
  return tx(decimals >= 2 ? '{value:2} {unit}' : '{value:1} {unit}', { value, unit })
}

export function crewFindings(missionId: string, hour: number): Finding[] {
  const crew = crewQuery.all(missionId) as Member[]
  if (crew.length < 2) return []
  const facts = new Map<number, Facts>(crew.map((member) => [member.id, factsFor(missionId, member.id, hour)]))
  const nameOf = (id: number) => crew.find((member) => member.id === id)?.name ?? tx('crew {id}', { id })
  const findings: Finding[] = []

  // 1. The same symptom in two or more crew members. The database stores the English name of a symptom.
  const bySymptom = new Map<string, { name: string; crewIds: Set<number> }>()
  for (const row of openSymptoms.all(missionId, hour - SYMPTOM_WINDOW_HOURS) as { crewId: number; name: string }[]) {
    const key = row.name.trim().toLowerCase()
    if (!bySymptom.has(key)) bySymptom.set(key, { name: row.name, crewIds: new Set() })
    bySymptom.get(key)!.crewIds.add(row.crewId)
  }
  for (const [key, group] of bySymptom) {
    const ids = [...group.crewIds].filter((id) => facts.has(id))
    if (ids.length < 2) continue
    // A cause counts as shared when the data of every crew member with the symptom supports it.
    const causes = ids.map((id) => findCauses(facts.get(id)!, checksOfSymptom(key)))
    // A "flight" cause is true for every crew member on every day, so it does not explain why these people have the symptom now.
    const shared = causes[0].filter((cause) => cause.scope !== 'flight' && causes.every((own) => own.some((other) => other.id === cause.id)))
    const cabin = shared.some((cause) => cause.scope === 'cabin')
    const infection = INFECTION_SIGNS.has(key)
    const severe = isUrgent(key) || infection || ids.length >= 3
    const sharedList = shared
      .map((cause, index) => `(${index + 1}) ${cause.scope === 'person' ? tx('{cause} for each of them.', { cause: lowerFirst(cause.title) }) : cause.detail}`)
      .join(' ')
    const sharedText = shared.length
      ? tx('They share: {list}', { list: sharedList })
      : tx('The data shows no cause that they share. Ask what they had in common: food, water, work place and sleep place.')
    // The name of the symptom for a person. The key and the id of the finding keep the English name.
    const symptom = symptomText(group.name)
    findings.push({
      id: `symptom:${key}:${ids.join('-')}`,
      scope: 'crew',
      severity: severe ? 2 : 1,
      title: tx('{count} of {total} crew members report: {symptom}', { count: ids.length, total: crew.length, symptom }),
      detail: `${tx('{names} report "{symptom}" in the last {hours} hours.', { names: list(ids.map(nameOf)), symptom, hours: SYMPTOM_WINDOW_HOURS })} ${sharedText}${infection ? ` ${tx('The same sign of infection in two people can mean that an infection spreads in the cabin.')}` : ''}`,
      action: infection
        ? tx('Keep these crew members apart from the rest, clean hands and surfaces, and tell the flight surgeons.')
        : shared.length
          ? shared[0].action
          : tx('The crew medical officer talks with each of them and compares the last 2 days.'),
      crewIds: ids,
      indicators: [...new Set(shared.flatMap((cause) => cause.indicators))],
      roles: cabin ? ['medical_officer', 'commander', 'engineer'] : ['medical_officer', 'commander'],
      ground: severe,
    })
  }

  // 2. A fever in two or more crew members, with or without a symptom report.
  const withFever = crew.filter((member) => findCauses(facts.get(member.id)!, ['fever']).length > 0)
  if (withFever.length >= 2) {
    findings.push({
      id: `fever:${withFever.map((member) => member.id).join('-')}`,
      scope: 'crew',
      severity: 2,
      title: tx('{count} crew members have a raised body temperature', { count: withFever.length }),
      detail: `${list(withFever.map((member) => `${member.name} (${show('body_temperature', facts.get(member.id)!.value('body_temperature')!)})`))}. ${tx('A fever in more than one person can mean that an infection spreads in the closed cabin.')}${findCauses(facts.get(withFever[0].id)!, ['cabin_hot']).length ? ` ${tx('The cabin is also hot, and heat alone can raise body temperature. Measure again after 30 minutes in a cooler place.')}` : ''}`,
      action: tx('Keep these crew members apart from the rest, clean hands and surfaces, and tell the flight surgeons.'),
      crewIds: withFever.map((member) => member.id),
      indicators: ['body_temperature'],
      roles: ['medical_officer', 'commander'],
      ground: true,
    })
  }

  // 3 and 4. Each crew member against the personal baseline, and then against the rest of the crew.
  type Move = { member: Member; now: number; usual: number; move: number }
  const mean = (entries: Move[], key: 'now' | 'usual' | 'move') => entries.reduce((sum, entry) => sum + entry[key], 0) / entries.length
  const trends: { compared: (typeof COMPARED)[number]; moves: Move[] }[] = []
  const outliers: { compared: (typeof COMPARED)[number]; entry: Move }[] = []
  for (const compared of COMPARED) {
    const sign = compared.worse === 'low' ? -1 : 1
    // How far each crew member moved in the bad direction. A positive number is worse than usual.
    const moves: Move[] = crew.flatMap((member) => {
      const now = facts.get(member.id)!.mean(compared.id, 3)
      const usual = facts.get(member.id)!.baseline(compared.id)
      return now === undefined || usual === null ? [] : [{ member, now, usual, move: (now - usual) * sign }]
    })
    if (moves.length < 2) continue
    // The whole crew moved: the mean moved, and at least three quarters of the crew moved half as far.
    const movedTogether = moves.filter((entry) => entry.move >= compared.trend / 2).length >= Math.ceil(moves.length * 0.75)
    if (mean(moves, 'move') >= compared.trend && movedTogether) {
      trends.push({ compared, moves })
      continue
    }
    // One crew member moved, and the rest did not.
    if (moves.length < 3) continue
    for (const entry of moves) {
      const rest = moves.filter((other) => other !== entry)
      if (entry.move - mean(rest, 'move') >= compared.gap && entry.move >= compared.gap * 0.75) outliers.push({ compared, entry })
    }
  }

  if (trends.length) {
    // The cabin is the same for all crew members, so the facts of any crew member give the cabin causes.
    const cabinCauses = findCauses(facts.get(crew[0].id)!, CABIN_CHECKS)
    const lines = trends.map(({ compared, moves }) =>
      tx('"{label}": {now} on average in the last 3 days, against the usual {usual}.', {
        label: indicatorById.get(compared.id)!.label,
        now: show(compared.id, mean(moves, 'now')),
        usual: show(compared.id, mean(moves, 'usual')),
      }),
    )
    findings.push({
      id: `trend:${trends.map(({ compared }) => compared.id).join('+')}`,
      scope: 'crew',
      severity: 1,
      title: tx('The whole crew {changes} than usual', { changes: list(trends.map(({ compared }) => compared.words)) }),
      detail: `${lines.join(' ')} ${cabinCauses.length ? tx('Possible cause in the cabin: {list}', { list: numbered(cabinCauses) }) : tx('The cabin data shows no cause. Check the work schedule, the sleep schedule, and how the team works together.')}`,
      action: cabinCauses.length ? cabinCauses[0].action : tx('The commander looks at the schedule of the last days with the crew and with the ground team.'),
      crewIds: crew.map((member) => member.id),
      indicators: [...new Set([...trends.map(({ compared }) => compared.id), ...cabinCauses.flatMap((cause) => cause.indicators)])],
      roles: cabinCauses.length ? ['commander', 'medical_officer', 'engineer'] : ['commander', 'medical_officer'],
      ground: false,
    })
  }
  for (const { compared, entry } of outliers) {
    // If the whole crew changed in another indicator, the cause is probably the same, and this crew member reacts more to it.
    const why = trends.length
      ? tx('The rest of the crew changed less in this indicator. But the whole crew changed in other indicators in the same days. So the cause is probably the same for all, and this crew member reacts more to it.')
      : tx('The rest of the crew stayed near the usual values, and the cabin is the same for all. So the cause is probably personal: pain, illness, workload, worry, or the sleep place.')
    findings.push({
      id: `outlier:${compared.id}:${entry.member.id}`,
      scope: 'individual',
      severity: 1,
      title: trends.length
        ? tx('{name} {change} than usual, more than the rest of the crew', { name: entry.member.name, change: compared.words })
        : tx('{name} {change} than usual, and the rest of the crew does not', { name: entry.member.name, change: compared.words }),
      detail: `${tx('"{label}" of {name} is {now} on average in the last 3 days. The usual value of this crew member is {usual}.', {
        label: indicatorById.get(compared.id)!.label,
        name: entry.member.name,
        now: show(compared.id, entry.now),
        usual: show(compared.id, entry.usual),
      })} ${why}`,
      action: tx('The crew medical officer talks with this crew member in private.'),
      crewIds: [entry.member.id],
      indicators: [compared.id],
      roles: ['medical_officer'],
      ground: false,
    })
  }

  // 5. A cabin check-up that one crew member confirmed and the others dismissed.
  const cabinRules = new Map(RULES.filter((rule) => rule.scope === 'cabin').map((rule) => [rule.id, rule]))
  const answers = new Map<string, { confirmed: Set<number>; dismissed: Set<number> }>()
  for (const row of answeredCheckups.all(missionId, hour - SYMPTOM_WINDOW_HOURS) as { crewId: number; ruleId: string; status: 'confirmed' | 'dismissed' }[]) {
    if (!cabinRules.has(row.ruleId)) continue
    if (!answers.has(row.ruleId)) answers.set(row.ruleId, { confirmed: new Set(), dismissed: new Set() })
    answers.get(row.ruleId)![row.status].add(row.crewId)
  }
  for (const [ruleId, answer] of answers) {
    if (answer.confirmed.size !== 1 || answer.dismissed.size < 1) continue
    const rule = cabinRules.get(ruleId)!
    const [crewId] = answer.confirmed
    findings.push({
      id: `one-of-crew:${ruleId}:${crewId}`,
      scope: 'individual',
      severity: 1,
      title: tx('Only {name} has symptoms from: {title}', { name: nameOf(crewId), title: lowerFirst(rule.title) }),
      detail: `${txn(
        answer.dismissed.size,
        '{name} answered "yes" to "{question}" {count} other crew member answered "no".',
        '{name} answered "yes" to "{question}" {count} other crew members answered "no".',
        { name: nameOf(crewId), question: rule.question },
      )} ${tx('The cabin value is the same for all. So this crew member reacts more to it, or works or sleeps in a place where the value is worse than at the sensor.')}`,
      action: tx('Ask {name} where the symptom started and where they sleep. Measure the cabin value in that place.', { name: nameOf(crewId) }),
      crewIds: [crewId],
      indicators: [],
      roles: ['medical_officer', 'engineer'],
      ground: false,
    })
  }

  return findings.sort((a, b) => b.severity - a.severity)
}

// Sends a notification for each new finding. The quiet period in monitor.ts stops repeats.
export function runCrewPatterns(missionId: string, hour: number) {
  for (const finding of crewFindings(missionId, hour)) {
    notify(
      missionId,
      hour,
      { roles: finding.roles, crewIds: finding.scope === 'individual' ? finding.crewIds : [], ground: finding.ground },
      { severity: finding.severity, title: finding.title, body: `${finding.detail} ${tx('What to do: {action}', { action: finding.action })}`, topic: `finding:${finding.id}` },
    )
  }
}
