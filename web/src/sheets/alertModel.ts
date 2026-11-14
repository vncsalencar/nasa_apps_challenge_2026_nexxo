// What the inbox and the full-screen alert show for one notification, and its one main action.
// Both screens use this file, so they always give the same answer for the same notification.
import { formatRange, formatTime, timeOfHour, type Indicator, type Notification, type Reading } from '../api.ts'
import type { Ctx } from '../context.ts'
import { adviceFor, firstName } from '../derive.ts'
import { fmt, lang, t } from '../i18n.ts'

// Severity 0 is information, 1 is caution, 2 is alert. Each one has a shape, a word and a color.
export const SEVERITY_SHAPE = ['●', '▲', '■']
export const SEVERITY_WORD = [t('Information'), t('Caution'), t('Alert')]
export const SEVERITY_CLASS = ['muted', 'status-caution', 'status-alert']

// "note" says if this person answered the notification. "ground" is true for the flight surgeons on the ground.
export type Person = { key: string; name: string; initials: string; note: string; ground: boolean }
// The text for a cabin problem that no crew member took.
export const NO_ONE = t('No one works on it yet.')
export type AlertView = {
  notification: Notification
  // "cabin": a cabin value. "own": a value or symptom of the selected crew member.
  // "crew": a value or symptom of another crew member. "other": all other topics.
  area: 'cabin' | 'own' | 'crew' | 'other'
  where: string
  time: string
  headline: string
  indicator?: Indicator
  // The newest reading of the indicator. It can differ from the value in the text of the notification.
  reading?: Reading
  value?: string
  normal?: string
  backToNormal: boolean
  // The text of the notification without the sentences that only repeat the value.
  detail: string
  means: string
  steps: string[]
  // The other people who got the same notification.
  others: Person[]
  othersText: string
  othersIds: number[]
  claimText: string
  main: { label: string; short: string; kind: 'claim' | 'open' | 'read'; run: () => Promise<void> | void }
  // Only if the selected crew member works on the problem.
  finish?: { label: string; run: () => Promise<void> }
  read: () => Promise<void>
}

export const initialsOf = (name: string) => {
  const words = name.trim().split(/\s+/)
  return ((words[0]?.[0] ?? '') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase()
}

// "A", "A and B", "A, B and C".
export const listOf = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? '') : t('{first} and {last}', { first: names.slice(0, -1).join(', '), last: names[names.length - 1] })

// Splits a text into sentences. A decimal point has no space after it, so "3.11 mmHg" stays in one piece.
export const sentences = (text: string) => text.split(/(?<=[.?!])\s+/).map((part) => part.trim()).filter(Boolean)

// The time of a mission hour. It includes the date if the day is not the day of the mission clock.
export function clockOf(ctx: Ctx, hour: number) {
  const date = timeOfHour(ctx.snapshot.mission.startTime, hour)
  const sameDay = date.toISOString().slice(0, 10) === ctx.snapshot.mission.now.slice(0, 10)
  return formatTime(date, !sameDay)
}

// "Exercise, last day" reads better inside a sentence as "exercise (last day)".
// A label that starts with two capital letters, such as "CO2", keeps them.
const inSentence = (label: string, lower: boolean) => {
  const text = label.replace(/, (.+)$/, ' ($1)')
  return lower && !/^\p{Lu}[\p{Lu}\d]/u.test(text) ? text[0].toLocaleLowerCase(lang) + text.slice(1) : text
}

// The headline for a value outside its normal range: by area, by side, and plain or strong.
// Each case is one full sentence, because the word order and the grammar differ in each language.
const HEADLINE = {
  cabin: {
    high: ['{label} is high.', '{label} is too high.'],
    low: ['{label} is low.', '{label} is too low.'],
  },
  own: {
    high: ['Your {label} is high.', 'Your {label} is too high.'],
    low: ['Your {label} is low.', 'Your {label} is too low.'],
  },
  crew: {
    high: ["{name}'s {label} is high.", "{name}'s {label} is too high."],
    low: ["{name}'s {label} is low.", "{name}'s {label} is too low."],
  },
}

