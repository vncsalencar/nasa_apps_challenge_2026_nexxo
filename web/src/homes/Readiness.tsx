// The Readiness home: one score, the one thing to do now, and three areas.
import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { STATUS_LABEL, STATUS_ORDER, formatRange, worst, type Indicator, type Point, type Status } from '../api.ts'
import { SourceTag, StatusBadge } from '../components/StatusBadge.tsx'
import { SHEET_LABEL, type Ctx, type SheetTab } from '../context.ts'
import { SHAPE, firstName, greeting, type Item } from '../derive.ts'
import { fmt, t, tn } from '../i18n.ts'
import './readiness.css'

// The values of the head that are about rest and mind. All other body values go to the "Body" card.
const MIND = ['sleep_duration', 'mood_score', 'stress_score', 'fatigue_score']
const DAY = 24
// The card "Cabin air" already says "cabin", so these cabin values have a short label there.
// The list goes by the id of the indicator: the label comes from the server in the language of the page,
// and the code must not read it. An indicator that is not in the list shows its full label.
const SHORT_LABEL: Record<string, string> = {
  co2_partial_pressure: t('CO2'),
  co2_7day_average: t('CO2, 7-day average'),
  cabin_temperature: t('Temperature'),
  cabin_humidity: t('Humidity'),
}

// One value on an area card.
type Entry = {
  indicator: Indicator
  label: string
  text: string
  unit: string
  status: Status
  source: string
  // The normal range in words, or null if the entry has no single range.
  range: string | null
}

const severity = (status: Status) => STATUS_ORDER.indexOf(status)
// The worst status first. Entries with the same status keep their order.
const worstFirst = (entries: (Entry | null | undefined)[]) =>
  entries.filter((entry): entry is Entry => Boolean(entry)).sort((a, b) => severity(b.status) - severity(a.status))
const firstSentence = (text: string) => text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text
const initials = (name: string) => name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase()

// The shape of a status. The word is in the label, for people who do not see the shape.
function Shape({ status }: { status: Status }) {
  return (
    <span className={`rd-shape status-${status}`} role="img" aria-label={STATUS_LABEL[status]}>
      {SHAPE[status]}
    </span>
  )
}

// A small line of the last values. The scale always holds the normal range,
// so a small change inside the range looks small. "limit" adds a dashed line at the top of the normal range.
function Spark({ points, status, normal, limit }: { points: Point[]; status: Status; normal: Indicator['normal']; limit?: boolean }) {
  if (points.length < 2) return null
  const width = 120
  const height = 48
  const pad = 5
  const values = [...points.map((point) => point[1]), ...normal.filter((edge) => edge !== null)]
  const low = Math.min(...values)
  const high = Math.max(...values)
  const edge = limit ? normal[1] : null
  const firstHour = points[0][0]
  const hours = points[points.length - 1][0] - firstHour || 1
  const x = (hour: number) => pad + ((hour - firstHour) / hours) * (width - 2 * pad)
  const y = (value: number) => (high === low ? height / 2 : height - pad - ((value - low) / (high - low)) * (height - 2 * pad))
  const last = points[points.length - 1]
  return (
    <svg className={`rd-spark rd-tone-${status}`} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {edge !== null && <line className="rd-spark-limit" x1="0" x2={width} y1={y(edge)} y2={y(edge)} />}
      <polyline className="rd-spark-line" points={points.map((point) => `${x(point[0]).toFixed(1)},${y(point[1]).toFixed(1)}`).join(' ')} />
      <circle className="rd-spark-dot" cx={x(last[0])} cy={y(last[1])} r="4" />
    </svg>
  )
}

