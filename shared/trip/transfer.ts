// The path of the custom mission: a simple flight from the Earth to Mars that this app computes.
// The page shows it with the badge MODELLED.
//
// THE MODEL
// The Earth moves on a circle of 1 AU around the Sun, and Mars on a circle of 1.524 AU, in one
// plane. Each planet has its real period. Only the Sun pulls on the spacecraft (a two-body path).
// The real orbits are not circles and not in one plane, so the model shows the kind of path and
// the size of the distances. It is not the path of a real mission, and it has no real dates.
//
// The spacecraft leaves the Earth in the direction in which the Earth moves, and it arrives at
// the orbit of Mars after "days" days. Mars is at that point on that day.
//   - The flight that needs the least energy is half of an ellipse that touches both orbits
//     (a Hohmann transfer). It takes HOHMANN_DAYS, about 259 days.
//   - A shorter flight: the spacecraft leaves the Earth faster, in the same direction. Its path
//     is then a wider ellipse, or a hyperbola for a very fast flight, and it crosses the orbit of
//     Mars before it has gone half of the way around the Sun. The function finds the one start
//     speed that gives the flight time "days". This path obeys the laws of Kepler.
//   - A longer flight: NOT PHYSICAL. No path of this kind between the two orbits takes longer
//     than the Hohmann transfer. A real mission would wait at the Earth and then fly the Hohmann
//     transfer. The function keeps the Hohmann ellipse and makes the clock slower, so the
//     spacecraft is too slow for its path. transferNote() gives a text about this for the page.
import { KM_PER_AU, TRIP_LIMITS, type Point, type TrajectoryFile } from './types.ts'

// The sizes of the two circles in AU, and the periods in days.
// Source: NASA Mars Fact Sheet, https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html
// (semimajor axis of Mars: 1.524 times that of the Earth. Sidereal orbit periods: 686.980 and 365.256 days).
export const EARTH_ORBIT_AU = 1
export const MARS_ORBIT_AU = 1.524
export const EARTH_PERIOD_DAYS = 365.256
export const MARS_PERIOD_DAYS = 686.98

// The pull of the Sun (its mass times the constant of gravity) in AU^3 for each day^2.
// It is the square of the Gaussian constant of gravity, 0.01720209895.
export const SUN_GM = 0.01720209895 ** 2

// The time of the Hohmann transfer: half of the period of an ellipse that touches both circles.
export const HOHMANN_DAYS = Math.PI * Math.sqrt(((EARTH_ORBIT_AU + MARS_ORBIT_AU) / 2) ** 3 / SUN_GM)
// The start speed of the Hohmann transfer, in AU for each day.
const HOHMANN_SPEED = Math.sqrt(SUN_GM * (2 / EARTH_ORBIT_AU - 2 / (EARTH_ORBIT_AU + MARS_ORBIT_AU)))

// The model has no real dates. The file format needs a start time, so this date is only a label.
const START_TIME = '2035-01-01T00:00:00.000Z'

// Two helper functions of the "universal" form of the equation of Kepler. This form uses one
// formula for an ellipse, a parabola, and a hyperbola, so the path changes smoothly with the speed.
function stumpffC(z: number) {
  if (z > 1e-4) return (1 - Math.cos(Math.sqrt(z))) / z
  if (z < -1e-4) return (Math.cosh(Math.sqrt(-z)) - 1) / -z
  return 1 / 2 - z / 24 + (z * z) / 720
}
function stumpffS(z: number) {
  if (z > 1e-4) return (Math.sqrt(z) - Math.sin(Math.sqrt(z))) / Math.sqrt(z) ** 3
  if (z < -1e-4) return (Math.sinh(Math.sqrt(-z)) - Math.sqrt(-z)) / Math.sqrt(-z) ** 3
  return 1 / 6 - z / 120 + (z * z) / 5040
}

// The place of a body that starts at [1 AU, 0] with the speed "speed" in the direction +y
// (at a right angle to the line to the Sun), "t" days later. Reference: Curtis, Orbital
// Mechanics for Engineering Students, section 3.7 (the universal variable).
function placeAfter(speed: number, t: number): Point {
  const r0 = EARTH_ORBIT_AU
  const root = Math.sqrt(SUN_GM)
  // 1 / (half of the long axis). Positive: ellipse. 0: parabola. Negative: hyperbola.
  const alpha = 2 / r0 - (speed * speed) / SUN_GM
  // The universal form of the equation of Kepler for the variable x. Its left side grows with x.
  const time = (x: number) => {
    const z = alpha * x * x
    return (1 - alpha * r0) * x ** 3 * stumpffS(z) + r0 * x - root * t
  }
  // The start speed is not less than the speed of the Earth, so the answer is not more than this value.
  let low = 0
  let high = (root * t) / r0 + 1e-12
  while (time(high) < 0) high *= 2
  // Halve the range until the two ends are the same number.
  for (let step = 0; step < 200 && high > low; step++) {
    const middle = (low + high) / 2
    if (middle === low || middle === high) break
    if (time(middle) < 0) low = middle
    else high = middle
  }
  const x = (low + high) / 2
  const z = alpha * x * x
  const f = 1 - (x * x * stumpffC(z)) / r0
  const g = t - (x ** 3 * stumpffS(z)) / root
  // The start place is [r0, 0] and the start velocity is [0, speed].
  return [f * r0, g * speed]
}

