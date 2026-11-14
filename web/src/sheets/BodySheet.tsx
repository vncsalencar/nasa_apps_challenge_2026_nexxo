// The Body sheet: the state in one line, the body figure with a label for each part,
// the values of the selected part, the open symptoms with their possible causes, and the symptom report.
import { Suspense, lazy, useState } from 'react'
import { STATUS_LABEL, STATUS_ORDER, formatTime, timeOfHour, worst, type BodyPart, type Indicator, type Status } from '../api.ts'
import { BodyFigure } from '../components/BodyFigure.tsx'
import type { Ctx } from '../context.ts'
import { SHAPE } from '../derive.ts'
import { t, tn } from '../i18n.ts'
import { BODY_PART_LABEL, SYMPTOM_OPTIONS } from '../symptoms.ts'
import { ValueGrid, ValueRow } from './ValueRow.tsx'
import './body.css'

// The 3D figure loads only when a person selects it, because it brings a large 3D library.
const BodyFigure3D = lazy(() => import('../components/BodyFigure3D.tsx'))
const FIGURE_KEY = 'nexxo-body-3d'
function storedThreeD() {
  try {
    return localStorage.getItem(FIGURE_KEY) === 'on'
  } catch {
    return false
  }
}

const EVIDENCE_LABEL = { strong: t('Strong evidence'), medium: t('Medium evidence'), weak: t('Weak evidence') }
// The name of each part inside a sentence, and the question of the symptom report for each part.
// Each part has its own question, because the small word before the part changes in Portuguese.
const PART_WORD: Record<BodyPart, string> = { head: t('head'), chest: t('chest'), abdomen: t('abdomen'), arms: t('arms'), legs: t('legs') }
const QUESTION: Record<BodyPart, string> = {
  head: t('What do you feel in the head?'),
  chest: t('What do you feel in the chest?'),
  abdomen: t('What do you feel in the abdomen?'),
  arms: t('What do you feel in the arms?'),
  legs: t('What do you feel in the legs?'),
}
const PLURAL: BodyPart[] = ['arms', 'legs']
const worstFirst = (a: Status, b: Status) => STATUS_ORDER.indexOf(b) - STATUS_ORDER.indexOf(a)
// The point on the figure where the line of each label ends, in a drawing of 560 by 580.
// The figure is in the middle of this drawing. The labels of the head, the chest and the abdomen are at the right.
// The classes bd-tag-<part> in body.css put each label at the height of its point.
const POINT: Record<BodyPart, [number, number]> = { head: [306, 68], chest: [303, 164], abdomen: [299, 256], arms: [205, 238], legs: [256, 412] }

// Joins names in a sentence: "head", "head and chest", "head, chest and legs".
function list(words: string[]) {
  return words.length < 2 ? words.join('') : t('{list} and {last}', { list: words.slice(0, -1).join(', '), last: words[words.length - 1] })
}

