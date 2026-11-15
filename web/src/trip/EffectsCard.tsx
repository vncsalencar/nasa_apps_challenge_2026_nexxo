// The "effects on the body" card of the trip page. It shows the body of a crew member in 2D or 3D.
// A region gets color when a hazard of the trip can affect it: the radiation dose, and the CO2 and
// the O2 of the cabin. A tap on a region or on a row of the list opens a panel in the card. The panel
// tells what a source reports there, what the app compares now, and what the crew can do.
// The card does no math of its own for the effects: shared/trip/effects.ts makes the list, and it has the
// rule of the color (figureHeat). The texts of the effects are English texts of that file. The card gives
// each one to t(), and web/src/locales/pt-BR/trip-r3.ts has the Portuguese texts.
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { EFFECT_NOTES, HAZARD_LABEL, HAZARD_SAYS, HAZARD_SOURCE, figureHeat, strengthOf, type BodyEffect, type TextPart } from '../../../shared/trip/effects.ts'
import type { Effect, EffectRegion, Hazard } from '../../../shared/trip/effects-types.ts'
import type { SourceRef } from '../../../shared/trip/types.ts'
import { BodyFigure } from '../components/BodyFigure.tsx'
import { HEAT_REGIONS, type FigurePoint, type Heat, type HeatRegion } from '../components/heat.ts'
import { Icon } from '../components/Icon.tsx'
import { FloatingTip } from '../components/Tip.tsx'
import { fmt, t, tn } from '../i18n.ts'
import { FIGURE_LABEL } from '../texts.ts'
import { heatStyle } from '../view.ts'
import './effects.css'

// The 3D figure loads after the first paint, because it brings a large library.
const BodyFigure3D = lazy(() => import('../components/BodyFigure3D.tsx'))

// The CO2 page stores the choice between 2D and 3D under the same name, so the two pages agree.
const FIGURE_KEY = 'nexxo-body-3d'
function storedThreeD() {
  try {
    return localStorage.getItem(FIGURE_KEY) === 'on'
  } catch {
    return false
  }
}

const HAZARDS: Hazard[] = ['radiation', 'co2', 'o2']
const HAZARD_NAME: Record<Hazard, string> = { radiation: t(HAZARD_LABEL.radiation), co2: t(HAZARD_LABEL.co2), o2: t(HAZARD_LABEL.o2) }
const REGION_NAME: Record<EffectRegion, string> = { ...FIGURE_LABEL, body: t('Whole body'), none: t('No place on the figure') }
const KIND_NAME: Record<Effect['kind'], string> = { band: t('Reported symptom'), limit: t('Limit') }

// The effects of a wider region also count for a region: the whole body for each part, and the part
// below a small region for that small region. This is the rule of the color, so the panel follows it.
const WIDER: Record<HeatRegion, EffectRegion[]> = {
  head: ['body'],
  chest: ['body'],
  abdomen: ['body'],
  arms: ['body'],
  legs: ['body'],
  brain: ['head', 'body'],
  eyes: ['head', 'body'],
  face: ['head', 'body'],
  airway: ['chest', 'body'],
}

type Filter = 'all' | Hazard
// What the person selected: a region of the figure, or one effect of the list.
type Selection = { region: HeatRegion } | { effect: string }

// An effect of the card. bodyEffects() of shared/trip/effects.ts gives more than the contract type has:
// the sentences of "measure", the fixed texts of "caveat", and the mark of a rough comparison.
// An effect from another place has none of them, and the card then shows the plain texts.
type CardEffect = Effect & Partial<Pick<BodyEffect, 'measureParts' | 'caveatParts' | 'rough' | 'roughWhy'>>

const isFigureRegion = (region: EffectRegion): region is HeatRegion => (HEAT_REGIONS as EffectRegion[]).includes(region)
const clamp = (value: number) => Math.min(1, Math.max(0, value))
// The strongest effect first. Effects of the same strength keep the order of the data.
const strongestFirst = (effects: CardEffect[]) => [...effects].sort((a, b) => strengthOf(b) - strengthOf(a) || b.intensity - a.intensity)

// True if the quantity that the app has and the quantity of the source differ. The result is then a
// rough indicator only, and the card never shows it as a firm statement.
const isRough = (effect: CardEffect) => effect.rough === true

