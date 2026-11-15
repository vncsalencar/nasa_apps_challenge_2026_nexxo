import { useEffect, useRef, useState } from 'react'
import { BackSide, BufferAttribute, BufferGeometry, Group, Mesh, PerspectiveCamera, Raycaster, Scene, ShaderMaterial, Vector2, Vector3, WebGLRenderer } from 'three'
import { t } from '../i18n.ts'
import { BodyFigure } from './BodyFigure.tsx'
import { bodyMesh, BORDERS, CENTER_Y, JAW, regionAt, REGIONS, SPOTS } from './body3d-shape.ts'
import type { FigurePoint, FigureProps, Heat, HeatRegion } from './heat.ts'
import { heatMix } from './heat.ts'
import './body3d.css'

// The body figure in 3D. It shows the same thing as the 2D figure: the color of each region shows its heat,
// a region with no heat is neutral, and a tap selects a region.
// The figure turns slowly by itself. A sideways drag turns it by hand.

type Rgb = [number, number, number]

// The camera sees the same frame as the 2D drawing: 300 wide and 560 high.
const FRAME_W = 300
const FRAME_H = 560
const FIELD_OF_VIEW = 20
// Radians for each second of the slow turn, and radians for each pixel of a drag.
const TURN_SPEED = 0.2
const DRAG_YAW = 0.011
const DRAG_PITCH = 0.004
const REST_PITCH = 0.13
// The figure starts to turn again this long after the last touch (milliseconds).
const REST_TIME = 3500
// A tap that misses the figure by a few pixels still selects a region. This helps a finger in a glove.
const NEAR: [number, number][] = [[0, 0], [9, 0], [-9, 0], [0, 9], [0, -9], [16, 0], [-16, 0], [0, 16], [0, -16], [12, 12], [-12, 12], [12, -12], [-12, -12]]
// The order of the buttons for the keyboard: from the head down.
const KEYS: HeatRegion[] = ['head', 'brain', 'eyes', 'face', 'airway', 'chest', 'abdomen', 'arms', 'legs']

