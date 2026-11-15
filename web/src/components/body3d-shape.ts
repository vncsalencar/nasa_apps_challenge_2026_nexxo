import type { BodyPart, HeatRegion, SpotRegion } from './heat.ts'

// The shape of the 3D body figure. It uses the same drawing as the 2D figure:
// x goes to the right from the middle, y goes down from 0 to 560, z comes to the viewer.
//
// The body is a "field": a function that gives a number for each point in space.
// The number is about the distance to the skin: negative inside the body, positive outside.
// Each part of the body has its own field. A smooth minimum joins the fields, so the joints blend.
// Then a mesher finds the surface where the field is zero and makes triangles from it.

// The regions in the order of their numbers in the shader: the five parts first, then the four spot regions.
export const REGIONS: HeatRegion[] = ['head', 'chest', 'abdomen', 'arms', 'legs', 'brain', 'eyes', 'face', 'airway']
// The middle of the drawing. The mesh has its zero point here.
export const CENTER_Y = 280

// A profile is a tube along the y axis. Each key is [y, center x, center z, radius x, radius z].
type Key = [number, number, number, number, number]
type Profile = { y0: number; last: number; power: number; capTop: number; capBottom: number; cx: Float32Array; cz: Float32Array; rx: Float32Array; rz: Float32Array }
const STEP = 0.5

// A smooth curve through the points that does not go above or below the points (monotone cubic).
function curve(xs: number[], ys: number[]) {
  const n = xs.length
  const h: number[] = []
  const delta: number[] = []
  for (let i = 0; i < n - 1; i++) {
    h.push(xs[i + 1] - xs[i])
    delta.push((ys[i + 1] - ys[i]) / h[i])
  }
  const m: number[] = [delta[0]]
  for (let i = 1; i < n - 1; i++) {
    if (delta[i - 1] * delta[i] <= 0) m.push(0)
    else m.push((3 * (h[i - 1] + h[i])) / ((2 * h[i] + h[i - 1]) / delta[i - 1] + (h[i] + 2 * h[i - 1]) / delta[i]))
  }
  m.push(delta[n - 2])
  return (x: number) => {
    let i = 0
    while (i < n - 2 && x > xs[i + 1]) i++
    const t = Math.min(1, Math.max(0, (x - xs[i]) / h[i]))
    const t2 = t * t
    const t3 = t2 * t
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h[i] * m[i + 1]
  }
}

// Makes the table of a profile. `capTop` and `capBottom` are the heights of the round ends.
// A round end is a dome past the first or the last key. With 0, the end is flat.
// `power` 2 gives a section that is an ellipse. A larger number gives a section with flatter sides.
function profile(keys: Key[], capTop = 0, capBottom = 0, power = 2): Profile {
  const ys = keys.map((key) => key[0])
  const column = (index: number) => curve(ys, keys.map((key) => key[index]))
  const at = [column(1), column(2), column(3), column(4)]
  const count = Math.round((ys[ys.length - 1] - ys[0]) / STEP) + 1
  const table = { y0: ys[0], last: count - 1, power, capTop, capBottom, cx: new Float32Array(count), cz: new Float32Array(count), rx: new Float32Array(count), rz: new Float32Array(count) }
  for (let i = 0; i < count; i++) {
    const y = ys[0] + i * STEP
    table.cx[i] = at[0](y)
    table.cz[i] = at[1](y)
    table.rx[i] = at[2](y)
    table.rz[i] = at[3](y)
  }
  return table
}

