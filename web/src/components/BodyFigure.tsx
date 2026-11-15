import { useRef } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import { t } from '../i18n.ts'
import { airwayWidth, jawLine, SPOT } from './body3d-shape.ts'
import type { FigureProps, HeatRegion } from './heat.ts'
import { heatMix, SPOT_REGIONS } from './heat.ts'
import './bodyfigure.css'

// A calm, solid figure of the body from the front. The color of each region shows its heat:
// a region with no heat keeps the neutral color, so the eye goes to the regions with heat.
// The five parts cover the whole figure. The four spot regions lie on top of the parts.
// Each point of an axis is [height, center, radius] in a drawing of 300 by 560.
type Axis = [number, number, number][]
const C = 150
const mirror = (axis: Axis): Axis => axis.map(([y, x, r]) => [y, 2 * C - x, r])
function at(axis: Axis, y: number): [number, number, number] {
  for (let i = 0; i < axis.length - 1; i++) {
    const a = axis[i]
    const b = axis[i + 1]
    if (y >= a[0] && y <= b[0]) {
      const t = (y - a[0]) / (b[0] - a[0] || 1)
      return [y, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
    }
  }
  return axis[axis.length - 1]
}
function outline(axes: Axis[]) {
  return axes
    .map((axis) => {
      const left: string[] = []
      const right: string[] = []
      for (let y = axis[0][0]; y <= axis[axis.length - 1][0]; y += 2) {
        const [, x, r] = at(axis, y)
        left.push(`${(x - r).toFixed(1)} ${y}`)
        right.unshift(`${(x + r).toFixed(1)} ${y}`)
      }
      return `M${left.join('L')}L${right.join('L')}Z`
    })
    .join('')
}
// A shape around the middle of the drawing, between two heights. `half` gives the half of its width at a height.
function band(half: (y: number) => number, from: number, to: number) {
  const left: string[] = []
  const right: string[] = []
  for (let y = from; y < to + 0.5; y += 0.5) {
    const height = Math.min(y, to)
    const r = half(height)
    left.push(`${(C - r).toFixed(1)} ${height}`)
    right.unshift(`${(C + r).toFixed(1)} ${height}`)
  }
  return `M${left.join('L')}L${right.join('L')}Z`
}

// The head is the skull with the neck below it. The neck is as wide as the chin or wider, so it shows below the jaw.
const neck: Axis = [[82, C, 10.5], [94, C, 11.5], [108, C, 12.5]]
function skull(y: number) {
  const t = (y - 56) / 37
  const jaw = y > 62 ? 1 - ((y - 62) / 30) * 0.3 : 1
  return Math.max(3, 28 * Math.sqrt(Math.max(0.02, 1 - t * t)) * jaw)
}
const head: Axis = []
for (let y = 20; y <= 92; y += 2) head.push([y, C, y < 82 ? skull(y) : Math.max(skull(y), at(neck, y)[2])])
head.push([94, C, 11.5], [108, C, 12.5])
const arm: Axis = [[116, C - 60, 8], [122, C - 63, 15], [150, C - 67, 13.5], [202, C - 72, 10.5], [222, C - 74, 11], [284, C - 80, 7.5], [294, C - 81, 9], [311, C - 82, 8], [321, C - 82, 3.5]]
const leg: Axis = [[266, C - 25, 24], [284, C - 26, 25.5], [330, C - 26, 21], [396, C - 24, 15], [410, C - 24, 14.5], [440, C - 24, 16], [500, C - 22, 9], [520, C - 22, 8.5], [530, C - 23, 12], [538, C - 23, 11]]

// The two eyes. `grow` makes each eye larger by that many units.
function eyes(grow: number) {
  const { x, y, rx, ry } = SPOT.eye
  return [C - x, C + x].map((cx) => `M${cx - rx - grow} ${y}a${rx + grow} ${ry + grow} 0 1 0 ${2 * (rx + grow)} 0a${rx + grow} ${ry + grow} 0 1 0 ${-2 * (rx + grow)} 0Z`).join('')
}
// The airway: its top edge is the jaw line, its sides come nearer on the chest, and its lower end is round.
function airway() {
  const { throat, pipe, bottom } = SPOT.airway
  const points: [number, number][] = []
  for (let x = -throat; x <= throat; x++) points.push([x, jawLine(x)])
  const top = Math.ceil(jawLine(throat))
  for (let y = top; y <= bottom - pipe; y++) points.push([airwayWidth(y), y])
  for (let angle = 15; angle < 180; angle += 15) points.push([pipe * Math.cos((angle * Math.PI) / 180), bottom - pipe + pipe * Math.sin((angle * Math.PI) / 180)])
  for (let y = bottom - pipe; y >= top; y--) points.push([-airwayWidth(y), y])
  return `M${points.map(([x, y]) => `${(C + x).toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`
}

const PATH: Record<HeatRegion, string> = {
  legs: outline([leg, mirror(leg)]),
  arms: outline([arm, mirror(arm)]),
  abdomen: outline([[[196, C, 42], [216, C, 40], [234, C, 43], [252, C, 49], [266, C, 50], [278, C, 45]]]),
  chest: outline([[[106, C, 13], [113, C, 36], [120, C, 51], [130, C, 56], [150, C, 54], [172, C, 48], [198, C, 42]]]),
  head: outline([head]),
  // The spot regions use the numbers of the 3D figure, so each one is at the same place in 2D and in 3D.
  brain: band((y) => at(head, y)[2], 20, SPOT.brow),
  eyes: eyes(0),
  face: band((y) => Math.min(at(head, y)[2], Math.sqrt(Math.max(0, (SPOT.jaw.y - y) / SPOT.jaw.curve))), SPOT.faceTop, SPOT.jaw.y),
  airway: airway(),
}
// The area of the eyes for the pointer. It is larger than the drawing of the eyes, because an eye is small.
const REACH: Partial<Record<HeatRegion, string>> = { eyes: eyes(SPOT.eye.reach) }
// The order of the drawing. A later region lies on top, so it takes the pointer first.
const ORDER: HeatRegion[] = ['legs', 'arms', 'abdomen', 'chest', 'head', 'airway', 'brain', 'face', 'eyes']
const isSpot = (region: HeatRegion) => (SPOT_REGIONS as readonly HeatRegion[]).includes(region)

// The region of the drawing that an event comes from, or null.
function regionOf(target: EventTarget): HeatRegion | null {
  const element = target instanceof Element ? target.closest('[data-region]') : null
  return element ? (element.getAttribute('data-region') as HeatRegion) : null
}

export function BodyFigure({ heat, labels, selected, onSelect, onHover }: FigureProps) {
  // The region under the pointer, and if a region has the keyboard focus. The figure told onHover about them.
  const over = useRef<HeatRegion | null>(null)
  const focused = useRef(false)

  function onMove(event: PointerEvent) {
    // A finger does not hover. A tap selects.
    if (event.pointerType === 'touch') return
    const region = regionOf(event.target)
    if (region) onHover?.(region, { x: event.clientX, y: event.clientY })
    else if (over.current) onHover?.(null)
    over.current = region
  }
  function onLeave() {
    if (over.current) onHover?.(null)
    over.current = null
  }

  return (
    <svg className="body-figure" viewBox="0 0 300 560" role="group" aria-label={t('Body of the crew member')} onPointerMove={onMove} onPointerLeave={onLeave}>
      {ORDER.map((region) => {
        const mix = heatMix(heat[region])
        const colors = { '--amount': `${(mix.amount * 100).toFixed(1)}%`, '--to-critical': `${(mix.toCritical * 100).toFixed(1)}%` } as CSSProperties
        // A spot region with no heat is not visible, so the part below shows.
        const cold = isSpot(region) && mix.amount === 0
        return (
          <g
            key={region}
            className={cold ? 'body-region body-cold' : 'body-region'}
            data-region={region}
            role="button"
            tabIndex={0}
            aria-pressed={selected === region}
            aria-label={labels[region]}
            onClick={() => onSelect(region)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return
              // The Space key must not scroll the page.
              event.preventDefault()
              onSelect(region)
            }}
            onFocus={(event) => {
              // A click also gives the focus. Only the focus from the keyboard counts here.
              if (!event.currentTarget.matches(':focus-visible')) return
              focused.current = true
              onHover?.(region)
            }}
            onBlur={() => {
              if (focused.current) onHover?.(null)
              focused.current = false
            }}
          >
            <path className="body-shape" d={PATH[region]} style={colors} />
            {REACH[region] && <path className="body-reach" d={REACH[region]} />}
          </g>
        )
      })}
      {/* The mark of the selected region: its outline, on top of all regions. */}
      {selected && <path className="body-mark" d={PATH[selected]} aria-hidden="true" />}
    </svg>
  )
}
