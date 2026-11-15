// The helmet page: an astronaut in a space suit helmet, with CO2 sensors at some places inside
// the helmet. Each sensor is a light: green, yellow, or red, by its CO2 value. A short alert
// tells where the CO2 rises. A person can select a sensor to read it. The tab "Helmet" of the
// simulator page sets the values and starts the routines.
//
// The sensors and their values are a simulation. No real suit data is behind them.
import { useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { LEVELS, SENSORS, levelOf, risingSensors, type Level } from '../../../shared/helmet.ts'
import { PageTabs } from '../components/PageTabs.tsx'
import { fmt, t } from '../i18n.ts'
import { helmetAlert, useHelmet } from '../helmet/useHelmet.ts'
import './dashboard.css'
import './helmet.css'

const SHAPE = { normal: '●', caution: '▲', alert: '■' } as const
const LEVEL_WORD: Record<Level, string> = { normal: t('normal'), caution: t('raised'), alert: t('high') }
// What the crew member can do for a sensor at each level. These steps are ideas of this app.
const LEVEL_STEP: Record<Level, string> = {
  normal: t('No action is necessary.'),
  caution: t('Check the air flow of the suit. Move the head away from this place of the helmet.'),
  alert: t('Raise the air flow of the suit now, lower the work load, and tell the crew. If the value stays high, end the work outside.'),
}

// The shape of the visor opening. The head and the reflections stay inside it.
const VISOR = 'M200 70C270 70 316 122 316 190C316 256 282 306 200 306C118 306 84 256 84 190C84 122 130 70 200 70Z'

export default function Helmet() {
  const { helmet, online } = useHelmet()
  const [selected, setSelected] = useState<string | null>(null)
  const figure = useRef<SVGSVGElement>(null)
  // Where the pointer is over the drawing, from -1 to 1. The head turns a little toward it.
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
    if (event.pointerType === 'touch' || !figure.current) return
    const box = figure.current.getBoundingClientRect()
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

        <svg
          ref={figure}
          className="hm-figure"
          viewBox="0 0 400 460"
          role="group"
          aria-label={t('Astronaut in a space suit helmet with CO2 sensors, front view')}
          style={{ '--look-x': look.x, '--look-y': look.y } as CSSProperties}
          onPointerMove={follow}
          onPointerLeave={() => setLook({ x: 0, y: 0 })}
        >
          <defs>
            <linearGradient id="hm-suit" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f4f1ea" />
              <stop offset="1" stopColor="#a9a498" />
            </linearGradient>
            <linearGradient id="hm-shell" x1="0.15" y1="0" x2="0.9" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.55" stopColor="#e3dfd6" />
              <stop offset="1" stopColor="#9d988d" />
            </linearGradient>
            <linearGradient id="hm-shade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f7f5ef" />
              <stop offset="1" stopColor="#c4bfb3" />
            </linearGradient>
            <radialGradient id="hm-glass" cx="0.38" cy="0.3" r="0.85">
              <stop offset="0" stopColor="#2c3a55" />
              <stop offset="0.6" stopColor="#111827" />
              <stop offset="1" stopColor="#05070c" />
            </radialGradient>
            <linearGradient id="hm-metal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f2f2f2" />
              <stop offset="0.5" stopColor="#8d9299" />
              <stop offset="1" stopColor="#d5d8dc" />
            </linearGradient>
            <linearGradient id="hm-glint" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.28" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <clipPath id="hm-clip">
              <path d={VISOR} />
            </clipPath>
          </defs>

          {/* The suit: the shoulders and the chest, which move a little with the breath. */}
          <g className="hm-breath">
            <path d="M14 460C18 402 68 372 128 362L272 362C332 372 382 402 386 460Z" fill="url(#hm-suit)" stroke="#7d786d" strokeWidth="2" />
            <path d="M92 460C96 420 118 396 150 388M308 460C304 420 282 396 250 388" fill="none" stroke="#8f8a7f" strokeWidth="2" />
            <rect x="170" y="404" width="60" height="40" rx="8" fill="#d8d3c8" stroke="#7d786d" strokeWidth="2" />
            <circle cx="186" cy="424" r="5" fill="#7ddba3" className="hm-led" />
            <circle cx="214" cy="424" r="5" fill="#5b6470" />
          </g>

          <g className="hm-helmet">
            {/* The neck ring. */}
            <ellipse cx="200" cy="358" rx="102" ry="24" fill="url(#hm-metal)" stroke="#5f646b" strokeWidth="2" />
            <ellipse cx="200" cy="353" rx="88" ry="16" fill="#3c4148" />
            <rect x="186" y="370" width="28" height="12" rx="3" fill="#c0392b" />

            {/* The shell of the helmet. */}
            <path d="M200 22C292 22 354 90 354 186C354 262 322 322 290 350L110 350C78 322 46 262 46 186C46 90 108 22 200 22Z" fill="url(#hm-shell)" stroke="#7d786d" strokeWidth="2.5" />

            {/* The glass of the visor, with the astronaut inside. */}
            <path d={VISOR} fill="url(#hm-glass)" />
            <g clipPath="url(#hm-clip)">
              <g className="hm-head">
                {/* The collar of the suit and the neck. */}
                <path d="M112 312C134 284 168 274 200 274C232 274 266 284 288 312Z" fill="#e9e4d8" />
                <rect x="178" y="246" width="44" height="40" rx="14" fill="#b98a66" />
                {/* The face. */}
                <ellipse cx="200" cy="196" rx="50" ry="62" fill="#dcae88" />
                <path d="M152 214C160 250 180 262 200 262C220 262 240 250 248 214" fill="#cf9f7a" opacity="0.6" />
                {/* The communications cap: white on top, dark over the ears, with a strap under the chin. */}
                <path d="M146 196C138 132 166 106 200 106C234 106 262 132 254 196C252 164 234 146 200 146C166 146 148 164 146 196Z" fill="#f3f0e8" stroke="#bdb8ad" strokeWidth="1.5" />
                <path d="M200 106L200 146" stroke="#bdb8ad" strokeWidth="1.5" />
                <ellipse cx="147" cy="206" rx="13" ry="23" fill="#39404b" />
                <ellipse cx="253" cy="206" rx="13" ry="23" fill="#39404b" />
                <path d="M150 226C158 268 242 268 250 226" fill="none" stroke="#f3f0e8" strokeWidth="6" strokeLinecap="round" />
                {/* The eyes, which blink, with brows, a nose, and a mouth. */}
                <path d="M171 180Q182 174 192 179M208 179Q218 174 229 180" fill="none" stroke="#6d4c36" strokeWidth="3" strokeLinecap="round" />
                <g className="hm-eyes">
                  <ellipse cx="182" cy="194" rx="6.5" ry="5.5" fill="#fbf7f0" />
                  <ellipse cx="218" cy="194" rx="6.5" ry="5.5" fill="#fbf7f0" />
                  <g className="hm-pupils">
                    <circle cx="182" cy="194" r="3.2" fill="#2b211c" />
                    <circle cx="218" cy="194" r="3.2" fill="#2b211c" />
                  </g>
                </g>
                <path d="M200 198C198 208 196 214 201 217" fill="none" stroke="#b07e5b" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M189 232Q200 238 211 232" fill="none" stroke="#8f4f3f" strokeWidth="3" strokeLinecap="round" />
                {/* The two microphones on their arms. */}
                <path d="M152 224C160 240 172 244 184 240M248 224C240 240 228 244 216 240" fill="none" stroke="#20242b" strokeWidth="3" strokeLinecap="round" />
                <rect x="181" y="236" width="9" height="7" rx="2" fill="#20242b" />
                <rect x="210" y="236" width="9" height="7" rx="2" fill="#20242b" />
              </g>
              {/* Reflections on the glass. They move against the head, and a glint passes now and then. */}
              <g className="hm-reflect">
                <path d="M108 168C114 122 142 94 176 84" fill="none" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="7" strokeLinecap="round" />
                <path d="M126 196C128 170 138 150 152 136" fill="none" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="4" strokeLinecap="round" />
                <path d="M286 244C282 262 272 278 258 288" fill="none" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="5" strokeLinecap="round" />
              </g>
              <rect className="hm-glint" x="-140" y="40" width="110" height="300" fill="url(#hm-glint)" transform="skewX(-18)" />
            </g>
            <path d={VISOR} fill="none" stroke="#4d4840" strokeWidth="4" />

            {/* The sun shade over the visor, the two pivot knobs, the lights, and the camera. */}
            <path d="M68 172C70 84 134 38 200 38C266 38 330 84 332 172C320 114 268 80 200 80C132 80 80 114 68 172Z" fill="url(#hm-shade)" stroke="#7d786d" strokeWidth="2" />
            <g>
              <circle cx="57" cy="198" r="20" fill="url(#hm-metal)" stroke="#5f646b" strokeWidth="2" />
              <circle cx="57" cy="198" r="8" fill="#3c4148" />
              <circle cx="343" cy="198" r="20" fill="url(#hm-metal)" stroke="#5f646b" strokeWidth="2" />
              <circle cx="343" cy="198" r="8" fill="#3c4148" />
            </g>
            <g>
              <rect x="170" y="4" width="60" height="28" rx="7" fill="#d8d3c8" stroke="#7d786d" strokeWidth="2" />
              <circle cx="200" cy="18" r="8" fill="#141922" stroke="#5f646b" strokeWidth="2" />
              <rect x="84" y="36" width="38" height="20" rx="6" fill="#d8d3c8" stroke="#7d786d" strokeWidth="2" transform="rotate(-38 103 46)" />
              <rect x="278" y="36" width="38" height="20" rx="6" fill="#d8d3c8" stroke="#7d786d" strokeWidth="2" transform="rotate(38 297 46)" />
              <circle cx="101" cy="48" r="6" fill="#fff3bf" className="hm-lamp" />
              <circle cx="299" cy="48" r="6" fill="#fff3bf" className="hm-lamp" />
            </g>

            {/* The CO2 sensors. */}
            {SENSORS.map((sensor) => {
              const value = helmet.sensors[sensor.id].value
              const level = levelOf(value)
              const up = rising.includes(sensor.id)
              const on = selected === sensor.id
              const name = t(sensor.label)
              const pick = () => setSelected((current) => (current === sensor.id ? null : sensor.id))
              return (
                <g
                  key={sensor.id}
                  className={`hm-sensor hm-${level} ${up ? 'hm-rising' : ''} ${on ? 'hm-on' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={on}
                  aria-label={t('Sensor {name}: {value} mmHg, {level}', { name, value: fmt(value, 1), level: LEVEL_WORD[level] }) + (up ? `, ${t('rising')}` : '')}
                  onClick={pick}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      pick()
                    }
                  }}
                >
                  <title>{name}</title>
                  {up && (
                    <g className="hm-puffs" aria-hidden="true">
                      <circle cx={sensor.x - 9} cy={sensor.y - 14} r="3.5" />
                      <circle cx={sensor.x + 2} cy={sensor.y - 18} r="2.8" />
                      <circle cx={sensor.x + 11} cy={sensor.y - 13} r="3.2" />
                    </g>
                  )}
                  <circle className="hm-glow" cx={sensor.x} cy={sensor.y} r="25" />
                  <circle className="hm-light" cx={sensor.x} cy={sensor.y} r="16" />
                  <text className="hm-value" x={sensor.x} y={sensor.y + 4.5} textAnchor="middle">
                    {fmt(value, 1)}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>

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
            <p className="hm-detail-step">{t('Select a sensor to read it.')}</p>
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
