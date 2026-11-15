// The trip controls of the simulator page: the mission, the mission day, the radiation, the
// mission plan, the crew, the life support systems, and the comparison. Each control sends
// { trip: { ... } } to the server, so each open trip page shows the change at once.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { CDRA_STATES, type Cdra } from '../../../shared/co2.ts'
import { PRESETS, PRESET_BY_ID } from '../../../shared/trip/presets/index.ts'
import { missionDays, spanAt, timeline } from '../../../shared/trip/timeline.ts'
import {
  METABOLIC_IDS,
  SOLAR_IDS,
  TRIP_LIMITS,
  TRIP_SPEEDS,
  type DoseUnit,
  type LifeSupport,
  type MetabolicId,
  type PhaseSpan,
  type Preset,
  type PresetId,
  type Schedule,
  type SolarId,
  type TripState,
} from '../../../shared/trip/types.ts'
import { Icon } from '../components/Icon.tsx'
import { fmt, t, tn } from '../i18n.ts'
import type { Control } from '../live.ts'
import { CDRA_LABEL } from '../texts.ts'

// What one control can send. The server takes it as { trip: change }.
export type TripChange = Partial<
  Pick<TripState, 'preset' | 'day' | 'playing' | 'speed' | 'solar' | 'doseUnit' | 'surfaceDays' | 'returnTrip' | 'customDays' | 'customRate' | 'customUnit' | 'compare'>
> & {
  life?: Partial<LifeSupport>
  addStorm?: { dose: number; hours: number }
  removeStorm?: number
  clearStorms?: true
  resetLife?: true
}

const SEND_EACH_MS = 80
const DAY_STEP = 0.05
// The comparison chart shows 1 to 3 missions. The server refuses an empty list.
const COMPARE = { min: 1, max: 3 }
// The steps of the mission day, in days: one day and one hour.
const DAY_BUMPS = [-1, -1 / 24, 1 / 24, 1]
// The limits of the daily schedule. The contract (TRIP_LIMITS) has no limits for it, so these are the choice of this page.
const SLEEP_HOURS = { min: 4, max: 12, step: 0.5 }
const EXERCISE = { maxSessions: 4, minMinutes: 10, maxMinutes: 120, stepMinutes: 5 }
const STORM_DEFAULT = { dose: 100, hours: 24 }