// The distance from a point to the skin of a profile (a good estimate near the skin).
function tube(p: Profile, x: number, y: number, z: number) {
  let t = (y - p.y0) / STEP
  let over = 0
  let cap = 0
  if (t < 0) {
    over = -t * STEP
    cap = p.capTop
    t = 0
  } else if (t > p.last) {
    over = (t - p.last) * STEP
    cap = p.capBottom
    t = p.last
  }
  let i = t | 0
  if (i >= p.last) i = p.last - 1
  const f = t - i
  const dcx = p.cx[i + 1] - p.cx[i]
  const dcz = p.cz[i + 1] - p.cz[i]
  const drx = p.rx[i + 1] - p.rx[i]
  const drz = p.rz[i + 1] - p.rz[i]
  const rx = p.rx[i] + drx * f
  const rz = p.rz[i] + drz * f
  const u = (x - p.cx[i] - dcx * f) / rx
  const w = (z - p.cz[i] - dcz * f) / rz
  // q is 1 on the skin, less inside and more outside. qu and qw are its slopes.
  let q: number
  let qu: number
  let qw: number
  if (p.power === 2) {
    q = Math.sqrt(u * u + w * w)
    const safe = Math.max(q, 0.05)
    qu = u / safe
    qw = w / safe
  } else {
    const au = Math.abs(u)
    const aw = Math.abs(w)
    q = (au ** p.power + aw ** p.power) ** (1 / p.power)
    const k = Math.max(q, 0.05) ** (1 - p.power)
    qu = Math.sign(u) * au ** (p.power - 1) * k
    qw = Math.sign(w) * aw ** (p.power - 1) * k
  }
  const gx = qu / rx
  const gz = qw / rz
  const flat = Math.sqrt(gx * gx + gz * gz) + 1e-9
  if (over > 0) {
    // Past a flat end: the distance to the flat cut.
    if (!cap) return q > 1 ? Math.sqrt(((q - 1) / flat) ** 2 + over * over) : over
    // Past a round end: the dome is half of an egg shape with the height `cap`.
    const v = over / cap
    const k = Math.sqrt(q * q + v * v)
    return ((k - 1) * k) / (Math.sqrt(q * q * flat * flat + (v / cap) ** 2) + 1e-9)
  }
  // The slope of q along the tube. The limit keeps the estimate good where the tube changes its size fast.
  let gy = -(qu * (dcx + u * drx) + qw * (dcz * (rx / rz) + w * drz * (rx / rz))) / (rx * STEP)
  gy = Math.max(-2 * flat, Math.min(2 * flat, gy))
  return (q - 1) / Math.sqrt(flat * flat + gy * gy)
}

// A smooth minimum: it joins two shapes with a soft blend of about `k` units.
function smin(a: number, b: number, k: number) {
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - h * h * k * 0.25
}

// The head is an egg shape with the same outline as the head of the 2D figure. It is a little deeper
// than wide. The lower half is narrower and sits forward, so a person can see which side is the front.
const HEAD = { y: 56, wide: 28, high: 37, deep: 31.5 }
function skull(x: number, y: number, z: number) {
  const t = (y - HEAD.y) / HEAD.high
  const low = Math.min(1, Math.max(0, t))
  const jaw = 1 - 0.14 * low * low * (3 - 2 * low)
  const px = x / jaw / HEAD.wide
  const pz = (z + 0.5 - 3.5 * t) / jaw / HEAD.deep
  const k0 = Math.sqrt(px * px + t * t + pz * pz)
  const k1 = Math.sqrt((px / HEAD.wide) ** 2 + (t / HEAD.high) ** 2 + (pz / HEAD.deep) ** 2)
  return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -HEAD.wide
}
const NECK = profile([[82, 0, 0.5, 10.5, 11.5], [94, 0, -0.5, 11.5, 12.2], [108, 0, -2, 12.5, 13], [116, 0, -2.5, 13, 13.5]])
const TORSO = profile(
  [
    [106, 0, -2, 13, 11],
    [113, 0, -2, 36, 17],
    [120, 0, -1.5, 51, 21.5],
    [130, 0, -0.5, 56, 26],
    [150, 0, 1.5, 54, 30.5],
    [172, 0, 1.5, 48, 28],
    [198, 0, 0.5, 42, 23.5],
    [216, 0, 0, 40, 22.5],
    [234, 0, -0.5, 43, 24],
    [252, 0, -1.5, 49, 27],
    [264, 0, -2, 50, 28],
    [276, 0, -2, 48.5, 27.5],
  ],
  6,
  22,
  2.5,
)
const ARM = profile(
  [
    [127, 63.5, -1.5, 15, 15.5],
    [150, 67, -2, 13.5, 14],
    [202, 72, -4, 10.5, 11],
    [222, 74, -3, 11, 11.5],
    [284, 80, 4, 7.2, 7.8],
    [296, 81, 6, 7.2, 10.5],
    [312, 82, 8.3, 6.3, 9.6],
  ],
  11,
  10,
)
const LEG = profile(
  [
    [264, 25, -1, 24, 25.5],
    [284, 26, -0.5, 25.5, 27],
    [330, 26, 0.5, 21, 23],
    [396, 24, 1.5, 15, 16.5],
    [410, 24, 1, 14.5, 16],
    [440, 24, -2.5, 16, 17.5],
    [500, 22, -3, 9, 10.5],
    [526, 22, -3, 8.5, 10],
  ],
  14,
  8,
)
// The borders between the parts are clean lines on the skin, as on a shop figure.
// Each function gives a number that is positive below its line. x, y and z are in the drawing.
// The same lines are in the shader of BodyFigure3D.tsx, as text made from BORDERS.
export const BORDERS = {
  // The collar: the head and the neck are above it.
  neck: 'y - (107.0 + 0.2 * z)',
  // The chest ends and the abdomen starts here.
  waist: 'y - 197.0',
  // The legs start here. The line goes down to the middle, as the edge of a pair of shorts.
  hip: 'y - (299.0 - 0.52 * abs(x))',
}
const below = {
  neck: (_x: number, y: number, z: number) => y - (107 + 0.2 * z),
  waist: (_x: number, y: number) => y - 197,
  hip: (x: number, y: number) => y - (299 - 0.52 * Math.abs(x)),
}

