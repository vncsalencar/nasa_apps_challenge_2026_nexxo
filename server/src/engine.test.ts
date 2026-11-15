// Tests of the simulator engine. Run: npm test
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { DEFAULT_PARAMS, HISTORY_STEPS, advance, mmHgToPpm, modelOf, ppmToMmHg, rollingMean } from '../../shared/co2.ts'
import { SOURCE, createEngine, type Message } from './engine.ts'
import { loadRecord, type CabinRecord } from './record.ts'

// A short record for the tests: the value is the number of the step.
const length = HISTORY_STEPS + 500
const fake: CabinRecord = {
  source: { name: 'test', url: '', credit: '', mission: 'TEST', field: 'co2_iss', unit: 'ppm', retrievedAt: '' },
  milestones: {},
  startMs: Date.UTC(2017, 7, 18),
  yearShift: 0,
  ppm: Array.from({ length }, (_, index) => 2000 + index),
  hourly: [],
}
const full = (message: Message | { error: string }) => {
  assert.ok('type' in message && message.type === 'full', 'expected all values')
  return message
}

describe('replay of the real record', () => {
  it('starts 7 days into the record, with 7 days of real values', () => {
    const start = createEngine(fake).full()
    assert.equal(start.type, 'full')
    assert.equal(start.state.mode, 'replay')
    assert.equal(start.ppm.length, HISTORY_STEPS)
    assert.equal(start.ppm.at(-1), fake.ppm[HISTORY_STEPS])
    assert.ok(start.src.every((source) => source === SOURCE.record))
  })

  it('gives the next real values as the clock runs', () => {
    const engine = createEngine(fake)
    engine.control({ speed: 1 })
    const message = engine.tick(3)
    assert.ok(message?.type === 'tick')
    assert.deepEqual(message.ppm, [fake.ppm[HISTORY_STEPS + 1], fake.ppm[HISTORY_STEPS + 2], fake.ppm[HISTORY_STEPS + 3]])
    assert.deepEqual(message.src, [SOURCE.record, SOURCE.record, SOURCE.record])
    assert.equal(message.state.timeMs, fake.startMs + (HISTORY_STEPS + 3) * 5 * 60_000)
  })

  it('moves one step each 3 seconds at the slowest speed', () => {
    const engine = createEngine(fake)
    assert.equal(engine.tick(1), null)
    assert.equal(engine.tick(1), null)
    assert.equal(engine.tick(1)?.type, 'tick')
  })

  it('stops when paused', () => {
    const engine = createEngine(fake)
    engine.control({ playing: false, speed: 72 })
    assert.equal(engine.tick(10), null)
  })

  it('starts the record again after its end', () => {
    const engine = createEngine(fake)
    full(engine.control({ seek: length - 2 }))
    engine.control({ speed: 1 })
    assert.equal(engine.tick(1)?.type, 'tick')
    const again = full(engine.tick(1)!)
    assert.deepEqual(again.ppm, [fake.ppm[0]])
    assert.equal(again.state.timeMs, fake.startMs)
  })

  it('jumps to a step and loads the real values before it', () => {
    const engine = createEngine(fake)
    const message = full(engine.control({ seek: 100 }))
    assert.equal(message.ppm.length, 101)
    assert.equal(message.ppm.at(-1), fake.ppm[100])
  })
})

describe('simulated mode', () => {
  it('moves the value with the cabin model', () => {
    const engine = createEngine(fake)
    engine.control({ speed: 12, ppm: 3000, crew: 6, cdra: 'off' })
    const message = engine.tick(1)
    assert.ok(message?.type === 'tick')
    assert.equal(message.ppm.length, 12)
    assert.ok(message.src.every((source) => source === SOURCE.model))
    // 12 steps are 1 hour.
    const expected = mmHgToPpm(advance(ppmToMmHg(3000), 1, modelOf(DEFAULT_PARAMS, 6, 'off')))
    assert.ok(Math.abs(message.ppm.at(-1)! - expected) < 0.06, `${message.ppm.at(-1)} is not ${expected}`)
    assert.ok(message.ppm.at(-1)! > 3000)
  })

  it('falls with a small crew on both beds', () => {
    const engine = createEngine(fake)
    engine.control({ speed: 72, ppm: 5000, crew: 1, cdra: 'both' })
    const message = engine.tick(1)
    assert.ok(message?.type === 'tick' && message.ppm.at(-1)! < 5000)
  })

  it('takes a value from the presenter and marks it', () => {
    const engine = createEngine(fake)
    const message = engine.control({ ppm: 5200 })
    assert.ok('type' in message && message.type === 'last')
    assert.equal(message.ppm, 5200)
    assert.equal(message.src, SOURCE.manual)
    assert.equal(message.state.mode, 'simulated')
    const bumped = engine.control({ bump: -200 })
    assert.ok('type' in bumped && bumped.type === 'last' && bumped.ppm === 5000)
  })

  it('fills the last 24 hours with the current value', () => {
    const engine = createEngine(fake)
    engine.control({ ppm: 4000 })
    const message = full(engine.control({ hold: 24 }))
    assert.equal(message.ppm.length, HISTORY_STEPS)
    assert.equal(rollingMean(message.ppm, 288)!.mean, 4000)
    assert.ok(rollingMean(message.ppm, HISTORY_STEPS)!.mean < 4000)
    assert.equal(message.src.at(-288), SOURCE.manual)
    assert.equal(message.src.at(-289), SOURCE.record)
  })

  it('shows real values only after a change back to replay', () => {
    const engine = createEngine(fake)
    engine.control({ ppm: 9000, hold: 168 })
    const message = full(engine.control({ mode: 'replay' }))
    assert.ok(message.src.every((source) => source === SOURCE.record))
    assert.equal(message.ppm.at(-1), fake.ppm[HISTORY_STEPS])
  })
})

describe('checks of the input', () => {
  it('keeps each setting inside its limits', () => {
    const engine = createEngine(fake)
    const message = engine.control({ crew: 99, ppm: 1, params: { freeVolumeM3: 1 } })
    assert.ok('state' in message)
    assert.equal(message.state.crew, 7)
    assert.equal(message.state.params.freeVolumeM3, 50)
    assert.ok('ppm' in message && message.ppm === 300)
  })
  it('refuses a wrong input', () => {
    const engine = createEngine(fake)
    for (const body of [null, { mode: 'fast' }, { speed: 5 }, { cdra: 'three' }, { params: { nothing: 1 } }, { hold: 2 }, { ppm: 'high' }]) {
      assert.ok('error' in engine.control(body), JSON.stringify(body))
    }
  })
  it('goes back to the first state', () => {
    const engine = createEngine(fake)
    const first = engine.full()
    engine.control({ ppm: 9000, crew: 2, cdra: 'off', params: { otherRemoval: 2 } })
    assert.deepEqual(engine.control({ restart: true }), first)
  })
})

describe('the RR-9 record', () => {
  const record = loadRecord()
  it('has the mean and the highest value that the task names', () => {
    const mean = record.ppm.reduce((sum, value) => sum + value, 0) / record.ppm.length
    assert.equal(Math.round(mean), 3015)
    assert.equal(Math.round(Math.max(...record.ppm)), 4051)
    assert.equal(ppmToMmHg(mean).toFixed(1), '2.3')
  })
  it('holds only the time on the station, in 2017', () => {
    // The data before the transfer falls to 400 ppm. The window has no such value.
    assert.ok(Math.min(...record.ppm) > 1000)
    assert.equal(new Date(record.startMs).toISOString(), '2017-08-18T15:43:00.000Z')
    assert.equal(record.yearShift, -1)
  })
})
