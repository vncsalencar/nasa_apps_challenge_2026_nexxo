// The ground track of a satellite in a low orbit, and the region of the South Atlantic Anomaly.
//
// The ground track is the line on a map of the Earth that the satellite flies over.
// This file is pure math: it reads a two-line element set (the public format for the orbit of a
// satellite, "TLE"), finds the place of the satellite at a time, and turns the place into a
// longitude, a latitude, and an altitude.
//
// THE METHOD, AND HOW EXACT IT IS
// This is not the full SGP4 model, which is the standard model for a two-line element set.
// It is a shorter model that keeps the largest parts of SGP4:
//   1. A Kepler ellipse with the elements of the set.
//   2. The steady drift that the flat shape of the Earth causes (the terms J2 and J4): the orbit
//      plane turns to the west by about 5 degrees each day, and the ellipse turns in its plane.
//      The formulas are those of SGP4 (Hoots and Roehrich, Spacetrack Report No. 3, 1980).
//   3. The slow changes from J3 and the fast changes from J2 that repeat in each orbit (some km).
//   4. Drag: the orbit gets faster by the rate that the element set gives (its "first derivative
//      of the mean motion"). SGP4 uses the drag term BSTAR in place of this rate. This is the
//      one part where this model and SGP4 differ.
// The model leaves out the motion of the pole and the pull of the Sun and the Moon, as SGP4 does
// for a low orbit.
// Check of 15 November 2026: the service api.wheretheiss.at runs SGP4. With the same element set
// of the station, this model was 0.4 to 1.3 km from the service on the ground and 0.01 km in
// altitude, at 4 times from 1.1 to 2.1 days after the time of the element set (see the test).
// An element set is a forecast. The air drag changes with the Sun, and the real station also
// changes its orbit with its engines. So some days after the time of the element set, the true
// place can be some tens of km away, mostly along the track, with any model of this kind. For a
// map of the passes over a region that is thousands of km wide, this is exact enough.
import type { Point, SourceRef, TrajectoryFile } from './types.ts'

const DEG = Math.PI / 180
const TWO_PI = 2 * Math.PI
const MINUTES_PER_DAY = 1440

// The constants of the WGS-72 model of the Earth. Element sets are made with these constants.
const EARTH_RADIUS_KM = 6378.135
const MU_KM3_S2 = 398_600.8
const J2 = 0.001082616
const J3 = -0.00000253881
const J4 = -0.00000165597
// The square root of GM, in (Earth radii)^1.5 for each minute.
const KE = (60 * Math.sqrt(MU_KM3_S2)) / EARTH_RADIUS_KM ** 1.5
const CK2 = J2 / 2
const CK4 = (-3 * J4) / 8

// The WGS-84 shape of the Earth, for the latitude and the altitude.
const WGS84_RADIUS_KM = 6378.137
const WGS84_FLATTENING = 1 / 298.257223563

// The orbit elements of one two-line element set, in the units of the set.
export type Elements = {
  name: string
  catalogNumber: number
  // The time that the elements are for, in ms since 1970, UTC.
  epochMs: number
  inclinationDeg: number
  // The right ascension of the ascending node: the direction where the orbit crosses the equator to the north.
  nodeDeg: number
  eccentricity: number
  perigeeDeg: number
  meanAnomalyDeg: number
  // Orbits for each day.
  meanMotion: number
  // Half of the change of the mean motion for each day (the value in the element set), in orbits for each day squared.
  meanMotionDotHalf: number
}

// The check digit of one line: the sum of its digits, plus 1 for each minus sign, modulo 10.
function checksum(line: string) {
  let sum = 0
  for (const char of line.slice(0, 68)) {
    if (char >= '0' && char <= '9') sum += Number(char)
    else if (char === '-') sum += 1
  }
  return sum % 10
}

