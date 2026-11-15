// The timeline of a mission: one bar from day 0 to the last day, with one segment for each phase,
// marks for the solar storms and for the day when the dose passes the career limit, and a cursor
// at the mission day. With "onDay", a person can move the cursor with a mouse, a finger, or the keyboard.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import type { Geometry, PhaseSpan, Storm } from '../../../shared/trip/types.ts'
import { fmt, t, tn } from '../i18n.ts'
import './map.css'

// During a drag, the parent gets a new day at most one time in this many milliseconds.
const SEND_EACH_MS = 80
// After a drag or a key, the timeline shows its own day for this long at most. The parent gives the new day back before that.
const HOLD_MS = 800

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))
const number = (value: number) => fmt(value, Number.isInteger(value) ? 0 : 1)
const daysText = (days: number) => tn(days, '{count} day', '{count} days', { count: number(days) })
// "Day 12 of 253". A short mission shows one decimal, because one day is a large part of it.
function dayText(day: number, days: number): string {
  const short = days < 30
  return t('Day {day} of {days}', { day: fmt(short ? Math.floor(day * 10) / 10 : Math.floor(day), short ? 1 : 0), days: number(days) })
}

// The days with a number below the bar: round numbers that are not too near to each other.
function ticks(days: number, width: number): number[] {
  const step = [1, 2, 5, 10, 20, 30, 50, 100, 200, 500, 1000].find((size) => (size / days) * width >= 72) ?? days
  const list: number[] = []
  for (let day = step; day < days - step * 0.55; day += step) list.push(day)
  return list
}

type TimelineProps = {
  geometry: Geometry
  // The mission day of the cursor. It can be a fraction.
  day: number
  storms?: Storm[]
  // The mission day when the dose passes the career limit. null: it does not.
  limitDay?: number | null
  // The person moved the cursor to this day. Without it, the timeline only shows.
  onDay?: (day: number) => void
}

