// The Bridge home: an instrument. One value in focus as a very large number, one sentence that says
// what to do, the other values as quiet rows, and a dock of four large buttons.
import type { ReactNode } from 'react'
import { STATUS_LABEL, formatRange, formatTime, timeOfHour, type Indicator, type Reading, type Status } from '../api.ts'
import { SourceTag } from '../components/StatusBadge.tsx'
import type { Ctx } from '../context.ts'
import { SHAPE, firstName } from '../derive.ts'
import { fmt, t, tn } from '../i18n.ts'
import './bridge.css'

// One value with its newest reading, and the sheet that shows its detail.
type Entry = { indicator: Indicator; reading: Reading; tab: 'body' | 'cabin' }

const RANK: Record<Status, number> = { alert: 0, caution: 1, normal: 2 }
// The tile "Cabin" already says "cabin", so these cabin values have a short label in its line.
// The list goes by the id of the indicator: the label comes from the server in the language of the page,
// and the code must not read it. An indicator that is not in the list shows its full label.
const SHORT_LABEL: Record<string, string> = {
  co2_partial_pressure: t('CO2'),
  co2_7day_average: t('CO2, 7-day average'),
  cabin_temperature: t('temperature'),
  cabin_humidity: t('humidity'),
}
const valueText = ({ indicator, reading }: Entry) => fmt(reading.value, indicator.decimals)
// The normal range without the unit, for example "36.1 to 37.5" or "up to 2.8".
const rangeText = (indicator: Indicator) => formatRange(indicator.normal, '')

// "high" if the value is above the normal range, "low" if it is below.
function side({ indicator, reading }: Entry) {
  const [low, high] = indicator.normal
  if (high !== null && reading.value > high) return 'high'
  if (low !== null && reading.value < low) return 'low'
  return null
}

// The smallest round step (1, 2 or 5 times a power of ten) that is not smaller than the given size.
function roundStep(size: number) {
  const power = 10 ** Math.floor(Math.log10(size))
  return ([1, 2, 5, 10].find((factor) => factor * power >= size) ?? 10) * power
}

// The scale of a range bar. The two ends are round numbers, so the crew can read them.
function scaleOf({ indicator, reading }: Entry) {
  const { normal, caution } = indicator
  const bounds = [...normal, ...caution].filter((bound): bound is number => bound !== null)
  const lowBound = Math.min(...bounds, reading.value)
  const highBound = Math.max(...bounds, reading.value)
  const margin = (highBound - lowBound || Math.abs(highBound) * 0.5 || 1) * 0.25
  // A range of the type "up to 2.8" starts at zero. A side that has no alert zone gets no margin.
  const rawLow = normal[0] === null && reading.value >= 0 ? 0 : normal[0] !== null && normal[0] === caution[0] && reading.value >= normal[0] ? normal[0] : lowBound - margin
  const rawHigh = normal[1] !== null && normal[1] === caution[1] && reading.value <= normal[1] ? normal[1] : highBound + margin
  const step = roundStep((rawHigh - rawLow) / 8)
  const low = Math.floor(rawLow / step + 1e-9) * step
  const high = Math.ceil(rawHigh / step - 1e-9) * step
  const decimals = step >= 1 ? 0 : Math.ceil(-Math.log10(step))
  const at = (x: number) => Math.min(100, Math.max(0, ((x - low) / (high - low)) * 100))
  return { low, high, decimals, at, zoneStart: at(normal[0] ?? low), zoneEnd: at(normal[1] ?? high) }
}

// The line of a range bar: a thin track, the grey normal zone, and a mark in the shape of the status.
// "wide" is the bar of the value in focus. The rows use the small one.
function Line({ entry, wide = false }: { entry: Entry; wide?: boolean }) {
  const { indicator, reading } = entry
  const { at, zoneStart, zoneEnd } = scaleOf(entry)
  // A zone with no limit at one side goes to the end of the track at that side.
  const open = `${indicator.normal[0] === null || zoneStart === 0 ? 'br-zone-start' : ''} ${indicator.normal[1] === null || zoneEnd === 100 ? 'br-zone-end' : ''}`
  return (
    <span className={`br-line ${wide ? 'br-line-wide' : ''}`} aria-hidden="true">
      <span className="br-line-track" />
      <span className={`br-line-zone ${open}`} style={{ left: `${zoneStart}%`, width: `${zoneEnd - zoneStart}%` }} />
      <span className={`br-mark br-mark-${reading.status} status-bg-${reading.status}`} style={{ left: `${at(reading.value)}%` }} />
    </span>
  )
}

