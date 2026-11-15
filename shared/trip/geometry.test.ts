import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { buildGeometry, lightSeconds } from './geometry.ts'
import { defaultTrip } from './defaults.ts'
import { PRESETS } from './presets/index.ts'
import { missionDays, timeline, type TripOptions } from './timeline.ts'
import { KM_PER_AU, type Frame, type Phase, type PhaseKind, type Point, type Preset, type Rate, type SourceRef, type TrajectoryFile } from './types.ts'

// The trajectory files of the app. A file that another script makes can be absent.
const files: Record<string, TrajectoryFile> = {}
for (const name of ['msl', 'tgo', 'artemis1', 'artemis2', 'planets', 'moon', 'iss']) {
  const url = new URL(`../../web/src/trip/data/${name}.json`, import.meta.url)
  if (existsSync(url)) files[name] = JSON.parse(readFileSync(url, 'utf8')) as TrajectoryFile
}

// Small presets for the tests, so a change of the real presets does not change the test.
const SOURCE: SourceRef = { short: 'test', title: 'test', url: '' }
const RATE: Rate = { value: null, unit: 'mSv', instrument: '', shielding: '', solar: '', says: '', source: SOURCE, badge: 'real-rate' }
const phase = (id: string, kind: PhaseKind, days: number): Phase => ({ id, label: id, kind, days, rate: RATE })
function preset(id: Preset['id'], frame: Frame, file: string | null, phases: Phase[], more: Partial<Preset> = {}): Preset {
  return {
    id,
    name: id,
    summary: '',
    badge: 'modelled',
    destination: frame === 'sun' ? 'mars' : frame === 'earth' ? 'moon' : 'leo',
    frame,
    trajectory: { file, source: SOURCE, note: '', badge: 'real-data' },
    phases,
    crew: 4,
    cabin: { name: '', freeVolumeM3: 100 },
    flags: [],
    sources: [],
    ...more,
  }
}
const OPTIONS: TripOptions = { solar: 'max', doseUnit: 'mSv', surfaceDays: 30, returnTrip: true, customDays: 200, customRate: 1, customUnit: 'mSv' }

const lengthDays = (file: TrajectoryFile) => ((file.craft.length - 1) * file.stepHours) / 24
const apart = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1])
const near = (actual: number, expected: number, margin: number, text?: string) =>
  assert.ok(Math.abs(actual - expected) <= margin, `${text ?? 'value'}: ${actual} is not within ${margin} of ${expected}`)

// The MSL cruise with the exact length of the file, and the crewed reference mission.
const mslDays = lengthDays(files.msl)
const msl = preset('msl', 'sun', 'msl', [phase('cruise', 'cruise', mslDays)])
const CRUISE = 253
const reference = preset('mars-reference', 'sun', 'msl', [phase('cruise', 'cruise', CRUISE), phase('surface', 'surface', 30), phase('return', 'return', CRUISE)], {
  surfaceStay: { phaseId: 'surface', defaultDays: 30, minDays: 0, maxDays: 600 },
  returnTrip: { phaseId: 'return' },
})

describe('lightSeconds', () => {
  it('gives 499.0 seconds for 1 AU', () => near(lightSeconds(KM_PER_AU), 499.0, 0.05))
  it('gives 1.28 seconds for the distance of the Moon', () => near(lightSeconds(384_400), 1.28, 0.005))
})

