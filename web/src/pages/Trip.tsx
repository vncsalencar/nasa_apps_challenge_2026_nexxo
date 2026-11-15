// The trip page: "Trip forecast". A mission timeline with a 2D map, and forecasts of the
// communication delay, the radiation dose, the CO2 and the O2 of the cabin, and the effects on
// the body, as the mission goes on. The simulator page drives it, as it drives the CO2 page.
//
// The page reads the settings of the trip from the server and computes the forecasts in the
// browser (web/src/trip/useTrip.ts). The CO2 forecast feeds the same cards as the CO2 page.
import { useMemo, useRef, useState } from 'react'
import { LIMIT_1H_MMHG } from '../../../shared/co2.ts'
import { SAA_NOTE, SAA_REGION } from '../../../shared/trip/groundtrack.ts'
import { PRESETS } from '../../../shared/trip/presets/index.ts'
import { CAREER_LIMIT } from '../../../shared/trip/radiation.ts'
import { spanAt } from '../../../shared/trip/timeline.ts'
import { transferNote } from '../../../shared/trip/transfer.ts'
import type { DoseUnit, PresetId } from '../../../shared/trip/types.ts'
import { RiskCard } from '../components/co2/RiskCard.tsx'
import { TimeCard } from '../components/co2/TimeCard.tsx'
import { PageTabs } from '../components/PageTabs.tsx'
import { LANGS, fmt, lang, setLang, t, tn } from '../i18n.ts'
import { useLive } from '../live.ts'
import { CDRA_LABEL } from '../texts.ts'
import { Badge } from '../trip/Badge.tsx'
import { CalibrationCard } from '../trip/CalibrationCard.tsx'
import { CompareCard } from '../trip/CompareCard.tsx'
import { DelayCard } from '../trip/DelayCard.tsx'
import { EffectsCard } from '../trip/EffectsCard.tsx'
import { LifeCard } from '../trip/LifeCard.tsx'
import { MissionPicker } from '../trip/MissionPicker.tsx'
import { RadiationCard } from '../trip/RadiationCard.tsx'
import { Timeline } from '../trip/Timeline.tsx'
import { TripMap } from '../trip/TripMap.tsx'
import { calibrationOf, planKey, tripNow, tripPlan } from '../trip/useTrip.ts'
import './dashboard.css'
import './trip.css'

