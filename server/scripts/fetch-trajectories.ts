// Downloads the real flight paths for the trip page from the JPL Horizons system and writes
// them to web/src/trip/data/ as TrajectoryFile JSON. The app then needs no network.
//
// Run (from the repository): node server/scripts/fetch-trajectories.ts
//      one file only:        node server/scripts/fetch-trajectories.ts msl
//
// Source: https://ssd.jpl.nasa.gov/horizons/ (API: https://ssd-api.jpl.nasa.gov/doc/horizons.html)
//
// What the script does to the numbers of Horizons, and nothing more:
//   frame "sun"    it keeps x and y of the ecliptic (the map is flat) and rounds them.
//   frame "earth"  it projects each position into the plane of the orbit of the Moon and rounds it.
// The distances "earthDistanceKm" and "sunDistanceAu" come from the full 3D positions.
//
// Time: Horizons counts in TDB, a uniform time scale that is about 66 to 69 seconds ahead of UTC
// in these years. The samples are uniform in TDB. The script asks Horizons for the difference
// at the first sample and writes "startTime" in UTC. A leap second inside a file (for example
// 30 June 2012, during the MSL cruise) moves the later samples by 1 second against UTC. A planet
// moves about 30 km in that second, far below the rounding, so the script ignores it.
import { mkdirSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { KM_PER_AU, LIGHT_KM_PER_SECOND, type Point, type TrajectoryFile } from '../../shared/trip/types.ts'

const API = 'https://ssd.jpl.nasa.gov/api/horizons.api'
const LOOKUP = 'https://ssd.jpl.nasa.gov/api/horizons_lookup.api'
const OUT = resolve(import.meta.dirname, '../../web/src/trip/data')

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

// The Horizons IDs of the bodies. These are fixed NAIF numbers, not spacecraft.
const SUN = '10'
const EARTH = '399'
const MOON = '301'
const MARS = '499'

// The landing of MSL, from the Horizons header of MSL: "MARS LANDING: Time: 2012-Aug-6 05:17:56 UTC".
const MSL_LANDING_UTC = '2012-08-06T05:17:56Z'
// The Horizons file of ExoMars TGO starts at 08:14 TDB on 14 March 2016. That is before the
// launch (09:31 UTC): its first hours are the escape path computed back in time, not a real
// flight. The real free flight starts when the Breeze-M upper stage released the spacecraft:
// "the spacecraft was released at 20:13 GMT", ESA, "ExoMars on its way to solve the Red
// Planet's mysteries", 14 March 2016,
// https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Exploration/ExoMars/ExoMars_on_its_way_to_solve_the_Red_Planet_s_mysteries
const TGO_RELEASE_UTC = '2016-03-14T20:13:00Z'
// The day when TGO reached Mars, from the Horizons header of TGO: "arrival at Mars on 2016-Oct-19".
// The script takes the moment of that day when TGO was nearest to Mars (the orbit insertion).
const TGO_ARRIVAL_DAY_UTC = '2016-10-19T00:00:00Z'
// The first sample of moon.json: the launch day of Artemis I.
const MOON_START_UTC = '2022-11-16T00:00:00Z'

type Vec = [number, number, number]
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a: Vec) => Math.sqrt(dot(a, a))
const unit = (a: Vec): Vec => {
  const length = norm(a)
  return [a[0] / length, a[1] / length, a[2] / length]
}
const round = (value: number, decimals: number) => {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

// ---------------------------------------------------------------------------------------
// The Horizons API
// ---------------------------------------------------------------------------------------
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms))

// One request at a time, with a short pause: JPL asks clients not to send requests in parallel.
async function get(url: string, params: Record<string, string>): Promise<string> {
  const query = new URLSearchParams(params).toString()
  for (let attempt = 1; ; attempt++) {
    await sleep(300)
    try {
      const reply = await fetch(`${url}?${query}`, { headers: { 'user-agent': 'trajectory-fetch-script' } })
      if (reply.ok) return await reply.text()
      if (attempt >= 4) throw new Error(`Horizons answered ${reply.status} for ${url}?${query}`)
    } catch (error) {
      if (attempt >= 4) throw error
    }
    await sleep(2000 * attempt)
  }
}

