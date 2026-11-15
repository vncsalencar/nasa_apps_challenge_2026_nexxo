// The simulator: one clock and one CO2 value for all screens.
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
//   full:  all values of the last 7 days.          tick: new values at the end.
//   last:  a new value in place of the newest one. state: only the settings changed.
export type Message =
  | { type: 'full'; state: State; ppm: number[]; src: number[] }
  | { type: 'tick'; state: State; ppm: number[]; src: number[] }
  | { type: 'last'; state: State; ppm: number; src: number }
  | { type: 'state'; state: State }

const round = (ppm: number) => Math.round(ppm * 10) / 10
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

export function createEngine(record: CabinRecord) {
  const length = record.ppm.length
  // Start 7 days into the record, so each average has all its values from the first second.
  const firstStep = Math.min(HISTORY_STEPS, length - 1)

  let state: State
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
  }
  restart()

  // A copy of the settings, so a later change does not reach a message that is already made.
  const view = (): State => ({ ...state, params: { ...state.params } })
  const full = (): Message => ({ type: 'full', state: view(), ppm: [...ppm], src: [...src] })

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

  // The clock. "seconds" is the real time since the last call. Returns what changed, or null.
  function tick(seconds: number): Message | null {
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

  // Puts a value from the presenter in place of the newest value. The model continues from it.
  function setValue(value: number) {
    state.mode = 'simulated'
    current = clamp(value, PPM_LIMITS.min, PPM_LIMITS.max)
    ppm[ppm.length - 1] = round(current)
    src[src.length - 1] = SOURCE.manual
  }

  // One request of the simulator page. It can hold many settings. Returns what changed, or an error text.
  function control(body: unknown): Message | { error: string } {
    if (typeof body !== 'object' || body === null) return { error: 'Send a JSON object.' }
    const input = body as Record<string, unknown>
    // The widest change wins: all values, then the newest value, then the settings only.
    const change = { scope: 'state' as 'state' | 'last' | 'full' }
    const widen = (next: 'last' | 'full') => {
      if (next === 'full' || change.scope === 'state') change.scope = next
    }

    if (input.restart === true) {
      restart()
      return full()
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

    if (change.scope === 'full') return full()
    if (change.scope === 'last') return { type: 'last', state: view(), ppm: ppm[ppm.length - 1], src: src[src.length - 1] }
    return { type: 'state', state: view() }
  }

  return { full, tick, control }
}

export type Engine = ReturnType<typeof createEngine>
