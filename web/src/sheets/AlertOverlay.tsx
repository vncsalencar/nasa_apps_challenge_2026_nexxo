import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { SOURCE_LABEL, type Indicator } from '../api.ts'
import type { Ctx } from '../context.ts'
import { lang, t } from '../i18n.ts'
import { NO_ONE, describeAlert } from './alertModel.ts'
import './alerts.css'

// The alert fades out for this time before it closes. The CSS uses the same time.
const CLOSE_MS = 170

// How far a key moves the text of the alert, in px.
const SCROLL_KEYS: Record<string, number> = { ArrowDown: 80, ArrowUp: -80, PageDown: 400, PageUp: -400 }

// A test can turn the full-screen alert off, so it does not cover the page in a picture.
function turnedOff() {
  try {
    return localStorage.getItem('nexxo-alert-off') === '1'
  } catch {
    return false
  }
}

// A limit of the scale in the way of the language: 2.8 in English, 2,8 in Portuguese.
const num = (value: number) => value.toLocaleString(lang, { useGrouping: false, maximumFractionDigits: 6 })

// The scale under the large value: where the normal zone ends, where an alert starts, and where the value is.
// It returns null if the value is in its normal zone.
function scaleOf(indicator: Indicator, value: number) {
  const [normalLow, normalHigh] = indicator.normal
  const side = normalHigh !== null && value > normalHigh ? 'high' : normalLow !== null && value < normalLow ? 'low' : null
  if (!side) return null
  const limit = side === 'high' ? indicator.caution[1] : indicator.caution[0]
  const bounds = [...indicator.normal, ...indicator.caution].filter((bound): bound is number => bound !== null)
  const least = Math.min(value, ...bounds)
  let low = least
  let high = Math.max(value, ...bounds)
  // A value with only an upper limit, such as CO2, starts its scale at 0. A value with only a lower limit gets room above it.
  if (normalLow === null && low > 0) low = 0
  if (normalHigh === null) high += (high - low) * 0.4
  // Keep room after the alert limit for its label.
  const edge = limit ?? (side === 'high' ? (normalHigh as number) : (normalLow as number))
  if (side === 'high') high = Math.max(high, edge + (edge - low) * 0.3)
  else low = Math.max(Math.min(low, edge - (high - edge) * 0.3), least >= 0 ? 0 : -Infinity)
  // Round the two ends to numbers that are easy to read.
  const raw = (high - low) / 5 || 1
  const power = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= raw) ?? raw
  low = Number((Math.floor(low / step) * step).toFixed(6))
  high = Number((Math.ceil(high / step) * step).toFixed(6))
  const at = (x: number) => Math.min(100, Math.max(0, ((x - low) / (high - low)) * 100))
  const zone = [at(normalLow ?? low), at(normalHigh ?? high)]
  const tick = at(edge)
  const normalText =
    normalLow !== null && normalHigh !== null
      ? t('normal {low} to {high}', { low: num(normalLow), high: num(normalHigh) })
      : normalHigh !== null
        ? t('normal to {high}', { high: num(normalHigh) })
        : t('normal from {low}', { low: num(normalLow ?? 0) })
  const limitText = limit === null ? '' : side === 'high' ? t('alert above {limit}', { limit: num(limit) }) : t('alert below {limit}', { limit: num(limit) })
  // The same limit as a full sentence, for a screen reader.
  const limitSentence = limit === null ? '' : side === 'high' ? t('An alert above {limit}.', { limit: num(limit) }) : t('An alert below {limit}.', { limit: num(limit) })
  return {
    side,
    low,
    high,
    zone,
    tick,
    value: at(value),
    normalText,
    limitText,
    limitSentence,
    // An end of the scale has no number if a label needs its place.
    showLow: side === 'high' ? zone[1] >= 40 : tick >= 38,
    showHigh: side === 'high' ? tick <= 62 : zone[0] <= 60,
  }
}

