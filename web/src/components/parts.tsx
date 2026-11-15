// Small pieces that the dashboard and the simulator page both use.
import type { ReactNode } from 'react'
import { BANDS, HEADACHE, LIMIT_1H_MMHG, type Band, type SourceId } from '../../../shared/co2.ts'
import { fmt, t } from '../i18n.ts'
import type { Mode } from '../live.ts'
import { BAND_SYMPTOM, REGION_LABEL, SOURCES } from '../texts.ts'
import { bandState, bandText } from '../view.ts'
import { Icon } from './Icon.tsx'
import { Tip } from './Tip.tsx'

// The label of the mode. Real data and simulated data never look the same.
export function ModeBadge({ mode, mission }: { mode: Mode; mission: string }) {
  return mode === 'replay' ? (
    <span className="mode mode-replay">
      <span className="mode-dot" aria-hidden="true" /> {t('Real data replay')} · {mission}
    </span>
  ) : (
    <span className="mode mode-simulated">
      <span aria-hidden="true">▲</span> {t('Simulated')}
    </span>
  )
}

// The line at the end of a tooltip that names the source and links to it.
export function SourceLine({ id }: { id: SourceId }) {
  const source = SOURCES[id]
  return (
    <span className="tip-source">
      {t('Source:')} {source.title}.{' '}
      <a href={source.url} target="_blank" rel="noreferrer">
        {t('Open the source')}
      </a>
    </span>
  )
}

// A text or a small "i" that opens a tooltip with a statement and its source.
// "own": the statement already names its sources, so the tooltip adds no source line.
export function Cite({ source, says, own = false, children }: { source: SourceId; says: ReactNode; own?: boolean; children?: ReactNode }) {
  return (
    <Tip
      className={children ? 'tip-line' : 'tip-icon'}
      label={children ? undefined : t('Source: {name}', { name: SOURCES[source].short })}
      tip={
        own ? (
          says
        ) : (
          <>
            <span className="tip-part">{says}</span>
            <SourceLine id={source} />
          </>
        )
      }
    >
      {children ?? <Icon name="info" size={18} />}
    </Tip>
  )
}

// What one band says, for a tooltip: the region, the symptom, the values, and the source.
export function BandTip({ band, intensity }: { band: Band; intensity?: number }) {
  return (
    <span className="tip-part">
      <strong>
        {REGION_LABEL[band.region]}: {BAND_SYMPTOM[band.id]}
      </strong>
      <br />
      {band.to === null ? t('Reported at {from} mmHg.', { from: fmt(band.from, 1) }) : t('Reported at {range}.', { range: bandText(band) })}
      {intensity !== undefined && <> {bandState(band, intensity)}</>}
      <SourceLine id={band.source} />
    </span>
  )
}

// The tooltip of one value of the countdown: what starts at this value, with each source.
export function ThresholdTip({ target }: { target: number }) {
  const bands = BANDS.filter((band) => band.from === target)
  return (
    <>
      {target === LIMIT_1H_MMHG && <LimitSays />}
      {bands.map((band) => (
        <BandTip key={band.id} band={band} />
      ))}
    </>
  )
}

export function LimitSays() {
  return (
    <span className="tip-part">
      <strong>{t('The NASA limit for the 1-hour average is 3 mmHg.')}</strong>
      <br />
      {t('The system must keep the average CO2 partial pressure of one hour in the habitable volume at 3 mmHg or less.')}
      <SourceLine id="std3001" />
    </span>
  )
}

export function OddsSays() {
  return (
    <>
      <span className="tip-part">
        <strong>{t('The odds of a headache double for each +1 mmHg of CO2.')}</strong>
        <br />
        {t('A 7-day average below 2.5 mmHg keeps the risk of a headache below 1%. The study used averages of 24 hours and of 7 days.')}
        <SourceLine id="law2014" />
      </span>
      <span className="tip-part">
        {t('The study had {headaches} headaches in {observations} observations.', { headaches: HEADACHE.headaches, observations: fmt(HEADACHE.observations) })}
        <SourceLine id="counts2014" />
      </span>
      <span className="tip-part">
        {t('Station data below about 2 mmHg is thin: an earlier NASA analysis had only 20 crew reports with a 24-hour average below 2 mmHg. So the panel gives no estimate there.')}
        <SourceLine id="james2011" />
      </span>
    </>
  )
}