// Finds a spacecraft by its name. The ID comes from the lookup service, not from this file.
async function lookup(name: string): Promise<{ id: string; name: string }> {
  const reply = JSON.parse(await get(LOOKUP, { sstr: name, group: 'sct' })) as { result?: { spkid: string; name: string; type: string }[] }
  const hits = (reply.result ?? []).filter((hit) => hit.type === 'spacecraft')
  if (hits.length !== 1) throw new Error(`The Horizons lookup gives ${hits.length} spacecraft for "${name}". The script needs exactly one.`)
  return { id: hits[0].spkid, name: hits[0].name }
}

// A moment on the TDB clock, as milliseconds since 1970-01-01 00:00 TDB.
type Tdb = number
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const tdbText = (tdb: Tdb) => new Date(tdb).toISOString().replace('T', ' ').replace('Z', '')
const fromJulianDay = (jd: number): Tdb => (jd - 2440587.5) * DAY

function horizons(params: Record<string, string>) {
  const quoted = Object.fromEntries(Object.entries(params).map(([key, value]) => [key, `'${value}'`]))
  return get(API, { format: 'text', ...quoted })
}

// The first and the last moment that Horizons has for a spacecraft. Horizons tells them in the
// error text of a request for a date outside the range.
async function coverage(id: string): Promise<{ first: Tdb; last: Tdb }> {
  const edge = async (year: number, word: string) => {
    const text = await horizons({ COMMAND: id, OBJ_DATA: 'NO', MAKE_EPHEM: 'YES', EPHEM_TYPE: 'VECTORS', CENTER: `500@${EARTH}`, START_TIME: `${year}-01-01`, STOP_TIME: `${year}-01-02`, STEP_SIZE: '1 d' })
    const found = text.match(new RegExp(`No ephemeris for target .* ${word} A\\.D\\. (\\d{4})-([A-Z]{3})-(\\d{2}) (\\d{2}):(\\d{2}):(\\d{2}\\.\\d+) TDB`))
    if (!found) throw new Error(`Horizons does not tell the "${word}" limit of ${id}:\n${text.slice(-400)}`)
    const [, y, month, d, h, m, s] = found
    return Date.UTC(Number(y), MONTHS.indexOf(month), Number(d), Number(h), Number(m), 0, Math.round(Number(s) * 1000))
  }
  return { first: await edge(1950, 'prior to'), last: await edge(2190, 'after') }
}

// TDB minus UT in milliseconds on one day, from Horizons (quantity 30 of an observer table).
async function tdbMinusUt(day: number): Promise<number> {
  const date = new Date(day).toISOString().slice(0, 10)
  const text = await horizons({ COMMAND: MARS, OBJ_DATA: 'NO', MAKE_EPHEM: 'YES', EPHEM_TYPE: 'OBSERVER', CENTER: `500@${EARTH}`, QUANTITIES: '30', START_TIME: `${date} 12:00`, STOP_TIME: `${date} 12:01`, STEP_SIZE: '1 d' })
  const found = text.match(/\$\$SOE\s+\S+ \S+\s+([\d.]+)\s+\$\$EOE/)
  if (!found) throw new Error(`Horizons gives no TDB-UT for ${date}:\n${text.slice(-400)}`)
  return Number(found[1]) * SECOND
}
const toTdb = async (utc: string): Promise<Tdb> => Date.parse(utc) + (await tdbMinusUt(Date.parse(utc)))

type Table = { target: string; km: Vec[] }

