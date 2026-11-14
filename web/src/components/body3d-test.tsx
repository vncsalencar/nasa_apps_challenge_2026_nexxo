import { lazy, StrictMode, Suspense, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/sora/latin-500.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/barlow/latin-400.css'
import '../index.css'
import type { BodyPart, Status } from '../api.ts'
import { BodyFigure } from './BodyFigure.tsx'

// A page for tests of the 3D body figure. It shows the 3D figure next to the 2D figure.
// Options in the address: ?look=bridge, ?set=0 to 3 (which parts have a problem), ?sel=head, ?only=3d.
const BodyFigure3D = lazy(() => import('./BodyFigure3D.tsx'))
const normal: Record<BodyPart, Status> = { head: 'normal', chest: 'normal', abdomen: 'normal', arms: 'normal', legs: 'normal' }
const SETS: Record<BodyPart, Status>[] = [
  { ...normal, head: 'alert', chest: 'caution' },
  normal,
  { ...normal, abdomen: 'alert', arms: 'caution', legs: 'caution' },
  { head: 'caution', chest: 'alert', abdomen: 'caution', arms: 'alert', legs: 'alert' },
]
const query = new URLSearchParams(location.search)
document.documentElement.dataset.look = query.get('look') ?? 'soft'

export function Page() {
  const [set, setSet] = useState(Number(query.get('set') ?? 0))
  const [selected, setSelected] = useState<BodyPart | null>((query.get('sel') as BodyPart | null) ?? null)
  const [mounted, setMounted] = useState(true)
  const [, setLook] = useState(document.documentElement.dataset.look)
  const select = (part: BodyPart) => setSelected((now) => (now === part ? null : part))
  const props = { statuses: SETS[set], symptomCounts: { head: 2 }, selected, onSelect: select }
  return (
    <main style={{ padding: 16, display: 'grid', gap: 16, justifyItems: 'center' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          id="look"
          onClick={() => {
            document.documentElement.dataset.look = document.documentElement.dataset.look === 'bridge' ? 'soft' : 'bridge'
            setLook(document.documentElement.dataset.look)
          }}
        >
          Change the look
        </button>
        <button type="button" id="set" onClick={() => setSet((set + 1) % SETS.length)}>
          Change the statuses
        </button>
        <button type="button" id="mount" onClick={() => setMounted(!mounted)}>
          {mounted ? 'Remove 3D' : 'Add 3D'}
        </button>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        Selected: <span id="picked">{selected ?? 'none'}</span>
      </p>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
        <div id="box3d" style={{ width: 'min(100%, var(--box, 420px))' }}>
          {mounted && (
            <Suspense fallback={<p className="muted">Loading the 3D figure</p>}>
              <BodyFigure3D {...props} />
            </Suspense>
          )}
        </div>
        {query.get('only') !== '3d' && (
          <div id="box2d" style={{ width: 300 }}>
            <BodyFigure {...props} />
          </div>
        )}
      </div>
      <div style={{ height: 900 }} className="muted small">
        Space to test the scroll of the page.
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
