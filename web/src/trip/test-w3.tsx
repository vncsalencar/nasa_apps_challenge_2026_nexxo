// A page for tests of the radiation card, the communication delay card, the comparison card, and the badge.
// Part 1 uses MADE-UP missions and MADE-UP paths. No number in part 1 is from a source.
// Part 2 uses the real presets, and the real geometry if shared/trip/geometry.ts and the trajectory files exist.
// Options in the address: ?only=badge, rad, gy, gap, delay, cmp, or real. ?day=120 (the cursor). ?full=1 (surface stay and return).
// ?storm=0 (no storm). ?unit=mGy. ?preset=tgo (part 2).
import { Component, StrictMode, useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/sora/latin-500.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '../index.css'
import { defaultTrip } from '../../../shared/trip/defaults.ts'
import { PRESETS, PRESET_BY_ID } from '../../../shared/trip/presets/index.ts'
import { compareDose, doseSeries, seriesUnits } from '../../../shared/trip/radiation.ts'
import { missionDays, timeline, type TripOptions } from '../../../shared/trip/timeline.ts'
import {
  KM_PER_AU,
  LIGHT_KM_PER_SECOND,
  PRESET_IDS,
  type DoseUnit,
  type Frame,
  type Geometry,
  type Place,
  type Preset,
  type PresetId,
  type Rate,
  type SolarId,
  type SourceRef,
  type Storm,
  type TrajectoryFile,
} from '../../../shared/trip/types.ts'
import { LANGS, lang, setLang } from '../i18n.ts'
import { ptBR } from '../locales/pt-BR.ts'
import { tripW3 } from '../locales/pt-BR/trip-w3.ts'
import { Badge, type BadgeKind } from './Badge.tsx'
import { CompareCard } from './CompareCard.tsx'
import { DelayCard } from './DelayCard.tsx'
import { RadiationCard } from './RadiationCard.tsx'

// The lead merges the Portuguese file of this task later. The test page adds it here, so the
// page shows the Portuguese texts now. The cards make their texts when they show.
Object.assign(ptBR, tripW3)

const query = new URLSearchParams(location.search)
const only = query.get('only')
const show = (part: string) => only === null || only === part
const firstDay = Number(query.get('day') ?? 120)
const firstReal = PRESET_IDS.find((id) => id === query.get('preset')) ?? 'msl'

// ---------------------------------------------------------------------------------------
// Part 1: made-up missions. Each text says that the value is made up.
// ---------------------------------------------------------------------------------------
const FAKE_SOURCE: SourceRef = { short: 'Made-up source', title: 'A made-up source for the test page. It is not real', url: 'https://example.org/made-up', credit: 'Made-up credit line.' }
const NO_LINK: SourceRef = { short: 'Source with no link', title: 'A made-up source with no link', url: '' }

function fakeRate(value: number | null, unit: DoseUnit, more: Partial<Rate> = {}): Rate {
  return {
    value,
    unit,
    instrument: 'Made-up instrument',
    shielding: 'inside a made-up cabin',
    solar: 'made-up solar state',
    says: value === null ? '' : `Made-up text: the instrument measured ${value} ${unit} for each day.`,
    source: FAKE_SOURCE,
    badge: 'real-rate',
    ...more,
  }
}

const CABIN = { name: 'Made-up cabin', freeVolumeM3: 100, assumption: 'Made up for the test page.' }
const TRAJECTORY = { file: null, source: FAKE_SOURCE, note: 'Made up.', badge: 'modelled' as const }

// A 253-day flight in mSv. A surface stay and a return flight can be added.
// The flight rates also have the absorbed dose, so the page can offer both units for the flight alone.
const fakeMars: Preset = {
  id: 'msl',
  name: 'Made-up Mars mission (mSv)',
  summary: 'A made-up mission for the test page.',
  badge: 'real-rate-modelled',
  destination: 'mars',
  frame: 'sun',
  trajectory: TRAJECTORY,
  phases: [
    { id: 'cruise', label: 'Made-up cruise to Mars', kind: 'cruise', days: 253, rate: fakeRate(1.84, 'mSv') },
    { id: 'surface', label: 'Made-up stay on Mars', kind: 'surface', days: 300, rate: fakeRate(0.64, 'mSv', { plusMinus: 0.12, instrument: 'Made-up surface instrument', shielding: 'on the surface, under a made-up atmosphere', badge: 'proxy', proxyOf: 'Made-up rover mission', source: NO_LINK }), note: 'Made-up note of the phase.' },
    { id: 'return', label: 'Made-up return to the Earth', kind: 'return', days: 253, rate: fakeRate(1.84, 'mSv') },
  ],
  solar: {
    max: fakeRate(1.84, 'mSv', { plusMinus: 0.33, instrument: 'Made-up instrument A', shielding: 'inside the spacecraft', solar: 'near solar maximum', other: { value: 0.48, plusMinus: 0.08, unit: 'mGy', says: 'Made-up text: the instrument measured 0.48 mGy for each day.' } }),
    declining: fakeRate(2.2, 'mSv', { plusMinus: 0.3, instrument: 'Made-up instrument B', shielding: 'outside the orbiter', solar: 'declining phase' }),
  },
  surfaceStay: { phaseId: 'surface', defaultDays: 300, minDays: 0, maxDays: 600 },
  returnTrip: { phaseId: 'return' },
  crew: 4,
  cabin: CABIN,
  flags: ['Made-up flag: the shielding of a real crew cabin differs from this instrument.', 'Made-up flag: the surface rate is a proxy from another mission.'],
  sources: [FAKE_SOURCE],
}

// A short flight to the Moon in mGy only, with a phase of a part of a day.
const fakeMoon: Preset = {
  id: 'artemis1',
  name: 'Made-up Moon flight (mGy)',
  summary: 'A made-up mission for the test page.',
  badge: 'real-data',
  destination: 'moon',
  frame: 'earth',
  trajectory: { ...TRAJECTORY, badge: 'real-data' },
  phases: [
    { id: 'belts', label: 'Made-up pass through the belts', kind: 'belts', days: 0.2, rate: fakeRate(2.9, 'mGy', { badge: 'real-data' }) },
    { id: 'out', label: 'Made-up flight around the Moon', kind: 'cruise', days: 25.3, rate: fakeRate(0.31, 'mGy', { badge: 'real-data' }) },
  ],
  crew: 4,
  cabin: CABIN,
  flags: [],
  sources: [FAKE_SOURCE],
}

// A mission with one phase with no data: the stay has no value at all.
const fakeGap: Preset = {
  id: 'tgo',
  name: 'Made-up mission with a gap',
  summary: 'A made-up mission for the test page.',
  badge: 'real-trajectory-proxy',
  destination: 'mars',
  frame: 'sun',
  trajectory: TRAJECTORY,
  phases: [
    { id: 'cruise', label: 'Made-up cruise', kind: 'cruise', days: 180, rate: fakeRate(1.2, 'mSv', { badge: 'proxy', proxyOf: 'Made-up other mission' }) },
    { id: 'orbit', label: 'Made-up stay in orbit', kind: 'orbit', days: 120, rate: fakeRate(null, 'mSv', { instrument: '', shielding: '', solar: '', source: NO_LINK }) },
    { id: 'return', label: 'Made-up return', kind: 'return', days: 180, rate: fakeRate(1.2, 'mSv', { badge: 'modelled' }) },
  ],
  crew: 4,
  cabin: CABIN,
  flags: ['Made-up flag: the stay in orbit has no checked value.'],
  sources: [FAKE_SOURCE],
}

const FAKES: Partial<Record<PresetId, Preset>> = { msl: fakeMars, artemis1: fakeMoon, tgo: fakeGap }

function optionsOf(preset: Preset, more: Partial<TripOptions> = {}): TripOptions {
  const trip = defaultTrip(preset)
  return { solar: trip.solar, doseUnit: trip.doseUnit, surfaceDays: trip.surfaceDays, returnTrip: trip.returnTrip, customDays: trip.customDays, customRate: trip.customRate, customUnit: trip.customUnit, ...more }
}

// A made-up geometry for the delay card. "kmAt" gives the distance from the Earth at a mission day.
function fakeGeometry(frame: Frame, days: number, stepDays: number, kmAt: (day: number) => number, modelledFrom: number): Geometry {
  const at = (day: number): Place => {
    const inside = Math.min(Math.max(day, 0), days)
    const km = kmAt(inside)
    return { day: inside, craft: [0, 0], bodies: {}, earthDistanceKm: km, lightSeconds: km / LIGHT_KM_PER_SECOND, sunDistanceAu: null, inSaa: null, phaseId: '', modelled: inside >= modelledFrom }
  }
  const delay: Geometry['delay'] = []
  for (let day = 0; day <= days + 1e-9; day += stepDays) delay.push({ day, seconds: at(day).lightSeconds, modelled: day >= modelledFrom })
  return { frame, days, spans: [], path: [], pathDays: [], bodyPaths: {}, delay, at }
}
// To the Moon and back in 10 days. The last 3 days are "modelled".
const moonGeometry = fakeGeometry('earth', 10, 0.05, (day) => 6578 + 377_000 * Math.sin((Math.PI * day) / 10) ** 0.6, 7)
// To Mars in 253 days, then a "modelled" return of 253 days.
const marsGeometry = fakeGeometry('sun', 506, 1, (day) => KM_PER_AU * (0.0001 + 1.72 * (1 - Math.abs(day - 253) / 253) ** 1.5), 253)
// A low orbit: the delay is far below 1 second.
const orbitGeometry = fakeGeometry('ground', 3, 0.01, (day) => 6778 + 12 * Math.sin(day * 97), 99)

function useCursor(max: number, first = firstDay) {
  const [day, setDay] = useState(Math.min(first, max))
  return { day: Math.min(day, max), slider: <Slider label="Cursor day" value={Math.min(day, max)} max={max} onChange={setDay} /> }
}

function Slider({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (value: number) => void }) {
  return (
    <label style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--text-muted)', flex: '1 1 220px', minWidth: 0 }}>
      {label}: {value.toFixed(1)}
      <input type="range" min={0} max={max} step={max > 50 ? 0.5 : 0.05} value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ '--fill': `${(value / max) * 100}%` } as CSSProperties} />
    </label>
  )
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button type="button" className="pill" aria-pressed={on} onClick={() => onChange(!on)}>
      {label}
    </button>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ display: 'grid', gap: 12, minWidth: 0 }}>
      <h2 style={{ fontSize: 16, color: 'var(--text-muted)' }}>{title}</h2>
      {children}
    </section>
  )
}
const ROW: CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }

