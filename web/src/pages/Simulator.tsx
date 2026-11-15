// The simulator page, for the presenter. It is made for a phone. Each control has an effect at
// once on every open page. No page links here: type /simulator in the address bar.
// The page has two tabs: the controls of the CO2 page, and the controls of the trip page.
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { BANDS, CDRA_STATES, CREW_LIMITS, DEFAULT_PARAMS, LIMIT_1H_MMHG, PARAM_LIMITS, mmHgToPpm, type Cdra, type ModelParams } from '../../../shared/co2.ts'
import type { TripState } from '../../../shared/trip/types.ts'
import { Icon } from '../components/Icon.tsx'
import { Cite, ModeBadge, SourceLine, ThresholdTip } from '../components/parts.tsx'
import { Tip } from '../components/Tip.tsx'
import { fmt, t, tn } from '../i18n.ts'
import { SOURCE, useLive, type About, type Control, type Live } from '../live.ts'
import { CDRA_LABEL, PARAM_TEXT, WINDOW_LABEL } from '../texts.ts'
import { TripControls, TripMission, TripNow } from '../trip/TripControls.tsx'
import { formatDuration, formatTime, mmHgText, ppmText, viewOf, type View } from '../view.ts'
import './simulator.css'

// The range of the CO2 slider, in ppm. At 760 mmHg this is about 0.4 to 6.1 mmHg.
const SLIDER = { min: 500, max: 8000, step: 10 }
// The values of the quick buttons, in mmHg: the start of each band, the limit, and the end of the last band.
const QUICK = [...new Set([...BANDS.map((band) => band.from), LIMIT_1H_MMHG, 5.0])].sort((a, b) => a - b)
const BUMPS = [-250, -50, 50, 250]
const SEND_EACH_MS = 80

// The two tabs. The page takes the tab from the address (/simulator?tab=trip), or remembers the last one.
const TABS = ['co2', 'trip'] as const
type Tab = (typeof TABS)[number]
const TAB_KEY = 'nexxo-sim-tab'
const isTab = (value: string | null): value is Tab => TABS.some((tab) => tab === value)

function firstTab(): Tab {
  const fromAddress = new URLSearchParams(window.location.search).get('tab')
  if (isTab(fromAddress)) return fromAddress
  try {
    const stored = localStorage.getItem(TAB_KEY)
    if (isTab(stored)) return stored
  } catch {
    // The browser blocks storage. Start with the first tab.
  }
  return 'co2'
}

type Parts = { live: Live; view: View; run: Control }