const VERTEX = /* glsl */ `
attribute vec4 aPart;
uniform float uGrow;
varying vec3 vNormal;
varying vec3 vModelNormal;
varying vec3 vView;
varying vec3 vPlace;
varying vec4 vPart;
void main() {
  // uGrow moves the skin out. The outline of the selected region is the same body, made a little larger.
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
// The four spot regions lie on top of the parts. Each one is a shape in the drawing.
// A region has a number: 0 to 4 for the parts, 5 to 8 for the spot regions.
const NEAREST = /* glsl */ `
varying vec3 vNormal;
varying vec3 vModelNormal;
varying vec3 vView;
varying vec3 vPlace;
varying vec4 vPart;
uniform int uSelected;
// The three lines as numbers: each one is positive below its line.
vec3 borders() {
  float x = vPlace.x;
  float y = ${CENTER_Y.toFixed(1)} - vPlace.y;
  float z = vPlace.z;
  return vec3(${BORDERS.neck}, ${BORDERS.waist}, ${BORDERS.hip});
}
// The four spot regions as numbers: each one is positive inside its region.
vec4 spots() {
  float x = vPlace.x;
  float y = ${CENTER_Y.toFixed(1)} - vPlace.y;
  float z = vPlace.z;
  float jaw = ${JAW};
  return vec4(${SPOTS.join(', ')});
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
// The heat of each region as two numbers: how much of the hot color shows, and where the hot color is
// between the caution color (0) and the alert color (1). heatMix() of heat.ts gives the two numbers.
uniform vec2 uHeat[9];
uniform vec3 uNeutral;
uniform vec3 uWarning;
uniform vec3 uCritical;
uniform float uBridge;
uniform float uPixel;
uniform float uUnit;
uniform int uHover;
uniform vec3 uText;
uniform vec3 uSeam;
// How many pixels a value is away from zero. It gives lines of the same width at each size.
float pixels(float value) { return value / max(fwidth(value), 0.00001) / uPixel; }
// A line along a border. "far" is the distance to the border in pixels of the page.
float stroke(float far, float from, float to) { return 1.0 - smoothstep(from, to, far); }
void main() {
  int part;
  int other;
  nearest(part, other);
  // "partSeam" is the distance to the nearest border between two parts, in pixels of the page.
  // uUnit is the size of one pixel of the canvas in the units of the body.
  // For the collar, the waist and the hip, the slope of the line keeps the border thin on skin that is almost level.
  vec3 line = borders();
  vec3 far = abs(line) / max(fwidth(line), vec3(0.6 * uUnit));
  float partSeam = part == 0 ? far.x : part == 1 ? min(far.x, far.y) : part == 2 ? min(far.y, far.z) : far.z;
  float arm = abs(vPart.z - min(vPart.x, min(vPart.y, vPart.w))) / uUnit;
  partSeam = (part == 3 ? arm : min(partSeam, arm)) / uPixel;
  // "edge" is the distance to the edge of each spot region, in pixels of the page.
  vec4 spot = spots();
  vec4 edge = abs(spot) / max(fwidth(spot), vec4(0.6 * uUnit)) / uPixel;

  // "region" gives the color of the pixel: a spot region with heat, or else the part.
  // A spot region with no heat is not visible, so the part below shows.
  // "seam" is the distance to the nearest border that shows. It draws the thin line between two regions.
  // Inside a spot region with heat, only the edge of that region counts. So a border between two parts does not cross it.
  int region = part;
  float seam = partSeam;
  for (int i = 0; i < 4; i++) {
    if (uHeat[5 + i].x <= 0.0) continue;
    if (spot[i] > 0.0) { region = 5 + i; seam = edge[i]; }
    else if (region < 5) seam = min(seam, edge[i]);
  }
  vec2 heat = uHeat[region];
  vec3 hot = mix(uWarning, uCritical, heat.y);
  vec3 base = mix(uNeutral, hot, heat.x);
  float glow = heat.x;
  // "mark" is the distance to the border of the selected region. The selected region can be a spot region with no heat.
  bool selected = false;
  float mark = 10000.0;
  if (uSelected >= 5) {
    selected = spot[uSelected - 5] > 0.0;
    mark = edge[uSelected - 5];
  } else if (part == uSelected || other == uSelected) {
    selected = part == uSelected;
    mark = partSeam;
  }
  // The region under the pointer is a little brighter.
  float lift = (uHover >= 5 ? spot[uHover - 5] > 0.0 : region == uHover) ? 1.0 : 0.0;
  vec3 n = normalize(vNormal);
  vec3 v = normalize(-vView);
  float facing = abs(dot(n, v));

  if (uBridge > 0.5) {
    // Bridge look: a drawing of thin lines. Rings at equal heights, the outer edge, and the borders of the regions.
    float level = vPlace.y / 9.0;
    float ring = 1.0 - smoothstep(0.35, 1.0, abs(fract(level) - 0.5) / max(fwidth(level), 0.00001) / uPixel);
    ring *= 1.0 - smoothstep(0.7, 0.93, abs(normalize(vModelNormal).y));
    float outer = 1.0 - smoothstep(0.9, 1.7, pixels(facing));
    // The lines of a region are brighter when the region has more heat.
    float strength = mix(0.42, 0.95, glow);
    if (selected) strength = 1.0;
    strength = min(1.0, strength + lift * 0.25);
    float alpha = max(ring * strength, outer * max(strength, 0.7));
    vec3 color = selected && glow == 0.0 ? uText : base;
    // A region with heat also gets a fill of the hot color below its lines, so it reads from a distance.
    float fill = glow * 0.34 * (1.0 - alpha);
    vec4 pixel = vec4(color * alpha + hot * fill, alpha + fill);
    // The border between two regions is a light line, the same on both sides. It is brighter around the selected region.
    pixel = mix(pixel, vec4(uText, 1.0) * 0.6, stroke(seam, 0.3, 0.8));
    gl_FragColor = mix(pixel, vec4(uText, 1.0), stroke(mark, 0.3, 0.8));
    return;
  }

  // Soft look: a matte body. A soft light from the front and above, and a thin light on the edge.
  float key = dot(n, normalize(vec3(-0.4, 0.55, 0.75))) * 0.5 + 0.5;
  key *= key;
  float sky = n.y * 0.5 + 0.5;
  float rim = pow(1.0 - facing, 2.5) * smoothstep(-0.6, 0.5, dot(n, normalize(vec3(0.55, 0.45, -0.3))));
  vec3 color = base * (0.44 + 0.7 * key + 0.1 * sky);
  // A region with heat keeps more of its own color in the shadow. More heat keeps more color.
  color = mix(color, base * (0.7 + 0.36 * key), glow * 0.8);
  color += mix(uText, base, 0.45) * rim * (0.5 + 0.1 * glow);
  color *= 1.0 + lift * 0.14;
  // Each border is a thin dark line. The border of the selected region is a light line, half on each side.
  color = mix(color, uSeam, stroke(seam, 0.25, 0.85) * 0.9);
  color = mix(color, uText, stroke(mark, 0.7, 1.2));
  gl_FragColor = vec4(color, 1.0);
}`

const OUTLINE_FRAGMENT = /* glsl */ `
${NEAREST}
uniform vec3 uText;
void main() {
  int part;
  int other;
  nearest(part, other);
  vec4 spot = spots();
  // The selected region is a part, or a spot region on top of the parts.
  bool selected = uSelected >= 5 ? spot[uSelected - 5] > 0.0 : part == uSelected;
  if (!selected) discard;
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
  show: (heat: Heat, selected: HeatRegion | null) => void
  focus: (region: HeatRegion | null) => void
  dispose: () => void
}
type Calls = {
  onSelect: (region: HeatRegion) => void
  onHover: (region: HeatRegion | null, point?: FigurePoint) => void
  onLost: () => void
}

// Makes the 3D scene inside `wrap`. It throws an error if the browser has no WebGL.
function createEngine(wrap: HTMLElement, { onSelect, onHover, onLost }: Calls): Engine {
  const canvas = document.createElement('canvas')
  canvas.className = 'body3d-canvas'
  // The buttons for the keyboard tell a screen reader about the regions. The canvas is only the picture.
  canvas.setAttribute('aria-hidden', 'true')
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' })
  renderer.setClearColor(0x000000, 0)
  wrap.prepend(canvas)

  const shape = bodyMesh()
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(shape.position, 3))
  geometry.setAttribute('normal', new BufferAttribute(shape.normal, 3))
  geometry.setAttribute('aPart', new BufferAttribute(shape.part, 4))
  geometry.setIndex(new BufferAttribute(shape.index, 1))

  // The two materials read the same selected region and the same color of the text.
  const shared = { uSelected: { value: -1 }, uText: { value: new Vector3() } }
  const bodyMaterial = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: BODY_FRAGMENT,
    uniforms: {
      ...shared,
      uHeat: { value: REGIONS.map(() => new Vector2()) },
      uNeutral: { value: new Vector3() },
      uWarning: { value: new Vector3() },
      uCritical: { value: new Vector3() },
      uGrow: { value: 0 },
      uBridge: { value: 0 },
      uPixel: { value: 1 },
      uUnit: { value: 1 },
      uHover: { value: -1 },
      uSeam: { value: new Vector3() },
    },
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

  let heat: Heat | null = null
  let selected: HeatRegion | null = null
  let hover: HeatRegion | null = null
  let focused: HeatRegion | null = null
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
  let mouse: FigurePoint | null = null
  let over = false
  const still = matchMedia('(prefers-reduced-motion: reduce)')
  const ray = new Raycaster()
  const pointer = new Vector2()
  const point = new Vector3()

  // The number of a region for the shader. -1 means no region.
  const number = (region: HeatRegion | null) => (region ? REGIONS.indexOf(region) : -1)

  // Sends the colors of the page and the heat of each region to the shader.
  function paint() {
    const bridge = document.documentElement.dataset.look === 'bridge'
    const text = pageColor('--text', '#f6f2ea')
    const uniforms = bodyMaterial.uniforms
    REGIONS.forEach((region, i) => {
      const mix = heatMix(heat?.[region] ?? 0)
      uniforms.uHeat.value[i].set(mix.amount, mix.toCritical)
    })
    // The Bridge look is a drawing of lines, so the neutral color is the color of the text.
    uniforms.uNeutral.value.set(...(bridge ? text : pageColor('--border-strong', '#4a453c')))
    uniforms.uWarning.value.set(...pageColor('--warning', '#f5b955'))
    uniforms.uCritical.value.set(...pageColor('--critical', '#ff7a66'))
    uniforms.uSeam.value.set(...pageColor('--surface', '#171614'))
    uniforms.uBridge.value = bridge ? 1 : 0
    uniforms.uHover.value = number(focused ?? hover)
    shared.uText.value.set(...text)
    shared.uSelected.value = number(selected)
    outline.visible = selected !== null
    dirty = true
    wake()
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
    dirty = true
    wake()
  }

  // The region of the body under a point of the screen, or null.
  function pick(x: number, y: number, reach: number): HeatRegion | null {
    const box = canvas.getBoundingClientRect()
    tilt.updateMatrixWorld(true)
    for (let i = 0; i < reach; i++) {
      pointer.set(((x + NEAR[i][0] - box.left) / box.width) * 2 - 1, 1 - ((y + NEAR[i][1] - box.top) / box.height) * 2)
      ray.setFromCamera(pointer, camera)
      const hit = ray.intersectObject(body, false)[0]
      if (!hit) continue
      turn.worldToLocal(point.copy(hit.point))
      return regionAt(point.x, point.y, point.z)
    }
    return null
  }
  // Keeps the region under the pointer, and tells the page about it. `at` is the place of the pointer.
  function setHover(region: HeatRegion | null, at?: FigurePoint) {
    if (region) onHover(region, at)
    else if (hover) onHover(null)
    if (region === hover) return
    hover = region
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
      setHover(pick(mouse.x, mouse.y, 5), mouse)
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
      // With the keyboard, the figure turns its front to the person, so the region with the focus is in view.
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
      // The figure does not turn while the mouse is over it. So the region under the mouse stays the same.
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
      // The skin moves below the pointer during a drag. So no region is under the pointer until the drag ends.
      setHover(null)
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
      const region = pick(event.clientX, event.clientY, event.pointerType === 'mouse' ? 5 : NEAR.length)
      if (region) onSelect(region)
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
    show(nextHeat, nextSelected) {
      const same = heat !== null && REGIONS.every((region) => heat?.[region] === nextHeat[region])
      if (same && selected === nextSelected) return
      heat = { ...nextHeat }
      selected = nextSelected
      paint()
    },
    focus(region) {
      focused = region
      lastTouch = performance.now()
      paint()
    },
    dispose() {
      disposed = true
      sleep()
      // The figure goes away, so no region is under the pointer.
      setHover(null)
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
    },
  }
}

