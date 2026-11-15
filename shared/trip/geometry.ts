// The geometry of one mission: where the spacecraft, the Earth, the Moon, and Mars are on each
// mission day, and how long light needs between the Earth and the spacecraft.
//
// The phases and their days come from timeline(), so the geometry and the radiation forecast
// agree on the days. The places come from the trajectory files (web/src/trip/data/*.json).
//
// How a mission day maps to a file:
//   - Mission day 0 is the first sample of the file. For a real flight, that is the first moment
//     that the source has, a short time after the launch (MSL: 49 minutes. Artemis I: 2 hours.
//     Artemis II: 3.4 hours. ExoMars TGO: 10.7 hours, when the upper stage released it).
//   - One mission day is one day of the file. The code stretches nothing. If the phases are
//     shorter than the file, the mission ends before the last sample. If the phases are longer
//     than the file, the spacecraft and the bodies hold their last place after the end of the file.
//   - A file with "loop" (the ground track of the station) starts again after its last sample.
//   - If a file is not in "files", the geometry has an empty path and an empty delay, and at()
//     gives a place with zeros. Nothing throws. Check "path.length" before you draw.
//
// The light time is the distance from the middle of the Earth to the spacecraft divided by the
// speed of light. For the station that is about 0.02 seconds, so the page can show "no delay".
import { missionDays, spanAt, timeline, type TripOptions } from './timeline.ts'
import { transferTrajectory } from './transfer.ts'
import { LIGHT_KM_PER_SECOND, type Geometry, type PhaseSpan, type Place, type Point, type Preset, type TrajectoryFile } from './types.ts'

// The one-way light time for a distance, in seconds.
export function lightSeconds(km: number): number {
  return km / LIGHT_KM_PER_SECOND
}

// A place with no day and no phase.
type Spot = Pick<Place, 'craft' | 'bodies' | 'earthDistanceKm' | 'sunDistanceAu' | 'inSaa' | 'modelled'>

// A part of the mission that reads its places in one way.
type Leg = {
  fromDay: number
  toDay: number
  // The place at a mission day inside the leg.
  spot: (day: number) => Spot
  // The mission days of the leg that go into the path of the map: its two ends, and each day
  // between them where the file has a sample.
  pathDays: number[]
}

const NOWHERE: Spot = { craft: [0, 0], bodies: {}, earthDistanceKm: 0, sunDistanceAu: null, inSaa: null, modelled: true }
const MS_PER_DAY = 86_400_000
const TINY = 1e-9

const mix = (a: number, b: number, t: number) => a + (b - a) * t

// The length of a file in days, from its first sample to its last.
const lengthDays = (file: TrajectoryFile) => (Math.max(file.craft.length - 1, 0) * file.stepHours) / 24

// The place at a day of the file (0 is the first sample). Between two samples the place is on
// the straight line between them. Before the first sample and after the last, the place holds.
function read(file: TrajectoryFile, fileDay: number, modelled: boolean): Spot {
  const count = file.craft.length
  let position = (fileDay * 24) / file.stepHours
  let from: number
  let to: number
  if (file.loop) {
    // The sample after the last one is the first one.
    position = ((position % count) + count) % count
    from = Math.min(Math.floor(position), count - 1)
    to = (from + 1) % count
  } else {
    position = Math.min(Math.max(position, 0), count - 1)
    from = Math.min(Math.floor(position), count - 1)
    to = Math.min(from + 1, count - 1)
  }
  const t = position - from
  const ground = file.frame === 'ground'
  const point = (points: Point[]): Point => {
    const a = points[from]
    const b = points[to]
    if (!ground) return [mix(a[0], b[0], t), mix(a[1], b[1], t)]
    // Longitude: go the short way round the Earth, and stay between -180 and 180 degrees.
    const turn = ((((b[0] - a[0] + 180) % 360) + 360) % 360) - 180
    const longitude = ((((a[0] + turn * t + 180) % 360) + 360) % 360) - 180
    return [longitude, mix(a[1], b[1], t)]
  }
  const nearest = t < 0.5 ? from : to
  return {
    craft: point(file.craft),
    bodies: Object.fromEntries(Object.entries(file.bodies).map(([name, points]) => [name, point(points)])),
    earthDistanceKm: mix(file.earthDistanceKm[from], file.earthDistanceKm[to], t),
    sunDistanceAu: file.sunDistanceAu ? mix(file.sunDistanceAu[from], file.sunDistanceAu[to], t) : null,
    inSaa: ground && file.saa ? file.saa[nearest] : null,
    modelled,
  }
}