// One sentence of the data in the language of the page. A number goes through the number format of the page.
function sentence(part: TextPart): string {
  const values = Object.fromEntries(Object.entries(part.values ?? {}).map(([name, value]) => [name, typeof value === 'object' ? fmt(value.value, value.decimals) : value]))
  return t(part.key, values)
}
// What the app compares now, with the numbers. For a rough comparison, the card leaves out the
// sentence that only tells that it is rough: the line of the state tells it.
function measureOf(effect: CardEffect): string {
  if (!effect.measureParts) return t(effect.measure)
  return effect.measureParts.filter((part) => !(part.rough && isRough(effect))).map(sentence).join(' ')
}
const joined = (texts: string[]) => texts.map((text) => t(text)).join(' ')
const caveatOf = (effect: CardEffect) => (effect.caveatParts ? joined(effect.caveatParts) : effect.caveat ? t(effect.caveat) : '')
// Why a rough comparison is rough: the two quantities. The card shows this text next to the bar.
const roughWhyOf = (effect: CardEffect) => (isRough(effect) && effect.roughWhy ? joined(effect.roughWhy) : '')

// Where the value is in the band or on the way to the limit, as a short text.
// A rough comparison always starts with "Rough indicator".
function stateOf(effect: CardEffect): string {
  const full = effect.intensity >= 1
  const percent = Math.min(99, Math.max(1, Math.round(effect.intensity * 100)))
  if (isRough(effect)) {
    if (effect.intensity <= 0) return t('Rough indicator: not reached now')
    if (effect.kind === 'limit') return full ? t('Rough indicator: the number is at the number of the limit or above it') : t('Rough indicator: the number is {percent}% of the number of the limit', { percent })
    return full ? t('Rough indicator: the number is at the value of the source or above it') : t('Rough indicator: the number is {percent}% into the band of the source', { percent })
  }
  if (effect.intensity <= 0) return t('Not reached now')
  // "Past it": a value can pass an upper limit on the way up, and a lower limit on the way down.
  if (effect.kind === 'limit') return full ? t('At the limit or past it') : t('{percent}% of the way to the limit', { percent })
  return full ? t('Reached in full') : t('{percent}% into the band', { percent })
}

// The word of the hazard. The color of the card shows the strength only, so the hazard needs a word.
function HazardChip({ hazard }: { hazard: Hazard }) {
  return <span className={`fx-chip fx-chip-${hazard}`}>{HAZARD_NAME[hazard]}</span>
}

// The bar of one effect. A rough comparison gets a dashed bar.
function Bar({ effect }: { effect: CardEffect }) {
  return (
    <span className={isRough(effect) ? 'fx-bar fx-bar-rough' : 'fx-bar'} role="img" aria-label={stateOf(effect)}>
      <i style={{ width: `${Math.round(clamp(effect.intensity) * 100)}%`, ...heatStyle(strengthOf(effect)) }} />
    </span>
  )
}

function SourceLink({ source }: { source: SourceRef }) {
  return (
    <a href={source.url} target="_blank" rel="noreferrer">
      {t(source.short)}
    </a>
  )
}