describe('the trajectory files', () => {
  for (const name of ['msl', 'tgo', 'artemis1', 'artemis2', 'planets', 'moon']) {
    it(`${name}.json has one value of each kind for each sample`, () => {
      const file = files[name]
      assert.equal(file.file, name)
      const count = file.craft.length
      assert.ok(count > 100)
      assert.equal(file.earthDistanceKm.length, count)
      for (const points of Object.values(file.bodies)) assert.equal(points.length, count)
      assert.deepEqual(Object.keys(file.bodies), file.frame === 'sun' ? ['earth', 'mars'] : ['moon'])
      if (file.frame === 'sun') assert.equal(file.sunDistanceAu?.length, count)
      assert.ok(Number.isFinite(Date.parse(file.startTime)))
      assert.ok(file.source.credit?.includes('Horizons') && file.source.target.length > 0 && file.source.retrievedAt.length > 0)
      assert.ok([...file.craft.flat(), ...file.earthDistanceKm].every(Number.isFinite))
    })
  }

  it('the Moon stays on a near circle in the plane of the map', () => {
    for (const name of ['moon', 'artemis1', 'artemis2']) {
      const file = files[name]
      file.bodies.moon.forEach((point, index) => {
        const flat = Math.hypot(point[0], point[1])
        assert.ok(flat > 350_000 && flat < 410_000)
        // The Moon is in the plane, so its distance in the plane is its real distance.
        if (name === 'moon') near(flat, file.earthDistanceKm[index], 10)
      })
    }
  })

  it('the distance in the plane is never larger than the real distance', () => {
    for (const name of ['artemis1', 'artemis2']) {
      const file = files[name]
      // The margin of 2 km is for the rounding of the file to whole km.
      file.craft.forEach((point, index) => assert.ok(Math.hypot(point[0], point[1]) <= file.earthDistanceKm[index] + 2))
    }
  })

  it('the planets file starts at the first sample of the MSL file', () => {
    assert.equal(files.planets.startTime, files.msl.startTime)
    assert.equal(files.planets.stepHours, 24)
    assert.deepEqual(files.planets.bodies.mars[0], files.msl.bodies.mars[0])
  })

  it('Artemis II goes about 413,000 km from the Earth, as the Horizons header says', () => {
    near(Math.max(...files.artemis2.earthDistanceKm), 413_146, 50)
  })
})

describe('buildGeometry for the MSL cruise', () => {
  const geometry = buildGeometry(msl, files, OPTIONS)

  it('starts near the Earth', () => {
    const first = geometry.at(0)
    assert.ok(first.lightSeconds < 2)
    assert.ok(apart(first.craft, first.bodies.earth) < 0.001)
    assert.equal(first.modelled, false)
    assert.equal(first.phaseId, 'cruise')
    assert.equal(first.inSaa, null)
  })

  it('ends at Mars', () => {
    const lastPlace = geometry.at(geometry.days)
    assert.ok(apart(lastPlace.craft, lastPlace.bodies.mars) < 0.0001)
    near(lastPlace.sunDistanceAu ?? 0, 1.5, 0.05)
  })

  it('has the light time of the real distance between the Earth and Mars at the arrival', () => {
    const arrival = geometry.at(geometry.days)
    // Mars was about 1.66 AU from the Earth on 6 August 2012.
    near(arrival.earthDistanceKm / KM_PER_AU, 1.66, 0.01)
    near(arrival.lightSeconds, 828, 3)
    // The planets file gives the same distance for that date (it holds the distance from the Earth to Mars).
    const day = Math.floor(mslDays)
    const before = files.planets.earthDistanceKm[day]
    const after = files.planets.earthDistanceKm[day + 1]
    near(arrival.earthDistanceKm, before + (after - before) * (mslDays - day), 5000)
  })

  it('has one delay point for each day, and the delay grows from 0 to about 14 minutes', () => {
    assert.equal(geometry.delay.length, Math.floor(mslDays) + 2)
    assert.equal(geometry.delay[1].day, 1)
    assert.equal(geometry.delay[geometry.delay.length - 1].day, geometry.days)
    assert.ok(geometry.delay.every((point) => !point.modelled))
    assert.ok(geometry.delay[0].seconds < 2)
    near(geometry.delay[geometry.delay.length - 1].seconds / 60, 13.8, 0.1)
  })

  it('has a path with the samples of the file', () => {
    assert.equal(geometry.frame, 'sun')
    assert.equal(geometry.path.length, files.msl.craft.length)
    assert.equal(geometry.pathDays.length, geometry.path.length)
    assert.equal(geometry.bodyPaths.earth.length, geometry.path.length)
    assert.equal(geometry.bodyPaths.mars.length, geometry.path.length)
    assert.deepEqual(geometry.path[10], files.msl.craft[10])
    assert.deepEqual(geometry.bodyPaths.mars[10], files.msl.bodies.mars[10])
  })

  it('gives a place between two samples that lies between them', () => {
    const step = files.msl.stepHours / 24
    const a = geometry.at(400 * step)
    const b = geometry.at(401 * step)
    const middle = geometry.at(400.25 * step)
    assert.deepEqual(a.craft, files.msl.craft[400])
    for (const axis of [0, 1]) {
      near(middle.craft[axis], a.craft[axis] + 0.25 * (b.craft[axis] - a.craft[axis]), 1e-9)
      assert.ok(middle.craft[axis] >= Math.min(a.craft[axis], b.craft[axis]) && middle.craft[axis] <= Math.max(a.craft[axis], b.craft[axis]))
    }
    assert.ok(middle.lightSeconds > a.lightSeconds && middle.lightSeconds < b.lightSeconds)
    // A fraction of a mission day also lies between the two whole days.
    const noon = geometry.at(100.5)
    assert.ok(noon.lightSeconds > geometry.at(100).lightSeconds && noon.lightSeconds < geometry.at(101).lightSeconds)
  })

  it('keeps the day inside the mission', () => {
    assert.equal(geometry.at(-5).day, 0)
    assert.equal(geometry.at(1e9).day, geometry.days)
    assert.equal(geometry.at(Number.NaN).day, 0)
    assert.deepEqual(geometry.at(1e9).craft, geometry.at(geometry.days).craft)
  })

  it('stretches nothing: a shorter mission ends before Mars, a longer one holds the last place', () => {
    const short = buildGeometry(preset('msl', 'sun', 'msl', [phase('cruise', 'cruise', 200)]), files, OPTIONS)
    assert.equal(short.days, 200)
    assert.deepEqual(short.at(150).craft, geometry.at(150).craft)
    assert.ok(apart(short.at(200).craft, short.at(200).bodies.mars) > 0.1)
    const long = buildGeometry(preset('msl', 'sun', 'msl', [phase('cruise', 'cruise', 300)]), files, OPTIONS)
    assert.equal(long.days, 300)
    assert.deepEqual(long.at(300).craft, files.msl.craft[files.msl.craft.length - 1])
    assert.deepEqual(long.at(300).bodies.earth, long.at(260).bodies.earth)
    assert.equal(long.pathDays[long.pathDays.length - 1], 300)
  })
})