// The full-screen alert. It interrupts only for an alert that arrives while the page is open.
export default function AlertOverlay(ctx: Ctx) {
  const { snapshot, catalog, crewId, s } = ctx
  // The highest notification id at the time the page got its first data. Older alerts stay in the inbox.
  const [baseId] = useState(() => snapshot.notifications.reduce((highest, notification) => Math.max(highest, notification.id), 0))
  // The alerts that the crew member answered here. The alert closes before the server answers.
  const [answered, setAnswered] = useState<number[]>([])
  // The alert that fades out now.
  const [closing, setClosing] = useState<number | null>(null)
  const [off] = useState(turnedOff)
  const mainButton = useRef<HTMLButtonElement>(null)
  const scrollArea = useRef<HTMLDivElement>(null)

  const fresh = snapshot.notifications
    .filter(
      (notification) =>
        notification.crewId === crewId &&
        notification.severity >= 2 &&
        notification.readHour === null &&
        notification.id > baseId &&
        !answered.includes(notification.id),
    )
    .sort((a, b) => b.id - a.id)
  const current = off ? undefined : fresh[0]
  const currentId = current?.id

  // Put the keyboard focus on the main answer when an alert opens.
  useEffect(() => {
    if (currentId !== undefined) mainButton.current?.focus({ preventScroll: true })
  }, [currentId])

  if (!current) return null
  const view = describeAlert(ctx, current, true)
  const { indicator, reading } = view
  const scale = indicator && reading ? scaleOf(indicator, reading.value) : null
  const role = catalog.roles.find((candidate) => candidate.id === s.member?.role)?.label

  // Both answers close the alert and mark it as read. The alert fades out first.
  const close = (ids: number[], run: () => void) => {
    if (closing !== null) return
    setClosing(current.id)
    setTimeout(() => {
      setAnswered((list) => [...list, ...ids])
      setClosing(null)
      run()
    }, CLOSE_MS)
  }
  const later = () => close([current.id], () => void view.read())
  // If the action selects another crew member, do not interrupt again with the copy that this crew member got.
  const act = () =>
    close([current.id, ...(view.area === 'crew' ? view.othersIds : [])], () => {
      if (view.main.kind === 'read') void view.read()
      else void view.read().then(() => view.main.run())
    })
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // The arrow keys move the text, because the focus stays on the answers.
    const move = SCROLL_KEYS[event.key]
    if (move) {
      event.preventDefault()
      scrollArea.current?.scrollBy({ top: move, behavior: 'smooth' })
    }
    // The Tab key stays on the answers, because the page under the alert is hidden.
    if (event.key !== 'Tab') return
    const buttons = [...event.currentTarget.querySelectorAll('button')]
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
    event.preventDefault()
    buttons[(index + (event.shiftKey ? buttons.length - 1 : 1)) % buttons.length]?.focus()
  }
  const mainLabel = view.main.kind === 'claim' ? view.main.label : view.main.kind === 'open' ? t('I saw it. {action}.', { action: view.main.label }) : t('I saw it.')

  return (
    <div
      className={`al-over ${closing === current.id ? 'is-leaving' : ''}`}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="al-over-title"
      onKeyDown={onKeyDown}
    >
      {/* The key starts the movement again when the next alert takes the place of this one. */}
      <div className="al-over-col" key={current.id}>
        <div className="al-over-scroll" ref={scrollArea}>
          <div className="al-over-grid">
            <section className="al-over-hero" aria-label={t('Alert')}>
              <header className="al-over-head">
                <span className="al-over-kind">
                  <span className="al-over-mark" aria-hidden="true" />
                  <span className="al-over-word">{t('Alert')}</span>
                  <span className="al-over-area">· {view.where}</span>
                  {fresh.length > 1 && <span className="al-over-count">{t('1 of {count}', { count: fresh.length })}</span>}
                </span>
                <span className="al-over-where">
                  <span className="al-over-where-area">{view.where} · </span>
                  {view.time} UTC
                </span>
              </header>

              <div className="al-over-what">
                <h1 id="al-over-title" className="al-over-title">{view.headline}</h1>
                {indicator && reading && view.value && (
                  <>
                    <div className="al-over-value">
                      {view.value}
                      <span className="al-over-unit"> {indicator.unit}</span>
                    </div>
                    <p className="al-over-normal">
                      <span className={scale ? 'al-over-in-words' : undefined}>{view.normal} </span>
                      {t('Source: {source}.', { source: SOURCE_LABEL[reading.source] ?? reading.source })}
                    </p>
                  </>
                )}
              </div>

              {scale && indicator && view.value && (
                <div
                  className="al-over-range"
                  role="img"
                  aria-label={[
                    t('Scale from {low} to {high} {unit}.', { low: num(scale.low), high: num(scale.high), unit: indicator.unit }),
                    view.normal,
                    scale.limitSentence,
                    t('The value is {value}.', { value: view.value }),
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <div className="al-over-bar">
                    <span className="al-over-track" />
                    <span className="al-over-zone" style={{ left: `${scale.zone[0]}%`, width: `${scale.zone[1] - scale.zone[0]}%` }} />
                    {scale.limitText && <span className="al-over-tick" style={{ left: `${scale.tick}%` }} />}
                    <span className="al-over-dot" style={{ left: `clamp(13px, ${scale.value}%, calc(100% - 13px))` }} />
                  </div>
                  <div className="al-over-scale">
                    {scale.showLow && <span style={{ left: 0 }}>{num(scale.low)}</span>}
                    <span className="al-over-scale-normal" style={scale.side === 'high' ? { right: `${100 - scale.zone[1]}%`, marginRight: 8 } : { left: `${scale.zone[0]}%`, marginLeft: 8 }}>
                      {scale.normalText}
                    </span>
                    {scale.limitText && (
                      // The box goes from the tick to the end of the scale. The CSS keeps a long label inside the box.
                      <span
                        className={`al-over-scale-limit al-over-limit-${scale.side}`}
                        style={scale.side === 'high' ? { left: `${scale.tick}%`, right: 0, marginLeft: 8 } : { left: 0, right: `${100 - scale.tick}%`, marginRight: 8 }}
                      >
                        <span>{scale.limitText}</span>
                      </span>
                    )}
                    {scale.showHigh && <span style={{ right: 0 }}>{num(scale.high)}</span>}
                  </div>
                </div>
              )}
            </section>

            <section className="al-over-card" aria-label={t('What it means and what to do')}>
              {view.means && (
                <div className="al-over-part al-over-means">
                  <span className="al-over-label">{t('What it means')}</span>
                  <span className="al-over-text">{view.means}</span>
                </div>
              )}
              {view.steps.length > 0 && (
                <div className="al-over-part al-over-do">
                  <span className="al-over-label">{t('What to do')}</span>
                  <ol className="al-over-steps">
                    {view.steps.map((step, index) => (
                      <li key={step}>
                        <span className="al-over-number" aria-hidden="true">{index + 1}</span>
                        <span className="al-over-text">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              <div className="al-over-part al-over-who">
                {/* The phone shows one short line. A wide screen shows one line for each person. */}
                <div className="al-over-brief">
                  {view.others.length > 0 && (
                    <span className="al-avatars" aria-hidden="true">
                      {view.others.map((other) => (
                        <span key={other.key} className="al-avatar">{other.initials}</span>
                      ))}
                    </span>
                  )}
                  <span>
                    {view.othersText} {view.claimText}
                  </span>
                </div>
                <div className="al-over-full">
                  <span className="al-over-label">{view.claimText ? t('Who works on it') : t('Who else got it')}</span>
                  {view.claimText && <span className="al-over-claim">{view.claimText === NO_ONE ? t('No one yet.') : view.claimText}</span>}
                  {view.others.length > 0 ? (
                    <ul className="al-over-people">
                      {view.others.map((other) => (
                        <li key={other.key}>
                          <span className="al-avatar" aria-hidden="true">{other.initials}</span>
                          <span className="al-over-person">
                            <span className="al-over-name">{other.name}</span>
                            <span className="al-over-note">{other.note}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="al-over-note">{t('Only you got this alert.')}</span>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className={`al-over-actions ${view.main.kind === 'read' ? 'al-over-one' : ''}`}>
          <p className="al-over-for">
            {s.member && <strong>{role ? t('For {name}, {role}', { name: s.member.name, role }) : t('For {name}', { name: s.member.name })}</strong>}
            <span>{t('This alert stays on the screen until you answer.')}</span>
          </p>
          <button type="button" ref={mainButton} className="al-over-main" onClick={act}>
            {mainLabel}
          </button>
          {view.main.kind !== 'read' && (
            <button type="button" className="al-over-later" onClick={later}>
              {t('I saw it. I will decide later.')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
