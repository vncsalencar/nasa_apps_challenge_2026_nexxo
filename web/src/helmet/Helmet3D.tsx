// The 3D view of the helmet page: an astronaut in a space suit helmet that a person can turn,
// with the CO2 sensors as lights inside the helmet. Plain three.js, loaded only when a person
// selects the 3D view.
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { SENSORS, levelOf, type HelmetState, type Level } from '../../../shared/helmet.ts'
import { fmt, t } from '../i18n.ts'

// The place of each sensor inside the helmet. x is to the right of the viewer, y is up, z is to the viewer.
const PLACE: Record<string, [number, number, number]> = {
  top: [0, 0.8, 0.36],
  'top-left': [-0.6, 0.56, 0.5],
  'top-right': [0.6, 0.56, 0.5],
  left: [-0.78, -0.08, 0.44],
  right: [0.78, -0.08, 0.44],
  mouth: [0, -0.4, 0.8],
  neck: [0, -0.84, 0.42],
}
const COLOR: Record<Level, number> = { normal: 0x7ddba3, caution: 0xf5b955, alert: 0xff7a66 }
const LEVEL_WORD: Record<Level, string> = { normal: t('normal'), caution: t('raised'), alert: t('high') }

// The window of the visor on the sphere of the helmet, in radians.
const HALF_WIDTH = 1.02
const TOP = 0.86
const BOTTOM = 2.16
const FRONT = Math.PI / 2

type Props = {
  helmet: HelmetState
  rising: string[]
  selected: string | null
  onSelect: (id: string) => void
  // The browser cannot draw 3D. The page then shows the 2D drawing.
  onFail: () => void
}

