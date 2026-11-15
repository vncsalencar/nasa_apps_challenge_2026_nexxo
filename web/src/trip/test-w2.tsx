// A page for tests of the map of a mission and of the timeline.
// Part 1 uses MADE-UP missions and MADE-UP paths. No number in part 1 is from a source.
// Part 2 uses the real presets with the real geometry, if shared/trip/geometry.ts and the trajectory files exist.
// The texts of this page itself are in English only. The texts of the map and of the timeline go through t().
// Options in the address: ?geo=fake-mars, fake-moon, fake-ground, empty, or the id of a preset (for example msl).
// ?day=120 (the cursor). ?lag=150 (the page gives the new day back after this many milliseconds, as a server does). ?box=420 (the largest width of the map, in px).
import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/sora/latin-500.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '../index.css'
import { defaultTrip } from '../../../shared/trip/defaults.ts'
import { PRESETS } from '../../../shared/trip/presets/index.ts'
import type { TripOptions } from '../../../shared/trip/timeline.ts'
import { KM_PER_AU, LIGHT_KM_PER_SECOND, type Frame, type Geometry, type Phase, type PhaseKind, type PhaseSpan, type Place, type Point, type Preset, type Storm, type TrajectoryFile } from '../../../shared/trip/types.ts'
import { LANGS, lang, setLang } from '../i18n.ts'
import { ptBR } from '../locales/pt-BR.ts'
import { tripW2 } from '../locales/pt-BR/trip-w2.ts'
import { Timeline } from './Timeline.tsx'
import { TripMap } from './TripMap.tsx'

// The lead merges the Portuguese file of this task later. The test page adds it here, so the page shows the Portuguese texts now.
Object.assign(ptBR, tripW2)

const query = new URLSearchParams(location.search)
const lag = Number(query.get('lag') ?? 0)
const box = query.get('box')

// ---------------------------------------------------------------------------------------
// Part 1: made-up missions
// ---------------------------------------------------------------------------------------
const TURN = 2 * Math.PI
type Spot = Omit<Place, 'day' | 'phaseId' | 'lightSeconds'>
const NO_SOURCE = { short: 'Made up', title: 'A made-up value for the test page', url: '' }
const phase = (id: string, label: string, kind: PhaseKind, days: number): Phase => ({ id, label, kind, days, rate: { value: null, unit: 'mSv', instrument: '', shielding: '', solar: '', says: '', source: NO_SOURCE, badge: 'modelled' } })
const ease = (part: number) => (1 - Math.cos(Math.PI * part)) / 2
const polar = (radius: number, angle: number): Point => [radius * Math.cos(angle), radius * Math.sin(angle)]

// A geometry from a function that gives the place at a day. The path has one point each "step" days, up to "pathDays".
function fake(frame: Frame, phases: Phase[], spot: (day: number) => Spot, step: number, pathLength?: number): Geometry {
  const spans: PhaseSpan[] = []
  let start = 0
  for (const item of phases) {
    spans.push({ phase: item, fromDay: start, toDay: start + item.days })
    start += item.days
  }
  const days = start
  const path: Point[] = []
  const pathDays: number[] = []
  const bodyPaths: Record<string, Point[]> = {}
  const count = Math.round((pathLength ?? days) / step)
  for (let index = 0; index <= count - (pathLength === undefined ? 0 : 1); index++) {
    const day = index * step
    const place = spot(day)
    path.push(place.craft)
    pathDays.push(day)
    for (const [name, point] of Object.entries(place.bodies)) (bodyPaths[name] ??= []).push(point)
  }
  const at = (day: number): Place => {
    const inside = Math.min(Math.max(day, 0), days)
    const place = spot(inside)
    return { day: inside, ...place, lightSeconds: place.earthDistanceKm / LIGHT_KM_PER_SECOND, phaseId: (spans.find((span) => inside < span.toDay) ?? spans[spans.length - 1]).phase.id }
  }
  return { frame, days, spans, path, pathDays, bodyPaths, delay: [], at }
}

// A made-up flight to Mars: 200 days out, 30 days at Mars, and a return of 200 days that counts as "modelled".
const fakeMars = fake(
  'sun',
  [phase('cruise', 'Cruise to Mars', 'cruise', 200), phase('surface', 'Mars surface stay', 'surface', 30), phase('return', 'Return to the Earth', 'return', 200)],
  (day) => {
    const earthAngle = (d: number) => (TURN * d) / 365.25
    const marsAngle = (d: number) => 0.75 + (TURN * d) / 687
    const earth = polar(1, earthAngle(day))
    const mars = polar(1.524, marsAngle(day))
    let craft: Point = mars
    if (day < 200) craft = polar(1 + 0.524 * ease(day / 200), marsAngle(200) * (day / 200))
    if (day > 230) craft = polar(1.524 - 0.524 * ease((day - 230) / 200), marsAngle(230) + (earthAngle(430) - marsAngle(230)) * ((day - 230) / 200))
    return { craft, bodies: { earth, mars }, earthDistanceKm: Math.hypot(craft[0] - earth[0], craft[1] - earth[1]) * KM_PER_AU, sunDistanceAu: Math.hypot(craft[0], craft[1]), inSaa: null, modelled: day > 230 }
  },
  1,
)

