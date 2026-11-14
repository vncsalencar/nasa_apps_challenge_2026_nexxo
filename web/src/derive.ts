// Turns the state of a mission into what one crew member must know and do now.
import { worst, type Catalog, type Checkup, type Indicator, type Reading, type Rule, type Snapshot, type Status } from './api.ts'
import { fmt, t } from './i18n.ts'

// What to do when a value is above or below its normal range. The texts come from the server catalog.
export function adviceFor(indicator: Indicator, value: number): string {
  const [low, high] = indicator.normal
  const side = high !== null && value > high ? 'high' : low !== null && value < low ? 'low' : null
  return (side && indicator.advice?.[side]) || t('Measure again later today.')
}

export type Item = {
  key: string
  status: 'caution' | 'alert'
  // An identifier. Show t(item.where) to the person.
  where: 'Body' | 'Cabin' | 'Crew'
  label: string
  value?: string
  detail?: string
  action: string
  indicator?: Indicator
  reading?: Reading
}

export type Situation = ReturnType<typeof situation>

export function situation(snapshot: Snapshot, catalog: Catalog, crewId: number) {
  const subject = `crew:${crewId}`
  const member = snapshot.crew.find((candidate) => candidate.id === crewId)
  const vitals = catalog.indicators.filter((indicator) => indicator.kind === 'vital')
  const cabin = catalog.indicators.filter((indicator) => indicator.kind === 'environment')
  const latest = (who: string, indicator: string) =>
    snapshot.latest.find((reading) => reading.subject === who && reading.indicator === indicator)
  const openSymptoms = snapshot.symptoms.filter((symptom) => symptom.status === 'open')
  const mySymptoms = openSymptoms.filter((symptom) => symptom.crewId === crewId)
  const ruleById = new Map<string, Rule>(catalog.rules.map((rule) => [rule.id, rule]))
  const pending: (Checkup & { rule: Rule })[] = snapshot.checkups
    .filter((checkup) => checkup.status === 'pending' && checkup.crewId === crewId && ruleById.has(checkup.ruleId))
    .map((checkup) => ({ ...checkup, rule: ruleById.get(checkup.ruleId)! }))
  const answered = snapshot.checkups
    .filter((checkup) => checkup.status !== 'pending' && checkup.crewId === crewId && ruleById.has(checkup.ruleId))
    .map((checkup) => ({ ...checkup, rule: ruleById.get(checkup.ruleId)! }))

  const items: Item[] = []
  const value = (indicator: Indicator, reading: Reading) => `${fmt(reading.value, indicator.decimals)} ${indicator.unit}`
  for (const [list, who, where] of [[vitals, subject, 'Body'], [cabin, 'env', 'Cabin']] as const) {
    for (const indicator of list) {
      const reading = latest(who, indicator.id)
      if (!reading || reading.status === 'normal') continue
      items.push({
        key: `${who}:${indicator.id}`,
        status: reading.status,
        where,
        label: indicator.label,
        value: value(indicator, reading),
        action: adviceFor(indicator, reading.value),
        indicator,
        reading,
      })
    }
  }
  // What the server found across the crew, for example the same symptom in two people.
  for (const finding of snapshot.findings) {
    if (finding.scope !== 'crew' && !finding.crewIds.includes(crewId)) continue
    items.push({ key: `finding:${finding.id}`, status: finding.severity === 2 ? 'alert' : 'caution', where: 'Crew', label: finding.title, detail: finding.detail, action: finding.action })
  }
  items.sort((a, b) => (a.status === b.status ? 0 : a.status === 'alert' ? -1 : 1))

  const crewStatus = (id: number): Status =>
    worst([
      ...snapshot.latest.filter((reading) => reading.subject === `crew:${id}`).map((reading) => reading.status),
      ...(openSymptoms.some((symptom) => symptom.crewId === id) ? (['caution'] as Status[]) : []),
    ])
  const cabinStatus = worst(cabin.map((indicator) => latest('env', indicator.id)?.status ?? 'normal'))

  // The readiness score. It starts at 100 and each problem takes points away.
  const parts = [
    { label: t('Body values in alert'), count: items.filter((item) => item.where === 'Body' && item.status === 'alert').length, each: 15 },
    { label: t('Body values in caution'), count: items.filter((item) => item.where === 'Body' && item.status === 'caution').length, each: 6 },
    { label: t('Cabin values in alert'), count: items.filter((item) => item.where === 'Cabin' && item.status === 'alert').length, each: 10 },
    { label: t('Cabin values in caution'), count: items.filter((item) => item.where === 'Cabin' && item.status === 'caution').length, each: 4 },
    { label: t('Open symptoms'), count: mySymptoms.length, each: 6 },
  ]
  const score = Math.max(5, 100 - parts.reduce((sum, part) => sum + part.count * part.each, 0))
  const scoreStatus: Status = score >= 85 ? 'normal' : score >= 65 ? 'caution' : 'alert'
  const headline = score >= 85 ? t('You are ready for the day.') : score >= 65 ? t('Take it easy today.') : t('Rest today. Talk to the medical officer.')

  return { subject, member, vitals, cabin, latest, mySymptoms, pending, answered, items, crewStatus, cabinStatus, score, scoreStatus, scoreParts: parts, headline, todo: pending.length + items.length }
}

export const SHAPE: Record<Status, string> = { normal: '●', caution: '▲', alert: '■' }
export const firstName = (name?: string) => (name ?? '').split(' ')[0]
export function greeting(now: string) {
  const hour = new Date(now).getUTCHours()
  return hour < 12 ? t('Good morning') : hour < 18 ? t('Good afternoon') : t('Good evening')
}