export function Simulator() {
  const { live, online, control } = useLive()
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>(firstTab)
  // The value of the CO2 slider while a finger moves it. The page shows it before the server answers.
  const [localPpm, setLocalPpm] = useState<number | null>(null)
  // The same for the slider of the mission day.
  const [localDay, setLocalDay] = useState<number | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(TAB_KEY, tab)
    } catch {
      // The browser blocks storage, so the page cannot remember the tab.
    }
  }, [tab])
  const choose = (next: Tab) => {
    setTab(next)
    // Keep the tab in the address, so a reload or a shared link opens the same tab.
    const address = new URL(window.location.href)
    address.searchParams.set('tab', next)
    window.history.replaceState(window.history.state, '', address)
  }

  if (!live) {
    return (
      <div className="sm sm-wait">
        <p className="muted">{online ? t('Loading the simulator…') : t('No connection to the server. The page tries again.')}</p>
      </div>
    )
  }
  const run: Control = (change) =>
    control(change).then(
      () => setError(null),
      (cause: Error) => setError(cause.message),
    )
  const view = viewOf(live, localPpm ?? undefined)
  const { mode, playing, timeMs } = live.state
  const parts = { live, view, run }
  // The trip settings. A server from before the trip page sends no trip settings and no trip
  // speeds. The page then shows no trip controls, because that server refuses each of them.
  const tripSpeeds = (live.about as About & { tripSpeeds?: number[] }).tripSpeeds
  const trip = tripSpeeds ? (live as Live & { trip?: TripState }).trip : undefined

  return (
    <div className="sm">
      <header className="sm-top">
        <div className="sm-top-row">
          <span className="sm-name">
            <span className="brand">Nexxo</span> <span className="muted">{t('Simulator')}</span>
          </span>
          {tab === 'co2' ? (
            <ModeBadge mode={localPpm === null ? mode : 'simulated'} mission={live.about.source.mission} />
          ) : (
            trip && <TripMission trip={trip} />
          )}
        </div>
        {tab === 'co2' ? (
          <>
            <div className="sm-top-row">
              <span className="sm-now">
                <span className="display sm-now-digits">{fmt(view.now, 2)}</span> mmHg <span className="muted">· {ppmText(view.nowPpm)}</span>
              </span>
              <button type="button" className={playing ? 'sm-play' : 'sm-play btn-primary'} onClick={() => run({ playing: !playing })}>
                <Icon name={playing ? 'pause' : 'play'} size={18} /> {playing ? t('Pause') : t('Play')}
              </button>
            </div>
            <p className="sm-time">
              {mode === 'replay' ? t('{time} UTC', { time: formatTime(timeMs) }) : t('Simulated time: {time} UTC', { time: formatTime(timeMs) })}
              {!online && ` · ${t('no connection')}`}
            </p>
          </>
        ) : trip ? (
          <TripNow trip={trip} localDay={localDay} run={run} online={online} />
        ) : (
          <p className="sm-time">
            {t('The server has no trip settings yet')}
            {!online && ` · ${t('no connection')}`}
          </p>
        )}
        {error && <p role="alert" className="sm-error">{error}</p>}
      </header>

      <div className="sm-tabs" role="group" aria-label={t('The page that the simulator controls')}>
        <button type="button" aria-pressed={tab === 'co2'} onClick={() => choose('co2')}>
          {t('CO2 exposure')}
        </button>
        <button type="button" aria-pressed={tab === 'trip'} onClick={() => choose('trip')}>
          {t('Trip')}
        </button>
      </div>

      {tab === 'co2' ? (
        <main className="sm-main">
          <ModeSection {...parts} />
          <Co2Section {...parts} localPpm={localPpm} setLocalPpm={setLocalPpm} />
          <StationSection {...parts} />
          <ClockSection {...parts} />
          <ReadoutSection {...parts} />
          <SettingsSection {...parts} />
          <section className="sm-section sm-reset">
            <button type="button" onClick={() => run({ restart: true })}>
              <Icon name="restart" size={18} /> {t('Start again from the first state')}
            </button>
            <span className="muted small">{t('Real data replay, 7 days into the record, 6 persons, CDRA on both beds, the default settings.')}</span>
          </section>
        </main>
      ) : trip ? (
        <main className="sm-main">
          <TripControls trip={trip} run={run} speeds={tripSpeeds} localDay={localDay} setLocalDay={setLocalDay} />
        </main>
      ) : (
        <main className="sm-main">
          <section className="sm-section">
            <h2>{t('Trip')}</h2>
            <p className="muted">{t('The server has no trip settings yet')}</p>
            <p className="sm-hint">{t('The trip controls show here when the server sends the trip settings. Start the newest server, then load this page again.')}</p>
            <a className="btn" href="/trip">
              {t('Open the trip page')}
            </a>
          </section>
        </main>
      )}
    </div>
  )
}

// 1. The mode.
function ModeSection({ live, run }: Parts) {
  const { mode } = live.state
  const { mission } = live.about.source
  return (
    <section className="sm-section" aria-labelledby="sm-mode">
      <h2 id="sm-mode">{t('Mode')}</h2>
      <div className="sm-modes">
        <button type="button" className="sm-mode" aria-pressed={mode === 'replay'} onClick={() => run({ mode: 'replay' })}>
          <strong>{t('Real data replay')}</strong>
          <span>{t('The clock plays the real CO2 record of {mission}. Each value is a real sensor value.', { mission })}</span>
        </button>
        <button type="button" className="sm-mode sm-mode-sim" aria-pressed={mode === 'simulated'} onClick={() => run({ mode: 'simulated' })}>
          <strong>{t('Simulated')}</strong>
          <span>{t('You set the CO2 value. The clock then moves it with the cabin model.')}</span>
        </button>
      </div>
    </section>
  )
}