function field(line: string, from: number, to: number, what: string) {
  const text = line.slice(from - 1, to).trim()
  const value = Number(text)
  if (text === '' || !Number.isFinite(value)) throw new Error(`The element set has no valid ${what}: "${text}".`)
  return value
}

// Reads a two-line element set. The text can have a name line before the two lines.
export function parseTle(text: string): Elements {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== '')
  const first = lines.findIndex((line) => line.startsWith('1 '))
  const line1 = lines[first]
  const line2 = lines[first + 1]
  if (first < 0 || !line2 || !line2.startsWith('2 ') || line1.length < 69 || line2.length < 69) {
    throw new Error('The text is not a two-line element set.')
  }
  for (const line of [line1, line2]) {
    if (checksum(line) !== Number(line[68])) throw new Error(`The check digit of line ${line[0]} of the element set is wrong.`)
  }
  // The year has two digits. 57 to 99 is 1957 to 1999, and 00 to 56 is 2000 to 2056.
  const shortYear = field(line1, 19, 20, 'epoch year')
  const year = shortYear < 57 ? 2000 + shortYear : 1900 + shortYear
  // The day of the year with its fraction. Day 1.0 is 1 January, 00:00 UTC.
  const dayOfYear = field(line1, 21, 32, 'epoch day')
  return {
    name: first > 0 ? lines[first - 1].trim() : '',
    catalogNumber: field(line1, 3, 7, 'catalog number'),
    epochMs: Date.UTC(year, 0, 1) + Math.round((dayOfYear - 1) * 86_400_000),
    inclinationDeg: field(line2, 9, 16, 'inclination'),
    nodeDeg: field(line2, 18, 25, 'node'),
    // The set gives the eccentricity with no decimal point.
    eccentricity: field(line2, 27, 33, 'eccentricity') / 1e7,
    perigeeDeg: field(line2, 35, 42, 'argument of perigee'),
    meanAnomalyDeg: field(line2, 44, 51, 'mean anomaly'),
    meanMotion: field(line2, 53, 63, 'mean motion'),
    meanMotionDotHalf: field(line1, 34, 43, 'change of the mean motion'),
  }
}

// The angle of the Earth around its axis (Greenwich mean sidereal time) at a UTC time, in radians.
// Formula: Meeus, Astronomical Algorithms, equation 12.4. It takes UTC as UT1 (they differ by less than 1 second).
export function earthRotation(timeMs: number): number {
  const days = timeMs / 86_400_000 + 2_440_587.5 - 2_451_545
  const centuries = days / 36_525
  const degrees = 280.46061837 + 360.98564736629 * days + 0.000387933 * centuries ** 2 - centuries ** 3 / 38_710_000
  return (((degrees % 360) + 360) % 360) * DEG
}

