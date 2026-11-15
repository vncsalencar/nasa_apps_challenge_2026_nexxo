// Card 2 of the CO2 cards: the body map. It shows where NASA documents report symptoms at the CO2 value now.
import { Suspense, lazy, useState } from 'react'
import { t } from '../../i18n.ts'
import { BAND_REGIONS_OF, BAND_SYMPTOM, FIGURE_LABEL, REGION_LABEL, SOURCES } from '../../texts.ts'
import { bandState, bandText, heatStyle, type Co2View } from '../../view.ts'
import { BodyFigure } from '../BodyFigure.tsx'
import { HEAT_REGIONS, type FigurePoint, type HeatRegion } from '../heat.ts'
import { BandTip, Cite } from '../parts.tsx'
import { FloatingTip, Tip } from '../Tip.tsx'
import './cards.css'
import './body-map.css'

// The 3D figure loads after the first paint, because it brings a large library.
const BodyFigure3D = lazy(() => import('../BodyFigure3D.tsx'))

const FIGURE_KEY = 'nexxo-body-3d'
function storedThreeD() {
  try {
    return localStorage.getItem(FIGURE_KEY) === 'on'
  } catch {
    return false
  }
}

export function BodyMapCard({ view }: { view: Co2View }) {
  const [threeD, setThreeD] = useState(storedThreeD)
  const [selected, setSelected] = useState<HeatRegion | null>(null)
  const [hover, setHover] = useState<{ region: HeatRegion; point?: FigurePoint } | null>(null)
  const choose = (on: boolean) => {
    setThreeD(on)
    try {
      localStorage.setItem(FIGURE_KEY, on ? 'on' : 'off')
    } catch {
      // The choice then lasts until the page closes.
    }
  }
  const bandsOf = (region: HeatRegion) => view.bands.filter((item) => BAND_REGIONS_OF[region].includes(item.band.region))
  const labels = Object.fromEntries(
    HEAT_REGIONS.map((region) => {
      const on = bandsOf(region).filter((item) => item.intensity > 0)
      const text = on.length ? on.map((item) => `${BAND_SYMPTOM[item.band.id]}, ${bandState(item.band, item.intensity)}`).join(' ') : t('No symptom band is active here.')
      return [region, `${FIGURE_LABEL[region]}. ${text}`]
    }),
  ) as Record<HeatRegion, string>
  const figure = {
    heat: view.figure,
    labels,
    selected,
    onSelect: (region: HeatRegion) => setSelected((current) => (current === region ? null : region)),
    // The figure reports a mouse or the keyboard here. It does not report a finger: a tap selects a region.
    onHover: (region: HeatRegion | null, point?: FigurePoint) => setHover(region ? { region, point } : null),
  }
  const shown = hover ?? (selected ? { region: selected, point: undefined } : null)
  const sleep = view.bands.find((item) => item.band.region === 'sleep')!
  // The lowest band first. The two headache bands start at different values, because the sources differ.
  const rows = [...view.bands].sort((a, b) => a.band.from - b.band.from)
  // A row of the list marks its region on the figure.
  const figureRegion = (region: string): HeatRegion | null => (region === 'body' ? 'chest' : region === 'sleep' ? null : (region as HeatRegion))

  return (
    <section className="card xp-body" aria-label={t('Body map')}>
      <div className="xp-card-head">
        <div>
          <h2 className="xp-h2">{t('Body map')}</h2>
          {/* The task of the hackathon team fixes this legend text. */}
          <p className="xp-legend">{t('Risk by NASA-reported symptom band — not measured body data.')}</p>
        </div>
        <span className="segmented xp-dim" role="group" aria-label={t('Figure')}>
          <button type="button" aria-pressed={!threeD} onClick={() => choose(false)}>2D</button>
          <button type="button" aria-pressed={threeD} onClick={() => choose(true)}>3D</button>
        </span>
      </div>

      <div className="xp-body-main">
        <div className="xp-stage">
          <div className="xp-figure">
            {threeD ? (
              <Suspense fallback={<BodyFigure {...figure} />}>
                <BodyFigure3D {...figure} />
              </Suspense>
            ) : (
              <BodyFigure {...figure} />
            )}
          </div>
          <Tip
            className={sleep.intensity > 0 ? 'xp-sleep xp-sleep-on' : 'xp-sleep'}
            tip={<BandTip band={sleep.band} intensity={sleep.intensity} />}
          >
            <span className="xp-sleep-dot" style={heatStyle(sleep.intensity * sleep.band.weight)} aria-hidden="true" />
            {REGION_LABEL.sleep}
          </Tip>
          <div className="xp-scale" aria-hidden="true">
            <span>{t('band starts')}</span>
            <i />
            <span>{t('band ends, or a more serious symptom')}</span>
          </div>
          {shown && (
            <FloatingTip point={shown.point}>
              <span className="tip-title">{FIGURE_LABEL[shown.region]}</span>
              {bandsOf(shown.region).map((item) => (
                <BandTip key={item.band.id} band={item.band} intensity={item.intensity} />
              ))}
            </FloatingTip>
          )}
        </div>

        <ol className="xp-bands">
          {rows.map(({ band, intensity }) => {
            const region = figureRegion(band.region)
            return (
              <li
                key={band.id}
                className={intensity > 0 ? 'xp-band xp-band-on' : 'xp-band'}
                onMouseEnter={() => region && setHover({ region })}
                onMouseLeave={() => setHover(null)}
              >
                <span className="xp-band-dot" style={heatStyle(intensity * band.weight)} aria-hidden="true" />
                <div className="xp-band-text">
                  <div className="xp-band-top">
                    <span className="xp-band-region">{REGION_LABEL[band.region]}</span>
                    <span className="xp-band-range mono">{bandText(band)}</span>
                  </div>
                  <p className="xp-band-symptom">{BAND_SYMPTOM[band.id]}</p>
                  <div className="xp-band-bar" role="img" aria-label={bandState(band, intensity)}>
                    <i style={{ width: `${Math.round(intensity * 100)}%`, ...heatStyle(intensity * band.weight) }} />
                  </div>
                  <div className="xp-band-foot">
                    <span>{bandState(band, intensity)}</span>
                    <Cite source={band.source} own says={<BandTip band={band} />}>
                      {SOURCES[band.source].short}
                    </Cite>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
      <p className="xp-note">
        {t('The color shows how far the CO2 value is into each band. A more serious symptom gets a stronger color. The order of the strength is our choice. No sensor on a person is behind this map.')}
      </p>
    </section>
  )
}
