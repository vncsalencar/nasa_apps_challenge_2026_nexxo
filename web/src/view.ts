// Turns the live data into the numbers that the pages show. All math is in shared/co2.ts.
import {
  BANDS,
  HEADACHE,
  LIMIT_1H_MMHG,
  STEP_MINUTES,
  WINDOWS,
  intensity,
  modelOf,
  ppmToMmHg,
  project,
  rateAt,
  regionHeat,
  relativeOdds,
  rollingMean,
  thresholds,
  timeTo,
  type Band,
  type WindowId,
} from '../../shared/co2.ts'
import type { CSSProperties } from 'react'
import { heatMix, type Heat } from './components/heat.ts'
import { fmt, lang, t } from './i18n.ts'
import { SOURCE, type Live } from './live.ts'

export type WindowView = {
  id: WindowId
  hours: number
  mmHg: number
  ppm: number
  // False while the series is shorter than the window.
  complete: boolean
  // The hours of data that the average has.
  hoursOfData: number
}

export type Countdown = {
  target: number
  // Where the value is now, compared with the target.
  side: 'below' | 'above'
  // Hours until the model crosses the target. null: the model never crosses it.
  hours: number | null
}

export type ChartPoint = {
  // Hours from now. A past value has a negative number.
  hour: number
  record?: number
  simulated?: number
  projection?: number
  source: 'record' | 'model' | 'manual' | 'projection'
}

// How many hours the chart shows before now and after now.
export const CHART_PAST_HOURS = 24
export const CHART_NEXT_HOURS = 24

export function viewOf(live: Live, localPpm?: number) {
  const { params, crew, cdra } = live.state
  const pressure = params.totalPressureMmHg
  // The simulator page shows the value of its slider at once, before the server answers.
  const ppm = localPpm === undefined ? live.ppm : [...live.ppm.slice(0, -1), localPpm]
  const nowPpm = ppm[ppm.length - 1]
  const now = ppmToMmHg(nowPpm, pressure)
  const nowSource = localPpm === undefined ? live.src[live.src.length - 1] : SOURCE.manual

  const windows: WindowView[] = WINDOWS.map((window) => {
    const average = rollingMean(ppm, window.steps)!
    return {
      id: window.id,
      hours: window.hours,
      ppm: average.mean,
      mmHg: ppmToMmHg(average.mean, pressure),
      complete: average.count === average.steps,
      hoursOfData: (average.count * STEP_MINUTES) / 60,
    }
  })
  const week = windows[2]

  const model = modelOf(params, crew, cdra)
  const rate = rateAt(now, model)
  // The record has one decimal of ppm, so a value "at" a target can be a little below it.
  const NEAR = 0.005
  const countdowns: Countdown[] = thresholds().map((target) => {
    if (now < target - NEAR) return { target, side: 'below', hours: timeTo(now, target, model) }
    // At or above the target: the time until a falling value goes below it.
    return { target, side: 'above', hours: rate < 0 && now > target ? timeTo(now, target, model) : null }
  })

  const heat = regionHeat(now)
  // A small region lies on top of a part. When it is active, it is never cooler than the part below it.
  const onTop = (own: number, below: number) => (own > 0 ? Math.max(own, below) : 0)
  const head = Math.max(heat.body, heat.head)
  const figure: Heat = {
    head,
    chest: heat.body,
    abdomen: heat.body,
    arms: heat.body,
    legs: heat.body,
    brain: onTop(heat.brain, head),
    eyes: onTop(heat.eyes, head),
    face: onTop(heat.face, head),
    airway: onTop(heat.airway, heat.body),
  }

  // The chart: the last 24 hours, and the next 24 hours from the model.
  const past = Math.min(ppm.length, (CHART_PAST_HOURS * 60) / STEP_MINUTES + 1)
  const chart: ChartPoint[] = []
  const sourceAt = (index: number) => (index === ppm.length - 1 ? nowSource : live.src[index])
  for (let index = ppm.length - past; index < ppm.length; index++) {
    const real = sourceAt(index) === SOURCE.record
    const before = index > 0 && sourceAt(index - 1) === SOURCE.record
    const value = ppmToMmHg(ppm[index], pressure)
    const source = real ? 'record' : sourceAt(index) === SOURCE.model ? 'model' : 'manual'
    const point: ChartPoint = { hour: ((index - ppm.length + 1) * STEP_MINUTES) / 60, source }
    if (real) point.record = value
    else point.simulated = value
    // Where the source changes, the point belongs to both lines, so the lines join.
    if (index > ppm.length - past && real !== before) {
      point.record = value
      point.simulated = value
    }
    chart.push(point)
  }
  const future = project(now, CHART_NEXT_HOURS, model)
  chart[chart.length - 1].projection = now
  future.slice(1).forEach((value, index) => chart.push({ hour: ((index + 1) * STEP_MINUTES) / 60, projection: value, source: 'projection' }))

  return {
    pressure,
    nowPpm,
    now,
    nowSource,
    // The change of the last hour in the data, in mmHg. null: the series is too short.
    lastHour: ppm.length > 12 ? now - ppmToMmHg(ppm[ppm.length - 13], pressure) : null,
    windows,
    overLimit: windows[0].mmHg > LIMIT_1H_MMHG,
    // The odds from the 7-day average. null below the range of the study.
    odds: week.mmHg >= HEADACHE.studyFloorMmHg ? relativeOdds(week.mmHg) : null,
    model,
    rate,
    countdowns,
    toLimit: countdowns.find((item) => item.target === LIMIT_1H_MMHG)!,
    bands: BANDS.map((band) => ({ band, intensity: intensity(now, band) })),
    heat,
    figure,
    chart,
  }
}
export type View = ReturnType<typeof viewOf>
export type BandView = { band: Band; intensity: number }

