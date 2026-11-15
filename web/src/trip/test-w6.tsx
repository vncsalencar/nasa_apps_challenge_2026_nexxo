import { StrictMode, useEffect, useState, type CSSProperties } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/sora/latin-500.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '../index.css'
import type { Effect, EffectRegion, EffectsInput, Mitigation } from '../../../shared/trip/effects-types.ts'
import type { DoseUnit, SourceRef } from '../../../shared/trip/types.ts'
import type { Heat } from '../components/heat.ts'
import { ptBR } from '../locales/pt-BR.ts'
import { tripW6 } from '../locales/pt-BR/trip-w6.ts'

// The lead merges the Portuguese file of this card into pt-BR.ts later. Until then, the test page adds it
// here. The card reads some texts when its file loads, so the card loads after this line.
Object.assign(ptBR, tripW6)
const { EffectsCard } = await import('./EffectsCard.tsx')

// A page for tests of the "effects on the body" card.
// Part 1 uses FAKE effects: each effect, number, source, and step below is made up to test the layout.
// Part 2 calls bodyEffects() of shared/trip/effects.ts with sliders, if that file exists.
// Options in the address: ?case=calm|co2|late|storm|o2|all, ?part=1 or ?part=2 (one part only).

// ---------------------------------------------------------------------------------------
// Part 1: fake effects.
// ---------------------------------------------------------------------------------------
const fakeSource = (letter: string): SourceRef => ({ short: `Fake source ${letter}`, title: `Fake source ${letter}, a document that does not exist (layout test)`, url: `https://example.org/fake-${letter.toLowerCase()}` })
const A = fakeSource('A')
const B = fakeSource('B')
const C = fakeSource('C')
const step = (text: string, source?: SourceRef): Mitigation => (source ? { text, source } : { text, ours: true })

type Case = {
  day: number
  co2: number
  o2: number
  // The dose as a part of each fake limit, from 0 to 1.
  career: number
  eye: number
  blood: number
  skin: number
  heart: number
  storm: boolean
}
const CALM: Case = { day: 12, co2: 2.0, o2: 160, career: 0.03, eye: 0.02, blood: 0.05, skin: 0.01, heart: 0.03, storm: false }
const LATE: Case = { ...CALM, day: 860, career: 0.92, eye: 0.4, blood: 0.55, skin: 0.3, heart: 0.35 }
const CASES: Record<string, { name: string; values: Case }> = {
  calm: { name: 'Calm day', values: CALM },
  co2: { name: 'CO2 at 3.6 mmHg', values: { ...CALM, day: 40, co2: 3.6 } },
  late: { name: 'Late mission day', values: LATE },
  storm: { name: 'Solar storm', values: { ...CALM, day: 150, career: 0.3, eye: 0.6, blood: 0.85, skin: 0.7, heart: 0.45, storm: true } },
  o2: { name: 'Low O2', values: { ...CALM, day: 75, o2: 112 } },
  all: { name: 'All hazards', values: { ...LATE, co2: 4.7, o2: 112, eye: 0.75, blood: 1, storm: true } },
}

// How far a value is between two numbers, from 0 to 1. "from" can be higher than "to" (for the O2, which falls).
const ramp = (value: number, from: number, to: number) => Math.min(1, Math.max(0, (value - from) / (to - from)))
// A fake limit shows from a quarter of the limit.
const toward = (part: number) => (part < 0.25 ? 0 : Math.min(1, part))
const percent = (part: number) => `${Math.round(part * 100)}%`