function buildAstronaut() {
  const root = new THREE.Group()
  const white = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide })
  const grey = new THREE.MeshStandardMaterial({ color: 0xcfcac0, roughness: 0.6 })
  const metal = new THREE.MeshStandardMaterial({ color: 0xb9bdc4, roughness: 0.25, metalness: 0.9 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.7 })
  const part = (geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, y, z)
    root.add(mesh)
    return mesh
  }

  // The shell: the top, the back with the sides, and the part below the visor.
  part(new THREE.SphereGeometry(1, 56, 20, 0, Math.PI * 2, 0, TOP), white)
  part(new THREE.SphereGeometry(1, 56, 24, FRONT + HALF_WIDTH, Math.PI * 2 - 2 * HALF_WIDTH, TOP, BOTTOM - TOP), white)
  part(new THREE.SphereGeometry(1, 56, 14, 0, Math.PI * 2, BOTTOM, 2.78 - BOTTOM), white)
  // The glass of the visor.
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x1a2740, roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false })
  part(new THREE.SphereGeometry(0.995, 40, 24, FRONT - HALF_WIDTH, 2 * HALF_WIDTH, TOP, BOTTOM - TOP), glass).renderOrder = 2
  // The sun shade over the visor, and the frame below it.
  part(new THREE.SphereGeometry(1.05, 40, 8, FRONT - HALF_WIDTH - 0.12, 2 * HALF_WIDTH + 0.24, TOP - 0.34, 0.4), grey)
  part(new THREE.SphereGeometry(1.03, 40, 4, FRONT - HALF_WIDTH - 0.05, 2 * HALF_WIDTH + 0.1, BOTTOM - 0.02, 0.1), grey)
  // The pivot knobs, the camera, and the two lamps.
  for (const side of [-1, 1]) {
    const knob = part(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 24), metal, side * 1.0, 0.02, 0.1)
    knob.rotation.z = Math.PI / 2
    const lamp = part(new THREE.BoxGeometry(0.26, 0.14, 0.2), grey, side * 0.62, 0.86, 0.3)
    lamp.rotation.z = -side * 0.6
    part(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshStandardMaterial({ color: 0xfff3bf, emissive: 0xfff3bf, emissiveIntensity: 0.9 }), side * 0.64, 0.84, 0.41)
  }
  part(new THREE.BoxGeometry(0.4, 0.2, 0.3), grey, 0, 1.06, 0.1)
  const lens = part(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 16), dark, 0, 1.06, 0.26)
  lens.rotation.x = Math.PI / 2

  // The neck ring and the suit below it.
  const ring = part(new THREE.TorusGeometry(0.6, 0.09, 14, 48), metal, 0, -0.98, 0)
  ring.rotation.x = Math.PI / 2
  const shoulders = part(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), white, 0, -2.06, 0)
  shoulders.scale.set(1.55, 1.05, 0.95)
  part(new THREE.BoxGeometry(0.4, 0.26, 0.08), grey, 0, -1.5, 0.84)
  part(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshStandardMaterial({ color: 0x7ddba3, emissive: 0x7ddba3, emissiveIntensity: 1 }), -0.09, -1.5, 0.89)

  // The astronaut: the head with the communications cap, the face, and the microphones.
  const head = new THREE.Group()
  root.add(head)
  const skin = new THREE.MeshStandardMaterial({ color: 0xdcae88, roughness: 0.75 })
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, y, z)
    head.add(mesh)
    return mesh
  }
  add(new THREE.SphereGeometry(0.5, 32, 24), skin, 0, 0, 0).scale.set(0.92, 1.08, 0.98)
  add(new THREE.CylinderGeometry(0.2, 0.26, 0.5, 20), skin, 0, -0.66, -0.04)
  // The cap covers the top and the back of the head. It leaves the face free.
  const cap = new THREE.MeshStandardMaterial({ color: 0xf3f0e8, roughness: 0.8, side: THREE.DoubleSide })
  add(new THREE.SphereGeometry(0.53, 32, 12, 0, Math.PI * 2, 0, 1.05), cap, 0, 0.02, -0.02).scale.set(0.93, 1.08, 1)
  add(new THREE.SphereGeometry(0.53, 32, 12, FRONT + 1.0, Math.PI * 2 - 2.0, 1.05, 1.25), cap, 0, 0.02, -0.02).scale.set(0.93, 1.08, 1)
  for (const side of [-1, 1]) {
    add(new THREE.SphereGeometry(0.15, 16, 12), dark, side * 0.47, -0.04, 0.02).scale.set(0.6, 1.15, 0.9)
    add(new THREE.SphereGeometry(0.052, 14, 10), new THREE.MeshStandardMaterial({ color: 0xfbf7f0, roughness: 0.3 }), side * 0.17, 0.05, 0.435)
    add(new THREE.SphereGeometry(0.027, 10, 8), new THREE.MeshStandardMaterial({ color: 0x2b211c }), side * 0.17, 0.05, 0.48)
    const brow = add(new THREE.BoxGeometry(0.15, 0.022, 0.03), new THREE.MeshStandardMaterial({ color: 0x6d4c36 }), side * 0.17, 0.15, 0.45)
    brow.rotation.z = -side * 0.12
    // The arm of the microphone, from the ear to the mouth.
    const arm = add(new THREE.CylinderGeometry(0.014, 0.014, 0.42, 8), dark, side * 0.3, -0.26, 0.3)
    arm.rotation.set(0.9, 0, side * 0.75)
    add(new THREE.BoxGeometry(0.07, 0.05, 0.05), dark, side * 0.13, -0.33, 0.45)
  }
  add(new THREE.SphereGeometry(0.055, 12, 10), skin, 0, -0.07, 0.5).scale.set(0.8, 1.2, 1)
  const mouth = add(new THREE.TorusGeometry(0.09, 0.012, 8, 20, Math.PI * 0.7), new THREE.MeshStandardMaterial({ color: 0x8f4f3f }), 0, -0.2, 0.455)
  mouth.rotation.z = Math.PI + (Math.PI - Math.PI * 0.7) / 2

  return { root, head }
}

