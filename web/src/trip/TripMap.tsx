// The 2D map of a mission. It shows where the spacecraft is on a mission day, the path that it
// flew, the path ahead, and the bodies. The map has three kinds, one for each frame of the geometry:
//   sun     the Sun in the middle, with the Earth and Mars. A point is in AU.
//   earth   the Earth in the middle, with the Moon. A point is in km.
//   ground  a flat map of the Earth with the ground track of a station. A point is [longitude, latitude].
// The drawing is plain SVG. One unit of the SVG is one pixel of the screen, so a label has the same
// size on a phone and on a large screen, and the code can keep the labels apart.
import { memo, useEffect, useEffectEvent, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Frame, Geometry, Place, Point } from '../../../shared/trip/types.ts'
import { fmt, lang, t } from '../i18n.ts'
import landRings from './data/land.json'
import './map.css'

const EARTH_RADIUS_KM = 6371
const MOON_RADIUS_KM = 1737
// The size of the map before the page measured its box.
const FIRST_WIDTH = 640

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))
const isPoint = (point: Point | undefined): point is Point => !!point && Number.isFinite(point[0]) && Number.isFinite(point[1])

// The place at a mission day, or null if the geometry has no data for it.
function placeAt(geometry: Geometry, day: number): Place | null {
  try {
    const place = geometry.at(day)
    return place && isPoint(place.craft) ? place : null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------------------
// From a point of the geometry to a point of the drawing
// ---------------------------------------------------------------------------------------
// A "unit point" does not depend on the size of the map. The sun map and the earth map: from -1 to 1,
// with the middle body at 0. The ground map: the longitude and the latitude in degrees, north up.
function unitOf(frame: Frame, reach: number): (point: Point) => Point {
  if (frame === 'ground') return ([lon, lat]) => [lon, -lat]
  return ([x, y]) => [x / reach, -y / reach]
}
const text = (value: number, decimals: number) => String(+value.toFixed(decimals))

// One part of the path with one line style. "at" has the text of each point for the SVG path, "xy" has its two numbers.
type Piece = { at: string[]; xy: number[]; days: number[]; modelled: boolean; saa: boolean; whole: string }
type World = {
  // True if the geometry has no path.
  empty: boolean
  // The sun map and the earth map: the largest distance from the middle on one axis.
  reach: number
  pieces: Piece[]
  // The path of each body, as an SVG path.
  orbits: { name: string; d: string }[]
  hasModelled: boolean
  hasSaa: boolean
  // The ground map: the first day of the path, and the days of one turn of the track around the map. Infinity: the track does not go around.
  firstDay: number
  lap: number
  // The ground map: the days after which the track starts again. null: it does not.
  loop: number | null
}
// The ground map shows about the last orbit and the next two orbits of the track. The whole track of some days covers the map with lines.
// The numbers are a little less than 1 and 2, so the two ends of the line are not next to the station.
const LAPS_BEHIND = 0.8
const LAPS_AHEAD = 1.8

// The parts of the map that change only when the geometry changes.
function prepare(geometry: Geometry): World {
  const { frame, bodyPaths } = geometry
  const ground = frame === 'ground'
  let path = geometry.path
  let pathDays = geometry.pathDays
  let reach = 0
  if (!ground) {
    for (const points of [path, ...Object.values(bodyPaths)]) for (const point of points) if (isPoint(point)) reach = Math.max(reach, Math.abs(point[0]), Math.abs(point[1]))
  }
  if (!(reach > 0)) reach = 1
  const unit = unitOf(frame, reach)
  const decimals = ground ? 2 : 4

  // A ground track can be shorter than the mission and start again after its last point. The line then gets one more point, so it has no gap.
  const firstDay = pathDays[0] ?? 0
  let loop: number | null = null
  if (ground && path.length > 2) {
    const length = pathDays[path.length - 1] - firstDay + (pathDays[1] - firstDay)
    const again = firstDay + length < geometry.days ? placeAt(geometry, firstDay + length) : null
    if (again && isPoint(path[0]) && Math.abs(again.craft[0] - path[0][0]) < 0.01 && Math.abs(again.craft[1] - path[0][1]) < 0.01) {
      loop = length
      path = [...path, path[0]]
      pathDays = [...pathDays, firstDay + length]
    }
  }

  const pieces: Piece[] = []
  let piece: Piece | null = null
  let laps = 0
  const add = (to: Piece, point: Point, day: number) => {
    const [x, y] = unit(point)
    to.at.push(`${text(x, decimals)} ${text(y, decimals)}`)
    to.xy.push(x, y)
    to.days.push(day)
  }
  for (let index = 0; index < path.length - 1; index++) {
    const a = path[index]
    const b = path[index + 1]
    const fromDay = pathDays[index]
    const toDay = pathDays[index + 1]
    // Two points with the same day: the place jumps there (the start of a modelled return). No line joins them.
    if (!isPoint(a) || !isPoint(b) || !(toDay > fromDay)) {
      piece = null
      continue
    }
    // The place in the middle of the line tells if our model made this line, and if it is inside the South Atlantic Anomaly.
    const middle = placeAt(geometry, (fromDay + toDay) / 2)
    const modelled = middle?.modelled === true
    const saa = middle?.inSaa === true
    if (!piece || piece.modelled !== modelled || piece.saa !== saa) {
      piece = { at: [], xy: [], days: [], modelled, saa, whole: '' }
      pieces.push(piece)
      add(piece, a, fromDay)
    }
    if (ground && Math.abs(b[0] - a[0]) > 180) {
      // The track goes over the edge of the map at 180 degrees. The line stops at one edge and starts again at the other edge.
      const edge = a[0] > 0 ? 180 : -180
      const far = b[0] + (a[0] > 0 ? 360 : -360)
      const part = (edge - a[0]) / (far - a[0] || 1)
      const lat = a[1] + (b[1] - a[1]) * part
      const day = fromDay + (toDay - fromDay) * part
      add(piece, [edge, lat], day)
      piece = { at: [], xy: [], days: [], modelled, saa, whole: '' }
      pieces.push(piece)
      add(piece, [-edge, lat], day)
      laps++
    }
    add(piece, b, toDay)
  }
  for (const item of pieces) item.whole = `M${item.at.join('L')}`

  // A body path has one point for each point of the path. Where the place jumps, the line of the body stops and starts again.
  const orbits = ground
    ? []
    : Object.entries(bodyPaths)
        .map(([name, points]) => {
          let d = ''
          let pen = false
          points.forEach((point, index) => {
            if (!isPoint(point)) return
            const [x, y] = unit(point)
            const jump = index > 0 && !(pathDays[index] > pathDays[index - 1])
            d += `${pen && !jump ? 'L' : 'M'}${text(x, decimals)} ${text(y, decimals)}`
            pen = true
          })
          return { name, d }
        })
        .filter((orbit) => orbit.d.includes('L'))
  const lap = laps > 0 ? (pathDays[path.length - 1] - firstDay) / laps : Infinity
  return { empty: path.length === 0, reach, pieces, orbits, hasModelled: pieces.some((item) => item.modelled), hasSaa: pieces.some((item) => item.saa), firstDay, lap, loop }
}

// The ranges of days that the map draws as "flown" and as "ahead" for a mission day.
type Range = [number, number]
function ranges(world: World, day: number): { flown: Range[]; ahead: Range[] } {
  if (world.lap === Infinity) return { flown: [[-Infinity, day]], ahead: [[day, Infinity]] }
  const { firstDay, lap, loop } = world
  // The day inside the track, if the track starts again and again.
  const inside = loop === null ? day : firstDay + ((((day - firstDay) % loop) + loop) % loop)
  const flown: Range[] = [[inside - lap * LAPS_BEHIND, inside]]
  const ahead: Range[] = [[inside, inside + lap * LAPS_AHEAD]]
  if (loop !== null) {
    // A range that starts before the first point goes on at the end of the track. A range that ends after the last point goes on at the start.
    if (flown[0][0] < firstDay) flown.push([flown[0][0] + loop, firstDay + loop])
    if (ahead[0][1] > firstDay + loop) ahead.push([firstDay, ahead[0][1] - loop])
  }
  return { flown, ahead }
}

// The part of a piece between two mission days, as an SVG path. An end inside the piece is a point on the line between two points of the piece.
function slice(piece: Piece, from: number, to: number, decimals: number): string {
  const { days, at, xy } = piece
  const last = days.length - 1
  if (!(to > from) || to <= days[0] || from >= days[last]) return ''
  if (from <= days[0] && to >= days[last]) return piece.whole
  // The first point at or after a day, and the point of the line at that day.
  const end = (day: number) => {
    let low = 1
    let high = last
    while (low < high) {
      const middle = (low + high) >> 1
      if (days[middle] < day) low = middle + 1
      else high = middle
    }
    const before = low - 1
    const part = (day - days[before]) / (days[low] - days[before] || 1)
    const x = xy[2 * before] + (xy[2 * low] - xy[2 * before]) * part
    const y = xy[2 * before + 1] + (xy[2 * low + 1] - xy[2 * before + 1]) * part
    return { index: low, at: `${text(x, decimals)} ${text(y, decimals)}` }
  }
  const head = from > days[0] ? end(from) : null
  const tail = to < days[last] ? end(to) : null
  const points = at.slice(head ? head.index : 0, tail ? tail.index : last + 1)
  if (head) points.unshift(head.at)
  if (tail) points.push(tail.at)
  return points.length > 1 ? `M${points.join('L')}` : ''
}

// ---------------------------------------------------------------------------------------
// The size of the box, and the movement of the marker
// ---------------------------------------------------------------------------------------
function useBox() {
  const ref = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ width: number; height: number } | null>(null)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => {
      const { clientWidth: width, clientHeight: height } = element
      if (width > 0 && height > 0) setBox((old) => (old && old.width === width && old.height === height ? old : { width, height }))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, box] as const
}

// The day that the map shows. When the day changes a little, the shown day moves to it in small steps,
// so the marker does not jump. "near" tells if the two days are near on the map.
function useGlide(day: number, near: (from: number, to: number) => boolean): number {
  const [shown, setShown] = useState(day)
  const state = useRef({ shown: day, changedAt: 0 })
  // "near" reads the geometry and the size of the last render. Only a new day starts a movement.
  const isNear = useEffectEvent(near)
  useEffect(() => {
    const from = state.current.shown
    if (from === day) return
    const now = performance.now()
    // The day comes at a regular pace while the mission plays. The movement then takes as long as one step of that pace.
    const pause = now - state.current.changedAt
    state.current.changedAt = now
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (still || !isNear(from, day)) {
      state.current.shown = day
      setShown(day)
      return
    }
    const length = pause > 1500 ? 250 : clamp(pause, 120, 1000)
    let frame = requestAnimationFrame(function step(time) {
      const part = clamp((time - now) / length, 0, 1)
      const value = part === 1 ? day : from + (day - from) * part
      state.current.shown = value
      setShown(value)
      if (part < 1) frame = requestAnimationFrame(step)
    })
    return () => cancelAnimationFrame(frame)
  }, [day])
  return shown
}

// ---------------------------------------------------------------------------------------
// Labels that do not collide
// ---------------------------------------------------------------------------------------
type Rect = { x0: number; y0: number; x1: number; y1: number }
// A label for a mark at x, y with radius r. "sides" lists the sides that the label can be on, the best one first.
type Tag = { id: string; x: number; y: number; r: number; text: string; className: string; sides?: number[] }
type Placed = { tag: Tag; x: number; y: number; anchor: 'start' | 'middle' | 'end' }
// The sides: right, left, above, below, and the four corners.
const SIDES: [number, number][] = [[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 1], [-1, -1], [-1, 1]]
const overlap = (a: Rect, b: Rect) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0))