export function Timeline({ geometry, day, storms = [], limitDay = null, onDay }: TimelineProps) {
  const { days, spans } = geometry
  const lane = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  // The day that the person set a moment ago, while the parent did not give it back.
  const [held, setHeld] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const live = useRef({ active: false, sentAt: 0, timer: 0 })

  useLayoutEffect(() => {
    const element = lane.current
    if (!element) return
    const measure = () => setWidth(element.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  useEffect(() => () => window.clearTimeout(live.current.timer), [])
  // The parent gave the day back, so the timeline shows the day of the parent again.
  if (held !== null && !dragging && Math.abs(day - held) <= 0.011) setHeld(null)

  if (!(days > 0) || spans.length === 0) return <p className="tl-empty">{t('No mission phases')}</p>

  const shown = clamp(held ?? day, 0, days)
  const part = (value: number) => clamp(value / days, 0, 1) * 100
  const span: PhaseSpan = spans.find((item) => shown < item.toDay) ?? spans[spans.length - 1]
  const label = `${dayText(shown, days)} · ${t(span.phase.label)}`

  const send = (value: number) => {
    live.current.sentAt = performance.now()
    onDay?.(value)
  }
  const hold = () => {
    window.clearTimeout(live.current.timer)
    live.current.timer = window.setTimeout(() => setHeld(null), HOLD_MS)
  }
  const dayAt = (clientX: number) => {
    const box = lane.current!.getBoundingClientRect()
    return Math.round(clamp((clientX - box.left) / (box.width || 1), 0, 1) * days * 100) / 100
  }
  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    window.clearTimeout(live.current.timer)
    const value = dayAt(event.clientX)
    live.current.active = true
    setDragging(true)
    setHeld(value)
    send(value)
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!live.current.active) return
    const value = dayAt(event.clientX)
    // The cursor follows the pointer at once. The parent gets the day less often.
    setHeld(value)
    if (performance.now() - live.current.sentAt >= SEND_EACH_MS) send(value)
  }
  function onPointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (!live.current.active) return
    live.current.active = false
    // A cancelled pointer has no good position. The last day of the drag stays.
    const value = event.type === 'pointerup' ? dayAt(event.clientX) : (held ?? shown)
    setDragging(false)
    setHeld(value)
    send(value)
    hold()
  }
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10, Home: -Infinity, End: Infinity }
    const move = moves[event.key]
    if (move === undefined) return
    // The keys must not scroll the page.
    event.preventDefault()
    const value = Math.round(clamp(shown + move, 0, days) * 100) / 100
    setHeld(value)
    send(value)
    hold()
  }

  // A segment shows its label if the label has room. The list below the bar names each phase if one label has no room.
  const segments = spans.map((item) => {
    const name = t(item.phase.label)
    const length = daysText(item.toDay - item.fromDay)
    const room = (width * (item.toDay - item.fromDay)) / days - 10
    return { item, name, length, showName: name.length * 7.4 <= room, showLength: name.length * 7.4 + 8 + length.length * 6.6 <= room }
  })
  const allFit = width > 0 && segments.every((segment) => segment.showName)
  const marks = ticks(days, width || 320)

  const slider = onDay
    ? {
        role: 'slider',
        tabIndex: 0,
        'aria-label': t('Mission day'),
        'aria-orientation': 'horizontal' as const,
        'aria-valuemin': 0,
        'aria-valuemax': days,
        'aria-valuenow': shown,
        'aria-valuetext': label,
        onPointerDown,
        onPointerMove,
        onPointerUp: onPointerEnd,
        onPointerCancel: onPointerEnd,
        onKeyDown,
      }
    : { role: 'img', 'aria-label': t('Mission timeline. {where}', { where: label }) }

  return (
    <div className="trip-timeline">
      <div className={`tl-track${onDay ? ' tl-live' : ''}${dragging ? ' tl-dragging' : ''}`} {...slider}>
        <div className="tl-now-lane" aria-hidden="true">
          <p className="tl-now" style={{ left: `${part(shown)}%`, transform: `translateX(-${part(shown)}%)` }}>
            <strong>{dayText(shown, days)}</strong>
            <span>{t(span.phase.label)}</span>
          </p>
        </div>
        <div className="tl-lane" ref={lane} aria-hidden="true">
          {segments.map(({ item, name, length, showName, showLength }) => (
            <div
              key={item.phase.id}
              className={`tl-seg tl-kind-${item.phase.kind}${item === span ? ' tl-seg-on' : ''}`}
              style={{ left: `${part(item.fromDay)}%`, width: `${part(item.toDay) - part(item.fromDay)}%` }}
              title={t('{phase}: day {from} to day {to}', { phase: name, from: number(item.fromDay), to: number(item.toDay) })}
            >
              <i className="tl-seg-bar" />
              {showName && (
                <span className="tl-seg-text">
                  {name}
                  {showLength && <span className="tl-seg-days">{length}</span>}
                </span>
              )}
            </div>
          ))}
          {storms.map((storm, index) => (
            <span key={index} className="tl-mark tl-storm" style={{ left: `${part(storm.day)}%` }} title={t('Solar storm (a what-if scenario) on day {day}, for {hours} hours', { day: number(storm.day), hours: number(storm.hours) })}>
              ▲
            </span>
          ))}
          {limitDay !== null && (
            <span className="tl-mark tl-limit" style={{ left: `${part(limitDay)}%` }} title={t('The dose passes the career limit on day {day}', { day: number(Math.floor(limitDay)) })}>
              ◆
            </span>
          )}
          <span className="tl-rest" style={{ left: `${part(shown)}%` }} />
          <span className="tl-cursor" style={{ left: `${part(shown)}%` }}>
            <i className="tl-thumb" />
          </span>
        </div>
      </div>
      <div className="tl-axis" aria-hidden="true">
        <span style={{ left: 0 }}>{t('Day {day}', { day: 0 })}</span>
        {marks.map((mark) => (
          <span key={mark} style={{ left: `${part(mark)}%` }}>
            {mark}
          </span>
        ))}
        <span style={{ left: '100%' }}>{number(days)}</span>
      </div>
      {(!allFit || storms.length > 0 || limitDay !== null) && (
        <ul className="tl-legend">
          {!allFit &&
            segments.map(({ item, name, length }) => (
              <li key={item.phase.id} className={item === span ? 'tl-legend-on' : undefined}>
                <i className={`tl-chip tl-kind-${item.phase.kind}`} aria-hidden="true" />
                {name}
                <span className="tl-legend-days">{length}</span>
              </li>
            ))}
          {storms.length > 0 && (
            <li>
              <span className="tl-glyph tl-storm" aria-hidden="true">
                ▲
              </span>
              {tn(storms.length, 'Solar storm (a what-if scenario): day {days}', 'Solar storms (what-if scenarios): days {days}', { days: storms.map((storm) => number(storm.day)).join(', ') })}
            </li>
          )}
          {limitDay !== null && (
            <li>
              <span className="tl-glyph tl-limit" aria-hidden="true">
                ◆
              </span>
              {t('The dose passes the career limit on day {day}', { day: number(Math.floor(limitDay)) })}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
