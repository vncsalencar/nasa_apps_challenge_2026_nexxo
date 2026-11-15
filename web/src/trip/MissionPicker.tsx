// The list of the mission presets, grouped by destination, and the facts of the current mission
// with their sources. On a phone the list is one row that scrolls sideways inside its own box.
// On a wide screen the missions wrap. The picker shows what it gets and reads no live data.
import { useEffect, useRef } from 'react'
import type { Preset, PresetId } from '../../../shared/trip/types.ts'
import { fmt, t, tn } from '../i18n.ts'
import { Badge } from './Badge.tsx'
import { RefCite } from './LifeCard.tsx'
import './life.css'

type Props = {
  presets: Preset[]
  current: PresetId
  // Absent: the list shows the missions, and a person cannot change the mission here.
  onPick?: (id: PresetId) => void
  // Show the notes of the preset ("flags") with the current mission. Set it to false if another card shows them.
  showFlags?: boolean
}

const DESTINATIONS: { id: Preset['destination']; label: string }[] = [
  { id: 'leo', label: t('Low Earth orbit') },
  { id: 'moon', label: t('Moon') },
  { id: 'mars', label: t('Mars') },
]

// A text of a preset can be empty in a first version. An empty text must not reach t().
const tx = (text: string | undefined) => (text ? t(text) : '')

export function MissionPicker({ presets, current, onPick, showFlags = true }: Props) {
  const groups = DESTINATIONS.map((destination) => ({ ...destination, presets: presets.filter((preset) => preset.destination === destination.id) })).filter((group) => group.presets.length > 0)
  const preset = presets.find((item) => item.id === current)

  // On a phone the row scrolls sideways. The current mission moves into view, with a part of the
  // mission before it, so a person sees that the row goes on to the left. The page does not scroll.
  const row = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const move = () => {
      const box = row.current
      const chip = box?.querySelector<HTMLElement>('[data-current="true"]')
      if (!box || !chip || box.scrollWidth <= box.clientWidth) return
      const boxAt = box.getBoundingClientRect()
      const chipAt = chip.getBoundingClientRect()
      box.scrollTo({ left: box.scrollLeft + chipAt.left - boxAt.left - 56 })
    }
    move()
    // The width of a chip changes when the fonts of the page load, so the row moves again then.
    let live = true
    document.fonts?.ready.then(() => live && move())
    return () => {
      live = false
    }
  }, [current])

  return (
    <section className="card mp" aria-label={t('Mission')}>
      <div className="lf-head">
        <div>
          <h2 className="lf-h2">{t('Mission')}</h2>
          <p className="lf-legend">{onPick ? t('Choose a mission. Each one tells how real its data is.') : t('Each mission tells how real its data is.')}</p>
        </div>
      </div>

      <div className="mp-row" ref={row}>
        {groups.map((group) => (
          <div className="mp-group" key={group.id} role="group" aria-label={group.label}>
            <div className="mp-group-name">{group.label}</div>
            <ul className="mp-chips">
              {group.presets.map((item) => {
                const on = item.id === current
                return (
                  <li key={item.id} className={on ? 'mp-chip mp-chip-on' : 'mp-chip'} data-current={on}>
                    {onPick ? (
                      <button type="button" className="mp-pick" aria-pressed={on} onClick={() => onPick(item.id)}>
                        {tx(item.name)}
                      </button>
                    ) : (
                      <span className="mp-pick" aria-current={on ? 'true' : undefined}>
                        {tx(item.name)}
                      </span>
                    )}
                    <Badge kind={item.badge} />
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      {preset && <Detail preset={preset} showFlags={showFlags} />}
    </section>
  )
}

// The facts of the current mission. A part with no text does not show.
function Detail({ preset, showFlags }: { preset: Preset; showFlags: boolean }) {
  const { cabin, trajectory } = preset
  const findings = (preset.findings ?? []).filter((finding) => finding.text)
  const flags = showFlags ? preset.flags.filter(Boolean) : []
  const sources = preset.sources.filter((source) => source.short || source.title)
  const volume = t('{volume} m³ of free volume', { volume: fmt(cabin.freeVolumeM3) })

  return (
    <div className="mp-detail" aria-live="polite">
      <div className="mp-detail-head">
        <h3 className="mp-name">{tx(preset.name)}</h3>
        <Badge kind={preset.badge} />
      </div>
      {preset.summary && <p className="mp-summary">{t(preset.summary)}</p>}

      <div className="mp-cols">
        <div className="mp-col">
          <dl className="lf-facts">
            <div>
              <dt>{t('Crew')}</dt>
              <dd>{tn(preset.crew, '{count} person', '{count} persons')}</dd>
            </div>
            <div>
              <dt>{t('Cabin')}</dt>
              <dd>
                {cabin.name ? `${t(cabin.name)}, ${volume}` : volume}
                {cabin.source && (
                  <span className="mp-sub">
                    {t('Source of the volume:')} <RefCite source={cabin.source} />
                  </span>
                )}
                {cabin.assumption && <span className="mp-sub">{t('Assumption: {reason}', { reason: t(cabin.assumption) })}</span>}
              </dd>
            </div>
            <div>
              <dt>{t('Trajectory')}</dt>
              <dd>
                <span className="mp-inline">
                  {(trajectory.source.short || trajectory.source.title) && <RefCite source={trajectory.source.short ? trajectory.source : { ...trajectory.source, short: trajectory.source.title }} />}
                  <Badge kind={trajectory.badge} />
                </span>
                {trajectory.note && <span className="mp-sub">{t(trajectory.note)}</span>}
              </dd>
            </div>
          </dl>
          {flags.length > 0 && (
            <ul className="mp-flags">
              {flags.map((flag) => (
                <li key={flag}>{t(flag)}</li>
              ))}
            </ul>
          )}
        </div>

        {findings.length > 0 && (
          <div className="mp-col">
            <h4 className="mp-h4">{t('Findings of the mission')}</h4>
            <ul className="mp-findings">
              {findings.map((finding) => (
                <li key={finding.text}>
                  {t(finding.text)}{' '}
                  <span className="mp-cite">
                    <RefCite source={finding.source} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mp-col">
          <h4 className="mp-h4">{t('Sources')}</h4>
          {sources.length > 0 ? (
            <ul className="mp-sources">
              {sources.map((source) => {
                const short = tx(source.short) || tx(source.title)
                return (
                  <li key={`${source.short} ${source.url}`}>
                    {source.url ? (
                      <a href={source.url} target="_blank" rel="noreferrer">
                        {short}
                      </a>
                    ) : (
                      <span className="mp-source-short">{short}</span>
                    )}
                    {source.short && source.title && <span className="mp-source-title">{t(source.title)}</span>}
                    {source.credit && <span className="mp-source-title">{source.credit}</span>}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="mp-empty">{t('This mission lists no source yet.')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
