// The helmet page: CO2 sensors at some places inside a space suit helmet. Pure functions with
// no imports, so the server and the web app use the same code.
//
// The sensors and their values are a simulation. No real suit data is behind them.

// The area of the helmet where a sensor is.
export type Zone = 'front' | 'back'

// A sensor on the inside of the helmet.
//   dir    its place as a direction from the middle of the helmet, in helmet radii:
//          x to the right of a viewer who looks at the visor, y up, z out of the visor.
//   front  its place in the still picture from the front, in percent of the width and the
//          height of the picture. null: this picture does not show the sensor.
//   back   the same for the still picture from the back.
// The places in the pictures come from the 3D model of the page (see "__helmetShot" in
// web/src/helmet/Helmet3D.tsx), so a sensor is at the same place of the helmet in both views.
export type Sensor = { id: string; label: string; where: string; zone: Zone; dir: [number, number, number]; front: [number, number] | null; back: [number, number] | null }
export const SENSORS: Sensor[] = [
  { id: 'forehead', label: 'Forehead', where: 'near the forehead', zone: 'front', dir: [0, 0.62, 0.76], front: [50, 28.26], back: null },
  { id: 'mouth', label: 'Mouth', where: 'in front of the mouth', zone: 'front', dir: [0, -0.3, 0.94], front: [50, 57.12], back: null },
  { id: 'neck', label: 'Neck', where: 'below the mouth, near the neck ring', zone: 'front', dir: [0, -0.88, 0.45], front: [50, 73.4], back: null },
  { id: 'back', label: 'Back of the head', where: 'behind the head', zone: 'back', dir: [0, 0.1, -1], front: null, back: [50, 44.41] },
]
export const SENSOR_IDS = SENSORS.map((sensor) => sensor.id)

// The colors of a sensor, by the CO2 partial pressure in mmHg.
// Assumption: the page uses values for a cabin, because we have no checked limit for the air
// inside a helmet. Yellow starts at 2.3 mmHg, where crews on the station
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
  { id: 'mouth', label: 'Mouth and neck rise', about: 'The air flow in front of the mouth is weak, so breath stays at the front and low in the helmet.', sensors: ['mouth', 'neck'], target: 4.6 },
  { id: 'forehead', label: 'Forehead rises', about: 'CO2 collects high at the front of the helmet.', sensors: ['forehead'], target: 3.6 },
  { id: 'back', label: 'Back of the head rises', about: 'CO2 collects behind the head, where the air flow is weak.', sensors: ['back'], target: 4.2 },
  { id: 'all', label: 'All sensors rise', about: 'The fan of the suit slows down, so CO2 rises in the whole helmet.', sensors: SENSOR_IDS, target: 3.8 },
]

// An alert that the presenter sends to the helmet page while a sensor is above the red limit.
//   info  tells the crew member that a value passed the limit, and that a manual action can be necessary.
//   jet   advises the crew member to start a micro air jet, which lowers the CO2 at these sensors.
// The micro air jet is an idea of this app: a jet with a small flow, because it is inside the
// helmet, near the face. No real suit function is behind it.
export const NOTICE_KINDS = ['info', 'jet'] as const
export type NoticeKind = (typeof NOTICE_KINDS)[number]
// sensors: the sensors that were above the red limit when the presenter sent the alert.
// full: the helmet pages show the alert on the full screen. Each person closes it on their own
// screen with an answer. The presenter closes it on all screens.
// id: a number that is new for each alert that the presenter sends, so a page knows which
// alert its person answered.
export type Notice = { kind: NoticeKind; sensors: string[]; full: boolean; id: number }

// The micro air jet as an action: the values of the sensors above the red limit go down to
// this value in this time. Both numbers are our choice, for the demonstration.
export const JET = { target: 1.4, seconds: 3 }
// sensors: the sensors that the jet lowers. done: their values reached the target.
export type Jet = { sensors: string[]; done: boolean }

// rate: the speed of this sensor while the micro air jet lowers it. Without it, the speed of the state applies.
export type SensorState = { value: number; target: number; rate?: number }
export type HelmetState = {
  sensors: Record<string, SensorState>
  // The routine that runs, or null.
  routine: string | null
  rate: number
  // The alert that the presenter sent, or null.
  notice: Notice | null
  // The micro air jet that runs or that ended, or null.
  jet: Jet | null
}