// The four spot regions lie on top of the parts. These numbers give their places in the drawing.
// The 2D figure draws its shapes from the same numbers.
export const SPOT = {
  // brain: the skull above the brow line. The line is level on the front. On the back of the head it goes down in a curve.
  brow: 47,
  browBack: 0.012,
  // eyes: one ellipse on each side of the middle. `reach` makes the area for the pointer larger, because an eye is small.
  eye: { x: 11.5, y: 55, rx: 7, ry: 4.2, reach: 2.5 },
  // face: from below the eyes down to the jaw line, and from the front back to the ears at the depth `faceBack`.
  faceTop: 61.5,
  faceBack: 3,
  // The jaw line is a curve. It is at `jaw.y` in the middle, and it goes up to the sides.
  jaw: { y: 91.5, curve: 0.036 },
  // airway: the front of the throat below the jaw line, then a narrow strip down the middle of the chest with a round end.
  // The airway is `throat` wide on each side at the neck and `pipe` wide on the chest.
  airway: { throat: 7, pipe: 4.5, narrowFrom: 102, narrowTo: 114, bottom: 146 },
}
// The height of the jaw line at a distance from the middle.
export const jawLine = (x: number) => SPOT.jaw.y - SPOT.jaw.curve * x * x
function smoothstep(from: number, to: number, value: number) {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)))
  return t * t * (3 - 2 * t)
}
// How wide the airway is on each side of the middle at a height.
export function airwayWidth(y: number) {
  const { throat, pipe, narrowFrom, narrowTo } = SPOT.airway
  return throat + (pipe - throat) * smoothstep(narrowFrom, narrowTo, y)
}
// Each function gives a number that is positive inside its spot region. x, y and z are in the drawing.
// `grow` makes the eyes larger by that many units.
const inside: Record<SpotRegion, (x: number, y: number, z: number, grow: number) => number> = {
  brain: (_x, y, z) => SPOT.brow + SPOT.browBack * Math.max(-(z + 2), 0) ** 2 - y,
  eyes: (x, y, z, grow) => {
    const { x: middle, y: height, rx, ry } = SPOT.eye
    return Math.min((1 - Math.hypot((Math.abs(x) - middle) / (rx + grow), (y - height) / (ry + grow))) * ry, z - 5)
  },
  face: (x, y, z) => Math.min(y - SPOT.faceTop, jawLine(x) - y, z - SPOT.faceBack),
  airway: (x, y, z) => {
    const { pipe, bottom } = SPOT.airway
    const side = y > bottom - pipe ? pipe - Math.hypot(x, y - (bottom - pipe)) : airwayWidth(y) - Math.abs(x)
    return Math.min(side, y - jawLine(x), z)
  },
}
// The same four functions as text for the shader of BodyFigure3D.tsx, in the order brain, eyes, face, airway.
// The text of the face and of the airway uses the jaw line as "jaw".
const glsl = (value: number) => value.toFixed(3)
const END = SPOT.airway.bottom - SPOT.airway.pipe
export const JAW = `${glsl(SPOT.jaw.y)} - ${glsl(SPOT.jaw.curve)} * x * x`
export const SPOTS = [
  `${glsl(SPOT.brow)} + ${glsl(SPOT.browBack)} * pow(max(-(z + 2.0), 0.0), 2.0) - y`,
  `min((1.0 - length(vec2((abs(x) - ${glsl(SPOT.eye.x)}) / ${glsl(SPOT.eye.rx)}, (y - ${glsl(SPOT.eye.y)}) / ${glsl(SPOT.eye.ry)}))) * ${glsl(SPOT.eye.ry)}, z - 5.0)`,
  `min(min(y - ${glsl(SPOT.faceTop)}, jaw - y), z - ${glsl(SPOT.faceBack)})`,
  `min(min(y > ${glsl(END)} ? ${glsl(SPOT.airway.pipe)} - length(vec2(x, y - ${glsl(END)})) : mix(${glsl(SPOT.airway.throat)}, ${glsl(SPOT.airway.pipe)}, smoothstep(${glsl(SPOT.airway.narrowFrom)}, ${glsl(SPOT.airway.narrowTo)}, y)) - abs(x), y - jaw), z)`,
]

