// A page for tests of the CO2 cards (components/co2/) with the CO2 forecast of the trip, and of the page links.
// It shows how the trip page uses the cards: the life support model of shared/trip/lifesupport.ts makes a
// forecast, feedOfForecast() makes a feed from it, and viewFrom() makes the view that each card reads.
// Each CO2 value on this page is a value of the model. The texts of this page are in English only.
// Options in the address: ?preset=iss, ?scrubber=one or off, ?day=12.5 (the mission day), ?changed=10 (the day when the scrubber changed).
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import '@fontsource/sora/latin-500.css'
import '@fontsource/sora/latin-600.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '../index.css'
import { CDRA_STATES } from '../../../shared/co2.ts'
import { nominalLife } from '../../../shared/trip/defaults.ts'
import { cabinForecast } from '../../../shared/trip/lifesupport.ts'
import { PRESET_BY_ID } from '../../../shared/trip/presets/index.ts'
import { PRESET_IDS } from '../../../shared/trip/types.ts'
import { BodyMapCard } from '../components/co2/BodyMapCard.tsx'
import { NowCard } from '../components/co2/NowCard.tsx'
import { RiskCard } from '../components/co2/RiskCard.tsx'
import { TimeCard } from '../components/co2/TimeCard.tsx'
import { PageTabs } from '../components/PageTabs.tsx'
import { fmt, tn } from '../i18n.ts'
import { CDRA_LABEL } from '../texts.ts'
import { feedOfForecast, viewFrom } from '../view.ts'
import '../pages/dashboard.css'

const query = new URLSearchParams(location.search)
const preset = PRESET_BY_ID[PRESET_IDS.find((id) => id === query.get('preset')) ?? 'msl']
const scrubber = CDRA_STATES.find((state) => state === query.get('scrubber')) ?? 'both'
const day = Number(query.get('day') ?? 12.5)
const changedDay = Number(query.get('changed') ?? 10)

const nominal = nominalLife(preset)
const life = { ...nominal, scrubber }
const forecast = cabinForecast(nominal, life, changedDay, day)
const view = viewFrom(feedOfForecast(forecast, life.totalPressureMmHg))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* The trip page is the open page here, so the second link is the marked one. */}
    <MemoryRouter initialEntries={['/trip']}>
      <div className="xp">
        <header className="xp-top">
          <div className="xp-brand">
            <span className="brand">Nexxo</span>
            <h1 className="hide">Trip forecast</h1>
            <PageTabs />
          </div>
          <div className="xp-live">
            <span className="xp-clock">
              Test page · {preset.name} · mission day {fmt(day, 1)}
            </span>
          </div>
        </header>
        {/* No class "xp-grid" here: the cards must work in the grid of another page too. */}
        <main style={{ display: 'grid', gap: 20, gridTemplateColumns: 'minmax(0, 1fr)' }}>
          <NowCard
            view={view}
            sourceText="Simulated value from the life support model"
            ppmTip={
              <span className="tip-part">
                The model gives the CO2 partial pressure in mmHg. ppm = mmHg ÷ total cabin pressure × 1,000,000. The total pressure here is {fmt(view.pressure)} mmHg, so 1 mmHg is about{' '}
                {fmt(Math.round(1_000_000 / view.pressure))} ppm.
              </span>
            }
          />
          <BodyMapCard view={view} />
          <RiskCard view={view} />
          <TimeCard
            view={view}
            steady="dailyMean"
            inputs={
              <>
                {tn(life.crew, '{count} person', '{count} persons')} · {fmt(life.freeVolumeM3)} m³ · scrubber: {CDRA_LABEL[life.scrubber].toLowerCase()}
              </>
            }
            note="The projection is the life support model of the trip, with a daily pattern of sleep and exercise. It is not a measurement."
          />
        </main>
      </div>
    </MemoryRouter>
  </StrictMode>,
)