// The start speed (AU for each day) of the path that reaches the orbit of Mars after "days".
// "days" is not more than HOHMANN_DAYS. A faster start always reaches the orbit of Mars sooner,
// so the function can halve the range of the speed until it finds the value.
function startSpeed(days: number) {
  const beyondMars = (speed: number) => Math.hypot(...placeAfter(speed, days)) > MARS_ORBIT_AU
  let low = HOHMANN_SPEED
  let high = HOHMANN_SPEED * 2
  while (!beyondMars(high)) high *= 2
  for (let step = 0; step < 200; step++) {
    const middle = (low + high) / 2
    if (middle === low || middle === high) break
    if (beyondMars(middle)) high = middle
    else low = middle
  }
  return (low + high) / 2
}

// "days" as the function uses it: a number from 1 to 1200. A value that is not a number gives the Hohmann time.
function cleanDays(days: number) {
  if (!Number.isFinite(days)) return HOHMANN_DAYS
  return Math.min(TRIP_LIMITS.customDays.max, Math.max(TRIP_LIMITS.customDays.min, days))
}

// True if the path for this flight time obeys the laws of Kepler (see the top of this file).
export function transferIsPhysical(days: number): boolean {
  return cleanDays(days) <= HOHMANN_DAYS + 0.5
}

// One or two sentences for the page about how the path for this flight time was made.
export function transferNote(days: number): string {
  const length = cleanDays(days)
  const model = 'The Earth and Mars move on circles in one plane, and only the Sun pulls on the spacecraft.'
  if (Math.abs(length - HOHMANN_DAYS) <= 0.5) return `${model} This is the flight that needs the least energy (a Hohmann transfer): half of an ellipse that touches both orbits.`
  if (length < HOHMANN_DAYS) return `${model} The spacecraft leaves the Earth faster than for the flight that needs the least energy (about 259 days), so it crosses the orbit of Mars sooner.`
  return 'Not a physical path. The flight that needs the least energy takes about 259 days. For a longer flight, this app keeps that path and makes the spacecraft slower than the pull of the Sun permits.'
}

// The path of a flight from the Earth to Mars that takes "days" days (from 1 to 1200).
// The samples have the same time between them: 1 day if "days" is a whole number, and near 1 day if not.
// The last sample is the arrival. The frame is "sun": the Sun is at [0, 0], and a point is [x, y] in AU.
export function transferTrajectory(days: number): TrajectoryFile {
  const length = cleanDays(days)
  const steps = Math.max(1, Math.round(length))
  const stepDays = length / steps

  // A flight that is longer than the Hohmann transfer uses the Hohmann path with a slower clock.
  const pathDays = Math.min(length, HOHMANN_DAYS)
  const speed = length < HOHMANN_DAYS ? startSpeed(length) : HOHMANN_SPEED
  const clock = pathDays / length

  const craft: Point[] = []
  for (let index = 0; index <= steps; index++) craft.push(index === 0 ? [EARTH_ORBIT_AU, 0] : placeAfter(speed, index * stepDays * clock))

  // The Earth is at the start point on day 0. Mars is at the end point on the last day.
  const end = craft[steps]
  const arrivalAngle = Math.atan2(end[1], end[0])
  const earthRate = (2 * Math.PI) / EARTH_PERIOD_DAYS
  const marsRate = (2 * Math.PI) / MARS_PERIOD_DAYS
  const earth: Point[] = []
  const mars: Point[] = []
  for (let index = 0; index <= steps; index++) {
    const day = index * stepDays
    const earthAngle = earthRate * day
    const marsAngle = arrivalAngle + marsRate * (day - length)
    earth.push([EARTH_ORBIT_AU * Math.cos(earthAngle), EARTH_ORBIT_AU * Math.sin(earthAngle)])
    mars.push([MARS_ORBIT_AU * Math.cos(marsAngle), MARS_ORBIT_AU * Math.sin(marsAngle)])
  }

  return {
    file: 'custom',
    frame: 'sun',
    source: { short: 'Computed by this app', title: 'Simple transfer orbit between two circular orbits in one plane', url: '', retrievedAt: '', target: 'custom' },
    startTime: START_TIME,
    stepHours: stepDays * 24,
    craft,
    bodies: { earth, mars },
    earthDistanceKm: craft.map((point, index) => Math.hypot(point[0] - earth[index][0], point[1] - earth[index][1]) * KM_PER_AU),
    sunDistanceAu: craft.map((point) => Math.hypot(point[0], point[1])),
  }
}
