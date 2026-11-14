import { useEffect, useRef, useState } from 'react'
import { BackSide, BufferAttribute, BufferGeometry, Group, Mesh, PerspectiveCamera, Raycaster, Scene, ShaderMaterial, Vector2, Vector3, WebGLRenderer } from 'three'
import type { BodyPart, Status } from '../api.ts'
import { STATUS_LABEL } from '../api.ts'
import { t, tn } from '../i18n.ts'
import { BODY_PART_LABEL } from '../symptoms.ts'
import { BodyFigure } from './BodyFigure.tsx'
import { bodyMesh, BORDERS, CENTER_Y, partAt, PARTS } from './body3d-shape.ts'
import './body3d.css'

// The body figure in 3D. It shows the same thing as the 2D figure: a part with a problem takes
// the status color, a normal part is neutral, and a tap selects a part.
// The figure turns slowly by itself. A sideways drag turns it by hand.

type Props = {
  statuses: Record<BodyPart, Status>
  symptomCounts: Partial<Record<BodyPart, number>>
  selected: BodyPart | null
  onSelect: (part: BodyPart) => void
}
type Rgb = [number, number, number]

// The camera sees the same frame as the 2D drawing: 300 wide and 560 high.
const FRAME_W = 300
const FRAME_H = 560
const FIELD_OF_VIEW = 20
// The middle of the ring of each part, as [x, y] in the drawing, and the two sizes of the ring.
const MARK: Record<BodyPart, [number, number]> = { head: [0, 56], chest: [0, 150], abdomen: [0, 236], arms: [74, 250], legs: [26, 400] }
const RING: Record<BodyPart, [number, number]> = { head: [48, 62], chest: [40, 54], abdomen: [40, 54], arms: [40, 54], legs: [40, 54] }
// The soft light behind a part with a problem: one or two spots, each as [x, y, half width, half height] in the drawing.
const SPOTS: Record<BodyPart, [number, number, number, number][]> = {
  head: [[0, 56, 54, 62]],
  chest: [[0, 152, 86, 66]],
  abdomen: [[0, 242, 74, 64]],
  arms: [[72, 218, 38, 128], [-72, 218, 38, 128]],
  legs: [[25, 405, 48, 152], [-25, 405, 48, 152]],
}
// How much a part shines by itself for each status.
const GLOW: Record<Status, number> = { normal: 0, caution: 0.8, alert: 1 }
// Radians for each second of the slow turn, and radians for each pixel of a drag.
const TURN_SPEED = 0.2
const DRAG_YAW = 0.011
const DRAG_PITCH = 0.004
const REST_PITCH = 0.13
// The figure starts to turn again this long after the last touch (milliseconds).
const REST_TIME = 3500
// A tap that misses the figure by a few pixels still selects a part. This helps a finger in a glove.
const NEAR: [number, number][] = [[0, 0], [9, 0], [-9, 0], [0, 9], [0, -9], [16, 0], [-16, 0], [0, 16], [0, -16], [12, 12], [-12, 12], [12, -12], [-12, -12]]

const VERTEX = /* glsl */ `
attribute vec4 aPart;
uniform float uGrow;
varying vec3 vNormal;
varying vec3 vModelNormal;
varying vec3 vView;
varying vec3 vPlace;
varying vec4 vPart;
void main() {
  // uGrow moves the skin out. The outline of the selected part is the same body, made a little larger.
  vec4 view = modelViewMatrix * vec4(position + normal * uGrow, 1.0);
  vNormal = normalMatrix * normal;
  vModelNormal = normal;
  vView = view.xyz;
  vPlace = position;
  vPart = aPart;
  gl_Position = projectionMatrix * view;
}`