export default function Helmet3D({ helmet, rising, selected, onSelect, onFail }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const labels = useRef<Record<string, HTMLButtonElement | null>>({})
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
    box.prepend(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50)
    camera.position.set(0, -0.2, 6.6)
    camera.lookAt(0, -0.38, 0)
    scene.add(new THREE.AmbientLight(0xffffff, 0.75))
    const key = new THREE.DirectionalLight(0xffffff, 2.1)
    key.position.set(-2.5, 3, 4)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0x9db8ff, 0.9)
    rim.position.set(3, 1, -3)
    scene.add(rim)
    // A light inside the helmet, so the face shows through the glass.
    const inside = new THREE.PointLight(0xfff1e0, 1.6, 4)
    inside.position.set(0, 0.3, 0.75)

    const { root, head } = buildAstronaut()
    root.add(inside)
    scene.add(root)

    // The sensor lights.
    const lights: Record<string, { mesh: THREE.Mesh; glow: THREE.Mesh; material: THREE.MeshStandardMaterial; glowMaterial: THREE.MeshBasicMaterial }> = {}
    for (const sensor of SENSORS) {
      const material = new THREE.MeshStandardMaterial({ color: COLOR.normal, emissive: COLOR.normal, emissiveIntensity: 1.3, roughness: 0.4 })
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 14), material)
      const glowMaterial = new THREE.MeshBasicMaterial({ color: COLOR.normal, transparent: true, opacity: 0.25, depthWrite: false })
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.135, 20, 14), glowMaterial)
      const [x, y, z] = PLACE[sensor.id]
      mesh.position.set(x, y, z)
      glow.position.set(x, y, z)
      glow.renderOrder = 3
      root.add(mesh, glow)
      lights[sensor.id] = { mesh, glow, material, glowMaterial }
    }

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
    const canvas = renderer.domElement
    const down = (event: PointerEvent) => {
      dragging = { x: event.clientX, y: event.clientY, yaw, pitch }
      canvas.setPointerCapture(event.pointerId)
    }
    const move = (event: PointerEvent) => {
      if (!dragging) return
      yaw = Math.max(-1.3, Math.min(1.3, dragging.yaw + (event.clientX - dragging.x) * 0.01))
      pitch = Math.max(-0.35, Math.min(0.35, dragging.pitch + (event.clientY - dragging.y) * 0.006))
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
        const target = Math.sin(seconds * 0.45) * 0.5
        yaw += (target - yaw) * 0.03
        pitch += (0 - pitch) * 0.03
      }
      root.rotation.set(pitch, yaw, 0)
      // The astronaut breathes and looks a little around.
      root.position.y = Math.sin(seconds * 1.4) * 0.012
      head.rotation.y = Math.sin(seconds * 0.7) * 0.12
      head.rotation.x = Math.sin(seconds * 0.5) * 0.04

      const { helmet: state, rising: up, selected: on } = live.current
      const width = box.clientWidth
      const height = box.clientHeight
      for (const sensor of SENSORS) {
        const light = lights[sensor.id]
        const level = levelOf(state.sensors[sensor.id].value)
        light.material.color.setHex(COLOR[level])
        light.material.emissive.setHex(COLOR[level])
        light.glowMaterial.color.setHex(COLOR[level])
        const beat = up.includes(sensor.id) ? 1 + 0.45 * (0.5 + 0.5 * Math.sin(seconds * 6)) : 1
        light.glow.scale.setScalar(beat * (on === sensor.id ? 1.35 : 1))
        light.glowMaterial.opacity = level === 'alert' ? 0.5 : level === 'caution' ? 0.38 : 0.25
        // The label of the sensor is a button on top of the canvas, at the place of its light.
        const label = labels.current[sensor.id]
        if (!label) continue
        light.mesh.getWorldPosition(point)
        const behind = point.z < -0.25
        point.project(camera)
        label.style.transform = `translate(-50%, -50%) translate(${((point.x + 1) / 2) * width}px, ${((1 - point.y) / 2) * height}px)`
        label.style.opacity = behind ? '0.25' : '1'
      }
      renderer.render(scene, camera)
    }
    frame = requestAnimationFrame(draw)

    return () => {
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
      renderer.dispose()
      canvas.remove()
    }
  }, [])

  return (
    <div ref={wrap} className="hm-3d" role="group" aria-label={t('Astronaut in a space suit helmet with CO2 sensors, 3D view. Drag to turn.')}>
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
