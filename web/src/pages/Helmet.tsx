// The helmet page: an astronaut in a space suit helmet, with CO2 sensors at some places around
// the helmet. Each sensor is a light: green, yellow, or red, by its CO2 value. A short alert
// tells where the CO2 rises. A person can select a sensor to read it. The tab "Helmet" of the
// simulator page sets the values and starts the routines.
//
// Two views: a still picture of the NASA suit model (2D), and the model itself, which a person
// can turn (3D). The sensors and their values are a simulation. No real suit data is behind them.
import { Suspense, lazy, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { LEVELS, SENSORS, levelOf, risingSensors, type Level } from '../../../shared/helmet.ts'
import { PageTabs } from '../components/PageTabs.tsx'
import { fmt, t } from '../i18n.ts'
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
  alert: t('Raise the air flow of the suit now, lower the work load, and tell the crew. If the value stays high, end the work outside.'),
}
// To which side of its light the label of each sensor goes: [x, y] from -1 to 1.
const LABEL_SIDE: Record<string, [number, number]> = { top: [0, -1], 'top-left': [-0.8, -0.6], 'top-right': [0.8, -0.6], left: [-1, 0], right: [1, 0], mouth: [0.86, 0.5], neck: [-0.86, 0.5] }

export default function Helmet() {
  const { helmet, online } = useHelmet()
  const [selected, setSelected] = useState<string | null>(null)
  // The picture or the 3D model. The browser keeps the choice.
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
  const stage = useRef<HTMLDivElement>(null)
  // Where the pointer is over the picture, from -1 to 1. The picture tilts a little toward it.
  const [look, setLook] = useState({ x: 0, y: 0 })

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
  const follow = (event: PointerEvent) => {
    if (event.pointerType === 'touch' || !stage.current) return
    const box = stage.current.getBoundingClientRect()
    const clamp = (value: number) => Math.max(-1, Math.min(1, value))
    setLook({ x: clamp(((event.clientX - box.left) / box.width) * 2 - 1), y: clamp(((event.clientY - box.top) / box.height) * 2 - 1) })
  }
  const chosen = SENSORS.find((sensor) => sensor.id === selected) ?? null
  const chosenValue = chosen ? helmet.sensors[chosen.id].value : 0
  const chosenLevel = levelOf(chosenValue)

  return (
    <div className="xp hm">
      <header className="xp-top">
        <div className="xp-brand">
          <span className="brand">Nexxo</span>
          <h1 className="hide">{t('Helmet')}</h1>
          <PageTabs />
        </div>
        <div className="xp-live">
          <span className="mode mode-simulated">
            <span aria-hidden="true">▲</span> {t('Simulated')}
          </span>
          {!online && <span className="xp-clock">{t('no connection')}</span>}
        </div>
      </header>

      <main className="hm-main">
        <p className={`hm-banner hm-banner-${alert.level}`} role="status" aria-live="polite">
          <span aria-hidden="true">{SHAPE[alert.level]}</span> {alert.text}
        </p>

        <div className="segmented hm-view" role="group" aria-label={t('View')}>
          <button type="button" aria-pressed={!threeD} onClick={() => choose(false)}>2D</button>
          <button type="button" aria-pressed={threeD} onClick={() => choose(true)}>3D</button>
        </div>

        {threeD ? (
          <Suspense fallback={<div className="hm-3d" />}>
            <Helmet3D helmet={helmet} rising={rising} selected={selected} onSelect={toggle} onFail={() => choose(false)} />
          </Suspense>
        ) : (
          <div
            ref={stage}
            className="hm-stage"
            role="group"
            aria-label={t('Astronaut in a space suit helmet with CO2 sensors, front view')}
            style={{ '--look-x': look.x, '--look-y': look.y } as CSSProperties}
            onPointerMove={follow}
            onPointerLeave={() => setLook({ x: 0, y: 0 })}
          >
            <div className="hm-tilt">
              <img className="hm-photo" src="/models/astronaut-front.webp" alt="" draggable={false} />
              <span className="hm-sweep" aria-hidden="true" />
              {SENSORS.map((sensor) => {
                const value = helmet.sensors[sensor.id].value
                const level = levelOf(value)
                const up = rising.includes(sensor.id)
                const on = selected === sensor.id
                const [sideX, sideY] = LABEL_SIDE[sensor.id] ?? [0, -1]
                return (
                  <button
                    type="button"
                    key={sensor.id}
                    className={`hm-node hm-text-${level} ${up ? 'hm-rising' : ''} ${on ? 'hm-on' : ''}`}
                    style={{ left: `${sensor.x}%`, top: `${sensor.y}%`, '--side-x': sideX, '--side-y': sideY } as CSSProperties}
                    aria-pressed={on}
                    aria-label={t('Sensor {name}: {value} mmHg, {level}', { name: t(sensor.label), value: fmt(value, 1), level: LEVEL_WORD[level] }) + (up ? `, ${t('rising')}` : '')}
                    onClick={() => toggle(sensor.id)}
                  >
                    <span className="hm-node-glow" aria-hidden="true" />
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
            <p className="hm-3d-credit">{t('Model: NASA 3D Resources, Extravehicular Mobility Unit')}</p>
          </div>
        )}

        <div className="hm-detail" aria-live="polite">
          {chosen ? (
            <>
              <p className="hm-detail-top">
                <strong>{t('Sensor: {name}', { name: t(chosen.label) })}</strong>
                <span className={`hm-detail-value hm-text-${chosenLevel}`}>
                  {SHAPE[chosenLevel]} {fmt(chosenValue, 1)} mmHg · {LEVEL_WORD[chosenLevel]}
                  {rising.includes(chosen.id) ? ` · ${t('rising')}` : ''}
                </span>
              </p>
              <p className="hm-detail-step">{LEVEL_STEP[chosenLevel]}</p>
            </>
          ) : (
            <p className="hm-detail-step">{threeD ? t('Select a sensor to read it. Drag the astronaut to turn it.') : t('Select a sensor to read it.')}</p>
          )}
        </div>

        <p className="hm-legend">
          <span className="hm-key hm-text-normal">● {t('below {value} mmHg', { value: fmt(LEVELS.caution, 1) })}</span>
          <span className="hm-key hm-text-caution">▲ {t('{from} to {to} mmHg', { from: fmt(LEVELS.caution, 1), to: fmt(LEVELS.alert, 1) })}</span>
          <span className="hm-key hm-text-alert">■ {t('above {value} mmHg', { value: fmt(LEVELS.alert, 1) })}</span>
        </p>
        <p className="hm-note">
          {t('The numbers are the CO2 partial pressure at each sensor, in mmHg. The sensors and their values are a simulation. The two color limits are those of a cabin (first reported symptoms at 2.3 mmHg, NASA limit of 3.0 mmHg for the 1-hour average), because we have no checked limit for the air inside a helmet.')}
        </p>
      </main>
    </div>
  )
}