// One bar for each of the last 7 values. The newest bar has the color of its status.
function Bars({ points, status }: { points: Point[]; status: Status }) {
  const nights = points.slice(-7)
  if (!nights.length) return null
  const top = Math.max(...nights.map((point) => point[1])) || 1
  const offset = 7 - nights.length
  return (
    <svg className={`rd-spark rd-tone-${status}`} viewBox="0 0 120 48" aria-hidden="true">
      {nights.map((point, index) => {
        const barHeight = Math.max(3, (point[1] / top) * 46)
        return (
          <rect
            key={index}
            className={index === nights.length - 1 ? 'rd-bar-now' : 'rd-bar'}
            x={2 + (index + offset) * 17}
            y={48 - barHeight}
            width="11"
            height={barHeight}
            rx="3"
          />
        )
      })}
    </svg>
  )
}

// An area card. The whole card is one button that opens a sheet.
function Area(props: { title: string; status: Status; tag?: ReactNode; big?: Entry; bigTag?: ReactNode; chart?: ReactNode; rows: Entry[]; onOpen: () => void }) {
  const { title, status, tag, big, bigTag, chart, rows, onOpen } = props
  return (
    <button type="button" className="rd-area" onClick={onOpen}>
      <span className="rd-area-head">
        <span className="rd-label">{title} {tag}</span>
        <StatusBadge status={status} />
      </span>
      {big ? (
        <span className="rd-area-main">
          <span className="rd-area-value">
            {/* The value and its unit are two parts. On a narrow card the unit can go to the next line. */}
            <span className="rd-value">
              <span className="rd-big display">{big.text}</span>
              {big.unit && <span className="rd-unit display">{big.unit}</span>}
            </span>
            <span className="rd-sub">{big.label} {bigTag}</span>
            {big.range && <span className="rd-sub rd-sub-range">{t('Normal: {range}', { range: big.range })}</span>}
          </span>
          {chart}
        </span>
      ) : (
        <span className="rd-sub">{t('No values yet.')}</span>
      )}
      {rows.length > 0 && (
        <span className="rd-rows">
          {rows.map((row) => (
            <span className="rd-row" key={row.indicator.id}>
              <span className="muted">{row.label}</span>
              <span className="rd-row-value">
                <Shape status={row.status} />
                {row.status !== 'normal' && <span className={`rd-word status-${row.status}`} aria-hidden="true">{STATUS_LABEL[row.status]}</span>}
                {row.text} {row.unit}
              </span>
            </span>
          ))}
        </span>
      )}
    </button>
  )
}