describe('buildGeometry for the ExoMars TGO cruise', () => {
  it('starts near the Earth and ends at Mars', () => {
    const days = lengthDays(files.tgo)
    const geometry = buildGeometry(preset('tgo', 'sun', 'tgo', [phase('cruise', 'cruise', days)]), files, OPTIONS)
    assert.ok(geometry.at(0).lightSeconds < 2)
    const arrival = geometry.at(days)
    assert.ok(apart(arrival.craft, arrival.bodies.mars) < 0.0001)
    // The Earth and Mars were 1.18 AU apart on 19 October 2016.
    near(arrival.earthDistanceKm / KM_PER_AU, 1.177, 0.005)
    near(arrival.lightSeconds, 587, 3)
  })
})

describe('buildGeometry for the crewed reference mission', () => {
  const geometry = buildGeometry(reference, files, OPTIONS)
  const [cruise, surface, back] = geometry.spans

  it('has the spans and the days of the timeline', () => {
    assert.deepEqual(geometry.spans, timeline(reference, OPTIONS))
    assert.equal(geometry.days, CRUISE + 30 + CRUISE)
    assert.equal(geometry.days, geometry.spans.reduce((sum, span) => sum + span.phase.days, 0))
    assert.equal(geometry.delay[geometry.delay.length - 1].day, geometry.days)
  })

  it('uses the real MSL cruise for the flight to Mars', () => {
    const real = buildGeometry(msl, files, OPTIONS)
    for (const day of [0, 17.3, 120, 252.9]) {
      assert.deepEqual(geometry.at(day).craft, real.at(day).craft)
      assert.equal(geometry.at(day).modelled, false)
      assert.equal(geometry.at(day).phaseId, 'cruise')
    }
  })

  it('puts the spacecraft at Mars during the stay, with the real places of the planets', () => {
    for (const day of [surface.fromDay, surface.fromDay + 10, surface.fromDay + 29.5]) {
      const place = geometry.at(day)
      assert.deepEqual(place.craft, place.bodies.mars)
      assert.equal(place.phaseId, 'surface')
      assert.equal(place.modelled, false)
    }
    // Day 263 of the mission is day 263 of the planets file: both start at the same moment.
    const place = geometry.at(263)
    assert.deepEqual(place.bodies.earth, files.planets.bodies.earth[263])
    assert.deepEqual(place.bodies.mars, files.planets.bodies.mars[263])
    assert.equal(place.earthDistanceKm, files.planets.earthDistanceKm[263])
    near(place.lightSeconds, files.planets.earthDistanceKm[263] / 299_792.458, 1e-9)
    // The planets move during the stay.
    assert.ok(apart(geometry.at(surface.fromDay).bodies.earth, geometry.at(surface.toDay - 0.01).bodies.earth) > 0.3)
  })

  it('mirrors the cruise in the return', () => {
    // The flight to Mars alone, so the day of the arrival is still a day of the flight.
    const flight = buildGeometry(preset('msl', 'sun', 'msl', [phase('cruise', 'cruise', CRUISE)]), files, OPTIONS)
    for (const s of [0, 1, 50.5, 200, CRUISE]) {
      const there = flight.at(CRUISE - s)
      const home = geometry.at(Math.min(back.fromDay + s, geometry.days))
      assert.deepEqual(home.craft, there.craft, `craft on return day ${s}`)
      assert.deepEqual(home.bodies, there.bodies, `planets on return day ${s}`)
      assert.equal(home.earthDistanceKm, there.earthDistanceKm)
      assert.equal(home.lightSeconds, there.lightSeconds)
      assert.equal(home.modelled, true)
      assert.equal(home.phaseId, 'return')
    }
    assert.ok(geometry.at(geometry.days).lightSeconds < 2)
    assert.equal(cruise.toDay, CRUISE)
  })

  it('marks the delay of the return as modelled, and only that', () => {
    for (const point of geometry.delay) assert.equal(point.modelled, point.day >= back.fromDay, `day ${point.day}`)
  })

  it('has a path with days that never go back, and body paths of the same length', () => {
    assert.equal(geometry.pathDays[0], 0)
    assert.equal(geometry.pathDays[geometry.pathDays.length - 1], geometry.days)
    for (let index = 1; index < geometry.pathDays.length; index++) assert.ok(geometry.pathDays[index] >= geometry.pathDays[index - 1])
    assert.equal(geometry.bodyPaths.earth.length, geometry.path.length)
    assert.equal(geometry.bodyPaths.mars.length, geometry.path.length)
    // Each path point is the place of at(), except at a day where the place jumps.
    const index = geometry.pathDays.findIndex((day) => day > 100)
    assert.deepEqual(geometry.path[index], geometry.at(geometry.pathDays[index]).craft)
  })

  it('works with a surface stay of 0 days', () => {
    const none = buildGeometry(reference, files, { ...OPTIONS, surfaceDays: 0 })
    assert.deepEqual(none.spans.map((span) => span.phase.id), ['cruise', 'return'])
    assert.equal(none.days, 2 * CRUISE)
    assert.deepEqual(none.at(CRUISE + 40).craft, none.at(CRUISE - 40).craft)
    assert.equal(none.at(CRUISE + 40).modelled, true)
    assert.equal(none.at(CRUISE - 40).modelled, false)
    // The path does not jump: the return starts where the cruise ends.
    assert.equal(none.pathDays.filter((day) => day === CRUISE).length, 1)
  })

  it('works with no return', () => {
    const oneWay = buildGeometry(reference, files, { ...OPTIONS, returnTrip: false })
    assert.deepEqual(oneWay.spans.map((span) => span.phase.id), ['cruise', 'surface'])
    assert.equal(oneWay.days, CRUISE + 30)
    const end = oneWay.at(oneWay.days)
    assert.deepEqual(end.craft, end.bodies.mars)
    assert.ok(oneWay.delay.every((point) => !point.modelled))
    const cruiseOnly = buildGeometry(reference, files, { ...OPTIONS, surfaceDays: 0, returnTrip: false })
    assert.equal(cruiseOnly.days, CRUISE)
    assert.equal(cruiseOnly.spans.length, 1)
  })

  it('works with the longest stay, with real planets on each day', () => {
    const long = buildGeometry(reference, files, { ...OPTIONS, surfaceDays: 600 })
    assert.equal(long.days, CRUISE + 600 + CRUISE)
    assert.equal(long.at(CRUISE + 599).modelled, false)
    assert.deepEqual(long.at(CRUISE + 599).bodies.mars, files.planets.bodies.mars[CRUISE + 599])
  })

  it('holds the place of the arrival if the planets file is absent', () => {
    const bare = buildGeometry(reference, { msl: files.msl }, OPTIONS)
    assert.equal(bare.days, geometry.days)
    assert.deepEqual(bare.at(CRUISE + 10).craft, bare.at(CRUISE).craft)
    assert.equal(bare.at(CRUISE + 10).modelled, true)
  })
})

