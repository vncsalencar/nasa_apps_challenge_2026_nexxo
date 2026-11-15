// Turns CO2 data into the numbers that the pages show. All math is in shared/co2.ts.
//
// The cards read a "Co2View". viewFrom() makes it from a "Co2Feed": the values of the last
// 7 days and what a model says about the next hours. Each page builds its own feed:
//   the CO2 page and the simulator page  viewOf(live), with the cabin model of shared/co2.ts
//   the trip page                        viewFrom(feedOfForecast(forecast, pressure))
import {
  BANDS,
  HEADACHE,
  LIMIT_1H_MMHG,
  STEPS_PER_HOUR,
  STEP_MINUTES,
  WINDOWS,
  intensity,
  mmHgToPpm,
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
import type { CabinForecast } from '../../shared/trip/types.ts'
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

// What a page gives to viewFrom(): the CO2 values and the answers of its model.
export type Co2Feed = {
  // The total pressure of the cabin, in mmHg. It converts ppm to mmHg.
  pressure: number
  // The values of the last 7 days in ppm, one each 5 minutes. The last one is the value now.
  // A shorter series is fine: an average then tells that it is not complete.
  ppm: number[]
  // The source of each value: SOURCE.record, SOURCE.model, or SOURCE.manual.
  src: number[]
  // The change of the CO2 now, in mmHg for each hour.
  rate: number
  // The value where the model stops, in mmHg. Infinity: the model has no such value.
  balance: number
  // The CO2 of the next 24 hours from the model in mmHg, one value each 5 minutes. The first one is the value now.
  next: number[]
  // The hours until the model reaches this value, from below or from above. 0: at it now. null: never.
  hoursTo: (targetMmHg: number) => number | null
}

export function viewFrom(feed: Co2Feed) {
  const { pressure, ppm, src, rate, balance } = feed
  const nowPpm = ppm[ppm.length - 1]
  const now = ppmToMmHg(nowPpm, pressure)
  const nowSource = src[src.length - 1]

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

  // The record has one decimal of ppm, so a value "at" a target can be a little below it.
  const NEAR = 0.005
  const countdowns: Countdown[] = thresholds().map((target) => {
    if (now < target - NEAR) return { target, side: 'below', hours: feed.hoursTo(target) }
    // At or above the target: the time until the value goes below it. A value that is not above
    // the target gets no time. The cabin model of shared/co2.ts gives a time only for a falling value.
    return { target, side: 'above', hours: now > target ? feed.hoursTo(target) : null }
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
  const past = Math.min(ppm.length, CHART_PAST_HOURS * STEPS_PER_HOUR + 1)
  const chart: ChartPoint[] = []
  for (let index = ppm.length - past; index < ppm.length; index++) {
    const real = src[index] === SOURCE.record
    const before = index > 0 && src[index - 1] === SOURCE.record
    const value = ppmToMmHg(ppm[index], pressure)
    const source = real ? 'record' : src[index] === SOURCE.model ? 'model' : 'manual'
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
  chart[chart.length - 1].projection = now
  feed.next.slice(1, CHART_NEXT_HOURS * STEPS_PER_HOUR + 1).forEach((value, index) => chart.push({ hour: ((index + 1) * STEP_MINUTES) / 60, projection: value, source: 'projection' }))

  return {
    pressure,
    nowPpm,
    now,
    nowSource,
    // The change of the last hour in the data, in mmHg. null: the series is too short.
    lastHour: ppm.length > STEPS_PER_HOUR ? now - ppmToMmHg(ppm[ppm.length - 1 - STEPS_PER_HOUR], pressure) : null,
    windows,
    overLimit: windows[0].mmHg > LIMIT_1H_MMHG,
    // The odds from the 7-day average. null below the range of the study.
    odds: week.mmHg >= HEADACHE.studyFloorMmHg ? relativeOdds(week.mmHg) : null,
    rate,
    balance,
    countdowns,
    toLimit: countdowns.find((item) => item.target === LIMIT_1H_MMHG)!,
    bands: BANDS.map((band) => ({ band, intensity: intensity(now, band) })),
    heat,
    figure,
    chart,
  }
}
// What the CO2 cards show. It does not tell which model made the numbers.
export type Co2View = ReturnType<typeof viewFrom>

// The view of the CO2 page and of the simulator page: the live data with the cabin model of shared/co2.ts.
export function viewOf(live: Live, localPpm?: number) {
  const { params, crew, cdra } = live.state
  const pressure = params.totalPressureMmHg
  // The simulator page shows the value of its slider at once, before the server answers.
  const ppm = localPpm === undefined ? live.ppm : [...live.ppm.slice(0, -1), localPpm]
  const src = localPpm === undefined ? live.src : [...live.src.slice(0, -1), SOURCE.manual]
  const now = ppmToMmHg(ppm[ppm.length - 1], pressure)
  const model = modelOf(params, crew, cdra)
  const view = viewFrom({
    pressure,
    ppm,
    src,
    rate: rateAt(now, model),
    balance: model.balance,
    next: project(now, CHART_NEXT_HOURS, model),
    hoursTo: (target) => timeTo(now, target, model),
  })
  // The simulator page still reads "model". A card reads "rate" and "balance".
  return { ...view, model }
}
// A Co2View with the cabin model. Each card accepts it.
export type View = ReturnType<typeof viewOf>
export type BandView = { band: Band; intensity: number }

// The feed of the trip page: the CO2 forecast of the life support model (shared/trip/lifesupport.ts).
// Each value is a value of the model, so the cards mark it as simulated.
export function feedOfForecast(forecast: CabinForecast, totalPressureMmHg: number): Co2Feed {
  const next = forecast.nextCo2MmHg
  return {
    pressure: totalPressureMmHg,
    ppm: forecast.pastCo2MmHg.map((mmHg) => mmHgToPpm(mmHg, totalPressureMmHg)),
    src: forecast.pastCo2MmHg.map(() => SOURCE.model),
    // The forecast has no rate, so this is the mean change of the next 5 minutes.
    rate: next.length > 1 ? (next[1] - next[0]) * STEPS_PER_HOUR : 0,
    // This model has a daily pattern, so it stops at no value. The mean of a full day takes that place.
    balance: forecast.dailyMeanCo2MmHg ?? Infinity,
    next,
    hoursTo: forecast.hoursToCo2,
  }
}

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
