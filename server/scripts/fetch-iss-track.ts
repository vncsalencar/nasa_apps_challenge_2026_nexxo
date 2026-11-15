// Gets the orbit elements of the International Space Station from CelesTrak, computes the ground
// track of the next 3 days, and writes it to web/src/trip/data/iss.json.
//
// Run from the folder "server": node scripts/fetch-iss-track.ts
//
// Source: https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE
// CelesTrak makes new data one time each 2 hours and asks its users not to download more often.
// So run this script only when you need a new track.
//
// The track starts at 00:00 UTC of the day of the request and has one sample each minute.
// shared/trip/groundtrack.ts holds the math and tells how exact it is.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { groundTrack, inSaa, parseTle, saaPasses, TRACK_METHOD, type GroundTrackFile } from '../../shared/trip/groundtrack.ts'

const URL_TLE = 'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE'
const DAYS = 3
const STEP_MINUTES = 1

const response = await fetch(URL_TLE, { headers: { 'user-agent': 'node' } })
if (!response.ok) throw new Error(`CelesTrak answered ${response.status} for ${URL_TLE}.`)
const text = await response.text()
const retrievedAt = new Date()
// parseTle stops with an error if the text is not a valid element set (for example an error page).
const elements = parseTle(text)
if (elements.catalogNumber !== 25544) throw new Error(`The element set is for object ${elements.catalogNumber}, not for the station (25544).`)

const start = Date.UTC(retrievedAt.getUTCFullYear(), retrievedAt.getUTCMonth(), retrievedAt.getUTCDate())
const track = groundTrack(elements, start, STEP_MINUTES, (DAYS * 1440) / STEP_MINUTES)
const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits
const saa = track.map((point) => inSaa(point.longitude, point.latitude))

const file: GroundTrackFile = {
  file: 'iss',
  frame: 'ground',
  source: {
    short: 'CelesTrak',
    title: `CelesTrak GP element set of ${elements.name} (NORAD catalog number ${elements.catalogNumber})`,
    url: URL_TLE,
    // CelesTrak states no credit text on its pages (checked on 15 November 2026). This line names the source.
    credit: 'Orbit elements from CelesTrak (https://celestrak.org).',
    retrievedAt: retrievedAt.toISOString(),
    target: `${elements.name}, NORAD ${elements.catalogNumber}`,
    epoch: new Date(elements.epochMs).toISOString(),
    note: TRACK_METHOD,
    elements: text
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => /^[12] /.test(line)),
  },
  startTime: new Date(start).toISOString(),
  stepHours: STEP_MINUTES / 60,
  // 0.01 degrees is about 1 km on the ground.
  craft: track.map((point) => [round(point.longitude, 2), round(point.latitude, 2)]),
  bodies: {},
  earthDistanceKm: track.map((point) => round(point.earthDistanceKm, 1)),
  saa,
  loop: true,
}

const target = resolve(import.meta.dirname, '../../web/src/trip/data/iss.json')
mkdirSync(dirname(target), { recursive: true })
writeFileSync(target, JSON.stringify(file))

const latitudes = track.map((point) => point.latitude)
const altitudes = track.map((point) => point.altitudeKm)
const total = saaPasses(saa, STEP_MINUTES)
console.log(`Wrote ${target}: ${track.length} samples from ${file.startTime}, one each ${STEP_MINUTES} minute.`)
console.log(`Element set of ${file.source.epoch}, read at ${file.source.retrievedAt}.`)
console.log(`Latitude from ${Math.min(...latitudes).toFixed(2)} to ${Math.max(...latitudes).toFixed(2)} degrees. Altitude from ${Math.min(...altitudes).toFixed(1)} to ${Math.max(...altitudes).toFixed(1)} km.`)
console.log(`Inside the SAA region: ${total.minutesPerDay.toFixed(0)} minutes and ${total.passesPerDay.toFixed(1)} passes each day (mean of ${DAYS} days). The longest pass takes ${total.longestMinutes} minutes.`)
for (let day = 0; day < DAYS; day++) {
  const one = saaPasses(saa.slice((day * 1440) / STEP_MINUTES, ((day + 1) * 1440) / STEP_MINUTES), STEP_MINUTES)
  console.log(`  Day ${day + 1}: ${one.minutes} minutes in ${one.passes} passes.`)
}
