// The simulator page, for the presenter. It is made for a phone. Each control has an effect at
// once on every open helmet page. No page links here: type /simulator in the address bar.
import { useState } from 'react'
import { LangSwitch } from '../components/LangSwitch.tsx'
import { t } from '../i18n.ts'
import { HelmetControls, HelmetNow } from '../helmet/HelmetControls.tsx'
import { useHelmet, type SendHelmet } from '../helmet/useHelmet.ts'
import './simulator.css'

export function Simulator() {
  const { helmet, online, send } = useHelmet()
  const [error, setError] = useState<string | null>(null)

  if (!helmet) {
    return (
      <div className="sm sm-wait">
        <p className="muted">{online ? t('Loading the simulator…') : t('No connection to the server. The page tries again.')}</p>
      </div>
    )
  }
  const run: SendHelmet = (change) =>
    send(change).then(
      () => setError(null),
      (cause: Error) => setError(cause.message),
    )

  return (
    <div className="sm">
      <header className="sm-top">
        <div className="sm-top-row">
          <span className="sm-name">
            <span className="brand">Nexxo</span> <span className="muted">{t('Simulator')}</span>
          </span>
          <span className="mode mode-simulated">
            <span aria-hidden="true">▲</span> {t('Simulated')}
          </span>
        </div>
        <HelmetNow helmet={helmet} />
        {!online && <p className="sm-time">{t('no connection')}</p>}
        {error && <p role="alert" className="sm-error">{error}</p>}
      </header>
      <main className="sm-main">
        <HelmetControls helmet={helmet} run={run} />
        <LangSwitch className="sm-lang" />
      </main>
    </div>
  )
}
