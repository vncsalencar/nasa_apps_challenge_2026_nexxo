import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/sora/latin-500.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '../index.css'
import { EFFECT_NOTES, HAZARDS, HAZARD_LABEL, HAZARD_SAYS, HAZARD_SOURCE, bodyEffects, figureHeat } from '../../../shared/trip/effects.ts'
import type { EffectsInput } from '../../../shared/trip/effects-types.ts'
import { EffectsCard } from './EffectsCard.tsx'

// A page for tests of shared/trip/effects.ts: the real rules and texts in the card, for some mission days.
// The values of each case are test values. They are not measurements.
const CASES: Record<string, { name: string; day: number; input: EffectsInput }> = {
  calm: {
    name: 'Calm cabin, no dose',
    day: 0,
    input: { co2MmHg: 2.0, co2HourMeanMmHg: 2.0, o2MmHg: 150, dose: { unit: 'mSv', total: null, last30Days: null, lastYear: null, today: null }, stormNow: false },
  },
  cruise: {
    name: 'Long flight, charts in mSv',
    day: 250,
    input: { co2MmHg: 2.65, co2HourMeanMmHg: 2.7, o2MmHg: 150, dose: { unit: 'mSv', total: 460, last30Days: 55, lastYear: 460, today: 1.8 }, stormNow: false },
  },
  storm: {
    name: 'Solar particle event, charts in mGy',
    day: 120,
    input: { co2MmHg: 2.4, co2HourMeanMmHg: 2.4, o2MmHg: 150, dose: { unit: 'mGy', total: 760, last30Days: 715, lastYear: 760, today: 700 }, stormNow: true },
  },
  stormSv: {
    name: 'Solar particle event, charts in mSv',
    day: 120,
    input: { co2MmHg: 2.4, co2HourMeanMmHg: 2.4, o2MmHg: 150, dose: { unit: 'mSv', total: 520, last30Days: 355, lastYear: 520, today: 300 }, stormNow: true },
  },
  air: {
    name: 'Scrubber and generator off',
    day: 40,
    input: { co2MmHg: 4.7, co2HourMeanMmHg: 4.4, o2MmHg: 118, dose: { unit: 'mSv', total: 70, last30Days: 55, lastYear: 70, today: 1.8 }, stormNow: false },
  },
  highO2: {
    name: 'Too much O2',
    day: 40,
    input: { co2MmHg: 2.0, co2HourMeanMmHg: 2.0, o2MmHg: 400, dose: { unit: 'mGy', total: 20, last30Days: 15, lastYear: 20, today: 0.5 }, stormNow: false },
  },
}

const query = new URLSearchParams(location.search)
const first = CASES[query.get('case') ?? ''] ? query.get('case')! : 'cruise'

export function Page() {
  const [name, setName] = useState(first)
  const now = CASES[name]
  const effects = bodyEffects(now.input)
  return (
    <main style={{ maxWidth: 1360, margin: '0 auto', padding: '16px var(--gutter) 48px', display: 'grid', gap: 20 }}>
      <p style={{ fontSize: 14, color: 'var(--warning)' }}>▲ Test page. The CO2, the O2, and the dose of each case are test values. The effects, the sources, and the steps are the real data of shared/trip/effects.ts.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="group" aria-label="Test case">
        {Object.entries(CASES).map(([id, item]) => (
          <button type="button" className="pill" key={id} data-case={id} aria-pressed={name === id} onClick={() => setName(id)}>
            {item.name}
          </button>
        ))}
      </div>
      <EffectsCard effects={effects} figure={figureHeat(effects)} day={now.day} />
      <section className="card" style={{ display: 'grid', gap: 10, fontSize: 14 }}>
        <h2 style={{ fontSize: 18 }}>HAZARD_SAYS</h2>
        {HAZARDS.map((hazard) => (
          <p key={hazard}>
            <strong>{HAZARD_LABEL[hazard]}.</strong> {HAZARD_SAYS[hazard]} <a href={HAZARD_SOURCE[hazard].url}>{HAZARD_SOURCE[hazard].short}</a>
          </p>
        ))}
        <h2 style={{ fontSize: 18 }}>EFFECT_NOTES</h2>
        {Object.entries(EFFECT_NOTES).map(([id, notes]) => (
          <div key={id}>
            <strong>{effects.find((effect) => effect.id === id)?.title ?? id}</strong>
            <ul style={{ margin: '4px 0 0 18px' }}>
              {notes.map((note) => (
                <li key={note.text}>
                  {note.text} <a href={note.source.url}>{note.source.short}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
)
