// The Check-ups sheet. It has two parts: the questions that Nexxo asks when a value looks wrong,
// and the daily check-in (sleep, mood, new symptoms).
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { formatRange, formatTime, missionDay, timeOfHour, worst } from '../api.ts'
import type { BodyPart, Checkup, CrewMember, Indicator, Reading, Rule, Status } from '../api.ts'
import { RangeBar } from '../components/RangeBar.tsx'
import { SourceTag, StatusBadge } from '../components/StatusBadge.tsx'
import type { Ctx } from '../context.ts'
import { firstName } from '../derive.ts'
import { fmt, lang, t, tn } from '../i18n.ts'
import { BODY_PART_LABEL } from '../symptoms.ts'
import './checkups.css'

type Part = 'questions' | 'daily'
type Asked = Checkup & { rule: Rule }
type Answer = 'confirmed' | 'dismissed'

// The indicator that starts each rule. The catalog does not give this, so the sheet keeps the list.
const RULE_INDICATOR: Record<string, string> = {
  co2_headache: 'co2_partial_pressure',
  co2_severe: 'co2_partial_pressure',
  co2_week: 'co2_7day_average',
  radiation_high: 'radiation_dose_rate',
  cabin_hot: 'cabin_temperature',
  heart_rate_high: 'heart_rate',
  heart_rate_low: 'heart_rate',
  fever: 'body_temperature',
  pressure_high: 'blood_pressure_systolic',
  pressure_low: 'blood_pressure_systolic',
  glucose_low: 'blood_glucose',
  glucose_high: 'blood_glucose',
  sleep_debt: 'sleep_duration',
  mood_low: 'mood_score',
  nutrition_low: 'energy_intake',
  water_low: 'water_intake',
  exercise_missed: 'exercise_minutes',
  stress_long: 'stress_score',
  fatigue_high: 'fatigue_score',
}

// The symptoms that the daily check-in offers. The Body sheet has the full list.
const COMMON_SYMPTOMS: { name: string; bodyPart: BodyPart }[] = [
  { name: 'Headache', bodyPart: 'head' },
  { name: 'Nausea', bodyPart: 'abdomen' },
  { name: 'Dizziness', bodyPart: 'head' },
  { name: 'Muscle pain', bodyPart: 'legs' },
]
const SCORE_IDS = ['mood_score', 'stress_score', 'fatigue_score']
// The highest value of each score. The unit ("of 5") is a text of the server in the language of the crew member, so the sheet does not read it.
const SCORE_TOP: Record<string, number> = { mood_score: 5, stress_score: 5, fatigue_score: 5 }
// The question for each score after the first one. The word order and the gender differ in each language, so each score has its full sentence.
const SCORE_QUESTION: Record<string, string> = {
  stress_score: t('How high is your stress now?'),
  fatigue_score: t('How high is your fatigue now?'),
}
// The words under the five buttons. The first list is for a score where 5 is good, the second for a score where 5 is bad.
const WORDS_GOOD_HIGH = [t('Very low'), t('Low'), t('OK'), t('Good'), t('Very good')]
const WORDS_LEVEL = [t('Very low'), t('Low'), t('Medium'), t('High'), t('Very high')]
// The part of the body of a recorded symptom, as a full sentence.
const SYMPTOM_OF_PART: Record<BodyPart, string> = {
  head: t('A symptom of the head.'),
  chest: t('A symptom of the chest.'),
  abdomen: t('A symptom of the abdomen.'),
  arms: t('A symptom of the arms.'),
  legs: t('A symptom of the legs.'),
}
const SLEEP_MAX_TENTHS = 140