const DESTINATIONS: { id: Preset['destination']; label: string }[] = [
  { id: 'leo', label: t('Low Earth orbit') },
  { id: 'moon', label: t('Moon') },
  { id: 'mars', label: t('Mars') },
]
const SOLAR_LABEL: Record<SolarId, string> = { max: t('Near solar maximum (MSL RAD)'), declining: t('Declining phase (Liulin-MO)') }
const UNIT_NOTE: Record<DoseUnit, string> = { mSv: t('dose equivalent'), mGy: t('absorbed dose') }
const DOSE_UNITS: DoseUnit[] = ['mSv', 'mGy']
const METABOLIC_LABEL: Record<MetabolicId, string> = { hidh: t('NASA handbook rates by activity'), exercise90: t('1.08 kg of CO2 with 90 minutes of exercise') }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const round = (value: number, decimals: number) => Number(value.toFixed(decimals))
const daysText = (days: number) => fmt(days, Number.isInteger(days) ? 0 : 1)
// An hour of the day as a clock time: 13.5 is 13:30.
function hourText(hour: number): string {
  const minutes = Math.round((((hour % 24) + 24) % 24) * 60) % 1440
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

// The mission of the settings: the preset, its phases with the settings, and its length in days.
function tripPlan(trip: TripState): { preset: Preset; spans: PhaseSpan[]; days: number } {
  const preset = PRESET_BY_ID[trip.preset] ?? PRESETS[0]
  const spans = timeline(preset, trip)
  return { preset, spans, days: missionDays(spans) }
}

// How fast the trip clock moves. The speed is in mission days for each second.
function speedText(speed: number): string {
  const hours = speed * 24
  if (hours < 1) return tn(hours * 60, '{count} minute each second', '{count} minutes each second', { count: fmt(hours * 60, Number.isInteger(round(hours * 60, 1)) ? 0 : 1) })
  if (speed < 1) return tn(hours, '{count} hour each second', '{count} hours each second', { count: fmt(hours, Number.isInteger(round(hours, 1)) ? 0 : 1) })
  return tn(speed, '{count} day each second', '{count} days each second', { count: fmt(speed, Number.isInteger(round(speed, 1)) ? 0 : 1) })
}

// The start hour of each exercise session. The sessions have equal distances over the waking
// time, and the first one starts 2 hours after the crew wakes. With the default schedule
// (sleep from 22:00 for 8 hours, 2 sessions) this gives 08:00 and 16:00, as DEFAULT_SCHEDULE has.
// The server keeps whole hours only, so each start is a whole hour.
function spreadExercise(sleepStartHour: number, sleepHours: number, sessions: number, minutes: number): number[] {
  if (sessions <= 0) return []
  const wake = sleepStartHour + sleepHours
  const slot = (24 - sleepHours) / sessions
  const lead = clamp(slot - minutes / 60, 0, 2)
  return Array.from({ length: sessions }, (_, index) => Math.round(wake + lead + index * slot) % 24)
}

// The name of the mission, for the sticky bar.
export function TripMission({ trip }: { trip: TripState }) {
  return <span className="sm-mission">{t(tripPlan(trip).preset.name)}</span>
}

// The lines of the sticky bar for the trip tab: the mission day, play or pause, and the phase now.
export function TripNow({ trip, localDay, run, online }: { trip: TripState; localDay: number | null; run: Control; online: boolean }) {
  const { spans, days } = tripPlan(trip)
  const day = clamp(localDay ?? trip.day, 0, days)
  // The digits of the day are large. The mark "|" shows where they go in the translated text.
  const [before, after = ''] = t('Day {day} of {days}', { day: '|', days: daysText(days) }).split('|')
  return (
    <>
      <div className="sm-top-row">
        <span className="sm-now">
          {before}
          <span className="display sm-now-digits">{fmt(day, 1)}</span>
          {after}
        </span>
        <button type="button" className={trip.playing ? 'sm-play' : 'sm-play btn-primary'} onClick={() => run({ trip: { playing: !trip.playing } })}>
          <Icon name={trip.playing ? 'pause' : 'play'} size={18} /> {trip.playing ? t('Pause') : t('Play')}
        </button>
      </div>
      <p className="sm-time">
        {spans.length > 0 && `${t(spanAt(spans, day).phase.label)} · `}
        {trip.playing ? speedText(trip.speed) : t('paused')}
        {!online && ` · ${t('no connection')}`}
      </p>
    </>
  )
}

type Parts = { trip: TripState; preset: Preset; spans: PhaseSpan[]; days: number; send: (change: TripChange) => Promise<void> }

// All sections of the trip tab. "localDay" is the mission day while a finger moves its slider.
export function TripControls({
  trip,
  run,
  speeds = TRIP_SPEEDS,
  localDay,
  setLocalDay,
}: {
  trip: TripState
  run: Control
  speeds?: number[]
  localDay: number | null
  setLocalDay: (day: number | null) => void
}) {
  const parts: Parts = { trip, ...tripPlan(trip), send: (change) => run({ trip: change }) }
  return (
    <>
      <MissionSection {...parts} />
      <DaySection {...parts} speeds={speeds} localDay={localDay} setLocalDay={setLocalDay} />
      <RadiationSection {...parts} />
      <PlanSection {...parts} />
      <CrewSection {...parts} />
      <SystemsSection {...parts} />
      <CompareSection {...parts} />
    </>
  )
}

// ---------------------------------------------------------------------------------------
// Small controls
// ---------------------------------------------------------------------------------------

// A slider that shows its value at once while a finger moves it, and sends the value at most
// each 80 ms. The last value always goes.
function useSlide(local: number | null, setLocal: (value: number | null) => void, send: (value: number) => Promise<void>) {
  const timer = useRef<number | undefined>(undefined)
  const waiting = useRef<number | null>(null)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const move = (value: number) => {
    setLocal(value)
    waiting.current = value
    if (timer.current !== undefined) return
    timer.current = window.setTimeout(() => {
      timer.current = undefined
      if (waiting.current !== null) void send(waiting.current)
      waiting.current = null
    }, SEND_EACH_MS)
  }
  // The finger left the slider: send the last value now, and show the value of the server again.
  const release = () => {
    if (local === null) return
    window.clearTimeout(timer.current)
    timer.current = undefined
    waiting.current = null
    void send(local).finally(() => setLocal(null))
  }
  return { move, release }
}

// A row of choices where one is selected (or some, for the comparison). A choice can have a second line.
function Options<Id extends string | number>({
  label,
  options,
  selected,
  onChoose,
  wide = false,
}: {
  label: string
  options: { id: Id; text: string; note?: string; disabled?: boolean }[]
  selected: (id: Id) => boolean
  onChoose: (id: Id) => void
  wide?: boolean
}) {
  return (
    <div className={wide ? 'sm-options sm-options-wide' : 'sm-options'} role="group" aria-label={label}>
      {options.map((option) => (
        <button type="button" key={option.id} className="sm-option" aria-pressed={selected(option.id)} disabled={option.disabled} onClick={() => onChoose(option.id)}>
          <span>{option.text}</span>
          {option.note && <small>{option.note}</small>}
        </button>
      ))}
    </div>
  )
}

// A system that is on or off.
function Switch({ label, on, onChange, children }: { label: string; on: boolean; onChange: (on: boolean) => void; children?: ReactNode }) {
  return (
    <div className="sm-switch">
      <span className="sm-switch-name">
        {label}
        {children}
      </span>
      <div className="segmented sm-seg" role="group" aria-label={label}>
        <button type="button" aria-pressed={on} onClick={() => !on && onChange(true)}>
          {t('On')}
        </button>
        <button type="button" aria-pressed={!on} onClick={() => on && onChange(false)}>
          {t('Off')}
        </button>
      </div>
    </div>
  )
}

// A value with a minus button and a plus button.
function Stepper({
  label,
  value,
  text,
  min,
  max,
  step = 1,
  wrap = false,
  large = false,
  disabled = false,
  onChange,
}: {
  label: string
  value: number
  text: string
  min: number
  max: number
  step?: number
  // After the largest value comes the smallest one, as the hours of a clock do.
  wrap?: boolean
  large?: boolean
  disabled?: boolean
  onChange: (value: number) => void
}) {
  const go = (direction: number) => {
    const next = round(value + direction * step, 4)
    onChange(wrap ? (next > max ? min : next < min ? max : next) : clamp(next, min, max))
  }
  return (
    <div className="sm-pair">
      <span className="sm-label">{label}</span>
      <div className={large ? 'sm-stepper' : 'sm-stepper sm-stepper-small'}>
        <button type="button" aria-label={t('{name}: less', { name: label })} disabled={disabled || (!wrap && value <= min)} onClick={() => go(-1)}>
          <Icon name="minus" />
        </button>
        <span className="display sm-crew" aria-live="polite">
          {text}
        </span>
        <button type="button" aria-label={t('{name}: more', { name: label })} disabled={disabled || (!wrap && value >= max)} onClick={() => go(1)}>
          <Icon name="plus" />
        </button>
      </div>
    </div>
  )
}

// A number that the presenter types. The page sends it when the field loses the focus or on Enter.
// Give it a "key" with the value of the server, so a change from another screen shows here.
function NumberField({
  label,
  value,
  min,
  max,
  step,
  unit,
  disabled = false,
  onCommit,
}: {
  label: string
  // null: the server has no value yet, so the field starts empty.
  value: number | null
  min: number
  max: number
  step: number
  unit: string
  disabled?: boolean
  onCommit: (value: number) => void
}) {
  const first = value === null ? '' : String(value)
  const [draft, setDraft] = useState(first)
  const commit = () => {
    const typed = Number(draft)
    if (draft.trim() === '' || !Number.isFinite(typed)) return setDraft(first)
    const next = clamp(typed, min, max)
    setDraft(String(next))
    if (next !== value) onCommit(next)
  }
  return (
    <label className="sm-field">
      <span className="sm-label">{label}</span>
      <span className="sm-field-input">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={draft}
          disabled={disabled}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => event.key === 'Enter' && commit()}
        />
        <span className="muted">{unit}</span>
      </span>
      <span className="sm-range muted">{t('{min} to {max}', { min: fmt(min, Number.isInteger(min) ? 0 : 2), max: fmt(max, Number.isInteger(max) ? 0 : 2) })}</span>
    </label>
  )
}