describe('buildGeometry for the Moon', () => {
  it('follows the real flight of Artemis I and holds the last place after the end of the file', () => {
    const fileDays = lengthDays(files.artemis1)
    const artemis1 = preset('artemis1', 'earth', 'artemis1', [phase('belts', 'belts', 0.2), phase('cruise', 'cruise', 5), phase('orbit', 'orbit', 14), phase('return', 'return', 6.3)])
    const geometry = buildGeometry(artemis1, files, OPTIONS)
    assert.equal(geometry.frame, 'earth')
    near(geometry.days, 25.5, 1e-9)
    assert.ok(geometry.days > fileDays)
    assert.deepEqual(geometry.spans, timeline(artemis1, OPTIONS))
    assert.ok(geometry.delay.length >= 100)
    assert.ok(geometry.delay.every((point) => !point.modelled && point.seconds < 1.5))
    // The return is in the file. It is not a mirror of the flight to the Moon.
    assert.equal(geometry.at(22).modelled, false)
    assert.equal(geometry.at(22).phaseId, 'return')
    assert.notDeepEqual(geometry.at(22).craft, geometry.at(3.5).craft)
    // Orion went farther than the Moon.
    assert.ok(Math.max(...geometry.delay.map((point) => point.seconds)) > 1.4)
    const lastSample = files.artemis1.craft[files.artemis1.craft.length - 1]
    assert.deepEqual(geometry.at(geometry.days).craft, lastSample)
    assert.deepEqual(geometry.path[geometry.path.length - 1], lastSample)
    assert.ok(geometry.at(geometry.days).earthDistanceKm < 7000)
    assert.ok('moon' in geometry.at(3).bodies)
  })

  it('follows the real flight of Artemis II', () => {
    const artemis2 = preset('artemis2', 'earth', 'artemis2', [phase('cruise', 'cruise', 4), phase('return', 'return', 4.9)])
    const geometry = buildGeometry(artemis2, files, OPTIONS)
    const far = Math.max(...geometry.path.map((_, index) => geometry.at(geometry.pathDays[index]).earthDistanceKm))
    near(far, 413_146, 50)
    assert.equal(geometry.at(5).modelled, false)
  })

  it('puts the spacecraft at the Moon for a stay with no file of its own', () => {
    for (const id of ['lunar-orbit', 'lunar-surface', 'gateway'] as const) {
      const geometry = buildGeometry(preset(id, 'earth', null, [phase('stay', id === 'lunar-surface' ? 'surface' : 'orbit', 30)]), files, OPTIONS)
      assert.equal(geometry.days, 30)
      for (const day of [0, 7.25, 30]) {
        const place = geometry.at(day)
        assert.deepEqual(place.craft, place.bodies.moon)
        assert.equal(place.modelled, true)
        assert.ok(place.lightSeconds > 1.19 && place.lightSeconds < 1.36)
      }
      // The Moon goes round the Earth one time in about 27 days.
      assert.ok(apart(geometry.at(0).craft, geometry.at(13.7).craft) > 700_000)
      assert.equal(geometry.path.length, 30 * 24 + 1)
      assert.ok(geometry.delay.every((point) => point.modelled))
    }
  })
})