const KINDS: BadgeKind[] = ['real-data', 'real-rate', 'modelled', 'proxy', 'real-trajectory-proxy', 'real-rate-modelled']

function Badges() {
  return (
    <Block title="Badges (made up: all kinds)">
      <div className="card" style={ROW}>
        {KINDS.map((kind) => (
          <Badge key={kind} kind={kind} />
        ))}
      </div>
    </Block>
  )
}

// The made-up Mars mission with all controls: the cursor, the surface stay and the return, one storm, the unit, the solar cycle.
function FakeMars() {
  const [full, setFull] = useState(query.get('full') === '1')
  const [storm, setStorm] = useState(query.get('storm') !== '0')
  const [solar, setSolar] = useState<SolarId>(query.get('solar') === 'declining' ? 'declining' : 'max')
  const [unit, setUnit] = useState<DoseUnit>(query.get('unit') === 'mGy' ? 'mGy' : 'mSv')
  const options = optionsOf(fakeMars, { solar, doseUnit: unit, surfaceDays: full ? 300 : 0, returnTrip: full })
  const storms: Storm[] = storm ? [{ day: 118.5, dose: unit === 'mSv' ? 150 : 40, hours: 36 }] : []
  const series = doseSeries(fakeMars, options, storms)
  const cursor = useCursor(missionDays(timeline(fakeMars, options)))
  return (
    <Block title="Radiation card: made-up Mars mission of 253 days in mSv">
      <div style={ROW}>
        {cursor.slider}
        <Toggle label="Surface stay and return" on={full} onChange={setFull} />
        <Toggle label="One storm on day 118.5" on={storm} onChange={setStorm} />
        <Toggle label="Declining solar phase" on={solar === 'declining'} onChange={(on) => setSolar(on ? 'declining' : 'max')} />
      </div>
      <RadiationCard preset={fakeMars} series={series} day={cursor.day} solar={solar} units={seriesUnits(fakeMars, options)} onUnit={setUnit} />
    </Block>
  )
}

