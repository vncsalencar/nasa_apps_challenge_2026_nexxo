// The simulator: the page that the presenter holds on a phone during a live demo.
// Each control does one thing, has an effect at once on the audience screen, and shows its state.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  STATUS_LABEL,
  api,
  formatTime,
  missionDay,
  timeOfHour,
  useCatalog,
  useMission,
  type Catalog,
  type CrewMember,
  type Indicator,
  type Notification,
  type Snapshot,
} from '../api.ts'
import { History } from '../components/Activity.tsx'
import { InsightPanel } from '../components/Insights.tsx'
import { RangeBar } from '../components/RangeBar.tsx'
import { SourceTag, StatusBadge } from '../components/StatusBadge.tsx'
import { SHEET_LABEL, type SheetTab } from '../context.ts'
import { SHAPE, firstName, situation, type Situation } from '../derive.ts'
import { LANGS, fmt, lang, setLang, t, tn } from '../i18n.ts'
import { MODES } from '../theme.ts'
import './admin.css'

// The text of the confirmation. A function gets the new state of the mission, so it can say what the app did.
type Say = string | ((next: Snapshot) => string)
// "again" is for an action that needs a second request. It gets the first answer and returns the body of the
// second request to the same path, or undefined if one request is enough.
type Run = (path: string, body: unknown, say: Say, actor?: string, again?: (next: Snapshot) => unknown) => Promise<void>

// What each part of the page gets.
type Parts = {
  snapshot: Snapshot
  catalog: Catalog
  s: Situation
  // The crew member that the audience sees. The controls for one person act on this crew member.
  member: CrewMember | undefined
  run: Run
}

const GROUND = t('the flight surgeons on the ground')
const SEVERITY = [
  { id: 2, label: t('Alert'), shape: '■', tone: 'status-alert' },
  { id: 1, label: t('Caution'), shape: '▲', tone: 'status-caution' },
  { id: 0, label: t('Information'), shape: '●', tone: '' },
] as const
const severityOf = (id: number) => SEVERITY.find((item) => item.id === id) ?? SEVERITY[2]

// One tile of "Trigger now". "value" is the value of the demo. "side" tells on which side of the limits the alert zone is.
type Trigger = { label: string; indicator: string; side: 'high' | 'low'; value: number; hours?: number }
const TRIGGERS: Trigger[] = [
  // The question about a headache needs 3 hours of high CO2, so the clock moves 3 hours.
  { label: t('Cabin CO2 alert'), indicator: 'co2_partial_pressure', side: 'high', value: 4.2, hours: 3 },
  { label: t('Radiation alert'), indicator: 'radiation_dose_rate', side: 'high', value: 1.6 },
  { label: t('Hot cabin'), indicator: 'cabin_temperature', side: 'high', value: 29, hours: 3 },
  { label: t('Fever'), indicator: 'body_temperature', side: 'high', value: 38.9 },
  { label: t('Fast heart rate'), indicator: 'heart_rate', side: 'high', value: 125, hours: 3 },
  { label: t('Low blood sugar'), indicator: 'blood_glucose', side: 'low', value: 55 },
  { label: t('Bad sleep'), indicator: 'sleep_duration', side: 'low', value: 4.2 },
]

// True if the value is past the caution limit, on the side of this trigger.
function inAlertZone(indicator: Indicator, trigger: Trigger, value: number) {
  const limit = trigger.side === 'high' ? indicator.caution[1] : indicator.caution[0]
  return limit !== null && (trigger.side === 'high' ? value > limit : value < limit)
}

// The value that the tile sets. It must be in the alert zone of the indicator.
// If the limits of the catalog changed and the demo value is not in the alert zone, go 10% past the limit.
function alertValue(indicator: Indicator, trigger: Trigger) {
  const limit = trigger.side === 'high' ? indicator.caution[1] : indicator.caution[0]
  if (limit === null || inAlertZone(indicator, trigger, trigger.value)) return trigger.value
  return Number((limit * (trigger.side === 'high' ? 1.1 : 0.9)).toFixed(indicator.decimals))
}

// The same choice that the server makes for a notification: the crew members with one of the roles.
// If nobody has the role, the commander gets it. If the mission has no commander, all crew members get it.
function withRoles(crew: CrewMember[], roles: string[]) {
  const found = crew.filter((member) => roles.includes(member.role))
  if (found.length) return found
  const commanders = crew.filter((member) => member.role === 'commander')
  return commanders.length ? commanders : crew
}

// The size of one tap on plus or minus: about one tenth of the scale of the indicator, as a round number.
function stepOf(indicator: Indicator) {
  const smallest = 10 ** -indicator.decimals
  const bounds = [...indicator.normal, ...indicator.caution].filter((bound): bound is number => bound !== null)
  if (bounds.length === 0) return smallest
  const high = Math.max(...bounds)
  // An indicator with limits on one side only, such as CO2, has a scale that starts at 0.
  const oneSide = indicator.caution[0] === null || indicator.caution[1] === null
  const tenth = (oneSide ? high : high - Math.min(...bounds)) / 10
  if (!(tenth > 0)) return smallest
  const power = 10 ** Math.floor(Math.log10(tenth))
  const round = ([5, 2, 1].find((factor) => factor * power <= tenth) ?? 1) * power
  return Math.max(round, smallest)
}

