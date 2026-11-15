// A page for tests of the life support card, the calibration card, and the mission picker.
// Part 1 uses MADE-UP data from the small model in this file. No number here is from a source.
// Part 2 uses the real model in shared/trip/lifesupport.ts and shared/trip/calibration.ts, if those files exist.
// Options in the address: ?only=picker, ?only=life, ?only=calibration, ?only=real, ?preset=iss.
import { StrictMode, useEffect, useState, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import '@fontsource/sora/latin-500.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '../index.css'
import type { Cdra } from '../../../shared/co2.ts'
import { nominalLife } from '../../../shared/trip/defaults.ts'
import { PRESETS, PRESET_BY_ID } from '../../../shared/trip/presets/index.ts'
import { DEFAULT_SCHEDULE, PRESET_IDS, type Activity, type CabinForecast, type LifeSupport, type Preset, type PresetId, type Schedule, type SourceRef } from '../../../shared/trip/types.ts'
import { LANGS, lang, setLang } from '../i18n.ts'
import { ptBR } from '../locales/pt-BR.ts'
import { tripW4 } from '../locales/pt-BR/trip-w4.ts'
import type { CalibrationResult } from './CalibrationCard.tsx'

// The lead merges the Portuguese file of this task into pt-BR.ts later. Until then this page adds
// its texts here. The components load after that, because some of them make their texts when they load.
Object.assign(ptBR, { ...tripW4, ...ptBR })
const { CalibrationCard } = await import('./CalibrationCard.tsx')
const { LifeCard } = await import('./LifeCard.tsx')
const { MissionPicker } = await import('./MissionPicker.tsx')

const query = new URLSearchParams(location.search)
const only = query.get('only')
const firstPreset = PRESET_IDS.find((id) => id === query.get('preset')) ?? 'msl'

// ---------------------------------------------------------------------------------------
// Made-up data. The small model below only gives curves with the right look.
// ---------------------------------------------------------------------------------------
const STEP_HOURS = 5 / 60
const FAKE_SOURCE: SourceRef = { short: 'Made-up source', title: 'A made-up source for the test page. It is not real', url: 'https://example.org/made-up' }

function activityAt(hourOfDay: number, schedule: Schedule): Activity {
  const hour = ((hourOfDay % 24) + 24) % 24
  const inSpan = (start: number, length: number) => (hour - start + 24) % 24 < length
  if (inSpan(schedule.sleepStartHour, schedule.sleepHours)) return 'sleep'
  if (schedule.exerciseStartHours.some((start) => inSpan(start, schedule.exerciseMinutes / 60))) return 'exercise'
  return 'nominal'
}

type FakeOptions = {
  // The hour of the day at "now", from 0 to 24.
  nowHour: number
  // The settings from "now" on. Before "now" the cabin has the nominal settings.
  scrubber: Cdra
  ogaOn: boolean
  bottledO2Kg: number
  sabatier: boolean
}

// CO2: the crew adds a rate by activity, and the scrubber removes a part of what is above "zero".
const CO2 = { make: { sleep: 0.76, nominal: 1.01, exercise: 1.77 }, removal: 0.4, zero: 0.22 }
// O2: the crew uses a rate by activity, in mmHg each hour. 1 kg of O2 is about 5.76 mmHg in this made-up cabin.
const O2 = { use: { sleep: 0.64, nominal: 0.8, exercise: 1.76 }, mmHgPerKg: 5.76 }
const UNITS: Record<Cdra, number> = { both: 1, one: 0.5, off: 0 }

function fakeForecast(options: FakeOptions): CabinForecast {
  const schedule = DEFAULT_SCHEDULE
  const pastSteps = 10 * 24 * 12
  const nextSteps = 30 * 24 * 12
  // The O2 that the generator makes each hour: what the crew uses in a mean hour of the day.
  let dayUse = 0
  for (let step = 0; step < 288; step++) dayUse += O2.use[activityAt(step * STEP_HOURS, schedule)]
  const generator = dayUse / 288

  const series: { hour: number; co2MmHg: number; o2MmHg: number; activity: Activity; bottledO2Kg: number }[] = []
  let co2 = 2.6
  let o2 = 150
  let bottled = options.bottledO2Kg
  for (let step = -pastSteps; step <= nextSteps; step++) {
    const hour = step * STEP_HOURS
    const activity = activityAt(options.nowHour + hour, schedule)
    series.push({ hour, co2MmHg: co2, o2MmHg: o2, activity, bottledO2Kg: bottled })
    const failed = step >= 0
    const units = UNITS[failed ? options.scrubber : 'both']
    co2 += (CO2.make[activity] - CO2.removal * units * Math.max(0, co2 - CO2.zero)) * STEP_HOURS
    const use = O2.use[activity] * STEP_HOURS
    if (!failed || options.ogaOn) o2 += generator * STEP_HOURS - use
    else if (bottled > 0) bottled = Math.max(0, bottled - use / O2.mmHgPerKg)
    else o2 -= use
  }
  const nowIndex = pastSteps
  const now = series[nowIndex]
  const future = series.slice(nowIndex)

  // The mean of a full day, 20 days after the settings changed.
  let dailyMean: number | null = null
  if (options.scrubber !== 'off') {
    const day = series.slice(nowIndex + 20 * 288, nowIndex + 21 * 288)
    dailyMean = day.reduce((sum, point) => sum + point.co2MmHg, 0) / day.length
  }

  return {
    now: { co2MmHg: now.co2MmHg, o2MmHg: now.o2MmHg, activity: now.activity, bottledO2Kg: now.bottledO2Kg },
    pastCo2MmHg: series.slice(nowIndex - 7 * 288 + 1, nowIndex + 1).map((point) => point.co2MmHg),
    chart: series.slice(nowIndex - 24 * 12, nowIndex + 48 * 12 + 1).map(({ hour, co2MmHg, o2MmHg, activity }) => ({ hour, co2MmHg, o2MmHg, activity })),
    nextCo2MmHg: future.slice(0, 24 * 12 + 1).map((point) => point.co2MmHg),
    hoursToCo2: (target) => {
      if (now.co2MmHg >= target) return 0
      const point = future.find((item) => item.co2MmHg >= target)
      return point ? point.hour : null
    },
    hoursToO2: (target) => {
      const point = target <= now.o2MmHg ? future.find((item) => item.o2MmHg < target) : future.find((item) => item.o2MmHg > target)
      return point ? point.hour : null
    },
    dailyMeanCo2MmHg: dailyMean,
    o2LoopClosure: options.sabatier ? 0.46 : 0,
  }
}

const baseLife: LifeSupport = { ...nominalLife(PRESET_BY_ID.msl), crew: 4, freeVolumeM3: 100 }
const SCENARIOS: { title: string; options: FakeOptions; life: LifeSupport }[] = [
  {
    title: 'A nominal day (now: 13:00, Sabatier reactor on)',
    options: { nowHour: 13, scrubber: 'both', ogaOn: true, bottledO2Kg: 0, sabatier: true },
    life: { ...baseLife, sabatier: true },
  },
  {
    title: 'Scrubber failure: one bed from now on (now: 06:30)',
    options: { nowHour: 6.5, scrubber: 'one', ogaOn: true, bottledO2Kg: 0, sabatier: false },
    life: { ...baseLife, scrubber: 'one' },
  },
  {
    title: 'Scrubber off from now on (now: 15:00)',
    options: { nowHour: 15, scrubber: 'off', ogaOn: true, bottledO2Kg: 0, sabatier: false },
    life: { ...baseLife, scrubber: 'off' },
  },
  {
    title: 'Generator failure with 6.5 kg of O2 in bottles (now: 20:00)',
    options: { nowHour: 20, scrubber: 'both', ogaOn: false, bottledO2Kg: 6.5, sabatier: false },
    life: { ...baseLife, ogaOn: false, bottledO2Kg: 6.5 },
  },
  {
    title: 'Generator failure with no bottles, 30 hours ago in effect (now: 09:00, 1 person)',
    options: { nowHour: 9, scrubber: 'both', ogaOn: false, bottledO2Kg: 0, sabatier: false },
    life: { ...baseLife, crew: 1, ogaOn: false },
  },
]

// A small random generator with a seed, so each load of the page gives the same curves.
function random(seed: number) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function fakeCalibration(): CalibrationResult {
  const crew = [
    { fromHour: 0, count: 6, source: FAKE_SOURCE },
    { fromHour: 300, count: 3, source: FAKE_SOURCE },
    { fromHour: 430, count: 6, source: { ...FAKE_SOURCE, url: '' } },
  ]
  const next = random(9)
  const hours: number[] = []
  const realMmHg: number[] = []
  const modelMmHg: number[] = []
  let model = 2.65
  let drift = 0
  for (let hour = 0; hour <= 33 * 24; hour += 0.5) {
    const count = [...crew].reverse().find((item) => hour >= item.fromHour)!.count
    const balance = 0.22 + (count * 1.04) / 2.58
    model += (balance - model) * 0.04
    drift = drift * 0.97 + (next() - 0.5) * 0.12
    hours.push(hour)
    modelMmHg.push(model + 0.12 * Math.sin((hour / 24) * 2 * Math.PI))
    realMmHg.push(model + drift + 0.25 * Math.sin((hour / 24) * 2 * Math.PI + 0.6) + (next() - 0.5) * 0.15 + 0.09)
  }
  const errors = modelMmHg.map((value, index) => value - realMmHg[index])
  return {
    hours,
    realMmHg,
    modelMmHg,
    rmsMmHg: Math.sqrt(errors.reduce((sum, error) => sum + error * error, 0) / errors.length),
    meanErrorMmHg: errors.reduce((sum, error) => sum + error, 0) / errors.length,
    crew,
    removalPerMmHgKgDay: 2.58,
    note: 'Made-up note of the test page: the model follows the record when the crew count changes, but it does not show the fast changes of the record.',
  }
}

// Presets with all texts, to see the picker with full data. All of it is made up.
const FULL_PRESETS: Preset[] = PRESETS.map((preset, index) => ({
  ...preset,
  summary: preset.summary || 'Made-up summary of the test page: one sentence that tells what this mission is and why the page shows it.',
  cabin:
    index % 2 === 0
      ? { name: preset.cabin.name || 'Made-up cabin', freeVolumeM3: preset.cabin.freeVolumeM3, source: FAKE_SOURCE }
      : { name: preset.cabin.name || 'Made-up cabin', freeVolumeM3: preset.cabin.freeVolumeM3, assumption: 'made-up reason of the test page, because no document gives the free volume.' },
  trajectory: { ...preset.trajectory, source: FAKE_SOURCE, note: preset.trajectory.note || 'Made-up note: the path comes from a made-up file with one point each hour.' },
  findings: preset.findings?.length
    ? preset.findings
    : [
        { text: 'Made-up finding one of the test page, with a number: 1.23 units each day.', source: FAKE_SOURCE },
        { text: 'Made-up finding two. It is longer, so the page shows how a long finding wraps over two or three lines on a phone and on a wide screen.', source: { ...FAKE_SOURCE, short: 'Second made-up source 2013' } },
      ],
  flags: preset.flags.length ? preset.flags : ['Made-up note of the preset: the instrument was behind more shielding than a crew cabin has.'],
  sources: preset.sources.length
    ? preset.sources
    : [FAKE_SOURCE, { short: 'Second made-up source 2013', title: 'A second made-up source with a long title, a journal name, a volume, and page numbers 1080 to 1084', url: 'https://example.org/second', credit: 'Made-up credit line of the data owner.' }, { short: 'Made-up source with no link', title: '', url: '' }],
}))

// ---------------------------------------------------------------------------------------
// Part 2: the real model, if its files exist. A glob gives an empty list for a file that is missing, so the page still loads.
// ---------------------------------------------------------------------------------------
const lifeFiles = import.meta.glob('../../../shared/trip/lifesupport.ts')
const calibrationFiles = import.meta.glob('../../../shared/trip/calibration.ts')
type AnyModule = Record<string, unknown>

function useModule(files: Record<string, () => Promise<unknown>>): { state: 'missing' | 'loading' | 'failed' | 'ready'; module?: AnyModule; error?: string } {
  const load = Object.values(files)[0]
  const [result, setResult] = useState<{ module?: AnyModule; error?: string }>({})
  useEffect(() => {
    if (!load) return
    load().then(
      (module) => setResult({ module: module as AnyModule }),
      (error: unknown) => setResult({ error: String(error) }),
    )
  }, [load])
  if (!load) return { state: 'missing' }
  if (result.error) return { state: 'failed', error: result.error }
  return result.module ? { state: 'ready', module: result.module } : { state: 'loading' }
}

// What the test page uses of shared/trip/lifesupport.ts.
type LifeModule = {
  cabinForecast: (nominal: LifeSupport, current: LifeSupport, changedDay: number, day: number) => CabinForecast
  dailyTotals: (life: Pick<LifeSupport, 'metabolic' | 'schedule'>) => { o2Kg: number; co2Kg: number }
  METABOLIC: Record<string, { label: string; source: SourceRef }>
}

// The settings of each real scenario: what changes, on which mission day it changes, and the day of the cursor.
const REAL_SCENARIOS: { title: string; change: Partial<LifeSupport>; changedDay: number; day: number }[] = [
  { title: 'nothing wrong, day 12 at 13:00', change: {}, changedDay: 0, day: 12 + 13 / 24 },
  { title: 'Sabatier reactor on and the rates of the long mission, day 12 at 08:10', change: { sabatier: true, metabolic: 'exercise90', schedule: { ...DEFAULT_SCHEDULE, exerciseStartHours: [8], exerciseMinutes: 90 } }, changedDay: 0, day: 12 + 8.17 / 24 },
  { title: 'scrubber on one bed from day 12 at 06:00, now 09:00', change: { scrubber: 'one' }, changedDay: 12.25, day: 12.375 },
  { title: 'scrubber off from day 12 at 06:00, now 07:00', change: { scrubber: 'off' }, changedDay: 12.25, day: 12 + 7 / 24 },
  { title: 'generator off with 5 kg of O2 in bottles from day 12 at 00:00, now 12:00', change: { ogaOn: false, bottledO2Kg: 5 }, changedDay: 12, day: 12.5 },
  { title: 'generator off with no bottles from day 10, now day 12 at 23:00', change: { ogaOn: false }, changedDay: 10, day: 12 + 23 / 24 },
]

function RealLife({ module, preset }: { module: LifeModule; preset: Preset }) {
  const nominal = nominalLife(preset)
  return (
    <>
      {REAL_SCENARIOS.map((scenario) => {
        const life: LifeSupport = { ...nominal, ...scenario.change }
        // The model runs here, so a problem in it shows as a text and the page stays.
        let made: { forecast: CabinForecast; totals: { o2Kg: number; co2Kg: number }; metabolic: { label: string; source: SourceRef } } | null = null
        let problem = ''
        try {
          made = { forecast: module.cabinForecast(nominal, life, scenario.changedDay, scenario.day), totals: module.dailyTotals(life), metabolic: module.METABOLIC[life.metabolic] }
        } catch (error) {
          problem = String(error)
        }
        const card = made ? (
          <LifeCard forecast={made.forecast} life={life} nominalDailyCo2Kg={made.totals.co2Kg} nominalDailyO2Kg={made.totals.o2Kg} metabolicLabel={made.metabolic.label} metabolicSource={made.metabolic.source} />
        ) : (
          <p style={hint}>The real model failed: {problem}</p>
        )
        return (
          <div key={scenario.title} style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(0, 1fr)' }}>
            <h2 style={heading}>
              Life support, real model, preset "{preset.id}": {scenario.title}
            </h2>
            {card}
          </div>
        )
      })}
    </>
  )
}

// The real check: the hourly means of the record come from the server, and shared/trip/calibration.ts runs the model.
type RecordAbout = { hourly: number[]; startTime: string; source: { credit: string; mission: string } }
type CalibrationModule = { issCalibration: (hourlyPpm: number[], startMs: number) => CalibrationResult }

function RealCalibration({ module }: { module: CalibrationModule }) {
  const [about, setAbout] = useState<RecordAbout | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    fetch('/api/state')
      .then((answer) => answer.json())
      .then(
        (data: { about: RecordAbout }) => setAbout(data.about),
        (problem: unknown) => setError(String(problem)),
      )
  }, [])
  if (error) return <p style={hint}>The server gave no record: {error}</p>
  if (!about) return <p style={hint}>Loading the record from the server…</p>
  if (!Array.isArray(about.hourly)) return <p style={hint}>This server gives no hourly means of the record.</p>
  let result: CalibrationResult | null = null
  let problem = ''
  try {
    result = module.issCalibration(about.hourly, Date.parse(about.startTime))
  } catch (failure) {
    problem = String(failure)
  }
  if (!result) return <p style={hint}>The real calibration failed: {problem}</p>
  return <CalibrationCard result={result} credit={about.source.credit} mission={about.source.mission} />
}