function FakeOther({ preset, title, first }: { preset: Preset; title: string; first: number }) {
  const options = optionsOf(preset)
  const series = doseSeries(preset, options, [])
  const cursor = useCursor(missionDays(timeline(preset, options)), first)
  return (
    <Block title={title}>
      <div style={ROW}>{cursor.slider}</div>
      <RadiationCard preset={preset} series={series} day={cursor.day} solar={null} units={seriesUnits(preset, options)} />
    </Block>
  )
}

function FakeDelay({ title, geometry, first, source }: { title: string; geometry: Geometry; first: number; source?: SourceRef }) {
  const cursor = useCursor(geometry.days, first)
  return (
    <Block title={title}>
      <div style={ROW}>{cursor.slider}</div>
      <DelayCard geometry={geometry} day={cursor.day} source={source} />
    </Block>
  )
}

// The comparison of the made-up missions. A real preset in the list has no values yet or has real values.
function FakeCompare() {
  const [unit, setUnit] = useState<DoseUnit>(query.get('unit') === 'mGy' ? 'mGy' : 'mSv')
  const [selected, setSelected] = useState<PresetId[]>(['msl', 'tgo', 'artemis1'])
  const all = PRESETS.map((preset) => FAKES[preset.id] ?? preset)
  const items = selected.map((id) => {
    const preset = FAKES[id] ?? PRESET_BY_ID[id]
    const options = optionsOf(preset)
    const units = seriesUnits(preset, options)
    return { preset, series: doseSeries(preset, { ...options, doseUnit: units.includes(unit) ? unit : (units[0] ?? unit) }, []) }
  })
  const { shown, hidden } = compareDose(items, unit)
  return (
    <Block title="Comparison card: made-up missions">
      <div style={ROW}>
        <Toggle label="Chart in mGy" on={unit === 'mGy'} onChange={(on) => setUnit(on ? 'mGy' : 'mSv')} />
      </div>
      <CompareCard items={shown} hidden={hidden} unit={unit} all={all} selected={selected} onSelect={setSelected} />
    </Block>
  )
}

