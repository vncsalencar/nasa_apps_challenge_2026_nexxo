import { lazy, StrictMode, Suspense, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/sora/latin-500.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/barlow/latin-400.css'
import '../index.css'
import { BodyFigure } from './BodyFigure.tsx'
import type { FigurePoint, FigureProps, Heat, HeatRegion } from './heat.ts'
import { HEAT_REGIONS } from './heat.ts'

// A page for tests of the two body figures. It shows the 2D figure next to the 3D figure.
// One slider sets a sample heat for all regions.
// Options in the address: ?look=bridge, ?level=0.5 (the slider), ?sel=eyes (the selected region), ?only=2d or ?only=3d.
const BodyFigure3D = lazy(() => import('./BodyFigure3D.tsx'))
const query = new URLSearchParams(location.search)
if (query.get('look') === 'bridge') document.documentElement.dataset.look = 'bridge'

// How far `level` is on the way between two numbers, from 0 to 1.
const ramp = (level: number, from: number, to: number) => Math.min(1, Math.max(0, (level - from) / (to - from)))
// The sample heat for a place of the slider. The parts rise first, then the brain, the head, the eyes
// and the airway, and then the face. So each region shows at many strengths.
function sample(level: number): Heat {
  return {
    chest: ramp(level, 0, 0.6) * 0.7,
    abdomen: ramp(level, 0.05, 0.7) * 0.55,
    arms: ramp(level, 0.1, 0.8) * 0.4,
    legs: ramp(level, 0.15, 0.9) * 0.3,
    brain: ramp(level, 0.2, 0.7),
    head: ramp(level, 0.3, 0.9) * 0.8,
    eyes: ramp(level, 0.35, 0.8),
    airway: ramp(level, 0.4, 0.9),
    face: ramp(level, 0.6, 1),
  }
}
// The styles of the page have no colors for the Bridge look. The test page sets them here, so a person can see the two looks.
const BRIDGE = `:root[data-look='bridge'] { --bg: #000000; --surface: #000000; --surface-2: #0d0d0d; --border: #262626; --border-strong: #404040; --text: #ffffff; --text-soft: #d4d4d4; --text-muted: #9a9a9a; --warning: #fbbf24; --critical: #ff5a4d; }`
const NAMES: Record<HeatRegion, string> = { head: 'Head', chest: 'Chest', abdomen: 'Abdomen', arms: 'Arms', legs: 'Legs', brain: 'Brain', eyes: 'Eyes', face: 'Face', airway: 'Airway' }

export function Page() {
  const [level, setLevel] = useState(Number(query.get('level') ?? 0.5))
  const [selected, setSelected] = useState<HeatRegion | null>((query.get('sel') as HeatRegion | null) ?? null)
  const [hovered, setHovered] = useState<{ region: HeatRegion; point?: FigurePoint } | null>(null)
  const [bridge, setBridge] = useState(document.documentElement.dataset.look === 'bridge')
  const heat = sample(level)
  const labels = Object.fromEntries(HEAT_REGIONS.map((region) => [region, `${NAMES[region]}: ${Math.round(heat[region] * 100)}%`])) as Record<HeatRegion, string>
  const props: FigureProps = {
    heat,
    labels,
    selected,
    onSelect: (region) => setSelected((now) => (now === region ? null : region)),
    onHover: (region, point) => setHovered(region ? { region, point } : null),
  }
  const only = query.get('only')
  return (
    <main style={{ padding: 16, display: 'grid', gap: 16, justifyItems: 'center' }}>
      <style>{BRIDGE}</style>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          Heat
          <input type="range" id="level" min="0" max="1" step="0.01" value={level} onChange={(event) => setLevel(Number(event.target.value))} />
          <span id="level-value" style={{ width: '3ch' }}>
            {level.toFixed(2)}
          </span>
        </label>
        <button
          type="button"
          id="look"
          onClick={() => {
            if (bridge) delete document.documentElement.dataset.look
            else document.documentElement.dataset.look = 'bridge'
            setBridge(!bridge)
          }}
        >
          Change the look
        </button>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        Hovered: <span id="hovered">{hovered?.region ?? 'none'}</span>
        {hovered?.point && <span id="hovered-point">{` at ${Math.round(hovered.point.x)}, ${Math.round(hovered.point.y)}`}</span>}. Selected: <span id="picked">{selected ?? 'none'}</span>
      </p>
      <p className="muted small" style={{ margin: 0 }}>
        {HEAT_REGIONS.map((region) => labels[region]).join(' · ')}
      </p>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
        {only !== '3d' && (
          <div id="box2d" style={{ width: 'min(100%, var(--box, 300px))' }}>
            <BodyFigure {...props} />
          </div>
        )}
        {only !== '2d' && (
          <div id="box3d" style={{ width: 'min(100%, var(--box, 420px))' }}>
            <Suspense fallback={<p className="muted">Loading the 3D figure</p>}>
              <BodyFigure3D {...props} />
            </Suspense>
          </div>
        )}
      </div>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  // The app uses StrictMode too. It mounts each component two times in development.
  <StrictMode>
    <Page />
  </StrictMode>,
)
