// The base data of each mission: the real record of a past mission from NASA,
// and the model that gives the vitals of the crew.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { tx } from './i18n.ts'
import { MODEL as M } from './relations.ts'

type OsdrSeed = {
  source: { name: string; url: string; mission: string; retrievedAt: string; notes: string[] }
  startTime: string
  hours: number
  // These field names and units are the ones of the NASA record.
  telemetry: { temperature_iss: (number | null)[]; rh_iss: (number | null)[]; co2_iss: (number | null)[] }
  radiation: { time: string[]; gcr: number[]; saa: number[] }
}

const seed: OsdrSeed = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../seed/osdr-rr-6.json'), 'utf8'),
)

// Some hours have no value in the record. Use the value of the hour before.
function fillGaps(values: (number | null)[]): number[] {
  let last = values.find((value) => value !== null) ?? 0
  return values.map((value) => (last = value ?? last))
}

// The record gives CO2 in parts per million. The limits of NASA use mmHg.
// The station keeps the cabin at about 760 mmHg, so mmHg = ppm × 760 / 1,000,000.
const CABIN_PRESSURE_MMHG = 760
const co2 = fillGaps(seed.telemetry.co2_iss).map((ppm) => (ppm * CABIN_PRESSURE_MMHG) / 1_000_000)
const temperature = fillGaps(seed.telemetry.temperature_iss)
const humidity = fillGaps(seed.telemetry.rh_iss)
const radiationByDay = seed.radiation.time.map((_, index) => seed.radiation.gcr[index] + seed.radiation.saa[index])

export const HOUR_MS = 3_600_000
export const dataset = {
  // The name and the notes are texts for a person, so they are tx() tokens (see i18n.ts).
  // The seed file holds the English text. The translation is in locales/pt-BR/catalog.ts.
  source: { ...seed.source, name: tx(seed.source.name), notes: seed.source.notes.map((note) => tx(note)) },
  startTime: seed.startTime,
  // The count of hours in the real record. Hours after this replay the record from its start.
  hours: seed.hours,
  cabinPressureMmHg: CABIN_PRESSURE_MMHG,
}

const startMs = Date.parse(seed.startTime)
export const hourOfDay = (hour: number) => new Date(startMs + hour * HOUR_MS).getUTCHours()
const dayIndex = (hour: number) => Math.floor((startMs + hour * HOUR_MS) / (24 * HOUR_MS)) - Math.floor(startMs / (24 * HOUR_MS))

export type NewReading = { subject: string; indicator: string; value: number; source: string }

// The readings of the cabin for one hour. All values come from the NASA record.
export function environmentAt(hour: number): NewReading[] {
  const index = hour % seed.hours
  const source = hour < seed.hours ? 'nasa' : 'nasa_replay'
  const readings: NewReading[] = [
    { subject: 'env', indicator: 'co2_partial_pressure', value: co2[index], source },
    { subject: 'env', indicator: 'cabin_temperature', value: temperature[index], source },
    { subject: 'env', indicator: 'cabin_humidity', value: humidity[index], source },
  ]
  // The record has one radiation value for each day. We put it at 12:00.
  if (hourOfDay(hour) === 12) {
    const day = dayIndex(hour) % radiationByDay.length
    readings.push({ subject: 'env', indicator: 'radiation_dose_rate', value: radiationByDay[day], source })
  }
  return readings
}

// A number from 0 to 1 that is always the same for the same inputs.
function noise(...inputs: number[]): number {
  let h = 0x9e3779b9
  for (const input of inputs) {
    h = Math.imul(h ^ (input + 0x7f4a7c15), 0x85ebca6b)
    h ^= h >>> 13
    h = Math.imul(h, 0xc2b2ae35)
    h ^= h >>> 16
  }
  return (h >>> 0) / 4294967296
}
// A value near 0 with a spread of about 1, with the shape of a bell curve.
function bell(...inputs: number[]): number {
  return (noise(...inputs, 1) + noise(...inputs, 2) + noise(...inputs, 3) - 1.5) * 2
}
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

// What the model of the vitals needs to know about the cabin and about the days before.
export type Drivers = {
  // The cabin values of this hour, with the changes of the simulator.
  cabin: { co2: number; temperature: number }
  // The mean of a cabin indicator over the last hours, with this hour.
  cabinMean: (indicator: 'co2_partial_pressure' | 'cabin_temperature', hours: number) => number
  // The newest stored value of this crew member, or undefined.
  previous: (indicator: string) => number | undefined
  // The value that the simulator adds to this indicator of this crew member.
  offset: (indicator: string) => number
}

