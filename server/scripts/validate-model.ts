// Compares the cabin model (shared/co2.ts) with the real RR-9 record, and prints how close it gets.
//
// Run: npm run validate-model -w server
//
// The crew count of the station changed two times in the window of the record (NASA releases):
//   until 2 September 2017, 21:58 UTC   6 persons (Soyuz MS-04 undocked with 3 persons)
//   until 13 September 2017, 02:55 UTC  3 persons (Soyuz MS-06 docked with 3 persons)
//   then                                6 persons
// The model gets these crew counts and the first value of the record. It gets nothing else.
import { DEFAULT_PARAMS, STEPS_PER_HOUR, STEP_MINUTES, advance, modelOf, ppmToMmHg, rateAt, type ModelParams } from '../../shared/co2.ts'
import { loadRecord } from '../src/record.ts'

const record = loadRecord()
const mmHg = record.ppm.map((ppm) => ppmToMmHg(ppm))
const stepOf = (time: string) => Math.round((Date.parse(time) - record.startMs) / (STEP_MINUTES * 60_000))
const UNDOCK = stepOf('2017-09-02T21:58:00Z')
const DOCK = stepOf('2017-09-13T02:55:00Z')
const crewAt = (step: number) => (step < UNDOCK || step >= DOCK ? 6 : 3)

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length
const rms = (values: number[]) => Math.sqrt(mean(values.map((value) => value * value)))
// The mean of the hour before each step, so the short swings of the sensor do not count.
const smooth = (values: number[]) => values.map((_, index) => mean(values.slice(Math.max(0, index - STEPS_PER_HOUR + 1), index + 1)))
const real = smooth(mmHg)
const day = (step: number) => new Date(record.startMs + step * STEP_MINUTES * 60_000).toISOString().slice(0, 16).replace('T', ' ')

function run(params: ModelParams, from: number, to: number) {
  const values = [real[from]]
  for (let step = from + 1; step < to; step++) values.push(advance(values[values.length - 1], STEP_MINUTES / 60, modelOf(params, crewAt(step), 'both')))
  return values
}
function compare(label: string, params: ModelParams, from: number, to: number) {
  const model = run(params, from, to)
  const errors = model.map((value, index) => value - real[from + index])
  console.log(
    `${label.padEnd(46)} real ${real[from].toFixed(2)} to ${real[to - 1].toFixed(2)} mmHg, model ends at ${model[model.length - 1].toFixed(2)}, ` +
      `RMS error ${rms(errors).toFixed(2)} mmHg, mean error ${mean(errors) >= 0 ? '+' : ''}${mean(errors).toFixed(2)} mmHg`,
  )
}

console.log(`Record: ${record.source.mission}, ${mmHg.length} values, ${day(0)} to ${day(mmHg.length - 1)} UTC.`)
console.log(`Mean of the record with 6 persons before the undock: ${mean(mmHg.slice(0, UNDOCK)).toFixed(2)} mmHg. With 3 persons, from 3 days after the undock: ${mean(mmHg.slice(UNDOCK + 3 * 288, DOCK)).toFixed(2)} mmHg.`)
for (const [name, params] of [
  ['Default settings', DEFAULT_PARAMS],
  ['One CDRA alone (other removal 0)', { ...DEFAULT_PARAMS, otherRemoval: 0 }],
] as const) {
  console.log(`\n${name}: balance ${modelOf(params, 6, 'both').balance.toFixed(2)} mmHg with 6 persons, ${modelOf(params, 3, 'both').balance.toFixed(2)} mmHg with 3 persons.`)
  compare('  Whole record', params, 0, mmHg.length)
  compare('  Fall after the crew went from 6 to 3 (4 days)', params, UNDOCK, UNDOCK + 4 * 288)
  compare('  Rise after the crew went from 3 to 6', params, DOCK, mmHg.length)
}

// Short rises: the fastest rises of the hourly mean over 3 hours, compared with the fastest
// rise that the model can give at that value (6 persons, CDRA off).
console.log('\nThe fastest rises of the record over 3 hours:')
const span = 3 * STEPS_PER_HOUR
const rises = real.map((value, index) => ({ step: index, rise: index + span < real.length ? real[index + span] - value : -Infinity })).sort((a, b) => b.rise - a.rise)
const shown: typeof rises = []
for (const item of rises) {
  if (shown.length === 5) break
  if (shown.every((other) => Math.abs(other.step - item.step) > span)) shown.push(item)
}
for (const item of shown) {
  const off = modelOf(DEFAULT_PARAMS, 6, 'off')
  const none = modelOf({ ...DEFAULT_PARAMS, otherRemoval: 0 }, 6, 'off')
  console.log(
    `  ${day(item.step)}  ${real[item.step].toFixed(2)} to ${real[item.step + span].toFixed(2)} mmHg: ${(item.rise / 3).toFixed(3)} mmHg each hour. ` +
      `Model with CDRA off: ${rateAt(real[item.step], off).toFixed(3)}. Model with no removal at all: ${rateAt(real[item.step], none).toFixed(3)}.`,
  )
}