// The next round value above or below the value now.
function stepped(indicator: Indicator, value: number, direction: 1 | -1) {
  const step = stepOf(indicator)
  const now = Number(value.toFixed(indicator.decimals))
  let next = (direction > 0 ? Math.floor(now / step + 1e-6) + 1 : Math.ceil(now / step - 1e-6) - 1) * step
  // If the normal limit and the caution limit are the same, the scale ends there. An example is a score of 5 of 5.
  const [normalLow, normalHigh] = indicator.normal
  if (normalHigh !== null && normalHigh === indicator.caution[1]) next = Math.min(next, normalHigh)
  if (normalLow !== null && normalLow === indicator.caution[0]) next = Math.max(next, normalLow)
  return Number(Math.max(0, next).toFixed(indicator.decimals + 1))
}

const recipientName = (snapshot: Snapshot, crewId: number | null) =>
  crewId === null ? GROUND : (snapshot.crew.find((member) => member.id === crewId)?.name ?? t('a crew member'))

// What the app did after an action: who got a new notification, and how many new questions it asked.
function news(before: Snapshot, next: Snapshot) {
  const lastNotification = Math.max(0, ...before.notifications.map((notification) => notification.id))
  const lastCheckup = Math.max(0, ...before.checkups.map((checkup) => checkup.id))
  const names = [...new Set(next.notifications.filter((notification) => notification.id > lastNotification).map((notification) => recipientName(next, notification.crewId)))]
  const questions = next.checkups.filter((checkup) => checkup.id > lastCheckup).length
  const parts: string[] = []
  if (names.length) parts.push(t('The app notified {names}.', { names: names.join(', ') }))
  if (questions) parts.push(tn(questions, '1 new question.', '{count} new questions.'))
  return parts.join(' ')
}

const clockText = (snapshot: Snapshot) => t('The clock is at {time} UTC.', { time: formatTime(new Date(snapshot.mission.now)) })
const valueText = (indicator: Indicator, value: number) => `${fmt(value, indicator.decimals)} ${indicator.unit}`