const ICON_PATH = {
  check: 'M5 12.5 L10 17.5 L19 7',
  next: 'M9 5 L16 12 L9 19',
  minus: 'M5 12 H19',
  plus: 'M5 12 H19 M12 5 V19',
  arrow: 'M4 12 H20 M13 5 L20 12 L13 19',
}
function Icon({ name }: { name: keyof typeof ICON_PATH }) {
  return (
    <svg className="ck-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICON_PATH[name]} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))
const list = (names: string[], separator = ', ') => (names.length < 2 ? names.join('') : t('{items} and {last}', { items: names.slice(0, -1).join(separator), last: names[names.length - 1] }))
// A list of numbers. When the decimal sign of the language is a comma ("5,6"), a semicolon separates the numbers.
const numberList = (numbers: string[]) => list(numbers, fmt(1.5, 1).includes(',') ? '; ' : ', ')
const initials = (name: string) => name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase()
const valueText = (indicator: Indicator, value: number) => `${fmt(value, indicator.decimals)} ${indicator.unit}`
// The day and the month of a moment, without the time.
const dayText = (date: Date) => date.toLocaleString(lang === 'en' ? 'en-GB' : lang, { timeZone: 'UTC', day: '2-digit', month: 'short' })

function statusOf(indicator: Indicator, value: number): Status {
  const inside = ([low, high]: Indicator['normal']) => (low === null || value >= low) && (high === null || value <= high)
  return inside(indicator.normal) ? 'normal' : inside(indicator.caution) ? 'caution' : 'alert'
}

// The crew medical officers, without the selected crew member. They get the health messages.
function medicsOf({ snapshot, crewId }: Ctx): CrewMember[] {
  return snapshot.crew.filter((member) => member.role === 'medical_officer' && member.id !== crewId)
}
function roleLabel({ catalog }: Ctx, role: string) {
  return catalog.roles.find((candidate) => candidate.id === role)?.label ?? role
}
// Who can see an answer or a check-in. "what" tells which of the two sentences to use.
function onlyYou(ctx: Ctx, what: 'answer' | 'check-in') {
  const medics = medicsOf(ctx)
  if (medics.length === 0) return what === 'answer' ? t('Only you see your answer.') : t('Only you see this.')
  const names = list(medics.map((member) => member.name))
  return what === 'answer' ? t('Only you and {names}, crew medical officer, see your answer.', { names }) : t('Only you and {names}, crew medical officer, see this.', { names })
}
// Who gets a message when the crew member answers yes. The server always tells the medical officers.
// "now" gives the sentence before the answer ("Nexxo tells"), "past" the sentence after it ("Nexxo told"). null: no other person gets a message.
function toldAfterYes(ctx: Ctx, rule: Rule, tense: 'now' | 'past') {
  const medics = medicsOf(ctx)
  const names = list(medics.map((member) => member.name))
  const ground = rule.escalate === 'flight_surgeon'
  if (medics.length && ground) {
    return tense === 'now'
      ? t('Nexxo tells {names}, crew medical officer, and the flight surgeons on the ground.', { names })
      : t('Nexxo told {names}, crew medical officer, and the flight surgeons on the ground.', { names })
  }
  if (medics.length) return tense === 'now' ? t('Nexxo tells {names}, crew medical officer.', { names }) : t('Nexxo told {names}, crew medical officer.', { names })
  if (ground) return tense === 'now' ? t('Nexxo tells the flight surgeons on the ground.') : t('Nexxo told the flight surgeons on the ground.')
  return null
}

// The value that started the question: the indicator of the rule and its newest reading.
function triggerOf(ctx: Ctx, rule: Rule): { indicator: Indicator; reading: Reading; usual?: number } | null {
  const id = RULE_INDICATOR[rule.id] ?? (rule.id.includes('co2') ? 'co2_partial_pressure' : undefined)
  const indicator = ctx.catalog.indicators.find((candidate) => candidate.id === id)
  if (!indicator) return null
  const who = indicator.kind === 'environment' ? 'env' : ctx.s.subject
  const reading = ctx.s.latest(who, indicator.id)
  if (!reading) return null
  return { indicator, reading, usual: who === 'env' ? undefined : ctx.snapshot.baselines[who]?.[indicator.id] }
}
// An open question is a caution or more, also when the value is normal again.
const statusOfCheckup = (ctx: Ctx, rule: Rule) => worst([triggerOf(ctx, rule)?.reading.status ?? 'normal', 'caution'])

export default function CheckupsSheet(ctx: Ctx) {
  const open = ctx.s.pending.length
  const [part, setPart] = useState<Part>(open > 0 ? 'questions' : 'daily')
  return (
    <div className="ck">
      {/* The title of the page, and the switch between the two parts. */}
      <header className="ck-head">
        <h1 className="ck-page-title display">{part === 'questions' ? t('Check-ups') : t('Daily check-in')}</h1>
        <div className="ck-switch" role="group" aria-label={t('Part of the check-ups')} data-part={part}>
          {/* The light piece under the selected part. It slides when the part changes. */}
          <span className="ck-switch-thumb" aria-hidden="true" />
          <button type="button" className="ck-switch-option" aria-pressed={part === 'questions'} onClick={() => setPart('questions')}>
            {t('Questions')} {open > 0 && <span className="count" aria-label={tn(open, '1 open', '{count} open')}>{open}</span>}
          </button>
          <button type="button" className="ck-switch-option" aria-pressed={part === 'daily'} onClick={() => setPart('daily')}>
            {t('Daily check-in')}
          </button>
        </div>
      </header>
      {part === 'questions' ? <Questions ctx={ctx} onDaily={() => setPart('daily')} /> : <Daily ctx={ctx} onQuestions={() => setPart('questions')} />}
    </div>
  )
}

// ---------- Part 1: the questions ----------

function Questions({ ctx, onDaily }: { ctx: Ctx; onDaily: () => void }) {
  const { s, snapshot, act } = ctx
  // The question that the crew member selected from the list, and the answer to show the result of.
  const [chosen, setChosen] = useState<number | null>(null)
  const [shown, setShown] = useState<number | null>(null)
  // The answer that is on its way to the server.
  const [picked, setPicked] = useState<{ id: number; value: Answer } | null>(null)
  const busy = picked !== null

  const newestHour = snapshot.mission.hour - 1
  const answered: Asked[] = [...s.answered].sort((a, b) => (b.answeredHour ?? 0) - (a.answeredHour ?? 0) || b.id - a.id)
  const current: Asked | undefined = s.pending.find((checkup) => checkup.id === chosen) ?? s.pending[0]
  // Show a result after each answer. With no open question, show the newest answer of the last mission day.
  const result = answered.find((checkup) => checkup.id === shown) ?? (current ? undefined : answered.find((checkup) => (checkup.answeredHour ?? -1) > newestHour - 24))
  const older = answered.filter((checkup) => checkup !== result).slice(0, 8)

  async function answer(checkup: Asked, value: Answer) {
    setPicked({ id: checkup.id, value })
    // Select the result before the server answers. Then the result shows at the same moment as the new data, and no other question shows between.
    setShown(checkup.id)
    await act(`/checkups/${checkup.id}/answer`, { answer: value })
    setPicked(null)
    setChosen(null)
  }

  // Each view has its own key, so a new view comes in with a short movement.
  const view = result ? `result-${result.id}` : current ? `question-${current.id}` : 'none'
  useTopOnChange(view)

  return (
    <div className="ck-view" key={view}>
      {result ? (
        <Result ctx={ctx} checkup={result} onNext={() => setShown(null)} onDaily={onDaily} />
      ) : current ? (
        <Question
          ctx={ctx}
          checkup={current}
          busy={busy}
          picked={picked?.id === current.id ? picked.value : null}
          onAnswer={answer}
          onChoose={setChosen}
        />
      ) : (
        <section className="card ck-card">
          <h2 className="ck-title">{t('No open question')}</h2>
          <p className="ck-note muted">{t('Nexxo asks a question here when a value looks wrong.')}</p>
          <button type="button" className="btn btn-large ck-wide" onClick={onDaily}>
            {t('Do the daily check-in')}
          </button>
        </section>
      )}
      {older.length > 0 && (
        <section className="card ck-card ck-older" aria-label={t('Earlier answers')}>
          <span className="ck-label">{t('Earlier answers')}</span>
          <ul className="plain">
            {older.map((checkup) => (
              <li key={checkup.id}>
                {/* A row opens the result of that answer again, with the steps to do. */}
                <button type="button" className="ck-older-row" disabled={busy} onClick={() => setShown(checkup.id)}>
                  <span className="ck-older-answer display">{checkup.status === 'confirmed' ? t('Yes') : t('No')}</span>
                  <span className="ck-older-text">
                    <span className="ck-older-question">{checkup.rule.question}</span>
                    <span className="ck-older-rule">
                      {checkup.rule.title} · {formatTime(timeOfHour(snapshot.mission.startTime, checkup.answeredHour ?? checkup.hour))}
                    </span>
                  </span>
                  <Icon name="next" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

// Moves the page to its start when the view changes, so the crew member sees the top of the new view.
function useTopOnChange(view: string) {
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' })
  }, [view])
}

type QuestionProps = {
  ctx: Ctx
  checkup: Asked
  busy: boolean
  // The answer that the crew member selected, while the server saves it.
  picked: Answer | null
  onAnswer: (checkup: Asked, value: Answer) => void
  onChoose: (id: number) => void
}

function Question({ ctx, checkup, busy, picked, onAnswer, onChoose }: QuestionProps) {
  const { s, snapshot } = ctx
  const { rule } = checkup
  const position = s.pending.findIndex((candidate) => candidate.id === checkup.id) + 1
  const others = s.pending.filter((candidate) => candidate.id !== checkup.id)
  const trigger = triggerOf(ctx, rule)
  const told = toldAfterYes(ctx, rule, 'now')
  const asked = timeOfHour(snapshot.mission.startTime, checkup.hour)
  const answerClass = (value: Answer) => `ck-answer${value === 'confirmed' ? ' ck-answer-yes' : ''}${picked === value ? ' ck-answer-picked' : ''}`

  return (
    <>
      <div className="ck-progress">
        <span className="ck-progress-text">
          {t('Check-up {position} of {total}', { position, total: s.pending.length })}
        </span>
        <span className="ck-pips" aria-hidden="true">
          {s.pending.map((candidate) => (
            <span key={candidate.id} className={candidate.id === checkup.id ? 'ck-pip ck-pip-on' : 'ck-pip'} />
          ))}
        </span>
      </div>

      <section className="card-inverse ck-card ck-ask" aria-label={t('Question')} aria-busy={busy}>
        <div className="ck-row">
          <span className="ck-label">{rule.title}</span>
          <StatusBadge status={statusOfCheckup(ctx, rule)} />
        </div>
        <h2 className="ck-question display">{rule.question}</h2>
        <div className="ck-answers">
          <button type="button" className={answerClass('confirmed')} disabled={busy} onClick={() => onAnswer(checkup, 'confirmed')}>
            <span className="ck-answer-word display">{t('Yes')}</span>
            <span className="ck-answer-note">{t('I have: {symptom}', { symptom: t(rule.symptom.name) })}</span>
          </button>
          <button type="button" className={answerClass('dismissed')} disabled={busy} onClick={() => onAnswer(checkup, 'dismissed')}>
            <span className="ck-answer-word display">{t('No')}</span>
            <span className="ck-answer-note">{t('I feel fine')}</span>
          </button>
        </div>
        <p className="ck-foot muted">{onlyYou(ctx, 'answer')}</p>
      </section>

      <section className="card ck-card ck-why" aria-label={t('Why Nexxo asks')}>
        <div className="ck-row ck-row-center">
          <span className="ck-label">{t('Why Nexxo asks')}</span>
          {trigger ? (
            <span className="ck-trigger-tags">
              <StatusBadge status={trigger.reading.status} />
              <SourceTag source={trigger.reading.source} />
            </span>
          ) : (
            <span className="ck-time">{t('Asked {time}', { time: formatTime(asked) })}</span>
          )}
        </div>
        {/* On a wide page the value and the reason sit side by side. */}
        <div className="ck-why-top">
          {trigger && (
            <span className="ck-big display">
              {fmt(trigger.reading.value, trigger.indicator.decimals)}
              <span className="ck-unit"> {trigger.indicator.unit}</span>
            </span>
          )}
          <p className="ck-reason">{checkup.reason}</p>
        </div>
        {trigger && <Gauge {...trigger} />}
        {trigger && <Facts {...trigger} asked={asked} />}
      </section>

      <section className="card ck-card" aria-label={t('After your answer')}>
        <span className="ck-label">{t('After your answer')}</span>
        <div className="ck-outcomes">
          <div className="ck-outcome">
            <span className="ck-outcome-word display">{t('If yes')}</span>
            <ul className="ck-outcome-lines">
              <li>{t('Nexxo records the symptom "{symptom}".', { symptom: t(rule.symptom.name) })}</li>
              {told && <li>{told}</li>}
              <li>{t('Nexxo tells you what to do: {action}', { action: rule.action })}</li>
            </ul>
          </div>
          <div className="ck-outcome">
            <span className="ck-outcome-word display">{t('If no')}</span>
            <ul className="ck-outcome-lines">
              <li>{t('Nexxo records that you feel fine.')}</li>
            </ul>
          </div>
        </div>
        <p className="ck-foot muted">{t('The other crew members do not get a message. Your answer is in the mission log.')}</p>
      </section>

      {others.length > 0 && (
        <section className="card ck-card ck-others" aria-label={t('Other open questions')}>
          <div className="ck-row">
            <span className="ck-label">{t('Other open questions')}</span>
            <span className="ck-count display">{others.length}</span>
          </div>
          <div className="ck-list">
            {others.map((other) => (
              <button type="button" key={other.id} className="ck-other" disabled={busy} onClick={() => onChoose(other.id)}>
                <span className="ck-other-text">
                  <StatusBadge status={statusOfCheckup(ctx, other.rule)} />
                  <span className="ck-other-rule">{other.rule.title}</span>
                  <span className="ck-other-question">{other.rule.question}</span>
                </span>
                <Icon name="next" />
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  )
}

type Trigger = { indicator: Indicator; reading: Reading; usual?: number }

const percent = (share: number) => `${(clamp(share, 0, 1) * 100).toFixed(1)}%`

// The range bar of the question: the normal zone, the alert limits, the usual value and the newest value, each with its number.
// The shared RangeBar has no numbers and no labels, so the sheet has its own bar.
function Gauge({ indicator, reading, usual }: Trigger) {
  const [normalLow, normalHigh] = indicator.normal
  const points = [...indicator.normal, ...indicator.caution, reading.value, usual].filter((point): point is number => point != null)
  const least = Math.min(...points)
  const most = Math.max(...points)
  const span = most - least || Math.abs(most) * 0.5 || 1
  let low = least - span * 0.25
  let high = most + span * 0.25
  // A range with one open side gets half of the bar, so the bar shows how far the value is from the limit.
  if (normalLow === null && normalHigh !== null) low = Math.min(low, normalHigh - (high - normalHigh))
  if (normalHigh === null && normalLow !== null) high = Math.max(high, normalLow + (normalLow - low))
  // The ends of the bar are round numbers.
  const rough = (high - low) / 4
  const power = 10 ** Math.floor(Math.log10(rough))
  const step = ([1, 2, 5].find((factor) => factor * power >= rough) ?? 10) * power
  low = Math.floor(low / step + 1e-9) * step
  high = Math.ceil(high / step - 1e-9) * step
  if (least >= 0) low = Math.max(0, low)
  // A score has fixed ends, for example 1 and 5.
  const top = SCORE_TOP[indicator.id]
  if (top) [low, high] = [1, top]

  const at = (value: number) => percent((value - low) / (high - low))
  const text = (value: number) => fmt(value, indicator.decimals)
  const range = formatRange(indicator.normal, indicator.unit)
  // An alert limit is the end of the caution range, when it is not also the end of the normal range.
  const limits = indicator.caution.filter((limit, side): limit is number => limit !== null && limit !== indicator.normal[side] && limit > low && limit < high)
  const zoneStart = normalLow ?? low
  const zoneEnd = normalHigh ?? high
  return (
    <div
      className="ck-gauge"
      role="img"
      aria-label={[
        t('Range bar from {low} to {high} {unit}.', { low: text(low), high: text(high), unit: indicator.unit }),
        t('The value is {value}.', { value: text(reading.value) }),
        t('Normal: {range}.', { range }),
        ...(usual !== undefined ? [t('Your usual value: {value}.', { value: text(usual) })] : []),
      ].join(' ')}
    >
      <div className="ck-gauge-plot" style={{ '--at': at(reading.value) } as CSSProperties}>
        <span className={`ck-gauge-value display status-${reading.status}`}>{text(reading.value)}</span>
        <span className="ck-gauge-track" />
        <span className="ck-gauge-zone" style={{ left: at(zoneStart), right: `calc(100% - ${at(zoneEnd)})` }} />
        {limits.map((limit) => (
          <span key={limit} className="ck-gauge-limit" style={{ left: at(limit) }} />
        ))}
        {usual !== undefined && <span className="ck-gauge-usual" style={{ '--at': at(usual) } as CSSProperties} />}
        <span className={`ck-gauge-dot status-bg-${reading.status}`} />
      </div>
      <div className="ck-gauge-ends">
        <span>{text(low)}</span>
        <span>
          {text(high)} {indicator.unit}
        </span>
      </div>
      <div className="ck-gauge-keys">
        <span>
          <span className="ck-key-zone" />
          {t('normal, {range}', { range })}
        </span>
        {limits.length > 0 && (
          <span>
            <span className="ck-key-limit" />
            {tn(limits.length, 'alert limit, {limits}', 'alert limits, {limits}', { limits: numberList(limits.map((limit) => limit.toLocaleString(lang))) })}
          </span>
        )}
        {usual !== undefined && (
          <span>
            <span className="ck-key-usual" />
            {t('your usual value, {value}', { value: text(usual) })}
          </span>
        )}
      </div>
    </div>
  )
}

// Small tiles with the facts about the value: how far it is from normal, the usual value, and the time of the question.
function Facts({ indicator, reading, usual, asked }: Trigger & { asked: Date }) {
  const [low, high] = indicator.normal
  const above = high !== null && reading.value > high ? reading.value - high : 0
  const below = low !== null && reading.value < low ? low - reading.value : 0
  // The distance with the decimals that the page shows. A distance that shows as zero gets no tile.
  const distance = Number((above || below).toFixed(indicator.decimals))
  return (
    <div className="ck-tiles">
      {distance > 0 && (
        <div className="ck-tile">
          <span className="ck-tile-value display">{valueText(indicator, distance)}</span>
          <span className="ck-tile-note">{above ? t('Above the normal range.') : t('Below the normal range.')}</span>
        </div>
      )}
      {usual !== undefined && (
        <div className="ck-tile">
          <span className="ck-tile-value display">{valueText(indicator, usual)}</span>
          <span className="ck-tile-note">{t('Your usual value.')}</span>
        </div>
      )}
      <div className="ck-tile">
        <span className="ck-tile-value display">{formatTime(asked, false)}</span>
        <span className="ck-tile-note">{t('Nexxo asked this question on {date}.', { date: dayText(asked) })}</span>
      </div>
    </div>
  )
}

// The newest value of the indicator that started the question, with the normal range. The short form, for the result.
function TriggerValue({ indicator, reading, usual }: Trigger) {
  return (
    <div className="ck-trigger">
      <div className="ck-row ck-row-end">
        <span className="ck-trigger-value display">
          {fmt(reading.value, indicator.decimals)}
          <span className="ck-unit"> {indicator.unit}</span>
        </span>
        <span className="ck-trigger-tags">
          <StatusBadge status={reading.status} />
          <SourceTag source={reading.source} />
        </span>
      </div>
      <div className="ck-range">
        <RangeBar indicator={indicator} value={reading.value} status={reading.status} baseline={usual} />
      </div>
      <p className="ck-note muted">
        {t('{label}, the newest value.', { label: indicator.label })} {t('Normal: {range}.', { range: formatRange(indicator.normal, indicator.unit) })}
        {usual !== undefined && ` ${t('Your usual value: {value}.', { value: valueText(indicator, usual) })}`}
      </p>
    </div>
  )
}

// What Nexxo did with one answer: what it recorded, the steps to do, and who it told.
function Result({ ctx, checkup, onNext, onDaily }: { ctx: Ctx; checkup: Asked; onNext: () => void; onDaily: () => void }) {
  const { s, snapshot, crewId } = ctx
  const { rule } = checkup
  const yes = checkup.status === 'confirmed'
  const answeredHour = checkup.answeredHour ?? checkup.hour
  const trigger = triggerOf(ctx, rule)
  // "Do this. Then do that." becomes one step for each sentence.
  const steps = rule.action.split(/(?<=[.!?])\s+/).filter(Boolean)
  // The messages that the server sent for this answer. One row for each person.
  const topic = `crew:${crewId}:symptom:${rule.symptom.name}`
  const messages = snapshot.notifications
    .filter((notification) => yes && notification.topic === topic && notification.hour === answeredHour)
    .filter((notification, index, all) => all.findIndex((other) => other.crewId === notification.crewId) === index)
  const sentAt = formatTime(timeOfHour(snapshot.mission.startTime, answeredHour), false)
  const answeredAt = formatTime(timeOfHour(snapshot.mission.startTime, answeredHour))
  const told = toldAfterYes(ctx, rule, 'past')

  return (
    <>
      <div className="ck-result-head">
        <span className="ck-done">
          <span className="ck-done-mark">
            <Icon name="check" />
          </span>
          {yes ? t('You answered yes · {time}', { time: answeredAt }) : t('You answered no · {time}', { time: answeredAt })}
        </span>
        <h2 className="ck-headline display">{yes ? t('Recorded. Do these steps, {name}.', { name: firstName(s.member?.name) }) : t('Recorded. You feel fine.')}</h2>
      </div>

      <section className="card ck-card" aria-label={t('What Nexxo recorded')}>
        <div className="ck-row">
          <span className="ck-label">{t('Nexxo recorded')}</span>
          {yes && <StatusBadge status={worst([trigger?.reading.status ?? 'normal', 'caution'])} />}
        </div>
        <span className="ck-recorded display">{yes ? t(rule.symptom.name) : t('No symptom')}</span>
        <p className="ck-reason">
          {yes ? `${SYMPTOM_OF_PART[rule.symptom.bodyPart]} ` : ''}
          {yes ? t('You answered yes to "{question}"', { question: rule.question }) : t('You answered no to "{question}"', { question: rule.question })}
        </p>
        <p className="ck-note muted">
          {rule.title}. {checkup.reason}
        </p>
        {yes && trigger && <TriggerValue {...trigger} />}
        {!yes && <p className="ck-note muted">{t('Nexxo can ask again later if the value stays wrong.')}</p>}
      </section>

      {yes && (
        <section className="card-inverse ck-card ck-do" aria-label={t('Do now')}>
          <span className="ck-label">{t('Do now')}</span>
          <ol className="ck-steps">
            {steps.map((step, index) => (
              <li key={step}>
                <span className="ck-num display">{index + 1}</span>
                <span className="ck-step-text display">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="card ck-card" aria-label={t('Who Nexxo told')}>
        <span className="ck-label">{t('Nexxo told')}</span>
        {messages.map((message) => {
          const member = snapshot.crew.find((candidate) => candidate.id === message.crewId)
          return (
            <div className="ck-told" key={message.id}>
              <span className="ck-avatar" aria-hidden="true">{member ? initials(member.name) : t('FS')}</span>
              <span className="ck-told-who">
                <span className="ck-told-name">{member ? (member.id === crewId ? t('{name} (you)', { name: member.name }) : member.name) : t('Flight surgeons')}</span>
                <span className="ck-told-role">{member ? roleLabel(ctx, member.role) : t('On the ground')}</span>
              </span>
              <span className="ck-told-state">
                <Icon name="check" /> {message.readHour === null ? t('Sent {time}', { time: sentAt }) : t('Read')}
              </span>
            </div>
          )
        })}
        {yes && messages.length === 0 && <p className="ck-reason">{told ?? t('Nexxo told no other person.')}</p>}
        {!yes && <p className="ck-reason">{t('Nobody. Nexxo sends a message only when you answer yes.')}</p>}
        <p className="ck-note muted">
          {yes ? `${t('The other crew members do not get this message.')} ` : ''}
          {t('Your answer is in the mission log.')}
        </p>
      </section>

      {s.pending.length > 0 ? (
        // The light card "Do now" is the main thing after a yes. Then this button is the quiet one.
        <button type="button" className={`btn btn-large ck-wide ${yes ? 'ck-outline' : 'btn-primary'}`} onClick={onNext}>
          {tn(s.pending.length, 'Next check-up · 1 left', 'Next check-up · {count} left')}
        </button>
      ) : (
        <div className="ck-allclear">
          <p className="ck-note muted">{t('No open question now.')}</p>
          <button type="button" className="btn btn-large ck-wide" onClick={onDaily}>
            {t('Go to the daily check-in')}
          </button>
        </div>
      )}
    </>
  )
}

// ---------- Part 2: the daily check-in ----------

type SentValue = { indicator: Indicator; value: number }
type Sent = { hour: number; values: SentValue[]; symptoms: typeof COMMON_SYMPTOMS }

function Daily({ ctx, onQuestions }: { ctx: Ctx; onQuestions: () => void }) {
  const { s, catalog, snapshot, crewSeries, crewId, act } = ctx
  const find = (id: string) => catalog.indicators.find((indicator) => indicator.id === id)
  const sleepIndicator = find('sleep_duration')
  const scores = SCORE_IDS.map(find).filter((indicator): indicator is Indicator => indicator !== undefined)
  const sleepReading = s.latest(s.subject, 'sleep_duration')

  // The sleep time in tenths of an hour, so the steps of 0.1 stay exact.
  const [tenths, setTenths] = useState(() => {
    const [low, high] = sleepIndicator?.normal ?? [null, null]
    const start = sleepReading?.value ?? ((low ?? 0) + (high ?? low ?? 0)) / 2
    return clamp(Math.round(start * 10), 0, SLEEP_MAX_TENTHS)
  })
  const [marks, setMarks] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(
      scores.map((indicator) => {
        const reading = s.latest(s.subject, indicator.id)
        return [indicator.id, reading ? clamp(Math.round(reading.value), 1, topOf(indicator)) : null]
      }),
    ),
  )
  const [picked, setPicked] = useState<string[]>([])
  const [sent, setSent] = useState<Sent | 'sending' | null>(null)

  // One mission day is 24 hours. A day counts when it has a value that the crew member typed in.
  const newestHour = snapshot.mission.hour - 1
  const today = Math.floor(newestHour / 24)
  const crewHours = Object.values(crewSeries).flatMap((points) => points.filter((point) => point[2] === 'crew').map((point) => point[0]))
  const crewDays = new Set(crewHours.map((hour) => Math.floor(hour / 24)))
  const hoursToday = crewHours.filter((hour) => Math.floor(hour / 24) === today)
  let streak = 0
  for (let day = crewDays.has(today) ? today : today - 1; crewDays.has(day); day--) streak++

  const sleep = tenths / 10
  const values: SentValue[] = [
    ...(sleepIndicator ? [{ indicator: sleepIndicator, value: sleep }] : []),
    ...scores.flatMap((indicator) => (marks[indicator.id] == null ? [] : [{ indicator, value: marks[indicator.id]! }])),
  ]
  const symptoms = COMMON_SYMPTOMS.filter((symptom) => picked.includes(symptom.name))
  const isOpen = (name: string) => s.mySymptoms.some((symptom) => symptom.name === name)

  async function send() {
    setSent('sending')
    for (const { indicator, value } of values) await act('/readings', { subject: s.subject, indicator: indicator.id, value })
    for (const symptom of symptoms) await act('/symptoms', { crewId, bodyPart: symptom.bodyPart, name: symptom.name })
    setSent({ hour: newestHour, values, symptoms })
  }

  const done = sent !== null && sent !== 'sending'
  useTopOnChange(done ? 'sent' : 'form')
  if (done) {
    return (
      <div className="ck-view" key="sent">
        <Confirmation ctx={ctx} sent={sent} streak={streak} onEdit={() => setSent(null)} onQuestions={onQuestions} />
      </div>
    )
  }

  const busy = sent === 'sending'
  const [mood, ...moreScores] = scores
  return (
    <div className="ck-view" key="form">
      {/* The title "Daily check-in" is the title of the page, above. */}
      <div className="ck-daily-head">
        <p className="ck-sub muted">{t('Flight day {day} · 3 answers · about 2 minutes', { day: missionDay(newestHour) })}</p>
        <Streak count={streak} />
      </div>
      {hoursToday.length > 0 && (
        <p className="ck-today">
          <span className="ck-done-mark">
            <Icon name="check" />
          </span>
          {t('You sent values today at {time}. Send again only to correct a value.', { time: formatTime(timeOfHour(snapshot.mission.startTime, Math.max(...hoursToday)), false) })}
        </p>
      )}

      {sleepIndicator && (
        <section className="card ck-card ck-sleep-card" aria-label={t('Sleep')}>
          <div className="ck-row">
            <h3 className="ck-title">{t('1. How long did you sleep?')}</h3>
            <StatusBadge status={statusOf(sleepIndicator, sleep)} />
          </div>
          {/* On a wide page the number and the bars of the last nights sit side by side. */}
          <div className="ck-sleep-row">
            <div className="ck-stepper">
              <HoldButton label={t('Less sleep')} disabled={busy} onStep={() => setTenths((current) => clamp(current - 1, 0, SLEEP_MAX_TENTHS))}>
                <Icon name="minus" />
              </HoldButton>
              {/* A value of 10.0 or more has one more digit. It gets a smaller size, so it fits between the buttons on a phone. */}
              <output className={tenths >= 100 ? 'ck-sleep ck-sleep-long display' : 'ck-sleep display'} aria-live="polite">
                {fmt(sleep, 1)}
                <span className="ck-unit"> {sleepIndicator.unit}</span>
              </output>
              <HoldButton label={t('More sleep')} disabled={busy} onStep={() => setTenths((current) => clamp(current + 1, 0, SLEEP_MAX_TENTHS))}>
                <Icon name="plus" />
              </HoldButton>
            </div>
            <Nights indicator={sleepIndicator} points={crewSeries.sleep_duration ?? []} />
          </div>
          <p className="ck-hint muted">
            {sleepReading ? (
              <>
                {t('The newest value in your record is {value}', { value: valueText(sleepIndicator, sleepReading.value) })} <SourceTag source={sleepReading.source} /> {t('Change the number if it is wrong. Hold a button to move faster.')}
              </>
            ) : (
              t('Your record has no sleep value yet. Set the number.')
            )}
          </p>
        </section>
      )}

      {mood && (
        <section className="card ck-card" aria-label={t('Mood')}>
          <div className="ck-row">
            <h3 className="ck-title">{t('2. How is your mood now?')}</h3>
            {marks[mood.id] != null && <StatusBadge status={statusOf(mood, marks[mood.id]!)} />}
          </div>
          <Scale indicator={mood} value={marks[mood.id] ?? null} disabled={busy} onChange={(value) => setMarks((current) => ({ ...current, [mood.id]: value }))} />
          {moreScores.map((indicator) => (
            <div className="ck-more" key={indicator.id}>
              <div className="ck-row">
                <h4 className="ck-subtitle">{SCORE_QUESTION[indicator.id] ?? indicator.label}</h4>
                {marks[indicator.id] != null && <StatusBadge status={statusOf(indicator, marks[indicator.id]!)} />}
              </div>
              <Scale indicator={indicator} value={marks[indicator.id] ?? null} disabled={busy} onChange={(value) => setMarks((current) => ({ ...current, [indicator.id]: value }))} />
            </div>
          ))}
        </section>
      )}

      <section className="card ck-card" aria-label={t('Symptoms')}>
        <h3 className="ck-title">{t('3. Do you have a new symptom?')}</h3>
        <div className="ck-symptoms">
          <button type="button" className="ck-symptom ck-symptom-none" aria-pressed={picked.length === 0} disabled={busy} onClick={() => setPicked([])}>
            <span className="ck-symptom-name">{t('No, nothing new')}</span>
            {picked.length === 0 && <Icon name="check" />}
          </button>
          {COMMON_SYMPTOMS.map((symptom) => {
            const on = picked.includes(symptom.name)
            const open = isOpen(symptom.name)
            return (
              <button
                type="button"
                key={symptom.name}
                className="ck-symptom"
                aria-pressed={on}
                disabled={busy || open}
                onClick={() => setPicked((current) => (on ? current.filter((name) => name !== symptom.name) : [...current, symptom.name]))}
              >
                <span className="ck-symptom-text">
                  <span className="ck-symptom-name">{t(symptom.name)}</span>
                  <span className="ck-symptom-part">{open ? t('Open already') : t(BODY_PART_LABEL[symptom.bodyPart])}</span>
                </span>
                {on && <Icon name="check" />}
              </button>
            )
          })}
        </div>
        <p className="ck-note muted">{t('You can select more than one. For another symptom, use the Body screen.')}</p>
      </section>

      <section className="card-inverse ck-card ck-summary" aria-label={t('Send your check-in')}>
        <span className="ck-label">{t('Your check-in')}</span>
        <dl className="ck-lines">
          {values.map(({ indicator, value }) => (
            <div key={indicator.id}>
              <dt>{indicator.id === 'sleep_duration' ? t('Sleep') : indicator.label}</dt>
              <dd>
                <StatusBadge status={statusOf(indicator, value)} />
                <span className="ck-line-value display">{valueText(indicator, value)}</span>
              </dd>
            </div>
          ))}
          <div>
            <dt>{t('New symptoms')}</dt>
            <dd>
              <span className="ck-line-value display">{symptoms.length ? symptoms.map((symptom) => t(symptom.name)).join(', ') : t('None')}</span>
            </dd>
          </div>
        </dl>
        <button type="button" className="btn btn-primary ck-send" disabled={busy} onClick={send}>
          <span>{busy ? t('Sending…') : t('Send check-in')}</span>
          <Icon name="arrow" />
        </button>
        <p className="ck-note muted">{onlyYou(ctx, 'check-in')}</p>
      </section>
    </div>
  )
}

function Streak({ count }: { count: number }) {
  return (
    <div className="ck-streak" title={t('Mission days in a row with a value that you typed in')}>
      <span className="ck-streak-count display">{count}</span>
      <span className="ck-streak-text muted">{tn(count, 'day in a row', 'days in a row')}</span>
    </div>
  )
}

// The highest value of a score, for example 5 for a score from 1 to 5.
function topOf(indicator: Indicator) {
  return SCORE_TOP[indicator.id] ?? 5
}

// A row of large buttons, one for each value of a score.
function Scale({ indicator, value, disabled, onChange }: { indicator: Indicator; value: number | null; disabled: boolean; onChange: (value: number) => void }) {
  const top = topOf(indicator)
  // The good end is the end that the normal range reaches.
  const highIsGood = indicator.normal[1] === null || indicator.normal[1] >= top
  const words = top === 5 ? (highIsGood ? WORDS_GOOD_HIGH : WORDS_LEVEL) : null
  return (
    <div className="ck-scale-box">
      <div className="ck-scale" role="group" aria-label={indicator.label}>
        {Array.from({ length: top }, (_, index) => index + 1).map((mark) => (
          <button type="button" key={mark} className="ck-score" aria-pressed={value === mark} aria-label={words ? `${mark}, ${words[mark - 1]}` : String(mark)} disabled={disabled} onClick={() => onChange(mark)}>
            <span className="ck-score-mark display">{mark}</span>
            {words && <span className="ck-score-word">{words[mark - 1]}</span>}
          </button>
        ))}
      </div>
      <p className="ck-note muted">
        {t('Normal: {range}.', { range: formatRange(indicator.normal, indicator.unit) })} {t('{mark} is the good end.', { mark: highIsGood ? top : 1 })}
      </p>
    </div>
  )
}

// A round button that repeats its step while the crew member holds it.
function HoldButton({ label, disabled, onStep, children }: { label: string; disabled: boolean; onStep: () => void; children: ReactNode }) {
  const timer = useRef<number | undefined>(undefined)
  const stop = () => {
    window.clearTimeout(timer.current)
    window.clearInterval(timer.current)
  }
  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      window.clearInterval(timer.current)
    },
    [],
  )
  const start = () => {
    stop()
    onStep()
    timer.current = window.setTimeout(() => {
      timer.current = window.setInterval(onStep, 90)
    }, 450)
  }
  return (
    <button
      type="button"
      className="ck-step"
      aria-label={label}
      disabled={disabled}
      onPointerDown={(event) => event.button === 0 && start()}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      // A click with detail 0 comes from the keyboard. A pointer already did its step.
      onClick={(event) => event.detail === 0 && onStep()}
    >
      {children}
    </button>
  )
}

const BAR_HEIGHT = 108

// Small bars for the sleep of the last 7 nights. The band shows the normal range.
function Nights({ indicator, points }: { indicator: Indicator; points: [number, number, string][] }) {
  // Keep the newest value of each mission day.
  const byDay = new Map<number, [number, number, string]>()
  for (const point of points) byDay.set(Math.floor(point[0] / 24), point)
  const nights = [...byDay.values()].sort((a, b) => a[0] - b[0]).slice(-7)
  if (nights.length === 0) return null

  const [low, high] = indicator.normal
  const top = Math.max(...nights.map((night) => night[1]), high ?? 0, 1)
  const px = (value: number) => Math.round((value / top) * BAR_HEIGHT)
  const text = (value: number) => fmt(value, indicator.decimals)
  const range = formatRange(indicator.normal, indicator.unit)
  return (
    <figure className="ck-nights">
      <div
        className="ck-bars"
        role="img"
        aria-label={`${tn(nights.length, 'Sleep of the last 1 night: {values} {unit}.', 'Sleep of the last {count} nights: {values} {unit}.', { values: numberList(nights.map((night) => text(night[1]))), unit: indicator.unit })} ${t('Normal: {range}.', { range })}`}
      >
        <span className="ck-zone" style={{ bottom: px(low ?? 0), height: px((high ?? top) - (low ?? 0)) }} />
        {nights.map((night, index) => {
          // The newest bar has the color of its status when the value is not normal.
          const status = statusOf(indicator, night[1])
          const newest = index === nights.length - 1
          return (
            <span key={night[0]} className={newest ? 'ck-bar ck-bar-newest' : 'ck-bar'} title={t('Flight day {day}: {value} {unit}', { day: missionDay(night[0]), value: text(night[1]), unit: indicator.unit })}>
              <span className="ck-bar-value">{text(night[1])}</span>
              <span className={newest && status !== 'normal' ? `ck-bar-fill status-bg-${status} status-${status}` : 'ck-bar-fill'} style={{ height: px(night[1]) }} />
            </span>
          )
        })}
      </div>
      <div className="ck-bar-days" aria-hidden="true">
        {nights.map((night, index) => (
          <span key={night[0]} className={index === nights.length - 1 ? 'ck-bar-day-newest' : undefined}>
            {missionDay(night[0])}
          </span>
        ))}
      </div>
      <figcaption className="ck-nights-keys">
        <span>
          <span className="ck-zone-key" aria-hidden="true" />
          {t('normal, {range}', { range })}
        </span>
        <span>{t('Flight days {first} to {last}', { first: missionDay(nights[0][0]), last: missionDay(nights[nights.length - 1][0]) })}</span>
      </figcaption>
    </figure>
  )
}

// The calm page after the send: what Nexxo saved, and what happens next.
function Confirmation({ ctx, sent, streak, onEdit, onQuestions }: { ctx: Ctx; sent: Sent; streak: number; onEdit: () => void; onQuestions: () => void }) {
  const { s, snapshot, crewSeries, crewId } = ctx
  const medics = medicsOf(ctx)
  // Check in the data of the server that each value is saved.
  const savedValue = ({ indicator, value }: SentValue) => {
    const reading = s.latest(s.subject, indicator.id)
    if (reading && reading.source === 'crew' && reading.hour >= sent.hour && reading.value === value) return true
    return (crewSeries[indicator.id] ?? []).some((point) => point[2] === 'crew' && point[0] >= sent.hour && point[1] === value)
  }
  const savedSymptom = (name: string) => snapshot.symptoms.some((symptom) => symptom.crewId === crewId && symptom.name === name && symptom.hour >= sent.hour)
  const allSaved = sent.values.every(savedValue) && sent.symptoms.every((symptom) => savedSymptom(symptom.name))
  const state = (saved: boolean) =>
    saved ? (
      <span className="ck-told-state">
        <Icon name="check" /> {t('Saved')}
      </span>
    ) : (
      <span className="ck-told-state status-caution">▲ {t('Not saved')}</span>
    )
  const steps = [
    t('Nexxo saves your answers in your history.'),
    medics.length ? t('{names}, crew medical officer, can see them.', { names: list(medics.map((member) => member.name)) }) : null,
    t('Nexxo compares the values with your last 7 days. If a value looks wrong, Nexxo asks you a question.'),
  ].filter((step): step is string => step !== null)

  return (
    <>
      <div className="ck-daily-head">
        <div className="ck-result-head">
          <span className="ck-done">
            <span className="ck-done-mark">
              <Icon name="check" />
            </span>
            {t('Daily check-in · {time}', { time: formatTime(timeOfHour(snapshot.mission.startTime, sent.hour)) })}
          </span>
          <h2 className="ck-headline display">{t('Sent. Thank you, {name}.', { name: firstName(s.member?.name) })}</h2>
        </div>
        <Streak count={streak} />
      </div>

      <section className="card ck-card" aria-label={t('What you sent')}>
        <span className="ck-label">{t('You sent')}</span>
        <dl className="ck-lines">
          {sent.values.map((item) => (
            <div key={item.indicator.id}>
              <dt>
                {item.indicator.id === 'sleep_duration' ? t('Sleep') : item.indicator.label}
                <StatusBadge status={statusOf(item.indicator, item.value)} />
              </dt>
              <dd>
                <span className="ck-line-value display">{valueText(item.indicator, item.value)}</span>
                {state(savedValue(item))}
              </dd>
            </div>
          ))}
          {sent.symptoms.map((symptom) => (
            <div key={symptom.name}>
              <dt>{t('New symptom · {part}', { part: t(BODY_PART_LABEL[symptom.bodyPart]) })}</dt>
              <dd>
                <span className="ck-line-value display">{t(symptom.name)}</span>
                {state(savedSymptom(symptom.name))}
              </dd>
            </div>
          ))}
          {sent.symptoms.length === 0 && (
            <div>
              <dt>{t('New symptoms')}</dt>
              <dd>
                <span className="ck-line-value display">{t('None')}</span>
              </dd>
            </div>
          )}
        </dl>
        {!allSaved && <p className="ck-note status-caution">{t('A value is not saved. Check the link to the server, then send again.')}</p>}
      </section>

      <section className="card ck-card" aria-label={t('What happens next')}>
        <span className="ck-label">{t('What happens next')}</span>
        <ol className="ck-steps ck-steps-quiet">
          {steps.map((step, index) => (
            <li key={step}>
              <span className="ck-num display">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        {sent.symptoms.length > 0 && <p className="ck-note muted">{t('Nexxo also looks in the data for the possible causes of a new symptom, and tells the crew medical officer.')}</p>}
      </section>

      {s.pending.length > 0 && (
        <button type="button" className="btn btn-large btn-primary ck-wide" onClick={onQuestions}>
          {tn(s.pending.length, 'Answer 1 open question', 'Answer {count} open questions')}
        </button>
      )}
      <button type="button" className="btn btn-large ck-wide" onClick={onEdit}>
        {t('Change my answers')}
      </button>
    </>
  )
}