// The foot is a round cone from the heel to the toes, with a flat sole.
const HEEL = [23, 529, -5, 9.5]
const TOE = [25.5, 533.5, 32, 6]
const SOLE = 539

function foot(x: number, y: number, z: number) {
  const bx = TOE[0] - HEEL[0]
  const by = TOE[1] - HEEL[1]
  const bz = TOE[2] - HEEL[2]
  const px = x - HEEL[0]
  const py = y - HEEL[1]
  const pz = z - HEEL[2]
  const length = Math.sqrt(bx * bx + by * by + bz * bz)
  const along = (px * bx + py * by + pz * bz) / length
  const across = Math.sqrt(Math.max(0, px * px + py * py + pz * pz - along * along))
  const slope = (HEEL[3] - TOE[3]) / length
  const flat = Math.sqrt(1 - slope * slope)
  const k = across * -slope + along * flat
  let d: number
  if (k < 0) d = Math.sqrt(across * across + along * along) - HEEL[3]
  else if (k > flat * length) d = Math.sqrt(across * across + (along - length) ** 2) - TOE[3]
  else d = across * flat + along * slope - HEEL[3]
  return -smin(-d, SOLE - y, 2)
}
function leg(x: number, y: number, z: number) {
  const shin = tube(LEG, x, y, z)
  return y > 480 ? smin(shin, foot(x, y, z), 6) : shin
}

const FAR = 1000
// Fills `out` with the distance to the head, the torso, the arms and the legs, and returns the distance to the whole body.
// With `quick`, a part is skipped when the point is far from it. This saves most of the work of the grid.
function field(x: number, y: number, z: number, out: Float64Array, quick: boolean) {
  const ax = Math.abs(x)
  const torso = !quick || (y > 86 && y < 312 && ax < 72) ? tube(TORSO, x, y, z) : FAR
  const head = !quick || (y < 130 && ax < 44) ? smin(skull(x, y, z), tube(NECK, x, y, z), 3) : FAR
  const arms = !quick || (ax > 32 && y > 98 && y < 338) ? tube(ARM, ax, y, z) : FAR
  let legs = FAR
  if (!quick || y > 234) {
    legs = leg(ax, y, z)
    if (!quick || ax < 10) legs = smin(legs, leg(-ax, y, z), 4)
  }
  out[0] = head
  out[1] = torso
  out[2] = arms
  out[3] = legs
  return smin(smin(smin(torso, head, 7), arms, 5), legs, 6)
}