// The positions of one target relative to one center, in km, in the ecliptic frame of J2000,
// at intervals + 1 moments from "start" to "stop" with equal steps.
async function vectors(target: string, center: string, start: Tdb, stop: Tdb, intervals: number): Promise<Table> {
  const text = await horizons({
    COMMAND: target,
    OBJ_DATA: 'NO',
    MAKE_EPHEM: 'YES',
    EPHEM_TYPE: 'VECTORS',
    CENTER: `500@${center}`,
    REF_PLANE: 'ECLIPTIC',
    REF_SYSTEM: 'ICRF',
    VEC_TABLE: '1',
    VEC_CORR: 'NONE',
    OUT_UNITS: 'KM-S',
    CSV_FORMAT: 'YES',
    START_TIME: `${tdbText(start)} TDB`,
    STOP_TIME: tdbText(stop),
    // A number with no unit: the count of equal intervals between the start and the stop.
    STEP_SIZE: String(intervals),
  })
  const block = text.match(/\$\$SOE\n([\s\S]*?)\$\$EOE/)
  const name = text.match(/Target body name: (.*?)\s*(\{|\n)/)
  if (!block || !name) throw new Error(`Horizons gives no table for ${target}:\n${text.slice(-600)}`)
  const rows = block[1].trim().split('\n')
  if (rows.length !== intervals + 1) throw new Error(`Horizons gives ${rows.length} rows for ${target}. The script asked for ${intervals + 1}.`)
  const step = (stop - start) / intervals
  const km = rows.map((row, index): Vec => {
    const cells = row.split(',')
    const late = fromJulianDay(Number(cells[0])) - (start + index * step)
    if (!(Math.abs(late) < 50)) throw new Error(`Row ${index} of ${target} is ${late} ms away from its time.`)
    return [Number(cells[2]), Number(cells[3]), Number(cells[4])]
  })
  if (km.some((v) => v.some((n) => !Number.isFinite(n)))) throw new Error(`The table of ${target} holds a value that is not a number.`)
  return { target: name[1].trim(), km }
}

// ---------------------------------------------------------------------------------------
// The files
// ---------------------------------------------------------------------------------------
const retrievedAt = new Date()
// The reference that the Horizons manual gives for the system ("References for the Horizons
// system", https://ssd.jpl.nasa.gov/horizons/manual.html), with the day of the download.
const credit =
  'Giorgini, JD and JPL Solar System Dynamics Group, NASA/JPL Horizons On-Line Ephemeris System, https://ssd.jpl.nasa.gov/horizons/, ' +
  `data retrieved ${retrievedAt.getUTCFullYear()}-${MONTHS[retrievedAt.getUTCMonth()]}-${String(retrievedAt.getUTCDate()).padStart(2, '0')}.`

function source(target: string, title: string): TrajectoryFile['source'] {
  return { short: 'JPL Horizons', title, url: 'https://ssd.jpl.nasa.gov/horizons/', credit, retrievedAt: retrievedAt.toISOString(), target }
}

type Span = { start: Tdb; stop: Tdb; intervals: number }
// Equal steps that are as near to "stepMs" as possible and end exactly at "stop".
const span = (start: Tdb, stop: Tdb, stepMs: number): Span => ({ start, stop, intervals: Math.ceil((stop - start) / stepMs - 1e-9) })

async function times(span: Span) {
  const startTime = new Date(span.start - (await tdbMinusUt(span.start))).toISOString()
  return { startTime, stepHours: (span.stop - span.start) / span.intervals / HOUR }
}

function write(file: TrajectoryFile, notes: string[]) {
  mkdirSync(OUT, { recursive: true })
  const path = resolve(OUT, `${file.file}.json`)
  writeFileSync(path, JSON.stringify(file))
  const count = file.craft.length
  const end = new Date(Date.parse(file.startTime) + (count - 1) * file.stepHours * HOUR).toISOString()
  const light = (index: number) => (file.earthDistanceKm[index] / LIGHT_KM_PER_SECOND).toFixed(2)
  console.log(
    [
      `${file.file}.json: ${(statSync(path).size / 1000).toFixed(1)} kB, ${count} samples, one each ${round(file.stepHours, 4)} hours.`,
      `  target ${file.source.target}`,
      `  from ${file.startTime} to ${end} (UTC), ${round(((count - 1) * file.stepHours) / 24, 2)} days`,
      `  Earth distance: first ${file.earthDistanceKm[0]} km (light time ${light(0)} s), last ${file.earthDistanceKm[count - 1]} km (light time ${light(count - 1)} s)`,
      ...notes.map((note) => `  ${note}`),
    ].join('\n'),
  )
}

// A file in the frame "sun": the Sun in the middle, x and y of the ecliptic in AU.
// "craft" is a spacecraft ID, or null for the planets file (then the craft is Mars).
async function sunFile(name: string, craft: string | null, when: Span) {
  const earth = await vectors(EARTH, SUN, when.start, when.stop, when.intervals)
  const mars = await vectors(MARS, SUN, when.start, when.stop, when.intervals)
  const ship = craft === null ? mars : await vectors(craft, SUN, when.start, when.stop, when.intervals)
  // 0.00001 AU is about 1,500 km: far below one pixel of the map.
  const flat = (v: Vec): Point => [round(v[0] / KM_PER_AU, 5), round(v[1] / KM_PER_AU, 5)]
  const targets = craft === null ? `${earth.target} and ${mars.target}` : `${ship.target}, ${earth.target}, and ${mars.target}`
  const file: TrajectoryFile = {
    file: name,
    frame: 'sun',
    source: source(ship.target, `JPL Horizons vector tables of ${targets}, relative to the middle of the Sun, in the ecliptic frame of J2000. This file keeps x and y, and the numbers are rounded.`),
    ...(await times(when)),
    craft: ship.km.map(flat),
    bodies: { earth: earth.km.map(flat), mars: mars.km.map(flat) },
    earthDistanceKm: ship.km.map((v, index) => Math.round(norm(sub(v, earth.km[index])))),
    sunDistanceAu: ship.km.map((v) => round(norm(v) / KM_PER_AU, 6)),
  }
  const last = when.intervals
  const toMars = norm(sub(ship.km[last], mars.km[last]))
  const earthMars = norm(sub(mars.km[last], earth.km[last]))
  // How far the spacecraft is from the plane of the map, at most.
  const offPlane = Math.max(...ship.km.map((v) => Math.abs(v[2]))) / KM_PER_AU
  write(file, [
    `last sample: ${Math.round(toMars)} km from the middle of Mars. The Earth and Mars are ${(earthMars / KM_PER_AU).toFixed(4)} AU apart then.`,
    `the craft is at most ${offPlane.toFixed(4)} AU above or below the ecliptic.`,
  ])
}

// A file in the frame "earth": the Earth in the middle, km, in the plane of the orbit of the Moon.
// "craft" is a spacecraft ID, or null for the Moon file (then the craft is the Moon).
async function earthFile(name: string, craft: string | null, when: Span) {
  const moon = await vectors(MOON, EARTH, when.start, when.stop, when.intervals)
  const ship = craft === null ? moon : await vectors(craft, EARTH, when.start, when.stop, when.intervals)
  // The plane of the orbit of the Moon during this file. The cross product of two positions of
  // the Moon points along the axis of its orbit, so the sum over the file gives the mean axis.
  let sum: Vec = [0, 0, 0]
  for (let i = 0; i + 1 < moon.km.length; i++) {
    const c = cross(moon.km[i], moon.km[i + 1])
    sum = [sum[0] + c[0], sum[1] + c[1], sum[2] + c[2]]
  }
  const axis = unit(sum)
  // The x axis of the map: the x axis of the ecliptic (toward the March equinox), put into the
  // plane. So all files in this frame have nearly the same direction, and the Moon turns
  // against the clock.
  const ex = unit(sub([1, 0, 0], [axis[0] * axis[0], axis[0] * axis[1], axis[0] * axis[2]]))
  const ey = cross(axis, ex)
  const flat = (v: Vec): Point => [Math.round(dot(v, ex)), Math.round(dot(v, ey))]
  const targets = craft === null ? moon.target : `${ship.target} and ${moon.target}`
  const file: TrajectoryFile = {
    file: name,
    frame: 'earth',
    source: source(
      ship.target,
      `JPL Horizons vector tables of ${targets}, relative to the middle of the Earth. This file holds the positions projected into the plane of the orbit of the Moon, and the numbers are rounded.`,
    ),
    ...(await times(when)),
    craft: ship.km.map(flat),
    bodies: { moon: moon.km.map(flat) },
    earthDistanceKm: ship.km.map((v) => Math.round(norm(v))),
  }
  const offPlane = (table: Table) => Math.round(Math.max(...table.km.map((v) => Math.abs(dot(v, axis)))))
  const moonRange = moon.km.map(norm)
  const nearMoon = Math.min(...ship.km.map((v, index) => norm(sub(v, moon.km[index]))))
  write(file, [
    `the Moon is ${Math.round(Math.min(...moonRange))} to ${Math.round(Math.max(...moonRange))} km from the Earth, and at most ${offPlane(moon)} km out of the plane of the map.`,
    ...(craft === null ? [] : [`the craft is at most ${offPlane(ship)} km out of the plane, and at least ${Math.round(nearMoon)} km from the middle of the Moon.`, `largest Earth distance: ${Math.max(...file.earthDistanceKm)} km`]),
  ])
}

const range = (name: string, id: string, limits: { first: Tdb; last: Tdb }) =>
  console.log(`Horizons has ${name} (${id}) from ${tdbText(limits.first)} TDB to ${tdbText(limits.last)} TDB.`)
// One second inside the range, so a rounding of the limit cannot put a sample outside it.
const up = (tdb: Tdb) => Math.ceil(tdb / SECOND) * SECOND
const down = (tdb: Tdb) => Math.floor(tdb / SECOND) * SECOND

let mslStart: Tdb | null = null
async function mslSpan() {
  const craft = await lookup('Mars Science Laboratory')
  const limits = await coverage(craft.id)
  range(craft.name, craft.id, limits)
  mslStart = up(limits.first)
  return { craft, start: mslStart }
}

const jobs: Record<string, () => Promise<void>> = {
  // MSL from the first moment that Horizons has (about 49 minutes after the launch) to the landing.
  async msl() {
    const { craft, start } = await mslSpan()
    await sunFile('msl', craft.id, span(start, await toTdb(MSL_LANDING_UTC), 6 * HOUR))
  },
  // ExoMars TGO from the release by the upper stage to the moment when it was nearest to Mars.
  async tgo() {
    const craft = await lookup('ExoMars16 TGO')
    const limits = await coverage(craft.id)
    range(craft.name, craft.id, limits)
    const day = await toTdb(TGO_ARRIVAL_DAY_UTC)
    const minutes = 24 * 60
    const pass = await vectors(craft.id, MARS, day, day + DAY, minutes)
    const ranges = pass.km.map(norm)
    const nearest = ranges.indexOf(Math.min(...ranges))
    if (nearest === 0 || nearest === minutes) throw new Error('TGO is not nearest to Mars inside the arrival day.')
    const arrival = day + nearest * MINUTE
    console.log(`TGO was nearest to Mars at ${tdbText(arrival)} TDB: ${Math.round(ranges[nearest])} km from the middle of Mars.`)
    await sunFile('tgo', craft.id, span(await toTdb(TGO_RELEASE_UTC), arrival, 6 * HOUR))
  },
  // Artemis I and II: all that Horizons has. The flight near the Earth and near the Moon is fast,
  // so the step is short.
  async artemis1() {
    const craft = await lookup('Artemis 1')
    const limits = await coverage(craft.id)
    range(craft.name, craft.id, limits)
    await earthFile('artemis1', craft.id, span(up(limits.first), down(limits.last), 15 * MINUTE))
  },
  async artemis2() {
    const craft = await lookup('Artemis II')
    const limits = await coverage(craft.id)
    range(craft.name, craft.id, limits)
    await earthFile('artemis2', craft.id, span(up(limits.first), down(limits.last), 10 * MINUTE))
  },
  // The Earth and Mars each day for 1,500 days from the first sample of msl.json.
  async planets() {
    const start = mslStart ?? (await mslSpan()).start
    await sunFile('planets', null, span(start, start + 1500 * DAY, DAY))
  },
  // The Moon each hour for 60 days.
  async moon() {
    const start = await toTdb(MOON_START_UTC)
    await earthFile('moon', null, span(start, start + 60 * DAY, HOUR))
  },
}

const wanted = process.argv.slice(2)
for (const name of wanted.length ? wanted : Object.keys(jobs)) {
  if (!jobs[name]) throw new Error(`No file "${name}". The files are: ${Object.keys(jobs).join(', ')}.`)
  await jobs[name]()
}
