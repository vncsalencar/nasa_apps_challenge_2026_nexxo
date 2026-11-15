// The full screen alert of the helmet page. The presenter sends it from the simulator page.
// It covers the page until the crew member answers "I saw it", or until the presenter removes it.
import { useEffect, useRef, type KeyboardEvent } from 'react'
import { LEVELS, SENSORS, type HelmetState } from '../../../shared/helmet.ts'
import { fmt, t } from '../i18n.ts'

export function NoticeOverlay({ helmet, onSeen, onJet }: { helmet: HelmetState; onSeen: () => void; onJet: () => void }) {
  const button = useRef<HTMLButtonElement>(null)
  const open = Boolean(helmet.notice?.full)
  // Put the keyboard focus on the answer when the alert opens.
  useEffect(() => {
    if (open) button.current?.focus({ preventScroll: true })
  }, [open])
  const notice = helmet.notice
  if (!notice?.full) return null

  const jet = notice.kind === 'jet'
  const sensors = notice.sensors.map((id) => ({ id, label: t(SENSORS.find((sensor) => sensor.id === id)?.label ?? id), value: helmet.sensors[id].value }))
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // The Tab key stays on the answers, because the page under the alert is hidden.
    if (event.key === 'Tab') {
      const buttons = [...event.currentTarget.querySelectorAll('button')]
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
      event.preventDefault()
      buttons[(index + (event.shiftKey ? buttons.length - 1 : 1)) % buttons.length]?.focus()
    }
    if (event.key === 'Escape') onSeen()
  }
  return (
    <div className={`hm-over hm-over-${notice.kind}`} role="alertdialog" aria-modal="true" aria-labelledby="hm-over-title" aria-describedby="hm-over-text" onKeyDown={onKeyDown}>
      <div className="hm-over-col">
        <p className="hm-over-kind">
          <span className="hm-over-mark" aria-hidden="true" />
          {jet ? t('Advice') : t('Information')}
        </p>
        <h2 id="hm-over-title" className="hm-over-title">
          {jet ? t('Start a micro air jet') : t('CO2 passed the limit')}
        </h2>
        <ul className="hm-over-values">
          {sensors.map((sensor) => (
            <li key={sensor.id}>
              <span className="hm-over-value">{fmt(sensor.value, 1)}</span>
              <span className="hm-over-unit">mmHg</span>
              <span className="hm-over-name">{sensor.label}</span>
            </li>
          ))}
        </ul>
        <p id="hm-over-text" className="hm-over-text">
          {t('CO2 passed {value} mmHg at these sensors: {names}.', { value: fmt(LEVELS.alert, 1), names: sensors.map((sensor) => sensor.label).join(', ') })}{' '}
          {jet ? t('Start a micro air jet, with a small flow, at these places to lower the CO2.') : t('A manual action can be necessary.')}
        </p>
        <div className="hm-over-answers">
          {jet && (
            <button type="button" ref={button} className="hm-over-seen" onClick={onJet}>
              {t('Start the micro air jet')}
            </button>
          )}
          <button type="button" ref={jet ? undefined : button} className={jet ? 'hm-over-seen hm-over-second' : 'hm-over-seen'} onClick={onSeen}>
            {t('I saw it')}
          </button>
        </div>
      </div>
    </div>
  )
}