export default function ReadinessHome(ctx: Ctx) {
  const { snapshot, catalog, s, crewId, crewSeries, cabinSeries, act, open, selectCrew } = ctx
  const [showParts, setShowParts] = useState(false)
  // While the parts of the score are open, the "Do now" card keeps the height that it had before.
  // So the card does not change its size when the score card grows or gets small again.
  const topRef = useRef<HTMLDivElement>(null)
  const [doHeight, setDoHeight] = useState<number | null>(null)
  const toggleParts = () => {
    if (!showParts) setDoHeight(topRef.current?.querySelector('.rd-do')?.getBoundingClientRect().height ?? 0)
    setShowParts(!showParts)
  }
  const [busy, setBusy] = useState(false)
  // What to do after the answer "Yes" to a check-up. It stays until the next answer.
  const [advice, setAdvice] = useState<{ crewId: number; title: string; action: string } | null>(null)

  // People type in values at the hour of the newest readings.
  const nowHour = snapshot.mission.hour - 1
  const name = firstName(s.member?.name)
  const hello = greeting(snapshot.mission.now)

  // The sheet that shows an item, and the indicator to open there.
  const targetOf = (item: Item): { tab: SheetTab; focus?: string } => {
    const finding = snapshot.findings.find((candidate) => `finding:${candidate.id}` === item.key)
    const indicator = item.indicator ?? catalog.indicators.find((candidate) => finding?.indicators.includes(candidate.id))
    return indicator ? { tab: indicator.kind === 'vital' ? 'body' : 'cabin', focus: indicator.id } : { tab: 'alerts' }
  }
  const openItem = (item: Item) => {
    const target = targetOf(item)
    open(target.tab, target.focus)
  }

  // ---- Do now ----
  const checkup = s.pending.at(0)
  const nextCheckup = s.pending.at(1)
  const firstItem = s.items.at(0)
  const answer = async (value: 'confirmed' | 'dismissed') => {
    if (!checkup) return
    setBusy(true)
    await act(`/checkups/${checkup.id}/answer`, { answer: value })
    setBusy(false)
    setAdvice(value === 'confirmed' ? { crewId, title: checkup.rule.title, action: checkup.rule.action } : null)
  }
  const adviceNote = advice && advice.crewId === crewId && (
    <p className="rd-do-advice" role="status">
      <strong>{t('Saved: {title}.', { title: advice.title })}</strong> {advice.action}
    </p>
  )

  const openLabel = (item: Item) => t('Open {screen}', { screen: SHEET_LABEL[targetOf(item).tab] })
  let doNow: ReactNode
  if (checkup) {
    doNow = (
      <section className="card-inverse rd-do" aria-label={t('Do now')}>
        <div className="rd-do-head">
          <span>{t('Do now · 1 of {count}', { count: s.todo })}</span>
          <span className="muted">{firstSentence(checkup.reason)}</span>
        </div>
        {adviceNote}
        {/* The key makes a new question come in with a movement. */}
        <p key={checkup.id} className={`rd-do-text display ${checkup.rule.question.length > 60 ? 'rd-do-text-long' : ''}`}>{checkup.rule.question}</p>
        <div className="rd-do-actions">
          <button type="button" className="btn btn-primary btn-large" disabled={busy} onClick={() => answer('confirmed')}>{t('Yes')}</button>
          <button type="button" className="btn btn-large" disabled={busy} onClick={() => answer('dismissed')}>{t('No, I feel fine')}</button>
        </div>
        {(nextCheckup || firstItem) && (
          <div className="rd-do-next">
            <span><strong>{t('Next:')}</strong> {nextCheckup ? nextCheckup.rule.question : firstItem?.action}</span>
            {nextCheckup ? (
              <button type="button" className="btn rd-do-more" onClick={() => open('checkups')}>{t('See all check-ups')}</button>
            ) : (
              firstItem && <button type="button" className="btn rd-do-more" onClick={() => openItem(firstItem)}>{openLabel(firstItem)}</button>
            )}
          </div>
        )}
      </section>
    )
  } else if (firstItem) {
    const nextItem = s.items.at(1)
    doNow = (
      <section className="card-inverse rd-do" aria-label={t('Do now')}>
        <div className="rd-do-head">
          <span>{t('Do now · 1 of {count}', { count: s.todo })}</span>
          <span className="muted">
            {SHAPE[firstItem.status]} {STATUS_LABEL[firstItem.status]} · {firstItem.label}{firstItem.value ? `, ${firstItem.value}` : ''}
          </span>
        </div>
        {adviceNote}
        <p key={firstItem.key} className={`rd-do-text display ${firstItem.action.length > 60 ? 'rd-do-text-long' : ''}`}>{firstItem.action}</p>
        <div className="rd-do-actions">
          <button type="button" className="btn btn-primary btn-large" onClick={() => openItem(firstItem)}>{openLabel(firstItem)}</button>
        </div>
        {nextItem && (
          <div className="rd-do-next">
            <span><strong>{t('Next:')}</strong> {nextItem.action}</span>
            <button type="button" className="btn rd-do-more" onClick={() => openItem(nextItem)}>{openLabel(nextItem)}</button>
          </div>
        )}
      </section>
    )
  } else {
    // Nothing to do. This card is dark, so the light card always means "there is something to do".
    doNow = (
      <section className="card rd-do rd-do-calm" aria-label={t('Do now')}>
        <div className="rd-do-head">
          <span className="muted">{t('Do now')}</span>
          <StatusBadge status="normal" />
        </div>
        {adviceNote}
        <p className="rd-do-text display">{t('Nothing to do now.')}</p>
        <p className="muted rd-do-calm-text">{t('No check-up is open. All your values and the cabin values are in the normal range.')}</p>
      </section>
    )
  }

  // ---- The three areas ----
  const byId = new Map(catalog.indicators.map((indicator) => [indicator.id, indicator]))
  const entryOf = (who: string, id: string): Entry | null => {
    const indicator = byId.get(id)
    const reading = indicator && s.latest(who, id)
    if (!indicator || !reading) return null
    const [low, high] = indicator.normal
    return {
      indicator,
      label: SHORT_LABEL[indicator.id] ?? indicator.label,
      text: fmt(reading.value, indicator.decimals),
      unit: indicator.unit,
      status: reading.status,
      source: reading.source,
      range: low === null && high === null ? null : formatRange(indicator.normal, indicator.unit),
    }
  }
  const lastOf = (series: Record<string, Point[]>, indicator: Indicator) => {
    // Daily values: one week. Hourly values: two days.
    const since = nowHour - (indicator.cadence === 'day' ? 7 * DAY : 2 * DAY)
    return (series[indicator.id] ?? []).filter((point) => point[0] > since)
  }

  // Body. The two blood pressure values are one entry.
  const upper = entryOf(s.subject, 'blood_pressure_systolic')
  const lower = entryOf(s.subject, 'blood_pressure_diastolic')
  const pressure: Entry | null =
    upper && lower
      ? { ...upper, label: t('Blood pressure'), text: `${upper.text} / ${lower.text}`, status: worst([upper.status, lower.status]), range: null }
      : upper ?? lower
  const namedBody = ['body_temperature', 'heart_rate', 'blood_pressure_systolic', 'blood_pressure_diastolic']
  const body = worstFirst([
    entryOf(s.subject, 'body_temperature'),
    entryOf(s.subject, 'heart_rate'),
    pressure,
    ...s.vitals.filter((indicator) => !MIND.includes(indicator.id) && !namedBody.includes(indicator.id)).map((indicator) => entryOf(s.subject, indicator.id)),
  ])
  const bodyBig = body.at(0)

  // Rest and mind. Sleep is the large value if it exists.
  const mind = MIND.map((id) => entryOf(s.subject, id)).filter((entry): entry is Entry => Boolean(entry))
  const mindBig = mind.at(0)

  // Cabin air. CO2 is the large value if it exists. Then the two worst other values.
  const co2 = entryOf('env', 'co2_partial_pressure')
  const namedCabin = ['co2_partial_pressure', 'cabin_temperature', 'radiation_dose_rate']
  const cabinOthers = worstFirst([
    entryOf('env', 'cabin_temperature'),
    entryOf('env', 'radiation_dose_rate'),
    ...s.cabin.filter((indicator) => !namedCabin.includes(indicator.id)).map((indicator) => entryOf('env', indicator.id)),
  ])
  const cabinBig = co2 ?? cabinOthers.at(0)
  const cabinRows = cabinOthers.filter((entry) => entry !== cabinBig).slice(0, 2)

  // ---- Check-in streak ----
  // A check-in is a value that the crew member typed in. One mission day is 24 hours.
  const checkinDays = new Set<number>()
  for (const points of Object.values(crewSeries)) {
    for (const [hour, , source] of points) if (source === 'crew') checkinDays.add(Math.floor(hour / DAY))
  }
  const today = Math.floor(nowHour / DAY)
  const doneToday = checkinDays.has(today)
  let streak = 0
  // Today does not break the streak while it is still open.
  for (let day = doneToday ? today : today - 1; checkinDays.has(day); day--) streak++
  const week = Array.from({ length: 7 }, (_, index) => today - 6 + index)

  const others = snapshot.crew.filter((member) => member.id !== crewId)
  const crewFindings = snapshot.findings.filter((finding) => finding.scope === 'crew')
  const reasons = s.items.slice(0, 3)
  const ringLength = 2 * Math.PI * 92
  const pointsLost = s.scoreParts.reduce((sum, part) => sum + part.count * part.each, 0)
  // The greeting with the name. The name goes where the translation has {name}.
  const [beforeName, afterName] = t('{greeting}, {name}.', { greeting: hello }).split('{name}')

  return (
    <div className="rd-home">
      <div className="rd-hello">
        {/* On a phone the name has its own line. */}
        <h1>{name ? <>{beforeName}<span className="rd-hello-name">{name}{afterName}</span></> : t('{greeting}.', { greeting: hello })}</h1>
        <p className="muted">
          {s.todo === 0 ? t('Nothing needs your attention now.') : tn(s.todo, '1 thing to do now.', '{count} things to do now.')}
        </p>
      </div>

      <div
        ref={topRef}
        className={`rd-top ${doHeight !== null ? 'rd-top-open' : ''}`}
        style={doHeight !== null ? ({ '--rd-do-height': `${doHeight}px` } as CSSProperties) : undefined}
      >
        <section className="card rd-ready" aria-label={t('Readiness')}>
          <div className="rd-ready-main">
            <div className="rd-ring">
              <svg viewBox="0 0 208 208" role="img" aria-label={t('Readiness {score} of 100', { score: s.score })}>
                <circle className="rd-ring-track" cx="104" cy="104" r="92" />
                <circle
                  className={`rd-ring-value status-${s.scoreStatus}`}
                  cx="104"
                  cy="104"
                  r="92"
                  strokeDasharray={`${(ringLength * s.score) / 100} ${ringLength}`}
                  transform="rotate(-90 104 104)"
                />
              </svg>
              <div className="rd-ring-text" aria-hidden="true">
                <span className="rd-ring-number display">{s.score}</span>
                <span className="muted small">{t('of 100')}</span>
              </div>
            </div>
            <div className="rd-ready-text">
              <div>
                <h2 className="rd-label">{t('Readiness')} <StatusBadge status={s.scoreStatus} /></h2>
                <p className="rd-headline display">{s.headline}</p>
              </div>
              {reasons.length > 0 && (
                <ul className="plain rd-reasons">
                  {reasons.map((item) => (
                    <li key={item.key}>
                      <Shape status={item.status} />
                      <span>{item.label}{item.value ? `, ${item.value}` : ''}</span>
                    </li>
                  ))}
                </ul>
              )}
              <button type="button" className="pill rd-how" aria-expanded={showParts} aria-controls="rd-parts" onClick={toggleParts}>
                {t('How we count')} <span className="rd-how-sign" aria-hidden="true">{showParts ? '−' : '+'}</span>
              </button>
            </div>
          </div>
          {/* The parts stay in the page, so they can open and close with a movement. */}
          <div
            className="rd-parts"
            id="rd-parts"
            data-open={showParts}
            aria-hidden={!showParts}
            onTransitionEnd={(event) => {
              // The parts are closed now. The "Do now" card can follow the height of the row again.
              if (!showParts && event.target === event.currentTarget && event.propertyName === 'grid-template-rows') setDoHeight(null)
            }}
          >
            <div className="rd-parts-in">
              <p className="muted small">{t('The score starts at 100. Each problem takes points away.')}</p>
              <ul className="plain">
                {s.scoreParts.map((part) => (
                  <li key={part.label} className={part.count ? '' : 'muted'}>
                    <span>{part.label}</span>
                    <span className="small">{t('{count} × {each} points', { count: part.count, each: part.each })}</span>
                    <span className="rd-parts-points">{part.count ? `−${part.count * part.each}` : '0'}</span>
                  </li>
                ))}
                <li className="rd-parts-total">
                  <span>{t('Readiness')}</span>
                  <span className="small">100 − {pointsLost}</span>
                  <span className="rd-parts-points">{s.score}</span>
                </li>
              </ul>
              {100 - pointsLost < s.score && <p className="muted small">{t('The score does not go below {score}.', { score: s.score })}</p>}
            </div>
          </div>
        </section>

        {doNow}
      </div>

      {crewFindings.length > 0 && (
        <section className="card rd-findings" aria-label={t('Whole crew')}>
          <h2 className="rd-label">{t('Whole crew')}</h2>
          <ul className="plain">
            {crewFindings.map((finding) => {
              const status: Status = finding.severity === 2 ? 'alert' : 'caution'
              return (
                <li key={finding.id} className="rd-finding">
                  <StatusBadge status={status} />
                  <div>
                    <p className="rd-finding-title">{finding.title}</p>
                    <p className="muted">{firstSentence(finding.detail)}</p>
                    <p><strong>{t('Do this:')}</strong> {finding.action}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <div className="rd-areas">
        <Area
          title={t('Body')}
          status={worst(body.map((entry) => entry.status))}
          tag={bodyBig && <SourceTag source={bodyBig.source} />}
          big={bodyBig}
          chart={bodyBig && <Spark points={lastOf(crewSeries, bodyBig.indicator)} status={bodyBig.status} normal={bodyBig.indicator.normal} />}
          rows={body.slice(1, 3)}
          onOpen={() => open('body', bodyBig?.indicator.id)}
        />
        <Area
          title={t('Rest and mind')}
          status={worst(mind.map((entry) => entry.status))}
          tag={mindBig && <SourceTag source={mindBig.source} />}
          big={mindBig}
          chart={mindBig && <Bars points={crewSeries[mindBig.indicator.id] ?? []} status={mindBig.status} />}
          rows={mind.slice(1)}
          onOpen={() => open('body', worstFirst(mind).at(0)?.indicator.id)}
        />
        <Area
          title={t('Cabin air')}
          status={s.cabinStatus}
          tag={cabinBig?.indicator.nasaRecord && <SourceTag source="nasa" />}
          big={cabinBig}
          // The simulator can change a cabin value. Then the value is not the NASA record.
          bigTag={cabinBig && !cabinBig.source.startsWith('nasa') && <SourceTag source={cabinBig.source} />}
          chart={cabinBig && <Spark points={lastOf(cabinSeries, cabinBig.indicator)} status={cabinBig.status} normal={cabinBig.indicator.normal} limit />}
          rows={cabinRows}
          onOpen={() => open('cabin', (cabinBig?.status === 'normal' ? worstFirst([cabinBig, ...cabinRows]).at(0) : cabinBig)?.indicator.id)}
        />
      </div>

      <div className="rd-bottom">
        {others.length > 0 && (
          <section className="card rd-crew-card" aria-label={t('Crew')}>
            <h2 className="rd-label">{t('Crew')}</h2>
            <div className="rd-crew-list">
              {others.map((member) => {
                const status = s.crewStatus(member.id)
                return (
                  <button type="button" key={member.id} className="rd-crew" onClick={() => selectCrew(member.id)}>
                    <span className={`rd-crew-ring status-${status}`} aria-hidden="true"><span>{initials(member.name)}</span></span>
                    <span className="rd-crew-text">
                      <span className="rd-crew-name">{member.name}</span>
                      <StatusBadge status={status} />
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        <section className="card rd-streak" aria-label={t('Check-in streak')}>
          <h2 className="rd-label">{t('Check-in streak')}</h2>
          <div className="rd-streak-count">
            <span className="rd-big display">{streak}</span>
            <span className="muted">{tn(streak, 'day in a row', 'days in a row')}</span>
          </div>
          <div className="rd-dots" role="img" aria-label={t('Check-ins in the last 7 days: {count}', { count: week.filter((day) => checkinDays.has(day)).length })}>
            {week.map((day) => (
              <span key={day} className={checkinDays.has(day) ? 'rd-dot rd-dot-done' : day === today ? 'rd-dot rd-dot-open' : 'rd-dot'} />
            ))}
          </div>
          <p className="muted small rd-streak-note">
            {doneToday ? t('Today is done.') : streak === 0 ? t('Do your first check-in today. It takes 2 minutes.') : t('Today is still open.')}
          </p>
          <button type="button" className={`btn rd-streak-button ${doneToday ? '' : 'btn-primary'}`} onClick={() => open('checkups')}>
            {doneToday ? t("Open today's check-in") : t("Do today's 2-minute check-in")}
          </button>
        </section>
      </div>
    </div>
  )
}