// Gives each label the first side where it covers no mark and no other label. A label keeps its last side while that side is free.
function placeTags(tags: Tag[], font: number, width: number, height: number, marks: Rect[], last: Record<string, number>): Placed[] {
  const taken = [...marks]
  const high = font * 1.25
  return tags.map((tag) => {
    const wide = tag.text.length * font * 0.6
    const gap = font * 0.4
    const order = tag.sides ?? [0, 1, 2, 3, 4, 5, 6, 7]
    const sides = order.includes(last[tag.id]) ? [last[tag.id], ...order.filter((side) => side !== last[tag.id])] : order
    let best: { cost: number; side: number; placed: Placed; rect: Rect } | null = null
    // If no side next to the mark is free, the label tries the same sides a little farther from the mark.
    search: for (const far of [0, 1, 2]) {
      for (const side of sides) {
        const [dx, dy] = SIDES[side]
        const corner = dx !== 0 && dy !== 0 ? 0.7 : 1
        const reach = tag.r * corner + gap + far * high * 1.1
        const x = tag.x + dx * reach
        const y = tag.y + dy * (reach + (dx === 0 ? high / 2 : corner < 1 ? high / 3 : 0))
        const x0 = dx > 0 ? x : dx < 0 ? x - wide : x - wide / 2
        const rect = { x0, y0: y - high / 2, x1: x0 + wide, y1: y + high / 2 }
        const outside = Math.max(0, 2 - rect.x0) + Math.max(0, rect.x1 - (width - 2)) + Math.max(0, 2 - rect.y0) + Math.max(0, rect.y1 - (height - 2))
        const cost = taken.reduce((sum, other) => sum + overlap(rect, other), 0) + outside * 1000
        if (!best || cost < best.cost) best = { cost, side, rect, placed: { tag, x, y, anchor: dx > 0 ? 'start' : dx < 0 ? 'end' : 'middle' } }
        if (cost === 0) break search
      }
    }
    last[tag.id] = best!.side
    taken.push(best!.rect)
    return best!.placed
  })
}