function RealPart({ preset }: { preset: Preset }) {
  const life = useModule(lifeFiles)
  const calibration = useModule(calibrationFiles)
  const lifeReady = life.module && typeof life.module.cabinForecast === 'function' && typeof life.module.dailyTotals === 'function' && life.module.METABOLIC
  const calibrationReady = calibration.module && typeof calibration.module.issCalibration === 'function'
  return (
    <>
      <h2 style={heading}>Part 2: the real model</h2>
      <p style={hint}>
        shared/trip/lifesupport.ts: {life.state}
        {life.error ? ` (${life.error})` : ''}
        {life.module && !lifeReady ? `. The page does not know these exports: ${Object.keys(life.module).join(', ')}` : ''}
      </p>
      {lifeReady && <RealLife module={life.module as unknown as LifeModule} preset={preset} />}
      <p style={hint}>
        shared/trip/calibration.ts: {calibration.state}
        {calibration.error ? ` (${calibration.error})` : ''}
        {calibration.module && !calibrationReady ? `. The page does not know these exports: ${Object.keys(calibration.module).join(', ')}` : ''}
      </p>
      {calibrationReady && (
        <>
          <h2 style={heading}>Calibration, real model against the real record</h2>
          <RealCalibration module={calibration.module as unknown as CalibrationModule} />
        </>
      )}
    </>
  )
}