export default function BodyFigure3D(props: FigureProps) {
  const { heat, labels, selected, onSelect, onHover } = props
  const wrap = useRef<HTMLDivElement>(null)
  const engine = useRef<Engine | null>(null)
  // The engine lives longer than one render. It calls the newest functions of the page through this object.
  const calls = useRef({ onSelect, onHover })
  // The 2D figure takes the place of the 3D figure when the browser has no WebGL.
  const [flat, setFlat] = useState(() => !hasWebgl())

  useEffect(() => {
    calls.current = { onSelect, onHover }
  }, [onSelect, onHover])
  useEffect(() => {
    if (flat || !wrap.current) return
    let made: Engine | null = null
    let late = 0
    try {
      made = createEngine(wrap.current, {
        onSelect: (region) => calls.current.onSelect(region),
        onHover: (region, point) => calls.current.onHover?.(region, point),
        onLost: () => setFlat(true),
      })
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
    engine.current?.show(heat, selected)
  }, [heat, selected, flat])

  if (flat) return <BodyFigure {...props} />
  return (
    <div className="body3d" ref={wrap} role="group" aria-label={t('Body of the crew member')}>
      {/* The canvas has no regions for the keyboard. These buttons do the same as a tap on a region. A button shows when it has the focus. */}
      <ul className="body3d-keys">
        {KEYS.map((region) => (
          <li key={region}>
            <button
              type="button"
              aria-pressed={selected === region}
              aria-label={labels[region]}
              onClick={() => onSelect(region)}
              onFocus={() => {
                engine.current?.focus(region)
                onHover?.(region)
              }}
              onBlur={() => {
                engine.current?.focus(null)
                onHover?.(null)
              }}
            >
              {labels[region]}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
