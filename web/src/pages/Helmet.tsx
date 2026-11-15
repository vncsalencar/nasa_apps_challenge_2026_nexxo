// The helmet page: a space suit helmet, with four CO2 sensors inside the
// helmet: at the forehead, in front of the mouth, near the neck, and behind the head. Each
// sensor has a light and a colored area on the helmet: green, yellow, or red, by its CO2
// value. A short alert tells where the CO2 rises. The tab "Helmet" of the simulator page sets
// the values and starts the routines.
//
// Two views: two still pictures of the helmet model, from the front and from the back (2D),
// and the model itself, which a person can turn (3D). The places of the sensors in the
// pictures come from the model, so both views show a sensor at the same place of the helmet.
// The sensors and their values are a simulation. No real suit data is behind them.
import { Suspense, lazy, useState, type CSSProperties } from 'react'
import { LEVELS, SENSORS, levelOf, risingSensors, sensorsAt, type HelmetState, type Level } from '../../../shared/helmet.ts'
import { LangSwitch } from '../components/LangSwitch.tsx'
import { fmt, t } from '../i18n.ts'
import { NoticeOverlay } from '../helmet/NoticeOverlay.tsx'
import { helmetAlert, useHelmet } from '../helmet/useHelmet.ts'
import './dashboard.css'
import './helmet.css'

// The 3D view loads only when a person selects it, because it brings a large 3D library and the model.
const Helmet3D = lazy(() => import('../helmet/Helmet3D.tsx'))
const VIEW_KEY = 'nexxo-helmet-3d'
function storedThreeD() {
  try {
    return localStorage.getItem(VIEW_KEY) === 'on'
  } catch {
    return false
  }
}

const SHAPE = { normal: '●', caution: '▲', alert: '■' } as const
const LEVEL_WORD: Record<Level, string> = { normal: t('normal'), caution: t('raised'), alert: t('high') }
// What the crew member can do for a sensor at each level. These steps are ideas of this app.
const LEVEL_STEP: Record<Level, string> = {
  normal: t('No action is necessary.'),
  caution: t('Check the air flow of the suit. Move the head away from this place of the helmet.'),
  alert: t('Risk of headache and of loss of focus. Start the micro air jet.'),
}
// To which side of its light the label of each sensor goes in a picture: 1 is right, -1 is left.
const LABEL_SIDE: Record<string, number> = { forehead: 1, mouth: -1, neck: 1, back: 1 }

type StillProps = { view: 'front' | 'back'; title: string; helmet: HelmetState; rising: string[]; selected: string | null; onSelect: (id: string) => void }

// One still picture of the helmet, with the area, the light, and the label of each sensor that this side shows.
function Still({ view, title, helmet, rising, selected, onSelect }: StillProps) {
  return (
    <figure className="hm-still">
      <div className="hm-still-box">
        <img className="hm-photo" src={`/models/helmet-${view}.webp`} alt="" draggable={false} />
        {SENSORS.map((sensor) => {
          const place = sensor[view]
          if (!place) return null
          const value = helmet.sensors[sensor.id].value
          const level = levelOf(value)
          const up = rising.includes(sensor.id)
          const on = selected === sensor.id
          return (
            <button
              type="button"
              key={sensor.id}
              className={`hm-node hm-text-${level} ${up ? 'hm-rising' : ''} ${on ? 'hm-on' : ''}`}
              style={{ left: `${place[0]}%`, top: `${place[1]}%`, '--side-x': LABEL_SIDE[sensor.id] ?? 1 } as CSSProperties}
              aria-pressed={on}
              aria-label={t('Sensor {name}: {value} mmHg, {level}', { name: t(sensor.label), value: fmt(value, 1), level: LEVEL_WORD[level] }) + (up ? `, ${t('rising')}` : '')}
              onClick={() => onSelect(sensor.id)}
            >
              <span className="hm-area" aria-hidden="true" />
              <span className="hm-node-dot" aria-hidden="true" />
              <span className="hm-node-line" aria-hidden="true" />
              <span className="hm-node-label">
                {fmt(value, 1)}
                {up ? ' ↑' : ''}
              </span>
            </button>
          )
        })}
      </div>
      <figcaption>{title}</figcaption>
    </figure>
  )
}