// The days of the samples of a file that are after "after" and before "before" (file days).
function sampleDays(file: TrajectoryFile, after: number, before: number): number[] {
  const perDay = 24 / file.stepHours
  const first = Math.max(Math.floor(after * perDay + TINY) + 1, 0)
  const last = Math.min(Math.ceil(before * perDay - TINY) - 1, file.craft.length - 1)
  const days: number[] = []
  for (let index = first; index <= last; index++) days.push(index / perDay)
  return days
}

const usable = (file: TrajectoryFile | undefined): file is TrajectoryFile => Boolean(file && file.craft.length > 0 && file.stepHours > 0)

// A leg that reads the file at the mission day.
function directLeg(file: TrajectoryFile, fromDay: number, toDay: number, modelled: boolean): Leg {
  return { fromDay, toDay, spot: (day) => read(file, day, modelled), pathDays: [fromDay, ...sampleDays(file, fromDay, toDay), toDay] }
}

// The map of the Earth: the mission day runs through the ground track again and again. The path
// is the track one time.
function groundLegs(file: TrajectoryFile, days: number): Leg[] {
  if (!file.loop) return [directLeg(file, 0, days, false)]
  const pathDays = file.craft.map((_, index) => (index * file.stepHours) / 24).filter((day) => day <= days)
  return [{ fromDay: 0, toDay: days, spot: (day) => read(file, day, false), pathDays }]
}

// The map of the Sun: a flight to Mars from a file, then a stay at Mars, then a return flight.
// The MSL and TGO presets have the flight only.
function sunLegs(preset: Preset, spans: PhaseSpan[], cruise: TrajectoryFile, planets: TrajectoryFile | undefined, modelled: boolean): Leg[] {
  const isReturn = (span: PhaseSpan) => span.phase.id === preset.returnTrip?.phaseId || span.phase.kind === 'return'
  const isStay = (span: PhaseSpan) => !isReturn(span) && (span.phase.kind === 'surface' || span.phase.kind === 'orbit')
  // The mission day when the flight to Mars ends.
  const arrival = spans.find((span) => isStay(span) || isReturn(span))?.fromDay ?? missionDays(spans)
  // The file of the planets counts its days from another moment than the file of the flight.
  const planetsAhead = usable(planets) ? (Date.parse(cruise.startTime) - Date.parse(planets.startTime)) / MS_PER_DAY : Number.NaN

  return spans.map((span): Leg => {
    const { fromDay, toDay } = span
    if (isReturn(span)) {
      // A model, not a real flight: the return is the flight to Mars in reverse. On return day s,
      // the spacecraft and the planets are where they were on flight day (arrival - s). So the
      // planets jump at the start of the return. A real return waits for the right launch window.
      // If the return is longer than the flight to Mars, the last days hold the place of day 0.
      const fileDay = (day: number) => Math.max(arrival - (day - fromDay), 0)
      const between = sampleDays(cruise, fileDay(toDay), fileDay(fromDay)).map((sample) => fromDay + arrival - sample)
      return { fromDay, toDay, spot: (day) => read(cruise, fileDay(day), true), pathDays: [fromDay, ...between.reverse(), toDay] }
    }
    if (isStay(span)) {
      if (usable(planets) && Number.isFinite(planetsAhead)) {
        // The spacecraft is at Mars. The Earth and Mars are at their real places for the date:
        // the date of the first sample of the flight plus the mission day. So the light time is
        // real. After the last sample of the planets file, the places hold, and that is a model.
        const end = lengthDays(planets)
        const fileDay = (day: number) => day + planetsAhead
        const real = (day: number) => fileDay(day) >= -TINY && fileDay(day) <= end + TINY
        const between = sampleDays(planets, fileDay(fromDay), fileDay(toDay)).map((sample) => sample - planetsAhead)
        return { fromDay, toDay, spot: (day) => read(planets, fileDay(day), modelled || !real(day)), pathDays: [fromDay, ...between, toDay] }
      }
      // No planets file: all holds the place of the arrival. That is a model.
      return { fromDay, toDay, spot: () => read(cruise, arrival, true), pathDays: [fromDay, toDay] }
    }
    return directLeg(cruise, fromDay, toDay, modelled)
  })
}