// Each corner of the mesh knows its distance to the head, the torso, the arms and the legs.
// The arms own the skin where they are the nearest. Three lines divide the rest of the body:
// the collar, the waist and the hip. So each pixel has a distance to each of the five parts.
const NEAREST = /* glsl */ `
varying vec3 vNormal;
varying vec3 vModelNormal;
varying vec3 vView;
varying vec3 vPlace;
varying vec4 vPart;
uniform vec3 uColor[5];
uniform float uGlow[5];
uniform int uSelected;
// The three lines as numbers: each one is positive below its line.
vec3 borders() {
  float x = vPlace.x;
  float y = ${CENTER_Y.toFixed(1)} - vPlace.y;
  float z = vPlace.z;
  return vec3(${BORDERS.neck}, ${BORDERS.waist}, ${BORDERS.hip});
}
void distances(out float d[5]) {
  vec3 line = borders();
  float neck = line.x;
  float waist = line.y;
  float hip = line.z;
  float trunk = min(vPart.x, min(vPart.y, vPart.w));
  d[0] = trunk + max(neck, 0.0);
  d[1] = trunk + max(max(-neck, waist), 0.0);
  d[2] = trunk + max(max(-waist, hip), 0.0);
  d[3] = vPart.z;
  d[4] = trunk + max(-hip, 0.0);
}
// Finds the part that owns this pixel, and the part on the other side of the nearest border.
void nearest(out int part, out int other) {
  float d[5];
  distances(d);
  part = 0;
  other = 0;
  float best = d[0];
  float next = 10000.0;
  for (int i = 1; i < 5; i++) {
    if (d[i] < best) { next = best; other = part; best = d[i]; part = i; }
    else if (d[i] < next) { next = d[i]; other = i; }
  }
}`

const BODY_FRAGMENT = /* glsl */ `
${NEAREST}
uniform float uBridge;
uniform float uPixel;
uniform float uUnit;
uniform int uHover;
uniform vec3 uText;
uniform vec3 uSeam;
// How many pixels a value is away from zero. It gives lines of the same width at each size.
float pixels(float value) { return value / max(fwidth(value), 0.00001) / uPixel; }
void main() {
  int part;
  int other;
  nearest(part, other);
  // "seam" is the distance to the nearest border in pixels of the page. It draws the thin line between two parts.
  // uUnit is the size of one pixel of the canvas in the units of the body.
  // For the collar, the waist and the hip, the slope of the line keeps the border thin on skin that is almost level.
  vec3 line = borders();
  vec3 far = abs(line) / max(fwidth(line), vec3(0.6 * uUnit));
  float seam = part == 0 ? far.x : part == 1 ? min(far.x, far.y) : part == 2 ? min(far.y, far.z) : far.z;
  float arm = abs(vPart.z - min(vPart.x, min(vPart.y, vPart.w))) / uUnit;
  seam = (part == 3 ? arm : min(seam, arm)) / uPixel;
  vec3 n = normalize(vNormal);
  vec3 v = normalize(-vView);
  float facing = abs(dot(n, v));
  vec3 base = uColor[part];
  float glow = uGlow[part];
  bool selected = part == uSelected;
  float lift = part == uHover ? 1.0 : 0.0;

  if (uBridge > 0.5) {
    // Bridge look: a drawing of thin lines. Rings at equal heights, the outer edge, and the borders of the parts.
    float level = vPlace.y / 9.0;
    float ring = 1.0 - smoothstep(0.35, 1.0, abs(fract(level) - 0.5) / max(fwidth(level), 0.00001) / uPixel);
    ring *= 1.0 - smoothstep(0.7, 0.93, abs(normalize(vModelNormal).y));
    float edge = 1.0 - smoothstep(0.9, 1.7, pixels(facing));
    float border = 1.0 - smoothstep(0.3, 0.8, seam);
    float strength = glow > 0.0 ? 0.95 : 0.42;
    if (selected) strength = 1.0;
    strength = min(1.0, strength + lift * 0.25);
    float alpha = max(ring * strength, edge * max(strength, 0.7));
    // A part with a problem also gets a weak fill, so it reads from a distance.
    alpha = max(alpha, glow * 0.14);
    vec3 color = selected && glow == 0.0 ? uText : base;
    // The border between two parts is a light line, the same on both sides. It is brighter around the selected part.
    gl_FragColor = mix(vec4(color * alpha, alpha), vec4(uText, 1.0) * (selected || other == uSelected ? 1.0 : 0.6), border);
    return;
  }

  // Soft look: a matte body. A soft light from the front and above, and a thin light on the edge.
  float key = dot(n, normalize(vec3(-0.4, 0.55, 0.75))) * 0.5 + 0.5;
  key *= key;
  float sky = n.y * 0.5 + 0.5;
  float rim = pow(1.0 - facing, 2.5) * smoothstep(-0.6, 0.5, dot(n, normalize(vec3(0.55, 0.45, -0.3))));
  vec3 color = base * (0.44 + 0.7 * key + 0.1 * sky);
  // A part with a problem keeps more of its own color in the shadow.
  color = mix(color, base * (0.7 + 0.36 * key), glow * 0.8);
  color += mix(uText, base, 0.45) * rim * (0.5 + 0.1 * glow);
  color *= 1.0 + lift * 0.14;
  // The border of the selected part is a light line, half on each side. Each other border is a thin dark line.
  if (selected || other == uSelected) color = mix(color, uText, 1.0 - smoothstep(0.7, 1.2, seam));
  else color = mix(color, uSeam, (1.0 - smoothstep(0.25, 0.85, seam)) * 0.9);
  gl_FragColor = vec4(color, 1.0);
}`

