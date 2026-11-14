// The Companion home: Nexxo talks to the crew member, one question at a time.
// No language model writes this talk. Fixed rules build each message from the data in "ctx".
// Only the insight message comes from a model, and it has a clear label.
import { useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { formatDay, formatNumber, formatRange, formatTime, timeOfHour, type Indicator, type Point, type Rule, type Status } from '../api.ts'
import { RangeBar } from '../components/RangeBar.tsx'
import { SourceTag, StatusBadge } from '../components/StatusBadge.tsx'
import type { Ctx } from '../context.ts'
import { firstName, greeting, type Item } from '../derive.ts'
import { fmt, t, tn } from '../i18n.ts'
import { symptomLabel } from '../symptoms.ts'
import './companion.css'

const WEEK_HOURS = 168
// The talk shows this many values and this many past answers, so it stays short.
const MAX_ITEMS = 3
const MAX_PAST = 3
const ANSWER_WORD = { confirmed: t('Yes'), dismissed: t('No, I feel fine') } as const
const URGENCY_WORD = { now: t('Now'), today: t('Today'), routine: t('When you have time') } as const

const dayOf = (startTime: string, hour: number) => formatDay(timeOfHour(startTime, hour))

// One sentence that says how far the value is from normal. It names the limit, so the reader can compare.
function meaning(indicator: Indicator, value: number, status: Status) {
  const [low, high] = indicator.normal
  const side = high !== null && value > high ? 'above' : low !== null && value < low ? 'below' : null
  if (!side) return ''
  const limit = indicator.caution[side === 'above' ? 1 : 0]
  if (status === 'alert' && limit !== null) {
    const values = { limit: formatNumber(limit), unit: indicator.unit }
    return side === 'above' ? t('This is above the alert limit of {limit} {unit}.', values) : t('This is below the alert limit of {limit} {unit}.', values)
  }
  return side === 'above' ? t('This is above the normal range.') : t('This is below the normal range.')
}

// A small line of the last 7 days. The band is the normal range. The dot is the newest value.
function WeekLine({ indicator, points, status, startTime }: { indicator: Indicator; points: Point[]; status: Status; startTime: string }) {
  const [active, setActive] = useState<number | null>(null)
  const values = points.map((point) => point[1])
  const first = points[0]
  const last = points[points.length - 1]
  const [normalLow, normalHigh] = indicator.normal
  // The chart always includes the limit that the newest value crossed, so the band is visible.
  const crossed = normalHigh !== null && last[1] > normalHigh ? normalHigh : normalLow !== null && last[1] < normalLow ? normalLow : last[1]
  const lowest = Math.min(...values, crossed)
  const highest = Math.max(...values, crossed)
  const pad = (highest - lowest || 1) * 0.15
  const low = lowest - pad
  const high = highest + pad
  const x = (hour: number) => 3 + ((hour - first[0]) / (last[0] - first[0] || 1)) * 94
  const y = (value: number) => Math.min(100, Math.max(0, ((high - value) / (high - low)) * 100))
  const bandTop = y(normalHigh ?? high)
  const bandBottom = y(normalLow ?? low)
  const text = (point: Point) => `${fmt(point[1], indicator.decimals)} ${indicator.unit}`
  const shown = active === null ? null : points[active]

  // Finds the point that is nearest to the finger or the mouse.
  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const at = ((event.clientX - box.left) / box.width) * 100
    let nearest = 0
    points.forEach((point, index) => {
      if (Math.abs(x(point[0]) - at) < Math.abs(x(points[nearest][0]) - at)) nearest = index
    })
    setActive(nearest)
  }

  return (
    <div className="cp-spark">
      <div
        className={`cp-spark-plot cp-spark-${status}`}
        role="img"
        aria-label={t('{label}, last 7 days: from {first} on {firstDay} to {last} on {lastDay}.', {
          label: indicator.label,
          first: text(first),
          firstDay: dayOf(startTime, first[0]),
          last: text(last),
          lastDay: dayOf(startTime, last[0]),
        })}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setActive(null)}
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {bandBottom > bandTop && <rect className="cp-spark-band" x="0" y={bandTop} width="100" height={bandBottom - bandTop} />}
          {shown && <line className="cp-spark-cursor" x1={x(shown[0])} x2={x(shown[0])} y1="0" y2="100" vectorEffect="non-scaling-stroke" />}
          <polyline
            className="cp-spark-line"
            points={points.map((point) => `${x(point[0]).toFixed(2)},${y(point[1]).toFixed(2)}`).join(' ')}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {shown && shown !== last && <span className="cp-spark-dot cp-spark-dot-hover" style={{ left: `${x(shown[0])}%`, top: `${y(shown[1])}%` }} />}
        <span className={`cp-spark-dot cp-dot-${status} status-bg-${status}`} style={{ left: `${x(last[0])}%`, top: `${y(last[1])}%` }} />
      </div>
      <div className="cp-spark-dates">
        <span>{dayOf(startTime, first[0])}</span>
        <span className={shown ? 'cp-spark-read' : undefined}>
          {shown ? t('{time} UTC: {value}', { time: formatTime(timeOfHour(startTime, shown[0])), value: text(shown) }) : t('Last 7 days')}
        </span>
        <span>{dayOf(startTime, last[0])}</span>
      </div>
    </div>
  )
}