function fakeEffects(now: Case): Effect[] {
  const co2 = (id: string, region: EffectRegion, title: string, from: number, to: number | null, weight: number, mitigations: Mitigation[]): Effect => ({
    id,
    hazard: 'co2',
    region,
    title,
    says: to === null ? `Fake source A reports this from ${from} mmHg of CO2.` : `Fake source A reports this from ${from} to ${to} mmHg of CO2.`,
    source: A,
    kind: 'band',
    measure: `CO2 now: ${now.co2.toFixed(1)} mmHg. The band starts at ${from} mmHg.`,
    intensity: to === null ? (now.co2 >= from ? 1 : 0) : ramp(now.co2, from, to),
    weight,
    mitigations,
  })
  const o2 = (id: string, region: EffectRegion, title: string, from: number, to: number, weight: number, mitigations: Mitigation[]): Effect => ({
    id,
    hazard: 'o2',
    region,
    title,
    says: `Fake source B reports this when the O2 partial pressure falls below ${from} mmHg.`,
    source: B,
    kind: 'band',
    measure: `O2 now: ${now.o2} mmHg. The band starts at ${from} mmHg and ends at ${to} mmHg.`,
    intensity: ramp(now.o2, from, to),
    weight,
    mitigations,
  })
  const dose = (id: string, region: EffectRegion, title: string, part: number, limit: string, weight: number, mitigations: Mitigation[]): Effect => ({
    id,
    hazard: 'radiation',
    region,
    title,
    says: `Fake source C sets a limit of ${limit} for this organ, so that the effect does not occur.`,
    source: C,
    kind: 'limit',
    measure: `Dose of the mission: ${percent(part)} of the number of the limit (${limit}).`,
    intensity: toward(part),
    weight,
    caveat: 'The app measures the dose in mSv. The limit is in mGy-Eq. These are different quantities, so this comparison is an estimate of the order of size only.',
    mitigations,
  })
  const scrub = [step('Check that the CO2 removal system runs with both beds.', A), step('Move the crew to a module with more air flow.'), step('Lower the exercise load until the value falls.', A)]
  const shield = [step('Sleep in the part of the cabin with the most shielding.', C), step('Plan work outside the cabin for a day with low solar activity.', C), step('Put water bags and food packs around the sleep station.')]
  return [
    co2('fake-co2-fatigue', 'body', 'Fatigue and a feeling of a full head', 2.3, 2.7, 0.35, scrub),
    co2('fake-co2-thinking', 'brain', 'Brain: missed steps of a procedure', 2.7, 3.0, 0.6, scrub),
    co2('fake-co2-headache', 'head', 'Head: headache, worse with more CO2', 2.8, 4.5, 0.8, [...scrub, step('Report each headache with its time, so the ground team can compare it with the CO2 record.')]),
    co2('fake-co2-vision', 'eyes', 'Eyes: blurred vision', 3.5, null, 0.9, scrub),
    co2('fake-co2-cough', 'airway', 'Airway: cough and a dry throat', 3.5, null, 0.9, scrub),
    co2('fake-co2-sleep', 'none', 'Sleep: more times awake in the night', 3.5, null, 0.9, [step('Point a fan at the sleep station, because CO2 stays in pockets where the air does not move.', A)]),
    co2('fake-co2-face', 'face', 'Face: flushed skin', 4.5, 5.0, 1, scrub),
    o2('fake-o2-night', 'eyes', 'Eyes: weaker vision in low light', 130, 105, 0.5, [step('Use more cabin light for a task that needs fine vision.')]),
    o2('fake-o2-thinking', 'brain', 'Brain: slower thinking and slower reaction', 125, 100, 0.8, [step('Check the O2 supply and the cabin pressure.', B), step('Use the procedure with two persons for each critical task.')]),
    o2('fake-o2-breath', 'chest', 'Chest: faster breathing and a faster heart rate', 120, 95, 0.7, [step('Stop hard exercise until the O2 partial pressure is normal.', B)]),
    o2('fake-o2-body', 'body', 'Whole body: fatigue and less capacity for work', 128, 100, 0.5, []),
    dose('fake-rad-career', 'body', 'Whole body: career dose limit', now.career, '600 mSv', 0.9, shield),
    dose('fake-rad-eye', 'eyes', 'Lens of the eye: cataract', now.eye, '1000 mGy-Eq', 0.7, shield),
    dose('fake-rad-blood', 'abdomen', 'Blood-forming organs: fewer blood cells', now.blood, '250 mGy-Eq', 0.8, shield),
    dose('fake-rad-skin', 'arms', 'Skin: redness and dry skin', now.skin, '1500 mGy-Eq', 0.4, shield),
    dose('fake-rad-heart', 'chest', 'Heart and blood vessels', now.heart, '250 mGy-Eq', 0.8, shield),
    {
      id: 'fake-rad-storm',
      hazard: 'radiation',
      region: 'body',
      title: 'Solar storm: nausea and vomiting in the first hours',
      says: 'Fake source C reports nausea and vomiting after a large dose in a short time, for example in a solar particle event.',
      source: C,
      kind: 'band',
      measure: now.storm ? 'A solar particle event is active now (a what-if storm of the presenter).' : 'No solar particle event is active now.',
      intensity: now.storm ? 1 : 0,
      weight: 1,
      mitigations: [step('Go to the storm shelter of the spacecraft and stay there until the event ends.', C), step('Stop all work outside the cabin.', C), step('Keep the personal dosimeter on the body.')],
    },
  ]
}

// The rule of the heat of the figure. The page of the lead gets "figure" from figureHeat() of
// shared/trip/effects.ts. This copy is for the test page while that file does not exist.
function fallbackHeat(effects: Effect[]): Heat {
  const top = (region: EffectRegion) => Math.max(0, ...effects.filter((effect) => effect.region === region).map((effect) => effect.intensity * effect.weight))
  const body = top('body')
  const part = (region: EffectRegion) => Math.max(body, top(region))
  const onTop = (own: number, below: number) => (own > 0 ? Math.max(own, below) : 0)
  const head = part('head')
  const chest = part('chest')
  return { head, chest, abdomen: part('abdomen'), arms: part('arms'), legs: part('legs'), brain: onTop(top('brain'), head), eyes: onTop(top('eyes'), head), face: onTop(top('face'), head), airway: onTop(top('airway'), chest) }
}

// ---------------------------------------------------------------------------------------
// Part 2: the real rules, if shared/trip/effects.ts exists. The glob finds no file while it is missing,
// so the page still loads.
// ---------------------------------------------------------------------------------------
type EffectsModule = { bodyEffects?: (input: EffectsInput) => Effect[]; figureHeat?: (effects: Effect[]) => Heat }
const found = import.meta.glob('../../../shared/trip/effects.ts')
const loadRules = Object.values(found)[0] as (() => Promise<EffectsModule>) | undefined