// ---------------------------------------------------------------------------------------
// The sections
// ---------------------------------------------------------------------------------------

// 1. The mission preset.
function MissionSection({ trip, preset, send }: Parts) {
  return (
    <section className="sm-section" aria-labelledby="sm-mission">
      <h2 id="sm-mission">{t('Mission')}</h2>
      {DESTINATIONS.map((destination) => {
        const presets = PRESETS.filter((item) => item.destination === destination.id)
        if (presets.length === 0) return null
        return (
          <div className="sm-pair" key={destination.id}>
            <span className="sm-label">{destination.label}</span>
            <Options
              wide
              label={destination.label}
              options={presets.map((item) => ({ id: item.id, text: t(item.name) }))}
              selected={(id) => id === trip.preset}
              onChoose={(id) => id !== trip.preset && void send({ preset: id })}
            />
          </div>
        )
      })}
      {preset.summary && <p className="sm-hint">{t(preset.summary)}</p>}
      <p className="sm-hint">{t('A new mission starts at day 0 with its first settings. The comparison and the speed stay.')}</p>
      <p className="sm-hint">{t('The trip page is at /trip. Open it on the screen for the audience.')}</p>
      <a className="btn" href="/trip">
        {t('Open the trip page')}
      </a>
    </section>
  )
}