// ---------------------------------------------------------------------------------------
// Part 2: the real presets and the real geometry. The page still loads if a file is missing.
// ---------------------------------------------------------------------------------------
const geometryFiles = import.meta.glob('../../../shared/trip/geometry.ts')
const dataFiles = import.meta.glob('./data/*.json')
type BuildGeometry = (preset: Preset, files: Record<string, TrajectoryFile>, options: TripOptions) => Geometry

class Guard extends Component<{ children: ReactNode }, { error: string | null }> {
  state: { error: string | null } = { error: null }
  static getDerivedStateFromError(error: unknown) {
    return { error: String(error) }
  }
  render() {
    return this.state.error === null ? this.props.children : <p className="card">This part failed: {this.state.error}</p>
  }
}

function Real() {
  const [id, setId] = useState<PresetId>(firstReal)
  const [unit, setUnit] = useState<DoseUnit | null>(null)
  const [selected, setSelected] = useState<PresetId[]>(['msl', 'tgo', 'artemis1'])
  const [build, setBuild] = useState<{ run: BuildGeometry; files: Record<string, TrajectoryFile> } | null>(null)
  const [problem, setProblem] = useState<string | null>(Object.values(geometryFiles)[0] ? null : 'shared/trip/geometry.ts does not exist yet.')
  useEffect(() => {
    const load = Object.values(geometryFiles)[0]
    if (!load) return
    Promise.all([load(), ...Object.entries(dataFiles).map(async ([path, get]) => [path.replace(/^.*\/(.+)\.json$/, '$1'), ((await get()) as { default: TrajectoryFile }).default] as const)])
      .then(([module, ...files]) => setBuild({ run: (module as { buildGeometry: BuildGeometry }).buildGeometry, files: Object.fromEntries(files) }))
      .catch((error: unknown) => setProblem(String(error)))
  }, [])

  const preset = PRESET_BY_ID[id]
  const base = optionsOf(preset)
  const units = seriesUnits(preset, base)
  const options = { ...base, doseUnit: unit !== null && units.includes(unit) ? unit : (units[0] ?? base.doseUnit) }
  const series = doseSeries(preset, options, [])
  const days = missionDays(timeline(preset, options))
  const cursor = useCursor(days, Math.min(firstDay, days / 2))
  let geometry: Geometry | null = null
  let geometryProblem = problem
  if (build) {
    try {
      geometry = build.run(preset, build.files, options)
    } catch (error) {
      geometryProblem = String(error)
    }
  }
  const compareItems = selected.map((item) => {
    const other = PRESET_BY_ID[item]
    const otherOptions = optionsOf(other)
    const otherUnits = seriesUnits(other, otherOptions)
    return { preset: other, series: doseSeries(other, { ...otherOptions, doseUnit: otherUnits.includes(options.doseUnit) ? options.doseUnit : (otherUnits[0] ?? options.doseUnit) }, []) }
  })
  const compared = compareDose(compareItems, options.doseUnit)
  return (
    <Block title="Part 2: the real presets (their values are what the files have now)">
      <div style={ROW}>
        <select value={id} onChange={(event) => setId(event.target.value as PresetId)} aria-label="Preset">
          {PRESETS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        {cursor.slider}
      </div>
      <Guard key={`rad-${id}`}>
        <RadiationCard preset={preset} series={series} day={cursor.day} solar={preset.solar ? options.solar : null} units={units} onUnit={setUnit} />
      </Guard>
      <Guard key={`delay-${id}`}>{geometry ? <DelayCard geometry={geometry} day={cursor.day} source={preset.trajectory.source} /> : <p className="card">No geometry: {geometryProblem ?? 'loading'}</p>}</Guard>
      <Guard key="cmp">
        <CompareCard items={compared.shown} hidden={compared.hidden} unit={options.doseUnit} all={PRESETS} selected={selected} onSelect={setSelected} />
      </Guard>
    </Block>
  )
}

export function Page() {
  return (
    <main style={{ maxWidth: 1360, margin: '0 auto', padding: '16px var(--gutter) 48px', display: 'grid', gap: 28, gridTemplateColumns: 'minmax(0, 1fr)' }}>
      <header style={{ ...ROW, justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 18 }}>Test page W3. Part 1 is MADE-UP data.</h1>
        <div className="segmented">
          {LANGS.map((item) => (
            <button key={item.id} type="button" aria-pressed={item.id === lang} onClick={() => setLang(item.id)}>
              {item.short}
            </button>
          ))}
        </div>
      </header>
      {show('badge') && <Badges />}
      {show('rad') && <FakeMars />}
      {show('gy') && <FakeOther preset={fakeMoon} title="Radiation card: made-up Moon flight in mGy" first={12} />}
      {show('gap') && <FakeOther preset={fakeGap} title="Radiation card: made-up mission with one phase with no data" first={240} />}
      {show('delay') && (
        <>
          <FakeDelay title="Delay card: made-up path to Mars and back" geometry={marsGeometry} first={200} source={FAKE_SOURCE} />
          <FakeDelay title="Delay card: made-up path to the Moon" geometry={moonGeometry} first={5} />
          <FakeDelay title="Delay card: made-up low orbit" geometry={orbitGeometry} first={1} />
        </>
      )}
      {show('cmp') && <FakeCompare />}
      {show('real') && (
        <Guard>
          <Real />
        </Guard>
      )}
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
)
