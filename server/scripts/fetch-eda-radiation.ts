// Downloads the daily radiation dose of one Rodent Research mission on the International Space
// Station from the NASA Environmental Data Application (EDA) and writes it to
// web/src/trip/data/eda-<mission>-radiation.json. The app reads this file, so it needs no network.
//
// Run: node server/scripts/fetch-eda-radiation.ts                 (RR-9)
//      node server/scripts/fetch-eda-radiation.ts RR-9 page.html   (a saved copy of the page)
//
// Source: https://visualization.osdr.nasa.gov/eda/
// The app has no JSON route, so this script reads the data block inside the page, as
// fetch-eda.ts does for the CO2 record.
//
// What the EDA says about these values (the "info" text of "Radiation data" on the page):
//   "Radiation dose received by the samples is calculated through dosimetry techniques. Doses are
//   in water based on standard conversion from dose in silicon. [...] Data are cumulative absorbed
//   doses from preliminary analysis of results from instruments on the International Space
//   Station, analyzed by subject matter experts from the Space Radiation Analysis Group (SRAG),
//   NASA-JSC."
// The unit is in the chart code of the EDA (static/js/radiation_plots.js): "Dose [mGy/day]".
//
// The radiation dates of RR-9 are in 2017 and are right. (The CO2 telemetry of the same page is
// dated one year too late. See fetch-eda.ts.)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const MISSION = process.argv[2] ?? 'RR-9'
const url = `https://visualization.osdr.nasa.gov/eda/dashboard_${encodeURIComponent(MISSION)}`
const DAY_MS = 86_400_000

const saved = process.argv[3]
const page = saved ? readFileSync(saved, 'utf8') : await (await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } })).text()
const block = page.match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/)
if (!block) throw new Error(`The page ${url} holds no data block.`)
const radiation = JSON.parse(JSON.parse(block[1]).radiation_data) as {
  time: string[]
  gcr: (number | null)[]
  saa: (number | null)[]
  total: (number | null)[]
  milestones: Record<string, string>
}

// The source gives days with no zone. We read them as UTC.
const toMs = (text: string) => Date.parse(`${text.split(' ')[0]}T00:00:00Z`)

// Keep the time on the station only: from the transfer of the animals to the station until the undock.
const names = Object.keys(radiation.milestones)
function milestone(pattern: RegExp) {
  const name = names.find((key) => pattern.test(key))
  if (!name) throw new Error(`The radiation record of ${MISSION} has no milestone that matches ${pattern}.`)
  return toMs(radiation.milestones[name])
}
const from = milestone(/transfer/i)
const to = names.some((key) => /undock/i.test(key)) ? milestone(/undock/i) : milestone(/return/i)

const round = (value: number) => Number(value.toFixed(5))
const days: { ms: number; gcr: number; saa: number; total: number }[] = []
radiation.time.forEach((time, index) => {
  const ms = toMs(time)
  const gcr = radiation.gcr[index]
  const saa = radiation.saa[index]
  const total = radiation.total[index]
  if (ms < from || ms > to) return
  if (typeof gcr !== 'number' || typeof saa !== 'number' || typeof total !== 'number') throw new Error(`The day ${time} has no value.`)
  // The total of the source must be the sum of its two parts.
  if (Math.abs(gcr + saa - total) > 1e-6) throw new Error(`On ${time} the total of the source is not the sum of GCR and SAA.`)
  days.push({ ms, gcr: round(gcr), saa: round(saa), total: round(total) })
})
if (days.length < 2) throw new Error('The window holds no radiation values.')
days.forEach((day, index) => {
  if (day.ms !== days[0].ms + index * DAY_MS) throw new Error('The source skips a day. This script expects one value for each day.')
})

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length
const meanTotal = mean(days.map((day) => day.total))
const meanGcr = mean(days.map((day) => day.gcr))
const meanSaa = mean(days.map((day) => day.saa))
// The day with the highest GCR part, and how it compares with the median of the GCR part.
const sorted = days.map((day) => day.gcr).sort((a, b) => a - b)
const medianGcr = sorted[Math.floor(sorted.length / 2)]
const peak = days.reduce((best, day) => (day.gcr > best.gcr ? day : best))
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10)

