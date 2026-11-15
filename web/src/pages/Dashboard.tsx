// The dashboard: one panel, "CO2 exposure". It shows the cabin CO2 now, where NASA documents
// report symptoms at this value (the body map), the headache risk from the averages, and the
// time until the model reaches the limit. The simulator page drives all of it.
// The four cards are in components/co2/, so the trip page can show the same cards for its own CO2 forecast.
import { BodyMapCard } from '../components/co2/BodyMapCard.tsx'
import { NowCard } from '../components/co2/NowCard.tsx'
import { RiskCard } from '../components/co2/RiskCard.tsx'
import { TimeCard } from '../components/co2/TimeCard.tsx'
import { PageTabs } from '../components/PageTabs.tsx'
import { Cite, ModeBadge, SourceLine } from '../components/parts.tsx'
import { LANGS, fmt, lang, setLang, t, tn } from '../i18n.ts'
import { SOURCE, useLive } from '../live.ts'
import { CDRA_LABEL } from '../texts.ts'
import { formatTime, viewOf } from '../view.ts'
import './dashboard.css'

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
  const { mode, timeMs, crew, cdra } = live.state
  const mission = live.about.source.mission
  const sourceText =
    view.nowSource === SOURCE.record
      ? t('Real sensor value from the {mission} record', { mission })
      : view.nowSource === SOURCE.model
        ? t('Simulated value from the cabin model')
        : t('Simulated value that the presenter set')

  return (
    <div className="xp">
      <header className="xp-top">
        <div className="xp-brand">
          <span className="brand">Nexxo</span>
          {/* The link of the open page shows the name of the page, so the heading is for a screen reader only. */}
          <h1 className="hide">{t('CO2 exposure')}</h1>
          <PageTabs />
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
        <NowCard
          view={view}
          sourceText={sourceText}
          ppmTip={
            <>
              <span className="tip-part">
                {t('The record gives CO2 in ppm. The NASA limits use the partial pressure: mmHg = ppm × total cabin pressure ÷ 1,000,000. The total pressure here is {pressure} mmHg, so 1 mmHg is about {ppm} ppm.', {
                  pressure: fmt(view.pressure),
                  ppm: fmt(Math.round(1_000_000 / view.pressure)),
                })}
              </span>
              <SourceLine id="eda" />
            </>
          }
        />
        <BodyMapCard view={view} />
        <RiskCard view={view} />
        <TimeCard
          view={view}
          inputs={
            <>
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
            </>
          }
          note={
            mode === 'replay'
              ? t('The projection starts at the real value now. It uses the crew count and the CDRA state of the simulator, not the real state of the station on that day.')
              : t('In simulated mode, the clock moves the CO2 value along this projection.')
          }
        />
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