describe('buildGeometry for the ground track', () => {
  const track: TrajectoryFile = {
    file: 'iss',
    frame: 'ground',
    source: { ...SOURCE, retrievedAt: '', target: '' },
    startTime: '2026-01-01T00:00:00Z',
    stepHours: 1 / 60,
    craft: [
      [170, 10],
      [178, 20],
      [-174, 30],
      [-166, 40],
    ],
    bodies: {},
    earthDistanceKm: [6790, 6790, 6790, 6790],
    saa: [false, true, true, false],
    loop: true,
  }
  const iss = preset('iss', 'ground', 'iss', [phase('leo', 'leo', 180)])
  const minute = 1 / 1440

  it('runs through the samples again and again', () => {
    const geometry = buildGeometry(iss, { iss: track }, OPTIONS)
    assert.equal(geometry.frame, 'ground')
    assert.equal(geometry.days, 180)
    assert.deepEqual(geometry.path, track.craft)
    assert.deepEqual(geometry.bodyPaths, {})
    assert.deepEqual(geometry.at(0).craft, [170, 10])
    near(geometry.at(5 * minute).craft[0], 178, 1e-6)
    near(geometry.at((4 * 1000 + 3) * minute).craft[1], 40, 1e-6)
    assert.equal(geometry.at(minute).inSaa, true)
    assert.equal(geometry.at(3 * minute).inSaa, false)
    assert.equal(geometry.at(0).sunDistanceAu, null)
    assert.equal(geometry.delay.length, 181)
    assert.ok(geometry.delay.every((point) => point.seconds < 0.03))
  })

  it('takes the short way across the line of 180 degrees', () => {
    const geometry = buildGeometry(iss, { iss: track }, OPTIONS)
    const place = geometry.at(1.25 * minute)
    // 180 degrees east and 180 degrees west are the same line.
    near(Math.abs(place.craft[0]), 180, 1e-6)
    near(place.craft[1], 22.5, 1e-6)
    near(geometry.at(1.5 * minute).craft[0], -178, 1e-6)
  })

  it('gives an empty geometry that does not throw if the file is absent', () => {
    const geometry = buildGeometry(iss, {}, OPTIONS)
    assert.equal(geometry.days, 180)
    assert.equal(geometry.spans.length, 1)
    assert.deepEqual(geometry.path, [])
    assert.deepEqual(geometry.pathDays, [])
    assert.deepEqual(geometry.delay, [])
    assert.equal(geometry.at(12).phaseId, 'leo')
    assert.equal(geometry.at(12).day, 12)
  })

  it('reads the real file of the station', { skip: !files.iss }, () => {
    const geometry = buildGeometry(iss, files, OPTIONS)
    const loopDays = (files.iss.craft.length * files.iss.stepHours) / 24
    assert.equal(geometry.path.length, files.iss.craft.length)
    const place = geometry.at(0.3)
    assert.deepEqual(geometry.at(0.3 + 5 * loopDays).craft.map((value) => Math.round(value * 1e6)), place.craft.map((value) => Math.round(value * 1e6)))
    assert.equal(typeof place.inSaa, 'boolean')
    assert.ok(place.craft[0] >= -180 && place.craft[0] <= 180 && Math.abs(place.craft[1]) < 52)
    assert.ok(place.lightSeconds < 0.03)
  })
})