function makeLegs(preset: Preset, files: Record<string, TrajectoryFile>, options: TripOptions, spans: PhaseSpan[]): Leg[] {
  const days = missionDays(spans)
  if (!(days > 0)) return []
  const named = preset.trajectory.file === null ? undefined : files[preset.trajectory.file]

  if (preset.frame === 'ground') return usable(named) ? groundLegs(named, days) : []

  if (preset.frame === 'earth') {
    // A real flight to the Moon: the whole mission is in the file, with its return.
    if (preset.trajectory.file !== null) return usable(named) ? [directLeg(named, 0, days, false)] : []
    // A stay at the Moon with no file of its own (lunar orbit, lunar surface, Gateway): the
    // spacecraft is at the place of the Moon. An orbit of 100 km is far below the scale of the
    // map. The place of the Moon is real, the place of the spacecraft is a model. The Earth
    // distance is the distance of the Moon.
    return usable(files.moon) ? [directLeg(files.moon, 0, days, true)] : []
  }

  // The map of the Sun. With no file, the app computes a transfer orbit of the chosen length.
  const cruise = preset.trajectory.file === null ? transferTrajectory(options.customDays) : named
  return usable(cruise) ? sunLegs(preset, spans, cruise, files.planets, preset.trajectory.file === null) : []
}

// "files" maps the name of a trajectory file, without ".json", to its content.
export function buildGeometry(preset: Preset, files: Record<string, TrajectoryFile>, options: TripOptions): Geometry {
  const spans = timeline(preset, options)
  const days = missionDays(spans)
  const legs = makeLegs(preset, files, options, spans)

  const at = (day: number): Place => {
    // A day outside the mission gives the first or the last day.
    const inside = Math.min(Math.max(Number.isFinite(day) ? day : 0, 0), days)
    const leg = legs.find((candidate) => inside < candidate.toDay) ?? legs[legs.length - 1]
    const spot = leg ? leg.spot(inside) : NOWHERE
    return { day: inside, ...spot, lightSeconds: lightSeconds(spot.earthDistanceKm), phaseId: spans.length ? spanAt(spans, inside).phase.id : '' }
  }

  // The path for the map. Where two legs meet at the same place, the path keeps one point.
  // Where the place jumps (the start of a modelled return), the path keeps both points.
  const path: Point[] = []
  const pathDays: number[] = []
  const bodyPaths: Record<string, Point[]> = {}
  let last: Spot | null = null
  for (const leg of legs) {
    for (const day of leg.pathDays) {
      const spot = leg.spot(day)
      const index = path.length
      if (last && pathDays[index - 1] === day && last.craft[0] === spot.craft[0] && last.craft[1] === spot.craft[1]) continue
      path.push(spot.craft)
      pathDays.push(day)
      for (const name of new Set([...Object.keys(bodyPaths), ...Object.keys(spot.bodies)])) {
        const points = (bodyPaths[name] ??= [])
        // Each body path has one point for each point of the path. A body that a leg does not
        // have keeps its last place.
        while (points.length < index) points.push(points[points.length - 1] ?? spot.bodies[name] ?? spot.craft)
        points.push(spot.bodies[name] ?? points[points.length - 1])
      }
      last = spot
    }
  }

  // The light time for the chart: one point for each day and one for the end of the mission.
  // A mission of less than 100 days gets 101 points with equal steps.
  const delayDays: number[] = []
  if (legs.length && days >= 100) {
    for (let day = 0; day <= days; day++) delayDays.push(day)
    if (delayDays[delayDays.length - 1] < days) delayDays.push(days)
  } else if (legs.length) {
    for (let index = 0; index <= 100; index++) delayDays.push((index * days) / 100)
  }
  const delay = delayDays.map((day) => {
    const place = at(day)
    return { day, seconds: place.lightSeconds, modelled: place.modelled }
  })

  return { frame: preset.frame, days, spans, path, pathDays, bodyPaths, delay, at }
}