// NASA publishes no continuous vitals of single crew members, so a model gives them.
// (Open data for single persons exists only for lab samples, for example OSD-575 of Inspiration4.)
// The model uses numbers that NASA studies report:
// - Sleep: 6.09 hours each night on the station (Barger and others, 2014).
// - Blood pressure: 8 to 10 mmHg lower in flight than on Earth (Norsk and others, 2015).
// The other base values are usual values for a healthy adult at rest.
//
// The values also follow the cabin and each other, with the relations in relations.ts.
// For example, high CO2 in the night gives less sleep, and less sleep gives a lower mood.
// So a chart that shows a correlation shows this model. It does not show a discovery.
export function vitalsAt(crewIndex: number, hour: number, drivers: Drivers): Omit<NewReading, 'subject'>[] {
  const c = crewIndex
  const person = (trait: number) => noise(c, trait, 99) // A fixed trait of this crew member.
  const time = hourOfDay(hour)
  const over = (value: number, limit: number) => Math.max(0, value - limit)
  const under = (value: number, limit: number) => Math.max(0, limit - value)

  const readings: Omit<NewReading, 'subject'>[] = []
  // Adds the change of the simulator, keeps the value inside its limits, and returns the final value.
  // The next indicators use the final value, so a change of the simulator moves along the chain.
  const add = (indicator: string, model: number, low = -Infinity, high = Infinity, whole = false) => {
    const offset = drivers.offset(indicator)
    let value = model + offset
    if (whole) value = Math.round(value)
    value = clamp(value, low, high)
    readings.push({ indicator, value, source: offset === 0 ? 'simulated' : 'admin' })
    return value
  }

  // The usual body temperature of this person. A fever starts 0.4 °C above it.
  const usualTemperature = 36.6 + person(4) * 0.3
  add(
    'heart_rate',
    // Lowest in the night, highest in the afternoon.
    58 + person(1) * 12 + 5 * Math.sin(((time - 9) / 24) * 2 * Math.PI) + bell(c, hour, 1) * 3 +
      over(drivers.cabin.temperature, 25) * M.heartPerCabinDegree + // R21
      over(drivers.cabin.co2, 3) * M.heartPerCo2 + // R04
      over(drivers.previous('body_temperature') ?? 0, usualTemperature + 0.4) * M.heartPerFeverDegree + // T3
      under(drivers.previous('water_intake') ?? 3, 2.2) * M.heartPerWater + // R50
      over(drivers.previous('stress_score') ?? 2, 3) * M.heartPerStress,
    25,
    220,
  )
  // The crew does the other measurements one time each day, in the morning.
  // The logs of water, food and exercise are for the day before.
  if (time !== 7) return readings

  const day = dayIndex(hour)
  const co2Night = drivers.cabinMean('co2_partial_pressure', 8)
  const co2Day = drivers.cabinMean('co2_partial_pressure', 24)
  const temperatureNight = drivers.cabinMean('cabin_temperature', 8)
  const temperatureDay = drivers.cabinMean('cabin_temperature', 24)
  const moodBefore = drivers.previous('mood_score') ?? 4
  const stressBefore = drivers.previous('stress_score') ?? 2
  const fatigueBefore = drivers.previous('fatigue_score') ?? 2

  const water = add('water_intake', 2.9 + person(8) * 0.4 + bell(c, day, 8) * 0.2, 0, 8)
  const energy = add(
    'energy_intake',
    100 + person(9) * 6 + bell(c, day, 9) * 5 -
      (co2Day > 4.5 ? M.energyAtHighCo2 : 0) - // R03
      over(temperatureDay, 27) * M.energyPerDegree -
      (moodBefore <= 2 ? M.energyAtLowMood : 0),
    0,
    200,
  )
  add(
    'exercise_minutes',
    124 + bell(c, day, 11) * 7 -
      (moodBefore <= 2 ? M.exerciseAtLowMood : 0) - // R62
      over(fatigueBefore, 3) * M.exercisePerFatigue, // T7
    0,
    300,
  )
  const sleep = add(
    'sleep_duration',
    clamp(
      5.9 + person(6) * 0.4 + bell(c, day, 6) * 0.55 -
        over(co2Night, M.co2SleepFrom) * M.sleepPerCo2 - // R06
        (over(temperatureNight, 25) + under(temperatureNight, 20)) * M.sleepPerDegree - // R19
        over(stressBefore, 3) * M.sleepPerStress,
      3,
      8.5,
    ),
    0,
    14,
  )
  const stress = add('stress_score', 2.1 + bell(c, day, 10) * 0.7 + under(sleep, 6) * M.stressPerSleepHour, 1, 5, true) // T1
  add(
    'fatigue_score',
    2.2 + bell(c, day, 12) * 0.6 +
      (6.1 - sleep) * M.fatiguePerSleepHour + // R11
      (co2Day > 4.5 ? M.fatigueAtHighCo2 : 0) + // R02
      under(energy, 90) * 0.03,
    1,
    5,
    true,
  )
  add(
    'mood_score',
    4.2 + bell(c, day, 7) * 0.8 -
      under(sleep, 6.1) * M.moodPerSleepHour - // R10
      over(stress, 3) * M.moodPerStress - // T6
      under(energy, 80) * M.moodPerEnergy, // R53
    1,
    5,
    true,
  )
  add('body_temperature', usualTemperature + bell(c, day, 4) * 0.15 + over(temperatureDay, 27) * M.bodyPerCabinDegree) // R20
  add(
    'blood_pressure_systolic',
    108 + person(2) * 10 + bell(c, day, 2) * 4 - under(water, 2.2) * M.pressurePerWater + over(stress, 3) * M.pressurePerStress, // T4, T2
  )
  add('blood_pressure_diastolic', 68 + person(3) * 8 + bell(c, day, 3) * 3 - under(water, 2.2) * (M.pressurePerWater / 2))
  add(
    'blood_glucose',
    84 + person(5) * 10 + bell(c, day, 5) * 5 - under(energy, 85) * M.glucosePerEnergy + over(stress, 3) * M.glucosePerStress, // R52, T5
    20,
    600,
  )
  return readings
}

// These people do not exist. The app never shows data of real astronauts.
export const DEFAULT_CREW = [
  { name: 'Alex Reyes', role: 'commander' },
  { name: 'Mina Okafor', role: 'medical_officer' },
  { name: 'Jonas Lindqvist', role: 'engineer' },
  { name: 'Priya Raman', role: 'specialist' },
]
