// The badge that tells how real a value is: measured, a published mean, computed by our model,
// or a real value from another mission. Each kind has its own border, its own mark, and its own
// words, so a person can tell them apart with no color.
import type { ReactNode } from 'react'
import type { ChartBadge, PresetBadge, SourceRef } from '../../../shared/trip/types.ts'
import { Icon } from '../components/Icon.tsx'
import { Tip } from '../components/Tip.tsx'
import { t } from '../i18n.ts'
import './charts.css'

export type BadgeKind = ChartBadge | PresetBadge

type Mark = 'dot' | 'ring' | 'triangle' | 'diamond'

const MARKS: Record<BadgeKind, Mark[]> = {
  'real-data': ['dot'],
  'real-rate': ['ring'],
  modelled: ['triangle'],
  proxy: ['diamond'],
  'real-trajectory-proxy': ['dot', 'diamond'],
  'real-rate-modelled': ['ring', 'triangle'],
}

// The texts are made when the badge shows, so the language is the language of the page.
function badgeText(kind: BadgeKind): { label: string; tip: string } {
  switch (kind) {
    case 'real-data':
      return { label: t('REAL DATA'), tip: t('A measured series: each value comes from an instrument of this mission.') }
    case 'real-rate':
      return { label: t('REAL RATE (published mean)'), tip: t('A mean that the source published for a real measurement. The page uses it as a constant rate.') }
    case 'modelled':
      return { label: t('MODELLED'), tip: t('Computed by the model of this app. No instrument measured it.') }
    case 'proxy':
      return { label: t('PROXY'), tip: t('A real value from another mission. The page uses it because this mission has no value of its own.') }
    case 'real-trajectory-proxy':
      return { label: t('REAL TRAJECTORY + PROXY'), tip: t('The path is the real trajectory of the mission. The dose rate is a real value from another mission.') }
    case 'real-rate-modelled':
      return { label: t('REAL RATE + MODELLED'), tip: t('The dose rate is a published mean of a real measurement. The model of this app computes the rest.') }
  }
}

function MarkShape({ mark }: { mark: Mark }) {
  return (
    <svg className="badge-mark" viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
      {mark === 'dot' && <circle cx="6" cy="6" r="4.5" fill="currentColor" />}
      {mark === 'ring' && <circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" strokeWidth="2" />}
      {mark === 'triangle' && <path d="M6 1.5 11 10.5H1z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />}
      {mark === 'diamond' && <path d="M6 1 11 6 6 11 1 6z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />}
    </svg>
  )
}

export function Badge({ kind }: { kind: BadgeKind }) {
  const text = badgeText(kind)
  return (
    <Tip className={`badge badge-${kind}`} tip={text.tip}>
      <span className="badge-marks">
        {MARKS[kind].map((mark) => (
          <MarkShape key={mark} mark={mark} />
        ))}
      </span>
      {text.label}
    </Tip>
  )
}

// The line at the end of a tooltip that names a source of the trip data and links to it.
export function SourceNote({ source }: { source: SourceRef }) {
  return (
    <span className="tip-source">
      {t('Source:')} {source.title}.{' '}
      {source.url ? (
        <a href={source.url} target="_blank" rel="noreferrer">
          {t('Open the source')}
        </a>
      ) : (
        t('This source has no link yet.')
      )}
      {source.credit && <span className="tc-credit">{source.credit}</span>}
    </span>
  )
}

// A text or a small "i" that opens a tooltip with a statement and its source.
export function SourceTip({ source, says, children }: { source?: SourceRef; says?: ReactNode; children?: ReactNode }) {
  return (
    <Tip
      className={children ? 'tip-line' : 'tip-icon tc-info'}
      label={children ? undefined : source ? t('Source: {name}', { name: source.short }) : t('More about this value')}
      tip={
        <>
          {says && <span className="tip-part">{says}</span>}
          {source && <SourceNote source={source} />}
        </>
      }
    >
      {children ?? <Icon name="info" size={18} />}
    </Tip>
  )
}