// A message of Nexxo. "label" is a small line above the text.
function Bubble({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="cp-bubble">
      {label && <span className="cp-bubble-label">{label}</span>}
      {children}
    </div>
  )
}

export default function CompanionHome({ snapshot, catalog, s, crewId, crewSeries, cabinSeries, act, open }: Ctx) {
  const [busy, setBusy] = useState(false)
  const questionRef = useRef<HTMLDivElement>(null)
  const { mission, llm } = snapshot
  const name = firstName(s.member?.name)
  const timeAt = (hour: number) => `${formatTime(timeOfHour(mission.startTime, hour))} UTC`
  const send = (path: string, body?: unknown) => {
    setBusy(true)
    void act(path, body).finally(() => setBusy(false))
  }

  // 1. The opening.
  const hours = snapshot.latest.filter((reading) => reading.subject === s.subject || reading.subject === 'env').map((reading) => reading.hour)
  const newestHour = hours.length ? Math.max(...hours) : null
  const count = s.items.length
  const state =
    newestHour === null
      ? ''
      : count === 0
        ? t('All your values and all cabin values are normal.')
        : tn(count, '1 thing needs your attention.', '{count} things need your attention.')

  // 2. The most important values. derive.ts sorts the alerts first.
  const items = s.items.slice(0, MAX_ITEMS)

  // 3. The past answers: the newest three, with the oldest first.
  const past = [...s.answered].sort((a, b) => (a.answeredHour ?? 0) - (b.answeredHour ?? 0) || a.id - b.id).slice(-MAX_PAST)
  const medic = snapshot.crew.find((member) => member.role === 'medical_officer')
  const medicIsMe = medic?.id === crewId
  // The server tells the crew medical officer about each "yes". Some rules also tell the ground.
  const told = (rule: Rule) => {
    const ground = rule.escalate === 'flight_surgeon'
    if (medic && !medicIsMe) {
      return ground
        ? t('I told {name}, the crew medical officer, and the flight surgeons on the ground.', { name: medic.name })
        : t('I told {name}, the crew medical officer.', { name: medic.name })
    }
    return ground ? t('I told the flight surgeons on the ground.') : ''
  }

  // 4. The open question.
  const question = s.pending[0]
  // The page moves to the question. It jumps if the person asked the system for less motion.
  const goToQuestion = () => {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    questionRef.current?.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' })
  }

  // 5. The insight of the language model, if the mission uses one.
  const insights = llm.enabled ? [...snapshot.insights].sort((a, b) => b.id - a.id) : []
  const insightRecord = insights.find((record) => record.status === 'done' && record.result)
  const insight = insightRecord?.result
  const newestFinished = insights.find((record) => record.status !== 'pending')
  const modelWorks = insights.some((record) => record.status === 'pending')
  const roleLabel = (role: string) => catalog.roles.find((candidate) => candidate.id === role)?.label ?? role

  // 6. The topics of the side column.
  const topics = [
    ...past.map((checkup) => ({ id: checkup.id, title: checkup.rule.title, mark: 'done' as const, note: t('You answered: {answer}', { answer: ANSWER_WORD[checkup.status === 'confirmed' ? 'confirmed' : 'dismissed'] }) })),
    ...s.pending.map((checkup, index) => ({
      id: checkup.id,
      title: checkup.rule.title,
      mark: index === 0 ? ('open' as const) : ('next' as const),
      note: index === 0 ? t('The question is open now') : t('Next'),
    })),
  ]

  const valueCard = (item: Item) => {
    const { indicator, reading } = item
    if (!indicator || !reading) return null
    const series = (item.where === 'Cabin' ? cabinSeries : crewSeries)[indicator.id] ?? []
    const week = series.filter((point) => point[0] > reading.hour - WEEK_HOURS && point[0] <= reading.hour)
    return (
      <div className="cp-value">
        <div className="cp-value-head">
          <span className="cp-value-label">
            {indicator.label} <SourceTag source={reading.source} />
          </span>
          <StatusBadge status={item.status} />
        </div>
        <div className="cp-value-number display">
          {fmt(reading.value, indicator.decimals)}
          <span className="cp-value-unit"> {indicator.unit}</span>
        </div>
        <RangeBar indicator={indicator} value={reading.value} status={item.status} />
        {week.length > 1 && <WeekLine indicator={indicator} points={week} status={item.status} startTime={mission.startTime} />}
        {/* One legend for the zone of the bar and the band of the chart. */}
        <div className="cp-legend">
          <span className="cp-legend-mark" aria-hidden="true" />
          {t('Normal: {range}', { range: formatRange(indicator.normal, indicator.unit) })}
        </div>
        <button type="button" className="btn cp-detail" onClick={() => open(item.where === 'Cabin' ? 'cabin' : 'body', indicator.id)}>
          {t('Open the detail')}
        </button>
      </div>
    )
  }

  return (
    <div className="cp-home">
      <section className="card cp-talk" aria-label={t('Talk with Nexxo about your health')}>
        <header className="cp-head">
          <div className="cp-who">
            <span className="cp-avatar" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.5 12h4.5l2.5-6 4.5 12 2.5-6h5" />
              </svg>
            </span>
            <div>
              <h2 className="cp-title">{t('Nexxo, your health companion')}</h2>
              <span className="cp-sub">{t('The fixed rules work with no link to Earth.')}</span>
            </div>
          </div>
          <span className="cp-origin">
            {insight ? t('One labelled message is from a language model. Fixed rules write the others.') : t('Fixed rules write these messages')}
          </span>
        </header>

        <div className="cp-group">
          <Bubble>
            <p>
              {/* Each sentence of the message is one full text. */}
              {name ? t('{greeting}, {name}.', { greeting: greeting(mission.now), name }) : t('{greeting}.', { greeting: greeting(mission.now) })}{' '}
              {newestHour === null ? t('I have no values yet.') : t('I read your newest values at {time}.', { time: timeAt(newestHour) })} {state}
              {count > items.length ? ` ${t('I show the {count} most important ones here.', { count: items.length })}` : ''}
            </p>
          </Bubble>
          {question && (
            <button type="button" className="btn cp-jump" onClick={goToQuestion}>
              {t('Go to the open question')}
            </button>
          )}
        </div>

        {items.map((item) => (
          <div className="cp-group" key={item.key}>
            <Bubble>
              <p>
                <strong>
                  {item.label}
                  {item.value ? `: ${item.value}` : ''}.
                </strong>{' '}
                {item.indicator && item.reading ? `${meaning(item.indicator, item.reading.value, item.status)} ${item.indicator.why}` : item.detail}
              </p>
            </Bubble>
            {valueCard(item)}
            <Bubble label={t('What to do')}>
              <p>{item.action}</p>
            </Bubble>
          </div>
        ))}

        {past.length > 0 && <div className="cp-divider">{t('Your earlier answers')}</div>}
        {past.map((checkup) => (
          <div className="cp-turn" key={checkup.id}>
            <div className="cp-group">
              <Bubble label={`${checkup.rule.title} · ${timeAt(checkup.hour)}`}>
                <p>{checkup.rule.question}</p>
              </Bubble>
            </div>
            <div className="cp-me">
              <div className="cp-bubble-me">{ANSWER_WORD[checkup.status === 'confirmed' ? 'confirmed' : 'dismissed']}</div>
              <span className="cp-stamp">
                {name || t('You')}
                {checkup.answeredHour !== null ? ` · ${timeAt(checkup.answeredHour)}` : ''}
              </span>
            </div>
            {checkup.status === 'confirmed' && (
              <div className="cp-group">
                <Bubble label={t('What to do')}>
                  <p>{checkup.rule.action}</p>
                </Bubble>
                <Bubble>
                  <p>
                    {t('I saved "{symptom}" as a symptom in your record.', { symptom: symptomLabel(checkup.rule.symptom.name) })} {told(checkup.rule)}
                  </p>
                </Bubble>
              </div>
            )}
          </div>
        ))}

        {llm.enabled && (
          <div className="cp-group cp-model">
            <span className="cp-model-label">
              <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <rect x="3" y="3" width="10" height="10" rx="2" />
                <path d="M6 1v2M10 1v2M6 13v2M10 13v2M1 6h2M1 10h2M13 6h2M13 10h2" />
              </svg>
              {t('A language model wrote this text. It can be wrong.')}
            </span>
            {insight && insightRecord ? (
              <Bubble>
                <p>{insight.summary}</p>
                {insight.actions.length > 0 && (
                  <ol className="cp-steps">
                    {insight.actions.map((action, index) => (
                      <li key={index}>
                        <strong>{action.title}</strong>
                        <span>{action.detail}</span>
                        <span className="cp-step-for">
                          {t('For: {role} · {urgency}', { role: roleLabel(action.role), urgency: URGENCY_WORD[action.urgency] })}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
                <p className="cp-model-note">
                  {t('{model} wrote this at {time}. The check-ups and alerts of Nexxo do not depend on it.', { model: insightRecord.model, time: timeAt(insightRecord.hour) })}
                </p>
              </Bubble>
            ) : (
              <Bubble>
                <p>{modelWorks ? t('The model reads the data of the mission now.') : t('No insight of the model yet.')}</p>
              </Bubble>
            )}
            {newestFinished?.status === 'failed' && <p role="alert" className="cp-model-error">{t('The last insight failed: {error}', { error: newestFinished.error ?? '' })}</p>}
            <button type="button" className="btn cp-ask" disabled={modelWorks || busy} onClick={() => send('/insights')}>
              {modelWorks ? t('The model works…') : t('Ask for a new insight')}
            </button>
          </div>
        )}

        {question ? (
          <>
            <div className="cp-group">
              <Bubble label={t('Why I ask · {title}', { title: question.rule.title })}>
                <p>{question.reason}</p>
              </Bubble>
            </div>
            <div className="cp-ask-block" ref={questionRef} key={question.id}>
              <span className="cp-progress">{t('Question 1 of {count}', { count: s.pending.length })}</span>
              <h2 className="cp-question">{question.rule.question}</h2>
            </div>
            <section className="card-inverse cp-answer" aria-label={t('Your answer')}>
              <div className="cp-replies">
                <button
                  type="button"
                  className="btn btn-primary btn-large"
                  disabled={busy}
                  onClick={() => send(`/checkups/${question.id}/answer`, { answer: 'confirmed' })}
                >
                  {t('Yes')}
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-large"
                  disabled={busy}
                  onClick={() => send(`/checkups/${question.id}/answer`, { answer: 'dismissed' })}
                >
                  {t('No, I feel fine')}
                </button>
              </div>
            </section>
          </>
        ) : (
          <section className="card-inverse cp-answer" aria-label={t('What you can do now')}>
            <p className="cp-answer-title">{t('I have no open question for you now.')}</p>
            <div className="cp-replies">
              <button type="button" className="btn btn-primary btn-large" onClick={() => open('body')}>
                {t('Report a symptom')}
              </button>
              <button type="button" className="btn btn-large" onClick={() => open('checkups')}>
                {t('Do the daily check-in')}
              </button>
            </div>
          </section>
        )}
      </section>

      <aside className="cp-side" aria-label={t('About this talk')}>
        <section className="card cp-panel" aria-labelledby="cp-topics-title">
          <h3 className="cp-panel-title" id="cp-topics-title">{t('In this talk')}</h3>
          {topics.length === 0 ? (
            <p className="cp-panel-text muted">{t('No questions now.')}</p>
          ) : (
            <ol className="cp-topics">
              {topics.map((topic, index) => (
                <li key={topic.id} className={`cp-topic cp-topic-${topic.mark}`}>
                  <span className="cp-mark" aria-hidden="true">
                    {topic.mark === 'done' ? (
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 8.5l3.2 3L13 4.5" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className="cp-topic-text">
                    <span className="cp-topic-title">{topic.title}</span>
                    <span className="cp-topic-note">{topic.note}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="card cp-panel" aria-labelledby="cp-readers-title">
          <h3 className="cp-panel-title" id="cp-readers-title">{t('Who reads your answers')}</h3>
          <p className="cp-panel-text">
            {!medic
              ? t('You. This crew has no medical officer.')
              : medicIsMe
                ? t('You. You are the crew medical officer.')
                : t('You and {name}, the crew medical officer.', { name: medic.name })}
          </p>
          <p className="cp-panel-note">
            {t('Some rules also send a "Yes" to the flight surgeons on the ground. The mission log keeps each answer.')}
          </p>
        </section>

        <button type="button" className="btn cp-all" onClick={() => open('body')}>
          {t('See all my values')}
        </button>
      </aside>
    </div>
  )
}