export default function BodySheet({ snapshot, catalog, s, crewId, crewSeries, act, focus }: Ctx) {
  // The crew member can see the body as a flat figure or as a 3D figure. The browser keeps the choice.
  const [threeD, setThreeD] = useState(storedThreeD)
  const chooseThreeD = (on: boolean) => {
    setThreeD(on)
    try {
      localStorage.setItem(FIGURE_KEY, on ? 'on' : 'off')
    } catch {
      // The choice then lasts until the page closes.
    }
  }
  const partOf = (indicatorId: string | null) => s.vitals.find((indicator) => indicator.id === indicatorId)?.bodyPart ?? null
  const [selected, setSelected] = useState<BodyPart | null>(partOf(focus))
  const [openRows, setOpenRows] = useState<string[]>(focus ? [focus] : [])
  // The shell can ask for another value while the sheet is open.
  const [seenFocus, setSeenFocus] = useState(focus)
  if (focus !== seenFocus) {
    setSeenFocus(focus)
    if (focus) {
      setSelected(partOf(focus))
      if (!openRows.includes(focus)) setOpenRows([...openRows, focus])
    }
  }
  const [busy, setBusy] = useState(false)
  const toggle = (id: string) => setOpenRows((rows) => (rows.includes(id) ? rows.filter((row) => row !== id) : [...rows, id]))
  const send = (path: string, body?: unknown) => {
    setBusy(true)
    void act(path, body).finally(() => setBusy(false))
  }

  const time = (hour: number) => `${formatTime(timeOfHour(snapshot.mission.startTime, hour))} UTC`
  const parts = catalog.bodyParts
  const vitalsOf = (part: BodyPart) => s.vitals.filter((indicator) => indicator.bodyPart === part)
  const statusOfValue = (indicator: Indicator) => s.latest(s.subject, indicator.id)?.status ?? 'normal'
  const symptomsOf = (part: BodyPart) => s.mySymptoms.filter((symptom) => symptom.bodyPart === part)

  // The status of a part: the worst of its values, and caution or worse with an open symptom.
  const statuses = {} as Record<BodyPart, Status>
  const symptomCounts: Partial<Record<BodyPart, number>> = {}
  for (const part of parts) {
    const count = symptomsOf(part).length
    statuses[part] = worst([...vitalsOf(part).map(statusOfValue), ...(count ? (['caution'] as Status[]) : [])])
    if (count) symptomCounts[part] = count
  }
  const hasData = (part: BodyPart) => vitalsOf(part).some((indicator) => s.latest(s.subject, indicator.id)) || symptomsOf(part).length > 0
  const partsInOrder = [...parts].sort((a, b) => worstFirst(statuses[a], statuses[b]))
  const notNormal = partsInOrder.filter((part) => statuses[part] !== 'normal')
  const normalParts = parts.filter((part) => statuses[part] === 'normal' && hasData(part))
  const overall = worst(parts.map((part) => statuses[part]))
  // One part takes the first text. Many parts, or the arms or the legs, take the second text.
  const many = (group: BodyPart[]) => group.length > 1 || PLURAL.includes(group[0])
  const namesOf = (group: BodyPart[]) => list(group.map((part) => PART_WORD[part]))
  const headline = notNormal.length
    ? many(notNormal)
      ? t('Your {parts} need care.', { parts: namesOf(notNormal) })
      : t('Your {parts} needs care.', { parts: namesOf(notNormal) })
    : t('All parts are normal.')

  const baselines = snapshot.baselines[s.subject] ?? {}
  const symptomHours = snapshot.symptoms.filter((symptom) => symptom.crewId === crewId).map((symptom) => symptom.hour)
  const rows = (part: BodyPart) =>
    [...vitalsOf(part)]
      .sort((a, b) => worstFirst(statusOfValue(a), statusOfValue(b)))
      .map((indicator) => (
        <ValueRow
          key={indicator.id}
          indicator={indicator}
          reading={s.latest(s.subject, indicator.id)}
          points={crewSeries[indicator.id] ?? []}
          snapshot={snapshot}
          baseline={baselines[indicator.id]}
          symptomHours={symptomHours}
          open={openRows.includes(indicator.id)}
          onToggle={() => toggle(indicator.id)}
        />
      ))
  const select = (part: BodyPart) => setSelected((current) => (current === part ? null : part))
  const statusWord = (part: BodyPart) => (
    <>
      <span aria-hidden="true">{SHAPE[statuses[part]]}</span> {STATUS_LABEL[statuses[part]]}
    </>
  )
  const groups = selected ? [selected] : partsInOrder.filter((part) => vitalsOf(part).length > 0)

  return (
    <div className="bd">
      <header className="bd-intro">
        <span className={`bd-state status-${overall}`}>
          <span aria-hidden="true">{SHAPE[overall]}</span> {STATUS_LABEL[overall]}
        </span>
        <h1 className="bd-headline">{headline}</h1>
        {notNormal.length > 0 && normalParts.length > 0 && (
          <p className="bd-sub">
            {many(normalParts) ? t('Your {parts} are normal.', { parts: namesOf(normalParts) }) : t('Your {parts} is normal.', { parts: namesOf(normalParts) })}
          </p>
        )}
      </header>

      <section className="bd-map" aria-label={t('Parts of the body')}>
        <div className="bd-map-top">
          <span className="bd-map-text">
            <span className="bd-label">{threeD ? t('Your body, in 3D') : t('Your body, front view')}</span>
            <span className="bd-hint">{threeD ? t('Drag to turn. Tap a part to see its values') : t('Tap a part to see its values')}</span>
          </span>
          <span className="segmented bd-dim" role="group" aria-label={t('Figure')}>
            <button type="button" aria-pressed={!threeD} onClick={() => chooseThreeD(false)}>2D</button>
            <button type="button" aria-pressed={threeD} onClick={() => chooseThreeD(true)}>3D</button>
          </span>
        </div>
        <div className={threeD ? 'bd-stage bd-stage-3d' : 'bd-stage'}>
          <svg className="bd-lines" viewBox="0 0 560 580" aria-hidden="true">
            {parts.map((part) => (
              <g key={part} className={selected === part ? 'bd-line bd-line-on' : 'bd-line'}>
                <path d={`M${POINT[part][0]} ${POINT[part][1]}H${POINT[part][0] < 280 ? 168 : 392}`} />
                <circle cx={POINT[part][0]} cy={POINT[part][1]} r="3.5" />
              </g>
            ))}
          </svg>
          <div className="bd-figure">
            {threeD ? (
              <Suspense fallback={<BodyFigure statuses={statuses} symptomCounts={symptomCounts} selected={selected} onSelect={select} />}>
                <BodyFigure3D statuses={statuses} symptomCounts={symptomCounts} selected={selected} onSelect={select} />
              </Suspense>
            ) : (
              <BodyFigure statuses={statuses} symptomCounts={symptomCounts} selected={selected} onSelect={select} />
            )}
          </div>
          <div className="bd-tags" role="group" aria-label={t('Select a part of the body')}>
            {parts.map((part) => {
              const count = symptomCounts[part]
              return (
                <button type="button" key={part} className={`bd-tag bd-tag-${part}`} aria-pressed={selected === part} onClick={() => select(part)}>
                  <span className="bd-tag-name display">{t(BODY_PART_LABEL[part])}</span>
                  {hasData(part) ? (
                    <span className={`bd-tag-word status-${statuses[part]}`}>{statusWord(part)}</span>
                  ) : (
                    <span className="bd-tag-word bd-tag-empty">{t('No values')}</span>
                  )}
                  {count ? (
                    <span className="bd-tag-count">
                      {/* The eye sees the number. A screen reader reads the full text. */}
                      <span aria-hidden="true">{count}</span>
                      <span className="bd-hide">{tn(count, '{count} open symptom', '{count} open symptoms')}</span>
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bd-values" aria-label={t('Body values')} data-view={selected ? 'part' : 'all'}>
        {groups.map((part) => (
          <div className={`bd-group ${selected || statuses[part] !== 'normal' ? 'bd-group-main' : ''}`} key={part}>
            <div className="bd-group-top">
              <h2 className="bd-part-head">{t(BODY_PART_LABEL[part])}</h2>
              {hasData(part) && <span className={`bd-part-status status-${statuses[part]}`}>{statusWord(part)}</span>}
              {selected && (
                <button type="button" className="pill bd-all" onClick={() => setSelected(null)}>
                  {t('Show all parts')}
                </button>
              )}
            </div>
            {vitalsOf(part).length ? <ValueGrid>{rows(part)}</ValueGrid> : <p className="bd-none">{t('The app has no values for this part.')}</p>}
          </div>
        ))}
      </section>

      <section className="bd-symptoms bd-card" aria-label={t('Open symptoms')}>
        <h2 className="bd-label">{t('Open symptoms')}</h2>
        {s.mySymptoms.length === 0 && <p className="bd-quiet">{t('You have no open symptoms.')}</p>}
        {s.mySymptoms.map((symptom) => {
          const explanation = symptom.explanation
          return (
            <article className="bd-symptom" key={symptom.id}>
              <div className="bd-symptom-top">
                <div className="bd-symptom-what">
                  <span className="bd-symptom-name display">{t(symptom.name)}</span>
                  <span className="bd-symptom-when">
                    {t('{part} · since {time}', { part: t(BODY_PART_LABEL[symptom.bodyPart]), time: time(symptom.hour) })}
                  </span>
                </div>
                <button type="button" className="btn bd-better" disabled={busy} onClick={() => send(`/symptoms/${symptom.id}/resolve`)}>
                  {t('I feel better')}
                </button>
              </div>
              {explanation?.urgent && (
                <p className="bd-urgent">
                  <span aria-hidden="true">{SHAPE.alert}</span> {t('This symptom can be an emergency. Tell the crew medical officer and the ground team now.')}
                </p>
              )}
              {explanation && explanation.causes.length > 0 && (
                <>
                  <h3 className="bd-causes-title">{t('Possible causes in your data')}</h3>
                  <ol className="bd-causes">
                    {explanation.causes.map((cause) => (
                      <li key={cause.id}>
                        <div className="bd-cause-top">
                          <strong>{cause.title}</strong>
                          <span className={`source bd-evidence-${cause.evidence}`}>{EVIDENCE_LABEL[cause.evidence]}</span>
                        </div>
                        <p className="bd-cause-detail">{cause.detail}</p>
                        <p className="bd-cause-action">{cause.action}</p>
                      </li>
                    ))}
                  </ol>
                </>
              )}
              {explanation && explanation.causes.length === 0 && <p className="bd-quiet">{t('The app found no cause in your data.')}</p>}
              {explanation && explanation.others.length > 0 && (
                <p className="bd-quiet">
                  {tn(explanation.others.length, '{names} also reports this symptom.', '{names} also report this symptom.', { names: list(explanation.others) })}
                </p>
              )}
            </article>
          )
        })}
      </section>

      <section className="bd-report bd-card" aria-label={t('Report a symptom')}>
        <h2 className="bd-label">{t('Report a symptom')}</h2>
        {selected ? (
          <>
            <p className="bd-question display">{QUESTION[selected]}</p>
            <div className="bd-options" key={selected}>
              {SYMPTOM_OPTIONS[selected].map((name) => {
                const reported = symptomsOf(selected).some((symptom) => symptom.name === name)
                return (
                  <button
                    type="button"
                    key={name}
                    className="btn bd-option"
                    disabled={busy || reported}
                    onClick={() => send('/symptoms', { crewId, bodyPart: selected, name })}
                  >
                    {t(name)}
                    {reported && <span className="bd-option-done">{t('reported')}</span>}
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <p className="bd-quiet">{t('Select a part of the body first.')}</p>
        )}
      </section>

      <p className="bd-note">{t('The body values come from a model, not from a real crew. The tag of each value shows its source.')}</p>
    </div>
  )
}