// A time span for a person: "25 min", "5 h 20 min", "2 d 4 h".
export function formatDuration(hours: number): string {
  const minutes = Math.round(hours * 60)
  if (minutes < 1) return t('less than 1 min')
  if (minutes < 60) return t('{minutes} min', { minutes })
  if (minutes < 48 * 60) {
    const rest = minutes % 60
    return rest ? t('{hours} h {minutes} min', { hours: Math.floor(minutes / 60), minutes: rest }) : t('{hours} h', { hours: minutes / 60 })
  }
  const allHours = Math.round(hours)
  const rest = allHours % 24
  return rest ? t('{days} d {hours} h', { days: Math.floor(allHours / 24), hours: rest }) : t('{days} d', { days: allHours / 24 })
}

// A date and a time in UTC, in the way of the language: "25 Aug 2017, 15:43".
export function formatTime(ms: number): string {
  return new Date(ms).toLocaleString(lang, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })
}

export const mmHgText = (value: number, decimals = 2) => `${fmt(value, decimals)} mmHg`
export const ppmText = (value: number) => `${fmt(Math.round(value))} ppm`
// A band as text: "2.3 to 2.7 mmHg", or "from 3.5 mmHg" for a band with one value.
export function bandText(band: Pick<Band, 'from' | 'to'>): string {
  return band.to === null ? t('from {from} mmHg', { from: fmt(band.from, 1) }) : t('{from} to {to} mmHg', { from: fmt(band.from, 1), to: fmt(band.to, 1) })
}

// Where the value is in a band, as a short text.
export function bandState(band: Band, value: number): string {
  if (value <= 0) return t('Not reached now.')
  if (band.to === null) return t('Reached now.')
  return value >= 1 ? t('At or past the end of the band now.') : t('{percent}% into the band now.', { percent: Math.round(value * 100) })
}

// The color of a heat value, as on the body figure.
export function heatColor(heat: number): string {
  const mix = heatMix(heat)
  return `color-mix(in oklab, color-mix(in oklab, var(--critical) ${Math.round(mix.toCritical * 100)}%, var(--warning)) ${Math.round(mix.amount * 100)}%, var(--border-strong))`
}
export const heatStyle = (heat: number): CSSProperties => ({ background: heatColor(heat) })
