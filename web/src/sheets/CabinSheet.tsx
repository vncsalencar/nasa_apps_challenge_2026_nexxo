// The Cabin sheet. The top part shows the worst cabin value, what to do, and who works on it.
// Below it: each cabin value as a row, the effect on the crew, and where the data comes from.
import { useState, type CSSProperties, type ReactNode } from 'react'
import { STATUS_LABEL, STATUS_ORDER, formatRange, formatTime, timeOfHour, type Indicator, type Point, type Reading } from '../api.ts'
import { SourceTag } from '../components/StatusBadge.tsx'
import type { Ctx } from '../context.ts'
import { SHAPE, adviceFor, firstName } from '../derive.ts'
import { fmt, t, tn } from '../i18n.ts'
import { initialsOf } from './alertModel.ts'
import { ValueGrid, ValueRow } from './ValueRow.tsx'
import './cabin.css'

// A number with the decimals that it has, in the way of the language: 3, or 2.8 in English and 2,8 in Portuguese.
const plain = (value: number) => fmt(value, (String(value).split('.')[1] ?? '').length)

// Puts a page element in a translated text, at the place of {name}.
// Do not give a value for this name to t(), so the mark stays in the text.
function withNode(text: string, name: string, node: ReactNode) {
  const [before, after = ''] = text.split(`{${name}}`)
  return (
    <>
      {before}
      {node}
      {after}
    </>
  )
}

type Side = 'high' | 'low' | null
function sideOf(indicator: Indicator, value: number): Side {
  const [low, high] = indicator.normal
  return high !== null && value > high ? 'high' : low !== null && value < low ? 'low' : null
}

// Finds the current run of values outside the normal range.
// "startHour" is the first hour of the run. "whole" is true if the run fills the whole series.
// "before" is the middle value of the 7 days before the run.
function runOutside(indicator: Indicator, points: Point[]) {
  const sorted = [...points].sort((a, b) => a[0] - b[0])
  let first = sorted.length
  while (first > 0 && sideOf(indicator, sorted[first - 1][1]) !== null) first--
  if (first === sorted.length) return null
  const earlier = sorted
    .slice(0, first)
    .filter((point) => point[0] >= sorted[first][0] - 168)
    .map((point) => point[1])
    .sort((a, b) => a - b)
  return { startHour: sorted[first][0], whole: first === 0, before: earlier.length ? earlier[Math.floor(earlier.length / 2)] : null }
}

// A wide bar for the top part: the scale, the normal zone, a mark at the alert limit, and a dot for the value.
// The text of the normal zone is below the zone. The text of the alert limit is above its mark.
function WideBar({ indicator, reading }: { indicator: Indicator; reading: Reading }) {
  const [normalLow, normalHigh] = indicator.normal
  const bounds = [...indicator.normal, ...indicator.caution].filter((bound): bound is number => bound !== null)
  const lowBound = Math.min(...bounds)
  const highBound = Math.max(...bounds)
  const span = highBound - lowBound || Math.abs(highBound) * 0.5 || 1
  // A value with no lower limit starts at zero, for example a pressure or a dose.
  const low = normalLow === null && reading.value >= 0 ? 0 : Math.min(reading.value, lowBound - span * 0.35)
  const high = Math.max(reading.value, highBound) + (normalLow === null ? highBound * 0.15 : span * 0.35)
  const at = (x: number) => Math.min(100, Math.max(0, ((x - low) / (high - low)) * 100))
  const side = sideOf(indicator, reading.value)
  const limit = side ? indicator.caution[side === 'high' ? 1 : 0] : null
  const end = (x: number) => plain(Number(x.toFixed(indicator.decimals)))

  const zoneFrom = at(normalLow ?? low)
  const zoneTo = at(normalHigh ?? high)
  const normalText =
    normalLow === null
      ? t('normal up to {high}', { high: plain(normalHigh ?? 0) })
      : normalHigh === null
        ? t('normal from {low}', { low: plain(normalLow) })
        : t('normal {low} to {high}', { low: plain(normalLow), high: plain(normalHigh) })
  const label = [
    t('Scale from {low} to {high} {unit}.', { low: end(low), high: end(high), unit: indicator.unit }),
    t('Normal is {range}.', { range: formatRange(indicator.normal, indicator.unit) }),
    ...(limit !== null ? [t('The alert limit is {limit} {unit}.', { limit: plain(limit), unit: indicator.unit })] : []),
  ].join(' ')
  // About how wide the text is, in percent of the bar on a phone. The text must stay inside the bar.
  const width = normalText.length * 2.4
  let from = (zoneFrom + zoneTo) / 2 - width / 2
  let place: CSSProperties = { left: `${(zoneFrom + zoneTo) / 2}%`, transform: 'translateX(-50%)' }
  if (normalLow === null && zoneTo >= width) [from, place] = [zoneTo - width, { right: `${100 - zoneTo}%` }]
  else if (normalHigh === null && zoneFrom + width <= 100) [from, place] = [zoneFrom, { left: `${zoneFrom}%` }]
  else if (from < 0) [from, place] = [0, { left: 0 }]
  else if (from + width > 100) [from, place] = [100 - width, { right: 0 }]
  const limitAt = limit === null ? 0 : at(limit)

  return (
    <div className="cb-bar" role="img" aria-label={label}>
      {limit !== null && (
        <div className="cb-bar-over">
          <span className="cb-bar-limit-text" style={limitAt > 55 ? { right: `${100 - limitAt}%` } : { left: `${limitAt}%` }}>
            {t('alert limit {limit}', { limit: plain(limit) })}
          </span>
        </div>
      )}
      <div className="cb-bar-line">
        <span className="cb-bar-zone" style={{ left: `${zoneFrom}%`, width: `${zoneTo - zoneFrom}%` }} />
        {limit !== null && <span className="cb-bar-limit" style={{ left: `${limitAt}%` }} />}
        <span className={`cb-bar-dot status-bg-${reading.status}`} style={{ left: `${at(reading.value)}%` }} />
      </div>
      <div className="cb-bar-under">
        {from > 8 && <span style={{ left: 0 }}>{end(low)}</span>}
        <span className="status-normal" style={place}>{normalText}</span>
        {from + width < 88 && <span style={{ right: 0 }}>{end(high)}</span>}
      </div>
    </div>
  )
}

