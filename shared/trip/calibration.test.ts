// Tests of the check of the life support model against the real RR-9 record.
// Run: node --test shared/trip/calibration.test.ts
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it } from 'node:test'
import { CDRA_RATE, STEPS_PER_HOUR, mmHgToPpm, ppmToMmHg } from '../co2.ts'
import { ISS_CREW, ISS_OTHER_UNITS, issCalibration, issLife } from './calibration.ts'
import { dailyPattern, dailyTotals } from './lifesupport.ts'

const near = (actual: number, expected: number, tolerance: number) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`)
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length

// The real record, one value each 5 minutes, and its hourly means as the server makes them (server/src/record.ts).
const seed: { startTime: string; stepMinutes: number; ppm: number[] } = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../../server/seed/eda-rr-9-co2.json'), 'utf8'),
)
const startMs = Date.parse(seed.startTime)
const hourly: number[] = []
for (let from = 0; from < seed.ppm.length; from += STEPS_PER_HOUR) hourly.push(Math.round(mean(seed.ppm.slice(from, from + STEPS_PER_HOUR))))

describe('check against the RR-9 record', () => {
  const result = issCalibration(hourly, startMs)

  it('reads the record: 5-minute values from 18 August 2017, 15:43 UTC', () => {
    assert.equal(seed.stepMinutes, 5)
    assert.equal(seed.startTime, '2017-08-18T15:43:00.000Z')
    assert.equal(seed.ppm.length, 8269)
    assert.equal(hourly.length, 690)
  })

  it('gives one real value and one model value for each hour', () => {
    assert.equal(result.hours.length, hourly.length)
    assert.equal(result.realMmHg.length, hourly.length)
    assert.equal(result.modelMmHg.length, hourly.length)
    assert.deepEqual(result.hours.slice(0, 3), [0, 1, 2])
    near(result.realMmHg[0], ppmToMmHg(hourly[0]), 1e-12)
    assert.ok(result.modelMmHg.every((value) => Number.isFinite(value) && value > 0))
  })

  it('uses the real crew counts: 6, then 3 from 2 September 21:58 UTC, then 6 from 13 September 02:55 UTC', () => {
    assert.deepEqual(ISS_CREW.map((item) => item.count), [6, 3, 6])
    assert.deepEqual(result.crew.map((item) => item.count), [6, 3, 6])
    assert.equal(result.crew[0].fromHour, 0)
    near(result.crew[1].fromHour, (Date.parse('2017-09-02T21:58:00Z') - startMs) / 3_600_000, 1e-12)
    near(result.crew[1].fromHour, 366.25, 1e-9)
    near(result.crew[2].fromHour, 611.2, 1e-9)
    for (const item of result.crew) assert.ok(item.source.url.startsWith('https://www.nasa.gov/'))
  })

  it('uses the station cabin: 916 m³, one CDRA and the other removal, the default schedule', () => {
    const cabin = issLife(6)
    assert.equal(cabin.freeVolumeM3, 916)
    assert.equal(cabin.scrubberUnits, 1)
    assert.equal(cabin.otherUnits, ISS_OTHER_UNITS)
    assert.equal(cabin.metabolic, 'hidh')
    near(dailyTotals(cabin).co2Kg, 1.1655, 1e-9)
    near(result.removalPerMmHgKgDay, (1 + ISS_OTHER_UNITS) * CDRA_RATE.kgPerDayPerMmHg, 1e-12)
    near(result.removalPerMmHgKgDay, 2.86, 0.001)
  })

  it('sets the other removal of the station from the record with 6 persons', () => {
    // The mean of the real record before the undock, from the 5-minute values: 2.66 mmHg.
    const undockStep = Math.round((Date.parse('2017-09-02T21:58:00Z') - startMs) / 300_000)
    const level = mean(seed.ppm.slice(0, undockStep).map((ppm) => ppmToMmHg(ppm)))
    near(level, 2.659, 0.001)
    // Removal = crew output: units × (1.723 × level − 0.37975) = 6 × the CO2 of one person each day.
    const units = (6 * dailyTotals(issLife(6)).co2Kg) / (CDRA_RATE.kgPerDayPerMmHg * level - CDRA_RATE.offsetKgPerDay)
    assert.equal(Math.round((units - 1) * 100) / 100, ISS_OTHER_UNITS)
    assert.equal(ISS_OTHER_UNITS, 0.66)
    // With the rounded value, the daily mean of the model with 6 persons is 0.01 mmHg from the record.
    near(dailyPattern(issLife(6)).meanCo2MmHg!, level, 0.01)
  })

  it('starts from the daily pattern of 6 persons, and not from a value of the record', () => {
    // 15:43 UTC is minute 943 of the day. The first hourly mean of the model is the mean of the pattern from there.
    const pattern = dailyPattern(issLife(6))
    near(result.modelMmHg[0], mean(Array.from(pattern.co2MmHg.slice(943, 1003))), 1e-9)
    // Other real values give the same model.
    const other = issCalibration(hourly.map((ppm) => ppm + 500), startMs)
    assert.deepEqual(other.modelMmHg, result.modelMmHg)
  })

  it('follows the crew count as the record does', () => {
    const undock = Math.floor(result.crew[1].fromHour)
    const dock = Math.floor(result.crew[2].fromHour)
    // 6 persons, before the undock: the record has 2.66 mmHg. The model has the same level, because
    // the other removal of the station was set to give it. This is not a test of the model.
    near(mean(result.realMmHg.slice(0, undock)), 2.66, 0.01)
    near(mean(result.modelMmHg.slice(0, undock)), 2.67, 0.01)
    // 3 persons, from 3 days after the undock: the record has 1.65 mmHg, and the model 1.45 mmHg. This is a test.
    near(mean(result.realMmHg.slice(undock + 72, dock)), 1.65, 0.01)
    near(mean(result.modelMmHg.slice(undock + 72, dock)), 1.45, 0.01)
    // The model falls after the undock and rises after the dock.
    assert.ok(result.modelMmHg[undock + 48] < result.modelMmHg[undock] - 0.8)
    assert.ok(result.modelMmHg[result.modelMmHg.length - 1] > result.modelMmHg[dock] + 0.8)
  })

  it('has the error that the documents report: RMS 0.38 mmHg, mean −0.06 mmHg', () => {
    near(result.rmsMmHg, 0.379, 0.003)
    near(result.meanErrorMmHg, -0.057, 0.003)
    // The same numbers by hand.
    const errors = result.modelMmHg.map((value, index) => value - result.realMmHg[index])
    near(result.rmsMmHg, Math.sqrt(mean(errors.map((error) => error * error))), 1e-12)
    near(result.meanErrorMmHg, mean(errors), 1e-12)
  })

  it('has no error against its own output, and skips an hour with no real value', () => {
    const own = issCalibration(result.modelMmHg.map((value) => mmHgToPpm(value)), startMs)
    near(own.rmsMmHg, 0, 1e-9)
    near(own.meanErrorMmHg, 0, 1e-9)
    const gap = [...hourly]
    gap[100] = NaN
    const withGap = issCalibration(gap, startMs)
    assert.ok(Number.isFinite(withGap.rmsMmHg))
    assert.ok(Number.isNaN(withGap.realMmHg[100]))
    assert.ok(Number.isNaN(issCalibration([], startMs).rmsMmHg))
  })
})