// A made-up flight to the Moon and back, in 10 days.
const fakeMoon = fake(
  'earth',
  [phase('belts', 'Van Allen belts', 'belts', 0.2), phase('cruise', 'Cruise to the Moon', 'cruise', 3.8), phase('orbit', 'Lunar orbit', 'orbit', 2), phase('return', 'Return', 'return', 4)],
  (day) => {
    const moonAngle = (d: number) => 1 + (TURN * d) / 27.32
    const moon = polar(384_400, moonAngle(day))
    let craft: Point = polar(384_400 + 9000, moonAngle(day) + 0.012 * Math.sin(TURN * day * 2))
    if (day < 4) craft = polar(6600 + (393_400 - 6600) * ease(day / 4), moonAngle(4) - 2.2 * (1 - day / 4))
    if (day > 6) craft = polar(393_400 - (393_400 - 6600) * ease((day - 6) / 4), moonAngle(6) + 2.2 * ((day - 6) / 4))
    return { craft, bodies: { moon }, earthDistanceKm: Math.hypot(craft[0], craft[1]), sunDistanceAu: null, inSaa: null, modelled: false }
  },
  0.02,
)

// A made-up ground track: 15 orbits each day, so the track is the same each day. The path has one day and the mission has 5 days.
const FAKE_SAA: Point[] = Array.from({ length: 48 }, (_, index): Point => [-25 + 65 * Math.cos((TURN * index) / 48), -25 + 25 * Math.sin((TURN * index) / 48)])
const fakeGround = fake(
  'ground',
  [phase('leo', 'Low Earth orbit', 'leo', 5)],
  (day) => {
    const tilt = (51.6 * Math.PI) / 180
    const turn = TURN * 15 * day
    const latitude = (Math.asin(Math.sin(tilt) * Math.sin(turn)) * 180) / Math.PI
    const around = (Math.atan2(Math.cos(tilt) * Math.sin(turn), Math.cos(turn)) * 180) / Math.PI - 360 * day + 20
    const longitude = ((((around + 180) % 360) + 360) % 360) - 180
    const inSaa = ((longitude + 25) / 65) ** 2 + ((latitude + 25) / 25) ** 2 < 1
    return { craft: [longitude, latitude], bodies: {}, earthDistanceKm: 6790, sunDistanceAu: null, inSaa, modelled: false }
  },
  1 / 1440,
  1,
)

// A mission with no trajectory data, as the real geometry gives it when a file is missing.
const fakeEmpty: Geometry = { ...fake('sun', [phase('cruise', 'Cruise to Mars', 'cruise', 253)], () => ({ craft: [0, 0], bodies: {}, earthDistanceKm: 0, sunDistanceAu: null, inSaa: null, modelled: true }), 1), path: [], pathDays: [], bodyPaths: {} }

type Choice = { id: string; name: string; geometry: Geometry; saaRegion?: Point[]; storms: Storm[]; limitDay: number | null; real: boolean }
const FAKES: Choice[] = [
  { id: 'fake-mars', name: 'Made-up Mars flight', geometry: fakeMars, storms: [{ day: 120, dose: 100, hours: 24 }, { day: 300, dose: 100, hours: 24 }], limitDay: 351.4, real: false },
  { id: 'fake-moon', name: 'Made-up Moon flight', geometry: fakeMoon, storms: [{ day: 2.5, dose: 100, hours: 12 }], limitDay: null, real: false },
  { id: 'fake-ground', name: 'Made-up ground track', geometry: fakeGround, saaRegion: FAKE_SAA, storms: [], limitDay: null, real: false },
  { id: 'empty', name: 'No trajectory data', geometry: fakeEmpty, storms: [], limitDay: null, real: false },
]

// ---------------------------------------------------------------------------------------
// Part 2: the real presets. Other people make these files, so each one can be missing. The page still loads then.
// ---------------------------------------------------------------------------------------
const geometryModules = import.meta.glob('../../../shared/trip/geometry.ts')
const groundModules = import.meta.glob('../../../shared/trip/groundtrack.ts')
const dataModules = import.meta.glob(['./data/*.json', '!./data/land.json', '!./data/eda-rr9-radiation.json', '!./data/liulin-cruise.json'])
type GeometryModule = { buildGeometry: (preset: Preset, files: Record<string, TrajectoryFile>, options: TripOptions) => Geometry }