const query = new URLSearchParams(location.search)
const firstCase = CASES[query.get('case') ?? ''] ? query.get('case')! : 'co2'
const onlyPart = query.get('part')

function Slider({ id, label, min, max, stepSize, value, unit, onChange }: { id: string; label: string; min: number; max: number; stepSize: number; value: number; unit: string; onChange: (value: number) => void }) {
  return (
    <label style={{ display: 'grid', gap: 2, fontSize: 14 }}>
      <span>
        {label}: <strong>{value}</strong> {unit}
      </span>
      <input id={id} type="range" min={min} max={max} step={stepSize} value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ '--fill': `${((value - min) / (max - min)) * 100}%` } as CSSProperties} />
    </label>
  )
}

function RealPart() {
  const [rules, setRules] = useState<EffectsModule | null>(null)
  const [failed, setFailed] = useState('')
  const [co2, setCo2] = useState(2.5)
  const [o2, setO2] = useState(160)
  const [total, setTotal] = useState(100)
  const [month, setMonth] = useState(20)
  const [day, setDay] = useState(180)
  const [unit, setUnit] = useState<DoseUnit>('mSv')
  const [storm, setStorm] = useState(false)
  useEffect(() => {
    loadRules?.().then(setRules, (error) => setFailed(String(error)))
  }, [])
  if (!loadRules) return <p className="muted">shared/trip/effects.ts does not exist yet, so this part has nothing to show.</p>
  if (failed) return <p className="muted">shared/trip/effects.ts did not load: {failed}</p>
  if (!rules) return <p className="muted">Loading shared/trip/effects.ts…</p>
  if (!rules.bodyEffects) return <p className="muted">shared/trip/effects.ts exports no bodyEffects().</p>
  const last30Days = Math.min(month, total)
  const input: EffectsInput = { co2MmHg: co2, co2HourMeanMmHg: co2, o2MmHg: o2, dose: { unit, total, last30Days, lastYear: total, today: last30Days / 30 }, stormNow: storm }
  let effects: Effect[] = []
  let error = ''
  try {
    effects = rules.bodyEffects(input)
  } catch (thrown) {
    error = String(thrown)
  }
  return (
    <>
      <div className="card" style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <Slider id="real-co2" label="CO2 now and its 1-hour mean" min={0} max={8} stepSize={0.1} value={co2} unit="mmHg" onChange={setCo2} />
        <Slider id="real-o2" label="O2" min={60} max={200} stepSize={1} value={o2} unit="mmHg" onChange={setO2} />
        <Slider id="real-total" label="Dose of the mission (also used as the dose of the last year)" min={0} max={2000} stepSize={5} value={total} unit={unit} onChange={setTotal} />
        <Slider id="real-month" label="Dose of the last 30 days" min={0} max={600} stepSize={5} value={month} unit={unit} onChange={setMonth} />
        <Slider id="real-day" label="Mission day" min={0} max={1000} stepSize={1} value={day} unit="" onChange={setDay} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', fontSize: 14 }}>
          <span className="segmented" role="group" aria-label="Dose unit">
            {(['mSv', 'mGy'] as const).map((item) => (
              <button type="button" key={item} aria-pressed={unit === item} onClick={() => setUnit(item)}>
                {item}
              </button>
            ))}
          </span>
          <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <input id="real-storm" type="checkbox" checked={storm} onChange={(event) => setStorm(event.target.checked)} /> Solar storm now
          </label>
        </div>
      </div>
      {error ? <p className="muted">bodyEffects() failed: {error}</p> : <EffectsCard effects={effects} figure={(rules.figureHeat ?? fallbackHeat)(effects)} day={day} />}
    </>
  )
}

export function Page() {
  const [name, setName] = useState(firstCase)
  const now = CASES[name].values
  const effects = fakeEffects(now)
  return (
    <main style={{ maxWidth: 1360, margin: '0 auto', padding: '16px var(--gutter) 48px', display: 'grid', gap: 20 }}>
      {onlyPart !== '2' && (
        <>
          <div style={{ display: 'grid', gap: 10 }}>
            <p id="fake-note" style={{ fontSize: 14, color: 'var(--warning)' }}>
              ▲ Test page. Each effect, number, source, and step in this part is FAKE. This part tests the layout only.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="group" aria-label="Test case">
              {Object.entries(CASES).map(([id, item]) => (
                <button type="button" className="pill" key={id} data-case={id} aria-pressed={name === id} onClick={() => setName(id)}>
                  {item.name}
                </button>
              ))}
            </div>
          </div>
          <EffectsCard effects={effects} figure={fallbackHeat(effects)} day={now.day} />
        </>
      )}
      {onlyPart !== '1' && (
        <>
          <h2 style={{ fontSize: 18, marginTop: 12 }}>Part 2: the rules of shared/trip/effects.ts</h2>
          <RealPart />
        </>
      )}
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
)