export function Admin() {
  const { missionId = '' } = useParams()
  const catalog = useCatalog()
  const { snapshot: loaded, error, version } = useMission(missionId, 'simulator')
  // The answer of the server to the last action. The page shows it at once, until the next load of the mission.
  const [answer, setAnswer] = useState<Snapshot | null>(null)
  const [seenVersion, setSeenVersion] = useState(version)
  if (version !== seenVersion) {
    setSeenVersion(version)
    setAnswer(null)
  }
  const snapshot = answer ?? loaded
  // The confirmation or the error of the last action. "count" starts the short flash again for each new text.
  const [feedback, setFeedback] = useState<{ text: string; failed: boolean; count: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const working = useRef(false)

  // This page always has the Soft dark look, also when the dashboard was in the Bridge look before.
  useEffect(() => {
    document.documentElement.dataset.look = 'soft'
  }, [])

  // Sends one action. The hook "useMission" has a "send" too, but it does not tell the caller
  // if the action failed. The presenter must see a confirmation or the error, so this page calls the server itself.
  const run: Run = async (path, body, say, actor = 'simulator', again) => {
    // One action at a time. A tap during an action does nothing.
    if (working.current) return
    working.current = true
    setBusy(true)
    let text: string
    let failed = false
    try {
      const post = (content: unknown) => api<Snapshot>(`/missions/${missionId}${path}`, content, 'POST', actor)
      let next = await post(body)
      const second = again?.(next)
      if (second !== undefined) next = await post(second)
      setAnswer(next)
      text = (typeof say === 'string' ? say : say(next)).trim()
    } catch (cause) {
      failed = true
      text = cause instanceof TypeError ? t('The server did not answer. Check the network.') : cause instanceof Error ? cause.message : t('The action failed.')
    }
    setFeedback((old) => ({ text, failed, count: (old?.count ?? 0) + 1 }))
    working.current = false
    setBusy(false)
  }

  if (error && !snapshot) return <p className="page" role="alert">{error}</p>
  if (!snapshot || !catalog) return <p className="page muted">{t('Loading the mission…')}</p>

  const { mission, stage } = snapshot
  const crewId = stage.crewId ?? snapshot.crew[0]?.id ?? 0
  const s = situation(snapshot, catalog, crewId)
  const parts: Parts = { snapshot, catalog, s, member: s.member, run }
  // The count of the server includes this page.
  const screens = Math.max(0, snapshot.viewers - 1)

  return (
    <div className="sm-page">
      <header className="sm-bar">
        <div className="sm-bar-top">
          <span className="sm-name">
            <span className="source">{t('Simulator')}</span> {mission.name}
          </span>
          {/* The language of this page and of the audience screen on this device. A change loads the page again. */}
          <div className="segmented sm-lang" role="group" aria-label={t('Language')}>
            {LANGS.map((item) => (
              <button type="button" key={item.id} aria-pressed={lang === item.id} lang={item.id} aria-label={item.label} title={item.label} onClick={() => setLang(item.id)}>
                {item.short}
              </button>
            ))}
          </div>
          <span className="sm-meta">
            <span>
              {t('Flight day {day}', { day: missionDay(mission.hour - 1) })} · {formatTime(new Date(mission.now))} UTC
            </span>
            {mission.autoRun ? <span className="badge live">● {t('Clock runs')}</span> : <span>{t('Clock stopped')}</span>}
            <span>{screens === 0 ? t('No screen open') : tn(screens, '1 screen open', '{count} screens open')}</span>
          </span>
          <nav className="sm-bar-links" aria-label={t('Other pages')}>
            <Link to={`/m/${mission.id}`}>{t('Dashboard')}</Link>
            <Link to="/">{t('All missions')}</Link>
          </nav>
        </div>
        {error && <p className="sm-feedback sm-failed" role="alert">{t('The page cannot load the mission: {error}', { error })}</p>}
        <p className={`sm-feedback ${feedback?.failed ? 'sm-failed' : ''} ${busy ? 'sm-busy' : ''}`} role={feedback?.failed ? 'alert' : 'status'} aria-busy={busy}>
          {feedback ? (
            <span key={feedback.count} className="sm-flash">
              {feedback.failed ? t('Error: {text}', { text: feedback.text }) : feedback.text}
            </span>
          ) : (
            <span className="muted">{t('Each tap changes the audience screen at once.')}</span>
          )}
        </p>
      </header>

      <main className="sm-grid">
        <StageSection {...parts} />
        <TriggerSection {...parts} />
        <SendSection {...parts} />
        <SentSection {...parts} />
        <ValuesSection {...parts} />
        <ClockSection {...parts} />
        <ResetSection {...parts} />
        <SetupSection {...parts} />
      </main>

      <footer className="sm-foot">
        <Link className="pill" to={`/m/${mission.id}`}>{t('Open the dashboard')}</Link>
        <Link className="pill" to="/">{t('All missions')}</Link>
      </footer>
    </div>
  )
}

// 1. What the audience screen shows: the crew member, the home view and the open screen.
function StageSection({ snapshot, s, run }: Parts) {
  const { stage } = snapshot
  const sheets: (SheetTab | null)[] = [null, ...(Object.keys(SHEET_LABEL) as SheetTab[])]
  return (
    <section className="sm-section sm-area-stage" aria-labelledby="sm-stage">
      <h2 id="sm-stage">{t('Audience sees')}</h2>
      <div className="sm-stage">
        <div className="sm-group">
          <span className="sm-label">{t('Crew member. The controls below act on this person.')}</span>
          <div className="sm-chips sm-chips-crew" role="group" aria-label={t('Crew member')}>
            {snapshot.crew.map((member) => {
              const status = s.crewStatus(member.id)
              return (
                <button
                  type="button"
                  key={member.id}
                  className="pill sm-chip"
                  aria-pressed={member.id === s.member?.id}
                  title={`${member.name}: ${STATUS_LABEL[status]}`}
                  onClick={() => run('/simulate/stage', { crewId: member.id }, t('The audience sees {name}.', { name: member.name }))}
                >
                  <span className={`status-${status}`} aria-label={STATUS_LABEL[status]}>{SHAPE[status]}</span>
                  <span className="sm-clip">{firstName(member.name)}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="sm-group">
          <span className="sm-label">{t('Home view')}</span>
          <div className="sm-chips" role="group" aria-label={t('Home view')}>
            {MODES.map((mode) => (
              <button
                type="button"
                key={mode.id}
                className="pill sm-chip"
                aria-pressed={stage.mode === mode.id}
                title={mode.about}
                onClick={() => run('/simulate/stage', { mode: mode.id }, t('The audience sees the {view} view.', { view: mode.label }))}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
        <div className="sm-group">
          <span className="sm-label">{t('Screen')}</span>
          <div className="sm-chips" role="group" aria-label={t('Screen')}>
            {sheets.map((sheet) => (
              <button
                type="button"
                key={sheet ?? 'none'}
                className="pill sm-chip"
                aria-pressed={(stage.sheet ?? null) === sheet}
                onClick={() =>
                  run('/simulate/stage', { sheet }, sheet ? t('The audience sees the {screen} screen.', { screen: SHEET_LABEL[sheet] }) : t('The audience sees the home view with no screen open.'))
                }
              >
                {/* "None" is a word for a symptom on another screen. The empty name in braces makes this key a different one. */}
                {sheet ? SHEET_LABEL[sheet] : t('None{screen}', { screen: '' })}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// 2. One tap puts a value in the alert zone. A second tap gives the value back to the record.
function TriggerSection(parts: Parts) {
  const { catalog, member } = parts
  const known = TRIGGERS.filter((trigger) => catalog.indicators.some((indicator) => indicator.id === trigger.indicator))
  const kindOf = (trigger: Trigger) => catalog.indicators.find((indicator) => indicator.id === trigger.indicator)!.kind
  const cabin = known.filter((trigger) => kindOf(trigger) === 'environment')
  const body = known.filter((trigger) => kindOf(trigger) === 'vital')
  return (
    <section className="sm-section sm-area-trigger" aria-labelledby="sm-trigger">
      <h2 id="sm-trigger">{t('Trigger now')}</h2>
      <div className="sm-trigger-groups">
        {cabin.length > 0 && (
          <div className="sm-group">
            <span className="sm-label">{t('Cabin')}</span>
            {cabin.map((trigger) => <TriggerTile key={trigger.indicator} trigger={trigger} {...parts} />)}
          </div>
        )}
        {body.length > 0 && member && (
          <div className="sm-group">
            <span className="sm-label">{member.name}</span>
            {body.map((trigger) => <TriggerTile key={trigger.indicator} trigger={trigger} {...parts} />)}
          </div>
        )}
      </div>
    </section>
  )
}

function TriggerTile({ trigger, snapshot, catalog, s, member, run }: Parts & { trigger: Trigger }) {
  const indicator = catalog.indicators.find((candidate) => candidate.id === trigger.indicator)!
  const ofCabin = indicator.kind === 'environment'
  const subject = ofCabin ? 'env' : s.subject
  const roleLabel = (role: string) => catalog.roles.find((candidate) => candidate.id === role)?.label ?? role
  // The server sends a cabin alert to the flight engineers and the commander.
  // It sends a body alert to the crew member and to the crew medical officers.
  const people: { name: string; why: string }[] = ofCabin
    ? withRoles(snapshot.crew, ['engineer', 'commander']).map((person) => ({ name: person.name, why: roleLabel(person.role) }))
    : [
        ...(member ? [{ name: member.name, why: t('own value') }] : []),
        ...withRoles(snapshot.crew, ['medical_officer'])
          .filter((person) => person.id !== member?.id)
          .map((person) => ({ name: person.name, why: roleLabel(person.role) })),
      ]
  const target = alertValue(indicator, trigger)
  // The tile is on when the simulator holds this value on the side of the alert.
  const held = snapshot.mission.offsets[`${subject}:${indicator.id}`] ?? 0
  const on = trigger.side === 'high' ? held > 0 : held < 0
  const reading = s.latest(subject, indicator.id)
  // The name of the tile in a confirmation. A body value also names the crew member.
  const person = ofCabin ? undefined : member?.name
  const readingIn = (next: Snapshot) => next.latest.find((candidate) => candidate.subject === subject && candidate.indicator === indicator.id)
  const tap = () =>
    on
      ? run(
          '/simulate/set',
          { subject, indicator: indicator.id, value: null },
          person === undefined
            ? t('{name} is off. The value is back to the record.', { name: trigger.label })
            : t('{name} of {person} is off. The value is back to the record.', { name: trigger.label, person }),
        )
      : run(
          '/simulate/set',
          { subject, indicator: indicator.id, value: target, hours: trigger.hours },
          (next) => {
            const value = valueText(indicator, readingIn(next)?.value ?? target)
            const isOn = person === undefined ? t('{name} is on: {value}.', { name: trigger.label, value }) : t('{name} of {person} is on: {value}.', { name: trigger.label, person, value })
            return `${isOn} ${news(snapshot, next) || t('The app sent no new notification.')}`
          },
          undefined,
          // The simulator holds the value as a difference to the record, and the record changes each hour.
          // So after the clock moved, the value can be out of the alert zone. Then set the value one more time, with no move of the clock.
          (next) => {
            const now = readingIn(next)
            return trigger.hours && now && !inAlertZone(indicator, trigger, now.value) ? { subject, indicator: indicator.id, value: target } : undefined
          },
        )
  return (
    <button type="button" className="sm-tile" aria-pressed={on} onClick={tap}>
      <span className="sm-tile-name">{trigger.label}</span>
      <span className="sm-tile-state">{on ? t('On') : t('Off')}</span>
      <span className="sm-tile-line">
        {reading ? (
          <>
            {t('Now {value}', { value: valueText(indicator, reading.value) })} <StatusBadge status={reading.status} />
          </>
        ) : (
          t('No value yet')
        )}
        {!on && (
          <>
            {' · '}
            {trigger.hours
              ? t('sets {value}, then +{hours} hours', { value: valueText(indicator, target), hours: trigger.hours })
              : t('sets {value}', { value: valueText(indicator, target) })}
          </>
        )}
      </span>
      <span className="sm-tile-line">{t('Alert goes to {people}', { people: people.map((one) => `${one.name} (${one.why})`).join(', ') })}</span>
    </button>
  )
}

// 3. A test alert to roles, to the selected crew member, or to the ground. And one question by hand.
function SendSection({ snapshot, catalog, member, run }: Parts) {
  const [roles, setRoles] = useState<string[]>(['engineer'])
  const [toMember, setToMember] = useState(false)
  const [ground, setGround] = useState(false)
  const [severity, setSeverity] = useState<number>(2)
  const [title, setTitle] = useState('')
  const [chosenRule, setChosenRule] = useState('')
  const rule = catalog.rules.find((candidate) => candidate.id === chosenRule) ?? catalog.rules[0]

  const people = snapshot.crew.filter((person) => roles.includes(person.role) || (toMember && person.id === member?.id))
  const names = [...people.map((person) => person.name), ...(ground ? [GROUND] : [])]
  const sendAlert = () => {
    if (names.length === 0) return
    run(
      '/simulate/notification',
      { roles, crewIds: toMember && member ? [member.id] : [], ground, severity, title: title.trim() || undefined },
      t('Sent to {names}.', { names: names.join(', ') }),
    )
  }
  return (
    <section className="sm-section sm-area-send" aria-labelledby="sm-send">
      <h2 id="sm-send">{t('Send a test alert')}</h2>
      <form
        className="sm-group"
        onSubmit={(event) => {
          event.preventDefault()
          sendAlert()
        }}
      >
        <span className="sm-label">{t('To')}</span>
        <div className="sm-chips sm-chips-free" role="group" aria-label={t('Who gets the test alert')}>
          {catalog.roles.map((role) => (
            <button
              type="button"
              key={role.id}
              className="pill sm-chip"
              aria-pressed={roles.includes(role.id)}
              onClick={() => setRoles(roles.includes(role.id) ? roles.filter((id) => id !== role.id) : [...roles, role.id])}
            >
              {role.label}
            </button>
          ))}
          {member && (
            <button type="button" className="pill sm-chip" aria-pressed={toMember} onClick={() => setToMember(!toMember)}>
              {member.name}
            </button>
          )}
          <button type="button" className="pill sm-chip" aria-pressed={ground} onClick={() => setGround(!ground)}>
            {t('Ground')}
          </button>
        </div>
        <span className="sm-label">{t('Severity')}</span>
        <div className="sm-chips" role="group" aria-label={t('Severity')}>
          {SEVERITY.map((item) => (
            <button type="button" key={item.id} className="pill sm-chip" aria-pressed={severity === item.id} onClick={() => setSeverity(item.id)}>
              <span className={item.tone} aria-hidden="true">{item.shape}</span> {item.label}
            </button>
          ))}
        </div>
        <input className="sm-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t('Title (optional)')} aria-label={t('Title of the test alert (optional)')} maxLength={80} />
        <button type="submit" className="btn btn-primary btn-large sm-wide" disabled={names.length === 0}>
          {t('Send')}
        </button>
        <span className="sm-note">
          {names.length ? t('Goes to {names}. The app marks it "TEST".', { names: names.join(', ') }) : t('Nobody has this role. Choose who gets the alert.')}
        </span>
      </form>

      <h2 id="sm-ask" className="sm-second">{t('Ask a question')}</h2>
      {rule && member ? (
        <div className="sm-group">
          <select className="sm-input" value={rule.id} onChange={(event) => setChosenRule(event.target.value)} aria-label={t('Question')}>
            {catalog.rules.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.title}
              </option>
            ))}
          </select>
          <span className="sm-note">"{rule.question}"</span>
          <button
            type="button"
            className="btn btn-large sm-wide"
            onClick={() => run('/simulate/checkup', { crewId: member.id, ruleId: rule.id }, t('Asked {name}: "{question}"', { name: member.name, question: rule.question }))}
          >
            {t('Ask {name}', { name: firstName(member.name) })}
          </button>
        </div>
      ) : (
        <p className="muted small">{t('The mission has no crew member to ask.')}</p>
      )}
    </section>
  )
}

// 4. The feedback for the presenter: what the app sent, to whom, and which questions are open.
function SentSection({ snapshot, catalog, run }: Parts) {
  // One line for each notification. The server saves one row for each person, with the same topic and hour.
  const groups: { first: Notification; names: string[] }[] = []
  const byKey = new Map<string, { first: Notification; names: string[] }>()
  for (const notification of snapshot.notifications) {
    const key = `${notification.topic}|${notification.hour}`
    let group = byKey.get(key)
    if (!group) {
      group = { first: notification, names: [] }
      byKey.set(key, group)
      groups.push(group)
    }
    const name = recipientName(snapshot, notification.crewId)
    if (!group.names.includes(name)) group.names.push(name)
  }
  const pending = snapshot.checkups.filter((checkup) => checkup.status === 'pending')
  const claims = snapshot.claims.filter((claim) => claim.doneHour === null)
  const nameOf = (crewId: number) => recipientName(snapshot, crewId)
  const labelOf = (id: string) => catalog.indicators.find((indicator) => indicator.id === id)?.label
  // The name of the problem that a claim is about, from its topic. For example "env:co2_partial_pressure" or "crew:3:heart_rate".
  const topicLabel = (topic: string) => {
    const [kind, second, third] = topic.split(':')
    if (kind === 'env' && labelOf(second)) return labelOf(second)
    if (kind === 'crew' && labelOf(third)) return t('{label} of {name}', { label: labelOf(third) ?? '', name: nameOf(Number(second)) })
    return snapshot.notifications.find((notification) => notification.topic === topic)?.title ?? topic
  }

  return (
    <section className="sm-section sm-area-sent" aria-labelledby="sm-sent">
      <h2 id="sm-sent">{t('The app sent')}</h2>
      {groups.length === 0 && <p className="muted small">{t('No notifications.')}</p>}
      <ul className="plain">
        {groups.slice(0, 6).map(({ first, names }) => {
          const severity = severityOf(first.severity)
          return (
            <li key={first.id} className={`notification severity-${first.severity}`}>
              <span className="sm-sent-head">
                <strong>{first.title}</strong>
                <span className={`badge ${severity.tone}`}>
                  <span aria-hidden="true">{severity.shape}</span> {severity.label}
                </span>
              </span>
              <span className="small">{t('To {names}', { names: names.join(', ') })}</span>
              <span className="small muted">{formatTime(timeOfHour(snapshot.mission.startTime, first.hour))} UTC</span>
            </li>
          )
        })}
      </ul>

      <span className="sm-label">{t('Open questions ({count})', { count: pending.length })}</span>
      {pending.length === 0 && <p className="muted small">{t('No open questions.')}</p>}
      <ul className="plain">
        {pending.map((checkup) => {
          const question = catalog.rules.find((rule) => rule.id === checkup.ruleId)?.question ?? checkup.ruleId
          const answer = (word: 'Yes' | 'No') =>
            run(
              `/checkups/${checkup.id}/answer`,
              { answer: word === 'Yes' ? 'confirmed' : 'dismissed' },
              (next) => `${word === 'Yes' ? t('{name} answered Yes.', { name: nameOf(checkup.crewId) }) : t('{name} answered No.', { name: nameOf(checkup.crewId) })} ${news(snapshot, next)}`,
              // The answer comes from the crew member, not from the simulator.
              `crew:${checkup.crewId}`,
            )
          return (
            <li key={checkup.id} className="sm-ask">
              <span>
                <span className="small muted">{nameOf(checkup.crewId)}</span>
                <span className="sm-question">{question}</span>
              </span>
              <span className="sm-answers">
                <button type="button" className="btn sm-answer" aria-label={t('Yes, as {name}: {question}', { name: nameOf(checkup.crewId), question })} onClick={() => answer('Yes')}>
                  {t('Yes')}
                </button>
                <button type="button" className="btn sm-answer" aria-label={t('No, as {name}: {question}', { name: nameOf(checkup.crewId), question })} onClick={() => answer('No')}>
                  {t('No')}
                </button>
              </span>
            </li>
          )
        })}
      </ul>

      {claims.length > 0 && (
        <>
          <span className="sm-label">{t('Who works on what')}</span>
          <ul className="plain">
            {claims.map((claim) => (
              <li key={claim.id} className="sm-claim">
                <strong>{firstName(nameOf(claim.crewId))}</strong> {t('works on: {topic}', { topic: topicLabel(claim.topic) ?? '' })}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

// 5. Each value with a minus and a plus. One tap sets the new value now.
function ValuesSection(parts: Parts) {
  const { s, member } = parts
  const settable = (indicator: Indicator) => !indicator.computed
  return (
    <section className="sm-section sm-area-values">
      <details className="sm-details">
        <summary>
          <h2>{t('Values')}</h2>
          <span className="muted small">
            {member ? t('Set a value of the cabin or of {name} in steps.', { name: firstName(member.name) }) : t('Set a value of the cabin or of a crew member in steps.')}
          </span>
        </summary>
        <span className="sm-label">{t('Cabin')}</span>
        <div className="sm-values">
          {s.cabin.filter(settable).map((indicator) => <ValueRow key={indicator.id} indicator={indicator} subject="env" {...parts} />)}
        </div>
        {member && (
          <>
            <span className="sm-label">{member.name}</span>
            <div className="sm-values">
              {s.vitals.filter(settable).map((indicator) => <ValueRow key={indicator.id} indicator={indicator} subject={s.subject} {...parts} />)}
            </div>
          </>
        )}
      </details>
    </section>
  )
}

function ValueRow({ indicator, subject, snapshot, s, member, run }: Parts & { indicator: Indicator; subject: string }) {
  const reading = s.latest(subject, indicator.id)
  const held = `${subject}:${indicator.id}` in snapshot.mission.offsets
  const whose = subject === 'env' ? indicator.label : t('{label} of {name}', { label: indicator.label, name: member?.name ?? '' })
  const set = (value: number) =>
    run('/simulate/set', { subject, indicator: indicator.id, value }, (next) => `${t('Set {name} to {value}.', { name: whose, value: valueText(indicator, value) })} ${news(snapshot, next)}`)
  const lower = reading ? stepped(indicator, reading.value, -1) : null
  const higher = reading ? stepped(indicator, reading.value, 1) : null
  const now = reading ? Number(reading.value.toFixed(indicator.decimals)) : null
  return (
    <div className="sm-value">
      <div className="sm-value-head">
        <span className="sm-value-name">{indicator.label}</span>
        {reading && <StatusBadge status={reading.status} />}
      </div>
      <div className="sm-value-head">
        <span>
          <span className="sm-value-now">{reading ? valueText(indicator, reading.value) : t('No value yet')}</span> {reading && <SourceTag source={reading.source} />}
        </span>
        {held && (
          <button
            type="button"
            className="pill"
            onClick={() => run('/simulate/set', { subject, indicator: indicator.id, value: null }, t('{name} is back to the record.', { name: whose }))}
          >
            {t('Record')}
          </button>
        )}
      </div>
      <div className="sm-value-set">
        <button type="button" className="sm-step" aria-label={t('Lower {name}', { name: whose })} disabled={lower === null || lower === now} onClick={() => lower !== null && set(lower)}>
          −
        </button>
        {reading ? <RangeBar indicator={indicator} value={reading.value} status={reading.status} baseline={snapshot.baselines[subject]?.[indicator.id]} /> : <span />}
        <button type="button" className="sm-step" aria-label={t('Raise {name}', { name: whose })} disabled={higher === null || higher === now} onClick={() => higher !== null && set(higher)}>
          +
        </button>
      </div>
    </div>
  )
}

// 6. The mission clock.
function ClockSection({ snapshot, run }: Parts) {
  const { autoRun } = snapshot.mission
  const moved = (next: Snapshot) => `${clockText(next)} ${news(snapshot, next)}`
  return (
    <section className="sm-section sm-area-clock" aria-labelledby="sm-clock">
      <h2 id="sm-clock">{t('Clock')}</h2>
      <div className="sm-buttons">
        <button type="button" className="btn sm-big" onClick={() => run('/advance', { hours: 1 }, moved)}>{t('+1 hour')}</button>
        <button type="button" className="btn sm-big" onClick={() => run('/advance', { hours: 6 }, moved)}>{t('+6 hours')}</button>
        <button type="button" className="btn sm-big" onClick={() => run('/advance', { hours: 24 }, moved)}>{t('+1 day')}</button>
        <button type="button" className="btn sm-big" title={t('The time of the morning values')} onClick={() => run('/simulate/advance-to', { hourOfDay: 7 }, moved)}>{t('To 07:00')}</button>
        <button type="button" className="btn sm-big" title={t('The time of the radiation value')} onClick={() => run('/simulate/advance-to', { hourOfDay: 12 }, moved)}>{t('To 12:00')}</button>
        <button
          type="button"
          className="btn sm-big sm-run"
          aria-pressed={autoRun}
          onClick={() => run('/auto-run', { enabled: !autoRun }, autoRun ? t('The clock stopped.') : t('The clock runs: 1 hour each 2 seconds.'))}
        >
          {autoRun ? t('Stop the clock') : t('Start the clock')}
        </button>
      </div>
    </section>
  )
}

// A button for an action that deletes data. The first tap asks, the second tap does it.
function ConfirmButton({ children, onConfirm }: { children: ReactNode; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false)
  const armedAt = useRef(0)
  useEffect(() => {
    if (!armed) return
    const timer = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(timer)
  }, [armed])
  const tap = () => {
    if (!armed) {
      armedAt.current = Date.now()
      setArmed(true)
      // A double tap by accident is not a confirmation.
    } else if (Date.now() - armedAt.current > 400) {
      setArmed(false)
      onConfirm()
    }
  }
  return (
    <button type="button" className={`btn sm-big ${armed ? 'sm-armed' : ''}`} onClick={tap}>
      {armed ? t('Tap again to confirm') : children}
    </button>
  )
}

// 7. Reset between two runs of the demo.
function ResetSection({ run }: Parts) {
  return (
    <section className="sm-section sm-area-reset" aria-labelledby="sm-reset">
      <h2 id="sm-reset">{t('Reset')}</h2>
      <div className="sm-buttons sm-buttons-two">
        <ConfirmButton onConfirm={() => run('/simulate/reset', { scope: 'alerts' }, t('Removed the alerts, questions, symptoms and all values of the simulator.'))}>{t('Clear alerts')}</ConfirmButton>
        <ConfirmButton onConfirm={() => run('/simulate/reset', { scope: 'mission' }, t('Reset the mission to the end of the NASA record.'))}>{t('Reset the mission')}</ConfirmButton>
      </div>
      <span className="sm-note">
        {t('"Clear alerts" removes the alerts, questions, symptoms, claims and all values of the simulator. "Reset the mission" also goes back to the end of the NASA record. The address of the mission stays.')}
      </span>
    </section>
  )
}

// 8. What the presenter sets before the demo: the crew, the roles and the insights. And the history of the mission.
function SetupSection({ snapshot, catalog, run }: Parts) {
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('specialist')
  const { llm } = snapshot
  const saveLlm = (change: Record<string, unknown>) => run('/llm', change, t('Saved the settings of the insights.'))
  const roleOptions = catalog.roles.map((role) => (
    <option key={role.id} value={role.id}>
      {role.label}
    </option>
  ))
  return (
    <section className="sm-section sm-area-setup">
      <details className="sm-details">
        <summary>
          <h2>{t('Setup')}</h2>
          <span className="muted small">{t('Crew, roles, insights and the history of the mission.')}</span>
        </summary>

        <div className="sm-setup">
          <div className="sm-group">
            <span className="sm-label">{t('Crew and roles. The role decides who gets which notification.')}</span>
            {snapshot.crew.map((person) => (
              <label key={person.id} className="sm-role">
                <span>{person.name}</span>
                <select
                  value={person.role}
                  onChange={(event) => {
                    const label = catalog.roles.find((role) => role.id === event.target.value)?.label ?? event.target.value
                    run(`/crew/${person.id}/role`, { role: event.target.value }, t('{name} is now {role}.', { name: person.name, role: label }))
                  }}
                >
                  {roleOptions}
                </select>
              </label>
            ))}
            <form
              className="sm-add"
              onSubmit={(event) => {
                event.preventDefault()
                const name = newName.trim()
                if (!name) return
                run('/crew', { name, role: newRole }, t('Added {name} to the crew.', { name }))
                setNewName('')
              }}
            >
              <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder={t('Name of a new crew member')} aria-label={t('Name of a new crew member')} maxLength={40} />
              <select value={newRole} onChange={(event) => setNewRole(event.target.value)} aria-label={t('Role of the new crew member')}>
                {roleOptions}
              </select>
              <button type="submit" className="btn" disabled={!newName.trim()}>{t('Add to the crew')}</button>
            </form>
          </div>

          <div className="sm-group">
            <span className="sm-label">{t('Insights from a language model')}</span>
            <span className="sm-note">
              {t('This part is optional. When it is on, a language model reads the data of the mission and writes a short insight with suggested actions. The check-ups and alerts of the app always work without it.')}
            </span>
            <label className="check">
              <input type="checkbox" checked={llm.enabled} onChange={(event) => saveLlm({ enabled: event.target.checked })} />
              <span>{t('Turn insights on for this mission')}</span>
            </label>
            {llm.enabled && (
              <>
                <label className="sm-role">
                  <span>{t('Model provider')}</span>
                  <select value={llm.provider} onChange={(event) => saveLlm({ provider: event.target.value })}>
                    {catalog.llmProviders.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.label}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="sm-note">{catalog.llmProviders.find((provider) => provider.id === llm.provider)?.about}</span>
                <label className="sm-role">
                  <span>{t('Model')}</span>
                  <input key={`model:${llm.model}`} defaultValue={llm.model} onBlur={(event) => event.target.value !== llm.model && saveLlm({ model: event.target.value })} />
                </label>
                {llm.provider === 'local' && (
                  <label className="sm-role">
                    <span>{t('Address of the model server')}</span>
                    <input key={`url:${llm.baseUrl}`} defaultValue={llm.baseUrl} onBlur={(event) => event.target.value !== llm.baseUrl && saveLlm({ baseUrl: event.target.value })} />
                  </label>
                )}
                <label className="check">
                  <input type="checkbox" checked={llm.autoOnAlert} onChange={(event) => saveLlm({ autoOnAlert: event.target.checked })} />
                  <span>{t('Ask for an insight when a status changes to alert (one time in 12 mission hours at most)')}</span>
                </label>
                <label className="check">
                  <input type="checkbox" checked={llm.canNotify} onChange={(event) => saveLlm({ canNotify: event.target.checked })} />
                  <span>{t('Send the suggested actions to the roles as notifications')}</span>
                </label>
              </>
            )}
          </div>
        </div>
        <InsightPanel snapshot={snapshot} catalog={catalog} onRequest={() => run('/insights', {}, t('Asked the language model for an insight.'))} />

        <span className="sm-label">{t('History of the mission')}</span>
        <History snapshot={snapshot} />
      </details>
    </section>
  )
}