// 2. The mission day: the slider, the steps, the clock, and the start of each phase.
function DaySection({ trip, spans, days, send, speeds, localDay, setLocalDay }: Parts & { speeds: number[]; localDay: number | null; setLocalDay: (day: number | null) => void }) {
  const { move, release } = useSlide(localDay, setLocalDay, (day) => send({ day }))
  const day = clamp(localDay ?? trip.day, 0, days)
  const at = (value: number) => (days > 0 ? (clamp(value, 0, days) / days) * 100 : 0)
  const speedList = speeds.includes(trip.speed) ? speeds : [...speeds, trip.speed].sort((a, b) => a - b)
  const bumpText = (bump: number) => (Math.abs(bump) === 1 ? tn(1, '{count} day', '{count} days') : tn(1, '{count} hour', '{count} hours'))

  return (
    <section className="sm-section" aria-labelledby="sm-day">
      <div className="sm-head">
        <h2 id="sm-day">{t('Mission day')}</h2>
        {spans.length > 0 && <span className="muted small">{t(spanAt(spans, day).phase.label)}</span>}
      </div>
      <div className="sm-co2-value">
        <span className="display sm-ppm">{fmt(day, 2)}</span> <span className="sm-co2-unit">{tn(days, 'of {count} day', 'of {count} days', { count: daysText(days) })}</span>
        <span className="sm-co2-mmhg">
          {t('Cabin time')} <strong>{hourText((day % 1) * 24)}</strong>
        </span>
      </div>
      <div className="sm-slider">
        <input
          type="range"
          min={0}
          max={days}
          step={DAY_STEP}
          value={day}
          style={{ '--fill': `${at(day)}%` } as CSSProperties}
          aria-label={t('Mission day')}
          aria-valuetext={t('Day {day} of {days}', { day: fmt(day, 2), days: daysText(days) })}
          onChange={(event) => move(Number(event.target.value))}
          onPointerUp={release}
          onKeyUp={release}
          onBlur={release}
        />
        <div className="sm-marks" aria-hidden="true">
          {spans.slice(1).map((span) => (
            <i key={span.phase.id} className="sm-mark" style={{ left: `${at(span.fromDay)}%` }} />
          ))}
        </div>
      </div>

      <span className="sm-label">{t('Step by a day or an hour')}</span>
      <div className="sm-row sm-bumps sm-day-bumps">
        {DAY_BUMPS.map((bump) => (
          <button
            type="button"
            key={bump}
            disabled={bump < 0 ? day <= 0 : day >= days}
            onClick={() => send({ day: clamp(round(day + bump, 4), 0, days) })}
            aria-label={bump > 0 ? t('Forward by {time}', { time: bumpText(bump) }) : t('Back by {time}', { time: bumpText(bump) })}
          >
            {bump > 0 ? '+' : '−'}
            {bumpText(bump)}
          </button>
        ))}
      </div>

      <span className="sm-label">{t('Trip clock')}</span>
      <div className="sm-row sm-clock-row">
        <button type="button" className={trip.playing ? '' : 'btn-primary'} onClick={() => send({ playing: !trip.playing })}>
          <Icon name={trip.playing ? 'pause' : 'play'} size={18} /> {trip.playing ? t('Pause') : t('Play')}
        </button>
        <label className="sm-speed">
          <span className="hide">{t('Speed')}</span>
          <select value={trip.speed} onChange={(event) => send({ speed: Number(event.target.value) })}>
            {speedList.map((speed) => (
              <option key={speed} value={speed}>
                {speedText(speed)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {spans.length > 0 && (
        <>
          <span className="sm-label">{t('Go to the start of a phase')}</span>
          <Options
            wide
            label={t('Go to the start of a phase')}
            options={spans.map((span) => ({ id: span.phase.id, text: t(span.phase.label), note: t('day {day}', { day: daysText(round(span.fromDay, 1)) }) }))}
            selected={(id) => spanAt(spans, day).phase.id === id}
            onChoose={(id) => {
              const span = spans.find((item) => item.phase.id === id)
              if (span) void send({ day: span.fromDay })
            }}
          />
        </>
      )}
    </section>
  )
}

// 3. The radiation: the solar cycle, the unit of the charts, and the what-if storms.
function RadiationSection({ trip, preset, days, send }: Parts) {
  const [dose, setDose] = useState(String(STORM_DEFAULT.dose))
  const [hours, setHours] = useState(String(STORM_DEFAULT.hours))
  const full = trip.storms.length >= TRIP_LIMITS.storms
  // An empty or wrong field gives the default value. A value outside the limits moves to the nearest limit.
  const typed = (text: string, fallback: number, limits: { min: number; max: number }) => {
    const value = Number(text)
    return clamp(text.trim() === '' || !Number.isFinite(value) ? fallback : value, limits.min, limits.max)
  }
  const add = () => {
    const storm = { dose: typed(dose, STORM_DEFAULT.dose, TRIP_LIMITS.stormDose), hours: typed(hours, STORM_DEFAULT.hours, TRIP_LIMITS.stormHours) }
    setDose(String(storm.dose))
    setHours(String(storm.hours))
    void send({ addStorm: storm })
  }
  const hoursText = (value: number) => tn(value, '{count} hour', '{count} hours', { count: fmt(value, Number.isInteger(value) ? 0 : 1) })

  return (
    <section className="sm-section" aria-labelledby="sm-radiation">
      <h2 id="sm-radiation">{t('Radiation')}</h2>
      {preset.solar && (
        <div className="sm-pair">
          <span className="sm-label">{t('Solar cycle of the flight. It selects the instrument of the dose rate.')}</span>
          <Options
            wide
            label={t('Solar cycle of the flight')}
            options={SOLAR_IDS.map((id) => ({ id, text: SOLAR_LABEL[id] }))}
            selected={(id) => id === trip.solar}
            onChoose={(id) => id !== trip.solar && void send({ solar: id })}
          />
        </div>
      )}
      <div className="sm-pair">
        <span className="sm-label">{t('Unit of the charts. The two units are different quantities, so the page never adds them.')}</span>
        <Options
          label={t('Unit of the charts')}
          options={DOSE_UNITS.map((unit) => ({ id: unit, text: unit, note: UNIT_NOTE[unit] }))}
          selected={(unit) => unit === trip.doseUnit}
          onChoose={(unit) => unit !== trip.doseUnit && void send({ doseUnit: unit })}
        />
      </div>

      <h3 className="sm-sub">{t('Solar storm')}</h3>
      <p className="sm-whatif">{t('What-if scenario. Nobody can forecast the date of a solar particle event.')}</p>
      <div className="sm-fields">
        <label className="sm-field">
          <span className="sm-label">{t('Extra dose of the storm')}</span>
          <span className="sm-field-input">
            <input type="number" inputMode="decimal" min={TRIP_LIMITS.stormDose.min} max={TRIP_LIMITS.stormDose.max} step={1} value={dose} onChange={(event) => setDose(event.target.value)} />
            <span className="muted">{trip.doseUnit}</span>
          </span>
        </label>
        <label className="sm-field">
          <span className="sm-label">{t('Length of the storm')}</span>
          <span className="sm-field-input">
            <input type="number" inputMode="decimal" min={TRIP_LIMITS.stormHours.min} max={TRIP_LIMITS.stormHours.max} step={1} value={hours} onChange={(event) => setHours(event.target.value)} />
            <span className="muted">{t('hours')}</span>
          </span>
        </label>
      </div>
      <div className="sm-row">
        <button type="button" className="sm-tall" disabled={full} onClick={add}>
          <Icon name="plus" size={18} /> {t('Add a storm at this mission day')}
        </button>
      </div>
      <p className="sm-hint">
        {full
          ? t('The mission has {count} storms, which is the most that the page takes. Remove one to add another.', { count: TRIP_LIMITS.storms })
          : t('The storm starts at day {day}. The page takes at most {count} storms.', { day: fmt(clamp(trip.day, 0, days), 2), count: TRIP_LIMITS.storms })}
      </p>

      {trip.storms.length > 0 && (
        <>
          <ul className="sm-storms" aria-label={t('Storms of this mission')}>
            {trip.storms.map((storm, index) => (
              <li key={`${index}-${storm.day}-${storm.dose}-${storm.hours}`}>
                <span>
                  {t('Day {day}', { day: fmt(storm.day, 1) })} · {fmt(storm.dose, Number.isInteger(storm.dose) ? 0 : 1)} {trip.doseUnit} · {hoursText(storm.hours)}
                </span>
                <button type="button" aria-label={t('Remove the storm of day {day}', { day: fmt(storm.day, 1) })} onClick={() => send({ removeStorm: index })}>
                  {t('Remove')}
                </button>
              </li>
            ))}
          </ul>
          <div className="sm-row">
            <button type="button" onClick={() => send({ clearStorms: true })}>
              {t('Remove all storms')}
            </button>
          </div>
        </>
      )}
    </section>
  )
}

// 4. The mission plan. The section shows only what the preset has.
function PlanSection({ trip, preset, send }: Parts) {
  const stay = preset.surfaceStay
  const [localStay, setLocalStay] = useState<number | null>(null)
  const { move, release } = useSlide(localStay, setLocalStay, (surfaceDays) => send({ surfaceDays }))
  const isCustom = preset.id === 'custom'
  if (!stay && !preset.returnTrip && !isCustom) return null
  const stayMin = stay ? Math.max(stay.minDays, TRIP_LIMITS.surfaceDays.min) : 0
  const stayMax = stay ? Math.min(stay.maxDays, TRIP_LIMITS.surfaceDays.max) : 0
  const stayDays = clamp(localStay ?? trip.surfaceDays, stayMin, stayMax)

  return (
    <section className="sm-section" aria-labelledby="sm-plan">
      <h2 id="sm-plan">{t('Mission plan')}</h2>
      {stay && (
        <div className="sm-pair">
          <div className="sm-head">
            <span className="sm-label">{t('Surface stay')}</span>
            <span className="sm-value">{tn(stayDays, '{count} day', '{count} days')}</span>
          </div>
          <input
            type="range"
            min={stayMin}
            max={stayMax}
            step={1}
            value={stayDays}
            style={{ '--fill': `${stayMax > stayMin ? ((stayDays - stayMin) / (stayMax - stayMin)) * 100 : 0}%` } as CSSProperties}
            aria-label={t('Surface stay in days')}
            aria-valuetext={tn(stayDays, '{count} day', '{count} days')}
            onChange={(event) => move(Number(event.target.value))}
            onPointerUp={release}
            onKeyUp={release}
            onBlur={release}
          />
          <span className="sm-range muted">{t('{min} to {max} days. The preset has {value}.', { min: fmt(stayMin), max: fmt(stayMax), value: fmt(stay.defaultDays) })}</span>
        </div>
      )}
      {preset.returnTrip && <Switch label={t('Return flight')} on={trip.returnTrip} onChange={(returnTrip) => void send({ returnTrip })} />}
      {isCustom && (
        <>
          <div className="sm-fields">
            <NumberField
              key={`days-${trip.customDays}`}
              label={t('Length of the flight')}
              value={trip.customDays}
              min={TRIP_LIMITS.customDays.min}
              max={TRIP_LIMITS.customDays.max}
              step={1}
              unit={t('days')}
              onCommit={(customDays) => void send({ customDays })}
            />
            <NumberField
              key={`rate-${trip.customRate}`}
              label={t('Dose rate')}
              value={trip.customRate}
              min={TRIP_LIMITS.customRate.min}
              max={TRIP_LIMITS.customRate.max}
              step={0.01}
              unit={t('{unit} each day', { unit: trip.customUnit })}
              onCommit={(customRate) => void send({ customRate })}
            />
          </div>
          <div className="sm-pair">
            <span className="sm-label">{t('Unit of the dose rate')}</span>
            <Options
              label={t('Unit of the dose rate')}
              options={DOSE_UNITS.map((unit) => ({ id: unit, text: unit, note: UNIT_NOTE[unit] }))}
              selected={(unit) => unit === trip.customUnit}
              onChoose={(unit) => unit !== trip.customUnit && void send({ customUnit: unit })}
            />
          </div>
          <p className="sm-hint">{t('The custom mission uses your numbers. They are not from a source.')}</p>
        </>
      )}
    </section>
  )
}

// 5. The crew, the cabin, the metabolic numbers, and the daily schedule.
function CrewSection({ trip, preset, send }: Parts) {
  const { life } = trip
  const { schedule } = life
  const sessions = schedule.exerciseStartHours.length
  // The page sends the whole schedule. It spreads the exercise sessions over the waking time again.
  const sendSchedule = (change: Partial<Pick<Schedule, 'sleepStartHour' | 'sleepHours' | 'exerciseMinutes'>> & { sessions?: number }) => {
    const next = { ...schedule, ...change }
    const full: Schedule = {
      sleepStartHour: next.sleepStartHour,
      sleepHours: next.sleepHours,
      exerciseStartHours: spreadExercise(next.sleepStartHour, next.sleepHours, change.sessions ?? sessions, next.exerciseMinutes),
      exerciseMinutes: next.exerciseMinutes,
    }
    void send({ life: { schedule: full } })
  }

  return (
    <section className="sm-section" aria-labelledby="sm-crew">
      <h2 id="sm-crew">{t('Crew and cabin')}</h2>
      <Stepper large label={t('Crew count')} value={life.crew} text={String(life.crew)} min={TRIP_LIMITS.crew.min} max={TRIP_LIMITS.crew.max} onChange={(crew) => void send({ life: { crew } })} />
      <NumberField
        key={`volume-${life.freeVolumeM3}`}
        label={t('Free volume of the cabin')}
        value={life.freeVolumeM3}
        min={TRIP_LIMITS.freeVolumeM3.min}
        max={TRIP_LIMITS.freeVolumeM3.max}
        step={1}
        unit="m³"
        onCommit={(freeVolumeM3) => void send({ life: { freeVolumeM3 } })}
      />
      <p className="sm-hint">
        {preset.cabin.name
          ? t('The preset has {value} m³ ({name}) and a crew of {crew}.', { value: fmt(preset.cabin.freeVolumeM3, Number.isInteger(preset.cabin.freeVolumeM3) ? 0 : 1), name: t(preset.cabin.name), crew: preset.crew })
          : t('The preset has {value} m³ and a crew of {crew}.', { value: fmt(preset.cabin.freeVolumeM3, Number.isInteger(preset.cabin.freeVolumeM3) ? 0 : 1), crew: preset.crew })}
      </p>

      <div className="sm-pair">
        <span className="sm-label">{t('Metabolic numbers: the CO2 that a person makes and the O2 that a person uses')}</span>
        <Options
          wide
          label={t('Metabolic numbers')}
          options={METABOLIC_IDS.map((id) => ({ id, text: METABOLIC_LABEL[id] }))}
          selected={(id) => id === life.metabolic}
          onChoose={(id) => id !== life.metabolic && void send({ life: { metabolic: id } })}
        />
      </div>

      <h3 className="sm-sub">{t('Daily schedule')}</h3>
      <div className="sm-steppers">
        <Stepper wrap label={t('Sleep starts at')} value={schedule.sleepStartHour} text={hourText(schedule.sleepStartHour)} min={0} max={23} onChange={(sleepStartHour) => sendSchedule({ sleepStartHour })} />
        <Stepper
          label={t('Hours of sleep')}
          value={schedule.sleepHours}
          text={fmt(schedule.sleepHours, Number.isInteger(schedule.sleepHours) ? 0 : 1)}
          min={SLEEP_HOURS.min}
          max={SLEEP_HOURS.max}
          step={SLEEP_HOURS.step}
          onChange={(sleepHours) => sendSchedule({ sleepHours })}
        />
        <Stepper label={t('Exercise sessions each day')} value={sessions} text={String(sessions)} min={0} max={EXERCISE.maxSessions} onChange={(next) => sendSchedule({ sessions: next })} />
        <Stepper
          label={t('Minutes of one session')}
          value={schedule.exerciseMinutes}
          text={fmt(schedule.exerciseMinutes)}
          min={EXERCISE.minMinutes}
          max={EXERCISE.maxMinutes}
          step={EXERCISE.stepMinutes}
          disabled={sessions === 0}
          onChange={(exerciseMinutes) => sendSchedule({ exerciseMinutes })}
        />
      </div>
      <p className="sm-hint">
        {sessions === 0
          ? t('No exercise.')
          : t('Exercise starts at {times}. Total: {minutes} minutes each day.', { times: schedule.exerciseStartHours.map(hourText).join(', '), minutes: fmt(sessions * schedule.exerciseMinutes) })}{' '}
        {t('All crew members have the same day. The page spreads the sessions over the waking time.')}
      </p>
    </section>
  )
}

// 6. The life support systems. A change here is a failure (or a repair) at the mission day of the cursor.
function SystemsSection({ trip, send }: Parts) {
  const { life } = trip
  // The presenter chose "Set a rate" and did not type a number yet. The page sends nothing until then.
  const [rateOpen, setRateOpen] = useState(false)
  const manual = life.ogaKgPerDay !== null || rateOpen
  const sendLife = (change: Partial<LifeSupport>) => void send({ life: change })

  return (
    <section className="sm-section" aria-labelledby="sm-systems">
      <h2 id="sm-systems">{t('Life support systems')}</h2>
      <p className="sm-hint">
        {t('A failure starts at the mission day of the cursor. Before that day, the cabin has the normal settings of the mission.')}{' '}
        <strong className="sm-changed">{trip.lifeChangedDay > 0 ? t('Changed on day {day}', { day: fmt(trip.lifeChangedDay, 1) }) : t('The settings apply from day 0.')}</strong>
      </p>

      <div className="sm-pair">
        <span className="sm-label">{t('CO2 scrubber. It removes the CO2 from the cabin air.')}</span>
        <div className="segmented sm-cdra" role="group" aria-label={t('CO2 scrubber')}>
          {CDRA_STATES.map((state: Cdra) => (
            <button type="button" key={state} aria-pressed={life.scrubber === state} onClick={() => life.scrubber !== state && sendLife({ scrubber: state })}>
              {CDRA_LABEL[state]}
            </button>
          ))}
        </div>
      </div>

      <Switch label={t('Oxygen generator')} on={life.ogaOn} onChange={(ogaOn) => sendLife({ ogaOn })} />
      <div className="sm-pair">
        <span className="sm-label">{t('O2 that the generator makes')}</span>
        <div className="segmented sm-cdra" role="group" aria-label={t('O2 that the generator makes')}>
          <button
            type="button"
            aria-pressed={!manual}
            disabled={!life.ogaOn}
            onClick={() => {
              setRateOpen(false)
              if (life.ogaKgPerDay !== null) sendLife({ ogaKgPerDay: null })
            }}
          >
            {t('Automatic')}
          </button>
          <button type="button" aria-pressed={manual} disabled={!life.ogaOn} onClick={() => setRateOpen(true)}>
            {t('Set a rate')}
          </button>
        </div>
        {manual ? (
          <NumberField
            key={`oga-${life.ogaKgPerDay}`}
            label={t('Rate of the generator')}
            value={life.ogaKgPerDay}
            min={TRIP_LIMITS.ogaKgPerDay.min}
            max={TRIP_LIMITS.ogaKgPerDay.max}
            step={0.05}
            unit={t('kg each day')}
            disabled={!life.ogaOn}
            onCommit={(ogaKgPerDay) => sendLife({ ogaKgPerDay })}
          />
        ) : (
          <span className="sm-range muted">{t('Automatic: the generator makes as much O2 as the crew uses.')}</span>
        )}
      </div>

      <NumberField
        key={`bottled-${life.bottledO2Kg}`}
        label={t('O2 in bottles. The cabin uses it when the generator is off.')}
        value={life.bottledO2Kg}
        min={TRIP_LIMITS.bottledO2Kg.min}
        max={TRIP_LIMITS.bottledO2Kg.max}
        step={1}
        unit="kg"
        onCommit={(bottledO2Kg) => sendLife({ bottledO2Kg })}
      />

      <Switch label={t('Sabatier reactor')} on={life.sabatier} onChange={(sabatier) => sendLife({ sabatier })} />
      <span className="sm-range muted">{t('The Sabatier reactor makes water from CO2 and hydrogen. It changes how much of the O2 comes back, not the gas in the cabin.')}</span>

      <div className="sm-row">
        <button type="button" className="sm-tall" onClick={() => send({ resetLife: true })}>
          <Icon name="restart" size={18} /> {t('All systems back to normal')}
        </button>
      </div>
    </section>
  )
}

// 7. The missions of the comparison chart.
function CompareSection({ trip, send }: Parts) {
  const chosen = trip.compare
  const full = chosen.length >= COMPARE.max
  const toggle = (id: PresetId) => {
    const next = chosen.includes(id) ? chosen.filter((item) => item !== id) : [...chosen, id]
    // The last mission stays, and a fourth one does not go in.
    if (next.length >= COMPARE.min && next.length <= COMPARE.max) void send({ compare: next })
  }
  return (
    <section className="sm-section" aria-labelledby="sm-compare">
      <div className="sm-head">
        <h2 id="sm-compare">{t('Compare')}</h2>
        <span className="muted small">{t('{count} of {max} chosen', { count: chosen.length, max: COMPARE.max })}</span>
      </div>
      <span className="sm-label">{t('Choose {min} to {max} missions for the comparison chart.', { min: COMPARE.min, max: COMPARE.max })}</span>
      <Options
        wide
        label={t('Missions of the comparison chart')}
        options={PRESETS.map((item) => ({ id: item.id, text: t(item.name), disabled: full && !chosen.includes(item.id) }))}
        selected={(id) => chosen.includes(id)}
        onChoose={toggle}
      />
    </section>
  )
}