// ---------------------------------------------------------------------------------------
// Texts
// ---------------------------------------------------------------------------------------
const grouped = (value: number) => value.toLocaleString(lang, { maximumFractionDigits: 0 })
function distanceText(km: number): string {
  if (km >= 1e6) return t('{n} million km', { n: fmt(km / 1e6, km >= 1e8 ? 0 : 1) })
  return t('{n} km', { n: grouped(km >= 1e4 ? Math.round(km / 100) * 100 : Math.round(km)) })
}
function lightText(seconds: number): string {
  if (seconds < 59.5) return t('{n} s', { n: fmt(seconds, seconds < 1 ? 2 : seconds < 10 ? 1 : 0) })
  const whole = Math.round(seconds)
  return t('{min} min {sec} s', { min: Math.floor(whole / 60), sec: whole % 60 })
}
function coordinateText([lon, lat]: Point): string {
  const northSouth = lat >= 0 ? t('{deg}° N', { deg: fmt(lat, 1) }) : t('{deg}° S', { deg: fmt(-lat, 1) })
  const eastWest = lon >= 0 ? t('{deg}° E', { deg: fmt(lon, 1) }) : t('{deg}° W', { deg: fmt(-lon, 1) })
  return `${northSouth}, ${eastWest}`
}
// "Day 12 of 253". A short mission shows one decimal, because one day is a large part of it.
function dayText(day: number, days: number): string {
  const short = days < 30
  return t('Day {day} of {days}', { day: fmt(short ? Math.floor(day * 10) / 10 : Math.floor(day), short ? 1 : 0), days: fmt(days, Number.isInteger(days) ? 0 : 1) })
}