// True if the sentence gives a number with the unit of the indicator, for example "3.11 mmHg" or "4 of 5".
// The unit comes from the server in the language of the page, so this check does not depend on the language.
function hasValue(sentence: string, unit: string) {
  const escaped = unit.trim().replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
  return escaped !== '' && new RegExp(`\\d\\s?${escaped}(?![\\p{L}\\d])`, 'u').test(sentence)
}

// The text of a notification with no indicator can end with "What to do: ...". The server writes
// this mark in the language of the page. A notification from before the translation has the English mark.
const TODO_MARKS = [...new Set([t('What to do:'), 'What to do:'])]

export function describeAlert(ctx: Ctx, notification: Notification, strong = false): AlertView {
  const { snapshot, catalog, s, crewId } = ctx
  const { topic } = notification
  const parts = topic.split(':')

  // What the topic is about: "env:<indicator>", "crew:<id>:<indicator>" or "crew:<id>:symptom:<name>".
  let area: AlertView['area'] = 'other'
  let indicatorId: string | undefined
  let subject = ''
  let person = s.member
  if (parts[0] === 'env' && parts[1]) {
    area = 'cabin'
    indicatorId = parts[1]
    subject = 'env'
  } else if (parts[0] === 'crew') {
    const found = snapshot.crew.find((member) => member.id === Number(parts[1]))
    if (found) {
      person = found
      area = found.id === crewId ? 'own' : 'crew'
      subject = `crew:${found.id}`
      if (!topic.includes(':symptom:')) indicatorId = parts[2]
    }
  }
  const first = firstName(person?.name)
  const indicator = catalog.indicators.find((candidate) => candidate.id === indicatorId)
  const reading = indicator ? s.latest(subject, indicator.id) : undefined
  const where = area === 'cabin' ? t('Cabin') : area === 'own' ? t('Your health') : area === 'crew' ? t('Health of {name}', { name: first }) : t('Crew')

  // The headline says in plain words what is wrong now. If the value is normal again,
  // or the topic has no indicator, the headline is the title of the notification.
  let headline = /[.?!]$/.test(notification.title) ? notification.title : `${notification.title}.`
  const backToNormal = reading?.status === 'normal'
  if (indicator && reading && !backToNormal) {
    const [low, high] = indicator.normal
    const side = high !== null && reading.value > high ? 'high' : low !== null && reading.value < low ? 'low' : null
    if (side && area !== 'other') {
      headline = t(HEADLINE[area][side][strong ? 1 : 0], { label: inSentence(indicator.label, area !== 'cabin'), name: first })
    }
  }

  // The text of the notification. The first sentences only repeat the value and the normal range:
  // they are the sentences at the start that give a number with the unit of the indicator.
  let rest = sentences(notification.body)
  if (indicator) {
    const firstOther = rest.findIndex((sentence) => !hasValue(sentence, indicator.unit))
    rest = firstOther === -1 ? [] : rest.slice(firstOther)
  }
  let means = notification.body
  let steps: string[] = []
  const mark = TODO_MARKS.find((candidate) => notification.body.includes(candidate))
  if (indicator) {
    means = indicator.why
    const why = new Set(sentences(indicator.why))
    steps = rest.filter((sentence) => !why.has(sentence))
    if (area === 'crew') steps.push(t('Talk to {name} and look at the values.', { name: first }))
    else if (reading && !backToNormal) steps.push(...sentences(adviceFor(indicator, reading.value)))
  } else if (mark) {
    const marker = notification.body.indexOf(mark)
    means = notification.body.slice(0, marker).trim()
    steps = sentences(notification.body.slice(marker + mark.length))
  }
  steps = [...new Set(steps)]

  // Who else got the same notification: the rows with the same topic and the same hour.
  const same = snapshot.notifications.filter(
    (other) => other.id !== notification.id && other.topic === topic && other.hour === notification.hour && other.crewId !== crewId,
  )
  const others: Person[] = same.map((other) => {
    const ground = other.crewId === null
    const name = ground ? t('Flight surgeons on the ground') : (snapshot.crew.find((member) => member.id === other.crewId)?.name ?? t('A crew member'))
    const note = other.readHour === null ? t('No answer yet.') : t('Saw it at {time}.', { time: clockOf(ctx, other.readHour) })
    // "FS" in the circle is short for "flight surgeons".
    return { key: String(other.id), name, initials: ground ? t('FS') : initialsOf(name), note, ground }
  })
  const othersText = others.length
    ? t('Also sent to {names}.', { names: listOf(others.map((other) => (other.ground ? t('the flight surgeons on the ground') : other.name))) })
    : t('Only you got this notification.')

  // Who works on it: the claims of this topic that are not done.
  const claims = snapshot.claims.filter((claim) => claim.topic === topic && claim.doneHour === null)
  const mine = claims.find((claim) => claim.crewId === crewId)
  let claimText = claims
    .map((claim) => {
      const time = clockOf(ctx, claim.hour)
      if (claim.crewId === crewId) return t('You work on it since {time}.', { time })
      const name = firstName(snapshot.crew.find((member) => member.id === claim.crewId)?.name)
      return name ? t('{name} works on it since {time}.', { name, time }) : t('A crew member works on it since {time}.', { time })
    })
    .join(' ')
  // Only a cabin problem has a crew member who can say "I am on it". A value that is normal again needs no work.
  if (!claimText && area === 'cabin' && !backToNormal) claimText = NO_ONE

  // One answer is enough for one problem. So this also marks the older unread notifications of the same topic.
  const copies = snapshot.notifications.filter((other) => other.crewId === crewId && other.topic === topic && other.readHour === null)
  const read = async () => {
    for (const copy of copies.length ? copies : [notification]) await ctx.act(`/notifications/${copy.id}/read`)
  }
  let main: AlertView['main'] = { label: t('I saw it'), short: t('I saw it'), kind: 'read', run: read }
  if (area === 'cabin') {
    // An engineer keeps the systems of the cabin, so an engineer can take the problem.
    if (s.member?.role === 'engineer' && !mine && !backToNormal) {
      main = { label: t('I am on it'), short: t('I am on it'), kind: 'claim', run: () => ctx.act('/claims', { topic, label: notification.title }) }
    } else {
      main = { label: t('Open the cabin'), short: t('Open'), kind: 'open', run: () => ctx.open('cabin', indicatorId) }
    }
  } else if (area === 'own') {
    main = { label: t('See your body values'), short: t('Open'), kind: 'open', run: () => ctx.open('body', indicatorId) }
  } else if (area === 'crew' && person) {
    const id = person.id
    // The body screen shows the selected crew member. So this action selects the crew member of the topic first.
    main = {
      label: t('See the values of {name}', { name: first }),
      short: t('Open'),
      kind: 'open',
      run: () => {
        ctx.selectCrew(id)
        ctx.open('body', indicatorId)
      },
    }
  }

  return {
    notification,
    area,
    where,
    time: clockOf(ctx, notification.hour),
    headline,
    indicator,
    reading,
    value: indicator && reading ? fmt(reading.value, indicator.decimals) : undefined,
    normal: indicator ? t('Normal: {range}.', { range: formatRange(indicator.normal, indicator.unit) }) : undefined,
    backToNormal,
    detail: indicator && reading && !backToNormal ? rest.join(' ') : indicator ? notification.body : means,
    means,
    steps,
    others,
    othersText,
    othersIds: same.map((other) => other.id),
    claimText,
    main,
    finish: mine ? { label: t('The work is done'), run: () => ctx.act(`/claims/${mine.id}/done`) } : undefined,
    read,
  }
}
