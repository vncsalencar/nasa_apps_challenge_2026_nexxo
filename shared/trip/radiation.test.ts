// Tests of the radiation math. Run: npm test
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { defaultTrip } from './defaults.ts'
import { PRESETS } from './presets/index.ts'
import { CAREER_LIMIT, compareDose, doseAt, doseSeries, seriesUnits, type RealDose } from './radiation.ts'
import { missionDays, rateIn, timeline, type TripOptions } from './timeline.ts'
import type { DoseUnit, Phase, PhaseKind, Preset, Rate, SourceRef, Storm } from './types.ts'

const near = (actual: number | null, expected: number, tolerance = 1e-9) =>
  assert.ok(actual !== null && Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`)

// Small presets for the tests. The numbers are test values, not measurements.
const SOURCE: SourceRef = { short: 'test', title: 'A value for a test', url: '' }
const rate = (value: number | null, unit: DoseUnit = 'mSv', other?: Rate['other']): Rate => ({
  value,
  unit,
  instrument: 'test',
  shielding: '',
  solar: '',
  says: '',
  source: SOURCE,
  badge: 'real-rate',
  other,
})
const phase = (id: string, kind: PhaseKind, days: number, phaseRate: Rate): Phase => ({ id, label: id, kind, days, rate: phaseRate })
const mission = (phases: Phase[], extra: Partial<Preset> = {}): Preset => ({
  id: 'msl',
  name: 'Test mission',
  summary: '',
  badge: 'modelled',
  destination: 'mars',
  frame: 'sun',
  trajectory: { file: null, source: SOURCE, note: '', badge: 'modelled' },
  phases,
  crew: 4,
  cabin: { name: 'test', freeVolumeM3: 100, assumption: 'A value for a test.' },
  flags: [],
  sources: [],
  ...extra,
})
const options = (extra: Partial<TripOptions> = {}): TripOptions => ({
  solar: 'max',
  doseUnit: 'mSv',
  surfaceDays: 0,
  returnTrip: true,
  customDays: 100,
  customRate: 1,
  customUnit: 'mSv',
  ...extra,
})
const cruise = (days: number, value: number | null, unit: DoseUnit = 'mSv') => mission([phase('cruise', 'cruise', days, rate(value, unit))])
const lastTotal = (series: { points: { total: number | null }[] }) => series.points[series.points.length - 1].total

describe('doseSeries: the total of the phase rates', () => {
  it('gives rate × days for a constant rate', () => {
    const series = doseSeries(cruise(10, 1.84), options(), [])
    assert.equal(series.unit, 'mSv')
    assert.equal(series.points.length, 11)
    assert.deepEqual(series.points[0], { day: 0, rate: 1.84, total: 0, phaseId: 'cruise' })
    assert.deepEqual(
      series.points.map((point) => point.day),
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    )
    near(series.points[1].total, 1.84)
    near(lastTotal(series), 18.4)
    assert.equal(series.incomplete, false)
    assert.equal(series.limitDay, null)
    assert.equal(series.rates.length, 1)
    assert.equal(series.rates[0].rate.value, 1.84)
  })

  it('keeps the rate of a phase flat', () => {
    const series = doseSeries(cruise(253, 1.84), options(), [])
    assert.ok(series.points.every((point) => point.rate === 1.84))
    near(lastTotal(series), 1.84 * 253)
  })

  it('adds two phases', () => {
    const preset = mission([phase('cruise', 'cruise', 3, rate(2)), phase('surface', 'surface', 4, rate(0.5))])
    const series = doseSeries(preset, options(), [])
    near(series.points[3].total, 6)
    near(lastTotal(series), 8)
    assert.equal(series.points[3].phaseId, 'cruise')
    assert.equal(series.points[4].phaseId, 'surface')
    assert.equal(series.points[4].rate, 0.5)
    assert.deepEqual(
      series.rates.map((item) => [item.span.phase.id, item.span.fromDay, item.span.toDay]),
      [
        ['cruise', 0, 3],
        ['surface', 3, 7],
      ],
    )
  })

  it('weights a day by the part of each phase in it, at the start and at the end', () => {
    const preset = mission([phase('belts', 'belts', 0.2, rate(10)), phase('cruise', 'cruise', 5, rate(1)), phase('return', 'return', 0.3, rate(2))])
    const series = doseSeries(preset, options(), [])
    assert.deepEqual(
      series.points.map((point) => point.day),
      [0, 1, 2, 3, 4, 5, 5.5],
    )
    // Day 1: 0.2 days in the belts and 0.8 days of cruise.
    near(series.points[1].rate, 2.8)
    assert.equal(series.points[1].phaseId, 'cruise')
    near(series.points[2].rate, 1)
    // The last half day: 0.2 days of cruise and 0.3 days of return. The rate is for a whole day.
    near(series.points[6].rate, 0.8 / 0.5)
    assert.equal(series.points[6].phaseId, 'return')
    near(lastTotal(series), 0.2 * 10 + 5 * 1 + 0.3 * 2)
  })

  it('works for a mission that is shorter than one day', () => {
    const series = doseSeries(mission([phase('belts', 'belts', 0.2, rate(10))]), options(), [])
    assert.deepEqual(
      series.points.map((point) => point.day),
      [0, 0.2],
    )
    near(lastTotal(series), 2)
    near(series.points[1].rate, 10)
  })

  it('does not add a point for a rounding error in the sum of the phase lengths', () => {
    const preset = mission([phase('belts', 'belts', 0.1, rate(1)), phase('cruise', 'cruise', 0.2, rate(1)), phase('orbit', 'orbit', 0.7, rate(1))])
    const series = doseSeries(preset, options(), [])
    assert.deepEqual(
      series.points.map((point) => point.day),
      [0, 1],
    )
    near(lastTotal(series), 1)
  })

  it('follows the settings of the simulator: surface stay, return flight, solar cycle', () => {
    const preset = mission(
      [phase('cruise', 'cruise', 10, rate(1)), phase('surface', 'surface', 5, rate(0.5)), phase('return', 'return', 10, rate(1))],
      { surfaceStay: { phaseId: 'surface', defaultDays: 5, minDays: 0, maxDays: 600 }, returnTrip: { phaseId: 'return' }, solar: { max: rate(2), declining: rate(3) } },
    )
    near(lastTotal(doseSeries(preset, options({ surfaceDays: 20 }), [])), 10 * 2 + 20 * 0.5 + 10 * 2)
    near(lastTotal(doseSeries(preset, options({ surfaceDays: 20, returnTrip: false, solar: 'declining' }), [])), 10 * 3 + 20 * 0.5)
  })

  it('gives one point for a mission with no phase', () => {
    const series = doseSeries(mission([]), options(), [{ day: 0, dose: 5, hours: 2 }])
    assert.deepEqual(series.points, [{ day: 0, rate: null, total: 0, phaseId: '' }])
    assert.equal(series.limitDay, null)
    assert.deepEqual(doseAt(series, 3), { rate: null, total: 0, phaseId: '' })
  })
})

describe('doseSeries: no data and units', () => {
  it('makes the total null from the first day with no data on', () => {
    const preset = mission([phase('cruise', 'cruise', 2, rate(1)), phase('surface', 'surface', 2, rate(null)), phase('return', 'return', 2, rate(1))])
    const series = doseSeries(preset, options(), [])
    assert.deepEqual(
      series.points.map((point) => point.rate),
      [1, 1, 1, null, null, 1, 1],
    )
    assert.deepEqual(
      series.points.map((point) => point.total),
      [0, 1, 2, null, null, null, null],
    )
    assert.equal(series.incomplete, true)
    assert.equal(series.limitDay, null)
  })

  it('gives no data to a day that has a part with no data', () => {
    const preset = mission([phase('belts', 'belts', 0.2, rate(null)), phase('cruise', 'cruise', 2.8, rate(1))])
    const series = doseSeries(preset, options(), [])
    assert.deepEqual(
      series.points.map((point) => point.rate),
      [null, null, 1, 1],
    )
    assert.deepEqual(
      series.points.map((point) => point.total),
      [0, null, null, null],
    )
    assert.equal(series.incomplete, true)
  })

  it('never converts between mGy and mSv', () => {
    const preset = cruise(5, 0.5, 'mGy')
    const inSv = doseSeries(preset, options({ doseUnit: 'mSv' }), [])
    assert.equal(inSv.unit, 'mSv')
    assert.ok(inSv.points.every((point) => point.rate === null))
    assert.equal(lastTotal(inSv), null)
    assert.equal(inSv.incomplete, true)
    const inGy = doseSeries(preset, options({ doseUnit: 'mGy' }), [])
    near(lastTotal(inGy), 2.5)
    assert.equal(inGy.incomplete, false)
  })

  it('uses the other quantity of the source if the source gives it', () => {
    const preset = mission([phase('cruise', 'cruise', 10, rate(1.84, 'mSv', { value: 0.48, unit: 'mGy', says: '' }))])
    near(lastTotal(doseSeries(preset, options({ doseUnit: 'mSv' }), [])), 18.4)
    near(lastTotal(doseSeries(preset, options({ doseUnit: 'mGy' }), [])), 4.8)
  })

  it('uses the rate and the unit of the simulator for the custom preset', () => {
    const preset = mission([phase('cruise', 'cruise', 200, rate(null))], { id: 'custom' })
    const custom = options({ customDays: 30, customRate: 2, customUnit: 'mGy', doseUnit: 'mGy' })
    near(lastTotal(doseSeries(preset, custom, [])), 60)
    assert.equal(lastTotal(doseSeries(preset, { ...custom, doseUnit: 'mSv' }, [])), null)
  })
})

describe('doseSeries: storms', () => {
  const preset = cruise(10, 1)
  const total = (storms: Storm[]) => lastTotal(doseSeries(preset, options(), storms))

  it('adds exactly the dose of a storm inside one day', () => {
    const series = doseSeries(preset, options(), [{ day: 2.25, dose: 50, hours: 6 }])
    near(lastTotal(series), 60)
    near(series.points[3].rate, 51)
    near(series.points[2].rate, 1)
    near(series.points[4].rate, 1)
    assert.deepEqual(series.storms, [{ day: 2.25, dose: 50, hours: 6 }])
  })

  it('spreads a storm that crosses midnight evenly over its hours', () => {
    const series = doseSeries(preset, options(), [{ day: 2.75, dose: 50, hours: 12 }])
    near(series.points[3].rate, 1 + 25)
    near(series.points[4].rate, 1 + 25)
    near(lastTotal(series), 60)
  })

  it('spreads a long storm over some days', () => {
    const series = doseSeries(preset, options(), [{ day: 1.5, dose: 120, hours: 60 }])
    near(series.points[2].rate, 1 + 24)
    near(series.points[3].rate, 1 + 48)
    near(series.points[4].rate, 1 + 48)
    near(lastTotal(series), 130)
  })

  it('does not count the part of a storm after the end of the mission', () => {
    near(total([{ day: 9.5, dose: 50, hours: 24 }]), 10 + 25)
    near(total([{ day: 10, dose: 50, hours: 6 }]), 10)
    near(total([{ day: 12, dose: 50, hours: 6 }]), 10)
  })

  it('counts a storm in the last part of a mission that ends inside a day', () => {
    const series = doseSeries(cruise(2.5, 1), options(), [{ day: 2.25, dose: 40, hours: 12 }])
    // Half of the storm is before the end at day 2.5.
    near(lastTotal(series), 2.5 + 20)
  })

  it('adds two storms', () => {
    near(
      total([
        { day: 1, dose: 30, hours: 6 },
        { day: 1.1, dose: 20, hours: 48 },
      ]),
      60,
    )
  })

  it('puts a storm with no length at one moment', () => {
    const series = doseSeries(preset, options(), [{ day: 3.5, dose: 50, hours: 0 }])
    near(series.points[4].rate, 51)
    near(lastTotal(series), 60)
  })

  it('ignores a storm with a value that is not a number', () => {
    near(total([{ day: Number.NaN, dose: 50, hours: 6 }]), 10)
    near(total([{ day: 2, dose: Number.NaN, hours: 6 }]), 10)
    near(total([{ day: 2, dose: 50, hours: Number.NaN }]), 10)
  })

  it('does not make a value for a day with no data', () => {
    const series = doseSeries(cruise(5, null), options(), [{ day: 2.25, dose: 50, hours: 6 }])
    assert.ok(series.points.every((point) => point.rate === null))
    assert.equal(lastTotal(series), null)
  })
})

describe('doseSeries: the career limit', () => {
  it('reads the limit of NASA from limits.ts', () => {
    // If the research work changes the limit, change the expected days of the next tests too.
    assert.equal(CAREER_LIMIT.mSv, 600)
  })

  it('finds the day when the total passes the limit: 600 mSv at 1.84 mSv for each day', () => {
    const series = doseSeries(cruise(400, 1.84), options(), [])
    near(series.limitDay, CAREER_LIMIT.mSv / 1.84, 1e-6)
    assert.equal(series.limitDay?.toFixed(2), '326.09')
  })

  it('is null if the mission ends before the limit', () => {
    assert.equal(doseSeries(cruise(300, 1.84), options(), []).limitDay, null)
  })

  it('is null for a series in mGy', () => {
    const series = doseSeries(cruise(4000, 1.84, 'mGy'), options({ doseUnit: 'mGy' }), [])
    near(lastTotal(series), 7360, 1e-6)
    assert.equal(series.limitDay, null)
  })

  it('is null if a day with no data comes before the limit', () => {
    const preset = mission([phase('cruise', 'cruise', 100, rate(1)), phase('surface', 'surface', 1, rate(null)), phase('return', 'return', 900, rate(1))])
    assert.equal(doseSeries(preset, options(), []).limitDay, null)
  })

  it('puts the limit inside the hours of a storm, not before the storm', () => {
    // At day 50.5 the total is 50.5 mSv. The storm then adds 2000 mSv for each day.
    const series = doseSeries(cruise(100, 1), options(), [{ day: 50.5, dose: 1000, hours: 12 }])
    near(series.limitDay, 50.5 + (CAREER_LIMIT.mSv - 50.5) / 2001, 1e-9)
  })

  it('puts the limit at the moment of a storm with no length', () => {
    const series = doseSeries(cruise(100, 1), options(), [{ day: 20.25, dose: 1000, hours: 0 }])
    assert.equal(series.limitDay, 20.25)
  })

  it('finds the limit after a change of phase inside a day', () => {
    // 0.5 days at 1000 mSv for each day give 500 mSv. Then 400 mSv for each day: 0.25 days more.
    const preset = mission([phase('belts', 'belts', 0.5, rate(1000)), phase('cruise', 'cruise', 5, rate(400))])
    near(doseSeries(preset, options(), []).limitDay, 0.75)
  })
})

describe('doseSeries: a measured series', () => {
  const preset = cruise(5, 1)
  const rates = (real: RealDose) => doseSeries(preset, options(), [], real).points.slice(1).map((point) => point.rate)

  it('uses the phase rate after the end of a series with no loop', () => {
    const real: RealDose = { unit: 'mSv', daily: [2, 3], loop: false }
    assert.deepEqual(rates(real), [2, 3, 1, 1, 1])
    near(lastTotal(doseSeries(preset, options(), [], real)), 8)
  })

  it('starts a series with a loop again after its end', () => {
    const real: RealDose = { unit: 'mSv', daily: [2, 3], loop: true }
    assert.deepEqual(rates(real), [2, 3, 2, 3, 2])
    near(lastTotal(doseSeries(preset, options(), [], real)), 12)
  })

  it('ignores a series in the other unit', () => {
    assert.deepEqual(rates({ unit: 'mGy', daily: [2, 3], loop: true }), [1, 1, 1, 1, 1])
  })

  it('ignores an empty series', () => {
    assert.deepEqual(rates({ unit: 'mSv', daily: [], loop: true }), [1, 1, 1, 1, 1])
  })

  it('gives data to a phase that has no rate', () => {
    const series = doseSeries(cruise(4, null), options(), [], { unit: 'mSv', daily: [0.5], loop: true })
    near(lastTotal(series), 2)
    assert.equal(series.incomplete, false)
    const short = doseSeries(cruise(4, null), options(), [], { unit: 'mSv', daily: [0.5, 0.5], loop: false })
    assert.deepEqual(
      short.points.map((point) => point.total),
      [0, 0.5, 1, null, null],
    )
    assert.equal(short.incomplete, true)
  })

  it('uses a part of the measured value for a last day that is not whole', () => {
    const series = doseSeries(cruise(2.5, 1), options(), [], { unit: 'mSv', daily: [2, 4, 6], loop: false })
    near(lastTotal(series), 2 + 4 + 3)
    near(series.points[3].rate, 6)
  })

  it('adds a storm to the measured values', () => {
    const series = doseSeries(preset, options(), [{ day: 0.5, dose: 10, hours: 6 }], { unit: 'mSv', daily: [2, 3], loop: true })
    near(series.points[1].rate, 12)
    near(lastTotal(series), 22)
  })
})

describe('doseAt', () => {
  const series = doseSeries(mission([phase('belts', 'belts', 0.2, rate(10)), phase('cruise', 'cruise', 9.8, rate(2))]), options(), [])

  it('interpolates the total between two days', () => {
    // Day 1 has 0.2 × 10 + 0.8 × 2 = 3.6 mSv. Each next day has 2 mSv.
    const at = doseAt(series, 2.5)
    near(at.total, 3.6 + 2 + 1)
    assert.equal(at.rate, 2)
    assert.equal(at.phaseId, 'cruise')
    near(doseAt(series, 0.5).total, 1.8)
    near(doseAt(series, 0.5).rate, 3.6)
  })

  it('gives the total of a point at a whole day', () => {
    near(doseAt(series, 3).total, 3.6 + 4)
    assert.equal(doseAt(series, 0).total, 0)
    near(doseAt(series, 10).total, 3.6 + 18)
  })

  it('gives the phase at the moment of the cursor', () => {
    assert.equal(doseAt(series, 0.1).phaseId, 'belts')
    assert.equal(doseAt(series, 0.2).phaseId, 'cruise')
    assert.equal(doseAt(series, 10).phaseId, 'cruise')
  })

  it('keeps the cursor inside the mission', () => {
    assert.deepEqual(doseAt(series, -4), doseAt(series, 0))
    assert.deepEqual(doseAt(series, 99), doseAt(series, 10))
    assert.deepEqual(doseAt(series, Number.NaN), doseAt(series, 0))
  })

  it('gives no total inside and after a day with no data', () => {
    const preset = mission([phase('cruise', 'cruise', 2, rate(1)), phase('surface', 'surface', 2, rate(null)), phase('return', 'return', 2, rate(1))])
    const gap = doseSeries(preset, options(), [])
    assert.deepEqual(doseAt(gap, 1.5), { rate: 1, total: 1.5, phaseId: 'cruise' })
    assert.deepEqual(doseAt(gap, 2), { rate: null, total: 2, phaseId: 'surface' })
    assert.deepEqual(doseAt(gap, 2.5), { rate: null, total: null, phaseId: 'surface' })
    assert.deepEqual(doseAt(gap, 5.5), { rate: 1, total: null, phaseId: 'return' })
  })

  it('interpolates inside a last day that is not whole', () => {
    const short = doseSeries(cruise(2.5, 4), options(), [])
    near(doseAt(short, 2.25).total, 9)
    near(doseAt(short, 2.5).total, 10)
  })
})

describe('seriesUnits', () => {
  const both = rate(1.84, 'mSv', { value: 0.48, unit: 'mGy', says: '' })

  it('lists the units in which each phase has a value, the main unit first', () => {
    assert.deepEqual(seriesUnits(mission([phase('cruise', 'cruise', 10, both)]), options()), ['mSv', 'mGy'])
    const gray = rate(0.48, 'mGy', { value: 1.84, unit: 'mSv', says: '' })
    assert.deepEqual(seriesUnits(mission([phase('cruise', 'cruise', 10, gray)]), options()), ['mGy', 'mSv'])
  })

  it('leaves out a unit that one phase does not have', () => {
    const preset = mission([phase('cruise', 'cruise', 10, both), phase('surface', 'surface', 10, rate(0.2, 'mGy'))])
    assert.deepEqual(seriesUnits(preset, options()), ['mGy'])
  })

  it('lists the units of some phases if no unit covers the whole mission, the most days first', () => {
    const preset = mission([phase('cruise', 'cruise', 10, rate(1, 'mSv')), phase('surface', 'surface', 30, rate(0.2, 'mGy')), phase('return', 'return', 5, rate(null, 'mSv'))])
    assert.deepEqual(seriesUnits(preset, options()), ['mGy', 'mSv'])
  })

  it('is empty for a mission with no values', () => {
    assert.deepEqual(seriesUnits(cruise(10, null), options()), [])
  })

  it('uses the phases of the timeline', () => {
    // With no return flight, the phase with no value in mSv is not in the mission.
    const preset = mission([phase('cruise', 'cruise', 10, both), phase('return', 'return', 10, rate(0.5, 'mGy'))], { returnTrip: { phaseId: 'return' } })
    assert.deepEqual(seriesUnits(preset, options()), ['mGy'])
    assert.deepEqual(seriesUnits(preset, options({ returnTrip: false })), ['mSv', 'mGy'])
  })
})

describe('compareDose', () => {
  const item = (name: string, preset: Preset, unit: DoseUnit) => ({ preset: { ...preset, name }, series: doseSeries(preset, options({ doseUnit: unit }), []) })
  const sievert = item('sievert', cruise(10, 1, 'mSv'), 'mSv')
  const gray = item('gray', cruise(10, 1, 'mGy'), 'mGy')
  const empty = item('empty', cruise(10, null), 'mSv')
  const lateGap = item('late gap', mission([phase('cruise', 'cruise', 5, rate(1)), phase('surface', 'surface', 5, rate(null))]), 'mSv')
  const earlyGap = item('early gap', mission([phase('belts', 'belts', 0.2, rate(null)), phase('cruise', 'cruise', 5, rate(1))]), 'mSv')

  it('shows only the series in the unit of the chart', () => {
    const result = compareDose([sievert, gray, empty, lateGap, earlyGap], 'mSv')
    assert.deepEqual(
      result.shown.map((shown) => shown.preset.name),
      ['sievert', 'late gap'],
    )
    assert.deepEqual(
      result.hidden.map((hidden) => [hidden.preset.name, hidden.reason]),
      [
        ['gray', 'The values of this mission are in mGy (absorbed dose). This chart shows mSv (dose equivalent).'],
        ['empty', 'This mission has no values in mSv (dose equivalent).'],
        ['early gap', 'The first days of this mission have no value in mSv (dose equivalent), so the chart cannot show a total.'],
      ],
    )
  })

  it('hides the mSv series on a chart in mGy', () => {
    const result = compareDose([sievert, gray], 'mGy')
    assert.deepEqual(result.shown, [gray])
    assert.equal(result.hidden.length, 1)
    assert.equal(result.hidden[0].preset.name, 'sievert')
    assert.equal(result.hidden[0].reason, 'The values of this mission are in mSv (dose equivalent). This chart shows mGy (absorbed dose).')
  })
})

describe('the real presets', () => {
  const storms: Storm[] = [
    { day: 0.5, dose: 100, hours: 30 },
    { day: 3, dose: 20, hours: 1 },
  ]
  const units: DoseUnit[] = ['mSv', 'mGy']

  for (const preset of PRESETS) {
    it(`makes a series for "${preset.id}" in each unit`, () => {
      const trip = defaultTrip(preset)
      const offered = seriesUnits(preset, trip)
      assert.ok(offered.every((unit) => units.includes(unit)))
      const items = units.map((unit) => {
        const tripOptions = { ...trip, doseUnit: unit }
        const spans = timeline(preset, tripOptions)
        const length = missionDays(spans)
        const whole = spans.every((span) => rateIn(span.phase.rate, unit) !== null)
        for (const real of [undefined, { unit, daily: [0.3, 0.4, 0.5], loop: true }, { unit, daily: [0.3], loop: false }]) {
          const series = doseSeries(preset, tripOptions, storms, real)
          assert.equal(series.unit, unit)
          assert.deepEqual(series.points[0].total, 0)
          near(series.points[series.points.length - 1].day, length)
          assert.equal(series.points.length, Math.ceil(length - 1e-9) + 1)
          assert.equal(
            series.incomplete,
            series.points.some((point) => point.rate === null),
          )
          if (unit === 'mGy') assert.equal(series.limitDay, null)
          // The total never goes down, and it stays null after the first day with no data.
          for (let i = 1; i < series.points.length; i++) {
            const before = series.points[i - 1].total
            const now = series.points[i].total
            if (before === null) assert.equal(now, null)
            else if (now !== null) assert.ok(now >= before)
          }
          for (const day of [0, 0.5, length / 2, length, length + 1]) {
            const at = doseAt(series, day)
            assert.ok(at.total === null || Number.isFinite(at.total))
            assert.ok(preset.phases.some((item) => item.id === at.phaseId))
          }
          // The total is complete if each phase has a value in the unit, or if a measured series fills each day.
          if (!real) assert.equal(series.incomplete, !whole)
          if (real?.loop) assert.equal(series.incomplete, false)
          if (!series.incomplete) assert.ok(Number.isFinite(series.points[series.points.length - 1].total))
        }
        // A unit that covers the whole mission is in the list for the page.
        if (whole) assert.ok(offered.includes(unit))
        return { preset, series: doseSeries(preset, tripOptions, []) }
      })
      for (const unit of units) {
        const result = compareDose(items, unit)
        assert.equal(result.shown.length + result.hidden.length, items.length)
        assert.ok(result.hidden.every((hidden) => hidden.reason.length > 0))
        assert.ok(result.shown.every((shown) => shown.series.unit === unit))
      }
    })
  }
})