// All that the card knows about one effect, with the steps that lower the risk.
function EffectDetail({ effect }: { effect: CardEffect }) {
  const caveat = caveatOf(effect)
  const notes = EFFECT_NOTES[effect.id] ?? []
  return (
    <article className={effect.intensity > 0 ? 'fx-effect fx-on' : 'fx-effect'} data-effect={effect.id}>
      <div className="fx-effect-head">
        <span className="fx-dot" style={heatStyle(strengthOf(effect))} aria-hidden="true" />
        <h4 className="fx-effect-title">{t(effect.title)}</h4>
      </div>
      <p className="fx-tags">
        <HazardChip hazard={effect.hazard} />
        <span className="fx-kind">{KIND_NAME[effect.kind]}</span>
      </p>
      <dl className="fx-facts">
        <div>
          <dt>{t('What the source reports')}</dt>
          <dd className="fx-says">{t(effect.says)}</dd>
        </div>
        <div>
          <dt>{t('The comparison now')}</dt>
          <dd>
            <span className="fx-measure">{measureOf(effect)}</span>
            <Bar effect={effect} />
            <span className="fx-state">{stateOf(effect)}</span>
            {/* The warning about the comparison is next to the bar, so a person reads the two together. */}
            {caveat && (
              <span className="fx-caveat">
                <Icon name="info" size={18} />
                <span>
                  <strong>{isRough(effect) ? t('Why this is a rough indicator only') : t('Limit of this comparison')}</strong>
                  {caveat}
                </span>
              </span>
            )}
          </dd>
        </div>
      </dl>
      <p className="fx-source">
        {t('Source:')} {t(effect.source.title)}.{' '}
        <a href={effect.source.url} target="_blank" rel="noreferrer">
          {t('Open the source')}
        </a>
      </p>
      <h5 className="fx-do">{t('What you can do')}</h5>
      {effect.mitigations.length ? (
        <ol className="fx-steps">
          {effect.mitigations.map((step, index) => (
            <li key={index}>
              <span className="fx-step-text">{t(step.text)}</span>
              <span className="fx-step-from">
                {step.source && (
                  <>
                    {t('Source:')} <SourceLink source={step.source} />
                  </>
                )}
                {/* A step with no source is an idea of this app. The mark tells it. */}
                {(step.ours || !step.source) && <span className="fx-ours">{t('our idea')}</span>}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="fx-none">{t('The data has no step for this effect.')}</p>
      )}
      {notes.length > 0 && (
        <>
          <h5 className="fx-do">{t('What the sources also say')}</h5>
          <ul className="fx-notes">
            {notes.map((note, index) => (
              <li key={index}>
                <span>{t(note.text)}</span>
                <span className="fx-step-from">
                  {t('Source:')} <SourceLink source={note.source} />
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  )
}

// A short line for an effect that the panel does not show in full. It opens the full text.
function EffectLink({ effect, says = false, onPick }: { effect: CardEffect; says?: boolean; onPick: (id: string) => void }) {
  return (
    <li>
      <button type="button" className="fx-link" onClick={() => onPick(effect.id)}>
        <span className="fx-dot" style={heatStyle(strengthOf(effect))} aria-hidden="true" />
        <span className="fx-link-text">
          <span className="fx-link-title">{t(effect.title)}</span>
          {says && <span className="fx-link-says">{t(effect.says)}</span>}
          <span className="fx-link-foot">
            <HazardChip hazard={effect.hazard} />
            {effect.region !== 'none' && <span>{REGION_NAME[effect.region]}</span>}
          </span>
        </span>
      </button>
    </li>
  )
}

// The panel of one region of the figure: its own effects, and the effects of the wider regions.
function RegionDetail({ region, effects, onPick }: { region: HeatRegion; effects: CardEffect[]; onPick: (id: string) => void }) {
  const own = effects.filter((effect) => effect.region === region)
  const wider = effects.filter((effect) => WIDER[region].includes(effect.region))
  const ownOn = own.filter((effect) => effect.intensity > 0)
  const widerOn = wider.filter((effect) => effect.intensity > 0)
  // The full text of the effects of this region. If the region has none, the full text of the wider effects.
  const full = ownOn.length ? ownOn : widerOn
  const also = ownOn.length ? widerOn : []
  const quiet = full.length === 0
  // What is not reached yet. With nothing active, the wider effects are also in this list.
  const later = quiet ? [...own, ...wider] : ownOn.length ? [] : own
  return (
    <>
      {full.map((effect) => (
        <EffectDetail key={effect.id} effect={effect} />
      ))}
      {also.length > 0 && (
        <div className="fx-more">
          <h4 className="fx-more-title">{t('A wider effect also counts here')}</h4>
          <ul className="fx-links">
            {also.map((effect) => (
              <EffectLink key={effect.id} effect={effect} onPick={onPick} />
            ))}
          </ul>
        </div>
      )}
      {quiet && <p className="fx-quiet">{t('No hazard affects this part at this mission day.')}</p>}
      {later.length > 0 && (
        <div className="fx-more">
          <h4 className="fx-more-title">{t('What can affect this part later')}</h4>
          <ul className="fx-links">
            {later.map((effect) => (
              <EffectLink key={effect.id} effect={effect} says onPick={onPick} />
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

export function EffectsCard({ effects, figure, day }: { effects: CardEffect[]; figure: Heat; day: number }) {
  const [threeD, setThreeD] = useState(storedThreeD)
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<Selection | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [hover, setHover] = useState<{ region: HeatRegion; point: FigurePoint } | null>(null)
  const panelHead = useRef<HTMLDivElement>(null)
  const choose = (on: boolean) => {
    setThreeD(on)
    try {
      localStorage.setItem(FIGURE_KEY, on ? 'on' : 'off')
    } catch {
      // The choice then lasts until the page closes.
    }
  }

  // The effects and the heat that the filter leaves. With no filter, the heat is the heat of the page.
  // With a filter, the same rule of shared/trip/effects.ts gives the heat of the effects that stay.
  const shown = useMemo(() => strongestFirst(filter === 'all' ? effects : effects.filter((effect) => effect.hazard === filter)), [effects, filter])
  const heat = useMemo<Heat>(() => (filter === 'all' ? figure : figureHeat(shown)), [filter, figure, shown])
  const active = shown.filter((effect) => effect.intensity > 0)
  const rest = shown.filter((effect) => effect.intensity <= 0)
  const activeOf = (hazard: Hazard) => effects.filter((effect) => effect.hazard === hazard && effect.intensity > 0).length

  // The selection that the data still has. An effect can leave the list when the filter or the day changes.
  const pickedEffect = selected && 'effect' in selected ? shown.find((effect) => effect.id === selected.effect) : undefined
  const pickedRegion: HeatRegion | null = selected && 'region' in selected ? selected.region : pickedEffect && isFigureRegion(pickedEffect.region) ? pickedEffect.region : null
  const open = pickedEffect !== undefined || (selected !== null && 'region' in selected)
  const panelTitle = pickedEffect ? REGION_NAME[pickedEffect.region] : pickedRegion ? REGION_NAME[pickedRegion] : ''
  const selectionKey = !open ? '' : pickedEffect ? `effect ${pickedEffect.id}` : `region ${pickedRegion}`
  // A new selection brings the head of the panel into view. On a phone the panel is below the figure.
  useEffect(() => {
    if (!selectionKey || !panelHead.current) return
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    panelHead.current.scrollIntoView({ block: 'nearest', behavior: calm ? 'auto' : 'smooth' })
  }, [selectionKey])

  const pickRegion = (region: HeatRegion) => setSelected((current) => (current && 'region' in current && current.region === region ? null : { region }))
  const pickEffect = (id: string) => setSelected((current) => (current && 'effect' in current && current.effect === id ? null : { effect: id }))

  // The active effects of a region: its own effects and the effects of the wider regions.
  const activeOn = (region: HeatRegion) => active.filter((effect) => effect.region === region || WIDER[region].includes(effect.region))
  const labels = Object.fromEntries(
    HEAT_REGIONS.map((region) => {
      const on = activeOn(region)
      const text = on.length ? on.map((effect) => `${HAZARD_NAME[effect.hazard]}: ${t(effect.title)}, ${stateOf(effect)}.`).join(' ') : t('No hazard affects this part now.')
      return [region, `${FIGURE_LABEL[region]}. ${text}`]
    }),
  ) as Record<HeatRegion, string>
  const figureProps = {
    heat,
    labels,
    selected: pickedRegion,
    onSelect: pickRegion,
    // The figure reports a mouse with a point. The keyboard has no point, and the label of the region tells the same.
    onHover: (region: HeatRegion | null, point?: FigurePoint) => setHover(region && point ? { region, point } : null),
  }
  // The active effects with no place on the figure, for example sleep. They show as buttons below the figure.
  const offFigure = active.filter((effect) => effect.region === 'none')
  const hoverOn = hover ? activeOn(hover.region) : []

  return (
    <section className="card fx" aria-label={t('Effects on the body')}>
      <div className="fx-head">
        <div>
          <div className="fx-title-row">
            <h2 className="fx-h2">{t('Effects on the body')}</h2>
            {Number.isFinite(day) && <span className="fx-day">{t('Mission day {day}', { day: fmt(day, day % 1 ? 1 : 0) })}</span>}
          </div>
          <p className="fx-legend">{t('Color shows where a hazard of the trip can affect the body, from limits and reports of NASA and other sources. It is not measured body data.')}</p>
        </div>
        <span className="segmented fx-dim" role="group" aria-label={t('Figure')}>
          <button type="button" aria-pressed={!threeD} onClick={() => choose(false)}>2D</button>
          <button type="button" aria-pressed={threeD} onClick={() => choose(true)}>3D</button>
        </span>
      </div>

      <div className="fx-filter" role="group" aria-label={t('Hazard')}>
        <button type="button" className="pill" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
          {t('All')}
        </button>
        {HAZARDS.map((hazard) => {
          const count = activeOf(hazard)
          return (
            <button type="button" key={hazard} className="pill" aria-pressed={filter === hazard} onClick={() => setFilter(hazard)}>
              {HAZARD_NAME[hazard]}
              <span className={count ? 'fx-count fx-count-on' : 'fx-count'} aria-hidden="true">
                {count}
              </span>
              <span className="hide">{tn(count, '{count} active effect', '{count} active effects')}</span>
            </button>
          )
        })}
      </div>

      <div className="fx-main">
        <div className="fx-stage">
          <div className="fx-figure">
            {threeD ? (
              <Suspense fallback={<BodyFigure {...figureProps} />}>
                <BodyFigure3D {...figureProps} />
              </Suspense>
            ) : (
              <BodyFigure {...figureProps} />
            )}
          </div>
          {offFigure.length > 0 && (
            <ul className="fx-off" aria-label={t('Active effects with no place on the figure')}>
              {offFigure.map((effect) => (
                <li key={effect.id}>
                  <button type="button" className="fx-off-item" aria-pressed={pickedEffect?.id === effect.id} onClick={() => pickEffect(effect.id)}>
                    <span className="fx-dot" style={heatStyle(strengthOf(effect))} aria-hidden="true" />
                    {t(effect.title)}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="fx-scale" aria-hidden="true">
            <span>{t('effect starts')}</span>
            <i />
            <span>{t('at the limit, or a more serious effect')}</span>
          </div>
          {hover && (
            <FloatingTip point={hover.point}>
              <span className="tip-title">{FIGURE_LABEL[hover.region]}</span>
              {hoverOn.length ? (
                hoverOn.map((effect) => (
                  <span className="fx-tip-line" key={effect.id}>
                    {HAZARD_NAME[effect.hazard]}: {t(effect.title)}
                  </span>
                ))
              ) : (
                <span className="fx-tip-line">{t('No hazard affects this part now.')}</span>
              )}
            </FloatingTip>
          )}
        </div>

        <div className="fx-side">
          {filter !== 'all' && (
            <p className="fx-hazard">
              <strong>{HAZARD_NAME[filter]}</strong>
              {t(HAZARD_SAYS[filter])}
              <span className="fx-step-from">
                {t('Source:')} <SourceLink source={HAZARD_SOURCE[filter]} />
              </span>
            </p>
          )}
          <p className="hide" role="status">
            {open ? t('The detail is open: {name}', { name: pickedEffect ? t(pickedEffect.title) : panelTitle }) : ''}
          </p>
          {open ? (
            <div className="fx-panel" role="region" aria-label={t('Detail: {name}', { name: panelTitle })}>
              <div className="fx-panel-head" ref={panelHead}>
                <h3 className="fx-panel-title">{panelTitle}</h3>
                <button type="button" className="fx-close" onClick={() => setSelected(null)}>
                  {t('Close')}
                </button>
              </div>
              {pickedEffect ? <EffectDetail effect={pickedEffect} /> : pickedRegion && <RegionDetail region={pickedRegion} effects={shown} onPick={pickEffect} />}
            </div>
          ) : active.length === 0 ? (
            <p className="fx-empty">
              <span className="fx-empty-dot" aria-hidden="true" />
              {filter === 'all' ? t('No hazard affects the body at this mission day.') : t('No effect of this hazard is active at this mission day.')}
            </p>
          ) : (
            <p className="fx-hint">{t('Select a part of the figure or a row of the list. A panel then shows what can happen there and what you can do.')}</p>
          )}

          <div className="fx-list-box">
            <h3 className="fx-list-title">
              {t('Effects, the strongest first')}
              <span className="fx-list-count">{tn(active.length, '{count} active effect', '{count} active effects')}</span>
            </h3>
            <ol className="fx-list">
              {(showAll ? shown : active).map((effect) => (
                <li key={effect.id}>
                  <button
                    type="button"
                    className={effect.intensity > 0 ? 'fx-row fx-on' : 'fx-row'}
                    data-effect={effect.id}
                    aria-pressed={pickedEffect?.id === effect.id}
                    onClick={() => pickEffect(effect.id)}
                  >
                    <span className="fx-dot" style={heatStyle(strengthOf(effect))} aria-hidden="true" />
                    <span className="fx-row-text">
                      <span className="fx-row-top">
                        <span className="fx-row-region">{REGION_NAME[effect.region]}</span>
                        <HazardChip hazard={effect.hazard} />
                      </span>
                      <span className="fx-row-title">{t(effect.title)}</span>
                      <Bar effect={effect} />
                      <span className="fx-row-measure">{measureOf(effect)}</span>
                      <span className="fx-row-state">{stateOf(effect)}</span>
                      {isRough(effect) && effect.intensity > 0 && <span className="fx-row-why">{roughWhyOf(effect)}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            {rest.length > 0 && (
              <button type="button" className="fx-all" aria-expanded={showAll} onClick={() => setShowAll((current) => !current)}>
                {showAll ? t('Hide the effects that are not reached') : tn(rest.length, 'Show all: {count} more effect is not reached', 'Show all: {count} more effects are not reached')}
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="fx-note">
        {t('The color shows how far a value is into a band or on the way to a limit. A more serious effect gets a stronger color. The order of the strength is our choice. No sensor on a person is behind this figure.')}
      </p>
      <p className="fx-note">
        {t('Some limits and reports use another quantity than the dose of the charts. The app does not convert a dose. Such a comparison is a rough indicator only: it has a dashed bar, and it never gets the full alert color.')}
      </p>
    </section>
  )
}
