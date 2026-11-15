import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { earthRotation, groundPoint, groundTrack, inSaa, parseTle, saaPasses, SAA_LIMITS, SAA_REGION } from './groundtrack.ts'

// The element set of the station from CelesTrak, read on 15 November 2026.
const TLE = `ISS (ZARYA)
1 25544U 98067A   26318.94812294  .00009771  00000+0  18276-3 0  9999
2 25544  51.6323 274.0377 0007413  26.4902 333.6464 15.49382049595126`

const MINUTE = 60_000

// The distance between two points on the ground, in km.
function groundKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const rad = Math.PI / 180
  const h = Math.sin(((a.latitude - b.latitude) * rad) / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(((a.longitude - b.longitude) * rad) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

// The times when the track crosses the equator to the north, with the longitude there.
// The search uses a step of 1 second and then a straight line between the two samples.
function northCrossings(elements: ReturnType<typeof parseTle>, startMs: number, minutes: number) {
  const crossings: { ms: number; longitude: number }[] = []
  let before = groundPoint(elements, startMs)
  for (let ms = startMs + 1000; ms <= startMs + minutes * MINUTE; ms += 1000) {
    const now = groundPoint(elements, ms)
    if (before.latitude < 0 && now.latitude >= 0) {
      const part = -before.latitude / (now.latitude - before.latitude)
      crossings.push({ ms: ms - 1000 + part * 1000, longitude: before.longitude + part * (now.longitude - before.longitude) })
    }
    before = now
  }
  return crossings
}

describe('parseTle', () => {
  it('reads the elements of the station', () => {
    const elements = parseTle(TLE)
    assert.equal(elements.name, 'ISS (ZARYA)')
    assert.equal(elements.catalogNumber, 25544)
    // CelesTrak gives the same epoch in its JSON format: 2026-11-14T22:45:17.822016.
    assert.equal(new Date(elements.epochMs).toISOString(), '2026-11-14T22:45:17.822Z')
    assert.equal(elements.inclinationDeg, 51.6323)
    assert.equal(elements.nodeDeg, 274.0377)
    assert.equal(elements.eccentricity, 0.0007413)
    assert.equal(elements.perigeeDeg, 26.4902)
    assert.equal(elements.meanAnomalyDeg, 333.6464)
    assert.equal(elements.meanMotion, 15.49382049)
    assert.equal(elements.meanMotionDotHalf, 0.00009771)
  })

  it('reads a set with no name line', () => {
    const elements = parseTle(TLE.split('\n').slice(1).join('\r\n'))
    assert.equal(elements.name, '')
    assert.equal(elements.meanMotion, 15.49382049)
  })

  it('refuses a damaged set', () => {
    assert.throws(() => parseTle('not an element set'), /two-line/)
    // One digit of the inclination is changed, so the check digit of line 2 is wrong.
    assert.throws(() => parseTle(TLE.replace('51.6323', '51.6324')), /check digit of line 2/)
  })
})

describe('earthRotation', () => {
  it('gives the sidereal time of Greenwich', () => {
    // Meeus, Astronomical Algorithms, example 12.b: 10 April 1987, 19:21:00 UT gives 8 h 34 min 57.0896 s.
    const hours = (earthRotation(Date.UTC(1987, 3, 10, 19, 21, 0)) * 12) / Math.PI
    assert.ok(Math.abs(hours - (8 + 34 / 60 + 57.0896 / 3600)) < 1e-6, `${hours}`)
  })

  it('turns one time in one sidereal day', () => {
    const start = Date.UTC(2026, 10, 15)
    const siderealDayMs = 86_164_090.5
    const difference = Math.abs(earthRotation(start + siderealDayMs) - earthRotation(start))
    assert.ok(Math.min(difference, 2 * Math.PI - difference) < 1e-6)
  })
})

describe('groundPoint', () => {
  const elements = parseTle(TLE)
  const start = Date.UTC(2026, 10, 15)
  const track = groundTrack(elements, start, 1, 3 * 1440)

  it('keeps the latitude inside the limit of the inclination', () => {
    const north = Math.max(...track.map((point) => point.latitude))
    const south = Math.min(...track.map((point) => point.latitude))
    // The orbit is tilted by 51.63 degrees. The latitude of a map (on the flattened Earth) is up to 0.2 degrees more.
    assert.ok(north > 51.5 && north < 51.9, `north ${north}`)
    assert.ok(south < -51.5 && south > -51.9, `south ${south}`)
  })

  it('keeps the longitude from -180 to 180 and the altitude near 400 km', () => {
    for (const point of track) {
      assert.ok(point.longitude >= -180 && point.longitude <= 180)
      assert.ok(point.altitudeKm > 400 && point.altitudeKm < 450, `altitude ${point.altitudeKm}`)
      assert.ok(point.earthDistanceKm > 6770 && point.earthDistanceKm < 6820, `distance ${point.earthDistanceKm}`)
    }
  })

  it('takes about 93 minutes for one orbit', () => {
    const crossings = northCrossings(elements, start, 400)
    assert.ok(crossings.length >= 4)
    for (let index = 1; index < crossings.length; index++) {
      const minutes = (crossings[index].ms - crossings[index - 1].ms) / MINUTE
      assert.ok(minutes > 92.5 && minutes < 93.2, `period ${minutes}`)
    }
  })

  it('moves each orbit about 23.6 degrees to the west', () => {
    // The Earth turns 23.3 degrees in one orbit, and the plane of the orbit turns 0.3 degrees the other way.
    const crossings = northCrossings(elements, start, 400)
    for (let index = 1; index < crossings.length; index++) {
      const shift = (((crossings[index - 1].longitude - crossings[index].longitude) % 360) + 360) % 360
      assert.ok(shift > 23.3 && shift < 23.9, `shift ${shift}`)
    }
  })

  it('agrees with an independent SGP4 service', () => {
    // The service https://api.wheretheiss.at (route /v1/satellites/25544/positions) runs SGP4 with
    // this element set, which it gave on 15 November 2026 (route /v1/satellites/25544/tles).
    // The values below are its answers for four times.
    const service = parseTle(`ISS (ZARYA)
1 25544U 98067A   26317.91612726  .00008668  00000+0  16320-3 0  9995
2 25544  51.6324 279.1461 0007381  22.6178 337.5134 15.49359724594966`)
    const answers = [
      { seconds: 1794700800, latitude: -47.788572935019, longitude: 159.46923187232, altitude: 435.33822743968 },
      { seconds: 1794744000, latitude: -16.043253686849, longitude: -130.20300062676, altitude: 427.65194869346 },
      { seconds: 1794744855, latitude: -49.575149652475, longitude: -79.356163026547, altitude: 438.83018764875 },
      { seconds: 1794787200, latitude: 47.098312355496, longitude: -24.159074725465, altitude: 422.68497331979 },
    ]
    for (const answer of answers) {
      const mine = groundPoint(service, answer.seconds * 1000)
      const km = groundKm(mine, answer)
      assert.ok(km < 3, `${km} km on the ground at ${answer.seconds}`)
      assert.ok(Math.abs(mine.altitudeKm - answer.altitude) < 0.5, `altitude ${mine.altitudeKm} at ${answer.seconds}`)
    }
  })
})

describe('the South Atlantic Anomaly', () => {
  it('has an outline inside the limits of the source', () => {
    assert.ok(SAA_REGION.length >= 12)
    const longitudes = SAA_REGION.map((point) => point[0])
    const latitudes = SAA_REGION.map((point) => point[1])
    assert.equal(Math.min(...longitudes), SAA_LIMITS.west)
    assert.equal(Math.max(...longitudes), SAA_LIMITS.east)
    assert.equal(Math.min(...latitudes), SAA_LIMITS.south)
    assert.equal(Math.max(...latitudes), SAA_LIMITS.north)
  })

  it('knows a point inside and a point outside', () => {
    // Inside: the south of Brazil and the ocean east of it.
    assert.equal(inSaa(-45, -25), true)
    assert.equal(inSaa(-25, -25), true)
    assert.equal(inSaa(-80, -25), true)
    // The same point with a longitude from 0 to 360.
    assert.equal(inSaa(315, -25), true)
    // Outside: Europe, the North Atlantic, the Pacific, Australia, and the corners of the box of the limits.
    assert.equal(inSaa(10, 50), false)
    assert.equal(inSaa(-45, 25), false)
    assert.equal(inSaa(-150, -25), false)
    assert.equal(inSaa(135, -25), false)
    assert.equal(inSaa(-89, -49), false)
    assert.equal(inSaa(39, -1), false)
    assert.equal(inSaa(Number.NaN, 0), false)
  })

  it('counts the passes', () => {
    const result = saaPasses([false, true, true, false, false, true, true, true, false, true], 1)
    assert.equal(result.passes, 3)
    assert.equal(result.minutes, 6)
    assert.equal(result.longestMinutes, 3)
    assert.equal(saaPasses([], 1).passes, 0)
    // One full day of samples: the means for each day are the totals.
    const day = Array.from({ length: 1440 }, (_, index) => index >= 100 && index < 110)
    assert.deepEqual(saaPasses(day, 1), { passes: 1, minutes: 10, minutesPerDay: 10, passesPerDay: 1, longestMinutes: 10 })
  })

  it('finds passes of the station on each day', () => {
    const elements = parseTle(TLE)
    const track = groundTrack(elements, Date.UTC(2026, 10, 15), 1, 3 * 1440)
    const result = saaPasses(
      track.map((point) => inSaa(point.longitude, point.latitude)),
      1,
    )
    assert.ok(result.passesPerDay >= 4 && result.passesPerDay <= 12, `passes ${result.passesPerDay}`)
    assert.ok(result.longestMinutes <= 30, `longest ${result.longestMinutes}`)
  })
})
