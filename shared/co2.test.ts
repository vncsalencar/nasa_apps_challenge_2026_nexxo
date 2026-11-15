// Tests of the CO2 math. Run: npm test
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  BANDS,
  CDRA_RATE,
  DEFAULT_PARAMS,
  HISTORY_STEPS,
  LIMIT_1H_MMHG,
  WINDOWS,
  advance,
  intensity,
  mmHgPerKg,
  mmHgToPpm,
  modelOf,
  ppmToMmHg,
  project,
  rateAt,
  regionHeat,
  relativeOdds,
  removalUnits,
  rollingMean,
  thresholds,
  timeTo,
} from './co2.ts'

const near = (actual: number, expected: number, tolerance: number) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`)

describe('ppm and mmHg', () => {
  it('converts ppm to mmHg at 760 mmHg', () => {
    near(ppmToMmHg(1_000_000), 760, 1e-9)
    near(ppmToMmHg(1316), 1.0, 0.001)
  })

  it('gives the check values of the RR-9 record', () => {
    // The mean of the record is 3,015 ppm, and the highest value is 4,051 ppm.
    near(ppmToMmHg(3015), 2.2914, 0.0001)
    assert.equal(ppmToMmHg(3015).toFixed(1), '2.3')
    near(ppmToMmHg(4051), 3.0788, 0.0001)
    assert.equal(ppmToMmHg(4051).toFixed(1), '3.1')
  })

  it('converts mmHg to ppm', () => {
    near(mmHgToPpm(1), 1315.79, 0.01)
    near(mmHgToPpm(3), 3947.37, 0.01)
  })

  it('goes there and back with no change', () => {
    for (const ppm of [400, 3015, 4051, 6579]) near(mmHgToPpm(ppmToMmHg(ppm)), ppm, 1e-9)
    for (const pressure of [526, 760]) near(mmHgToPpm(ppmToMmHg(3015, pressure), pressure), 3015, 1e-9)
  })

  it('uses the total cabin pressure', () => {
    // The same ppm gives a lower partial pressure in a cabin with a lower total pressure.
    near(ppmToMmHg(3015, 526), 1.5859, 0.0001)
    near(ppmToMmHg(3015, 526) / ppmToMmHg(3015, 760), 526 / 760, 1e-12)
  })
})

describe('rolling averages', () => {
  it('has windows of 1 hour, 24 hours and 7 days of 5-minute values', () => {
    assert.deepEqual(WINDOWS.map((window) => window.steps), [12, 288, 2016])
    assert.equal(HISTORY_STEPS, 2016)
  })

  it('takes the mean of the last values only', () => {
    const values = [100, 100, 100, 1, 2, 3]
    assert.deepEqual(rollingMean(values, 3), { mean: 2, count: 3, steps: 3 })
    assert.deepEqual(rollingMean(values, 6), { mean: 51, count: 6, steps: 6 })
  })

  it('reports a short series', () => {
    assert.deepEqual(rollingMean([2, 4], 12), { mean: 3, count: 2, steps: 12 })
    assert.equal(rollingMean([], 12), null)
  })

  it('moves by one twelfth of a jump in the 1-hour window', () => {
    const before = new Array<number>(12).fill(2)
    const after = [...before.slice(1), 5]
    near(rollingMean(after, 12)!.mean - rollingMean(before, 12)!.mean, 3 / 12, 1e-12)
  })

  it('gives different results for the three windows of one series', () => {
    // 7 days at 2 mmHg, then the last hour at 4 mmHg.
    const values = [...new Array<number>(2016 - 12).fill(2), ...new Array<number>(12).fill(4)]
    near(rollingMean(values, 12)!.mean, 4, 1e-12)
    near(rollingMean(values, 288)!.mean, 2 + 2 * (12 / 288), 1e-12)
    near(rollingMean(values, 2016)!.mean, 2 + 2 * (12 / 2016), 1e-12)
  })

  it('works on a typed array', () => {
    assert.equal(rollingMean(Float64Array.from([1, 2, 3, 4]), 2)!.mean, 3.5)
  })
})

describe('headache odds', () => {
  it('is 1 at the reference of 2.5 mmHg', () => {
    assert.equal(relativeOdds(2.5), 1)
  })
  it('doubles for each +1 mmHg', () => {
    near(relativeOdds(3.5), 2, 1e-12)
    near(relativeOdds(4.5), 4, 1e-12)
    near(relativeOdds(1.5), 0.5, 1e-12)
  })
})

describe('symptom bands', () => {
  const band = { from: 2.3, to: 2.7 }
  it('is 0 below the band and 1 at or above its end', () => {
    assert.equal(intensity(2.29, band), 0)
    assert.equal(intensity(2.7, band), 1)
    assert.equal(intensity(9, band), 1)
  })
  it('rises in a straight line inside the band', () => {
    assert.equal(intensity(2.3, band), 0)
    near(intensity(2.5, band), 0.5, 1e-12)
  })
  it('switches fully on for a band with one value', () => {
    assert.equal(intensity(3.49, { from: 3.5, to: null }), 0)
    assert.equal(intensity(3.5, { from: 3.5, to: null }), 1)
  })
  it('shows no region at the mean of the RR-9 record, and the right regions above it', () => {
    assert.deepEqual(regionHeat(2.29), { body: 0, brain: 0, head: 0, eyes: 0, airway: 0, face: 0, sleep: 0 })
    const high = regionHeat(3.6)
    assert.ok(high.body > 0 && high.brain > 0 && high.head > 0 && high.eyes > 0 && high.airway > 0 && high.sleep > 0)
    assert.equal(high.face, 0)
    assert.equal(regionHeat(5).face, 1)
    assert.equal(regionHeat(5).body, 1)
  })
  it('takes the stronger of the two headache bands', () => {
    // At 3.2 mmHg the band of the NTRS document (3.0 to 3.4) is half way. The band of the brief (2.8 to 4.5) is below that.
    const weight = BANDS.find((item) => item.id === 'headache_ntrs')!.weight
    near(regionHeat(3.2).head, 0.5 * weight, 1e-9)
  })
  it('lists each start value and the 1-hour limit one time, lowest first', () => {
    const list = thresholds()
    assert.deepEqual(list, [...new Set(list)].sort((a, b) => a - b))
    assert.ok(list.includes(LIMIT_1H_MMHG))
    for (const item of BANDS) assert.ok(list.includes(item.from))
  })
})

describe('cabin model', () => {
  const params = DEFAULT_PARAMS
  const perKgEachHour = mmHgPerKg(params) / 24

  it('gets the pressure of 1 kg of CO2 from the ideal gas law', () => {
    // 1 kg is 22.72 mol. At 22.5 °C in 916 m³: 22.72 × 8.314 × 295.65 / 916 = 60.97 Pa = 0.4573 mmHg.
    near(mmHgPerKg({ freeVolumeM3: 916, temperatureC: 22.5 }), 0.4573, 0.0005)
    // Half the volume gives two times the pressure.
    near(mmHgPerKg({ freeVolumeM3: 458, temperatureC: 22.5 }) / mmHgPerKg({ freeVolumeM3: 916, temperatureC: 22.5 }), 2, 1e-12)
  })

  it('counts the removal of each state of the CDRA', () => {
    assert.equal(removalUnits(params, 'both'), 1.5)
    assert.equal(removalUnits(params, 'one'), 1)
    assert.equal(removalUnits(params, 'off'), 0.5)
    assert.equal(removalUnits({ oneBedShare: 0.5, otherRemoval: 0 }, 'off'), 0)
  })

  it('uses the removal equation of NASA for one CDRA with both beds', () => {
    // With no other system: change = crew − (1.723 × ppCO2 − 0.37975), in kg each day.
    const alone = modelOf({ ...params, otherRemoval: 0 }, 6, 'both')
    for (const mmHg of [2.0, 3.0, 3.9]) {
      const kgEachDay = 6 * 1.04 - (CDRA_RATE.kgPerDayPerMmHg * mmHg - CDRA_RATE.offsetKgPerDay)
      near(rateAt(mmHg, alone), kgEachDay * perKgEachHour, 1e-12)
    }
    // The equation gives 6 kg each day near 3.7 mmHg: the "6 person-equivalents" of the NASA documents.
    near(CDRA_RATE.kgPerDayPerMmHg * 3.7 - CDRA_RATE.offsetKgPerDay, 6, 0.01)
    // One CDRA alone holds 6 persons at about 3.84 mmHg.
    near(alone.balance, (6 * 1.04 + 0.37975) / 1.723, 1e-9)
    near(rateAt(alone.balance, alone), 0, 1e-12)
  })

  it('rises in a straight line when nothing removes CO2', () => {
    const none = modelOf({ ...params, otherRemoval: 0 }, 6, 'off')
    assert.equal(none.removal, 0)
    assert.equal(none.balance, Infinity)
    const perHour = 6 * params.co2PerPersonKgDay * perKgEachHour
    near(none.generation, perHour, 1e-12)
    near(advance(2.3, 5, none), 2.3 + 5 * perHour, 1e-12)
    near(timeTo(2.3, 3.0, none)!, 0.7 / perHour, 1e-9)
    // The value only rises, so it never reaches a lower target.
    assert.equal(timeTo(2.3, 2.0, none), null)
  })

  it('holds 6 persons near the level of the RR-9 record with the default settings', () => {
    const both = modelOf(params, 6, 'both')
    near(both.balance, 2.635, 0.005)
    near(advance(both.balance, 100, both), both.balance, 1e-9)
    // Fewer persons give a lower balance. One bed or no CDRA gives a higher balance.
    assert.ok(modelOf(params, 3, 'both').balance < both.balance)
    assert.ok(modelOf(params, 6, 'one').balance > 3.0)
    assert.ok(modelOf(params, 6, 'off').balance > modelOf(params, 6, 'one').balance)
  })

  it('moves toward the balance and never passes it', () => {
    const one = modelOf(params, 6, 'one')
    let value = 2.3
    for (let step = 0; step < 5000; step++) {
      const next = advance(value, 5 / 60, one)
      assert.ok(next >= value && next <= one.balance)
      value = next
    }
    near(value, one.balance, 0.001)
  })

  it('gives the same result in one step and in many small steps', () => {
    const one = modelOf(params, 6, 'one')
    let value = 2.3
    for (let step = 0; step < 144; step++) value = advance(value, 5 / 60, one)
    near(value, advance(2.3, 12, one), 1e-9)
  })

  it('agrees with a plain numeric solution of the equation', () => {
    for (const [start, cdra] of [[2.3, 'one'], [5, 'both'], [0.05, 'both']] as const) {
      const model = modelOf(params, 4, cdra)
      let value: number = start
      const dt = 1 / 3600
      for (let second = 0; second < 6 * 3600; second++) value += rateAt(value, model) * dt
      near(value, advance(start, 6, model), 1e-3)
    }
  })

  it('finds the time to a limit, and the value at that time is the limit', () => {
    const one = modelOf(params, 6, 'one')
    const hours = timeTo(2.3, 3.0, one)!
    assert.ok(hours > 0)
    near(advance(2.3, hours, one), 3.0, 1e-9)
    // A falling value: 4 persons on both beds, from 4 mmHg down to 3 mmHg.
    const both = modelOf(params, 4, 'both')
    const down = timeTo(4, 3.0, both)!
    near(advance(4, down, both), 3.0, 1e-9)
    // From below the point where the removal starts.
    const low = timeTo(0.1, 1.0, both)!
    near(advance(0.1, low, both), 1.0, 1e-9)
  })

  it('returns null for a limit that the model never reaches', () => {
    const both = modelOf(params, 6, 'both')
    // The balance is near 2.64 mmHg, so 3.0 mmHg is out of reach from below.
    assert.equal(timeTo(2.3, 3.0, both), null)
    // The balance itself takes an endless time.
    assert.equal(timeTo(2.3, both.balance, both), null)
    assert.equal(timeTo(3, 3, both), 0)
  })

  it('is faster with more crew and with less volume', () => {
    const base = timeTo(2.3, 3.0, modelOf(params, 6, 'off'))!
    assert.ok(timeTo(2.3, 3.0, modelOf(params, 7, 'off'))! < base)
    assert.ok(timeTo(2.3, 3.0, modelOf({ ...params, freeVolumeM3: 400 }, 6, 'off'))! < base)
  })

  it('projects one value each 5 minutes, and the first is the value now', () => {
    const one = modelOf(params, 6, 'one')
    const values = project(2.3, 2, one)
    assert.equal(values.length, 25)
    assert.equal(values[0], 2.3)
    near(values[24], advance(2.3, 2, one), 1e-12)
  })
})
