// The 3D view of the helmet page: the helmet of the space suit of Neil Armstrong (Apollo 11),
// from the 3D scan of the Smithsonian Institution, with the CO2 sensors as lights and colored
// areas on the helmet. A person can turn it with a drag. Plain three.js, loaded only when a
// person selects the 3D view. The page draws the scan as it is: its shape and its pictures.
//
// Model: Smithsonian Institution, National Air and Space Museum, "Armstrong Space Suit"
// (https://3d.si.edu/object/3d/armstrong-space-suit:d8c63ba6-4ebc-11ea-b77f-2e728ce88125).
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { SENSORS, levelOf, type HelmetState, type Level } from '../../../shared/helmet.ts'
import { fmt, t } from '../i18n.ts'

// The helmet in the file of the model: its middle and its radius in the units of the file,
// the turn that points the visor to the viewer, and the height below which the page draws nothing.
const MODEL = { file: '/models/armstrong.glb', center: new THREE.Vector3(0.015, 1.66, 0.07), radius: 0.182, turn: 0, cut: 1.475 }
if (import.meta.env.DEV) {
  // For development only: the address can change these values, to find the helmet in a new model.
  const query = new URLSearchParams(location.search)
  const numbers = (name: string) => query.get(name)?.split(',').map(Number)
  const middle = numbers('mc')
  if (middle) MODEL.center.set(middle[0], middle[1], middle[2])
  MODEL.radius = numbers('mr')?.[0] ?? MODEL.radius
  MODEL.turn = numbers('mt')?.[0] ?? MODEL.turn
  MODEL.cut = numbers('mcut')?.[0] ?? MODEL.cut
}
// The page draws the helmet with this radius. The model gets the scale that fits.
const HELMET = { radius: 0.2, front: 1 }
const COLOR: Record<Level, number> = { normal: 0x7ddba3, caution: 0xf5b955, alert: 0xff7a66 }
const LEVEL_WORD: Record<Level, string> = { normal: t('normal'), caution: t('raised'), alert: t('high') }
// How far the label of a sensor is from its light, in pixels.
const LABEL_OUT = 46
// The size of the colored area of a sensor on the helmet, as an angle from its middle, in radians.
const AREA_ANGLE = 0.62

type Props = {
  helmet: HelmetState
  rising: string[]
  selected: string | null
  onSelect: (id: string) => void
  // The browser cannot draw 3D, or the model did not load. The page then shows the 2D drawing.
  onFail: () => void
}

// A soft round glow, drawn one time, for the light of each sensor.
function glowTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const context = canvas.getContext('2d')!
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.55)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(canvas)
}

