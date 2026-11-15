// The simulator: one state for all screens. It has two groups of settings, and one group
// does not change the other:
//   the CO2 page   one clock on the RR-9 record and one CO2 value ("State" and the values).
//   the trip page  the mission, the cursor day, and the what-if settings ("TripState").
//
// The CO2 group:
//
// Two modes:
//   "replay"     The clock plays the real record. Each value is a real sensor value.
//   "simulated"  The clock moves the value with the cabin model (shared/co2.ts), from the
//                crew count and the state of the CDRA. The presenter can also set the value.
//
// The engine keeps the values of the last 7 days, because the longest average needs them.
// Each value has a source, so the page can always tell real data from simulated data.
import {
  CDRA_STATES,
  CREW_LIMITS,
  DEFAULT_PARAMS,
  HISTORY_STEPS,
  PARAM_LIMITS,
  STEP_MINUTES,
  advance,
  mmHgToPpm,
  modelOf,
  ppmToMmHg,
  type Cdra,
  type ModelParams,
} from '../../shared/co2.ts'
import { defaultTrip, nominalLife } from '../../shared/trip/defaults.ts'
import { DEFAULT_PRESET, PRESET_BY_ID } from '../../shared/trip/presets/index.ts'
import { missionDays, timeline } from '../../shared/trip/timeline.ts'
import {
  METABOLIC_IDS,
  PRESET_IDS,
  SOLAR_IDS,
  TRIP_LIMITS,
  TRIP_SPEEDS,
  type DoseUnit,
  type LifeSupport,
  type Preset,
  type PresetId,
  type Schedule,
  type TripState,
} from '../../shared/trip/types.ts'
import type { CabinRecord } from './record.ts'

export type Mode = 'replay' | 'simulated'
// The source of one value: the real record, the cabin model, or the hand of the presenter.
export const SOURCE = { record: 0, model: 1, manual: 2 } as const
// How many 5-minute steps the clock makes each second.
export const SPEEDS = [1 / 3, 1, 12, 72]
export const PPM_LIMITS = { min: 300, max: 10_000 }
// The presenter can fill the last hours with the current value: 1 hour, 24 hours, or 7 days.
export const HOLD_HOURS = [1, 24, 168]

const STEP_MS = STEP_MINUTES * 60_000
const DEFAULTS = { crew: 6, cdra: 'both' as Cdra, speed: SPEEDS[0] }

export type State = {
  mode: Mode
  playing: boolean
  speed: number
  // Steps since the start of the record. After its end, the record starts again.
  step: number
  // The time of the current value. In replay mode this is the real time of the sensor value.
  timeMs: number
  crew: number
  cdra: Cdra
  params: ModelParams
}

// What the server sends to each open page.
//   full:  all values of the last 7 days, and the trip settings.
//   tick:  new values at the end.                  last: a new value in place of the newest one.
//   state: only the CO2 settings changed.          trip: only the trip settings changed.
export type Message =
  | { type: 'full'; state: State; trip: TripState; ppm: number[]; src: number[] }
  | { type: 'tick'; state: State; ppm: number[]; src: number[] }
  | { type: 'last'; state: State; ppm: number; src: number }
  | { type: 'state'; state: State }
  | { type: 'trip'; trip: TripState }
export type FullMessage = Extract<Message, { type: 'full' }>

const round = (ppm: number) => Math.round(ppm * 10) / 10
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

// ---------------------------------------------------------------------------------------
// The trip settings: the checks of one request
// ---------------------------------------------------------------------------------------
export type Presets = Record<PresetId, Preset>

// The limits of the life support settings that shared/trip/types.ts does not give.
export const LIFE_LIMITS = {
  temperatureC: { min: 15, max: 30 },
  totalPressureMmHg: { min: 400, max: 800 },
  scrubberUnits: { min: 0.5, max: 4 },
  otherUnits: { min: 0, max: 3 },
  hourOfDay: { min: 0, max: 23 },
  sleepHours: { min: 4, max: 12 },
  exerciseMinutes: { min: 0, max: 120 },
  exerciseSessions: 4,
}

