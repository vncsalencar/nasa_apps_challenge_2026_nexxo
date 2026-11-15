// Downloads the dose record of the Liulin-MO dosimeter for the cruise of the ExoMars Trace Gas
// Orbiter to Mars (22 April to 15 September 2016) and writes daily values to
// web/src/trip/data/liulin-cruise.json. The app reads this file, so it needs no network.
//
// Run: node server/scripts/fetch-liulin.ts
//      node server/scripts/fetch-liulin.ts /path/to/Liulin_MO_cruise.zip   (a copy that you have)
//
// Source: http://esa-pro.space.bas.bg/datasources/LIULIN_MO (Space Research and Technology
// Institute of the Bulgarian Academy of Sciences, ESA contract 4000117692/16/NL/NDe).
//
// The format of the file (the user manual of the database, section 5.10, and the source page):
//   "Date Time, X_tgo km, Y_tgo km, Z_tgo km, TGO-Earth km, TGO_Mars km, Flux AB, Flux CD, Dose AB, Dose CD"
// One line for each hour, with no header line. The date is day/month/year.
//
// The file and the page do not name the unit of the dose columns. The values are near 15, and the
// paper of the instrument team gives 372 ± 37 and 390 ± 39 µGy for each day for this period
// (Semkova et al. 2018), which is 15.5 and 16.3 µGy for each hour. So the unit is µGy for each
// hour, in silicon. This script checks that the means of the file agree with the paper.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { inflateRawSync } from 'node:zlib'

const ZIP_URL = 'http://esa-pro.space.bas.bg/sites/default/files/Liulin_MO_cruise.zip'
const PAGE_URL = 'http://esa-pro.space.bas.bg/datasources/LIULIN_MO'
// A day needs at least this many hourly values. A day with fewer values is "no data" (null).
const MIN_HOURS = 12
const DAY_MS = 86_400_000

// The first file inside a ZIP archive. A ZIP file ends with a list of its files (the central directory).
function firstFileOfZip(zip: Buffer): { name: string; data: Buffer } {
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  if (end < 0) throw new Error('This is not a ZIP file.')
  const central = zip.readUInt32LE(end + 16)
  if (zip.readUInt32LE(central) !== 0x02014b50) throw new Error('The ZIP file has no list of files.')
  const method = zip.readUInt16LE(central + 10)
  const packedSize = zip.readUInt32LE(central + 20)
  const nameLength = zip.readUInt16LE(central + 28)
  const local = zip.readUInt32LE(central + 42)
  const name = zip.subarray(central + 46, central + 46 + nameLength).toString('utf8')
  const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28)
  const packed = zip.subarray(start, start + packedSize)
  if (method === 0) return { name, data: Buffer.from(packed) }
  if (method === 8) return { name, data: inflateRawSync(packed) }
  throw new Error(`The ZIP file uses a compression method that this script does not read (${method}).`)
}

const local = process.argv[2]
const zip = local ? readFileSync(local) : Buffer.from(await (await fetch(ZIP_URL)).arrayBuffer())
const { name, data } = firstFileOfZip(zip)

type Sample = { ms: number; ab: number; cd: number; line: string }
const samples: Sample[] = []
let skipped = 0
let repeated = 0
for (const line of data.toString('latin1').split(/\r?\n/)) {
  if (!line.trim()) continue
  const cells = line.split(',').map((cell) => cell.trim())
  const time = cells[0].match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/)
  const ab = Number(cells[8])
  const cd = Number(cells[9])
  if (cells.length !== 10 || !time || !Number.isFinite(ab) || !Number.isFinite(cd) || ab <= 0 || cd <= 0) {
    skipped++
    continue
  }
  // The source gives times with no zone. We read them as UTC.
  const ms = Date.UTC(Number(time[3]), Number(time[2]) - 1, Number(time[1]), Number(time[4]), Number(time[5]), Number(time[6]))
  // On 3, 4, and 5 June 2016 the file holds each hourly value two times, about 30 seconds apart.
  // We keep one of them.
  const values = cells.slice(6).join(',')
  const last = samples[samples.length - 1]
  if (last && last.line === values && ms - last.ms < 5 * 60_000) {
    repeated++
    continue
  }
  samples.push({ ms, ab, cd, line: values })
}
if (samples.length < 100) throw new Error(`The file ${name} holds too few lines that this script can read.`)

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length
const round = (value: number, digits: number) => Number(value.toFixed(digits))

// The check of the unit: the means of all hourly values, as µGy for each day, against the paper.
const fileMeanAb = mean(samples.map((sample) => sample.ab)) * 24
const fileMeanCd = mean(samples.map((sample) => sample.cd)) * 24
const PAPER = { ab: 372, cd: 390, tolerance: 0.05 }
for (const [label, found, paper] of [['AB', fileMeanAb, PAPER.ab], ['CD', fileMeanCd, PAPER.cd]] as const) {
  if (Math.abs(found / paper - 1) > PAPER.tolerance) {
    throw new Error(`The mean of the column "Dose ${label}" is ${found.toFixed(1)} for each day if the unit is µGy for each hour. The paper gives ${paper}. The unit or the columns are not what this script expects.`)
  }
}

