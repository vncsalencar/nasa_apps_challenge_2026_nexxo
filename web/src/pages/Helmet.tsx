// The helmet page: a drawing of a space suit helmet with CO2 sensors at some places. Each
// sensor has a light: green, yellow, or red, by its CO2 value. A short alert tells where the
// CO2 rises. The tab "Helmet" of the simulator page sets the values and starts the routines.
//
// The sensors and their values are a simulation. No real suit data is behind them.
import { LEVELS, SENSORS, levelOf, risingSensors } from '../../../shared/helmet.ts'
import { PageTabs } from '../components/PageTabs.tsx'
import { fmt, t } from '../i18n.ts'
import { helmetAlert, useHelmet } from '../helmet/useHelmet.ts'
import './dashboard.css'
import './helmet.css'

const SHAPE = { normal: '●', caution: '▲', alert: '■' } as const
const LEVEL_WORD = { normal: t('normal'), caution: t('raised'), alert: t('high') }

export default function Helmet() {
  const { helmet, online } = useHelmet()
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

        <svg className="hm-figure" viewBox="0 0 400 440" role="group" aria-label={t('Space suit helmet with CO2 sensors, front view')}>
          {/* The neck ring, the shell, and the visor. */}
          <rect className="hm-ring" x="92" y="366" width="216" height="52" rx="16" />
          <ellipse className="hm-shell" cx="200" cy="200" rx="170" ry="180" />
          <ellipse className="hm-visor" cx="200" cy="200" rx="118" ry="128" />
          <path className="hm-shine" d="M118 150a100 110 0 0 1 70-62" />
          {/* The head inside the visor, as a calm outline. */}
          <path className="hm-head" d="M200 108c-40 0-64 30-64 74 0 46 26 84 64 84s64-38 64-84c0-44-24-74-64-74ZM150 300c14 14 32 22 50 22s36-8 50-22" />

          {SENSORS.map((sensor) => {
            const value = helmet.sensors[sensor.id].value
            const level = levelOf(value)
            const up = rising.includes(sensor.id)
            return (
              <g key={sensor.id} className={`hm-sensor hm-${level} ${up ? 'hm-rising' : ''}`} role="img" aria-label={t('Sensor {name}: {value} mmHg, {level}', { name: t(sensor.label), value: fmt(value, 1), level: LEVEL_WORD[level] }) + (up ? `, ${t('rising')}` : '')}>
                <circle className="hm-glow" cx={sensor.x} cy={sensor.y} r="33" />
                <circle className="hm-light" cx={sensor.x} cy={sensor.y} r="22" />
                {/* The value is inside the light, so it does not cover the drawing. */}
                <text className="hm-value" x={sensor.x} y={sensor.y + 5.5} textAnchor="middle">
                  {fmt(value, 1)}
                </text>
                {up && (
                  <text className="hm-up" x={sensor.x + 27} y={sensor.y - 17} textAnchor="middle">
                    ↑
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        <p className="hm-legend">
          <span className="hm-key hm-normal">● {t('below {value} mmHg', { value: fmt(LEVELS.caution, 1) })}</span>
          <span className="hm-key hm-caution">▲ {t('{from} to {to} mmHg', { from: fmt(LEVELS.caution, 1), to: fmt(LEVELS.alert, 1) })}</span>
          <span className="hm-key hm-high">■ {t('above {value} mmHg', { value: fmt(LEVELS.alert, 1) })}</span>
        </p>
        <p className="hm-note">
          {t('The numbers are the CO2 partial pressure at each sensor, in mmHg. The sensors and their values are a simulation. The two color limits are those of a cabin (first reported symptoms at 2.3 mmHg, NASA limit of 3.0 mmHg for the 1-hour average), because we have no checked limit for the air inside a helmet.')}
        </p>
      </main>
    </div>
  )
}