// The wide range bar of the value in focus, with the two ends of the scale and the normal range as text.
function WideBar({ entry }: { entry: Entry }) {
  const { indicator } = entry
  const { low, high, decimals, zoneStart, zoneEnd } = scaleOf(entry)
  const zoneMiddle = Math.round((zoneStart + zoneEnd) / 2)
  return (
    <div className="br-bar">
      <Line entry={entry} wide />
      {/* The text "normal ..." stays near the middle of the normal zone. */}
      <div className="br-bar-scale" style={{ gridTemplateColumns: `auto minmax(12px, ${zoneMiddle}fr) auto minmax(12px, ${100 - zoneMiddle}fr) auto` }}>
        <span aria-hidden="true">{fmt(low, decimals)}</span>
        <span />
        <span className="br-bar-normal">{t('normal {range}', { range: formatRange(indicator.normal, indicator.unit) })}</span>
        <span />
        <span aria-hidden="true">{fmt(high, decimals)}</span>
      </div>
    </div>
  )
}

const ICONS: Record<string, ReactNode> = {
  body: (
    <>
      <circle cx="16" cy="9" r="4.5" />
      <path d="M6 27c0-6 4.3-10 10-10s10 4 10 10" />
    </>
  ),
  cabin: (
    <>
      <path d="M4 11h15a4 4 0 1 0-4-4" />
      <path d="M4 17h21a4 4 0 1 1-4 4" />
      <path d="M4 23h9" />
    </>
  ),
  checkups: (
    <>
      <path d="M5 6h22v16H14l-6 5v-5H5z" />
      <path d="M13 11.5a3 3 0 1 1 4.2 2.7c-0.8 0.4-1.2 1-1.2 1.8" />
      <path d="M16 18.8v0.2" />
    </>
  ),
  alerts: (
    <>
      <path d="M8 22v-8a8 8 0 0 1 16 0v8l2.5 3h-21z" />
      <path d="M13.5 28h5" />
    </>
  ),
}

function Icon({ name }: { name: string }) {
  return (
    <svg className="br-icon" viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  )
}

// A status as a shape and a word in the status color. "drawn" gives a shape that CSS draws,
// so the large status in the head has clean edges.
function StatusWord({ status, className = '', drawn = false }: { status: Status; className?: string; drawn?: boolean }) {
  return (
    <span className={`br-status status-${status} ${className}`}>
      {drawn ? <span className={`br-shape br-shape-${status} status-bg-${status}`} aria-hidden="true" /> : <span className="br-glyph" aria-hidden="true">{SHAPE[status]}</span>}
      {STATUS_LABEL[status]}
    </span>
  )
}

// One short line that tells the state of a group of values, for example "Cabin CO2 is high".
function groupState(entries: Entry[]): { status: Status; text: string } {
  const off = entries.filter((entry) => entry.reading.status !== 'normal').sort((a, b) => RANK[a.reading.status] - RANK[b.reading.status])
  if (off.length === 0) return { status: 'normal', text: entries.length ? t('All normal') : t('No values yet') }
  const first = off[0]
  if (off.length > 1) return { status: first.reading.status, text: t('{count} not normal', { count: off.length }) }
  const where = side(first)
  const label = SHORT_LABEL[first.indicator.id] ?? first.indicator.label
  const text = where === 'high' ? t('{label} is high', { label }) : where === 'low' ? t('{label} is low', { label }) : `${label}: ${STATUS_LABEL[first.reading.status]}`
  return { status: first.reading.status, text }
}