const heading = { fontSize: '1.125rem', marginTop: 24 } as const
const hint = { fontSize: '0.8125rem', color: 'var(--text-muted)' } as const

function Part({ id, children }: { id: string; children: ReactNode }) {
  return only && only !== id ? null : <>{children}</>
}

export function Page() {
  const [current, setCurrent] = useState<PresetId>(firstPreset)
  return (
    <div style={{ maxWidth: 1360, margin: '0 auto', padding: '16px var(--gutter) 48px', display: 'grid', gap: 20, gridTemplateColumns: 'minmax(0, 1fr)' }}>
      <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h1 style={{ fontSize: '1.25rem' }}>Test page W4: made-up data</h1>
        <div className="segmented" role="group" aria-label="Language">
          {LANGS.map((item) => (
            <button type="button" key={item.id} aria-pressed={lang === item.id} onClick={() => setLang(item.id)}>
              {item.short}
            </button>
          ))}
        </div>
      </header>

      <Part id="picker">
        <h2 style={heading}>Mission picker: the presets of shared/trip/presets, as they are now</h2>
        <MissionPicker presets={PRESETS} current={current} onPick={setCurrent} />
        <h2 style={heading}>Mission picker: the same presets with made-up texts in each empty place, and no "onPick"</h2>
        <MissionPicker presets={FULL_PRESETS} current={current} />
      </Part>

      <Part id="life">
        {SCENARIOS.map((scenario, index) => (
          <div key={scenario.title} style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(0, 1fr)', maxWidth: index === 2 ? 620 : undefined }}>
            <h2 style={heading}>Life support, made-up data: {scenario.title}</h2>
            <LifeCard
              forecast={fakeForecast(scenario.options)}
              life={scenario.life}
              nominalDailyCo2Kg={1.11}
              nominalDailyO2Kg={0.77}
              metabolicLabel="Made-up rates of the test page"
              metabolicSource={FAKE_SOURCE}
            />
          </div>
        ))}
      </Part>

      <Part id="calibration">
        <h2 style={heading}>Calibration, made-up curves</h2>
        <CalibrationCard result={fakeCalibration()} credit="Made-up credit line of the test page: the data owner asks for this text next to the data." />
      </Part>

      <Part id="real">
        <RealPart preset={PRESET_BY_ID[current]} />
      </Part>
    </div>
  )
}

// The live reload of the test server can run this file again. The page then keeps its first root.
const container = document.getElementById('root') as HTMLElement & { w4Root?: Root }
container.w4Root ??= createRoot(container)
container.w4Root.render(
  <StrictMode>
    <Page />
  </StrictMode>,
)
