// Tests of the simulator engine. Run: npm test
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { DEFAULT_PARAMS, HISTORY_STEPS, advance, mmHgToPpm, modelOf, ppmToMmHg, rollingMean } from '../../shared/co2.ts'
import { defaultTrip, nominalLife } from '../../shared/trip/defaults.ts'
import { DEFAULT_PRESET, PRESETS, PRESET_BY_ID } from '../../shared/trip/presets/index.ts'
import { missionDays, timeline } from '../../shared/trip/timeline.ts'
import { PRESET_IDS, TRIP_LIMITS, TRIP_SPEEDS, type DoseUnit, type Phase, type Preset, type PresetId, type TripState } from '../../shared/trip/types.ts'
import { SOURCE, changeTrip, createEngine, type Message, type Presets } from './engine.ts'
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
// The messages of a request that must work.
const sent = (result: Message[] | { error: string }): Message[] => {
  assert.ok(Array.isArray(result), `expected messages, got ${JSON.stringify(result)}`)
  return result
}
// The one message of a request or of a tick of the clock.
const one = (result: Message[] | { error: string }): Message => {
  const messages = sent(result)
  assert.equal(messages.length, 1, 'expected one message')
  return messages[0]
}
const full = (result: Message[] | { error: string }) => {
  const message = one(result)
  assert.ok(message.type === 'full', 'expected all values')
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
    const message = one(engine.tick(3))
    assert.ok(message.type === 'tick')
    assert.deepEqual(message.ppm, [fake.ppm[HISTORY_STEPS + 1], fake.ppm[HISTORY_STEPS + 2], fake.ppm[HISTORY_STEPS + 3]])
    assert.deepEqual(message.src, [SOURCE.record, SOURCE.record, SOURCE.record])
    assert.equal(message.state.timeMs, fake.startMs + (HISTORY_STEPS + 3) * 5 * 60_000)
  })

  it('moves one step each 3 seconds at the slowest speed', () => {
    const engine = createEngine(fake)
    assert.deepEqual(engine.tick(1), [])
    assert.deepEqual(engine.tick(1), [])
    assert.equal(one(engine.tick(1)).type, 'tick')
  })

  it('stops when paused', () => {
    const engine = createEngine(fake)
    engine.control({ playing: false, speed: 72 })
    assert.deepEqual(engine.tick(10), [])
  })

  it('starts the record again after its end', () => {
    const engine = createEngine(fake)
    full(engine.control({ seek: length - 2 }))
    engine.control({ speed: 1 })
    assert.equal(one(engine.tick(1)).type, 'tick')
    const again = full(engine.tick(1))
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
    const message = one(engine.tick(1))
    assert.ok(message.type === 'tick')
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
    const message = one(engine.tick(1))
    assert.ok(message.type === 'tick' && message.ppm.at(-1)! < 5000)
  })

  it('takes a value from the presenter and marks it', () => {
    const engine = createEngine(fake)
    const message = one(engine.control({ ppm: 5200 }))
    assert.ok(message.type === 'last')
    assert.equal(message.ppm, 5200)
    assert.equal(message.src, SOURCE.manual)
    assert.equal(message.state.mode, 'simulated')
    const bumped = one(engine.control({ bump: -200 }))
    assert.ok(bumped.type === 'last' && bumped.ppm === 5000)
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
    const message = one(engine.control({ crew: 99, ppm: 1, params: { freeVolumeM3: 1 } }))
    assert.ok(message.type === 'last')
    assert.equal(message.state.crew, 7)
    assert.equal(message.state.params.freeVolumeM3, 50)
    assert.equal(message.ppm, 300)
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
    assert.deepEqual(engine.control({ restart: true }), [first])
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

// ---------------------------------------------------------------------------------------
// The trip settings
// ---------------------------------------------------------------------------------------
// Small presets for the tests. The real presets can change, so the tests with fixed numbers use these:
//   each preset     one flight of 10 days, crew of 4, cabin of 100 m3.
//   mars-reference  100 days out, 30 days on the surface (10 to 500), 100 days back (optional).
//   iss             20 days in low orbit, with the dose in mGy.
const source = { short: 'test', title: 'test', url: '' }
const phase = (id: string, kind: Phase['kind'], days: number, unit: DoseUnit = 'mSv'): Phase => ({
  id,
  label: id,
  kind,
  days,
  rate: { value: 1, unit, instrument: 'test', shielding: '', solar: '', says: '', source, badge: 'modelled' },
})
const preset = (id: PresetId, more: Partial<Preset> = {}): Preset => ({
  id,
  name: id,
  summary: '',
  badge: 'modelled',
  destination: 'mars',
  frame: 'sun',
  trajectory: { file: null, source, note: '', badge: 'modelled' },
  phases: [phase('cruise', 'cruise', 10)],
  crew: 4,
  cabin: { name: 'test', freeVolumeM3: 100 },
  flags: [],
  sources: [],
  ...more,
})
const presets = Object.fromEntries(PRESET_IDS.map((id) => [id, preset(id)])) as Presets
presets['mars-reference'] = preset('mars-reference', {
  phases: [phase('out', 'cruise', 100), phase('surface', 'surface', 30), phase('back', 'return', 100)],
  surfaceStay: { phaseId: 'surface', defaultDays: 30, minDays: 10, maxDays: 500 },
  returnTrip: { phaseId: 'back' },
  crew: 5,
  cabin: { name: 'test', freeVolumeM3: 200 },
})
presets.iss = preset('iss', { phases: [phase('leo', 'leo', 20, 'mGy')], crew: 6 })

type TestEngine = ReturnType<typeof createEngine>
// An engine with the small presets. The CO2 clock is off, so a tick shows the trip clock only.
const tripEngine = (first: PresetId = 'msl') => {
  const engine = createEngine(fake, { presets, defaultPreset: first })
  engine.control({ playing: false })
  return engine
}
// Sends trip fields that must work. Gives the trip settings after the request.
const set = (engine: TestEngine, change: Record<string, unknown>): TripState => {
  const message = one(engine.control({ trip: change }))
  assert.ok(message.type === 'trip', 'expected a trip message')
  assert.deepEqual(message.trip, engine.settings().trip)
  return message.trip
}
// Sends a trip value that must fail. Checks that nothing changed. Gives the error text.
const refused = (engine: TestEngine, change: unknown): string => {
  const before = engine.full()
  const result = engine.control({ trip: change })
  assert.ok(!Array.isArray(result), `expected an error for ${JSON.stringify(change)}`)
  assert.deepEqual(engine.full(), before, `${JSON.stringify(change)} changed something`)
  return result.error
}

describe('the trip settings at the start', () => {
  it('starts with the first settings of the default preset', () => {
    assert.deepEqual(createEngine(fake).full().trip, defaultTrip(PRESET_BY_ID[DEFAULT_PRESET]))
    assert.deepEqual(tripEngine().full().trip, defaultTrip(presets.msl))
    assert.deepEqual(tripEngine('iss').settings().trip, defaultTrip(presets.iss))
  })

  it('goes back to the first settings with a restart', () => {
    const engine = createEngine(fake, { presets, defaultPreset: 'msl' })
    const first = engine.full()
    set(engine, { preset: 'mars-reference', day: 50, speed: 5, life: { scrubber: 'off' }, addStorm: { dose: 100, hours: 12 }, compare: ['iss', 'msl'] })
    assert.deepEqual(engine.control({ restart: true }), [first])
    // A restart does not read the other fields of its request.
    assert.deepEqual(engine.control({ restart: true, trip: { day: 3 } }), [first])
  })

  it('gives a copy of the settings in each message', () => {
    const engine = tripEngine()
    const message = set(engine, { addStorm: { dose: 100, hours: 12 } })
    message.storms.length = 0
    message.life.schedule.exerciseStartHours.push(3)
    message.compare.push('iss')
    const now = engine.settings().trip
    assert.equal(now.storms.length, 1)
    assert.deepEqual(now.life.schedule.exerciseStartHours, defaultTrip(presets.msl).life.schedule.exerciseStartHours)
    assert.deepEqual(now.compare, ['msl'])
  })
})

describe('the clock of the trip', () => {
  it('does not move before the presenter starts it', () => {
    const engine = tripEngine()
    assert.deepEqual(engine.tick(10), [])
    assert.equal(engine.settings().trip.day, 0)
  })

  it('moves the day by the seconds times the speed', () => {
    for (const speed of TRIP_SPEEDS) {
      const engine = tripEngine('mars-reference')
      set(engine, { playing: true, speed })
      const message = one(engine.tick(2))
      assert.ok(message.type === 'trip')
      assert.ok(Math.abs(message.trip.day - 2 * speed) < 1e-6, `${message.trip.day} is not ${2 * speed}`)
      assert.equal(message.trip.playing, true)
      const next = one(engine.tick(0.5))
      assert.ok(next.type === 'trip' && Math.abs(next.trip.day - 2.5 * speed) < 1e-6)
    }
  })

  it('stops at the end of the mission and stays there', () => {
    const engine = tripEngine()
    set(engine, { playing: true, speed: 5 })
    const middle = one(engine.tick(1))
    assert.ok(middle.type === 'trip' && middle.trip.day === 5 && middle.trip.playing)
    const end = one(engine.tick(1))
    assert.ok(end.type === 'trip')
    assert.equal(end.trip.day, 10)
    assert.equal(end.trip.playing, false)
    assert.deepEqual(engine.tick(1), [])
    assert.equal(engine.settings().trip.day, 10)
  })

  it('does not go past the end with one long step', () => {
    const engine = tripEngine()
    set(engine, { day: 9.9, playing: true, speed: 5 })
    const end = one(engine.tick(5))
    assert.ok(end.type === 'trip' && end.trip.day === 10 && !end.trip.playing)
  })

  it('uses the length of the mission with the settings now', () => {
    const engine = tripEngine('mars-reference')
    // 100 days out and 10 days on the surface, with no flight back.
    set(engine, { returnTrip: false, surfaceDays: 10, day: 108, playing: true, speed: 5 })
    const end = one(engine.tick(1))
    assert.ok(end.type === 'trip' && end.trip.day === 110 && !end.trip.playing)
  })

  it('plays the mission again from the first day after the end', () => {
    const engine = tripEngine()
    assert.equal(set(engine, { day: 10 }).day, 10)
    const again = set(engine, { playing: true })
    assert.equal(again.day, 0)
    assert.equal(again.playing, true)
    // With a day in the request, the cursor goes to that day.
    assert.equal(set(engine, { day: 4, playing: true }).day, 4)
  })

  it('stops a real preset at the length that its phases give', () => {
    const engine = createEngine(fake)
    engine.control({ playing: false })
    const real = PRESET_BY_ID[DEFAULT_PRESET]
    const length = missionDays(timeline(real, defaultTrip(real)))
    set(engine, { day: Math.max(0, length - 1), playing: true, speed: 5 })
    const end = one(engine.tick(1))
    assert.ok(end.type === 'trip')
    assert.equal(end.trip.day, length)
    assert.equal(end.trip.playing, false)
  })

  it('runs next to the CO2 clock, and each clock sends its own message', () => {
    const engine = createEngine(fake, { presets, defaultPreset: 'msl' })
    engine.control({ speed: 1, trip: { playing: true, speed: 0.25 } })
    const messages = engine.tick(2)
    assert.deepEqual(
      messages.map((message) => message.type),
      ['tick', 'trip'],
    )
    assert.ok(messages[0].type === 'tick' && messages[0].ppm.length === 2 && !('trip' in messages[0]))
    assert.ok(messages[1].type === 'trip' && messages[1].trip.day === 0.5 && !('state' in messages[1]))
  })

  it('puts the trip in the message with all values, and sends no second message then', () => {
    const engine = createEngine(fake, { presets, defaultPreset: 'msl' })
    engine.control({ seek: length - 1, speed: 1, trip: { playing: true, speed: 1 } })
    // The record starts again, so the CO2 clock sends all values.
    const message = full(engine.tick(1))
    assert.equal(message.trip.day, 1)
  })
})

describe('the controls of the trip', () => {
  it('takes a good value and refuses a bad value of each setting', () => {
    // The setting, a good value, a bad value.
    const cases: [keyof TripState, unknown, unknown][] = [
      ['day', 3, '3'],
      ['playing', true, 'yes'],
      ['speed', TRIP_SPEEDS[0], -1],
      ['speed', TRIP_SPEEDS.at(-1), 'fast'],
      ['solar', 'declining', 'minimum'],
      ['doseUnit', 'mGy', 'rem'],
      ['surfaceDays', 40, '40'],
      ['returnTrip', false, 0],
      ['customDays', 300, null],
      ['customRate', 2, 'high'],
      ['customUnit', 'mGy', 'Gy'],
    ]
    for (const [name, good, bad] of cases) {
      const engine = tripEngine('mars-reference')
      assert.equal(set(engine, { [name]: good })[name], good, name)
      assert.match(refused(engine, { [name]: bad }), new RegExp(`trip\\.${name}`))
      // A number that JSON cannot hold is not a number for the engine.
      if (typeof good === 'number') refused(engine, { [name]: Number.NaN })
    }
  })

  it('refuses a value that is not an object, and a setting that does not exist', () => {
    const engine = tripEngine()
    for (const bad of [null, 5, 'day', [], [{ day: 2 }]]) refused(engine, bad)
    assert.match(refused(engine, { days: 3 }), /trip\.days/)
    assert.match(refused(engine, { lifeChangedDay: 3 }), /lifeChangedDay/)
    assert.match(refused(engine, { storms: [] }), /storms/)
  })

  it('changes nothing when one setting of many is wrong', () => {
    const engine = tripEngine()
    refused(engine, { day: 5, solar: 'declining', life: { crew: 2 }, addStorm: { dose: 10, hours: 2 }, speed: -1 })
    refused(engine, { preset: 'iss', compare: [] })
    assert.deepEqual(engine.settings().trip, defaultTrip(presets.msl))
  })

  it('keeps the day inside the mission', () => {
    const engine = tripEngine()
    assert.equal(set(engine, { day: -4 }).day, 0)
    assert.equal(set(engine, { day: 12.5 }).day, 10)
    assert.equal(set(engine, { day: 2.5 }).day, 2.5)
  })

  it('keeps each number inside its limits', () => {
    const engine = tripEngine()
    // This preset has no surface stay, so only the common limits count.
    assert.equal(set(engine, { surfaceDays: 99_999 }).surfaceDays, TRIP_LIMITS.surfaceDays.max)
    assert.equal(set(engine, { surfaceDays: -5 }).surfaceDays, TRIP_LIMITS.surfaceDays.min)
    assert.equal(set(engine, { customDays: 0 }).customDays, TRIP_LIMITS.customDays.min)
    assert.equal(set(engine, { customDays: 99_999 }).customDays, TRIP_LIMITS.customDays.max)
    assert.equal(set(engine, { customRate: -1 }).customRate, TRIP_LIMITS.customRate.min)
    assert.equal(set(engine, { customRate: 99 }).customRate, TRIP_LIMITS.customRate.max)
    // A preset with a surface stay has its own limits too.
    const mars = tripEngine('mars-reference')
    assert.equal(set(mars, { surfaceDays: 1 }).surfaceDays, 10)
    assert.equal(set(mars, { surfaceDays: 550 }).surfaceDays, 500)
  })

  it('puts the day and the day of the last change inside the mission again when the mission gets shorter', () => {
    const engine = tripEngine('mars-reference')
    // 100 + 30 + 100 days.
    const start = set(engine, { day: 9999, life: { scrubber: 'off' } })
    assert.equal(start.day, 230)
    assert.equal(start.lifeChangedDay, 230)
    const oneWay = set(engine, { returnTrip: false })
    assert.equal(oneWay.day, 130)
    assert.equal(oneWay.lifeChangedDay, 130)
    assert.equal(set(engine, { surfaceDays: 10 }).day, 110)
    // A longer mission does not move the cursor.
    assert.equal(set(engine, { surfaceDays: 300, returnTrip: true }).day, 110)
    // The custom preset takes its length from the simulator.
    const custom = tripEngine('custom')
    assert.equal(set(custom, { customDays: 400, day: 350 }).day, 350)
    assert.equal(set(custom, { customDays: 20 }).day, 20)
  })

  it('loads a preset with its first settings, but keeps the comparison and the speed', () => {
    const engine = tripEngine()
    set(engine, {
      day: 5,
      playing: true,
      speed: 5,
      solar: 'declining',
      compare: ['iss', 'msl'],
      addStorm: { dose: 100, hours: 12 },
      life: { scrubber: 'off', crew: 2 },
    })
    const loaded = set(engine, { preset: 'mars-reference' })
    assert.deepEqual(loaded, { ...defaultTrip(presets['mars-reference']), compare: ['iss', 'msl'], speed: 5, playing: false })
    assert.equal(loaded.life.crew, 5)
    assert.equal(loaded.surfaceDays, 30)
    // The other fields of the same request change the new preset.
    const moved = set(engine, { preset: 'iss', day: 15, playing: true })
    assert.equal(moved.preset, 'iss')
    assert.equal(moved.day, 15)
    assert.equal(moved.playing, true)
    assert.equal(moved.doseUnit, 'mGy')
    // The same preset again is a reset of the trip.
    assert.equal(set(engine, { preset: 'iss' }).day, 0)
    for (const bad of ['pluto', 7, null, ['iss']]) assert.match(refused(engine, { preset: bad }), /trip\.preset/)
  })

  it('loads each real preset', () => {
    const engine = createEngine(fake)
    for (const real of PRESETS) {
      const loaded = set(engine, { preset: real.id })
      assert.deepEqual(loaded, { ...defaultTrip(real), compare: loaded.compare, speed: loaded.speed })
      assert.equal(set(engine, { day: 1e9 }).day, missionDays(timeline(real, loaded)), real.id)
    }
  })

  it('sets the presets of the comparison', () => {
    const engine = tripEngine()
    assert.deepEqual(set(engine, { compare: ['iss'] }).compare, ['iss'])
    assert.deepEqual(set(engine, { compare: ['iss', 'msl', 'custom'] }).compare, ['iss', 'msl', 'custom'])
    for (const bad of [[], ['iss', 'msl', 'custom', 'tgo'], ['iss', 'iss'], ['iss', 'pluto'], [1], 'iss', null]) {
      assert.match(refused(engine, { compare: bad }), /trip\.compare/)
    }
  })
})

describe('the storms of the trip', () => {
  it('adds a storm at the cursor day, or at the day of the request', () => {
    const engine = tripEngine()
    assert.deepEqual(set(engine, { day: 4, addStorm: { dose: 100, hours: 12 } }).storms, [{ day: 4, dose: 100, hours: 12 }])
    assert.deepEqual(set(engine, { addStorm: { dose: 50, hours: 6, day: 7.5 } }).storms.at(-1), { day: 7.5, dose: 50, hours: 6 })
    // The cursor did not move.
    assert.equal(engine.settings().trip.day, 4)
  })

  it('keeps the dose, the hours, and the day of a storm inside their limits', () => {
    const engine = tripEngine()
    const high = set(engine, { addStorm: { dose: 1e9, hours: 1e9, day: 1e9 } }).storms[0]
    assert.deepEqual(high, { day: 10, dose: TRIP_LIMITS.stormDose.max, hours: TRIP_LIMITS.stormHours.max })
    const low = set(engine, { addStorm: { dose: 0, hours: 0, day: -1 } }).storms[1]
    assert.deepEqual(low, { day: 0, dose: TRIP_LIMITS.stormDose.min, hours: TRIP_LIMITS.stormHours.min })
  })

  it('refuses a storm with a wrong or missing value', () => {
    const engine = tripEngine()
    for (const bad of [null, 5, [], {}, { dose: 100 }, { hours: 12 }, { dose: '100', hours: 12 }, { dose: 100, hours: null }, { dose: 100, hours: 12, day: 'now' }, { dose: 100, hours: 12, unit: 'mSv' }]) {
      assert.match(refused(engine, { addStorm: bad }), /addStorm/)
    }
  })

  it('refuses one storm more than the limit', () => {
    const engine = tripEngine()
    for (let count = 0; count < TRIP_LIMITS.storms; count++) set(engine, { addStorm: { dose: 10 + count, hours: 2 } })
    assert.equal(engine.settings().trip.storms.length, TRIP_LIMITS.storms)
    assert.match(refused(engine, { addStorm: { dose: 10, hours: 2 } }), /storms already/)
    // After one storm goes, there is room again.
    assert.equal(set(engine, { removeStorm: 0, addStorm: { dose: 99, hours: 2 } }).storms.length, TRIP_LIMITS.storms)
    assert.equal(engine.settings().trip.storms.at(-1)!.dose, 99)
  })

  it('removes one storm by its index', () => {
    const engine = tripEngine()
    assert.match(refused(engine, { removeStorm: 0 }), /no storm/)
    for (const dose of [10, 20, 30]) set(engine, { addStorm: { dose, hours: 2 } })
    assert.deepEqual(
      set(engine, { removeStorm: 1 }).storms.map((storm) => storm.dose),
      [10, 30],
    )
    for (const bad of [2, -1, 0.5, '0', null, true]) assert.match(refused(engine, { removeStorm: bad }), /trip\.removeStorm/)
  })

  it('removes all storms', () => {
    const engine = tripEngine()
    for (const dose of [10, 20, 30]) set(engine, { addStorm: { dose, hours: 2 } })
    assert.equal(set(engine, { clearStorms: false }).storms.length, 3)
    assert.match(refused(engine, { clearStorms: 'yes' }), /trip\.clearStorms/)
    // In one request, the engine removes first and adds after.
    assert.deepEqual(set(engine, { clearStorms: true, addStorm: { dose: 40, hours: 2 } }).storms, [{ day: 0, dose: 40, hours: 2 }])
    assert.deepEqual(set(engine, { clearStorms: true }).storms, [])
  })
})

describe('the life support of the trip', () => {
  it('takes a good value and refuses a bad value of each setting', () => {
    // The setting, a good value, a bad value.
    const cases: [string, unknown, unknown][] = [
      ['crew', 2, 'two'],
      ['freeVolumeM3', 300, null],
      ['temperatureC', 20, '20'],
      ['totalPressureMmHg', 530, true],
      ['metabolic', 'exercise90', 'rest'],
      ['scrubber', 'one', 'half'],
      ['scrubber', 'off', 0],
      ['scrubberUnits', 2, 'two'],
      ['ogaOn', false, 0],
      ['ogaKgPerDay', 3, 'much'],
      ['bottledO2Kg', 50, '50'],
      ['sabatier', true, 'on'],
    ]
    for (const [name, good, bad] of cases) {
      const engine = tripEngine()
      const life = set(engine, { life: { [name]: good } }).life
      assert.deepEqual(life, { ...defaultTrip(presets.msl).life, [name]: good }, name)
      assert.match(refused(engine, { life: { [name]: bad } }), new RegExp(`trip\\.life\\.${name}`))
    }
  })

  it('takes "as much as the crew uses" for the oxygen generator', () => {
    const engine = tripEngine()
    assert.equal(set(engine, { life: { ogaKgPerDay: 2 } }).life.ogaKgPerDay, 2)
    assert.equal(set(engine, { life: { ogaKgPerDay: null } }).life.ogaKgPerDay, null)
  })

  it('keeps each number inside its limits', () => {
    const engine = tripEngine()
    // The setting, a value below and a value above the limits, the limits.
    const cases: [string, number, number, number, number][] = [
      ['crew', 0, 99, TRIP_LIMITS.crew.min, TRIP_LIMITS.crew.max],
      ['freeVolumeM3', 1, 99_999, TRIP_LIMITS.freeVolumeM3.min, TRIP_LIMITS.freeVolumeM3.max],
      ['temperatureC', 0, 99, 15, 30],
      ['totalPressureMmHg', 100, 2000, 400, 800],
      ['scrubberUnits', 0, 9, 0.5, 4],
      ['otherUnits', -1, 9, 0, 3],
      ['ogaKgPerDay', -1, 99, TRIP_LIMITS.ogaKgPerDay.min, TRIP_LIMITS.ogaKgPerDay.max],
      ['bottledO2Kg', -1, 99_999, TRIP_LIMITS.bottledO2Kg.min, TRIP_LIMITS.bottledO2Kg.max],
    ]
    for (const [name, below, above, min, max] of cases) {
      assert.equal(set(engine, { life: { [name]: below } }).life[name as 'crew'], min, name)
      assert.equal(set(engine, { life: { [name]: above } }).life[name as 'crew'], max, name)
    }
    // The crew is a whole number.
    assert.equal(set(engine, { life: { crew: 2.6 } }).life.crew, 3)
  })

  it('changes the day of the crew, one field or all fields', () => {
    const engine = tripEngine()
    const first = defaultTrip(presets.msl).life.schedule
    assert.deepEqual(set(engine, { life: { schedule: { sleepStartHour: 23 } } }).life.schedule, { ...first, sleepStartHour: 23 })
    const all = { sleepStartHour: 21, sleepHours: 7.5, exerciseStartHours: [6, 12, 18, 20], exerciseMinutes: 45 }
    assert.deepEqual(set(engine, { life: { schedule: all } }).life.schedule, all)
    assert.deepEqual(set(engine, { life: { schedule: { exerciseStartHours: [] } } }).life.schedule.exerciseStartHours, [])
    // The limits: the hours of the day are whole hours from 0 to 23.
    const limits = set(engine, { life: { schedule: { sleepStartHour: 30, sleepHours: 1, exerciseStartHours: [-2, 7.6, 99], exerciseMinutes: 500 } } }).life.schedule
    assert.deepEqual(limits, { sleepStartHour: 23, sleepHours: 4, exerciseStartHours: [0, 8, 23], exerciseMinutes: 120 })
    assert.equal(set(engine, { life: { schedule: { sleepHours: 99, exerciseMinutes: -5 } } }).life.schedule.sleepHours, 12)
    assert.equal(engine.settings().trip.life.schedule.exerciseMinutes, 0)
  })

  it('refuses a wrong day of the crew', () => {
    const engine = tripEngine()
    const bad = [
      null,
      7,
      [],
      { sleepStartHour: 'late' },
      { sleepHours: null },
      { exerciseStartHours: 8 },
      { exerciseStartHours: [1, 2, 3, 4, 5] },
      { exerciseStartHours: [8, 'noon'] },
      { exerciseMinutes: '30' },
      { naps: 2 },
    ]
    for (const schedule of bad) assert.match(refused(engine, { life: { schedule } }), /schedule|exerciseStartHours/)
  })

  it('refuses a value that is not an object, and a setting that does not exist', () => {
    const engine = tripEngine()
    for (const bad of [null, 5, 'off', []]) assert.match(refused(engine, { life: bad }), /trip\.life/)
    assert.match(refused(engine, { life: { cdra: 'off' } }), /trip\.life\.cdra/)
    // One wrong setting stops the good ones of the same request.
    refused(engine, { life: { crew: 2, scrubber: 'off', sabatier: 1 } })
  })

  it('starts a failure at the cursor day', () => {
    // Each of these settings is a failure or a repair.
    const cases: [string, unknown][] = [
      ['scrubber', 'one'],
      ['ogaOn', false],
      ['ogaKgPerDay', 2],
      ['bottledO2Kg', 80],
    ]
    for (const [name, value] of cases) {
      const engine = tripEngine()
      set(engine, { day: 4 })
      assert.equal(set(engine, { life: { [name]: value } }).lifeChangedDay, 4, name)
      // The same value again, at a later day, is not a change.
      assert.equal(set(engine, { day: 6, life: { [name]: value } }).lifeChangedDay, 4, name)
      // The value of the start again is a change: a repair.
      const repaired = set(engine, { day: 8, life: { [name]: defaultTrip(presets.msl).life[name as 'scrubber'] } })
      assert.equal(repaired.lifeChangedDay, 8, name)
    }
  })

  it('uses the day of the same request for the start of a failure', () => {
    const engine = tripEngine()
    assert.equal(set(engine, { day: 7, life: { scrubber: 'off' } }).lifeChangedDay, 7)
    // A move of the cursor alone does not move the failure.
    assert.equal(set(engine, { day: 2 }).lifeChangedDay, 7)
  })

  it('does not move the start of a failure for the other settings', () => {
    const engine = tripEngine()
    set(engine, { day: 3, life: { scrubber: 'off' } })
    const other = {
      crew: 2,
      freeVolumeM3: 50,
      temperatureC: 20,
      totalPressureMmHg: 700,
      metabolic: 'exercise90',
      scrubberUnits: 2,
      sabatier: true,
      schedule: { sleepStartHour: 1, sleepHours: 6, exerciseStartHours: [10], exerciseMinutes: 60 },
    }
    const changed = set(engine, { day: 9, life: other })
    assert.equal(changed.lifeChangedDay, 3)
    assert.deepEqual(changed.life, { ...defaultTrip(presets.msl).life, scrubber: 'off', ...other })
    // All settings in one request, with the same failure settings as now.
    assert.equal(set(engine, { life: changed.life }).lifeChangedDay, 3)
  })

  it('repairs all, but keeps the crew, the volume, the day of the crew, and the metabolic rates', () => {
    const engine = tripEngine('mars-reference')
    const schedule = { sleepStartHour: 1, sleepHours: 6, exerciseStartHours: [10], exerciseMinutes: 60 }
    set(engine, {
      day: 40,
      life: { crew: 2, freeVolumeM3: 50, metabolic: 'exercise90', schedule, temperatureC: 28, totalPressureMmHg: 500, scrubber: 'off', scrubberUnits: 3, ogaOn: false, ogaKgPerDay: 1, bottledO2Kg: 100, sabatier: true },
    })
    assert.equal(engine.settings().trip.lifeChangedDay, 40)
    assert.equal(set(engine, { resetLife: false }).life.scrubber, 'off')
    const reset = set(engine, { resetLife: true })
    assert.deepEqual(reset.life, { ...nominalLife(presets['mars-reference'], 2, 50), metabolic: 'exercise90', schedule })
    assert.equal(reset.life.scrubber, 'both')
    assert.equal(reset.lifeChangedDay, 0)
    assert.equal(reset.day, 40)
    assert.match(refused(engine, { resetLife: 'yes' }), /trip\.resetLife/)
    // A new failure in the request of the repair starts at the cursor day.
    assert.equal(set(engine, { resetLife: true, life: { ogaOn: false } }).lifeChangedDay, 40)
  })
})

describe('the CO2 settings and the trip settings in one server', () => {
  it('sends one message of each group for a request with both', () => {
    const engine = createEngine(fake, { presets, defaultPreset: 'msl' })
    const settings = sent(engine.control({ crew: 3, trip: { day: 2 } }))
    assert.deepEqual(
      settings.map((message) => message.type),
      ['state', 'trip'],
    )
    assert.ok(settings[0].type === 'state' && settings[0].state.crew === 3)
    assert.ok(settings[1].type === 'trip' && settings[1].trip.day === 2)
    const value = sent(engine.control({ ppm: 5000, trip: { solar: 'declining' } }))
    assert.deepEqual(
      value.map((message) => message.type),
      ['last', 'trip'],
    )
    assert.ok(value[0].type === 'last' && value[0].ppm === 5000)
    assert.ok(value[1].type === 'trip' && value[1].trip.solar === 'declining' && value[1].trip.day === 2)
  })

  it('sends the trip inside the message with all values', () => {
    const engine = createEngine(fake, { presets, defaultPreset: 'msl' })
    const message = full(engine.control({ seek: 100, trip: { day: 6 } }))
    assert.equal(message.ppm.length, 101)
    assert.equal(message.trip.day, 6)
  })

  it('sends only a trip message for a trip request, and does not change the CO2 group', () => {
    const engine = createEngine(fake, { presets, defaultPreset: 'msl' })
    engine.control({ ppm: 4200, crew: 3, cdra: 'one', params: { otherRemoval: 2 } })
    const before = engine.full()
    set(engine, { preset: 'mars-reference', day: 50, playing: true, speed: 5, life: { crew: 7, scrubber: 'off', freeVolumeM3: 900, totalPressureMmHg: 500 } })
    const after = engine.full()
    assert.deepEqual({ state: after.state, ppm: after.ppm, src: after.src }, { state: before.state, ppm: before.ppm, src: before.src })
  })

  it('sends no trip message for a CO2 request, and does not change the trip', () => {
    const engine = createEngine(fake, { presets, defaultPreset: 'msl' })
    set(engine, { day: 5, life: { scrubber: 'one' } })
    const before = engine.settings().trip
    const requests = [{}, { crew: 2 }, { cdra: 'off', speed: 72, params: { freeVolumeM3: 500 } }, { ppm: 6000 }, { hold: 24 }, { mode: 'replay' }, { seek: 10 }, { playing: false }]
    for (const body of requests) {
      const message = one(engine.control(body))
      assert.notEqual(message.type, 'trip', JSON.stringify(body))
      assert.deepEqual(engine.settings().trip, before, JSON.stringify(body))
    }
  })

  it('moves each clock alone', () => {
    const engine = createEngine(fake, { presets, defaultPreset: 'msl' })
    // The CO2 clock runs and the trip clock does not.
    engine.control({ speed: 12 })
    assert.equal(one(engine.tick(1)).type, 'tick')
    assert.equal(engine.settings().trip.day, 0)
    // The trip clock runs and the CO2 clock does not.
    engine.control({ playing: false, trip: { playing: true, speed: 1 } })
    const step = engine.settings().state.step
    assert.equal(one(engine.tick(3)).type, 'trip')
    assert.equal(engine.settings().state.step, step)
    assert.equal(engine.settings().state.playing, false)
    assert.equal(engine.settings().trip.day, 3)
  })

  it('changes nothing with a wrong trip field next to good CO2 fields', () => {
    const engine = createEngine(fake, { presets, defaultPreset: 'msl' })
    const before = engine.full()
    const result = engine.control({ crew: 3, ppm: 5000, trip: { speed: -1 } })
    assert.ok('error' in result)
    assert.deepEqual(engine.full(), before)
  })

  it('does not change the trip with a wrong CO2 field next to good trip fields', () => {
    const engine = createEngine(fake, { presets, defaultPreset: 'msl' })
    const before = engine.settings().trip
    const result = engine.control({ cdra: 'three', trip: { day: 2, life: { scrubber: 'off' } } })
    assert.ok('error' in result)
    assert.deepEqual(engine.settings().trip, before)
  })
})

describe('changeTrip', () => {
  it('gives new settings and does not change the settings that it gets', () => {
    const trip = defaultTrip(presets.msl)
    const copy = structuredClone(trip)
    const next = changeTrip(trip, { day: 3, life: { scrubber: 'off', schedule: { exerciseStartHours: [1] } }, addStorm: { dose: 10, hours: 2 }, compare: ['iss'] }, presets)
    assert.ok(!('error' in next))
    assert.deepEqual(trip, copy)
    assert.equal(next.day, 3)
    assert.equal(next.lifeChangedDay, 3)
    assert.deepEqual(changeTrip(trip, { day: 'noon' }, presets), { error: 'trip.day must be a number.' })
    assert.deepEqual(trip, copy)
  })
})
