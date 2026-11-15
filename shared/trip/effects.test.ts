// Tests of the effects on the body. Run: npm test
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { BANDS, LIMIT_1H_MMHG, intensity } from '../co2.ts'
import {
  DOSE_BANDS,
  DOSE_LIMITS,
  EFFECT_NOTES,
  EFFECT_REGIONS,
  FIGURE_REGIONS,
  HAZARDS,
  HAZARD_LABEL,
  HAZARD_SAYS,
  HAZARD_SOURCE,
  HYPOXIA_TABLE,
  MEASURE,
  O2_LIMITS,
  ROUGH_WEIGHT,
  bodyEffects,
  doseMatch,
  figureHeat,
  figureHeatOf,
  regionHeatOf,
  strengthOf,
  textOf,
  type BodyEffect,
} from './effects.ts'
import type { Effect, EffectRegion, EffectsInput, Hazard } from './effects-types.ts'
import { cabinO2MmHg, inspiredO2MmHg } from './lifesupport.ts'
import type { DoseUnit } from './types.ts'

const near = (actual: number, expected: number, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`)

type Dose = EffectsInput['dose']
const noDose = (unit: DoseUnit = 'mSv'): Dose => ({ unit, total: null, last30Days: null, lastYear: null, today: null })
const dose = (unit: DoseUnit, part: Partial<Omit<Dose, 'unit'>>): Dose => ({ ...noDose(unit), ...part })

// A cabin with nothing wrong: CO2 below the first band, O2 in the middle of the target range.
const calm = (part: Partial<EffectsInput> = {}): EffectsInput => ({ co2MmHg: 2.0, co2HourMeanMmHg: 2.0, o2MmHg: 150, dose: noDose(), stormNow: false, ...part })

const byId = (effects: BodyEffect[], id: string): BodyEffect => {
  const effect = effects.find((item) => item.id === id)
  assert.ok(effect, `no effect with the id ${id}`)
  return effect
}
const activeIds = (effects: Effect[], hazard?: Hazard) => effects.filter((effect) => effect.intensity > 0 && (!hazard || effect.hazard === hazard)).map((effect) => effect.id)

describe('bodyEffects: the list', () => {
  it('has no active effect for a calm cabin and no dose', () => {
    assert.deepEqual(activeIds(bodyEffects(calm())), [])
    // A dose of zero is also calm.
    assert.deepEqual(activeIds(bodyEffects(calm({ dose: dose('mSv', { total: 0, last30Days: 0, lastYear: 0, today: 0 }) }))), [])
    assert.deepEqual(activeIds(bodyEffects(calm({ dose: dose('mGy', { total: 0, last30Days: 0, lastYear: 0, today: 0 }) }))), [])
  })

  it('gives all effects for each input, in the same order', () => {
    const quiet = bodyEffects(calm()).map((effect) => effect.id)
    const bad = bodyEffects({ co2MmHg: 6, co2HourMeanMmHg: 6, o2MmHg: 90, dose: dose('mGy', { total: 5000, last30Days: 900, lastYear: 3000, today: 800 }), stormNow: true }).map((effect) => effect.id)
    assert.deepEqual(bad, quiet)
    assert.equal(new Set(quiet).size, quiet.length, 'each id occurs one time')
    assert.equal(quiet.length, BANDS.length + 1 + HYPOXIA_TABLE.length + 4 + DOSE_LIMITS.length + DOSE_BANDS.length)
  })

  it('orders the effects by hazard, then by the value where they start', () => {
    const effects = bodyEffects(calm())
    const hazards = effects.map((effect) => effect.hazard)
    assert.deepEqual([...new Set(hazards)], HAZARDS)
    // Each hazard is one block.
    assert.deepEqual(hazards, [...hazards].sort((a, b) => HAZARDS.indexOf(a) - HAZARDS.indexOf(b)))
    for (const hazard of ['co2', 'radiation'] as Hazard[]) {
      const starts = effects.filter((effect) => effect.hazard === hazard).map((effect) => effect.start)
      assert.deepEqual(starts, [...starts].sort((a, b) => a - b), `${hazard} is in the order of the start values`)
    }
  })

  it('gives each effect a source with a URL, a text, and at least one step', () => {
    for (const unit of ['mSv', 'mGy'] as DoseUnit[]) {
      for (const effect of bodyEffects(calm({ dose: dose(unit, { total: 100, last30Days: 20, lastYear: 100, today: 1 }) }))) {
        assert.match(effect.source.url, /^https:\/\/\S+$/, `${effect.id}: source URL`)
        assert.ok(effect.source.short && effect.source.title, `${effect.id}: source names`)
        assert.ok(effect.title && effect.says && effect.measure, `${effect.id}: texts`)
        assert.ok(effect.kind === 'band' || effect.kind === 'limit')
        assert.ok(effect.intensity >= 0 && effect.intensity <= 1, `${effect.id}: intensity ${effect.intensity}`)
        assert.ok(effect.weight > 0 && effect.weight <= 1, `${effect.id}: weight ${effect.weight}`)
        assert.ok(effect.mitigations.length >= 1, `${effect.id}: at least one step`)
        for (const item of effect.mitigations) {
          assert.ok(item.text.endsWith('.'), `${effect.id}: the step is a sentence`)
          // A step names its source, or it is marked as an idea of this app.
          assert.ok(item.source || item.ours === true, `${effect.id}: "${item.text}" has a source or is ours`)
          if (item.source) assert.match(item.source.url, /^https:\/\/\S+$/)
        }
      }
    }
  })

  it('has a label, a text, and a source for each hazard', () => {
    for (const hazard of HAZARDS) {
      assert.ok(HAZARD_LABEL[hazard])
      assert.ok(HAZARD_SAYS[hazard].length > 20)
      assert.match(HAZARD_SOURCE[hazard].url, /^https:\/\//)
    }
  })

  it('has notes only for effects that exist', () => {
    const ids = new Set(bodyEffects(calm()).map((effect) => effect.id))
    for (const [id, notes] of Object.entries(EFFECT_NOTES)) {
      assert.ok(ids.has(id), `the note key ${id} is an effect`)
      for (const note of notes) {
        assert.ok(note.text.endsWith('.'))
        assert.match(note.source.url, /^https:\/\//)
      }
    }
  })
})

describe('bodyEffects: the texts for another language', () => {
  const units: DoseUnit[] = ['mSv', 'mGy']
  const doses: Dose[] = units.flatMap((unit) => [noDose(unit), dose(unit, { total: 0.48, last30Days: 55.2, lastYear: 320, today: 1.84 }), dose(unit, { total: 5000, last30Days: 1500, lastYear: 3000, today: 800 })])
  const inputs: EffectsInput[] = doses.flatMap((value) => [
    calm({ dose: value }),
    { co2MmHg: 3.64, co2HourMeanMmHg: 3.1, o2MmHg: 120.25, dose: value, stormNow: true },
    { co2MmHg: NaN, co2HourMeanMmHg: NaN, o2MmHg: NaN, dose: value, stormNow: false },
  ])
  const all = inputs.flatMap((input) => [...bodyEffects(input), ...bodyEffects(input, { totalPressureMmHg: 527.5 })])

  it('builds "measure" from sentences of the list MEASURE', () => {
    const templates = new Set<string>(Object.values(MEASURE))
    for (const effect of all) {
      assert.ok(effect.measureParts.length >= 1, effect.id)
      assert.equal(effect.measure, effect.measureParts.map(textOf).join(' '), effect.id)
      // Each place of a template has a value.
      assert.ok(!/[{}]/.test(effect.measure), `${effect.id}: ${effect.measure}`)
      for (const part of effect.measureParts) {
        assert.ok(templates.has(part.key), `${effect.id}: "${part.key}" is in MEASURE`)
        const places = [...part.key.matchAll(/\{(\w+)\}/g)].map((match) => match[1])
        assert.deepEqual(Object.keys(part.values ?? {}).sort(), [...places].sort(), `${effect.id}: the values of "${part.key}"`)
      }
    }
    // A sentence of the list that no effect uses is an old sentence.
    const used = new Set(all.flatMap((effect) => effect.measureParts.map((part) => part.key)))
    assert.deepEqual([...templates].filter((key) => !used.has(key)), [])
  })

  it('fills a template with the numbers', () => {
    assert.equal(textOf({ key: MEASURE.co2Now, values: { value: { value: 3, decimals: 1 } } }), 'CO2 now: 3.0 mmHg.')
    assert.equal(textOf({ key: MEASURE.limit, values: { limit: { value: 1500, decimals: 0 }, unit: 'mGy-Eq' } }), 'Limit: 1500 mGy-Eq.')
    assert.equal(textOf({ key: MEASURE.ofLimit, values: { percent: 90 } }), 'This is 90% of the limit.')
    assert.equal(textOf({ key: MEASURE.noData }), 'No data.')
    const effects = bodyEffects({ co2MmHg: 3.64, co2HourMeanMmHg: 2.7, o2MmHg: 150, dose: dose('mSv', { total: 0.48, last30Days: 55.2, lastYear: 320, today: 1.84 }), stormNow: false })
    assert.equal(byId(effects, 'co2_fatigue').measure, 'CO2 now: 3.6 mmHg. The band goes from 2.3 to 2.7 mmHg.')
    assert.equal(byId(effects, 'co2_limit_1h').measure, '1-hour average: 2.7 mmHg. Limit: 3.0 mmHg. This is 90% of the limit.')
    assert.equal(byId(effects, 'o2_low_target').measure, 'Inspired O2 now: 150.0 mmHg. The band goes from 145 mmHg down to 127 mmHg.')
    assert.equal(byId(effects, 'rad_blood').measure, 'Dose of the last 365 days: 320 mSv. Limit for 1 year: 500 mGy-Eq. Rough indicator: the number is 64% of the number of the limit. The quantities differ.')
    assert.equal(byId(effects, 'rad_career').measure, 'Dose of this mission: 0.48 mSv. Limit for a career: 600 mSv. This is 0% of the limit.')
    assert.equal(byId(effects, 'rad_acute_sickness').measure, 'Dose of this mission day: 1.84 mSv. The band goes from 500 to 1000 mGy. Rough indicator: the quantities differ.')
  })

  it('builds "caveat" from fixed texts', () => {
    for (const effect of all) {
      assert.equal(effect.caveat, effect.caveatParts.length ? effect.caveatParts.join(' ') : undefined, effect.id)
      for (const text of effect.caveatParts) assert.ok(text.endsWith('.') && !/\d+\.\d+ m(Sv|Gy)/.test(text), `${effect.id}: "${text}" is a fixed sentence`)
    }
  })

  it('marks each rough comparison, and tells why it is rough', () => {
    const quantity = new Map([...DOSE_LIMITS, ...DOSE_BANDS].map((item) => [item.id, item.quantity]))
    for (const input of inputs) {
      for (const effect of bodyEffects(input)) {
        const kind = quantity.get(effect.id)
        assert.equal(effect.rough, kind !== undefined && doseMatch(input.dose.unit, kind) === 'rough', effect.id)
        // The sentence "Rough indicator" is in the text of a rough comparison only, and it has the mark.
        for (const part of effect.measureParts) assert.equal(part.rough === true, part.key.startsWith('Rough indicator'), `${effect.id}: ${part.key}`)
        if (!effect.rough) {
          assert.deepEqual(effect.roughWhy, [])
          assert.ok(!effect.measure.includes('Rough indicator'), effect.id)
          continue
        }
        assert.ok(effect.roughWhy.length >= 2, `${effect.id} tells the two quantities`)
        for (const text of effect.roughWhy) assert.ok(effect.caveatParts.includes(text), `${effect.id}: "${text}" is a part of the caveat`)
        assert.ok(effect.roughWhy.join(' ').includes('rough indicator only'))
        assert.ok(strengthOf(effect) <= ROUGH_WEIGHT)
      }
    }
  })
})

describe('bodyEffects: CO2', () => {
  it('gives one effect for each band of BANDS, with the same start value, weight, and intensity', () => {
    for (const co2MmHg of [0, 2.0, 2.3, 2.5, 2.85, 3.0, 3.2, 3.5, 4.5, 4.75, 6]) {
      const effects = bodyEffects(calm({ co2MmHg }))
      for (const band of BANDS) {
        const found = effects.filter((effect) => effect.id === `co2_${band.id}`)
        assert.equal(found.length, 1, `one effect for the band ${band.id}`)
        const effect = found[0]
        assert.equal(effect.hazard, 'co2')
        assert.equal(effect.kind, 'band')
        assert.equal(effect.start, band.from)
        assert.equal(effect.weight, band.weight)
        assert.equal(effect.intensity, intensity(co2MmHg, band), `${band.id} at ${co2MmHg} mmHg`)
        assert.equal(effect.region, band.region === 'sleep' ? 'none' : band.region)
        // The text has the numbers of the band.
        assert.ok(effect.says.includes(band.from.toFixed(1)), `${band.id}: "${effect.says}" has the start value`)
        if (band.to !== null && band.id !== 'malaise') assert.ok(effect.says.includes(band.to.toFixed(1)), `${band.id}: "${effect.says}" has the end value`)
      }
    }
  })

  it('uses the CO2 value now for the bands, and the 1-hour average for the limit', () => {
    const effects = bodyEffects(calm({ co2MmHg: 2.5, co2HourMeanMmHg: 3.4 }))
    near(byId(effects, 'co2_fatigue').intensity, 0.5)
    assert.equal(byId(effects, 'co2_headache_ntrs').intensity, 0)
    assert.equal(byId(effects, 'co2_limit_1h').intensity, 1)
  })

  it('switches the limit of the 1-hour average on above the limit only', () => {
    const limit = (mean: number) => byId(bodyEffects(calm({ co2HourMeanMmHg: mean })), 'co2_limit_1h')
    assert.equal(limit(2.9).intensity, 0)
    // "No more than 3 mmHg": the limit value itself is permitted.
    assert.equal(limit(LIMIT_1H_MMHG).intensity, 0)
    assert.equal(limit(3.01).intensity, 1)
    assert.equal(limit(3.01).kind, 'limit')
    assert.equal(limit(3.01).region, 'none')
    assert.ok(limit(2.7).measure.includes('90%'))
  })
})

describe('bodyEffects: O2', () => {
  const o2 = (o2MmHg: number, totalPressureMmHg?: number) => bodyEffects(calm({ o2MmHg }), { totalPressureMmHg })

  it('has no active O2 effect inside the target range', () => {
    for (const value of [O2_LIMITS.targetLow, 150, O2_LIMITS.targetHigh]) assert.deepEqual(activeIds(o2(value), 'o2'), [], `${value} mmHg`)
  })

  it('switches the low effects on below the range', () => {
    assert.deepEqual(activeIds(o2(144), 'o2'), ['o2_low_target'])
    near(byId(o2(136), 'o2_low_target').intensity, 0.5)
    assert.equal(byId(o2(127), 'o2_low_target').intensity, 1)
    assert.equal(byId(o2(127), 'o2_low_limit').intensity, 0)
    near(byId(o2(124.5), 'o2_low_limit').intensity, 0.5)
    assert.equal(byId(o2(122), 'o2_low_limit').intensity, 1)
    assert.equal(byId(o2(100), 'o2_low_limit').intensity, 1)
  })

  it('switches the high effects on above the range', () => {
    assert.deepEqual(activeIds(o2(156), 'o2'), ['o2_high_fire'])
    near(byId(o2((O2_LIMITS.targetHigh + O2_LIMITS.high) / 2), 'o2_high_fire').intensity, 0.5)
    assert.equal(byId(o2(O2_LIMITS.high), 'o2_high_limit').intensity, 0)
    assert.deepEqual(activeIds(o2(400), 'o2'), ['o2_high_fire', 'o2_high_limit'])
    assert.equal(byId(o2(800), 'o2_high_limit').intensity, 1)
    // An effect of the fire risk has no place on the body.
    assert.equal(byId(o2(156), 'o2_high_fire').region, 'none')
  })

  it('compares the table of the handbook with the O2 pressure of the dry cabin gas', () => {
    for (const row of HYPOXIA_TABLE) {
      for (const total of [760, 424]) {
        // A little above and a little below the value of the row, as inspired O2.
        const above = inspiredO2MmHg(row.cabinO2MmHg + 0.5, total)
        const below = inspiredO2MmHg(row.cabinO2MmHg - 0.5, total)
        assert.equal(byId(o2(above, total), row.id).intensity, 0, `${row.id} above ${row.cabinO2MmHg} mmHg at ${total} mmHg`)
        assert.equal(byId(o2(below, total), row.id).intensity, 1, `${row.id} below ${row.cabinO2MmHg} mmHg at ${total} mmHg`)
      }
    }
    // With no total pressure, the app uses 760 mmHg.
    const text = byId(o2(130), 'o2_night_vision').measure
    assert.ok(text.includes(cabinO2MmHg(130, 760).toFixed(1)), text)
    assert.ok(text.includes('760'), text)
  })

  it('pins the numbers of the two sources', () => {
    // NASA-STD-3001 Volume 2 revision F, table 6.2-1.
    assert.deepEqual(O2_LIMITS, { targetLow: 145, targetHigh: 155, mildHypoxia: 127, absoluteLow: 122, high: 356, shortTermHigh: 791 })
    // NASA HIDH revision 1, table 6.2-4.
    assert.deepEqual(HYPOXIA_TABLE.map((row) => row.cabinO2MmHg), [137, 114, 100, 84, 46])
  })
})

describe('bodyEffects: radiation', () => {
  const rad = (value: Dose, stormNow = false) => bodyEffects(calm({ dose: value, stormNow }))

  it('pins the limits of NASA-STD-3001 Volume 1 revision C, table 4.8-1 and [V1 4030]', () => {
    const limits = Object.fromEntries(DOSE_LIMITS.map((limit) => [limit.id, [limit.quantity, limit.limits.last30Days, limit.limits.lastYear, limit.limits.total]]))
    assert.deepEqual(limits, {
      rad_blood: ['organEq', 250, 500, null],
      rad_heart: ['organEq', 250, 500, 1000],
      rad_brain: ['organ', 500, 1000, 1500],
      rad_career: ['effective', null, null, 600],
      rad_lens: ['organEq', 1000, 2000, 4000],
      rad_skin: ['organEq', 1500, 3000, 6000],
    })
  })

  it('gives 0.5 at half of a limit and 1 above it', () => {
    // The career limit, in the unit that fits it best.
    near(byId(rad(dose('mSv', { total: 300 })), 'rad_career').intensity, 0.5)
    assert.equal(byId(rad(dose('mSv', { total: 600 })), 'rad_career').intensity, 1)
    assert.equal(byId(rad(dose('mSv', { total: 2000 })), 'rad_career').intensity, 1)
    // An organ limit in mGy, with the charts in mGy.
    near(byId(rad(dose('mGy', { last30Days: 250 })), 'rad_brain').intensity, 0.5)
    assert.equal(byId(rad(dose('mGy', { last30Days: 501 })), 'rad_brain').intensity, 1)
    // An organ limit in mGy-Eq: a rough comparison, in both units.
    for (const unit of ['mSv', 'mGy'] as DoseUnit[]) {
      near(byId(rad(dose(unit, { last30Days: 125 })), 'rad_blood').intensity, 0.5)
      assert.equal(byId(rad(dose(unit, { last30Days: 300 })), 'rad_blood').intensity, 1)
    }
  })

  it('uses the time window that is worst', () => {
    // 30 days: 100 ÷ 250 = 0.4. 1 year: 400 ÷ 500 = 0.8. Career: 500 ÷ 1000 = 0.5.
    const heart = byId(rad(dose('mSv', { last30Days: 100, lastYear: 400, total: 500 })), 'rad_heart')
    near(heart.intensity, 0.8)
    assert.ok(heart.measure.includes('365 days') && heart.measure.includes('500 mGy-Eq'), heart.measure)
    // The blood-forming organs have no career limit, so the mission total does not count.
    assert.equal(byId(rad(dose('mSv', { total: 5000 })), 'rad_blood').intensity, 0)
    // The career limit uses the mission total only.
    assert.equal(byId(rad(dose('mSv', { last30Days: 5000, lastYear: 5000 })), 'rad_career').intensity, 0)
  })

  it('has no active radiation effect and no error for a dose of null', () => {
    for (const unit of ['mSv', 'mGy'] as DoseUnit[]) {
      for (const stormNow of [false, true]) {
        const effects = rad(noDose(unit), stormNow)
        assert.deepEqual(activeIds(effects, 'radiation'), [])
        for (const effect of effects.filter((item) => item.hazard === 'radiation')) {
          assert.ok(['No data.', 'No solar particle event is active now.'].includes(effect.measure) || effect.measure.startsWith('No comparison.'), `${effect.id}: ${effect.measure}`)
        }
      }
    }
    // A dose that is not a number counts as no data.
    assert.deepEqual(activeIds(rad(dose('mSv', { total: NaN, last30Days: NaN, lastYear: NaN, today: NaN })), 'radiation'), [])
    // One window with data is enough.
    near(byId(rad(dose('mSv', { lastYear: 250 })), 'rad_blood').intensity, 0.5)
  })

  it('follows the rule for the units', () => {
    assert.equal(doseMatch('mSv', 'effective'), 'nearest')
    assert.equal(doseMatch('mGy', 'effective'), 'none')
    assert.equal(doseMatch('mGy', 'organ'), 'nearest')
    assert.equal(doseMatch('mSv', 'organ'), 'rough')
    assert.equal(doseMatch('mSv', 'organEq'), 'rough')
    assert.equal(doseMatch('mGy', 'organEq'), 'rough')
    assert.equal(doseMatch('mGy', 'gamma'), 'nearest')
    assert.equal(doseMatch('mSv', 'gamma'), 'rough')

    const big = { total: 10_000, last30Days: 10_000, lastYear: 10_000, today: 10_000 }
    // An effective dose limit is not compared with an absorbed dose.
    const inGray = rad(dose('mGy', big), true)
    for (const id of ['rad_career', 'rad_event_limit']) {
      assert.equal(byId(inGray, id).intensity, 0)
      assert.ok(byId(inGray, id).measure.startsWith('No comparison.'))
    }
    // A rough comparison gets a part of the weight, so it never shows the full color.
    const inSievert = rad(dose('mSv', big), true)
    for (const limit of DOSE_LIMITS) {
      const full = limit.weight
      const expected = (unit: DoseUnit) => (doseMatch(unit, limit.quantity) === 'rough' ? full * ROUGH_WEIGHT : full)
      near(byId(inSievert, limit.id).weight, expected('mSv'))
      near(byId(inGray, limit.id).weight, expected('mGy'))
    }
    for (const effect of inSievert.filter((item) => item.hazard === 'radiation')) {
      const rough = effect.measure.includes('Rough indicator')
      if (rough) assert.ok(strengthOf(effect) <= ROUGH_WEIGHT, `${effect.id}: a rough comparison is not stronger than ${ROUGH_WEIGHT}`)
    }
    // Each radiation effect tells the quantity of the charts and the quantity of the source.
    for (const effects of [inGray, inSievert]) {
      for (const effect of effects.filter((item) => item.hazard === 'radiation')) {
        assert.ok(effect.caveat && effect.caveat.includes('The charts show'), `${effect.id} has a caveat`)
      }
    }
  })

  it('compares the dose of the mission day with the values of a solar particle event', () => {
    // 0.5 to 1 Gy: 750 mGy is the middle of the band.
    const day = rad(dose('mGy', { today: 750 }), true)
    near(byId(day, 'rad_acute_sickness').intensity, 0.5)
    assert.ok(byId(day, 'rad_acute_sickness').measure.includes('A solar particle event is active now.'))
    assert.equal(byId(day, 'rad_acute_skin').intensity, 0)
    assert.equal(byId(rad(dose('mGy', { today: 4000 })), 'rad_acute_skin').intensity, 1)
    // A day of cosmic rays alone is far below these values.
    assert.deepEqual(activeIds(rad(dose('mGy', { today: 0.5 }))).filter((id) => id.startsWith('rad_acute')), [])
    // The limit for one event: 250 mSv of effective dose. It counts only while an event is active.
    near(byId(rad(dose('mSv', { today: 125 }), true), 'rad_event_limit').intensity, 0.5)
    assert.equal(byId(rad(dose('mSv', { today: 300 }), true), 'rad_event_limit').intensity, 1)
    assert.equal(byId(rad(dose('mSv', { today: 300 }), false), 'rad_event_limit').intensity, 0)
    assert.equal(byId(rad(dose('mSv', { today: 1.84 }), false), 'rad_event_limit').measure, 'No solar particle event is active now.')
    // The heart value of the Human Research Program uses the dose of the mission.
    assert.equal(byId(rad(dose('mGy', { total: 499 })), 'rad_heart_disease').intensity, 0)
    assert.equal(byId(rad(dose('mGy', { total: 500 })), 'rad_heart_disease').intensity, 1)
  })
})

describe('regionHeatOf and figureHeat', () => {
  const SOURCE = { short: 'test', title: 'A value for a test', url: 'https://example.org/' }
  const fake = (region: EffectRegion, hazard: Hazard, value: number, weight = 1): Effect => ({
    id: `${hazard}_${region}_${value}`,
    hazard,
    region,
    title: 'test',
    says: 'test',
    source: SOURCE,
    kind: 'band',
    measure: 'test',
    intensity: value,
    weight,
    mitigations: [],
  })

  it('gives the strongest effect of each region and its hazard', () => {
    const heat = regionHeatOf([fake('eyes', 'co2', 0.5, 0.9), fake('eyes', 'radiation', 1, 0.7), fake('body', 'o2', 0.2), fake('none', 'radiation', 1)])
    assert.deepEqual(Object.keys(heat).sort(), [...EFFECT_REGIONS].sort())
    near(heat.eyes.heat, 0.7)
    assert.equal(heat.eyes.hazard, 'radiation')
    near(heat.body.heat, 0.2)
    assert.equal(heat.body.hazard, 'o2')
    assert.deepEqual(heat.none, { heat: 1, hazard: 'radiation' })
    // The whole-body value is not in the parts here.
    assert.deepEqual(heat.chest, { heat: 0, hazard: null })
    assert.deepEqual(regionHeatOf([]).body, { heat: 0, hazard: null })
  })

  it('is zero for no effects', () => {
    const heat = figureHeat([])
    assert.deepEqual(Object.keys(heat).sort(), [...FIGURE_REGIONS].sort())
    for (const region of FIGURE_REGIONS) assert.equal(heat[region], 0)
  })

  it('counts the whole-body value for each of the five parts', () => {
    const heat = figureHeat([fake('body', 'radiation', 0.4), fake('chest', 'radiation', 0.9), fake('legs', 'co2', 0.1)])
    for (const part of ['head', 'abdomen', 'arms', 'legs'] as const) near(heat[part], 0.4)
    near(heat.chest, 0.9)
    // An effect with no place on the body gives no color.
    assert.deepEqual(figureHeat([fake('none', 'radiation', 1)]), figureHeat([]))
  })

  it('keeps a small region that is active at least as warm as the part below it', () => {
    // The eyes have a weak effect of their own, and the whole body is warmer.
    const heat = figureHeat([fake('body', 'co2', 0.6), fake('eyes', 'radiation', 0.2), fake('airway', 'co2', 0.1), fake('chest', 'radiation', 0.8)])
    near(heat.head, 0.6)
    near(heat.eyes, 0.6)
    near(heat.airway, 0.8)
    // A small region with no effect of its own stays off, also when the part below it is warm.
    assert.equal(heat.brain, 0)
    assert.equal(heat.face, 0)
    // A small region that is warmer than its part keeps its own value.
    near(figureHeat([fake('body', 'co2', 0.3), fake('brain', 'o2', 0.9)]).brain, 0.9)
    // The hazard is the hazard of the effect that gives the value.
    const detail = figureHeatOf([fake('body', 'co2', 0.6), fake('eyes', 'radiation', 0.2)])
    assert.deepEqual(detail.eyes, { heat: 0.6, hazard: 'co2' })
    assert.deepEqual(detail.brain, { heat: 0, hazard: null })
  })

  it('follows the rule for the real effects', () => {
    const inputs: EffectsInput[] = [
      calm({ co2MmHg: 3.6, co2HourMeanMmHg: 3.6 }),
      calm({ o2MmHg: 105 }),
      calm({ dose: dose('mSv', { total: 900, last30Days: 60, lastYear: 600, today: 2 }) }),
      { co2MmHg: 5, co2HourMeanMmHg: 5, o2MmHg: 120, dose: dose('mGy', { total: 700, last30Days: 600, lastYear: 700, today: 600 }), stormNow: true },
    ]
    for (const input of inputs) {
      const effects = bodyEffects(input)
      const own = regionHeatOf(effects)
      const heat = figureHeat(effects)
      for (const region of FIGURE_REGIONS) assert.ok(heat[region] >= 0 && heat[region] <= 1)
      for (const part of ['head', 'chest', 'abdomen', 'arms', 'legs'] as const) near(heat[part], Math.max(own[part].heat, own.body.heat))
      for (const [small, part] of [['brain', 'head'], ['eyes', 'head'], ['face', 'head'], ['airway', 'chest']] as const) {
        if (own[small].heat > 0) assert.ok(heat[small] >= heat[part], `${small} is not cooler than ${part}`)
        else assert.equal(heat[small], 0)
      }
    }
  })
})