// Daily values: the mean of the hourly dose rates of one UTC day, times 24 hours, in mGy.
const dayOf = (ms: number) => Math.floor(ms / DAY_MS)
const byDay = new Map<number, Sample[]>()
for (const sample of samples) byDay.set(dayOf(sample.ms), [...(byDay.get(dayOf(sample.ms)) ?? []), sample])
// The series starts and ends with a day that has data.
const good = [...byDay.entries()].filter(([, list]) => list.length >= MIN_HOURS).map(([day]) => day)
const firstDay = Math.min(...good)
const lastDay = Math.max(...good)

const ab: (number | null)[] = []
const cd: (number | null)[] = []
const total: (number | null)[] = []
const hours: number[] = []
for (let day = firstDay; day <= lastDay; day++) {
  const list = byDay.get(day) ?? []
  hours.push(list.length)
  if (list.length < MIN_HOURS) {
    ab.push(null)
    cd.push(null)
    total.push(null)
    continue
  }
  const dayAb = (mean(list.map((sample) => sample.ab)) * 24) / 1000
  const dayCd = (mean(list.map((sample) => sample.cd)) * 24) / 1000
  ab.push(round(dayAb, 5))
  cd.push(round(dayCd, 5))
  total.push(round((dayAb + dayCd) / 2, 5))
}

const withData = total.filter((value): value is number => value !== null)
const file = {
  file: 'liulin-cruise',
  unit: 'mGy',
  // The absorbed dose is in silicon (the material of the detectors), not in water or tissue.
  material: 'silicon',
  startTime: new Date(firstDay * DAY_MS).toISOString(),
  stepDays: 1,
  // The count of days from the launch day (14 March 2016, UTC) to the first value.
  missionDayOfStart: firstDay - Date.UTC(2016, 2, 14) / DAY_MS,
  // The dose of each day in mGy: the mean of the two detectors. null: fewer than 12 hourly values on this day (no data).
  total,
  parts: { ab, cd },
  // How many hourly values the source has for each day.
  hours,
  mean: { total: round(mean(withData), 5), ab: round(fileMeanAb / 1000, 5), cd: round(fileMeanCd / 1000, 5), daysWithData: withData.length, days: total.length },
  source: {
    short: 'Liulin-MO, SRTI-BAS',
    title: `Liulin-MO dosimeter of the FREND instrument on the ExoMars Trace Gas Orbiter, file "${name}" (cruise to Mars, 22 April to 15 September 2016), from the unified database of Liulin instruments.`,
    url: PAGE_URL,
    credit:
      'Liulin-MO data: J. Semkova (Space Research and Technology Institute, Bulgarian Academy of Sciences) and V. Benghin (Institute of Biomedical Problems, Russian Academy of Sciences), http://esa-pro.space.bas.bg/datasources/LIULIN_MO. Reference: Semkova et al., Icarus 303, 53–66 (2018).',
    retrievedAt: new Date().toISOString(),
  },
  note:
    'Columns "Dose AB" and "Dose CD" of the source: the absorbed dose rate in silicon in the two detector pairs, which point in two perpendicular directions. ' +
    'The source has one value for each hour. It does not name the unit. We read it as µGy for each hour, because the means of the file then agree with the paper of the instrument team ' +
    `(file: ${fileMeanAb.toFixed(0)} and ${fileMeanCd.toFixed(0)} µGy for each day, paper: 372 ± 37 and 390 ± 39). ` +
    'A daily value is the mean of the hourly values of one UTC day, times 24 hours, divided by 1000. "total" is the mean of the two detectors. ' +
    `A day with fewer than ${MIN_HOURS} hourly values is null (no data): the instrument was off from 19 July to 11 August 2016 and was on only at times after that. ` +
    `On 3, 4, and 5 June 2016 the source holds each hourly value two times. We keep one (${repeated} lines removed). ` +
    'The source gives times with no zone. We read them as UTC. The orbiter left the Earth on 14 March 2016. "missionDayOfStart" is the count of days from that date to the first value.',
}

const target = resolve(import.meta.dirname, '../../web/src/trip/data/liulin-cruise.json')
mkdirSync(dirname(target), { recursive: true })
writeFileSync(target, JSON.stringify(file))
console.log(
  `Wrote ${target}: ${total.length} days from ${file.startTime}, ${withData.length} days with data. ` +
    `${samples.length} hourly values, ${skipped} lines skipped, ${repeated} repeated lines removed. ` +
    `Mean of the hourly values: AB ${fileMeanAb.toFixed(1)}, CD ${fileMeanCd.toFixed(1)} µGy for each day. ` +
    `Mean of the daily values: ${(mean(withData) * 1000).toFixed(1)} µGy for each day, lowest ${(Math.min(...withData) * 1000).toFixed(1)}, highest ${(Math.max(...withData) * 1000).toFixed(1)}.`,
)
console.log(`Hourly values for each day: ${hours.join(' ')}`)