// The part of the body at a point on the skin. The point is in the space of the mesh (y up).
const scratch = new Float64Array(4)
function partAt(x: number, y: number, z: number): BodyPart {
  field(x, CENTER_Y - y, z, scratch, false)
  const top = CENTER_Y - y
  // The arms own the skin where they are nearer than the rest of the body. The lines divide the rest.
  if (scratch[2] < Math.min(scratch[0], scratch[1], scratch[3])) return 'arms'
  if (below.neck(x, top, z) < 0) return 'head'
  if (below.hip(x, top) > 0) return 'legs'
  return below.waist(x, top) < 0 ? 'chest' : 'abdomen'
}
// The region under the pointer at a point on the skin. The point is in the space of the mesh (y up).
// A spot region takes the pointer before the part below it: first the eyes, then the face and the brain, then the airway.
// A spot region takes the pointer also when it has no heat.
const SPOT_ORDER: SpotRegion[] = ['eyes', 'face', 'brain', 'airway']
export function regionAt(x: number, y: number, z: number): HeatRegion {
  const top = CENTER_Y - y
  for (const spot of SPOT_ORDER) if (inside[spot](x, top, z, SPOT.eye.reach) > 0) return spot
  return partAt(x, y, z)
}

export type BodyMesh = {
  position: Float32Array
  normal: Float32Array
  // The distance from each corner to the head, the torso, the arms and the legs.
  part: Float32Array
  index: Uint32Array
}

// The box that the mesher looks at, and the size of one cell of its grid.
const CELL = 2.4
// The box has the same size on the left and on the right of the middle, so the grid is the same on both sides.
const BOX = { x0: -41 * CELL, x1: 41 * CELL, y0: 13, y1: 545, z0: -42, z1: 46 }