// The place of the satellite at a UTC time, in km, in axes that do not turn with the Earth
// (x to the equinox, z to the north pole), with the middle of the Earth at 0.
export function orbitPlace(elements: Elements, timeMs: number): [number, number, number] {
  const minutes = (timeMs - elements.epochMs) / 60_000
  const days = minutes / MINUTES_PER_DAY
  const e = elements.eccentricity
  if (!(e >= 0 && e < 1) || !(elements.meanMotion > 0)) throw new Error('The orbit of the element set is not an ellipse.')
  const inclination = elements.inclinationDeg * DEG
  const cosI = Math.cos(inclination)
  const sinI = Math.sin(inclination)
  const theta2 = cosI * cosI
  const beta2 = 1 - e * e
  const beta = Math.sqrt(beta2)

  // The mean motion of the element set contains a part of the J2 effect. Remove it to get the
  // size of the orbit (SGP4 does the same). Lengths are in Earth radii here.
  const meanMotion = (elements.meanMotion * TWO_PI) / MINUTES_PER_DAY
  const a1 = (KE / meanMotion) ** (2 / 3)
  const delta1 = (1.5 * CK2 * (3 * theta2 - 1)) / (a1 * a1 * beta * beta2)
  const a0 = a1 * (1 - delta1 * (1 / 3 + delta1 * (1 + (134 / 81) * delta1)))
  const delta0 = (1.5 * CK2 * (3 * theta2 - 1)) / (a0 * a0 * beta * beta2)
  const motion = meanMotion / (1 + delta0)
  const axis0 = a0 / (1 - delta0)

  // The steady drift of the three angles, in radians for each minute.
  const pInv2 = 1 / (axis0 * axis0 * beta2 * beta2)
  const t1 = 3 * CK2 * pInv2 * motion
  const t2 = t1 * CK2 * pInv2
  const t3 = 1.25 * CK4 * pInv2 * pInv2 * motion
  const theta4 = theta2 * theta2
  const anomalyRate = motion + 0.5 * t1 * beta * (3 * theta2 - 1) + 0.0625 * t2 * beta * (13 - 78 * theta2 + 137 * theta4)
  const perigeeRate = -0.5 * t1 * (1 - 5 * theta2) + 0.0625 * t2 * (7 - 114 * theta2 + 395 * theta4) + t3 * (3 - 36 * theta2 + 49 * theta4)
  const nodeRate = (-t1 + 0.5 * t2 * (4 - 19 * theta2) + 2 * t3 * (3 - 7 * theta2)) * cosI

  // Drag makes the orbit faster and smaller with time.
  const faster = 1 + (2 * elements.meanMotionDotHalf * days) / elements.meanMotion
  if (!(faster > 0.5 && faster < 2)) throw new Error('The time is too far from the time of the element set.')
  const axis = axis0 / faster ** (2 / 3)
  const meanAnomaly = elements.meanAnomalyDeg * DEG + anomalyRate * minutes + TWO_PI * elements.meanMotionDotHalf * days * days
  const perigee = elements.perigeeDeg * DEG + perigeeRate * minutes
  const node = elements.nodeDeg * DEG + nodeRate * minutes

  // The slow changes from J3 (the Earth is a little pear-shaped). For a nearly round orbit like
  // that of the station, they are as large as the eccentricity itself, so they move the place by some km.
  // "ex" and "ey" are the two parts of the eccentricity in the plane of the orbit.
  const j3 = (-J3 / CK2) * sinI
  const perSize = 1 / (axis * beta2)
  const ex = e * Math.cos(perigee)
  const ey = e * Math.sin(perigee) + perSize * 0.25 * j3
  const longitude = meanAnomaly + perigee + (perSize * 0.125 * j3 * (3 + 5 * cosI) * ex) / (1 + cosI)

  // Solve the equation of Kepler for the angle w = E + perigee. This form has no problem with a round orbit.
  const target = longitude % TWO_PI
  let w = target
  for (let step = 0; step < 20; step++) {
    const change = (w - ex * Math.sin(w) + ey * Math.cos(w) - target) / (1 - ex * Math.cos(w) - ey * Math.sin(w))
    w -= change
    if (Math.abs(change) < 1e-13) break
  }
  const eCos = ex * Math.cos(w) + ey * Math.sin(w)
  const eSin = ex * Math.sin(w) - ey * Math.cos(w)
  const shape = 1 - ex * ex - ey * ey
  const shapeRoot = Math.sqrt(shape)
  const radius = axis * (1 - eCos)
  // "u" is the angle of the satellite in its orbit, from the point where it crosses the equator to the north.
  const u = Math.atan2(Math.sin(w) - ey - (ex * eSin) / (1 + shapeRoot), Math.cos(w) - ex + (ey * eSin) / (1 + shapeRoot))

  // The fast changes from J2, two times in each orbit.
  const k1 = CK2 / (axis * shape)
  const k2 = k1 / (axis * shape)
  const sin2u = Math.sin(2 * u)
  const cos2u = Math.cos(2 * u)
  const r = radius * (1 - 1.5 * k2 * shapeRoot * (3 * theta2 - 1)) + 0.5 * k1 * (1 - theta2) * cos2u
  const uk = u - 0.25 * k2 * (7 * theta2 - 1) * sin2u
  const nodeK = node + 1.5 * k2 * cosI * sin2u
  const inclinationK = inclination + 1.5 * k2 * cosI * sinI * cos2u

  const cosU = Math.cos(uk)
  const sinU = Math.sin(uk)
  const cosN = Math.cos(nodeK)
  const sinN = Math.sin(nodeK)
  const cosIk = Math.cos(inclinationK)
  const km = r * EARTH_RADIUS_KM
  return [km * (cosN * cosU - sinN * cosIk * sinU), km * (sinN * cosU + cosN * cosIk * sinU), km * Math.sin(inclinationK) * sinU]
}