const OUTLINE_FRAGMENT = /* glsl */ `
${NEAREST}
uniform vec3 uText;
void main() {
  int part;
  int other;
  nearest(part, other);
  if (part != uSelected) discard;
  gl_FragColor = vec4(uText, 1.0);
}`

// Reads a color of the page (a CSS variable) as three numbers from 0 to 1.
let probe: CanvasRenderingContext2D | null = null
function pageColor(name: string, fallback: string): Rgb {
  probe ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  if (!probe) return [0.5, 0.5, 0.5]
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  probe.fillStyle = fallback
  if (value) probe.fillStyle = value
  probe.fillRect(0, 0, 1, 1)
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data
  return [r / 255, g / 255, b / 255]
}

// Asks the browser one time if it can make a WebGL picture.
let webgl: boolean | null = null
function hasWebgl() {
  if (webgl === null) {
    try {
      const context = document.createElement('canvas').getContext('webgl2')
      webgl = context !== null
      context?.getExtension('WEBGL_lose_context')?.loseContext()
    } catch {
      webgl = false
    }
  }
  return webgl
}

type Engine = {
  canvas: HTMLCanvasElement
  show: (statuses: Record<BodyPart, Status>, selected: BodyPart | null) => void
  focus: (part: BodyPart | null) => void
  dispose: () => void
}