let cache: BodyMesh | null = null
// Makes the mesh of the body. The work takes about 0.1 seconds, so the result is kept.
export function bodyMesh(): BodyMesh {
  if (cache) return cache
  const nx = Math.round((BOX.x1 - BOX.x0) / CELL) + 1
  const ny = Math.ceil((BOX.y1 - BOX.y0) / CELL) + 1
  const nz = Math.ceil((BOX.z1 - BOX.z0) / CELL) + 1
  const value = new Float32Array(nx * ny * nz)
  // The body is the same on the left and on the right. So the field of one half is enough.
  for (let k = 0; k < nz; k++) {
    for (let j = 0; j < ny; j++) {
      const row = nx * (j + ny * k)
      for (let i = 0; i * 2 < nx; i++) value[row + i] = value[row + nx - 1 - i] = field(BOX.x0 + i * CELL, BOX.y0 + j * CELL, BOX.z0 + k * CELL, scratch, true)
    }
  }

  // Step 1: each cell that the skin goes through gets one corner of the mesh.
  // The corner sits at the mean of the points where the skin crosses the edges of the cell.
  const cornerOf = new Int32Array(nx * ny * nz).fill(-1)
  const points: number[] = []
  const stride = [1, nx, nx * ny]
  for (let k = 0; k < nz - 1; k++) {
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const n = i + nx * (j + ny * k)
        let inside = 0
        for (let c = 0; c < 8; c++) if (value[n + (c & 1) + ((c >> 1) & 1) * nx + ((c >> 2) & 1) * nx * ny] < 0) inside++
        if (inside === 0 || inside === 8) continue
        let sx = 0
        let sy = 0
        let sz = 0
        let crossings = 0
        for (let c = 0; c < 8; c++) {
          const a = value[n + (c & 1) + ((c >> 1) & 1) * nx + ((c >> 2) & 1) * nx * ny]
          for (let axis = 0; axis < 3; axis++) {
            if ((c >> axis) & 1) continue
            const b = value[n + (c & 1) + ((c >> 1) & 1) * nx + ((c >> 2) & 1) * nx * ny + stride[axis]]
            if (a < 0 === b < 0) continue
            const t = a / (a - b)
            sx += (c & 1) + (axis === 0 ? t : 0)
            sy += ((c >> 1) & 1) + (axis === 1 ? t : 0)
            sz += ((c >> 2) & 1) + (axis === 2 ? t : 0)
            crossings++
          }
        }
        cornerOf[n] = points.length / 3
        points.push(BOX.x0 + (i + sx / crossings) * CELL, BOX.y0 + (j + sy / crossings) * CELL, BOX.z0 + (k + sz / crossings) * CELL)
      }
    }
  }

  // Step 2: each edge of the grid that crosses the skin gives two triangles between the four cells around it.
  const index: number[] = []
  for (let k = 1; k < nz - 1; k++) {
    for (let j = 1; j < ny - 1; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const n = i + nx * (j + ny * k)
        const a = value[n]
        for (let axis = 0; axis < 3; axis++) {
          const b = value[n + stride[axis]]
          if (a < 0 === b < 0) continue
          const s1 = stride[(axis + 1) % 3]
          const s2 = stride[(axis + 2) % 3]
          const q0 = cornerOf[n - s1 - s2]
          const q1 = cornerOf[n - s2]
          const q2 = cornerOf[n]
          const q3 = cornerOf[n - s1]
          // The y axis of the mesh points up and the y axis of the field points down. So the turn of each triangle is the other way.
          if (a < 0) index.push(q0, q2, q1, q0, q3, q2)
          else index.push(q0, q1, q2, q0, q2, q3)
        }
      }
    }
  }

  // Step 3: move each corner exactly onto the skin, and read the direction of the skin and the parts there.
  const count = points.length / 3
  const position = new Float32Array(count * 3)
  const normal = new Float32Array(count * 3)
  const part = new Float32Array(count * 4)
  const e = 0.35
  for (let v = 0; v < count; v++) {
    let x = points[v * 3]
    let y = points[v * 3 + 1]
    let z = points[v * 3 + 2]
    let gx = 0
    let gy = 0
    let gz = 0
    for (let pass = 0; pass < 2; pass++) {
      gx = (field(x + e, y, z, scratch, true) - field(x - e, y, z, scratch, true)) / (2 * e)
      gy = (field(x, y + e, z, scratch, true) - field(x, y - e, z, scratch, true)) / (2 * e)
      gz = (field(x, y, z + e, scratch, true) - field(x, y, z - e, scratch, true)) / (2 * e)
      if (pass === 1) break
      const g2 = gx * gx + gy * gy + gz * gz || 1
      const step = Math.max(-CELL, Math.min(CELL, field(x, y, z, scratch, true) / Math.sqrt(g2))) / Math.sqrt(g2)
      x -= gx * step
      y -= gy * step
      z -= gz * step
    }
    // Read the distance to every part, also the far parts. A far part counts as 30 units away at most.
    field(x, y, z, scratch, false)
    for (let i = 0; i < 4; i++) part[v * 4 + i] = Math.min(30, scratch[i])
    const length = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1
    position.set([x, CENTER_Y - y, z], v * 3)
    normal.set([gx / length, -gy / length, gz / length], v * 3)
  }
  // Step 4: a few triangles in a sharp fold can point the wrong way after step 3. Turn them around.
  const side = (t: number, a: number, axis: number) => position[index[t + a] * 3 + axis] - position[index[t] * 3 + axis]
  for (let t = 0; t < index.length; t += 3) {
    const fx = side(t, 1, 1) * side(t, 2, 2) - side(t, 1, 2) * side(t, 2, 1)
    const fy = side(t, 1, 2) * side(t, 2, 0) - side(t, 1, 0) * side(t, 2, 2)
    const fz = side(t, 1, 0) * side(t, 2, 1) - side(t, 1, 1) * side(t, 2, 0)
    let facing = 0
    for (let corner = 0; corner < 3; corner++) {
      const v = index[t + corner] * 3
      facing += fx * normal[v] + fy * normal[v + 1] + fz * normal[v + 2]
    }
    if (facing < 0) [index[t + 1], index[t + 2]] = [index[t + 2], index[t + 1]]
  }
  cache = { position, normal, part, index: new Uint32Array(index) }
  return cache
}