export type GroundPoint = {
  // Degrees, from -180 to 180. East is positive.
  longitude: number
  // Degrees, from -90 to 90, on the WGS-84 shape of the Earth (the latitude of a map).
  latitude: number
  // The height above the WGS-84 shape of the Earth, in km.
  altitudeKm: number
  // The distance from the middle of the Earth, in km.
  earthDistanceKm: number
}

// The point of the Earth below the satellite at a UTC time.
export function groundPoint(elements: Elements, timeMs: number): GroundPoint {
  const [x, y, z] = orbitPlace(elements, timeMs)
  // Turn the axes with the Earth.
  const angle = earthRotation(timeMs)
  const xe = Math.cos(angle) * x + Math.sin(angle) * y
  const ye = -Math.sin(angle) * x + Math.cos(angle) * y

  // The latitude on a flattened Earth needs some rounds. Each round makes the error much smaller.
  const e2 = WGS84_FLATTENING * (2 - WGS84_FLATTENING)
  const p = Math.hypot(xe, ye)
  let latitude = Math.atan2(z, p * (1 - e2))
  let n = WGS84_RADIUS_KM
  for (let round = 0; round < 6; round++) {
    n = WGS84_RADIUS_KM / Math.sqrt(1 - e2 * Math.sin(latitude) ** 2)
    latitude = Math.atan2(z + e2 * n * Math.sin(latitude), p)
  }
  // Near a pole the first formula divides by a number near 0, so use the second formula there.
  const altitudeKm = Math.abs(latitude) < 80 * DEG ? p / Math.cos(latitude) - n : z / Math.sin(latitude) - n * (1 - e2)
  return {
    longitude: Math.atan2(ye, xe) / DEG,
    latitude: latitude / DEG,
    altitudeKm,
    earthDistanceKm: Math.hypot(xe, ye, z),
  }
}

// The ground track: one point for each step, from the start time.
export function groundTrack(elements: Elements, startMs: number, stepMinutes: number, count: number): GroundPoint[] {
  return Array.from({ length: count }, (_, index) => groundPoint(elements, startMs + index * stepMinutes * 60_000))
}

// ---------------------------------------------------------------------------------------
// The South Atlantic Anomaly (SAA)
// ---------------------------------------------------------------------------------------
// The SAA is the region over South America and the South Atlantic where the inner radiation
// belt of the Earth comes nearest to the ground. A spacecraft in a low orbit gets most of its
// dose from trapped protons there.

export const SAA_SOURCE: SourceRef = {
  short: 'NASA GSFC, Ask an Astrophysicist, 1996',
  title: 'The South Atlantic Anomaly. Ask an Astrophysicist, Imagine the Universe!, NASA Goddard Space Flight Center, 4 October 1996 (copy of the Internet Archive)',
  url: 'https://web.archive.org/web/20071105042835/http://imagine.gsfc.nasa.gov/docs/ask_astro/answers/961004.html',
}

// What the source says.
export const SAA_SAYS = 'At an altitude of 500 km, the SAA ranges between -90 and +40 in geographic longitude and -50 to 0 in geographic latitude. The extent of the SAA increases with increasing altitude.'

