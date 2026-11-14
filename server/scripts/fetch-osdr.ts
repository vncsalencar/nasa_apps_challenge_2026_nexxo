// Downloads the environment record of one past mission from the NASA Open Science
// Data Repository (OSDR) and writes it to server/seed/ as hourly values.
//
// Run: npm run fetch-osdr -w server
//
// The source is the Environmental Data App: https://visualization.osdr.nasa.gov/eda/
// The app has no JSON route, so this script reads the data block inside the page.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const MISSION = process.argv[2] ?? 'RR-6'
const url = `https://visualization.osdr.nasa.gov/eda/dashboard_${encodeURIComponent(MISSION)}`
const HOUR = 3_600_000

const page = await (await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } })).text()
const block = page.match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/)
if (!block) throw new Error(`The page ${url} holds no data block.`)
const data = JSON.parse(block[1])
const telemetry = JSON.parse(data.telemetry_data)
const radiation = JSON.parse(data.radiation_data)

// The source gives times with no zone. We read them as UTC.
const toMs = (text: string) => Date.parse(text.replace(' ', 'T') + (text.length <= 10 ? 'T00:00:00Z' : 'Z'))

// Keep the time on the station only: from the transfer to the station to the last radiation day.
const start = Math.ceil(toMs(telemetry.milestones['Animal transfer to ISS'] + ':00') / HOUR) * HOUR
const lastRadiationDay = toMs(radiation.time[radiation.time.length - 1])
const end = Math.min(lastRadiationDay + 24 * HOUR, toMs(telemetry.time[telemetry.time.length - 1]))
const hours = Math.floor((end - start) / HOUR)

function hourlyMean(values: unknown[], decimals: number): (number | null)[] {
  const sums = new Array<number>(hours).fill(0)
  const counts = new Array<number>(hours).fill(0)
  telemetry.time.forEach((time: string, index: number) => {
    const hour = Math.floor((toMs(time) - start) / HOUR)
    const value = values[index]
    if (hour < 0 || hour >= hours || typeof value !== 'number') return
    sums[hour] += value
    counts[hour] += 1
  })
  return sums.map((sum, hour) => (counts[hour] ? Number((sum / counts[hour]).toFixed(decimals)) : null))
}

const days: string[] = []
const gcr: number[] = []
const saa: number[] = []
radiation.time.forEach((day: string, index: number) => {
  const time = toMs(day)
  if (time + 24 * HOUR <= start || time >= end) return
  days.push(day)
  gcr.push(Number(radiation.gcr[index].toFixed(5)))
  saa.push(Number(radiation.saa[index].toFixed(5)))
})

const seed = {
  source: {
    name: 'NASA Open Science Data Repository, Environmental Data App',
    url,
    mission: MISSION,
    retrievedAt: new Date().toISOString(),
    notes: [
      'Sensors in the cabin of the International Space Station, next to the rodent habitat of this mission.',
      'Temperature (°C), relative humidity (%) and CO2 (ppm): the mean of each hour of the 5-minute record.',
      'Radiation (mGy for each day): dose from galactic cosmic rays (gcr) and from the South Atlantic Anomaly (saa).',
      'The source gives times with no zone. We read them as UTC.',
    ],
  },
  milestones: telemetry.milestones,
  startTime: new Date(start).toISOString(),
  hours,
  // The field names and the units below are the ones of the NASA record.
  telemetry: {
    temperature_iss: hourlyMean(telemetry.temperature_iss, 2),
    rh_iss: hourlyMean(telemetry.rh_iss, 1),
    co2_iss: hourlyMean(telemetry.co2_iss, 0),
  },
  radiation: { time: days, gcr, saa },
}

const target = resolve(import.meta.dirname, `../seed/osdr-${MISSION.toLowerCase()}.json`)
mkdirSync(dirname(target), { recursive: true })
writeFileSync(target, JSON.stringify(seed))
const gaps = seed.telemetry.co2_iss.filter((value) => value === null).length
console.log(`Wrote ${target}: ${hours} hours from ${seed.startTime}, ${days.length} radiation days, ${gaps} hours with no CO2 value.`)
