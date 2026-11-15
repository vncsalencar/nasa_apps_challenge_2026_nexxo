// The 3D view of the helmet page: the NASA model of the space suit (Extravehicular Mobility
// Unit), framed on the helmet, with the CO2 sensors as lights around the visor. A person can
// turn it with a drag. Plain three.js, loaded only when a person selects the 3D view.
//
// Model: NASA 3D Resources, "Extravehicular Mobility Unit" (https://github.com/nasa/NASA-3D-Resources).
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { SENSORS, levelOf, type HelmetState, type Level } from '../../../shared/helmet.ts'
import { fmt, t } from '../i18n.ts'

// The helmet in the model: its middle, its radius, and the side where the visor is (1: toward +z).
const HELMET = { center: new THREE.Vector3(0.015, 1.85, 0.155), radius: 0.2, front: 1 }
// The place of each sensor on the helmet, in helmet radii from its middle.
// x is to the right of the viewer, y is up, z is out of the visor.
const PLACE: Record<string, [number, number, number]> = {
  top: [0, 0.96, 0.3],
  'top-left': [-0.72, 0.6, 0.52],
  'top-right': [0.72, 0.6, 0.52],
  left: [-0.99, -0.02, 0.3],
  right: [0.99, -0.02, 0.3],
  mouth: [0, -0.5, 0.95],
  neck: [0, -0.98, 0.42],
}
const COLOR: Record<Level, number> = { normal: 0x7ddba3, caution: 0xf5b955, alert: 0xff7a66 }
const LEVEL_WORD: Record<Level, string> = { normal: t('normal'), caution: t('raised'), alert: t('high') }
// How far the label of a sensor is from its light, in pixels, and to which side of the screen it goes.
const LABEL_OUT = 46
const LABEL_SIDE: Record<string, [number, number]> = {
  top: [0, -1],
  'top-left': [-0.8, -0.6],
  'top-right': [0.8, -0.6],
  left: [-1, 0],
  right: [1, 0],
  mouth: [0.86, 0.5],
  neck: [-0.86, 0.5],
}

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
    const canvas = renderer.domElement
    box.prepend(canvas)

    const scene = new THREE.Scene()
    // A soft studio light from all sides, so the suit has depth and the visor has reflections.
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environmentIntensity = 0.22
    const key = new THREE.DirectionalLight(0xffffff, 2.6)
    key.position.set(-2.4, 2.2, 1.6)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0x8fb0ff, 1.1)
    rim.position.set(2.2, 0.8, -2)
    scene.add(rim)

    const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 30)
    camera.position.set(0, 0.02, 2.05)
    camera.lookAt(0, -0.1, 0)

    // The model turns around the middle of the helmet.
    const pivot = new THREE.Group()
    scene.add(pivot)
    const sensors: Record<string, { light: THREE.Mesh; glow: THREE.Sprite; material: THREE.MeshBasicMaterial; glowMaterial: THREE.SpriteMaterial }> = {}
    const glowMap = glowTexture()
    for (const sensor of SENSORS) {
      const [x, y, z] = PLACE[sensor.id]
      const place = new THREE.Vector3(x, y, z * HELMET.front).multiplyScalar(HELMET.radius)
      const material = new THREE.MeshBasicMaterial({ color: COLOR.normal })
      const light = new THREE.Mesh(new THREE.SphereGeometry(HELMET.radius * 0.07, 16, 12), material)
      light.position.copy(place)
      const glowMaterial = new THREE.SpriteMaterial({ map: glowMap, color: COLOR.normal, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })
      const glow = new THREE.Sprite(glowMaterial)
      glow.position.copy(place)
      pivot.add(light, glow)
      sensors[sensor.id] = { light, glow, material, glowMaterial }
    }

    let gone = false
    const draco = new DRACOLoader()
    draco.setDecoderPath('/draco/')
    const loader = new GLTFLoader()
    loader.setDRACOLoader(draco)
    loader.load(
      '/models/emu.glb',
      (file) => {
        if (gone) return
        const model = file.scene
        model.position.sub(HELMET.center)
        // In the file, the astronaut looks toward -z. Turn it, so the visor points to the viewer.
        const turned = new THREE.Group()
        turned.rotation.y = Math.PI
        turned.add(model)
        model.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return
          // The normals of the file give little shading. Join the points that are at the same place
          // and compute the normals again, so each surface is smooth.
          const position = object.geometry.getAttribute('position')
          const uv = object.geometry.getAttribute('uv')
          const plain = new THREE.BufferGeometry()
          plain.setAttribute('position', position)
          if (uv) plain.setAttribute('uv', uv)
          plain.setIndex(object.geometry.getIndex())
          for (const group of object.geometry.groups) plain.addGroup(group.start, group.count, group.materialIndex)
          const joined = mergeVertices(plain, 1e-5)
          joined.computeVertexNormals()
          object.geometry.dispose()
          object.geometry = joined
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
            if (!(material instanceof THREE.MeshStandardMaterial)) continue
            const { r, g, b } = material.color
            // The gold parts are the visor: a mirror with a gold tint, as on the real helmet.
            if (r > 0.45 && g > 0.3 && b < 0.3 && r - b > 0.25 && !material.map) {
              material.color.setHex(0xd9a441)
              material.metalness = 1
              material.roughness = 0.08
              material.envMapIntensity = 2.2
            } else {
              material.roughness = Math.min(material.roughness, 0.85)
            }
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

    // A drag turns the astronaut. With no drag for some seconds, the astronaut turns slowly from side to side.
    let yaw = 0
    let pitch = 0
    let dragging: { x: number; y: number; yaw: number; pitch: number } | null = null
    let lastDrag = -Infinity
    const down = (event: PointerEvent) => {
      dragging = { x: event.clientX, y: event.clientY, yaw, pitch }
      canvas.setPointerCapture(event.pointerId)
    }
    const move = (event: PointerEvent) => {
      if (!dragging) return
      yaw = Math.max(-1.5, Math.min(1.5, dragging.yaw + (event.clientX - dragging.x) * 0.01))
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
    let frame = 0
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw)
      const seconds = now / 1000
      // Go back to the slow turn 3 seconds after the last drag.
      if (!dragging && now - lastDrag > 3000) {
        yaw += (Math.sin(seconds * 0.4) * 0.42 - yaw) * 0.03
        pitch += (Math.sin(seconds * 0.27) * 0.05 - pitch) * 0.03
      }
      pivot.rotation.set(pitch, yaw, 0)
      // A slow float, as in free fall.
      pivot.position.y = Math.sin(seconds * 0.9) * 0.006

      const { helmet: state, rising: rise, selected: on } = live.current
      const width = box.clientWidth
      const height = box.clientHeight
      for (const sensor of SENSORS) {
        const item = sensors[sensor.id]
        const level = levelOf(state.sensors[sensor.id].value)
        item.material.color.setHex(COLOR[level])
        item.glowMaterial.color.setHex(COLOR[level])
        const beat = rise.includes(sensor.id) ? 1 + 0.5 * (0.5 + 0.5 * Math.sin(seconds * 6)) : 1
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
        // The label is next to the light, each one to its own side, so two labels do not meet.
        const [sideX, sideY] = LABEL_SIDE[sensor.id] ?? [0, -1]
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
      pmrem.dispose()
      draco.dispose()
      renderer.dispose()
      canvas.remove()
    }
  }, [])

  return (
    <div ref={wrap} className={ready ? 'hm-3d hm-3d-ready' : 'hm-3d'} role="group" aria-label={t('Astronaut in a space suit helmet with CO2 sensors, 3D view. Drag to turn.')}>
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
      <p className="hm-3d-credit">{t('Model: NASA 3D Resources, Extravehicular Mobility Unit')}</p>
    </div>
  )
}