export default function CabinSheet({ snapshot, catalog, s, crewId, cabinSeries, act, focus }: Ctx) {
  const [openRows, setOpenRows] = useState<string[]>(focus ? [focus] : [])
  // The shell can ask for another value while the sheet is open.
  const [seenFocus, setSeenFocus] = useState(focus)
  if (focus !== seenFocus) {
    setSeenFocus(focus)
    if (focus && !openRows.includes(focus)) setOpenRows([...openRows, focus])
  }
  const [busy, setBusy] = useState(false)
  const toggle = (id: string) => setOpenRows((rows) => (rows.includes(id) ? rows.filter((row) => row !== id) : [...rows, id]))
  const send = (path: string, body?: unknown) => {
    setBusy(true)
    void act(path, body).finally(() => setBusy(false))
  }

  const { mission } = snapshot
  const time = (hour: number) => `${formatTime(timeOfHour(mission.startTime, hour))} UTC`
  const nameOf = (id: number) => snapshot.crew.find((member) => member.id === id)?.name ?? t('A crew member')

  // The worst cabin value. With the same status, a sensor value comes before a computed value.
  const measured = s.cabin.filter((indicator) => !indicator.computed)
  const computed = s.cabin.filter((indicator) => indicator.computed)
  let worstValue: { indicator: Indicator; reading: Reading } | null = null
  for (const indicator of [...measured, ...computed]) {
    const reading = s.latest('env', indicator.id)
    if (!reading || reading.status === 'normal') continue
    if (!worstValue || STATUS_ORDER.indexOf(reading.status) > STATUS_ORDER.indexOf(worstValue.reading.status)) worstValue = { indicator, reading }
  }

  const row = (indicator: Indicator, quiet = false) => (
    <ValueRow
      key={indicator.id}
      indicator={indicator}
      reading={s.latest('env', indicator.id)}
      points={cabinSeries[indicator.id] ?? []}
      snapshot={snapshot}
      open={openRows.includes(indicator.id)}
      onToggle={() => toggle(indicator.id)}
      quiet={quiet}
    />
  )

  // The check-ups that a cabin value started, for all crew members.
  const ruleById = new Map(catalog.rules.map((rule) => [rule.id, rule]))
  const cabinCheckups = snapshot.checkups.filter((checkup) => ruleById.get(checkup.ruleId)?.scope === 'cabin')
  const asked = cabinCheckups.filter((checkup) => checkup.status === 'pending')
  const answered = cabinCheckups.filter(
    (checkup) => checkup.status !== 'pending' && checkup.answeredHour !== null && checkup.answeredHour >= mission.hour - 24,
  )

  // The first name is in bold letters. The question comes from the server in the language of the page.
  const wasAsked = (checkup: { crewId: number; ruleId: string }) =>
    withNode(
      t('{name} was asked: {question}', { question: ruleById.get(checkup.ruleId)?.question ?? '' }),
      'name',
      <strong>{firstName(nameOf(checkup.crewId))}</strong>,
    )

  const { source } = catalog.dataset
  const replay = mission.hour > mission.recordHours

  // The title of the page when a cabin value is not normal.
  function headline(indicator: Indicator, reading: Reading) {
    const side = sideOf(indicator, reading.value)
    const label = { label: indicator.label }
    return side === 'low' ? t('{label} is too low.', label) : side === 'high' ? t('{label} is too high.', label) : t('{label} is not normal.', label)
  }

  // The top part when a cabin value is not normal.
  function problem(indicator: Indicator, reading: Reading) {
    const side = sideOf(indicator, reading.value)
    const run = runOutside(indicator, cabinSeries[indicator.id] ?? [])
    const steps = adviceFor(indicator, reading.value).split(/(?<=[.!?])\s+/).filter(Boolean)
    const topic = `env:${indicator.id}`
    const workers = snapshot.claims.filter((claim) => claim.topic === topic && claim.doneHour === null)
    const myClaim = workers.find((claim) => claim.crewId === crewId)
    const engineers = snapshot.crew.filter((member) => member.role === 'engineer')
    const isEngineer = s.member?.role === 'engineer'
    // The newest notification about this value that an engineer got.
    const told = snapshot.notifications
      .filter((notification) => notification.topic === topic && engineers.some((member) => member.id === notification.crewId))
      .reduce<number | null>((newest, notification) => (newest === null || notification.hour > newest ? notification.hour : newest), null)
    // Each case is one full sentence, because the word order changes in other languages.
    let since = ''
    if (run?.whole) since = side === 'high' ? t('Above the normal range for 30 days or more.') : t('Below the normal range for 30 days or more.')
    else if (run) {
      const start = { time: time(run.startHour) }
      since = side === 'high' ? t('Above the normal range since {time}.', start) : t('Below the normal range since {time}.', start)
    }
    // The server writes the label of a claim into the mission log. If the label is the title of a notification
    // about this topic, the server keeps the stored title, and the log line reads in the language of each reader.
    // The Alerts page sends the same title. With no notification, the spare text stays in the language of this page.
    const notice = snapshot.notifications.filter((notification) => notification.topic === topic).sort((a, b) => b.hour - a.hour || b.id - a.id)[0]
    const spareLabel =
      side === 'high'
        ? t('{label} is high', { label: indicator.label })
        : side === 'low'
          ? t('{label} is low', { label: indicator.label })
          : t('{label} is not normal', { label: indicator.label })
    const claimLabel = notice?.title ?? spareLabel

    return (
      <section className="cb-problem" aria-label={`${indicator.label}: ${STATUS_LABEL[reading.status]}`}>
        <div className="cb-read">
          <div className="cb-top">
            <span className={`cb-title status-${reading.status}`}>
              <span aria-hidden="true">{SHAPE[reading.status]}</span> {STATUS_LABEL[reading.status]} · {indicator.label}
            </span>
            <SourceTag source={reading.source} />
          </div>

          <div className="cb-number">
            <span className="cb-digits display">{fmt(reading.value, indicator.decimals)}</span>
            <span className="cb-unit">{indicator.unit}</span>
          </div>

          <WideBar indicator={indicator} reading={reading} />

          {run && side && (
            <p className="cb-since">
              {since}
              {run.before !== null && ` ${t('Before that, it was near {value} {unit}.', { value: fmt(run.before, indicator.decimals), unit: indicator.unit })}`}
            </p>
          )}
        </div>

        <ol className="cb-steps" aria-label={t('What to do')}>
          {steps.map((step, index) => (
            <li key={step}>
              <span className="cb-step-number display" aria-hidden="true">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <div className="cb-own">
          <div className="cb-who">
            <span className="cb-who-label">{t('Who works on it')}</span>
            {workers.length === 0 ? (
              <span className="cb-who-name display">{t('No one yet.')}</span>
            ) : (
              workers.map((claim) => (
                <span key={claim.id} className="cb-worker">
                  <span className="avatar cb-avatar" aria-hidden="true">{initialsOf(nameOf(claim.crewId))}</span>
                  <span className="cb-worker-text">
                    <span className="cb-who-name display">{nameOf(claim.crewId)}</span>
                    <span className="cb-who-since">{t('since {time}', { time: time(claim.hour) })}</span>
                  </span>
                </span>
              ))
            )}
            {!isEngineer &&
              (engineers.length > 0 ? (
                <span className="cb-who-more">
                  {withNode(tn(engineers.length, 'The engineer: {names}', 'The engineers: {names}'), 'names', <strong>{engineers.map((member) => member.name).join(', ')}</strong>)}
                  {told !== null && `. ${tn(engineers.length, 'The app told this person at {time}.', 'The app told them at {time}.', { time: time(told) })}`}
                </span>
              ) : (
                <span className="cb-who-more">{t('This crew has no engineer.')}</span>
              ))}
          </div>

          {isEngineer &&
            (myClaim ? (
              <>
                <button type="button" className="btn btn-primary btn-large cb-action" disabled={busy} onClick={() => send(`/claims/${myClaim.id}/done`)}>
                  {t('The work is done')}
                </button>
                <p className="cb-hint">{t('The crew sees your name on this problem.')}</p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-large cb-action"
                  disabled={busy}
                  onClick={() => send('/claims', { topic, label: claimLabel })}
                >
                  {t('I am on it')}
                </button>
                <p className="cb-hint">{t('The crew will see your name on this problem.')}</p>
              </>
            ))}
        </div>
      </section>
    )
  }

  return (
    <div className="cb">
      {worstValue ? (
        <>
          <header className="cb-intro">
            <span className={`cb-state status-${worstValue.reading.status}`}>
              <span aria-hidden="true">{SHAPE[worstValue.reading.status]}</span> {STATUS_LABEL[worstValue.reading.status]}
            </span>
            <h1 className="cb-headline">
              {headline(worstValue.indicator, worstValue.reading)}
            </h1>
          </header>
          {problem(worstValue.indicator, worstValue.reading)}
        </>
      ) : (
        <header className="cb-intro">
          <span className="cb-state status-normal">
            <span aria-hidden="true">{SHAPE.normal}</span> {STATUS_LABEL.normal}
          </span>
          <h1 className="cb-headline">{t('All cabin values are normal.')}</h1>
        </header>
      )}

      <section className="cb-card" aria-label={t('Cabin values')}>
        <h3 className="cb-label">{t('Cabin values')}</h3>
        <ValueGrid>{measured.map((indicator) => row(indicator))}</ValueGrid>
      </section>

      {computed.length > 0 && (
        <section className="cb-card" aria-label={t('Computed values')}>
          <h3 className="cb-label">{t('Computed from the sensor values')}</h3>
          <ValueGrid>{computed.map((indicator) => row(indicator, true))}</ValueGrid>
        </section>
      )}

      <section className="cb-card" aria-label={t('Effect on the crew')}>
        <h3 className="cb-label">{t('Effect on the crew')}</h3>
        {asked.length + answered.length === 0 ? (
          <p className="cb-quiet">{t('The app asked no crew member about the cabin in the last day.')}</p>
        ) : (
          <ul className="cb-asked">
            {asked.map((checkup) => (
              <li key={checkup.id}>
                <span className="avatar cb-avatar cb-avatar-wait" aria-hidden="true">{initialsOf(nameOf(checkup.crewId))}</span>
                <span className="cb-asked-text">
                  <span className="cb-asked-what">{wasAsked(checkup)}</span>
                  <span className="cb-answer cb-answer-none">{t('No answer yet')}</span>
                </span>
              </li>
            ))}
            {answered.map((checkup) => (
              <li key={checkup.id}>
                <span className={`avatar cb-avatar ${checkup.status === 'confirmed' ? 'ring-caution' : ''}`} aria-hidden="true">{initialsOf(nameOf(checkup.crewId))}</span>
                <span className="cb-asked-text">
                  <span className="cb-asked-what">{wasAsked(checkup)}</span>
                  <span className={`cb-answer ${checkup.status === 'confirmed' ? 'status-caution' : 'cb-answer-none'}`}>
                    {checkup.status === 'confirmed' ? `${SHAPE.caution} ${t('Yes')}` : t('No')}
                    {checkup.answeredHour !== null && `, ${time(checkup.answeredHour)}`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="cb-note">
        {withNode(
          t('The cabin values are a real sensor record of the International Space Station from NASA: {source}, mission {mission}.', { mission: source.mission }),
          'source',
          <a href={source.url} target="_blank" rel="noreferrer">{source.name}</a>,
        )}{' '}
        {t('The record has one set of sensors, so the app shows one value for the whole cabin.')}{' '}
        {replay
          ? t('The record ended at {time}. The app replays it now.', { time: time(mission.recordHours) })
          : t('After the end of the record, the app replays it.')}
      </p>
    </div>
  )

}