async function loadReal(): Promise<{ choices: Choice[]; problem: string | null }> {
  const loadGeometry = Object.values(geometryModules)[0]
  if (!loadGeometry) return { choices: [], problem: 'shared/trip/geometry.ts is not here.' }
  try {
    const { buildGeometry } = (await loadGeometry()) as GeometryModule
    const files: Record<string, TrajectoryFile> = {}
    for (const [path, load] of Object.entries(dataModules)) {
      const file = ((await load()) as { default: TrajectoryFile }).default
      if (Array.isArray(file?.craft)) files[path.replace(/^.*\/|\.json$/g, '')] = file
    }
    const loadGround = Object.values(groundModules)[0]
    const saaRegion = loadGround ? ((await loadGround()) as { SAA_REGION?: Point[] }).SAA_REGION : undefined
    const choices = PRESETS.map((preset): Choice => {
      // The reference mission shows its return flight, which is modelled.
      const geometry = buildGeometry(preset, files, { ...defaultTrip(preset), returnTrip: true })
      return { id: preset.id, name: preset.name, geometry, saaRegion: preset.frame === 'ground' ? saaRegion : undefined, storms: [{ day: geometry.days * 0.4, dose: 100, hours: 24 }], limitDay: null, real: true }
    })
    return { choices, problem: null }
  } catch (error) {
    return { choices: [], problem: `The real geometry did not load: ${String(error)}` }
  }
}

export function Page() {
  const [real, setReal] = useState<Choice[]>([])
  const [problem, setProblem] = useState<string | null>('Loading the real geometry.')
  const [id, setId] = useState(query.get('geo') ?? 'fake-mars')
  const [days, setDays] = useState<Record<string, number>>(() => (query.get('day') === null ? {} : { [query.get('geo') ?? 'fake-mars']: Number(query.get('day')) }))
  const [playing, setPlaying] = useState(false)
  // What the timeline sent: for the test script.
  const calls = useRef<{ time: number; day: number }[]>([])

  useEffect(() => {
    let live = true
    void loadReal().then((result) => {
      if (!live) return
      setReal(result.choices)
      setProblem(result.problem)
    })
    return () => {
      live = false
    }
  }, [])

  const choices = [...FAKES, ...real]
  const choice = choices.find((item) => item.id === id) ?? FAKES[0]
  const { geometry } = choice
  const day = Math.min(days[choice.id] ?? Math.round(geometry.days * 0.3 * 100) / 100, geometry.days)
  const setDay = (next: number) => setDays((all) => ({ ...all, [choice.id]: next }))
  // For a test script: window.__w2set(40) sets the day of the page.
  useEffect(() => {
    ;(window as unknown as { __w2set: unknown }).__w2set = (next: number) => setDays((all) => ({ ...all, [choice.id]: next }))
  }, [choice.id])
  const onDay = (next: number) => {
    calls.current.push({ time: performance.now(), day: next })
    ;(window as unknown as { __w2: unknown }).__w2 = calls.current
    if (lag > 0) window.setTimeout(() => setDay(next), lag)
    else setDay(next)
  }

  // "Play" moves the day one step each second, as the simulator does.
  const step = geometry.frame === 'sun' ? 2 : geometry.frame === 'earth' ? 0.05 : 0.004
  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => setDays((all) => ({ ...all, [choice.id]: ((all[choice.id] ?? 0) + step) % geometry.days })), 1000)
    return () => window.clearInterval(timer)
  }, [playing, choice.id, step, geometry.days])

  return (
    <main style={{ maxWidth: 1360, margin: '0 auto', padding: 'var(--gutter)', display: 'grid', gap: 20 }}>
      <header style={{ display: 'grid', gap: 12 }}>
        <h1 style={{ fontSize: '1.375rem' }}>Map and timeline test</h1>
        <p className="muted small">The first four choices are made up. No number of them is from a source. The other choices use the real presets and the real trajectory files.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {choices.map((item) => (
            <button key={item.id} type="button" className="pill" data-geo={item.id} aria-pressed={item.id === choice.id} onClick={() => setId(item.id)}>
              {item.name}
            </button>
          ))}
        </div>
        {problem && (
          <p className="muted small" id="problem">
            {problem}
          </p>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <button type="button" id="play" aria-pressed={playing} className="pill" onClick={() => setPlaying(!playing)}>
            {playing ? 'Pause' : 'Play'}
          </button>
          {LANGS.map((item) => (
            <button key={item.id} type="button" className="pill" aria-pressed={item.id === lang} onClick={() => setLang(item.id)}>
              {item.short}
            </button>
          ))}
          <span className="muted small">
            Day of the page: <span id="day">{day}</span> · frame: <span id="frame">{geometry.frame}</span> · path points: {geometry.path.length}
          </span>
        </div>
      </header>
      <section className="card" id="map-card" style={{ maxWidth: box ? Number(box) : undefined, width: '100%', justifySelf: 'center' }}>
        <TripMap geometry={geometry} day={day} saaRegion={choice.saaRegion} />
      </section>
      <section className="card" id="timeline-card">
        <Timeline geometry={geometry} day={day} storms={choice.storms} limitDay={choice.limitDay} onDay={onDay} />
      </section>
      <section className="card" id="readonly-card">
        <p className="label" style={{ marginBottom: 12 }}>
          The same timeline with no "onDay": it only shows.
        </p>
        <Timeline geometry={geometry} day={day} storms={choice.storms} limitDay={choice.limitDay} />
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  // The app uses StrictMode too. It mounts each component two times in development.
  <StrictMode>
    <Page />
  </StrictMode>,
)