const DOSE_UNITS: DoseUnit[] = ['mGy', 'mSv']
const TRIP_FIELDS = [
  'preset',
  'day',
  'playing',
  'speed',
  'solar',
  'doseUnit',
  'surfaceDays',
  'returnTrip',
  'customDays',
  'customRate',
  'customUnit',
  'addStorm',
  'removeStorm',
  'clearStorms',
  'life',
  'resetLife',
  'compare',
]
const LIFE_FIELDS: (keyof LifeSupport)[] = [
  'crew',
  'freeVolumeM3',
  'temperatureC',
  'totalPressureMmHg',
  'metabolic',
  'schedule',
  'scrubber',
  'scrubberUnits',
  'otherUnits',
  'ogaOn',
  'ogaKgPerDay',
  'bottledO2Kg',
  'sabatier',
]
const SCHEDULE_FIELDS: (keyof Schedule)[] = ['sleepStartHour', 'sleepHours', 'exerciseStartHours', 'exerciseMinutes']
// A change of one of these settings is a failure or a repair, so it starts at the cursor day.
const FAILURE_FIELDS = ['scrubber', 'ogaOn', 'ogaKgPerDay', 'bottledO2Kg'] as const

// The mission day with 6 decimals (less than 0.1 second), so the clock makes no long fractions.
const roundDay = (day: number) => Math.round(day * 1e6) / 1e6

// A wrong value in a request. The text goes to the presenter.
class Refused extends Error {}
function refuse(text: string): never {
  throw new Refused(text)
}
// A number outside its limits goes to the nearest limit, as the CO2 settings do.
function numberIn(value: unknown, name: string, limits: { min: number; max: number }): number {
  if (!isNumber(value)) refuse(`${name} must be a number.`)
  return clamp(value, limits.min, limits.max)
}
function booleanOf(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') refuse(`${name} must be true or false.`)
  return value
}
function oneOf<Item>(value: unknown, name: string, list: readonly Item[]): Item {
  if (!list.includes(value as Item)) refuse(`${name} must be one of ${list.join(', ')}.`)
  return value as Item
}
function objectOf(value: unknown, name: string, fields: readonly string[]): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) refuse(`${name} must be an object.`)
  const wrong = Object.keys(value).find((field) => !fields.includes(field))
  if (wrong !== undefined) refuse(`The setting "${name}.${wrong}" does not exist.`)
  return value as Record<string, unknown>
}

// Puts the fields of a request into the life support settings.
function changeLife(life: LifeSupport, value: unknown) {
  const input = objectOf(value, 'trip.life', LIFE_FIELDS)
  if ('crew' in input) life.crew = Math.round(numberIn(input.crew, 'trip.life.crew', TRIP_LIMITS.crew))
  if ('freeVolumeM3' in input) life.freeVolumeM3 = numberIn(input.freeVolumeM3, 'trip.life.freeVolumeM3', TRIP_LIMITS.freeVolumeM3)
  if ('temperatureC' in input) life.temperatureC = numberIn(input.temperatureC, 'trip.life.temperatureC', LIFE_LIMITS.temperatureC)
  if ('totalPressureMmHg' in input) life.totalPressureMmHg = numberIn(input.totalPressureMmHg, 'trip.life.totalPressureMmHg', LIFE_LIMITS.totalPressureMmHg)
  if ('metabolic' in input) life.metabolic = oneOf(input.metabolic, 'trip.life.metabolic', METABOLIC_IDS)
  if ('scrubber' in input) life.scrubber = oneOf(input.scrubber, 'trip.life.scrubber', CDRA_STATES)
  if ('scrubberUnits' in input) life.scrubberUnits = numberIn(input.scrubberUnits, 'trip.life.scrubberUnits', LIFE_LIMITS.scrubberUnits)
  if ('otherUnits' in input) life.otherUnits = numberIn(input.otherUnits, 'trip.life.otherUnits', LIFE_LIMITS.otherUnits)
  if ('ogaOn' in input) life.ogaOn = booleanOf(input.ogaOn, 'trip.life.ogaOn')
  // null: the generator makes as much O2 as the crew uses.
  if ('ogaKgPerDay' in input) life.ogaKgPerDay = input.ogaKgPerDay === null ? null : numberIn(input.ogaKgPerDay, 'trip.life.ogaKgPerDay', TRIP_LIMITS.ogaKgPerDay)
  if ('bottledO2Kg' in input) life.bottledO2Kg = numberIn(input.bottledO2Kg, 'trip.life.bottledO2Kg', TRIP_LIMITS.bottledO2Kg)
  if ('sabatier' in input) life.sabatier = booleanOf(input.sabatier, 'trip.life.sabatier')
  if ('schedule' in input) {
    const schedule = objectOf(input.schedule, 'trip.life.schedule', SCHEDULE_FIELDS)
    const hour = (item: unknown, name: string) => Math.round(numberIn(item, name, LIFE_LIMITS.hourOfDay))
    if ('sleepStartHour' in schedule) life.schedule.sleepStartHour = hour(schedule.sleepStartHour, 'trip.life.schedule.sleepStartHour')
    if ('sleepHours' in schedule) life.schedule.sleepHours = numberIn(schedule.sleepHours, 'trip.life.schedule.sleepHours', LIFE_LIMITS.sleepHours)
    if ('exerciseStartHours' in schedule) {
      const hours = schedule.exerciseStartHours
      if (!Array.isArray(hours) || hours.length > LIFE_LIMITS.exerciseSessions) {
        refuse(`trip.life.schedule.exerciseStartHours must be a list of at most ${LIFE_LIMITS.exerciseSessions} hours.`)
      }
      life.schedule.exerciseStartHours = hours.map((item) => hour(item, 'Each hour of trip.life.schedule.exerciseStartHours'))
    }
    if ('exerciseMinutes' in schedule) {
      life.schedule.exerciseMinutes = numberIn(schedule.exerciseMinutes, 'trip.life.schedule.exerciseMinutes', LIFE_LIMITS.exerciseMinutes)
    }
  }
}