// Makes the 3D scene inside `wrap`. It throws an error if the browser has no WebGL.
function createEngine(wrap: HTMLElement, onSelect: (part: BodyPart) => void, onLost: () => void): Engine {
  const canvas = document.createElement('canvas')
  canvas.className = 'body3d-canvas'
  canvas.setAttribute('role', 'img')
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' })
  renderer.setClearColor(0x000000, 0)
  const rings = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  rings.setAttribute('class', 'body3d-rings')
  rings.setAttribute('aria-hidden', 'true')
  // The soft lights sit behind the canvas, so the body covers their middle.
  const lights = document.createElement('div')
  lights.className = 'body3d-lights'
  lights.setAttribute('aria-hidden', 'true')
  wrap.prepend(lights, canvas, rings)

  const shape = bodyMesh()
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(shape.position, 3))
  geometry.setAttribute('normal', new BufferAttribute(shape.normal, 3))
  geometry.setAttribute('aPart', new BufferAttribute(shape.part, 4))
  geometry.setIndex(new BufferAttribute(shape.index, 1))

  // The two materials read the same colors.
  const shared = {
    uColor: { value: PARTS.map(() => new Vector3()) },
    uGlow: { value: PARTS.map(() => 0) },
    uSelected: { value: -1 },
    uText: { value: new Vector3() },
  }
  const bodyMaterial = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: BODY_FRAGMENT,
    uniforms: { ...shared, uGrow: { value: 0 }, uBridge: { value: 0 }, uPixel: { value: 1 }, uUnit: { value: 1 }, uHover: { value: -1 }, uSeam: { value: new Vector3() } },
  })
  const outlineMaterial = new ShaderMaterial({ vertexShader: VERTEX, fragmentShader: OUTLINE_FRAGMENT, side: BackSide, uniforms: { ...shared, uGrow: { value: 2 } } })
  const body = new Mesh(geometry, bodyMaterial)
  const outline = new Mesh(geometry, outlineMaterial)
  outline.frustumCulled = false
  // `turn` holds the turn to the left and right. `tilt` holds the small turn up and down.
  const turn = new Group().add(body, outline)
  const tilt = new Group().add(turn)
  const scene = new Scene().add(tilt)
  const camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, 500, 4000)

  let statuses: Record<BodyPart, Status> | null = null
  let selected: BodyPart | null = null
  let hover: BodyPart | null = null
  let focused: BodyPart | null = null
  let yaw = 0
  let pitch = REST_PITCH
  let speed = 0
  let spin = 0
  let lastTouch = -REST_TIME
  let scale = 1
  let width = 0
  let height = 0
  let frame = 0
  let lastTime = 0
  let dirty = true
  let onScreen = true
  let disposed = false
  let drag: { id: number; x: number; y: number; startX: number; startY: number; time: number; moved: boolean } | null = null
  let mouse: { x: number; y: number } | null = null
  let over = false
  const still = matchMedia('(prefers-reduced-motion: reduce)')
  const circles = new Map<BodyPart, SVGCircleElement[]>()
  const spots = new Map<BodyPart, HTMLElement[]>()
  const ray = new Raycaster()
  const pointer = new Vector2()
  const point = new Vector3()

  // The number of a part for the shader. -1 means no part.
  const number = (part: BodyPart | null) => (part ? PARTS.indexOf(part) : -1)

  // Sends the colors of the page and the state of each part to the shader.
  function paint() {
    const bridge = document.documentElement.dataset.look === 'bridge'
    const text = pageColor('--text', '#f6f2ea')
    const neutral = pageColor('--border-strong', '#4a453c')
    const status: Record<Status, Rgb> = { normal: bridge ? text : neutral, caution: pageColor('--warning', '#f5b955'), alert: pageColor('--critical', '#ff7a66') }
    PARTS.forEach((part, i) => {
      const state = statuses?.[part] ?? 'normal'
      shared.uColor.value[i].set(...status[state])
      shared.uGlow.value[i] = GLOW[state]
    })
    shared.uText.value.set(...text)
    shared.uSelected.value = number(selected)
    bodyMaterial.uniforms.uSeam.value.set(...pageColor('--surface', '#171614'))
    bodyMaterial.uniforms.uBridge.value = bridge ? 1 : 0
    bodyMaterial.uniforms.uHover.value = number(focused ?? hover)
    outline.visible = selected !== null
    dirty = true
    wake()
  }

  // Each part with a problem gets two rings and a soft light.
  // The rings are SVG circles on top of the canvas, so they look the same as the rings of the 2D figure.
  function makeRings() {
    rings.replaceChildren()
    lights.replaceChildren()
    circles.clear()
    spots.clear()
    for (const part of PARTS) {
      const state = statuses?.[part] ?? 'normal'
      if (state === 'normal') continue
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      group.setAttribute('class', `status-${state}`)
      const pair = [0, 1].map(() => document.createElementNS('http://www.w3.org/2000/svg', 'circle'))
      pair[1].setAttribute('opacity', '0.45')
      group.append(...pair)
      rings.append(group)
      circles.set(part, pair)
      const made = SPOTS[part].map(() => document.createElement('div'))
      for (const spot of made) spot.className = `body3d-light status-${state}`
      lights.append(...made)
      spots.set(part, made)
    }
  }
  // Moves the rings and the lights to the place of their part on the screen.
  function placeRings() {
    for (const [part, pair] of circles) {
      point.set(MARK[part][0], CENTER_Y - MARK[part][1], 0).applyMatrix4(turn.matrixWorld).project(camera)
      pair.forEach((circle, i) => {
        circle.setAttribute('cx', ((point.x * 0.5 + 0.5) * width).toFixed(1))
        circle.setAttribute('cy', ((0.5 - point.y * 0.5) * height).toFixed(1))
        circle.setAttribute('r', (RING[part][i] * scale).toFixed(1))
      })
    }
    for (const [part, made] of spots) {
      made.forEach((spot, i) => {
        const [x, y, halfWidth, halfHeight] = SPOTS[part][i]
        point.set(x, CENTER_Y - y, 0).applyMatrix4(turn.matrixWorld).project(camera)
        spot.style.width = `${(halfWidth * 2 * scale).toFixed(1)}px`
        spot.style.height = `${(halfHeight * 2 * scale).toFixed(1)}px`
        spot.style.transform = `translate(${((point.x * 0.5 + 0.5) * width - halfWidth * scale).toFixed(1)}px, ${((0.5 - point.y * 0.5) * height - halfHeight * scale).toFixed(1)}px)`
      })
    }
  }

  function resize() {
    width = wrap.clientWidth
    height = wrap.clientHeight
    if (!width || !height) return
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    renderer.setPixelRatio(ratio)
    renderer.setSize(width, height, false)
    // Fit the frame of the drawing inside the box, the same as an SVG does.
    const frameHeight = Math.max(FRAME_H, (FRAME_W * height) / width)
    scale = height / frameHeight
    camera.aspect = width / height
    camera.position.z = frameHeight / 2 / Math.tan((FIELD_OF_VIEW * Math.PI) / 360)
    camera.updateProjectionMatrix()
    bodyMaterial.uniforms.uPixel.value = ratio
    bodyMaterial.uniforms.uUnit.value = 1 / (scale * ratio)
    // The outline is about 2 pixels wide at each size.
    outlineMaterial.uniforms.uGrow.value = 2 / scale
    rings.setAttribute('viewBox', `0 0 ${width} ${height}`)
    dirty = true
    wake()
  }

  // The part of the body under a point of the screen, or null.
  function pick(x: number, y: number, reach: number): BodyPart | null {
    const box = canvas.getBoundingClientRect()
    tilt.updateMatrixWorld(true)
    for (let i = 0; i < reach; i++) {
      pointer.set(((x + NEAR[i][0] - box.left) / box.width) * 2 - 1, 1 - ((y + NEAR[i][1] - box.top) / box.height) * 2)
      ray.setFromCamera(pointer, camera)
      const hit = ray.intersectObject(body, false)[0]
      if (!hit) continue
      turn.worldToLocal(point.copy(hit.point))
      return partAt(point.x, point.y, point.z)
    }
    return null
  }
  function setHover(part: BodyPart | null) {
    if (part === hover) return
    hover = part
    bodyMaterial.uniforms.uHover.value = number(focused ?? hover)
    dirty = true
    wake()
  }

  function draw(time: number) {
    frame = 0
    const dt = Math.min(0.05, (time - lastTime) / 1000)
    lastTime = time
    const before = yaw + pitch * 7
    if (mouse && !drag) {
      setHover(pick(mouse.x, mouse.y, 5))
      canvas.style.cursor = hover ? 'pointer' : 'grab'
      mouse = null
    }
    if (!drag) {
      const resting = !still.matches && !over && focused === null && time - lastTouch > REST_TIME
      // The slow turn starts and stops softly. A drag leaves a little speed that fades.
      speed += ((resting ? TURN_SPEED : 0) - speed) * Math.min(1, dt * 1.6)
      spin *= Math.exp(-dt * 5)
      if (Math.abs(spin) < 0.01) spin = 0
      yaw += (speed + spin) * dt
      if (resting) pitch += (REST_PITCH - pitch) * Math.min(1, dt * 1.5)
      // With the keyboard, the figure turns its front to the person, so the part with the focus is in view.
      if (focused !== null) {
        const front = Math.round(yaw / (Math.PI * 2)) * Math.PI * 2
        yaw += (front - yaw) * Math.min(1, dt * 6)
        if (Math.abs(front - yaw) < 0.002) yaw = front
      }
    }
    const moved = Math.abs(yaw + pitch * 7 - before) > 1e-5
    if (moved || dirty) {
      dirty = false
      turn.rotation.y = yaw
      tilt.rotation.x = pitch
      renderer.render(scene, camera)
      placeRings()
    }
    // With no movement to wait for, the loop sleeps until the next change.
    const waiting = !still.matches && focused === null
    if (moved || drag || waiting || spin !== 0) wake()
  }
  function wake() {
    if (frame || disposed || !onScreen || document.hidden || !width) return
    frame = requestAnimationFrame(draw)
  }
  function sleep() {
    cancelAnimationFrame(frame)
    frame = 0
  }

  function onDown(event: PointerEvent) {
    if (drag || (event.pointerType === 'mouse' && event.button !== 0)) return
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, time: performance.now(), moved: false }
    canvas.setPointerCapture(event.pointerId)
    // The figure stops at once when a person touches it.
    speed = 0
    spin = 0
    lastTouch = performance.now()
    if (event.pointerType === 'mouse') event.preventDefault()
    wake()
  }
  function onMove(event: PointerEvent) {
    if (!drag) {
      if (event.pointerType !== 'mouse') return
      mouse = { x: event.clientX, y: event.clientY }
      // The figure does not turn while the mouse is over it. So the part under the mouse stays the same.
      over = true
      wake()
      return
    }
    if (event.pointerId !== drag.id) return
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    drag.x = event.clientX
    drag.y = event.clientY
    if (!drag.moved) {
      const farX = Math.abs(event.clientX - drag.startX)
      const farY = Math.abs(event.clientY - drag.startY)
      if (Math.hypot(farX, farY) < 6) return
      // A finger that moves up or down scrolls the page. The figure does not move then.
      if (event.pointerType !== 'mouse' && farY > farX) {
        canvas.releasePointerCapture(drag.id)
        drag = null
        return
      }
      drag.moved = true
    }
    canvas.style.cursor = 'grabbing'
    yaw += dx * DRAG_YAW
    pitch = Math.max(-0.3, Math.min(0.55, pitch + dy * DRAG_PITCH))
    if (!still.matches) spin = spin * 0.6 + ((dx * DRAG_YAW) / 0.016) * 0.4
    lastTouch = performance.now()
    dirty = true
    wake()
  }
  function onUp(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return
    const tap = !drag.moved && performance.now() - drag.time < 700
    drag = null
    lastTouch = performance.now()
    canvas.style.cursor = ''
    if (event.type === 'pointercancel') return
    if (tap) {
      spin = 0
      const part = pick(event.clientX, event.clientY, event.pointerType === 'mouse' ? 5 : NEAR.length)
      if (part) onSelect(part)
    }
    wake()
  }
  function onLeave() {
    mouse = null
    over = false
    lastTouch = performance.now()
    if (!drag) setHover(null)
  }
  function onContextLost(event: Event) {
    event.preventDefault()
    onLost()
  }
  function onVisible() {
    if (document.hidden) sleep()
    else wake()
  }
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onUp)
  canvas.addEventListener('pointerleave', onLeave)
  canvas.addEventListener('webglcontextlost', onContextLost)
  document.addEventListener('visibilitychange', onVisible)
  still.addEventListener('change', wake)
  const sizes = new ResizeObserver(resize)
  sizes.observe(wrap)
  // The loop stops when the figure is not on the screen.
  const sight = new IntersectionObserver((entries) => {
    onScreen = entries[entries.length - 1].isIntersecting
    if (onScreen) wake()
    else sleep()
  })
  sight.observe(wrap)
  // The colors come from the page. Read them again when the look changes.
  const looks = new MutationObserver(paint)
  looks.observe(document.documentElement, { attributes: true, attributeFilter: ['data-look', 'class', 'style'] })
  resize()
  paint()

  return {
    canvas,
    show(nextStatuses, nextSelected) {
      const same = statuses !== null && PARTS.every((part) => statuses?.[part] === nextStatuses[part])
      if (same && selected === nextSelected) return
      statuses = { ...nextStatuses }
      selected = nextSelected
      if (!same) makeRings()
      paint()
    },
    focus(part) {
      focused = part
      lastTouch = performance.now()
      paint()
    },
    dispose() {
      disposed = true
      sleep()
      sizes.disconnect()
      sight.disconnect()
      looks.disconnect()
      document.removeEventListener('visibilitychange', onVisible)
      still.removeEventListener('change', wake)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      geometry.dispose()
      bodyMaterial.dispose()
      outlineMaterial.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
      rings.remove()
      lights.remove()
    },
  }
}

