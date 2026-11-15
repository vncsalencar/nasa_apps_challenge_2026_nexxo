// The real record: cabin CO2 of the International Space Station during the Rodent Research-9
// mission, one value each 5 minutes, from the NASA Environmental Data Application (EDA).
// server/scripts/fetch-eda.ts writes the file that this module reads.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { STEPS_PER_HOUR, STEP_MINUTES } from '../../shared/co2.ts'

type Seed = {
  source: { name: string; url: string; credit: string; mission: string; field: string; unit: string; retrievedAt: string }
  milestones: Record<string, string>
  startTime: string
  stepMinutes: number
  yearShift: number
  ppm: number[]
}

export type CabinRecord = {
  source: Seed['source']
  milestones: Record<string, string>
  startMs: number
  // Years that the fetch script added to the dates of the source, to correct them.
  yearShift: number
  ppm: number[]
  // The mean of each hour in ppm, for the small chart of the simulator.
  hourly: number[]
}

export function loadRecord(file = resolve(import.meta.dirname, '../seed/eda-rr-9-co2.json')): CabinRecord {
  const seed: Seed = JSON.parse(readFileSync(file, 'utf8'))
  if (seed.stepMinutes !== STEP_MINUTES) throw new Error(`The record must have one value each ${STEP_MINUTES} minutes.`)
  const hourly: number[] = []
  for (let from = 0; from < seed.ppm.length; from += STEPS_PER_HOUR) {
    const hour = seed.ppm.slice(from, from + STEPS_PER_HOUR)
    hourly.push(Math.round(hour.reduce((sum, value) => sum + value, 0) / hour.length))
  }
  return { source: seed.source, milestones: seed.milestones, startMs: Date.parse(seed.startTime), yearShift: seed.yearShift, ppm: seed.ppm, hourly }
}