// The trip settings after one request (the field "trip" of a control request). It does not change
// "trip": it returns new settings, or an error text. So a wrong field changes nothing at all.
// The order of the fields in the request has no effect. The function uses them in this order:
// preset, resetLife, the mission settings, day, life, the storms, compare, speed, playing.
export function changeTrip(trip: TripState, value: unknown, presets: Presets = PRESET_BY_ID): TripState | { error: string } {
  try {
    return changedTrip(trip, value, presets)
  } catch (error) {
    if (error instanceof Refused) return { error: error.message }
    throw error
  }
}

function changedTrip(trip: TripState, value: unknown, presets: Presets): TripState {
  const input = objectOf(value, 'trip', TRIP_FIELDS)
  let next = structuredClone(trip)

  // A new mission starts from its first settings. The comparison and the speed stay.
  if ('preset' in input) {
    const id = oneOf(input.preset, 'trip.preset', PRESET_IDS)
    next = { ...defaultTrip(presets[id]), compare: next.compare, speed: next.speed, playing: false }
  }
  const preset = presets[next.preset]

  // The repair of all failures. The cabin and the day of the crew stay as the presenter set them.
  if ('resetLife' in input && booleanOf(input.resetLife, 'trip.resetLife')) {
    const { crew, freeVolumeM3, schedule, metabolic } = next.life
    next.life = { ...nominalLife(preset, crew, freeVolumeM3), schedule, metabolic }
    next.lifeChangedDay = 0
  }

  if ('solar' in input) next.solar = oneOf(input.solar, 'trip.solar', SOLAR_IDS)
  if ('doseUnit' in input) next.doseUnit = oneOf(input.doseUnit, 'trip.doseUnit', DOSE_UNITS)
  if ('surfaceDays' in input) {
    next.surfaceDays = numberIn(input.surfaceDays, 'trip.surfaceDays', TRIP_LIMITS.surfaceDays)
    // A preset with a surface stay has its own limits too.
    if (preset.surfaceStay) next.surfaceDays = clamp(next.surfaceDays, preset.surfaceStay.minDays, preset.surfaceStay.maxDays)
  }
  if ('returnTrip' in input) next.returnTrip = booleanOf(input.returnTrip, 'trip.returnTrip')
  if ('customDays' in input) next.customDays = numberIn(input.customDays, 'trip.customDays', TRIP_LIMITS.customDays)
  if ('customRate' in input) next.customRate = numberIn(input.customRate, 'trip.customRate', TRIP_LIMITS.customRate)
  if ('customUnit' in input) next.customUnit = oneOf(input.customUnit, 'trip.customUnit', DOSE_UNITS)

  // The settings above can change the length of the mission, so the cursor must go inside it again.
  const end = missionDays(timeline(preset, next))
  if ('day' in input) next.day = numberIn(input.day, 'trip.day', { min: 0, max: end })
  next.day = clamp(next.day, 0, end)

  if ('life' in input) {
    const before = { ...next.life }
    changeLife(next.life, input.life)
    if (FAILURE_FIELDS.some((name) => next.life[name] !== before[name])) next.lifeChangedDay = next.day
  }
  next.lifeChangedDay = clamp(next.lifeChangedDay, 0, end)

  if ('clearStorms' in input && booleanOf(input.clearStorms, 'trip.clearStorms')) next.storms = []
  if ('removeStorm' in input) {
    const index = input.removeStorm
    if (!isNumber(index) || !Number.isInteger(index) || index < 0 || index >= next.storms.length) {
      refuse(next.storms.length ? `trip.removeStorm must be the index of a storm, from 0 to ${next.storms.length - 1}.` : 'The trip has no storm to remove.')
    }
    next.storms.splice(index, 1)
  }
  if ('addStorm' in input) {
    const storm = objectOf(input.addStorm, 'trip.addStorm', ['dose', 'hours', 'day'])
    const added = {
      day: 'day' in storm ? numberIn(storm.day, 'trip.addStorm.day', { min: 0, max: end }) : next.day,
      dose: numberIn(storm.dose, 'trip.addStorm.dose', TRIP_LIMITS.stormDose),
      hours: numberIn(storm.hours, 'trip.addStorm.hours', TRIP_LIMITS.stormHours),
    }
    if (next.storms.length >= TRIP_LIMITS.storms) refuse(`The trip has ${TRIP_LIMITS.storms} storms already. Remove one first.`)
    next.storms.push(added)
  }

  if ('compare' in input) {
    const list: unknown = input.compare
    const fine = Array.isArray(list) && list.length >= 1 && list.length <= 3 && new Set(list).size === list.length && list.every((id) => PRESET_IDS.includes(id))
    if (!fine) refuse('trip.compare must be a list of 1 to 3 different presets.')
    next.compare = [...(list as PresetId[])]
  }

  if ('speed' in input) next.speed = oneOf(input.speed, 'trip.speed', TRIP_SPEEDS)
  if ('playing' in input) {
    next.playing = booleanOf(input.playing, 'trip.playing')
    // "Play" at the end of the mission plays the mission again from its first day.
    if (next.playing && !('day' in input) && next.day >= end) next.day = 0
  }
  return next
}