export default function Helmet3D({ helmet, rising, selected, onSelect, onFail }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const labels = useRef<Record<string, HTMLButtonElement | null>>({})
  const lines = useRef<Record<string, SVGLineElement | null>>({})
  const [ready, setReady] = useState(false)
  // The newest values, for the drawing loop.
  const live = useRef({ helmet, rising, selected })
  useEffect(() => {
    live.current = { helmet, rising, selected }
  }, [helmet, rising, selected])
  const fail = useRef(onFail)
  useEffect(() => {
    fail.current = onFail
  }, [onFail])

  useEffect(() => {
    const box = wrap.current
    if (!box) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      fail.current()
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.8
    // The page cuts the suit below the helmet with a flat plane, so the edge is clean.
    renderer.localClippingEnabled = true
    const cutLocal = new THREE.Plane(new THREE.Vector3(0, 1, 0), -((MODEL.cut - MODEL.center.y) * HELMET.radius) / MODEL.radius)
    const cut = cutLocal.clone()
    const canvas = renderer.domElement
    box.prepend(canvas)

    const scene = new THREE.Scene()
    // A soft studio light from all sides, so the suit has depth and the visor has reflections.
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environmentIntensity = 0.16
    const key = new THREE.DirectionalLight(0xffffff, 2.6)
    key.position.set(-2.4, 2.2, 1.6)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0x8fb0ff, 1.6)
    rim.position.set(2.2, 0.8, -2)
    scene.add(rim)
    // Light from above and a dark floor, so the folds of the suit show.
    scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x0b0d12, 0.9))
    // A weak warm light from below at the front, as from the lamps of a work place.
    const fill = new THREE.DirectionalLight(0xffe2c4, 0.5)
    fill.position.set(1.2, -1.4, 2)
    scene.add(fill)

    const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 30)
    camera.position.set(0, 0.02, 1.55)
    camera.lookAt(0, -0.02, 0)

    // The model turns around the middle of the helmet.
    const pivot = new THREE.Group()
    scene.add(pivot)
    const sensors: Record<string, { light: THREE.Mesh; glow: THREE.Sprite; material: THREE.MeshBasicMaterial; glowMaterial: THREE.SpriteMaterial; areaMaterial: THREE.MeshBasicMaterial }> = {}
    const glowMap = glowTexture()
    // The colored area of a sensor: a round patch on the surface of the helmet that fades out at its edge.
    const fade = document.createElement('canvas')
    fade.width = 4
    fade.height = 64
    const fadeContext = fade.getContext('2d')!
    const fadeGradient = fadeContext.createLinearGradient(0, 0, 0, 64)
    fadeGradient.addColorStop(0, 'rgba(255,255,255,1)')
    fadeGradient.addColorStop(0.55, 'rgba(255,255,255,0.7)')
    fadeGradient.addColorStop(1, 'rgba(255,255,255,0)')
    fadeContext.fillStyle = fadeGradient
    fadeContext.fillRect(0, 0, 4, 64)
    const fadeMap = new THREE.CanvasTexture(fade)
    const areaShape = new THREE.SphereGeometry(HELMET.radius * 1.04, 32, 12, 0, Math.PI * 2, 0, AREA_ANGLE)
    const upward = new THREE.Vector3(0, 1, 0)
    for (const sensor of SENSORS) {
      const [x, y, z] = sensor.dir
      const place = new THREE.Vector3(x, y, z * HELMET.front).multiplyScalar(HELMET.radius)
      const areaMaterial = new THREE.MeshBasicMaterial({ color: COLOR.normal, map: fadeMap, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide })
      const area = new THREE.Mesh(areaShape, areaMaterial)
      area.quaternion.setFromUnitVectors(upward, place.clone().normalize())
      area.renderOrder = 2
      pivot.add(area)
      const material = new THREE.MeshBasicMaterial({ color: COLOR.normal })
      const light = new THREE.Mesh(new THREE.SphereGeometry(HELMET.radius * 0.055, 20, 14), material)
      light.position.copy(place)
      const glowMaterial = new THREE.SpriteMaterial({ map: glowMap, color: COLOR.normal, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })
      const glow = new THREE.Sprite(glowMaterial)
      glow.position.copy(place)
      pivot.add(light, glow)
      sensors[sensor.id] = { light, glow, material, glowMaterial, areaMaterial }
    }

    let gone = false
    const draco = new DRACOLoader()
    draco.setDecoderPath('/draco/')
    const loader = new GLTFLoader()
    loader.setDRACOLoader(draco)
    loader.load(
      MODEL.file,
      (file) => {
        if (gone) return
        const model = file.scene
        model.position.sub(MODEL.center)
        const turned = new THREE.Group()
        turned.rotation.y = MODEL.turn
        turned.scale.setScalar(HELMET.radius / MODEL.radius)
        turned.add(model)
        model.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return
          // Only the helmet: remove each triangle that is fully below the cut height. The plane then makes the edge straight.
          const position = object.geometry.getAttribute('position')
          const index = object.geometry.getIndex()
          if (index) {
            const kept: number[] = []
            for (let i = 0; i < index.count; i += 3) {
              const a = index.getX(i)
              const b = index.getX(i + 1)
              const c = index.getX(i + 2)
              if (Math.max(position.getY(a), position.getY(b), position.getY(c)) >= MODEL.cut - 0.02) kept.push(a, b, c)
            }
            object.geometry.setIndex(kept)
          }
          // The cut leaves the helmet open at the bottom, so draw the inner side too.
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
            material.side = THREE.DoubleSide
            material.clippingPlanes = [cut]
          }
        })
        pivot.add(turned)
        setReady(true)
      },
      undefined,
      () => !gone && fail.current(),
    )

    // The size follows the box.
    const resize = () => {
      const width = box.clientWidth
      const height = box.clientHeight
      if (!width || !height) return
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(box)
    resize()

    // A drag turns the helmet. With no drag for some seconds, the helmet turns slowly from side to side.
    let yaw = 0
    let pitch = 0
    let dragging: { x: number; y: number; yaw: number; pitch: number } | null = null
    let lastDrag = -Infinity
    // The speed of the turn at the end of a drag. The helmet keeps this speed for a moment.
    let spin = 0
    let lastX = 0
    const down = (event: PointerEvent) => {
      dragging = { x: event.clientX, y: event.clientY, yaw, pitch }
      lastX = event.clientX
      spin = 0
      canvas.setPointerCapture(event.pointerId)
    }
    const move = (event: PointerEvent) => {
      if (!dragging) return
      yaw = Math.max(-1.5, Math.min(1.5, dragging.yaw + (event.clientX - dragging.x) * 0.01))
      spin = (event.clientX - lastX) * 0.01
      lastX = event.clientX
      pitch = Math.max(-0.4, Math.min(0.4, dragging.pitch + (event.clientY - dragging.y) * 0.006))
      lastDrag = performance.now()
    }
    const up = () => {
      dragging = null
      lastDrag = performance.now()
    }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)

    const point = new THREE.Vector3()
    const middle = new THREE.Vector3()
    let frame = 0
    // For development only: window.__helmetShot(size) gives the still picture of the 2D view
    // (the helmet from the front, with no sensor lights) and the place of each sensor on it.
    if (import.meta.env.DEV) {
      // window.__helmetShot(size) gives the two still pictures of the 2D view (from the front and
      // from the back, with no sensor lights) and the place of each sensor in each picture.
      ;(window as unknown as { __helmetShot: (size: number) => unknown }).__helmetShot = (size) => {
        cancelAnimationFrame(frame)
        pivot.position.y = 0
        renderer.setPixelRatio(1)
        renderer.setSize(size, size, false)
        camera.aspect = 1
        camera.updateProjectionMatrix()
        for (const item of Object.values(sensors)) item.light.visible = item.glow.visible = false
        for (const child of pivot.children) if (child instanceof THREE.Mesh && child.geometry === areaShape) child.visible = false
        const shot = (turn: number) => {
          pivot.rotation.set(0, turn, 0)
          pivot.updateMatrixWorld(true)
          cut.copy(cutLocal).applyMatrix4(pivot.matrixWorld)
          renderer.render(scene, camera)
          const url = canvas.toDataURL('image/webp', 0.92)
          const places: Record<string, [number, number] | null> = {}
          for (const sensor of SENSORS) {
            sensors[sensor.id].light.getWorldPosition(point)
            // A sensor on the far side of the helmet is not in this picture.
            const hidden = point.z < -HELMET.radius * 0.2
            point.project(camera)
            places[sensor.id] = hidden ? null : [Number((((point.x + 1) / 2) * 100).toFixed(2)), Number((((1 - point.y) / 2) * 100).toFixed(2))]
          }
          middle.set(0, 0, 0).project(camera)
          return { url, places, middle: [Number((((middle.x + 1) / 2) * 100).toFixed(2)), Number((((1 - middle.y) / 2) * 100).toFixed(2))] }
        }
        return { front: shot(0), back: shot(Math.PI) }
      }
    }
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw)
      const seconds = now / 1000
      // After a drag, the turn slows down softly.
      if (!dragging && Math.abs(spin) > 0.0002) {
        yaw = Math.max(-1.5, Math.min(1.5, yaw + spin))
        spin *= 0.92
        lastDrag = now
      }
      // Go back to the slow turn 3 seconds after the last drag.
      if (!dragging && now - lastDrag > 3000) {
        yaw += (Math.sin(seconds * 0.32) * 0.38 - yaw) * 0.02
        pitch += (Math.sin(seconds * 0.21) * 0.04 - pitch) * 0.02
      }
      pivot.rotation.set(pitch, yaw, 0)
      // A slow float, as in free fall.
      pivot.position.y = Math.sin(seconds * 0.7) * 0.004
      pivot.updateMatrixWorld(true)
      cut.copy(cutLocal).applyMatrix4(pivot.matrixWorld)

      const { helmet: state, rising: rise, selected: on } = live.current
      const width = box.clientWidth
      const height = box.clientHeight
      middle.set(0, pivot.position.y, 0).project(camera)
      const middleX = ((middle.x + 1) / 2) * width
      const middleY = ((1 - middle.y) / 2) * height
      for (const sensor of SENSORS) {
        const item = sensors[sensor.id]
        const level = levelOf(state.sensors[sensor.id].value)
        item.material.color.setHex(COLOR[level])
        item.glowMaterial.color.setHex(COLOR[level])
        const beat = rise.includes(sensor.id) ? 1 + 0.5 * (0.5 + 0.5 * Math.sin(seconds * 6)) : 1
        // The area on the helmet: weak for a normal value, strong for a high value, and it beats while the value rises.
        item.areaMaterial.color.setHex(COLOR[level])
        item.areaMaterial.opacity = (level === 'alert' ? 0.78 : level === 'caution' ? 0.66 : 0.2) * (rise.includes(sensor.id) ? 0.75 + 0.25 * Math.sin(seconds * 6) : 1)
        const size = HELMET.radius * (level === 'alert' ? 0.62 : level === 'caution' ? 0.5 : 0.4) * beat * (on === sensor.id ? 1.3 : 1)
        item.glow.scale.set(size, size, 1)

        const label = labels.current[sensor.id]
        const line = lines.current[sensor.id]
        if (!label || !line) continue
        item.light.getWorldPosition(point)
        const behind = point.z < -HELMET.radius * 0.35
        point.project(camera)
        const x = ((point.x + 1) / 2) * width
        const y = ((1 - point.y) / 2) * height
        // The label is outside the light, on the line from the middle of the helmet through the light.
        // A light near the middle of the helmet puts its label down and to the right.
        const away = Math.hypot(x - middleX, y - middleY)
        const sideX = away > width * 0.05 ? (x - middleX) / away : 0.86
        const sideY = away > width * 0.05 ? (y - middleY) / away : 0.5
        const labelX = Math.max(26, Math.min(width - 26, x + sideX * LABEL_OUT))
        const labelY = Math.max(16, Math.min(height - 16, y + sideY * LABEL_OUT))
        label.style.transform = `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`
        label.style.opacity = behind ? '0.3' : '1'
        line.setAttribute('x1', String(x))
        line.setAttribute('y1', String(y))
        line.setAttribute('x2', String(labelX))
        line.setAttribute('y2', String(labelY))
        line.style.opacity = behind ? '0.15' : '0.7'
      }
      renderer.render(scene, camera)
    }
    frame = requestAnimationFrame(draw)

    return () => {
      gone = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose()
        }
      })
      glowMap.dispose()
      fadeMap.dispose()
      pmrem.dispose()
      draco.dispose()
      renderer.dispose()
      canvas.remove()
    }
  }, [])

  return (
    <div ref={wrap} className={ready ? 'hm-3d hm-3d-ready' : 'hm-3d'} role="group" aria-label={t('Space suit helmet with CO2 sensors, 3D view. Drag to turn.')}>
      {!ready && <p className="hm-3d-wait">{t('Loading the 3D model…')}</p>}
      <svg className="hm-3d-lines" aria-hidden="true">
        {SENSORS.map((sensor) => (
          <line
            key={sensor.id}
            ref={(element) => {
              lines.current[sensor.id] = element
            }}
            className={`hm-text-${levelOf(helmet.sensors[sensor.id].value)}`}
          />
        ))}
      </svg>
      {SENSORS.map((sensor) => {
        const value = helmet.sensors[sensor.id].value
        const level = levelOf(value)
        const up = rising.includes(sensor.id)
        return (
          <button
            type="button"
            key={sensor.id}
            ref={(element) => {
              labels.current[sensor.id] = element
            }}
            className={`hm-3d-label hm-text-${level} ${selected === sensor.id ? 'hm-3d-on' : ''}`}
            aria-pressed={selected === sensor.id}
            aria-label={t('Sensor {name}: {value} mmHg, {level}', { name: t(sensor.label), value: fmt(value, 1), level: LEVEL_WORD[level] }) + (up ? `, ${t('rising')}` : '')}
            onClick={() => onSelect(sensor.id)}
          >
            {fmt(value, 1)}
            {up ? ' ↑' : ''}
          </button>
        )
      })}
    </div>
  )
}