export default function Trip() {
  const { live, online, control } = useLive()
  // The mission day while a person drags the cursor. The page shows it before the server answers.
  const [localDay, setLocalDay] = useState<number | null>(null)
  const moves = useRef(0)

  const trip = live?.trip
  const day = localDay ?? trip?.day ?? 0
  // The plan of the mission changes only with its settings, not with the day and not with a tick
  // of the CO2 clock. So the geometry stays the same object while a person drags the cursor.
  const key = trip ? planKey(trip) : ''
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plan = useMemo(() => (trip ? tripPlan(trip) : null), [key])
  const view = useMemo(() => (trip && plan ? tripNow(trip, plan, day) : null), [trip, plan, day])

  if (!live || !trip || !plan || !view) {
    return (
      <div className="xp xp-wait">
        <span className="brand">Nexxo</span>
        <p className="muted">{online ? t('Loading the trip data…') : t('No connection to the server. The page tries again.')}</p>
      </div>
    )
  }

  const send = (change: Record<string, unknown>) => void control({ trip: change }).catch(() => undefined)
  const moveDay = (next: number) => {
    const move = ++moves.current
    setLocalDay(next)
    // Show the day of the server again when it has the newest move.
    void control({ trip: { day: next } })
      .catch(() => undefined)
      .finally(() => move === moves.current && setLocalDay(null))
  }

  const { preset, geometry, series } = plan
  const { forecast, co2 } = view
  const span = geometry.spans.length ? spanAt(geometry.spans, day) : null
  const life = trip.life
  const failure = life.scrubber !== 'both' || !life.ogaOn || life.ogaKgPerDay !== null

  return (
    <div className="xp tp">
      <header className="xp-top">
        <div className="xp-brand">
          <span className="brand">Nexxo</span>
          {/* The link of the open page shows the name of the page, so the heading is for a screen reader only. */}
          <h1 className="hide">{t('Trip forecast')}</h1>
          <PageTabs />
        </div>
        <div className="xp-live">
          <Badge kind={preset.badge} />
          <span className="xp-clock">
            {t(preset.name)} · {t('day {day} of {days}', { day: fmt(day, 1), days: fmt(geometry.days, geometry.days % 1 ? 1 : 0) })}
            {span && ` · ${t(span.phase.label)}`}
            {trip.playing && ` · ${t('the clock runs')}`}
            {!online && ` · ${t('no connection')}`}
          </span>
        </div>
      </header>

      <main className="tp-main">
        <MissionPicker presets={PRESETS} current={trip.preset} onPick={(id: PresetId) => send({ preset: id })} showFlags={false} />

        <section className="card tp-when" aria-label={t('Mission day')}>
          <div className="tp-when-head">
            <h2 className="tp-h2">{t('Mission day')}</h2>
            <span className="muted small">{t('Drag the cursor. Each part of the page follows.')}</span>
          </div>
          <Timeline geometry={geometry} day={day} storms={trip.storms} limitDay={series.limitDay} onDay={moveDay} />
        </section>

        <div className="tp-grid">
          <section className="card tp-map" aria-label={t('Map')}>
            <div className="tp-card-head">
              <h2 className="tp-h2">{t('Where the spacecraft is')}</h2>
              <Badge kind={view.place.modelled ? 'modelled' : preset.trajectory.badge} />
            </div>
            <TripMap geometry={geometry} day={day} saaRegion={geometry.frame === 'ground' ? SAA_REGION : undefined} />
            <p className="tp-note">
              {preset.trajectory.note && `${t(preset.trajectory.note)} `}
              {preset.id === 'custom' && `${t(transferNote(trip.customDays))} `}
              {geometry.frame === 'ground' && t(SAA_NOTE)}
            </p>
          </section>
          <DelayCard geometry={geometry} day={day} source={preset.trajectory.source} />
        </div>

        <RadiationCard
          preset={preset}
          series={series}
          day={day}
          solar={preset.solar ? trip.solar : null}
          units={plan.units}
          onUnit={(unit: DoseUnit) => send({ doseUnit: unit })}
        />
        {plan.measured && plan.measured.real.unit === series.unit && (
          <p className="tp-credit">
            {plan.measured.measuredDays === plan.measured.days
              ? t('The dose of each day is a measured series of {days} days.', { days: plan.measured.days })
              : t('The dose of {measured} days is measured. The other days use the published mean.', { measured: plan.measured.measuredDays })}{' '}
            {plan.measured.real.loop && t('After its last day, the series starts again.')} {plan.measured.file.source.credit ?? plan.measured.file.source.title}
          </p>
        )}

        <CompareCard
          items={plan.comparison.shown}
          hidden={plan.comparison.hidden}
          unit={trip.doseUnit}
          all={PRESETS}
          selected={trip.compare}
          onSelect={(ids: PresetId[]) => send({ compare: ids })}
        />

        <EffectsCard effects={view.effects} figure={view.figure} day={day} />

        <LifeCard
          forecast={forecast}
          life={life}
          nominalDailyCo2Kg={view.person.co2Kg}
          nominalDailyO2Kg={view.person.o2Kg}
          metabolicLabel={view.metabolic.label}
          metabolicSource={view.metabolic.source}
        />

        <div className="tp-grid tp-co2">
          <RiskCard view={co2} />
          <TimeCard
            view={co2}
            steady="dailyMean"
            inputs={
              <>
                {tn(life.crew, '{count} person', '{count} persons')} · {t('scrubber: {state}', { state: CDRA_LABEL[life.scrubber].toLowerCase() })}
              </>
            }
            note={
              failure
                ? t('The countdown uses the life support settings of the simulator, from mission day {day} on.', { day: fmt(trip.lifeChangedDay, 1) })
                : t('The CO2 follows the day of the crew: it rises with exercise and falls in the sleep time. The limit of {limit} mmHg is for the 1-hour average.', { limit: fmt(LIMIT_1H_MMHG, 1) })
            }
          />
        </div>

        {preset.id === 'iss' && <CalibrationCard result={calibrationOf(live.about)} credit={live.about.source.credit} mission={live.about.source.mission} />}
      </main>

      <footer className="xp-foot">
        <p>
          {t('Each chart has a badge: REAL DATA is a measured series, REAL RATE is a published mean of a measurement, MODELLED comes from a model of this app, and PROXY is a real value from another mission.')}
        </p>
        <p>
          {t('Career limit of the radiation dose: {limit} mSv.', { limit: fmt(CAREER_LIMIT.mSv) })} {CAREER_LIMIT.says && t(CAREER_LIMIT.says)} {CAREER_LIMIT.source.title}
        </p>
        <p>
          {t('Trajectories: JPL Horizons, Solar System Dynamics Group, NASA Jet Propulsion Laboratory. Orbit of the station: CelesTrak. Cabin CO2 and radiation of the station: NASA Environmental Data Application (EDA). Radiation in the cruise to Mars: MSL RAD (NASA) and Liulin-MO on the ExoMars Trace Gas Orbiter (ESA and Roscosmos). Land shapes: made with Natural Earth.')}
        </p>
        <p>{live.about.source.credit}</p>
        <p>{t('This page is a prototype for a hackathon. It is not a medical device.')}</p>
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