export default function BodyFigure3D({ statuses, symptomCounts, selected, onSelect }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const engine = useRef<Engine | null>(null)
  const select = useRef(onSelect)
  // The 2D figure takes the place of the 3D figure when the browser has no WebGL.
  const [flat, setFlat] = useState(() => !hasWebgl())
  const describe = (part: BodyPart) => {
    const names = { part: t(BODY_PART_LABEL[part]), status: STATUS_LABEL[statuses[part]] }
    const count = symptomCounts[part]
    return count ? tn(count, '{part}: {status}, {count} open symptom', '{part}: {status}, {count} open symptoms', names) : t('{part}: {status}', names)
  }
  const problems = PARTS.filter((part) => statuses[part] !== 'normal').map(describe)
  const label = `${t('Body of the crew member in 3D.')} ${problems.length ? `${problems.join('. ')}.` : t('All parts are normal.')}`

  useEffect(() => {
    select.current = onSelect
  }, [onSelect])
  useEffect(() => {
    if (flat || !wrap.current) return
    let made: Engine | null = null
    let late = 0
    try {
      made = createEngine(wrap.current, (part) => select.current(part), () => setFlat(true))
    } catch {
      // The browser said yes to WebGL, but the scene did not start. Change to the 2D figure after this effect.
      late = requestAnimationFrame(() => setFlat(true))
    }
    engine.current = made
    return () => {
      cancelAnimationFrame(late)
      made?.dispose()
      engine.current = null
    }
  }, [flat])
  useEffect(() => {
    engine.current?.show(statuses, selected)
    engine.current?.canvas.setAttribute('aria-label', label)
  }, [statuses, selected, label])

  if (flat) return <BodyFigure statuses={statuses} symptomCounts={symptomCounts} selected={selected} onSelect={onSelect} />
  return (
    <div className="body3d" ref={wrap}>
      {/* The canvas has no parts for the keyboard. These buttons do the same as a tap on a part. A button shows when it has the focus. */}
      <ul className="body3d-keys" aria-label={t('Parts of the body')}>
        {PARTS.map((part) => (
          <li key={part}>
            <button type="button" aria-pressed={selected === part} onClick={() => onSelect(part)} onFocus={() => engine.current?.focus(part)} onBlur={() => engine.current?.focus(null)}>
              {describe(part)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