// ---------------------------------------------------------------------------------------
// The engine
// ---------------------------------------------------------------------------------------
// The tests give their own presets, so they do not depend on the numbers of the real ones.
export function createEngine(record: CabinRecord, options: { presets?: Presets; defaultPreset?: PresetId } = {}) {
  const presets = options.presets ?? PRESET_BY_ID
  const firstPreset = options.defaultPreset ?? DEFAULT_PRESET
  const length = record.ppm.length
  // Start 7 days into the record, so each average has all its values from the first second.
  const firstStep = Math.min(HISTORY_STEPS, length - 1)

  let state: State
  let trip: TripState
  let ppm: number[] = []
  let src: number[] = []
  // The exact value of the model. The list above holds it with one decimal.
  let current = 0
  // The part of a step that the clock did not use yet.
  let carry = 0

  // Fills the list with the real values up to this step of the record.
  function loadRecordAt(step: number) {
    const index = step % length
    ppm = record.ppm.slice(Math.max(0, index - HISTORY_STEPS + 1), index + 1)
    src = ppm.map(() => SOURCE.record)
    current = ppm[ppm.length - 1]
    state.step = step
    state.timeMs = record.startMs + index * STEP_MS
    carry = 0
  }

  function push(value: number, source: number) {
    ppm.push(round(value))
    src.push(source)
    if (ppm.length > HISTORY_STEPS) {
      ppm.shift()
      src.shift()
    }
  }

  function restart() {
    state = {
      mode: 'replay',
      playing: true,
      speed: DEFAULTS.speed,
      step: firstStep,
      timeMs: 0,
      crew: DEFAULTS.crew,
      cdra: DEFAULTS.cdra,
      params: { ...DEFAULT_PARAMS },
    }
    loadRecordAt(firstStep)
    trip = defaultTrip(presets[firstPreset])
  }
  restart()

  // A copy of the settings, so a later change does not reach a message that is already made.
  const view = (): State => ({ ...state, params: { ...state.params } })
  const tripView = (): TripState => structuredClone(trip)
  const full = (): FullMessage => ({ type: 'full', state: view(), trip: tripView(), ppm: [...ppm], src: [...src] })
  // The settings of the two groups, without the values.
  const settings = () => ({ state: view(), trip: tripView() })

  // Moves the clock by one step of 5 minutes. Returns true if the record started again.
  function step(): boolean {
    state.step += 1
    if (state.mode === 'replay') {
      const index = state.step % length
      if (index === 0) {
        loadRecordAt(state.step)
        return true
      }
      current = record.ppm[index]
      state.timeMs = record.startMs + index * STEP_MS
      push(current, SOURCE.record)
      return false
    }
    const pressure = state.params.totalPressureMmHg
    const model = modelOf(state.params, state.crew, state.cdra)
    current = clamp(mmHgToPpm(advance(ppmToMmHg(current, pressure), STEP_MINUTES / 60, model), pressure), 0, PPM_LIMITS.max)
    state.timeMs += STEP_MS
    push(current, SOURCE.model)
    return false
  }

  // The clock of the CO2 group. Returns what changed, or null.
  function tickCo2(seconds: number): Message | null {
    if (!state.playing) return null
    carry += seconds * state.speed
    const steps = Math.floor(carry)
    if (steps < 1) return null
    carry -= steps
    let again = false
    for (let count = 0; count < steps; count++) again = step() || again
    if (again || steps >= HISTORY_STEPS) return full()
    const added = Math.min(steps, ppm.length)
    return { type: 'tick', state: view(), ppm: ppm.slice(-added), src: src.slice(-added) }
  }

  // The clock of the trip: "speed" mission days each second. At the end of the mission the
  // cursor stays on the last day and the clock stops. Returns true if the trip changed.
  function tickTrip(seconds: number): boolean {
    if (!trip.playing) return false
    const end = missionDays(timeline(presets[trip.preset], trip))
    const day = roundDay(trip.day + seconds * trip.speed)
    if (day >= end) {
      trip.day = end
      trip.playing = false
    } else {
      trip.day = day
    }
    return true
  }

  // The two clocks. "seconds" is the real time since the last call. Returns the messages for
  // the open pages: none, one of the CO2 group, one "trip", or both. A "full" message carries
  // the trip settings, so no "trip" message follows it.
  function tick(seconds: number): Message[] {
    const moved = tickTrip(seconds)
    const messages: Message[] = []
    const co2 = tickCo2(seconds)
    if (co2) messages.push(co2)
    if (moved && co2?.type !== 'full') messages.push({ type: 'trip', trip: tripView() })
    return messages
  }

  // Puts a value from the presenter in place of the newest value. The model continues from it.
  function setValue(value: number) {
    state.mode = 'simulated'
    current = clamp(value, PPM_LIMITS.min, PPM_LIMITS.max)
    ppm[ppm.length - 1] = round(current)
    src[src.length - 1] = SOURCE.manual
  }

  // One request of the simulator page. It can hold many settings: CO2 fields, and the field
  // "trip" with trip fields (see changeTrip). Returns the messages for the open pages, or an error text:
  //   CO2 fields only   one message: "state", "last", or "full".
  //   "trip" only       one message: "trip".
  //   both              two messages, the CO2 one first. But a "full" message carries the trip
  //                     settings, so no "trip" message follows it.
  // The engine checks the field "trip" first. With a wrong trip field, the request changes nothing.
  // With a wrong CO2 field, the trip does not change.
  function control(body: unknown): Message[] | { error: string } {
    if (typeof body !== 'object' || body === null) return { error: 'Send a JSON object.' }
    const input = body as Record<string, unknown>
    if (input.restart === true) {
      restart()
      return [full()]
    }

    const nextTrip = 'trip' in input ? changeTrip(trip, input.trip, presets) : null
    if (nextTrip && 'error' in nextTrip) return nextTrip
    // A request with the field "trip" only does not touch the CO2 group.
    const onlyTrip = nextTrip !== null && Object.keys(input).length === 1
    const scope = onlyTrip ? null : controlCo2(input)
    if (scope !== null && typeof scope === 'object') return scope
    if (nextTrip) trip = nextTrip

    const messages: Message[] = []
    if (scope === 'full') messages.push(full())
    if (scope === 'last') messages.push({ type: 'last', state: view(), ppm: ppm[ppm.length - 1], src: src[src.length - 1] })
    if (scope === 'state') messages.push({ type: 'state', state: view() })
    if (nextTrip && scope !== 'full') messages.push({ type: 'trip', trip: tripView() })
    return messages
  }

  // The CO2 fields of one request. Returns how much changed, or an error text.
  function controlCo2(input: Record<string, unknown>): 'state' | 'last' | 'full' | { error: string } {
    // The widest change wins: all values, then the newest value, then the settings only.
    const change = { scope: 'state' as 'state' | 'last' | 'full' }
    const widen = (next: 'last' | 'full') => {
      if (next === 'full' || change.scope === 'state') change.scope = next
    }

    if ('mode' in input) {
      if (input.mode !== 'replay' && input.mode !== 'simulated') return { error: 'mode must be "replay" or "simulated".' }
      if (input.mode !== state.mode) {
        state.mode = input.mode
        // Replay mode shows real values only, so the simulated values of the last days go.
        if (input.mode === 'replay') {
          loadRecordAt(state.step)
          widen('full')
        }
      }
    }
    if ('seek' in input) {
      if (!isNumber(input.seek)) return { error: 'seek must be a step of the record.' }
      state.mode = 'replay'
      loadRecordAt(clamp(Math.round(input.seek), 0, length - 1))
      widen('full')
    }
    if ('playing' in input) {
      if (typeof input.playing !== 'boolean') return { error: 'playing must be true or false.' }
      state.playing = input.playing
      carry = 0
    }
    if ('speed' in input) {
      if (!SPEEDS.includes(input.speed as number)) return { error: `speed must be one of ${SPEEDS.join(', ')}.` }
      state.speed = input.speed as number
    }
    if ('crew' in input) {
      if (!isNumber(input.crew)) return { error: 'crew must be a number.' }
      state.crew = clamp(Math.round(input.crew), CREW_LIMITS.min, CREW_LIMITS.max)
    }
    if ('cdra' in input) {
      if (!CDRA_STATES.includes(input.cdra as Cdra)) return { error: `cdra must be one of ${CDRA_STATES.join(', ')}.` }
      state.cdra = input.cdra as Cdra
    }
    if (input.resetParams === true) state.params = { ...DEFAULT_PARAMS }
    if ('params' in input) {
      if (typeof input.params !== 'object' || input.params === null) return { error: 'params must be an object.' }
      for (const [name, value] of Object.entries(input.params)) {
        const limits = PARAM_LIMITS[name as keyof ModelParams]
        if (!limits || !isNumber(value)) return { error: `The setting "${name}" does not exist or is not a number.` }
        state.params[name as keyof ModelParams] = clamp(value, limits.min, limits.max)
      }
    }
    if ('ppm' in input) {
      if (!isNumber(input.ppm)) return { error: 'ppm must be a number.' }
      setValue(input.ppm)
      widen('last')
    }
    if ('bump' in input) {
      if (!isNumber(input.bump)) return { error: 'bump must be a number of ppm.' }
      setValue(current + input.bump)
      widen('last')
    }
    if ('hold' in input) {
      if (!HOLD_HOURS.includes(input.hold as number)) return { error: `hold must be one of ${HOLD_HOURS.join(', ')} hours.` }
      // As if the cabin had this value for the last hours: fill them with the current value.
      state.mode = 'simulated'
      const steps = Math.round(((input.hold as number) * 60) / STEP_MINUTES)
      const value = round(current)
      const kept = ppm.slice(0, Math.max(0, ppm.length - steps))
      const keptSrc = src.slice(0, kept.length)
      const fill = Math.min(steps, HISTORY_STEPS)
      ppm = [...kept, ...new Array<number>(fill).fill(value)].slice(-HISTORY_STEPS)
      src = [...keptSrc, ...new Array<number>(fill).fill(SOURCE.manual)].slice(-HISTORY_STEPS)
      widen('full')
    }

    return change.scope
  }

  return { full, settings, tick, control }
}

export type Engine = ReturnType<typeof createEngine>