// The bodies that the map knows. Another body gets a neutral dot and its own name.
const BODIES: Record<string, { label: string; radius: number }> = {
  earth: { label: 'Earth', radius: 6.5 },
  mars: { label: 'Mars', radius: 5.5 },
  moon: { label: 'Moon', radius: 5 },
}

// ---------------------------------------------------------------------------------------
// The land of the ground map
// ---------------------------------------------------------------------------------------
const LAND = (landRings as Point[][]).map((ring) => `M${ring.map(([lon, lat]) => `${lon} ${-lat}`).join('L')}Z`).join('')
// A line each 30 degrees.
const GRID = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lon) => `M${lon} -90V90`).join('') + [-60, -30, 30, 60].map((lat) => `M-180 ${lat}H180`).join('')
const Land = memo(function Land() {
  return (
    <>
      <path className="map-grid map-thin" d={GRID} />
      <path className="map-grid map-equator map-thin" d="M-180 0H180" />
      <path className="map-land map-thin" d={LAND} />
    </>
  )
})

// A sample of a line style for the legend.
function Key({ className, hollow = false }: { className: string; hollow?: boolean }) {
  return (
    <svg className="map-key" viewBox="0 0 34 12" aria-hidden="true">
      <path className={`map-line ${className}`} d="M3 6H31" />
      {hollow && <path className={`map-line map-core ${className}`} d="M3 6H31" />}
    </svg>
  )
}

