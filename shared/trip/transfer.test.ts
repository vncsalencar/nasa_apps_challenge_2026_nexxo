import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { EARTH_ORBIT_AU, EARTH_PERIOD_DAYS, HOHMANN_DAYS, MARS_ORBIT_AU, MARS_PERIOD_DAYS, SUN_GM, transferIsPhysical, transferNote, transferTrajectory } from './transfer.ts'
import { KM_PER_AU, type Point, type TrajectoryFile } from './types.ts'

const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1])
const last = <T>(list: T[]) => list[list.length - 1]

// The area of the triangle between the Sun and each pair of samples that follow each other, in AU^2.
function areas(path: Point[]) {
  return path.slice(1).map((point, index) => Math.abs(path[index][0] * point[1] - path[index][1] * point[0]) / 2)
}

function everyNumber(file: TrajectoryFile) {
  return [...file.craft.flat(), ...file.bodies.earth.flat(), ...file.bodies.mars.flat(), ...file.earthDistanceKm, ...(file.sunDistanceAu ?? []), file.stepHours]
}

describe('transferTrajectory', () => {
  it('gives a file of the sun frame with one sample each day', () => {
    const file = transferTrajectory(200)
    assert.equal(file.frame, 'sun')
    assert.equal(file.file, 'custom')
    assert.equal(file.stepHours, 24)
    assert.equal(file.craft.length, 201)
    assert.equal(file.bodies.earth.length, 201)
    assert.equal(file.bodies.mars.length, 201)
    assert.equal(file.earthDistanceKm.length, 201)
    assert.equal(file.sunDistanceAu?.length, 201)
    assert.deepEqual(file.source, { short: 'Computed by this app', title: 'Simple transfer orbit between two circular orbits in one plane', url: '', retrievedAt: '', target: 'custom' })
    assert.ok(!Number.isNaN(Date.parse(file.startTime)))
    // The same input gives the same file.
    assert.deepEqual(transferTrajectory(200), file)
  })

  it('starts at the Earth and ends at Mars, for many flight times', () => {
    for (const days of [1, 2, 10, 30, 69.9, 90, 150, 180, 250, 258, HOHMANN_DAYS, 259, 260, 300, 500, 777.7, 1200]) {
      const file = transferTrajectory(days)
      const sun = file.sunDistanceAu ?? []
      assert.ok(distance(file.craft[0], file.bodies.earth[0]) < 1e-9, `start at ${days} days`)
      assert.ok(distance(last(file.craft), last(file.bodies.mars)) < 0.001, `end at ${days} days: ${distance(last(file.craft), last(file.bodies.mars))}`)
      assert.ok(Math.abs(sun[0] - 1) < 1e-9, `first Sun distance at ${days} days`)
      assert.ok(Math.abs(last(sun) - 1.524) < 1e-6, `last Sun distance at ${days} days: ${last(sun)}`)
      // The spacecraft moves away from the Sun during the whole flight.
      for (let index = 1; index < sun.length; index++) assert.ok(sun[index] >= sun[index - 1] - 1e-9, `Sun distance falls at ${days} days, sample ${index}`)
      // The length of the file is the flight time.
      assert.ok(Math.abs(((file.craft.length - 1) * file.stepHours) / 24 - days) < 1e-9, `length at ${days} days`)
    }
  })

  it('moves each planet on its circle with its period', () => {
    const file = transferTrajectory(400)
    const { earth, mars } = file.bodies
    for (const point of earth) assert.ok(Math.abs(Math.hypot(...point) - EARTH_ORBIT_AU) < 1e-12)
    for (const point of mars) assert.ok(Math.abs(Math.hypot(...point) - MARS_ORBIT_AU) < 1e-12)
    // The angle of one day.
    const turn = (path: Point[]) => Math.atan2(path[0][0] * path[1][1] - path[0][1] * path[1][0], path[0][0] * path[1][0] + path[0][1] * path[1][1])
    assert.ok(Math.abs((2 * Math.PI) / turn(earth) - EARTH_PERIOD_DAYS) < 1e-6)
    assert.ok(Math.abs((2 * Math.PI) / turn(mars) - MARS_PERIOD_DAYS) < 1e-6)
  })

  it('gives the distance between the two planets as the Earth distance at arrival', () => {
    for (const days of [30, 180, HOHMANN_DAYS, 600]) {
      const file = transferTrajectory(days)
      const planets = distance(last(file.bodies.earth), last(file.bodies.mars)) * KM_PER_AU
      assert.ok(Math.abs(last(file.earthDistanceKm) - planets) < 0.001 * KM_PER_AU, `arrival at ${days} days`)
      assert.equal(file.earthDistanceKm[0], 0)
    }
  })

  it('takes about 259 days for the Hohmann transfer, which is half of an ellipse', () => {
    assert.ok(HOHMANN_DAYS > 258 && HOHMANN_DAYS < 260, `${HOHMANN_DAYS}`)
    const file = transferTrajectory(HOHMANN_DAYS)
    const end = last(file.craft)
    // The arrival is on the other side of the Sun, opposite to the start.
    assert.ok(Math.abs(end[0] + MARS_ORBIT_AU) < 1e-6 && Math.abs(end[1]) < 1e-6, `end ${end}`)
    // Each point is on the ellipse with the Sun at one focus: r = p / (1 + e cos(angle)).
    const a = (EARTH_ORBIT_AU + MARS_ORBIT_AU) / 2
    const e = (MARS_ORBIT_AU - EARTH_ORBIT_AU) / (MARS_ORBIT_AU + EARTH_ORBIT_AU)
    for (const point of file.craft) {
      const angle = Math.atan2(point[1], point[0])
      assert.ok(Math.abs(Math.hypot(...point) - (a * (1 - e * e)) / (1 + e * Math.cos(angle))) < 1e-9)
    }
  })

  it('follows the law of Kepler on the Hohmann transfer: equal areas in equal times', () => {
    const file = transferTrajectory(HOHMANN_DAYS)
    const list = areas(file.craft)
    const mean = list.reduce((sum, value) => sum + value, 0) / list.length
    for (const value of list) assert.ok(Math.abs(value / mean - 1) < 0.01, `area ${value} against ${mean}`)
    // The area of each day is also the area that the pull of the Sun gives: half of sqrt(GM p) for each day.
    const a = (EARTH_ORBIT_AU + MARS_ORBIT_AU) / 2
    const e = (MARS_ORBIT_AU - EARTH_ORBIT_AU) / (MARS_ORBIT_AU + EARTH_ORBIT_AU)
    const expected = (Math.sqrt(SUN_GM * a * (1 - e * e)) / 2) * (file.stepHours / 24)
    assert.ok(Math.abs(mean / expected - 1) < 0.001, `${mean} against ${expected}`)
  })

  it('follows the laws of Kepler on a shorter flight, on an ellipse and on a hyperbola', () => {
    // 150 and 100 days give an ellipse, and 30 days gives a hyperbola.
    for (const days of [150, 100, 30]) {
      const file = transferTrajectory(days)
      const list = areas(file.craft)
      const mean = list.reduce((sum, value) => sum + value, 0) / list.length
      for (const value of list) assert.ok(Math.abs(value / mean - 1) < 0.01, `area ${value} against ${mean} at ${days} days`)
      // The total area gives the angular momentum h. With the Sun at the focus and the nearest
      // point at 1 AU, the path is r = p / (1 + e cos(angle)) with p = h^2 / GM and e = p - 1.
      // The triangles are a little smaller than the true area, so compare with a tolerance of 1%.
      const h = (2 * mean) / (file.stepHours / 24)
      const end = last(file.craft)
      const angle = Math.atan2(end[1], end[0])
      const p = (MARS_ORBIT_AU * (1 - Math.cos(angle))) / (1 - MARS_ORBIT_AU * Math.cos(angle))
      assert.ok(Math.abs(h / Math.sqrt(SUN_GM * p) - 1) < 0.01, `angular momentum at ${days} days: ${h} against ${Math.sqrt(SUN_GM * p)}`)
      for (const point of file.craft) {
        const at = Math.atan2(point[1], point[0])
        assert.ok(Math.abs(Math.hypot(...point) - p / (1 + (p - 1) * Math.cos(at))) < 1e-9, `shape at ${days} days`)
      }
      if (days === 30) assert.ok(p - 1 > 1, 'the path of 30 days is a hyperbola')
      if (days === 150) assert.ok(p - 1 < 1, 'the path of 150 days is an ellipse')
    }
  })

  it('makes the path of a longer flight the Hohmann ellipse with a slower clock', () => {
    const hohmann = transferTrajectory(HOHMANN_DAYS)
    const long = transferTrajectory(HOHMANN_DAYS * 2)
    assert.ok(distance(last(long.craft), last(hohmann.craft)) < 1e-9)
    assert.equal(transferIsPhysical(HOHMANN_DAYS * 2), false)
    assert.equal(transferIsPhysical(HOHMANN_DAYS), true)
    assert.equal(transferIsPhysical(259), true)
    assert.equal(transferIsPhysical(100), true)
    assert.match(transferNote(600), /Not a physical path/)
    assert.match(transferNote(259), /Hohmann/)
    assert.match(transferNote(120), /faster/)
  })

  it('changes smoothly with the flight time', () => {
    // A small change of the flight time moves the arrival point by a small distance, also across the Hohmann time.
    for (const days of [1, 5, 69.9, 150, 250, HOHMANN_DAYS - 0.01, HOHMANN_DAYS, 400]) {
      const a = last(transferTrajectory(days).craft)
      const b = last(transferTrajectory(days + 0.01).craft)
      assert.ok(distance(a, b) < 0.01, `jump of ${distance(a, b)} AU at ${days} days`)
    }
    // No sample is far from the sample before it, for a flight of 10 days or more.
    for (const days of [10, 69.9, 150, 259, 1200]) {
      const file = transferTrajectory(days)
      for (let index = 1; index < file.craft.length; index++) assert.ok(distance(file.craft[index], file.craft[index - 1]) < 0.2, `step at ${days} days`)
    }
  })

  it('gives finite numbers for each whole number of days from 1 to 1200', () => {
    for (let days = 1; days <= 1200; days++) {
      const file = transferTrajectory(days)
      assert.equal(file.craft.length, days + 1)
      assert.ok(file.craft.length >= 2)
      assert.ok(everyNumber(file).every(Number.isFinite), `${days} days`)
      assert.ok(distance(last(file.craft), last(file.bodies.mars)) < 0.001, `end at ${days} days`)
    }
  })

  it('gives finite numbers for extreme values of days', () => {
    for (const days of [0, -5, 0.001, 0.4, 1.4, 1199.6, 5000, 1e12, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN]) {
      const file = transferTrajectory(days)
      assert.ok(file.craft.length >= 2, `${days} days`)
      assert.ok(file.craft.length <= 1201, `${days} days`)
      assert.ok(everyNumber(file).every(Number.isFinite), `${days} days`)
      assert.ok(distance(last(file.craft), last(file.bodies.mars)) < 0.001, `end at ${days} days`)
      assert.equal(typeof transferNote(days), 'string')
    }
  })
})