export default function Helmet() {
  const { helmet, online, send } = useHelmet()
  const [selected, setSelected] = useState<string | null>(null)
  // The pictures or the 3D model. The browser keeps the choice.
  const [threeD, setThreeD] = useState(storedThreeD)
  const choose = (on: boolean) => {
    setThreeD(on)
    try {
      localStorage.setItem(VIEW_KEY, on ? 'on' : 'off')
    } catch {
      // The choice then lasts until the page closes.
    }
  }
  const toggle = (id: string) => setSelected((current) => (current === id ? null : id))

  if (!helmet) {
    return (
      <div className="xp xp-wait">
        <span className="brand">Nexxo</span>
        <p className="muted">{online ? t('Loading the helmet sensors…') : t('No connection to the server. The page tries again.')}</p>
      </div>
    )
  }
  const alert = helmetAlert(helmet)
  const rising = risingSensors(helmet)

  return (
    <div className="xp hm">
      <header className="xp-top">
        <div className="xp-brand">
          <span className="brand">Nexxo</span>
          <h1 className="hide">{t('Helmet')}</h1>
        </div>
        <div className="xp-live">
          <span className="mode mode-simulated">
            <span aria-hidden="true">▲</span> {t('Simulated')}
          </span>
          {!online && <span className="xp-clock">{t('no connection')}</span>}
          <LangSwitch short />
        </div>
      </header>

      <NoticeOverlay helmet={helmet} onSeen={() => void send({ seen: true }).catch(() => undefined)} onJet={() => void send({ jet: true, seen: true }).catch(() => undefined)} />
      <main className="hm-main">
        {/* The helmet. On a wide screen it is at the left, and the information is at the right. */}
        <section className="hm-model" aria-label={t('Helmet')}>
          <div className="segmented hm-view" role="group" aria-label={t('View')}>
            <button type="button" aria-pressed={!threeD} onClick={() => choose(false)}>2D</button>
            <button type="button" aria-pressed={threeD} onClick={() => choose(true)}>3D</button>
          </div>
          {threeD ? (
            <Suspense fallback={<div className="hm-3d" />}>
              <Helmet3D helmet={helmet} rising={rising} selected={selected} onSelect={toggle} onFail={() => choose(false)} />
            </Suspense>
          ) : (
            <div className="hm-stills" role="group" aria-label={t('Space suit helmet with CO2 sensors, from the front and from the back')}>
              <Still view="front" title={t('Front')} helmet={helmet} rising={rising} selected={selected} onSelect={toggle} />
              <Still view="back" title={t('Back')} helmet={helmet} rising={rising} selected={selected} onSelect={toggle} />
            </div>
          )}
          <p className="hm-credit">
            {threeD && `${t('Drag the helmet to turn it.')} `}
            {t('Model: Smithsonian Institution, space suit of Neil Armstrong (Apollo 11)')}
          </p>
        </section>

        <section className="hm-info" aria-label={t('Sensors')}>
          {helmet.notice && (
            <div className={`hm-notice hm-notice-${helmet.notice.kind}`} role="alert">
              <strong>{helmet.notice.kind === 'jet' ? t('Advice: start a micro air jet') : t('Information')}</strong>
              <span>
                {t('CO2 passed {value} mmHg at these sensors: {names}.', { value: fmt(LEVELS.alert, 1), names: helmet.notice.sensors.map((id) => t(SENSORS.find((sensor) => sensor.id === id)?.label ?? id)).join(', ') })}{' '}
                {helmet.notice.kind === 'jet' ? t('Start a micro air jet, with a small flow, at these places to lower the CO2.') : t('A manual action can be necessary.')}
              </span>
            </div>
          )}
          <p className={`hm-banner hm-banner-${alert.level}`} role="status" aria-live="polite">
            <span aria-hidden="true">{SHAPE[alert.level]}</span> {alert.text}
          </p>

          {sensorsAt(helmet, 'alert').length > 0 && !(helmet.jet && !helmet.jet.done) && (
            <button type="button" className="btn-primary hm-jet" onClick={() => void send({ jet: true }).catch(() => undefined)}>
              {t('Start the micro air jet')}
              <span>{t('Lowers the CO2 at the red sensors')}</span>
            </button>
          )}

          <ul className="hm-list">
            {SENSORS.map((sensor) => {
              const value = helmet.sensors[sensor.id].value
              const level = levelOf(value)
              const up = rising.includes(sensor.id)
              const on = selected === sensor.id
              return (
                <li key={sensor.id}>
                  <button type="button" className={`hm-row ${on ? 'hm-row-on' : ''}`} aria-pressed={on} onClick={() => toggle(sensor.id)}>
                    <span className="hm-row-top">
                      <strong>{t(sensor.label)}</strong>
                      <span className={`hm-row-value hm-text-${level}`}>
                        {SHAPE[level]} {fmt(value, 1)} mmHg · {LEVEL_WORD[level]}
                        {up ? ` · ${t('rising')}` : ''}
                      </span>
                    </span>
                    <span className="hm-row-where">
                      {sensor.zone === 'front' ? t('Front zone') : t('Back zone')} · {t(sensor.where)}
                    </span>
                    {(on || level !== 'normal') && <span className="hm-row-step">{LEVEL_STEP[level]}</span>}
                  </button>
                </li>
              )
            })}
          </ul>

          <p className="hm-legend">
            <span className="hm-key hm-text-normal">● {t('below {value} mmHg', { value: fmt(LEVELS.caution, 1) })}</span>
            <span className="hm-key hm-text-caution">▲ {t('{from} to {to} mmHg', { from: fmt(LEVELS.caution, 1), to: fmt(LEVELS.alert, 1) })}</span>
            <span className="hm-key hm-text-alert">■ {t('above {value} mmHg', { value: fmt(LEVELS.alert, 1) })}</span>
          </p>
          <p className="hm-ref">{t('Clinical reference: NASA-STD-3001, OCHMO-TB-004 (limits for a cabin)')}</p>
        </section>
      </main>
    </div>
  )
}