export function TripMap({ geometry, day, saaRegion }: { geometry: Geometry; day: number; saaRegion?: Point[] }) {
  const { frame } = geometry
  const ground = frame === 'ground'
  const ratio = ground ? 2 : 1
  const [stage, box] = useBox()
  const clip = useId()
  const world = useMemo(() => prepare(geometry), [geometry])
  // The side that each label had in the last drawing. placeTags() reads it and writes it.
  const [sides] = useState<Record<string, number>>(() => ({}))

  // The map takes the largest size with its aspect ratio that the box has room for.
  const width = box ? Math.max(120, Math.min(box.width, box.height * ratio)) : FIRST_WIDTH
  const height = width / ratio
  // Marks and labels are larger on a large map, so the audience can read them from far away.
  const scale = clamp(width / 640, 0.7, 1.4)
  const font = Math.round(13 + (scale - 0.7) * 10)
  const centerX = width / 2
  const centerY = height / 2
  // How many pixels one unit is. The sun map and the earth map keep a margin for the labels.
  const zoom = ground ? width / 360 : width / 2 - Math.max(26, width * 0.085)
  const unit = unitOf(frame, world.reach)
  const toPixels = (point: Point): Point => {
    const [x, y] = unit(point)
    return [centerX + x * zoom, centerY + y * zoom]
  }

  // Two days are near if the marker moves a short way between them, on a line with no loops.
  const near = (from: number, to: number) => {
    const places = [0, 0.25, 0.5, 0.75, 1].map((part) => placeAt(geometry, from + (to - from) * part))
    if (places.some((place) => !place)) return false
    const [a, quarter, middle, , b] = places.map((place) => toPixels(place!.craft))
    const length = Math.hypot(b[0] - a[0], b[1] - a[1])
    const off = (point: Point, part: number) => Math.hypot(point[0] - (a[0] + (b[0] - a[0]) * part), point[1] - (a[1] + (b[1] - a[1]) * part))
    return length < width * 0.3 && off(middle, 0.5) < length * 0.3 + 4 && off(quarter, 0.25) < length * 0.3 + 4
  }
  const shown = useGlide(day, near)
  // "now" is the place for the words. "place" is the place for the drawing: it can be some frames behind "now".
  const now = world.empty ? null : placeAt(geometry, day)
  const place = world.empty ? null : placeAt(geometry, shown)

  const span = geometry.spans.find((item) => item.phase.id === now?.phaseId)
  const phase = span ? t(span.phase.label) : null
  const inSaa = ground && now?.inSaa === true
  const light = now && Number.isFinite(now.lightSeconds) ? lightText(now.lightSeconds) : null
  const distance = now && Number.isFinite(now.earthDistanceKm) ? distanceText(now.earthDistanceKm) : null

  // The text alternative of the map.
  const words: string[] = [ground ? t('Map of the Earth with the ground track of the station.') : frame === 'earth' ? t('Map of the flight, with the Earth in the middle.') : t('Map of the flight, with the Sun in the middle.')]
  if (!now) words.push(t('No trajectory data.'))
  else {
    words.push(phase ? t('{day}, phase: {phase}.', { day: dayText(day, geometry.days), phase }) : `${dayText(day, geometry.days)}.`)
    if (ground) {
      words.push(t('The station is over {where}.', { where: coordinateText(now.craft) }))
      words.push(inSaa ? t('It is inside the South Atlantic Anomaly.') : t('It is outside the South Atlantic Anomaly.'))
    } else {
      if (distance) words.push(t('The spacecraft is {distance} from the Earth.', { distance }))
      if (light) words.push(t('The light time for one way is {time}.', { time: light }))
    }
    if (now.modelled) words.push(t('Our model made this part of the path.'))
  }

  // The marks: the middle body, the bodies at the day, and the spacecraft.
  const craft = place ? toPixels(place.craft) : null
  const drawn = ranges(world, shown)
  const draw = (piece: Piece, list: Range[]) => list.map(([from, to]) => slice(piece, from, to, ground ? 2 : 4)).join('')
  const middleRadius = frame === 'sun' ? 10 * scale : Math.max((EARTH_RADIUS_KM / world.reach) * zoom, 7.5 * scale)
  const bodies = ground
    ? []
    : Object.keys(geometry.bodyPaths)
        .map((name) => {
          const point = place?.bodies[name]
          if (!isPoint(point)) return null
          const known = BODIES[name]
          const real = frame === 'earth' && name === 'moon' ? (MOON_RADIUS_KM / world.reach) * zoom : 0
          const [x, y] = toPixels(point)
          return { name, x, y, r: Math.max(real, (known?.radius ?? 5) * scale), label: known ? t(known.label) : name }
        })
        .filter((body) => body !== null)
  const earth = frame === 'sun' ? bodies.find((body) => body.name === 'earth') : null
  const craftRadius = 5.5 * scale
  // The Earth and the Moon are larger than their real size on the earth map, if the map is not very large.
  const largerThanReal = frame === 'earth' && now !== null && middleRadius > (EARTH_RADIUS_KM / world.reach) * zoom + 0.5

  const tags: Tag[] = []
  if (craft) tags.push({ id: 'craft', x: craft[0], y: craft[1], r: craftRadius * 2.1, text: ground ? t('Station') : t('Spacecraft'), className: 'map-tag map-tag-craft' })
  for (const body of bodies) tags.push({ id: body.name, x: body.x, y: body.y, r: body.r, text: body.label, className: 'map-tag' })
  if (!ground && now) tags.push({ id: 'middle', x: centerX, y: centerY, r: middleRadius, text: frame === 'sun' ? t('Sun') : t('Earth'), className: 'map-tag', sides: [3, 2, 5, 7, 4, 6, 0, 1] })
  if (earth && craft && light) {
    // The light time sits next to the middle of the line of the radio link.
    const long = width >= 480 ? t('light time {time}', { time: light }) : light
    tags.push({ id: 'link', x: (earth.x + craft[0]) / 2, y: (earth.y + craft[1]) / 2, r: 3, text: long, className: 'map-tag map-tag-link', sides: [2, 3, 0, 1, 4, 5, 6, 7] })
  }
  const region = ground && saaRegion && saaRegion.length > 2 ? saaRegion.filter(isPoint) : []
  if (region.length > 2 && width >= 560) {
    const points = region.map(toPixels)
    const x = points.reduce((sum, point) => sum + point[0], 0) / points.length
    tags.push({ id: 'saa', x, y: Math.max(...points.map((point) => point[1])), r: 0, text: t('South Atlantic Anomaly'), className: 'map-tag map-tag-saa', sides: [3, 2] })
  }
  const marks: Rect[] = [...bodies, ...(craft ? [{ x: craft[0], y: craft[1], r: craftRadius * 2.1 }] : []), ...(ground ? [] : [{ x: centerX, y: centerY, r: middleRadius }])].map((mark) => ({
    x0: mark.x - mark.r,
    y0: mark.y - mark.r,
    x1: mark.x + mark.r,
    y1: mark.y + mark.r,
  }))
  const placed = placeTags(tags, font, width, height, marks, sides)

  const transform = `translate(${centerX} ${centerY}) scale(${zoom})`
  return (
    <figure className={`trip-map trip-map-${frame}`}>
      <div className="map-stage" ref={stage} style={{ aspectRatio: `${ratio} / 1` }}>
        <svg className="map-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={words.join(' ')}>
          {ground && (
            <>
              <clipPath id={clip}>
                <rect width={width} height={height} rx={12 * scale} />
              </clipPath>
              <g clipPath={`url(#${clip})`}>
                <rect className="map-sea" width={width} height={height} />
                <g transform={transform}>
                  <Land />
                  {region.length > 2 && <path className="map-region map-thin" d={`M${region.map(unit).map(([x, y]) => `${text(x, 2)} ${text(y, 2)}`).join('L')}Z`} />}
                </g>
              </g>
            </>
          )}
          <g transform={transform}>
            {world.orbits.map((orbit) => (
              <path key={orbit.name} className={`map-line map-orbit map-orbit-${orbit.name}`} d={orbit.d} />
            ))}
            {/* The path ahead first, then the path flown on top of it: a return flight can lie on the path of the flight out. */}
            {(['ahead', 'flown'] as const).map((when) =>
              world.pieces.map((piece, index) => {
                const d = draw(piece, drawn[when])
                if (!d) return null
                const kind = `map-line map-${when}${piece.modelled ? ' map-modelled' : ''}${piece.saa ? ' map-saa' : ''}`
                return (
                  <g key={`${when}${index}`}>
                    <path className={kind} d={d} />
                    {piece.modelled && <path className={`map-core ${kind}`} d={d} />}
                  </g>
                )
              }),
            )}
          </g>
          {earth && craft && <line className="map-link" x1={earth.x} y1={earth.y} x2={craft[0]} y2={craft[1]} />}
          {frame === 'sun' && now && <circle className="map-body map-body-sun" cx={centerX} cy={centerY} r={middleRadius} />}
          {frame === 'earth' && now && <circle className="map-body map-body-earth" cx={centerX} cy={centerY} r={middleRadius} />}
          {bodies.map((body) => (
            <circle key={body.name} className={`map-body map-body-${body.name}`} cx={body.x} cy={body.y} r={body.r} />
          ))}
          {craft && (
            <g className={inSaa ? 'map-craft map-craft-saa' : 'map-craft'} transform={`translate(${craft[0]} ${craft[1]})`}>
              <circle className="map-craft-ring" r={craftRadius * 2.1} />
              <circle className="map-craft-dot" r={craftRadius} />
            </g>
          )}
          <g style={{ fontSize: font }} aria-hidden="true">
            {placed.map(({ tag, x, y, anchor }) => (
              <text key={tag.id} className={tag.className} x={x} y={y} textAnchor={anchor} dominantBaseline="central">
                {tag.text}
              </text>
            ))}
          </g>
        </svg>
        {!now && (
          <div className="map-empty">
            <p className="map-empty-title">{t('No trajectory data')}</p>
            <p className="map-empty-text">{t('The map shows the path when the data is here.')}</p>
          </div>
        )}
      </div>
      <figcaption className="map-caption">
        {now && (
          <p className="map-where">
            {ground ? (
              <>
                <span>{coordinateText(now.craft)}</span>
                <span className={inSaa ? 'map-where-saa' : undefined}>
                  {inSaa && <span aria-hidden="true">▲ </span>}
                  {inSaa ? t('inside the South Atlantic Anomaly') : t('outside the South Atlantic Anomaly')}
                </span>
              </>
            ) : (
              <>
                {distance && <span>{t('{distance} from the Earth', { distance })}</span>}
                {light && <span>{t('light time {time}', { time: light })}</span>}
              </>
            )}
            {now.modelled && <span className="map-where-model">{t('modelled')}</span>}
          </p>
        )}
        <ul className="map-legend">
          {!world.empty && (
            <>
              <li>
                <Key className="map-flown" /> {t('Path flown')}
              </li>
              <li>
                <Key className="map-ahead" /> {t('Path ahead')}
              </li>
            </>
          )}
          {world.hasModelled && (
            <li>
              <Key className="map-flown map-modelled" hollow /> {t('Modelled: our model made this part')}
            </li>
          )}
          {(world.hasSaa || region.length > 2) && (
            <li>
              <Key className="map-flown map-saa" /> {t('Inside the South Atlantic Anomaly')}
            </li>
          )}
          {earth && craft && (
            <li>
              <Key className="map-link" /> {t('Radio link to the Earth, with the light time for one way')}
            </li>
          )}
        </ul>
        <p className="map-note">
          {frame === 'sun' && now && t('The Sun, the Earth, and Mars are drawn larger than their real size.')}
          {largerThanReal && t('The Earth and the Moon are drawn larger than their real size.')}
          {ground && world.lap !== Infinity && !world.empty && `${t('The map shows about the last orbit and the next two orbits of the track.')} `}
          {ground && t('Made with Natural Earth.')}
        </p>
      </figcaption>
    </figure>
  )
}
