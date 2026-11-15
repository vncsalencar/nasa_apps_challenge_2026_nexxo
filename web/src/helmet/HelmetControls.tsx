// The helmet controls of the simulator page: the routines that raise some sensors step by
// step, and one slider for each sensor.
import { useRef, useState, type CSSProperties } from 'react'
import { LEVELS, RATES, ROUTINES, SENSORS, VALUE_LIMITS, levelOf, risingSensors, sensorsAt, type HelmetState } from '../../../shared/helmet.ts'
import { Icon } from '../components/Icon.tsx'
import { fmt, t } from '../i18n.ts'
import '../pages/helmet.css'
import { helmetAlert, type SendHelmet } from './useHelmet.ts'

const SHAPE = { normal: '●', caution: '▲', alert: '■' } as const
const SEND_EACH_MS = 80

// The line of the sticky bar: the short alert of the helmet page.
export function HelmetNow({ helmet }: { helmet: HelmetState }) {
  const alert = helmetAlert(helmet)
  return (
    <p className={`sm-time hc-sensor-value hm-${alert.level}`}>
      <span aria-hidden="true">{SHAPE[alert.level]}</span> {alert.text}
    </p>
  )
}

function SensorSlider({ id, label, helmet, run }: { id: string; label: string; helmet: HelmetState; run: SendHelmet }) {
  // The value while a finger moves the slider. The page shows it before the server answers.
  const [local, setLocal] = useState<number | null>(null)
  const last = useRef(0)
  const value = local ?? helmet.sensors[id].value
  const level = levelOf(value)
  const up = local === null && risingSensors(helmet).includes(id)
  const move = (next: number) => {
    setLocal(next)
    // Send the value at most each 80 ms while the slider moves.
    if (Date.now() - last.current < SEND_EACH_MS) return
    last.current = Date.now()
    void run({ set: { id, mmHg: next } })
  }
  const release = () => {
    if (local === null) return
    void run({ set: { id, mmHg: local } }).finally(() => setLocal(null))
  }
  const fill = ((value - VALUE_LIMITS.min) / (VALUE_LIMITS.max - VALUE_LIMITS.min)) * 100
  return (
    <label className="hc-sensor">
      <span className="hc-sensor-top">
        <span>{t(label)}</span>
        <span className={`hc-sensor-value hm-${level}`}>
          {SHAPE[level]} {fmt(value, 1)} mmHg{up ? ' ↑' : ''}
        </span>
      </span>
      <input
        type="range"
        min={VALUE_LIMITS.min}
        max={VALUE_LIMITS.max}
        step={0.1}
        value={value}
        style={{ '--fill': `${fill}%` } as CSSProperties}
        aria-valuetext={`${fmt(value, 1)} mmHg`}
        onChange={(event) => move(Number(event.target.value))}
        onPointerUp={release}
        onKeyUp={release}
        onBlur={release}
      />
    </label>
  )
}

// The alert to the crew: when a sensor is above the red limit, the presenter can send an alert
// to the helmet page. One kind only informs. The other kind advises a micro air jet.
function NoticeSection({ helmet, run }: { helmet: HelmetState; run: SendHelmet }) {
  const red = sensorsAt(helmet, 'alert')
  const kind = helmet.notice?.kind
  const limit = fmt(LEVELS.alert, 1)
  return (
    <section className={red.length ? 'sm-section hc-notice hc-notice-red' : 'sm-section hc-notice'} aria-labelledby="hc-notice">
      <h2 id="hc-notice">{t('Alert to the crew')}</h2>
      <p className="sm-hint" role="status">
        {red.length
          ? t('CO2 is above {value} mmHg at these sensors: {names}. A manual action can be advisable. You can send an alert to the helmet page.', {
              value: limit,
              names: red.map((id) => t(SENSORS.find((sensor) => sensor.id === id)?.label ?? id)).join(', '),
            })
          : t('No sensor is above {value} mmHg now. You can send an alert when a sensor is red.', { value: limit })}
      </p>
      <div className="hc-routines">
        <button type="button" className="hc-routine" disabled={!red.length} aria-pressed={kind === 'info'} onClick={() => run({ notice: 'info' })}>
          <strong>{t('Send for information only')}</strong>
          <span>{t('Tells the crew member that the value passed the limit, and that a manual action can be necessary.')}</span>
        </button>
        <button type="button" className="hc-routine" disabled={!red.length} aria-pressed={kind === 'jet'} onClick={() => run({ notice: 'jet' })}>
          <strong>{t('Send with the advice of a micro air jet')}</strong>
          <span>{t('Advises the crew member to start a micro air jet, with a small flow, at these sensors, to lower the CO2.')}</span>
        </button>
      </div>
      <div className="sm-row">
        <button type="button" disabled={!helmet.notice} onClick={() => run({ notice: null })}>
          {t('Remove the alert')}
        </button>
      </div>
      <p className="sm-hint">{t('The alert ends by itself when no sensor is above the limit.')}</p>
    </section>
  )
}

export function HelmetControls({ helmet, run }: { helmet: HelmetState; run: SendHelmet }) {
  const rateText = (rate: number) => t('{rate} mmHg each second', { rate: fmt(rate, 2) })
  return (
    <>
      <NoticeSection helmet={helmet} run={run} />
      <section className="sm-section" aria-labelledby="hc-routines">
        <h2 id="hc-routines">{t('Routines')}</h2>
        <p className="sm-hint">{t('A routine raises some sensors step by step. The helmet page then shows a short alert with the names of these sensors.')}</p>
        <div className="hc-routines">
          {ROUTINES.map((routine) => (
            <button type="button" key={routine.id} className="hc-routine" aria-pressed={helmet.routine === routine.id} onClick={() => run({ routine: routine.id })}>
              <strong>{t(routine.label)}</strong>
              <span>
                {t(routine.about)} {t('Target: {value} mmHg.', { value: fmt(routine.target, 1) })}
              </span>
            </button>
          ))}
        </div>
        <div className="sm-row">
          <button type="button" className="btn-primary" onClick={() => run({ clear: true })}>
            {t('Back to calm, step by step')}
          </button>
          <button type="button" onClick={() => run({ reset: true })}>
            <Icon name="restart" size={18} /> {t('All calm now')}
          </button>
        </div>
        <label className="sm-speed">
          <span className="sm-label">{t('How fast a value moves')}</span>
          <select value={helmet.rate} onChange={(event) => run({ rate: Number(event.target.value) })}>
            {RATES.map((rate) => (
              <option key={rate} value={rate}>
                {rateText(rate)}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="sm-section" aria-labelledby="hc-sensors">
        <h2 id="hc-sensors">{t('Sensors')}</h2>
        <p className="sm-hint">{t('Set the CO2 value of one sensor. The value stays until you change it or start a routine.')}</p>
        {SENSORS.map((sensor) => (
          <SensorSlider key={sensor.id} id={sensor.id} label={sensor.label} helmet={helmet} run={run} />
        ))}
        <a className="btn" href="/">{t('Open the helmet page')}</a>
      </section>
    </>
  )
}