// The solar particle event of September 2017 is in the window of RR-9. The note names it only if the record shows it.
const event2017 = MISSION === 'RR-9' && peak.gcr > 2 * medianGcr && ['2017-09-10', '2017-09-11'].includes(isoDay(peak.ms))

const file = {
  file: `eda-${MISSION.toLowerCase().replace('-', '')}-radiation`,
  unit: 'mGy',
  // The absorbed dose is in water, converted by NASA from the dose in silicon (see the note).
  material: 'water',
  startTime: new Date(days[0].ms).toISOString(),
  stepDays: 1,
  // The absorbed dose of each day in mGy: the sum of the two parts.
  total: days.map((day) => day.total),
  parts: { gcr: days.map((day) => day.gcr), saa: days.map((day) => day.saa) },
  mean: { total: round(meanTotal), gcr: round(meanGcr), saa: round(meanSaa), days: days.length },
  milestones: Object.fromEntries(names.map((name) => [name, isoDay(toMs(radiation.milestones[name]))])),
  source: {
    short: 'NASA EDA, RR-9',
    title: `NASA Open Science Data Repository, Environmental Data Application (EDA), mission ${MISSION}, radiation data: daily absorbed dose on the International Space Station, analysed by the Space Radiation Analysis Group (SRAG) of NASA-JSC.`,
    url,
    credit: 'Data and visualizations are courtesy of the Environmental Data Application (EDA) (https://visualization.osdr.nasa.gov/eda/)',
    retrievedAt: new Date().toISOString(),
  },
  note:
    `Fields "gcr", "saa", and "total" of the radiation data of ${MISSION}: the absorbed dose of each day in mGy, from galactic cosmic rays (GCR), from the passes through the South Atlantic Anomaly (SAA), and their sum. ` +
    'The EDA says: "Doses are in water based on standard conversion from dose in silicon" and "preliminary analysis of results from instruments on the International Space Station". ' +
    `We keep the days from the transfer of the animals to the station (${isoDay(from)}) to the undock (${isoDay(to)}): ${days.length} days. ` +
    `Mean: ${meanTotal.toFixed(3)} mGy for each day (GCR ${meanGcr.toFixed(3)}, SAA ${meanSaa.toFixed(3)}). ` +
    (event2017
      ? `On ${isoDay(peak.ms)} the GCR part is ${peak.gcr.toFixed(3)} mGy, ${(peak.gcr / medianGcr).toFixed(1)} times its median (${medianGcr.toFixed(3)} mGy). ` +
        'This is the time of the solar particle event that started on 10 September 2017. Instruments on the station measured it: Berger et al., Space Weather 16, 1173–1189 (2018), https://doi.org/10.1029/2018SW001920. ' +
        'The EDA does not label the event, so the link between this value and the event is our reading. The EDA counts the extra dose in the GCR part.'
      : `The highest GCR part is ${peak.gcr.toFixed(3)} mGy on ${isoDay(peak.ms)} (median ${medianGcr.toFixed(3)} mGy).`),
}

const target = resolve(import.meta.dirname, `../../web/src/trip/data/${file.file}.json`)
mkdirSync(dirname(target), { recursive: true })
writeFileSync(target, JSON.stringify(file))
console.log(
  `Wrote ${target}: ${days.length} days from ${isoDay(days[0].ms)} to ${isoDay(days[days.length - 1].ms)}. ` +
    `Mean total ${meanTotal.toFixed(4)} mGy for each day (GCR ${meanGcr.toFixed(4)}, SAA ${meanSaa.toFixed(4)}). ` +
    `Highest GCR ${peak.gcr.toFixed(4)} on ${isoDay(peak.ms)}, median GCR ${medianGcr.toFixed(4)}. ` +
    `Mean total without the highest GCR day: ${mean(days.filter((day) => day !== peak).map((day) => day.total)).toFixed(4)}.`,
)