export default function BridgeHome({ snapshot, s, crewId, open }: Ctx) {
  const entriesOf = (list: Indicator[], who: string, tab: Entry['tab']): Entry[] =>
    list.flatMap((indicator) => {
      const reading = s.latest(who, indicator.id)
      return reading ? [{ indicator, reading, tab }] : []
    })
  const body = entriesOf(s.vitals, s.subject, 'body')
  const cabin = entriesOf(s.cabin, 'env', 'cabin')

  // The focus: the first thing that is not normal and has a reading. Alerts come first in s.items.
  const urgent = s.items.find((item) => item.indicator && item.reading)
  const urgentEntry = urgent && [...body, ...cabin].find((entry) => entry.reading === urgent.reading)
  // If all values are normal, the number shows the heart rate, or the first value that has a reading.
  const focus = urgentEntry ?? body.find((entry) => entry.indicator.id === 'heart_rate') ?? body[0] ?? cabin[0]
  // A thing that is not normal but has no reading, for example the same symptom in two crew members.
  const notice = urgentEntry ? undefined : s.items[0]

  const pending = s.pending.length
  const unread = snapshot.notifications.filter((notification) => notification.crewId === crewId && notification.readHour === null)
  const unreadStatus: Status = unread.some((notification) => notification.severity >= 2) ? 'alert' : unread.some((notification) => notification.severity === 1) ? 'caution' : 'normal'
  // Who works on the problem in focus ("I am on it").
  const workers = urgent
    ? snapshot.claims
        .filter((claim) => claim.topic === urgent.key && claim.doneHour === null)
        .map((claim) => (claim.crewId === crewId ? null : firstName(snapshot.crew.find((member) => member.id === claim.crewId)?.name)))
        .filter((name) => name !== '')
    : []
  // One sentence that names the workers. null in the list is the crew member who reads the page.
  const workerNames = workers.map((name) => name ?? t('You')).reduce((list, name) => (list ? t('{list} and {name}', { list, name }) : name), '')
  const workersLine =
    workers.length === 0
      ? ''
      : workers.length > 1
        ? t('{names} work on it.', { names: workerNames })
        : workers[0] === null
          ? t('You work on it.')
          : t('{name} works on it.', { name: workerNames })

  const status: Status = urgentEntry ? urgentEntry.reading.status : (notice?.status ?? 'normal')
  const sentence = urgent && urgentEntry ? urgent.action : notice ? notice.action : pending ? tn(pending, 'You have 1 open check-up.', 'You have {count} open check-ups.') : t('Nothing to do now.')
  const text = focus ? valueText(focus) : ''
  const size = text.length > 5 ? 'long' : text.length > 4 ? 'medium' : 'short'
  const openFocus = () => focus && open(focus.tab, focus.indicator.id)
  // Where the value in focus comes from, and its time.
  const meta = focus && (
    <span className="br-meta">
      <SourceTag source={focus.reading.source} />
      <span className="muted">{t('Measured {time} UTC', { time: formatTime(timeOfHour(snapshot.mission.startTime, focus.reading.hour)) })}</span>
    </span>
  )

  const bodyState = groupState(body)
  const cabinState = groupState(cabin)
  const bodyLine = bodyState.status === 'normal' && s.mySymptoms.length ? { status: 'caution' as Status, text: tn(s.mySymptoms.length, '1 open symptom', '{count} open symptoms') } : bodyState

  // The other values. In each group the values that are not normal come first.
  const others = (entries: Entry[]) => entries.filter((entry) => entry !== focus).sort((a, b) => RANK[a.reading.status] - RANK[b.reading.status])
  // The group with the worse status comes first, so the crew sees it and does not need to scroll.
  const groups = [
    { title: t('Body'), entries: others(body) },
    { title: t('Cabin'), entries: others(cabin) },
  ]
    .filter((group) => group.entries.length > 0)
    .sort((a, b) => RANK[a.entries[0].reading.status] - RANK[b.entries[0].reading.status])
  // One row: the label and the value, the line with the mark, and the status with the normal range.
  const row = (entry: Entry) => {
    const { indicator, reading } = entry
    return (
      <li key={indicator.id}>
        <button
          type="button"
          className="br-row"
          aria-label={t('{label}: {value} {unit}, {status}. Open the details.', { label: indicator.label, value: valueText(entry), unit: indicator.unit, status: STATUS_LABEL[reading.status] })}
          onClick={() => open(entry.tab, indicator.id)}
        >
          <span className="br-row-top">
            <span className="br-row-label">{indicator.label}</span>
            <span className="br-row-value">
              {valueText(entry)}
              <span className="br-row-unit"> {indicator.unit}</span>
            </span>
          </span>
          <Line entry={entry} />
          <span className="br-row-note">
            <StatusWord status={reading.status} />
            <span className="br-row-range">{t('normal {range}', { range: rangeText(indicator) })}</span>
          </span>
        </button>
      </li>
    )
  }

  return (
    <div className="br">
      <div className="br-top">
        <section className="br-focus" aria-label={urgentEntry ? t('Value in focus: {label}', { label: urgentEntry.indicator.label }) : t('Your state now')}>
          {urgentEntry ? (
            <div className="br-head">
              <StatusWord status={status} className="br-head-status" drawn />
              <span className="br-head-label">{urgentEntry.indicator.label}</span>
              {meta}
            </div>
          ) : (
            <>
              <div className="br-head">
                <StatusWord status={status} className="br-head-status" drawn />
                {notice && <span className="br-head-label">{t(notice.where)}</span>}
              </div>
              <p className="br-calm">{notice ? notice.label : t('All values are normal.')}</p>
              <p className={notice ? 'br-action' : 'br-calm-next'}>{sentence}</p>
              {notice?.detail && <p className="br-detail muted">{notice.detail}</p>}
            </>
          )}

          {focus && (
            <>
              {!urgentEntry && (
                <div className="br-head br-head-calm">
                  <span className="br-head-label">{focus.indicator.label}</span>
                  {meta}
                </div>
              )}
              <p className={`br-num br-num-${size} ${urgentEntry ? '' : 'br-num-calm'}`}>
                <span className="br-num-value">{text}</span>
                <span className="br-num-unit">{focus.indicator.unit}</span>
              </p>
              <WideBar entry={focus} />
            </>
          )}

          {urgentEntry && <p className="br-action">{sentence}</p>}
          {workersLine && <p className="br-detail muted">{workersLine}</p>}

          <div className="br-buttons">
            {pending > 0 && (
              <button type="button" className="btn btn-primary btn-large br-button" onClick={() => open('checkups')}>
                {tn(pending, 'Answer 1 question', 'Answer {count} questions')}
              </button>
            )}
            {focus && (
              <button type="button" className={`btn btn-large br-button ${pending === 0 && urgentEntry ? 'btn-primary' : 'br-button-second'}`} onClick={openFocus}>
                {t('Show the details')}
              </button>
            )}
            {!focus && notice && (
              <button type="button" className="btn btn-large br-button br-button-second" onClick={() => open('alerts')}>
                {t('Show the alerts')}
              </button>
            )}
          </div>
        </section>

        <section className="br-side" aria-label={t('Other values')}>
          {/* On a wide screen this list scrolls in its own column, so the dock stays near the value in focus. */}
          <div className="br-side-scroll">
            {groups.map((group) => (
              <div className="br-group" key={group.title}>
                <h2 className="br-group-title">{group.title}</h2>
                <ul className="plain br-rows">{group.entries.map(row)}</ul>
              </div>
            ))}
            {groups.length === 0 && <p className="muted">{t('No other values yet.')}</p>}
          </div>
        </section>
      </div>

      <nav className="br-dock" aria-label={t('Detail screens')}>
        <button type="button" className="br-tile" onClick={() => open('body')}>
          <span className="br-tile-title">{t('Body')}</span>
          <span className="br-tile-line">
            <span className={`br-tile-state status-${bodyLine.status}`}>
              <span role="img" aria-label={STATUS_LABEL[bodyLine.status]}>{SHAPE[bodyLine.status]}</span> {bodyLine.text}
            </span>
            <Icon name="body" />
          </span>
        </button>
        <button type="button" className="br-tile" onClick={() => open('cabin')}>
          <span className="br-tile-title">{t('Cabin')}</span>
          <span className="br-tile-line">
            <span className={`br-tile-state status-${cabinState.status}`}>
              <span role="img" aria-label={STATUS_LABEL[cabinState.status]}>{SHAPE[cabinState.status]}</span> {cabinState.text}
            </span>
            <Icon name="cabin" />
          </span>
        </button>
        <button type="button" className="br-tile" onClick={() => open('checkups')}>
          <span className="br-tile-title">{t('Check-ups')}</span>
          <span className="br-tile-line">
            <span className={`br-tile-state ${pending ? '' : 'muted'}`}>{pending ? tn(pending, '1 open', '{count} open') : t('None open')}</span>
            <Icon name="checkups" />
          </span>
        </button>
        <button type="button" className="br-tile" onClick={() => open('alerts')}>
          <span className="br-tile-title">{t('Alerts')}</span>
          <span className="br-tile-line">
            {unread.length > 0 ? (
              <span className={`br-tile-state ${unreadStatus === 'normal' ? '' : `status-${unreadStatus}`}`}>
                {unreadStatus !== 'normal' && <span role="img" aria-label={STATUS_LABEL[unreadStatus]}>{SHAPE[unreadStatus]}</span>} {tn(unread.length, '1 unread', '{count} unread')}
              </span>
            ) : (
              <span className="br-tile-state muted">{t('None unread')}</span>
            )}
            <Icon name="alerts" />
          </span>
        </button>
      </nav>
    </div>
  )
}
