// Downloads the cabin CO2 record of one Rodent Research mission from the NASA Environmental
// Data Application (EDA) and writes it to server/seed/ with the 5-minute interval of the source.
//
// Run: npm run fetch-eda -w server            (RR-9)
//      npm run fetch-eda -w server -- RR-6    (another mission)
//
// Source: https://visualization.osdr.nasa.gov/eda/
// The app has no JSON route, so this script reads the data block inside the page.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const MISSION = process.argv[2] ?? 'RR-9'
const url = `https://visualization.osdr.nasa.gov/eda/dashboard_${encodeURIComponent(MISSION)}`
const STEP_MS = 5 * 60_000

// Known errors in the dates of the source, in years to add.
// RR-9 flew on SpaceX CRS-12, which launched on 14 August 2017. The EDA telemetry of RR-9 is
// dated 2018, and the EDA radiation data of RR-9 is dated 2017. We move the telemetry by -1 year.
const YEAR_SHIFT: Record<string, number> = { 'RR-9': -1 }
const shift = YEAR_SHIFT[MISSION] ?? 0

const page = await (await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } })).text()
const block = page.match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/)
if (!block) throw new Error(`The page ${url} holds no data block.`)
const telemetry = JSON.parse(JSON.parse(block[1]).telemetry_data) as {
  time: string[]
  co2_iss: (number | null)[]
  milestones: Record<string, string>
}

// The source gives times with no zone. We read them as UTC.
function toMs(text: string) {
  const [date, clock = '00:00'] = text.split(' ')
  const moved = new Date(Date.parse(`${date}T${clock.length === 5 ? `${clock}:00` : clock}Z`))
  moved.setUTCFullYear(moved.getUTCFullYear() + shift)
  return moved.getTime()
}

// Keep the time on the station only: from the transfer of the animals to the station until the undock.
// The data before the transfer is launch and transit, and it falls to 400 ppm.
const names = Object.keys(telemetry.milestones)
function milestone(pattern: RegExp) {
  const name = names.find((key) => pattern.test(key))
  if (!name) throw new Error(`The record of ${MISSION} has no milestone that matches ${pattern}.`)
  return toMs(telemetry.milestones[name])
}
const from = milestone(/transfer/i)
// Some missions have no undock in the record. Then the return of the animals ends the window.
const to = names.some((key) => /undock/i.test(key)) ? milestone(/undock/i) : milestone(/return/i)

const samples: { ms: number; ppm: number }[] = []
telemetry.time.forEach((time, index) => {
  const ms = toMs(time)
  const ppm = telemetry.co2_iss[index]
  if (ms >= from && ms <= to && typeof ppm === 'number' && Number.isFinite(ppm)) samples.push({ ms, ppm })
})
if (samples.length < 2) throw new Error('The window holds no CO2 values.')

// Put the samples on an exact 5-minute grid. A step with no sample keeps the value before it.
const start = samples[0].ms
const count = Math.round((samples[samples.length - 1].ms - start) / STEP_MS) + 1
const grid = new Array<number | null>(count).fill(null)
for (const sample of samples) grid[Math.round((sample.ms - start) / STEP_MS)] = Math.round(sample.ppm * 10) / 10
let gaps = 0
let last = samples[0].ppm
const ppm = grid.map((value) => {
  if (value === null) gaps++
  return (last = value ?? last)
})

const seed = {
  source: {
    name: 'NASA Environmental Data Application (EDA)',
    url,
    credit: 'Data and visualizations are courtesy of the Environmental Data Application (EDA) (https://visualization.osdr.nasa.gov/eda/)',
    mission: MISSION,
    field: 'co2_iss',
    unit: 'ppm',
    retrievedAt: new Date().toISOString(),
  },
  milestones: Object.fromEntries(names.map((name) => [name, new Date(toMs(telemetry.milestones[name])).toISOString()])),
  startTime: new Date(start).toISOString(),
  stepMinutes: 5,
  // Years that this script added to the dates of the source.
  yearShift: shift,
  ppm,
}

const target = resolve(import.meta.dirname, `../seed/eda-${MISSION.toLowerCase()}-co2.json`)
mkdirSync(dirname(target), { recursive: true })
writeFileSync(target, JSON.stringify(seed))
const mean = ppm.reduce((sum, value) => sum + value, 0) / ppm.length
console.log(
  `Wrote ${target}: ${ppm.length} values from ${seed.startTime}, one each 5 minutes. ` +
    `Mean ${mean.toFixed(0)} ppm, highest ${Math.max(...ppm).toFixed(0)} ppm, lowest ${Math.min(...ppm).toFixed(0)} ppm, ${gaps} steps with no value.`,
)