// The limits of the source, in degrees.
export const SAA_LIMITS = { west: -90, east: 40, south: -50, north: 0 }

// How this app draws the region. The page shows this text next to the map.
export const SAA_NOTE =
  'An approximation. The source gives four limits and no outline. This app draws an ellipse that touches the four limits. The limits are for an altitude of 500 km and are from 1996. The station flies at about 400 km, where the region is smaller. The region also moves slowly to the west. So the true passes of the station are shorter and fewer than the map shows.'

// The outline of the region: an ellipse that touches the four limits of the source, as a polygon
// of [longitude, latitude] with one corner each 5 degrees of the turn.
export const SAA_REGION: Point[] = Array.from({ length: 72 }, (_, index): Point => {
  const turn = index * 5 * DEG
  const { west, east, south, north } = SAA_LIMITS
  const round = (value: number) => Math.round(value * 100) / 100
  return [round((west + east) / 2 + ((east - west) / 2) * Math.cos(turn)), round((south + north) / 2 + ((north - south) / 2) * Math.sin(turn))]
})

// Is the point inside the outline of SAA_REGION. The map and this test use the same polygon.
export function inSaa(longitude: number, latitude: number): boolean {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return false
  // Bring the longitude into -180 to 180.
  const x = ((((longitude + 180) % 360) + 360) % 360) - 180
  let inside = false
  for (let i = 0, j = SAA_REGION.length - 1; i < SAA_REGION.length; j = i++) {
    const [xi, yi] = SAA_REGION[i]
    const [xj, yj] = SAA_REGION[j]
    // Count the sides of the polygon that a line from the point to the east crosses.
    if (yi > latitude !== yj > latitude && x < xi + ((latitude - yi) / (yj - yi)) * (xj - xi)) inside = !inside
  }
  return inside
}

// Counts the passes in a list of samples. A pass is a run of samples that are inside the region.
// "minutesPerDay" and "passesPerDay" are means over the length of the list.
export function saaPasses(saa: boolean[], stepMinutes: number): { passes: number; minutes: number; minutesPerDay: number; passesPerDay: number; longestMinutes: number } {
  let passes = 0
  let inside = 0
  let run = 0
  let longest = 0
  saa.forEach((value, index) => {
    if (!value) {
      run = 0
      return
    }
    if (index === 0 || !saa[index - 1]) passes += 1
    inside += 1
    run += 1
    longest = Math.max(longest, run)
  })
  const days = (saa.length * stepMinutes) / MINUTES_PER_DAY
  return {
    passes,
    minutes: inside * stepMinutes,
    minutesPerDay: days > 0 ? (inside * stepMinutes) / days : 0,
    passesPerDay: days > 0 ? passes / days : 0,
    longestMinutes: longest * stepMinutes,
  }
}

// ---------------------------------------------------------------------------------------
// The file of the ground track (web/src/trip/data/iss.json)
// ---------------------------------------------------------------------------------------
// How the track was made. The script puts this text in the "note" of the source of the file.
export const TRACK_METHOD =
  'Computed by this app from the orbit elements of the source, with a short form of the SGP4 model (a Kepler ellipse with the J2, J3 and J4 effects of the shape of the Earth and the drag rate of the element set). With the same elements, the result was within 2 km of an independent SGP4 service. The elements are a forecast: some days after their time, the true place of the station can be some tens of km away along the track.'

// A trajectory file of the ground frame. Its source has two more fields than the common type.
export type GroundTrackFile = TrajectoryFile & {
  source: TrajectoryFile['source'] & {
    // The time that the orbit elements are for, ISO 8601, UTC.
    epoch: string
    // How the track was made and how exact it is.
    note: string
    // The two lines of the element set, as the source gave them.
    elements: string[]
  }
  saa: boolean[]
  loop: true
}