// 2. The cabin CO2: the slider, the steps, the quick values, and the hold.
function Co2Section({ live, view, run, localPpm, setLocalPpm }: Parts & { localPpm: number | null; setLocalPpm: (value: number | null) => void }) {
  const pressure = view.pressure
  const value = Math.round(view.nowPpm)
  const at = (ppm: number) => ((Math.min(SLIDER.max, Math.max(SLIDER.min, ppm)) - SLIDER.min) / (SLIDER.max - SLIDER.min)) * 100

  // While the slider moves, send the value at most each 80 ms. The last value always goes.
  const timer = useRef<number | undefined>(undefined)
  const waiting = useRef<number | null>(null)
  const send = (ppm: number) => {
    waiting.current = ppm
    if (timer.current !== undefined) return
    timer.current = window.setTimeout(() => {
      timer.current = undefined
      if (waiting.current !== null) void run({ ppm: waiting.current })
      waiting.current = null
    }, SEND_EACH_MS)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const move = (ppm: number) => {
    setLocalPpm(ppm)
    send(ppm)
  }
  // The finger left the slider: send the last value now, and show the value of the server again.
  const release = () => {
    if (localPpm === null) return
    window.clearTimeout(timer.current)
    timer.current = undefined
    waiting.current = null
    void run({ ppm: localPpm }).finally(() => setLocalPpm(null))
  }

  return (
    <section className="sm-section" aria-labelledby="sm-co2">
      <div className="sm-head">
        <h2 id="sm-co2">{t('Cabin CO2')}</h2>
        {live.state.mode === 'replay' && localPpm === null && <span className="muted small">{t('A change here starts simulated mode.')}</span>}
      </div>
      <div className="sm-co2-value">
        <span className="display sm-ppm">{fmt(value)}</span> <span className="sm-co2-unit">ppm</span>
        <span className="sm-co2-mmhg">
          = <strong>{mmHgText(view.now)}</strong>
        </span>
        <Cite
          source="eda"
          says={t('mmHg = ppm × total cabin pressure ÷ 1,000,000. The total pressure is {pressure} mmHg (see the settings below), so 1 mmHg is about {ppm} ppm.', {
            pressure: fmt(pressure),
            ppm: fmt(Math.round(1_000_000 / pressure)),
          })}
        />
      </div>
      <div className="sm-slider">
        <input
          type="range"
          min={SLIDER.min}
          max={SLIDER.max}
          step={SLIDER.step}
          value={Math.min(SLIDER.max, Math.max(SLIDER.min, value))}
          style={{ '--fill': `${at(value)}%` } as CSSProperties}
          aria-label={t('Cabin CO2 in ppm')}
          aria-valuetext={`${ppmText(value)}, ${mmHgText(view.now)}`}
          onChange={(event) => move(Number(event.target.value))}
          onPointerUp={release}
          onKeyUp={release}
          onBlur={release}
        />
        <div className="sm-marks" aria-hidden="true">
          {QUICK.map((mmHg) => (
            <i key={mmHg} className={mmHg === LIMIT_1H_MMHG ? 'sm-mark sm-mark-limit' : 'sm-mark'} style={{ left: `${at(mmHgToPpm(mmHg, pressure))}%` }} />
          ))}
        </div>
      </div>

      <span className="sm-label">{t('Step by ppm')}</span>
      <div className="sm-row sm-bumps">
        {BUMPS.map((bump) => (
          <button type="button" key={bump} onClick={() => run({ bump })} aria-label={bump > 0 ? t('Raise by {ppm} ppm', { ppm: bump }) : t('Lower by {ppm} ppm', { ppm: -bump })}>
            {bump > 0 ? '+' : '−'}
            {Math.abs(bump)}
          </button>
        ))}
      </div>

      <span className="sm-label">{t('Go to a value in mmHg. Each one starts or ends a symptom band.')}</span>
      <div className="sm-row sm-quick">
        {QUICK.map((mmHg) => (
          <span key={mmHg} className="sm-quick-item">
            <button type="button" className={mmHg === LIMIT_1H_MMHG ? 'sm-quick-limit' : ''} onClick={() => run({ ppm: Math.round(mmHgToPpm(mmHg, pressure)) })}>
              {fmt(mmHg, 1)}
            </button>
            {mmHg < 5 && (
              <Tip className="tip-icon" label={t('What starts at {value} mmHg', { value: fmt(mmHg, 1) })} tip={<ThresholdTip target={mmHg} />}>
                <Icon name="info" size={16} />
              </Tip>
            )}
          </span>
        ))}
      </div>

      <span className="sm-label">{t('As if the cabin had this value for the last')}</span>
      <div className="sm-row">
        {live.about.holdHours.map((hours) => (
          <button type="button" key={hours} onClick={() => run({ hold: hours })}>
            {hours < 24 ? tn(hours, '{count} hour', '{count} hours') : tn(hours / 24, '{count} day', '{count} days')}
          </button>
        ))}
      </div>
      <p className="sm-hint">{t('This fills the past values with the value now, so the averages of the dashboard move at once. Without it, an average moves only as the clock runs.')}</p>
    </section>
  )
}

// 3. The station: the crew count and the state of the CDRA. The cabin model uses them.
function StationSection({ live, view, run }: Parts) {
  const { crew, cdra, mode } = live.state
  const limit = view.toLimit
  const balance = view.model.balance
  return (
    <section className="sm-section" aria-labelledby="sm-station">
      <div className="sm-head">
        <h2 id="sm-station">{t('Crew and CO2 removal')}</h2>
        {mode === 'replay' && <span className="muted small">{t('In replay mode, these change the projection only.')}</span>}
      </div>
      <div className="sm-pair">
        <span className="sm-label">{t('Crew count')}</span>
        <div className="sm-stepper">
          <button type="button" aria-label={t('One person less')} disabled={crew <= CREW_LIMITS.min} onClick={() => run({ crew: crew - 1 })}>
            <Icon name="minus" />
          </button>
          <span className="display sm-crew" aria-live="polite">{crew}</span>
          <button type="button" aria-label={t('One person more')} disabled={crew >= CREW_LIMITS.max} onClick={() => run({ crew: crew + 1 })}>
            <Icon name="plus" />
          </button>
        </div>
      </div>
      <div className="sm-pair">
        <span className="sm-label">
          {t('CDRA status')}{' '}
          <Cite
            source="cdra2005"
            says={t('The CDRA is the Carbon Dioxide Removal Assembly. With both beds it removes the CO2 of 6 persons. On one bed it removes the CO2 of 3 persons. The removal rate rises with the CO2 pressure: at least 1.723 × ppCO2 − 0.38 kg each day, for 2.0 to 3.9 mmHg.')}
          />
        </span>
        <div className="segmented sm-cdra" role="group" aria-label={t('CDRA status')}>
          {CDRA_STATES.map((state: Cdra) => (
            <button type="button" key={state} aria-pressed={cdra === state} onClick={() => run({ cdra: state })}>
              {CDRA_LABEL[state]}
            </button>
          ))}
        </div>
      </div>
      <dl className="sm-facts">
        <div>
          <dt>{t('The model levels at')}</dt>
          <dd>{Number.isFinite(balance) ? mmHgText(balance) : t('no level')}</dd>
        </div>
        <div>
          <dt>{t('Change now')}</dt>
          <dd>{view.rate >= 0 ? t('+{rate} mmHg each hour', { rate: fmt(view.rate, 3) }) : t('−{rate} mmHg each hour', { rate: fmt(-view.rate, 3) })}</dd>
        </div>
        <div>
          <dt>{t('3.0 mmHg')}</dt>
          <dd>
            {limit.side === 'below'
              ? limit.hours === null
                ? t('not reached')
                : t('in {time}', { time: formatDuration(limit.hours) })
              : limit.hours
                ? t('above now, below in {time}', { time: formatDuration(limit.hours) })
                : t('above now')}
          </dd>
        </div>
      </dl>
    </section>
  )
}

// 4. The clock: play, speed, and the place in the real record.
function ClockSection({ live, run }: Parts) {
  const { about, state } = live
  const [seek, setSeek] = useState<number | null>(null)
  const place = state.step % about.steps
  const shown = seek ?? place
  const startMs = Date.parse(about.startTime)
  const speedText = (speed: number) =>
    speed < 1 ? t('5 min each 3 s') : speed === 1 ? t('5 min each second') : speed === 12 ? t('1 hour each second') : t('{hours} hours each second', { hours: speed / 12 })
  // The small chart of the record: the mean of each hour.
  const high = Math.max(...about.hourly)
  const low = Math.min(...about.hourly)
  const line = about.hourly.map((ppm, index) => `${((index / (about.hourly.length - 1)) * 100).toFixed(2)},${(34 - ((ppm - low) / (high - low)) * 30).toFixed(1)}`).join(' ')
  const limitY = 34 - ((mmHgToPpm(LIMIT_1H_MMHG, state.params.totalPressureMmHg) - low) / (high - low)) * 30

  return (
    <section className="sm-section" aria-labelledby="sm-clock">
      <h2 id="sm-clock">{t('Clock')}</h2>
      <div className="sm-row sm-clock-row">
        <button type="button" className={state.playing ? '' : 'btn-primary'} onClick={() => run({ playing: !state.playing })}>
          <Icon name={state.playing ? 'pause' : 'play'} size={18} /> {state.playing ? t('Pause') : t('Play')}
        </button>
        <label className="sm-speed">
          <span className="hide">{t('Speed')}</span>
          <select value={state.speed} onChange={(event) => run({ speed: Number(event.target.value) })}>
            {about.speeds.map((speed) => (
              <option key={speed} value={speed}>
                {speedText(speed)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <span className="sm-label">{t('Place in the real record of {mission}', { mission: about.source.mission })}</span>
      <div className="sm-record">
        <svg viewBox="0 0 100 38" preserveAspectRatio="none" aria-hidden="true">
          {limitY > 2 && limitY < 36 && <line x1="0" x2="100" y1={limitY} y2={limitY} className="sm-record-limit" />}
          <polyline points={line} className="sm-record-line" />
          <line x1={(shown / (about.steps - 1)) * 100} x2={(shown / (about.steps - 1)) * 100} y1="0" y2="38" className="sm-record-now" />
        </svg>
        <input
          type="range"
          min={0}
          max={about.steps - 1}
          step={12}
          value={shown}
          style={{ '--fill': `${(shown / (about.steps - 1)) * 100}%` } as CSSProperties}
          aria-label={t('Place in the real record')}
          aria-valuetext={formatTime(startMs + shown * 300_000)}
          onChange={(event) => setSeek(Number(event.target.value))}
          onPointerUp={() => seek !== null && void run({ seek }).finally(() => setSeek(null))}
          onKeyUp={() => seek !== null && void run({ seek }).finally(() => setSeek(null))}
          onBlur={() => seek !== null && void run({ seek }).finally(() => setSeek(null))}
        />
      </div>
      <p className="sm-hint">
        {t('{time} UTC', { time: formatTime(startMs + shown * 300_000) })}
        {state.mode === 'simulated' && seek === null ? ` · ${t('A move of this slider starts replay mode at that place.')}` : ''}
      </p>
      <p className="sm-hint">{t('The crew of the station went from 6 to 3 on 2 September 2017 and back to 6 on 13 September 2017. The record shows both changes.')}</p>
    </section>
  )
}

// 5. What the dashboard shows now, so the presenter needs no second screen.
function ReadoutSection({ view }: Parts) {
  const sourceText = view.nowSource === SOURCE.record ? t('real sensor value') : view.nowSource === SOURCE.model ? t('from the cabin model') : t('set by you')
  return (
    <section className="sm-section" aria-labelledby="sm-readout">
      <h2 id="sm-readout">{t('The dashboard shows')}</h2>
      <dl className="sm-facts">
        <div>
          <dt>{t('Value now')}</dt>
          <dd>
            {mmHgText(view.now)} · {sourceText}
          </dd>
        </div>
        {view.windows.map((window) => (
          <div key={window.id}>
            <dt>{WINDOW_LABEL[window.id]}</dt>
            <dd>{mmHgText(window.mmHg)}</dd>
          </div>
        ))}
        <div>
          <dt>{t('Headache odds')}</dt>
          <dd>{view.odds === null ? t('no estimate below 2 mmHg') : `×${fmt(view.odds, 2)}`}</dd>
        </div>
        <div>
          <dt>{t('Active symptom bands')}</dt>
          <dd>{view.bands.filter((item) => item.intensity > 0).length}</dd>
        </div>
      </dl>
      <p className="sm-hint">{t('The dashboard is the first page of this address. Open it on the screen for the audience.')}</p>
      <a className="btn" href="/">{t('Open the dashboard')}</a>
    </section>
  )
}

// 6. The settings of the model. Each one shows its source, or says that it is an assumption.
function SettingsSection({ live, run }: Parts) {
  const { params } = live.state
  const names = Object.keys(PARAM_TEXT) as (keyof ModelParams)[]
  const changed = names.some((name) => params[name] !== DEFAULT_PARAMS[name])
  return (
    <section className="sm-section">
      <details className="sm-details">
        <summary>
          <h2>{t('Settings of the model')}</h2>
          <span className="muted small">{t('The unit conversion and the cabin model. Each value shows its source.')}</span>
        </summary>
        <div className="sm-params">
          {names.map((name) => (
            <ParamField key={`${name}-${params[name]}`} name={name} value={params[name]} run={run} />
          ))}
        </div>
        <button type="button" disabled={!changed} onClick={() => run({ resetParams: true })}>
          {t('Back to the default settings')}
        </button>
      </details>
    </section>
  )
}

function ParamField({ name, value, run }: { name: keyof ModelParams; value: number; run: Control }) {
  const text = PARAM_TEXT[name]
  const limits = PARAM_LIMITS[name]
  const [draft, setDraft] = useState(String(value))
  const commit = () => {
    const next = Number(draft)
    if (draft.trim() === '' || !Number.isFinite(next) || next === value) return setDraft(String(value))
    void run({ params: { [name]: next } })
  }
  return (
    <label className="sm-param">
      <span className="sm-param-name">
        {text.label}
        {text.assumed && <span className="sm-assumed">{t('assumption')}</span>}
      </span>
      <span className="sm-param-input">
        <input
          type="number"
          inputMode="decimal"
          min={limits.min}
          max={limits.max}
          step={limits.step}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => event.key === 'Enter' && commit()}
        />
        {text.unit && <span className="muted">{text.unit}</span>}
        <Tip
          className="tip-icon"
          label={t('Where this value comes from')}
          tip={
            <>
              <span className="tip-part">
                {text.basis} {t('Default: {value}. Range: {min} to {max}.', { value: fmt(DEFAULT_PARAMS[name], text.decimals), min: fmt(limits.min, text.decimals), max: fmt(limits.max, text.decimals) })}
              </span>
              {text.source && <SourceLine id={text.source} />}
            </>
          }
        >
          <Icon name="info" size={18} />
        </Tip>
      </span>
    </label>
  )
}