export function calmHelmet(rate = DEFAULT_RATE): HelmetState {
  return { sensors: Object.fromEntries(SENSOR_IDS.map((id) => [id, { value: CALM_MMHG, target: CALM_MMHG }])), routine: null, rate, notice: null, jet: null }
}

const clamp = (value: number) => Math.min(VALUE_LIMITS.max, Math.max(VALUE_LIMITS.min, value))
const round = (value: number) => Math.round(value * 1000) / 1000

// Starts a routine: its sensors get the target of the routine. The other sensors keep their target.
export function startRoutine(state: HelmetState, id: string): HelmetState {
  const routine = ROUTINES.find((item) => item.id === id)
  if (!routine) return state
  const sensors = { ...state.sensors }
  for (const sensor of routine.sensors) sensors[sensor] = { ...sensors[sensor], target: routine.target }
  return { ...state, sensors, routine: id, jet: null }
}

// All sensors go back to the calm value, step by step.
export function clearHelmet(state: HelmetState): HelmetState {
  return { ...state, routine: null, jet: null, sensors: Object.fromEntries(Object.entries(state.sensors).map(([id, sensor]) => [id, { value: sensor.value, target: CALM_MMHG }])) }
}

// Sets one sensor to a value at once. The value stays, because the target is the same value.
export function setSensor(state: HelmetState, id: string, mmHg: number): HelmetState {
  if (!(id in state.sensors)) return state
  const value = round(clamp(mmHg))
  return endOldNotice({ ...state, jet: null, sensors: { ...state.sensors, [id]: { value, target: value } } })
}

// Moves each value toward its target for some seconds. Returns the same object if nothing moved.
export function stepHelmet(state: HelmetState, seconds: number): HelmetState {
  let moved = false
  const sensors: Record<string, SensorState> = {}
  for (const [id, sensor] of Object.entries(state.sensors)) {
    const gap = sensor.target - sensor.value
    if (gap === 0) {
      sensors[id] = sensor
      continue
    }
    moved = true
    const most = (sensor.rate ?? state.rate) * seconds
    // At the target, the sensor has the speed of the state again.
    sensors[id] = Math.abs(gap) <= most ? { value: sensor.target, target: sensor.target } : { ...sensor, value: round(sensor.value + Math.sign(gap) * most) }
  }
  if (!moved) return state
  const jet = state.jet && !state.jet.done && state.jet.sensors.every((id) => sensors[id].value === sensors[id].target) ? { ...state.jet, done: true } : state.jet
  return endOldNotice({ ...state, sensors, jet })
}

// Starts the micro air jet: each sensor above the red limit goes down to the jet target in the jet time.
// With no sensor above the red limit, the state stays the same.
export function startJet(state: HelmetState): HelmetState {
  const red = sensorsAt(state, 'alert')
  if (!red.length) return state
  const sensors = { ...state.sensors }
  for (const id of red) sensors[id] = { value: sensors[id].value, target: JET.target, rate: (sensors[id].value - JET.target) / JET.seconds }
  return { ...state, sensors, routine: null, jet: { sensors: red, done: false } }
}

// Sends an alert of one kind for the sensors that are above the red limit now.
// With no sensor above the red limit, there is nothing to tell, so the state stays the same.
export function sendNotice(state: HelmetState, kind: NoticeKind, full = false, id = 0): HelmetState {
  const sensors = sensorsAt(state, 'alert')
  return sensors.length ? { ...state, notice: { kind, sensors, full, id } } : state
}
// The presenter closed the full screen form on all screens. The alert stays in the page, in its small form.
export function seeNotice(state: HelmetState): HelmetState {
  return state.notice?.full ? { ...state, notice: { ...state.notice, full: false } } : state
}
export function endNotice(state: HelmetState): HelmetState {
  return state.notice ? { ...state, notice: null } : state
}
// The alert ends when no sensor is above the red limit.
function endOldNotice(state: HelmetState): HelmetState {
  return state.notice && sensorsAt(state, 'alert').length === 0 ? { ...state, notice: null } : state
}

// The sensors with a value that rises now, and the sensors by level, in the order of SENSORS.
export function risingSensors(state: HelmetState): string[] {
  return SENSOR_IDS.filter((id) => state.sensors[id].target > state.sensors[id].value)
}
export function sensorsAt(state: HelmetState, level: Level): string[] {
  return SENSOR_IDS.filter((id) => levelOf(state.sensors[id].value) === level)
}
