// The dashboard: one panel, "CO2 exposure". It shows the cabin CO2 now, where NASA documents
// report symptoms at this value (the body map), the headache risk from the averages, and the
// time until the model reaches the limit. The simulator page drives all of it.
import { Suspense, lazy, useState, type ReactNode } from 'react'
import { HEADACHE, LIMIT_1H_MMHG, relativeOdds } from '../../../shared/co2.ts'
import { BodyFigure } from '../components/BodyFigure.tsx'
import { HEAT_REGIONS, type FigurePoint, type HeatRegion } from '../components/heat.ts'
import { BandTip, Cite, LimitSays, ModeBadge, OddsSays, ThresholdTip } from '../components/parts.tsx'
import { FloatingTip, Tip } from '../components/Tip.tsx'
import { LANGS, fmt, lang, setLang, t, tn } from '../i18n.ts'
import { SOURCE, useLive, type Live } from '../live.ts'
import { BAND_REGIONS_OF, BAND_SYMPTOM, CDRA_LABEL, FIGURE_LABEL, REGION_LABEL, SOURCES, WINDOW_LABEL } from '../texts.ts'
import { bandState, bandText, formatDuration, formatTime, heatStyle, mmHgText, ppmText, viewOf, type Countdown, type View, type WindowView } from '../view.ts'
import './dashboard.css'

// The 3D figure and the chart load after the first paint, because they bring large libraries.
const BodyFigure3D = lazy(() => import('../components/BodyFigure3D.tsx'))
const Co2Chart = lazy(() => import('../components/Co2Chart.tsx'))

const FIGURE_KEY = 'nexxo-body-3d'
function storedThreeD() {
  try {
    return localStorage.getItem(FIGURE_KEY) === 'on'
  } catch {
    return false
  }
}

const SHAPE = { normal: '●', caution: '▲', alert: '■' } as const
type Status = keyof typeof SHAPE

