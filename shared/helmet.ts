// The helmet page: CO2 sensors at some places inside a space suit helmet. Pure functions with
// no imports, so the server, the web app, and the tests use the same code.
//
// The sensors and their values are a simulation. No real suit data is behind them.

// A sensor and its place on the drawing of the helmet (front view, 400 by 440).
export type Sensor = { id: string; label: string; x: number; y: number }
export const SENSORS: Sensor[] = [
  { id: 'top', label: 'Top', x: 200, y: 62 },
  { id: 'top-left', label: 'Top left', x: 104, y: 104 },
  { id: 'top-right', label: 'Top right', x: 296, y: 104 },
  { id: 'left', label: 'Left', x: 62, y: 206 },
  { id: 'right', label: 'Right', x: 338, y: 206 },
  { id: 'mouth', label: 'Mouth', x: 200, y: 268 },
  { id: 'neck', label: 'Neck ring', x: 200, y: 352 },
]
export const SENSOR_IDS = SENSORS.map((sensor) => sensor.id)

// The colors of a sensor, by the CO2 partial pressure in mmHg.
// Assumption: the page uses the values of the CO2 page for a cabin, because we have no checked
// limit for the air inside a helmet. Yellow starts at 2.3 mmHg, where crews on the station
// first report symptoms (Law and Alexander, NTRS 20150019624). Red starts above 3.0 mmHg,
// the NASA limit for the 1-hour average in a cabin (NASA-STD-3001 Volume 2 [V2 6004]).
export const LEVELS = { caution: 2.3, alert: 3.0 }
export type Level = 'normal' | 'caution' | 'alert'
export function levelOf(mmHg: number): Level {
  return mmHg > LEVELS.alert ? 'alert' : mmHg >= LEVELS.caution ? 'caution' : 'normal'
}

// The value of a calm sensor, and the limits of a value. The calm value is our choice.
export const CALM_MMHG = 1.2
export const VALUE_LIMITS = { min: 0, max: 8 }
// How fast a value moves to its target, in mmHg for each second, and the choices of the simulator.
export const RATES = [0.03, 0.08, 0.25]
export const DEFAULT_RATE = RATES[1]

// A routine moves some sensors to a target value, step by step. It stands for one cause.
export type Routine = { id: string; label: string; about: string; sensors: string[]; target: number }
export const ROUTINES: Routine[] = [
  { id: 'top-right', label: 'Top right rises', about: 'CO2 collects at the top right of the helmet.', sensors: ['top-right', 'right', 'top'], target: 4.4 },
  { id: 'left', label: 'Left side rises', about: 'CO2 collects at the left side of the helmet.', sensors: ['top-left', 'left'], target: 3.6 },
  { id: 'mouth', label: 'Mouth area rises', about: 'The air flow in front of the mouth is weak, so breath stays there.', sensors: ['mouth', 'neck'], target: 5 },
  { id: 'all', label: 'All sensors rise', about: 'The fan of the suit slows down, so CO2 rises in the whole helmet.', sensors: SENSOR_IDS, target: 3.8 },
]

export type SensorState = { value: number; target: number }
export type HelmetState = {
  sensors: Record<string, SensorState>
  // The routine that runs, or null.
  routine: string | null
  rate: number
}

export function calmHelmet(rate = DEFAULT_RATE): HelmetState {
  return { sensors: Object.fromEntries(SENSOR_IDS.map((id) => [id, { value: CALM_MMHG, target: CALM_MMHG }])), routine: null, rate }
}

const clamp = (value: number) => Math.min(VALUE_LIMITS.max, Math.max(VALUE_LIMITS.min, value))
const round = (value: number) => Math.round(value * 1000) / 1000

// Starts a routine: its sensors get the target of the routine. The other sensors keep their target.
export function startRoutine(state: HelmetState, id: string): HelmetState {
  const routine = ROUTINES.find((item) => item.id === id)
  if (!routine) return state
  const sensors = { ...state.sensors }
  for (const sensor of routine.sensors) sensors[sensor] = { ...sensors[sensor], target: routine.target }
  return { ...state, sensors, routine: id }
}

// All sensors go back to the calm value, step by step.
export function clearHelmet(state: HelmetState): HelmetState {
  return { ...state, routine: null, sensors: Object.fromEntries(Object.entries(state.sensors).map(([id, sensor]) => [id, { ...sensor, target: CALM_MMHG }])) }
}

// Sets one sensor to a value at once. The value stays, because the target is the same value.
export function setSensor(state: HelmetState, id: string, mmHg: number): HelmetState {
  if (!(id in state.sensors)) return state
  const value = round(clamp(mmHg))
  return { ...state, sensors: { ...state.sensors, [id]: { value, target: value } } }
}

// Moves each value toward its target for some seconds. Returns the same object if nothing moved.
export function stepHelmet(state: HelmetState, seconds: number): HelmetState {
  const most = state.rate * seconds
  let moved = false
  const sensors: Record<string, SensorState> = {}
  for (const [id, sensor] of Object.entries(state.sensors)) {
    const gap = sensor.target - sensor.value
    if (gap === 0) {
      sensors[id] = sensor
      continue
    }
    moved = true
    sensors[id] = { ...sensor, value: Math.abs(gap) <= most ? sensor.target : round(sensor.value + Math.sign(gap) * most) }
  }
  return moved ? { ...state, sensors } : state
}

// The sensors with a value that rises now, and the sensors by level, in the order of SENSORS.
export function risingSensors(state: HelmetState): string[] {
  return SENSOR_IDS.filter((id) => state.sensors[id].target > state.sensors[id].value)
}
export function sensorsAt(state: HelmetState, level: Level): string[] {
  return SENSOR_IDS.filter((id) => levelOf(state.sensors[id].value) === level)
}