describe('buildGeometry for the custom flight', () => {
  it('uses the transfer orbit of the chosen length, as a model', () => {
    const custom = preset('custom', 'sun', null, [phase('cruise', 'cruise', 200)])
    for (const customDays of [1, 150, 200, 1200]) {
      const options = { ...OPTIONS, customDays }
      const geometry = buildGeometry(custom, {}, options)
      assert.equal(geometry.days, customDays)
      assert.deepEqual(geometry.spans, timeline(custom, options))
      assert.ok(geometry.path.length > 1)
      assert.ok(geometry.delay.length >= 100)
      assert.ok(geometry.delay.every((point) => point.modelled && Number.isFinite(point.seconds)))
      assert.equal(geometry.pathDays[geometry.pathDays.length - 1], customDays)
    }
  })
})

describe('buildGeometry for each preset of the app', () => {
  for (const real of PRESETS) {
    it(`builds "${real.id}" with its first settings`, () => {
      const options = defaultTrip(real)
      const geometry = buildGeometry(real, files, options)
      const spans = timeline(real, options)
      assert.deepEqual(geometry.spans, spans)
      assert.equal(geometry.days, missionDays(spans))
      near(geometry.days, spans.reduce((sum, span) => sum + span.phase.days, 0), 1e-9)
      assert.equal(geometry.frame, real.frame)
      assert.equal(geometry.pathDays.length, geometry.path.length)
      for (const points of Object.values(geometry.bodyPaths)) assert.equal(points.length, geometry.path.length)
      for (let index = 1; index < geometry.pathDays.length; index++) assert.ok(geometry.pathDays[index] >= geometry.pathDays[index - 1])
      for (const day of [0, geometry.days / 3, geometry.days - 0.01, geometry.days]) {
        const place = geometry.at(day)
        assert.ok(Number.isFinite(place.craft[0]) && Number.isFinite(place.craft[1]) && Number.isFinite(place.lightSeconds))
        assert.ok(spans.some((span) => span.phase.id === place.phaseId))
      }
      if (real.id === 'iss' && !files.iss) return
      assert.ok(geometry.path.length > 1)
      assert.ok(geometry.delay.length >= 100)
      assert.equal(geometry.delay[0].day, 0)
      near(geometry.delay[geometry.delay.length - 1].day, geometry.days, 1e-9)
    })

    it(`builds "${real.id}" with no files and does not throw`, () => {
      const geometry = buildGeometry(real, {}, defaultTrip(real))
      assert.equal(geometry.days, missionDays(geometry.spans))
      assert.ok(Number.isFinite(geometry.at(1).lightSeconds))
      if (real.trajectory.file !== null || real.frame !== 'sun') assert.deepEqual(geometry.path, [])
    })
  }
})