export function Dashboard() {
  const { live, online } = useLive()
  if (!live) {
    return (
      <div className="xp xp-wait">
        <span className="brand">Nexxo</span>
        <p className="muted">{online ? t('Loading the cabin data…') : t('No connection to the server. The page tries again.')}</p>
      </div>
    )
  }
  const view = viewOf(live)
  const { mode, timeMs } = live.state
  const mission = live.about.source.mission

  return (
    <div className="xp">
      <header className="xp-top">
        <div className="xp-brand">
          <span className="brand">Nexxo</span>
          <h1 className="xp-title">{t('CO2 exposure')}</h1>
        </div>
        <div className="xp-live">
          <ModeBadge mode={mode} mission={mission} />
          <span className="xp-clock">
            {mode === 'replay' ? t('{time} UTC', { time: formatTime(timeMs) }) : t('Simulated time: {time} UTC', { time: formatTime(timeMs) })}
            {!live.state.playing && ` · ${t('paused')}`}
            {!online && ` · ${t('no connection')}`}
          </span>
        </div>
      </header>

      <main className="xp-grid">
        <Now live={live} view={view} />
        <BodyMap view={view} />
        <Risk view={view} />
        <TimeToLimit live={live} view={view} />
      </main>

      <footer className="xp-foot">
        <p>{live.about.source.credit}</p>
        <p>
          {t('The record is the cabin CO2 of the International Space Station during the mission {mission}, one value each 5 minutes, from the transfer of the animals to the station until the undock.', { mission })}{' '}
          {live.about.yearShift !== 0 && t('The source dates this telemetry in 2018. The mission flew in 2017, so the app shows the dates one year earlier.')}
        </p>
        <p>{t('This panel is a prototype for a hackathon. It is not a medical device.')}</p>
        <div className="segmented xp-lang" role="group" aria-label={t('Language')}>
          {LANGS.map((item) => (
            <button type="button" key={item.id} aria-pressed={lang === item.id} onClick={() => setLang(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      </footer>
    </div>
  )
}

// 1. The value now.
function Now({ live, view }: { live: Live; view: View }) {
  const hour = view.windows[0]
  const active = view.bands.filter((item) => item.intensity > 0)
  const regions = [...new Set(active.map((item) => REGION_LABEL[item.band.region]))]
  const status: Status = view.overLimit ? 'alert' : active.length ? 'caution' : 'normal'
  const headline = view.overLimit
    ? t('The 1-hour average is above the NASA limit.')
    : active.length
      ? tn(regions.length, 'In the range of reported symptoms: {regions}.', 'In the range of reported symptoms: {regions}.', { regions: regions.join(', ') })
      : t('Below each symptom band that NASA reports.')
  const sourceText =
    view.nowSource === SOURCE.record
      ? t('Real sensor value from the {mission} record', { mission: live.about.source.mission })
      : view.nowSource === SOURCE.model
        ? t('Simulated value from the cabin model')
        : t('Simulated value that the presenter set')

  return (
    <section className="card xp-now" aria-label={t('Cabin CO2 now')}>
      <div className="xp-now-head">
        <span className="label">{t('Cabin CO2 now')}</span>
        <span className={view.nowSource === SOURCE.record ? 'xp-tag' : 'xp-tag xp-tag-sim'}>{sourceText}</span>
      </div>
      <div className="xp-number">
        <span className="xp-digits display">{fmt(view.now, 2)}</span>
        <span className="xp-unit">mmHg</span>
      </div>
      <p className="xp-also">
        <Cite
          source="eda"
          says={t('The record gives CO2 in ppm. The NASA limits use the partial pressure: mmHg = ppm × total cabin pressure ÷ 1,000,000. The total pressure here is {pressure} mmHg, so 1 mmHg is about {ppm} ppm.', {
            pressure: fmt(view.pressure),
            ppm: fmt(Math.round(1_000_000 / view.pressure)),
          })}
        >
          {ppmText(view.nowPpm)}
        </Cite>
        {view.lastHour !== null && (
          <span className="muted">
            {' · '}
            {view.lastHour >= 0 ? t('+{change} mmHg in the last hour', { change: fmt(view.lastHour, 2) }) : t('−{change} mmHg in the last hour', { change: fmt(-view.lastHour, 2) })}
          </span>
        )}
      </p>
      <p className={`xp-state status-${status}`}>
        <span aria-hidden="true">{SHAPE[status]}</span> {headline}
      </p>
      <div className="xp-limit">
        <div className="xp-limit-text">
          <span>
            {WINDOW_LABEL.hour}: <strong>{mmHgText(hour.mmHg)}</strong>
          </span>
          <Cite source="std3001" own says={<LimitSays />}>
            {t('limit 3.0 mmHg')}
          </Cite>
        </div>
        <Meter value={hour.mmHg} reference={LIMIT_1H_MMHG} status={view.overLimit ? 'alert' : 'normal'} label={t('{value} of the limit of 3.0 mmHg', { value: mmHgText(hour.mmHg) })} />
      </div>
    </section>
  )
}

// A thin bar from 1 to 5 mmHg with a mark at the reference of this window and a dot at the value.
const METER = { low: 1, high: 5 }
function Meter({ value, reference, status, label }: { value: number; reference: number; status: Status | 'none'; label: string }) {
  const at = (x: number) => `${Math.min(100, Math.max(0, ((x - METER.low) / (METER.high - METER.low)) * 100))}%`
  return (
    <div className="meter" role="img" aria-label={label}>
      <span className="meter-track" />
      <span className="meter-ok" style={{ width: at(reference) }} />
      <span className="meter-mark" style={{ left: at(reference) }} />
      <span className={`meter-dot meter-${status}`} style={{ left: at(value) }} />
    </div>
  )
}

// 2. The body map: where NASA documents report symptoms at the CO2 value now.
function BodyMap({ view }: { view: View }) {
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

// 3. The headache risk from the three averages. Each average has its own reference.
function Risk({ view }: { view: View }) {
  const [hour, day, week] = view.windows
  const oddsText = (odds: number) => `×${fmt(odds, 2)}`
  // The scale of the gauge: the 7-day average from 2 to 4.5 mmHg. Each +1 mmHg doubles the odds.
  const GAUGE = { low: HEADACHE.studyFloorMmHg, high: 4.5 }
  const at = (mmHg: number) => `${Math.min(100, Math.max(0, ((mmHg - GAUGE.low) / (GAUGE.high - GAUGE.low)) * 100))}%`
  const weekStatus: Status = week.mmHg < HEADACHE.referenceMmHg ? 'normal' : 'caution'

  const row = (window: WindowView, status: Status | 'none', reference: number, text: string, cite: ReactNode) => (
    <li className="xp-window">
      <div className="xp-window-top">
        <span className="xp-window-name">{WINDOW_LABEL[window.id]}</span>
        <span className="xp-window-value display">
          {fmt(window.mmHg, 2)} <small>mmHg</small>
        </span>
      </div>
      <Meter value={window.mmHg} reference={reference} status={status} label={`${WINDOW_LABEL[window.id]}: ${mmHgText(window.mmHg)}. ${text}`} />
      <div className="xp-window-foot">
        <span className={status === 'none' ? '' : `status-${status}`}>
          {status !== 'none' && <span aria-hidden="true">{SHAPE[status]} </span>}
          {text}
        </span>
        {cite}
      </div>
      {!window.complete && <p className="xp-partial">{t('Only {time} of data yet for this average.', { time: formatDuration(window.hoursOfData) })}</p>}
    </li>
  )
  const oddsOf = (window: WindowView) =>
    window.mmHg >= HEADACHE.studyFloorMmHg ? t('Headache odds {odds} of the odds at 2.5 mmHg', { odds: oddsText(relativeOdds(window.mmHg)) }) : t('Below 2 mmHg: too few data for an estimate')

  return (
    <section className="card xp-risk" aria-label={t('Headache risk')}>
      <div className="xp-card-head">
        <h2 className="xp-h2">{t('Headache risk')}</h2>
        <Cite source="law2014" own says={<OddsSays />} />
      </div>

      <div className="xp-odds">
        <div className="xp-odds-number">
          <span className="xp-odds-digits display">{view.odds === null ? '–' : oddsText(view.odds)}</span>
          <span className="xp-odds-what">
            {view.odds === null
              ? t('No estimate: the 7-day average is below 2 mmHg, where the station data is thin.')
              : t('the odds of a headache, compared with the odds at a 7-day average of 2.5 mmHg')}
          </span>
        </div>
        <div className="gauge" role="img" aria-label={view.odds === null ? t('No estimate') : t('Relative odds {odds}', { odds: oddsText(view.odds) })}>
          <div className="gauge-bar">
            <span className="gauge-mark" style={{ left: at(HEADACHE.referenceMmHg) }} />
            <span className={`gauge-dot meter-${view.odds === null ? 'none' : weekStatus}`} style={{ left: at(week.mmHg) }} />
          </div>
          <div className="gauge-ticks" aria-hidden="true">
            {[2, 2.5, 3.5, 4.5].map((mmHg) => (
              <span key={mmHg} style={{ left: at(mmHg) }}>
                ×{fmt(relativeOdds(mmHg), mmHg === 2 ? 1 : 0)}
              </span>
            ))}
          </div>
        </div>
        {/* The task of the hackathon team fixes this label text. */}
        <p className="xp-estimate">{t('population-level estimate, not a diagnosis')}</p>
      </div>

      <ul className="xp-windows">
        {row(
          hour,
          hour.mmHg > LIMIT_1H_MMHG ? 'alert' : 'normal',
          LIMIT_1H_MMHG,
          hour.mmHg > LIMIT_1H_MMHG ? t('Above the NASA limit of 3.0 mmHg') : t('{percent}% of the NASA limit of 3.0 mmHg', { percent: Math.round((hour.mmHg / LIMIT_1H_MMHG) * 100) }),
          <Cite source="std3001" own says={<LimitSays />}>
            {SOURCES.std3001.short}
          </Cite>,
        )}
        {row(
          day,
          'none',
          HEADACHE.referenceMmHg,
          oddsOf(day),
          <Cite source="law2014" own says={<OddsSays />}>
            {SOURCES.law2014.short}
          </Cite>,
        )}
        {row(
          week,
          weekStatus,
          HEADACHE.referenceMmHg,
          week.mmHg < HEADACHE.referenceMmHg ? t('Below 2.5 mmHg: headache risk under 1%') : t('At or above 2.5 mmHg: headache risk of 1% or more'),
          <Cite
            source="ochmo"
            says={
              <>
                <strong>{t('To keep the risk of a headache below 1%, the 7-day average must stay below 2.5 mmHg.')}</strong>
                <br />
                {t('The brief takes this number from the study of Law and others, 2014.')}
              </>
            }
          >
            {SOURCES.ochmo.short}
          </Cite>,
        )}
      </ul>
      <p className="xp-note">{t('The mark on each bar is the reference of that average. A 1-hour value is never compared with the 7-day reference.')}</p>
    </section>
  )
}

// What the model says for one value of the countdown.
function crossing(item: Countdown): { text: string; tone: 'soon' | 'never' | 'above' } {
  if (item.side === 'below') return item.hours === null ? { text: t('not reached'), tone: 'never' } : { text: t('in {time}', { time: formatDuration(item.hours) }), tone: 'soon' }
  if (item.hours === null || item.hours === 0) return { text: t('above now'), tone: 'above' }
  return { text: t('above now, below in {time}', { time: formatDuration(item.hours) }), tone: 'above' }
}

// 4. The time until the model reaches the limit and each symptom band.
function TimeToLimit({ live, view }: { live: Live; view: View }) {
  const { crew, cdra, mode } = live.state
  const limit = view.toLimit
  const balance = view.model.balance
  const levels = Number.isFinite(balance) ? t('The model levels at {value}.', { value: mmHgText(balance) }) : t('Nothing removes CO2, so the value rises without an end.')
  let big: string
  let what: string
  let status: Status
  // A time is short, so it gets the large letters. A sentence gets smaller letters.
  let isTime = true
  if (limit.side === 'below' && limit.hours !== null) {
    big = formatDuration(limit.hours)
    what = t('until the model reaches 3.0 mmHg')
    status = limit.hours <= 6 ? 'alert' : 'caution'
  } else if (limit.side === 'below') {
    big = t('Not reached')
    what = t('The model stays below 3.0 mmHg.') + ' ' + levels
    status = 'normal'
    isTime = false
  } else if (limit.hours !== null && limit.hours > 0) {
    big = formatDuration(limit.hours)
    what = t('until the model falls below 3.0 mmHg. The value is above it now.')
    status = 'alert'
  } else {
    big = t('Above 3.0 mmHg')
    what = t('The model stays above 3.0 mmHg.') + ' ' + levels
    status = 'alert'
    isTime = false
  }

  return (
    <section className="card xp-time" aria-label={t('Time to limit')}>
      <div className="xp-card-head">
        <h2 className="xp-h2">{t('Time to limit')}</h2>
        <span className="xp-inputs">
          {tn(crew, '{count} person', '{count} persons')} · CDRA: {CDRA_LABEL[cdra].toLowerCase()}
          <Cite
            source="cdra2005"
            says={
              <>
                <strong>{t('How the model works')}</strong>
                <br />
                {t('Change of the CO2 = (CO2 that the crew makes − CO2 that the station removes) ÷ free volume of the cabin. One person makes 1.04 kg of CO2 each day. The CDRA removes at least 1.723 × ppCO2 − 0.38 kg each day on both beds, and half of that on one bed. The simulator page shows each setting and its source.')}
              </>
            }
          />
        </span>
      </div>

      <div className="xp-time-main">
        <div className="xp-count">
          <span className={`xp-count-digits display status-${status} ${isTime ? '' : 'xp-count-words'}`}>{big}</span>
          <span className="xp-count-what">{what}</span>
          <span className="xp-count-rate muted">
            {view.rate >= 0 ? t('Now: +{rate} mmHg each hour', { rate: fmt(view.rate, 3) }) : t('Now: −{rate} mmHg each hour', { rate: fmt(-view.rate, 3) })}
            {Number.isFinite(balance) && ` · ${t('balance at {value}', { value: mmHgText(balance) })}`}
          </span>
          <ul className="xp-crossings">
            {view.countdowns.map((item) => {
              const cross = crossing(item)
              return (
                <li key={item.target} className={`xp-cross xp-cross-${cross.tone}`}>
                  <Tip className="tip-line" tip={<ThresholdTip target={item.target} />}>
                    <span className="mono">{fmt(item.target, 1)} mmHg</span>
                  </Tip>
                  <span className="xp-cross-when">{cross.text}</span>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="xp-chart">
          <Suspense fallback={<div className="chart-plot" />}>
            <Co2Chart points={view.chart} pressure={view.pressure} bandStarts={view.countdowns.map((item) => item.target)} />
          </Suspense>
        </div>
      </div>
      {/* The task of the hackathon team fixes the first sentence of this label. */}
      <p className="xp-note">
        {t('Well-mixed model: real local exposure near the face can be higher (microgravity pockets).')}{' '}
        {mode === 'replay'
          ? t('The projection starts at the real value now. It uses the crew count and the CDRA state of the simulator, not the real state of the station on that day.')
          : t('In simulated mode, the clock moves the CO2 value along this projection.')}
      </p>
    </section>
  )
}
