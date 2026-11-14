// Creates missions and moves the mission clock forward.
// A new mission starts with the full real record from NASA. Each new hour replays that
// record from its start, and the admin simulator can add an offset to the new values.
import { randomBytes } from 'node:crypto'
import { db, transaction } from './db.ts'
import { tx } from './i18n.ts'
import { runCrewPatterns } from './crew.ts'
import { DEFAULT_CREW, dataset, environmentAt, hourOfDay, vitalsAt, type NewReading } from './dataset.ts'
import { indicatorById } from './indicators.ts'
import { emit, recordReading, type RoleId } from './monitor.ts'
import { runRules } from './rules.ts'

// Offsets have keys such as "env:co2_partial_pressure" or "crew:3:heart_rate".
export type Offsets = Record<string, number>

type MissionRow = { id: string; name: string; start_time: string; sim_hour: number; auto_run: number; offsets: string }

const getMission = db.prepare(`SELECT * FROM missions WHERE id = ?`)
const getCrew = db.prepare(`SELECT id, name, role FROM crew WHERE mission_id = ? ORDER BY id`)

export function findMission(id: string) {
  return getMission.get(id) as MissionRow | undefined
}
export function crewOf(missionId: string) {
  return getCrew.all(missionId) as { id: number; name: string; role: string }[]
}

const newestValue = db.prepare(
  `SELECT value FROM readings WHERE mission_id = ? AND subject = ? AND indicator = ? ORDER BY hour DESC, id DESC LIMIT 1`,
)
const cabinMean = db.prepare(
  `SELECT avg(value) AS mean FROM readings WHERE mission_id = ? AND subject = 'env' AND indicator = ? AND hour > ? AND hour <= ?`,
)
const cabinSum = db.prepare(
  `SELECT sum(value) AS total FROM readings WHERE mission_id = ? AND subject = 'env' AND indicator = ?`,
)

// Writes the readings of one hour: first the cabin, then the values that the server computes
// from the cabin, then the crew. The model of the crew reads the cabin values of this mission,
// so a change of the simulator in the cabin also changes the crew.
function writeHour(missionId: string, crewIds: number[], hour: number, offsets: Offsets, silent = false) {
  const save = (reading: NewReading) => {
    const decimals = (indicatorById.get(reading.indicator)?.decimals ?? 2) + 1
    recordReading(missionId, hour, { ...reading, value: Number(reading.value.toFixed(decimals)) }, silent)
  }

  const cabin: Record<string, number> = {}
  for (const reading of environmentAt(hour)) {
    const offset = offsets[`env:${reading.indicator}`] ?? 0
    cabin[reading.indicator] = reading.value + offset
    save({ ...reading, value: reading.value + offset, source: offset === 0 ? reading.source : 'admin' })
  }
  const meanOf = (indicator: string, hours: number) =>
    (cabinMean.get(missionId, indicator, hour - hours, hour)?.mean as number | null) ?? cabin[indicator]

  // One time each day, at the hour of the radiation value.
  if (hourOfDay(hour) === 12) {
    save({ subject: 'env', indicator: 'co2_7day_average', value: meanOf('co2_partial_pressure', 168), source: 'computed' })
    const total = (cabinSum.get(missionId, 'radiation_dose_rate')?.total as number | null) ?? 0
    save({ subject: 'env', indicator: 'radiation_dose_cumulative', value: total, source: 'computed' })
  }

  crewIds.forEach((crewId, crewIndex) => {
    const subject = `crew:${crewId}`
    const readings = vitalsAt(crewIndex, hour, {
      cabin: { co2: cabin.co2_partial_pressure, temperature: cabin.cabin_temperature },
      cabinMean: meanOf,
      previous: (indicator) => newestValue.get(missionId, subject, indicator)?.value as number | undefined,
      offset: (indicator) => offsets[`${subject}:${indicator}`] ?? 0,
    })
    for (const reading of readings) save({ ...reading, subject })
  })
}

export function createMission(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'mission'
  const id = `${slug}-${randomBytes(2).toString('hex')}`
  transaction(() => {
    db.prepare(`INSERT INTO missions (id, name, start_time, sim_hour) VALUES (?, ?, ?, ?)`).run(
      id,
      name,
      dataset.startTime,
      dataset.hours,
    )
    const insertCrew = db.prepare(`INSERT INTO crew (mission_id, name, role) VALUES (?, ?, ?)`)
    const crewIds = DEFAULT_CREW.map((member) => Number(insertCrew.run(id, member.name, member.role).lastInsertRowid))
    // The past record sends no notifications.
    for (let hour = 0; hour < dataset.hours; hour++) writeHour(id, crewIds, hour, {}, true)
    emit(id, dataset.hours - 1, 'simulator', 'mission.created', tx('Started the mission "{name}" with the NASA record of {record}.', { name, record: dataset.source.mission }))
  })
  return id
}

// Loads the NASA record again, from the first hour. The caller removes the old readings first.
// The crew and the roles stay.
export function reloadRecord(missionId: string) {
  const crewIds = crewOf(missionId).map((member) => member.id)
  db.prepare(`UPDATE missions SET sim_hour = ?, offsets = '{}', auto_run = 0 WHERE id = ?`).run(dataset.hours, missionId)
  for (let hour = 0; hour < dataset.hours; hour++) writeHour(missionId, crewIds, hour, {}, true)
}

// A new crew member gets readings from the next hour of the mission.
export function addCrew(missionId: string, name: string, role: RoleId) {
  return Number(db.prepare(`INSERT INTO crew (mission_id, name, role) VALUES (?, ?, ?)`).run(missionId, name, role).lastInsertRowid)
}

export function setRole(missionId: string, crewId: number, role: RoleId) {
  db.prepare(`UPDATE crew SET role = ? WHERE id = ? AND mission_id = ?`).run(role, crewId, missionId)
}

export function deleteMission(id: string) {
  stopAutoRun(id)
  transaction(() => {
    for (const table of ['readings', 'symptoms', 'checkups', 'crew', 'indicator_status', 'notifications', 'events', 'llm_settings', 'insights', 'claims', 'stage']) {
      db.prepare(`DELETE FROM ${table} WHERE mission_id = ?`).run(id)
    }
    db.prepare(`DELETE FROM missions WHERE id = ?`).run(id)
  })
}

export function advance(missionId: string, hours: number) {
  const mission = findMission(missionId)
  if (!mission) return
  const offsets: Offsets = JSON.parse(mission.offsets)
  const crewIds = crewOf(missionId).map((member) => member.id)
  transaction(() => {
    for (let step = 0; step < hours; step++) {
      const hour = mission.sim_hour + step
      writeHour(missionId, crewIds, hour, offsets)
      runRules(missionId, hour)
      runCrewPatterns(missionId, hour)
    }
    db.prepare(`UPDATE missions SET sim_hour = ? WHERE id = ?`).run(mission.sim_hour + hours, missionId)
  })
}

export function setOffsets(missionId: string, offsets: Offsets) {
  const clean: Offsets = {}
  for (const [key, value] of Object.entries(offsets)) {
    if (typeof value === 'number' && Number.isFinite(value) && value !== 0) clean[key] = value
  }
  db.prepare(`UPDATE missions SET offsets = ? WHERE id = ?`).run(JSON.stringify(clean), missionId)
}

// A scenario is a set of offsets that tells one story for the demo.
// A scenario changes only the cause. The model in dataset.ts then changes the effects.
// "label" and "about" are tx() tokens (see i18n.ts).
export const SCENARIOS: Record<string, { label: string; about: string; offsets: (crewIds: number[]) => Offsets }> = {
  co2_buildup: {
    label: tx('CO2 builds up'),
    about: tx('The CO2 removal system fails. Cabin CO2 rises by 1.2 mmHg. The crew then sleeps less, and fatigue and mood get worse the next day.'),
    offsets: () => ({ 'env:co2_partial_pressure': 1.2 }),
  },
  solar_event: {
    label: tx('Solar particle event'),
    about: tx('The Sun sends a burst of particles. The daily dose rises by 1.5 mGy. The value shows at 12:00.'),
    offsets: () => ({ 'env:radiation_dose_rate': 1.5 }),
  },
  hot_cabin: {
    label: tx('Cooling fails'),
    about: tx('The cabin gets 6 °C hotter and more humid. Heart rates and body temperatures rise, and the crew sleeps and eats less.'),
    offsets: () => ({ 'env:cabin_temperature': 6, 'env:cabin_humidity': 15 }),
  },
  poor_sleep: {
    label: tx('Bad sleep for all'),
    about: tx('A shifted schedule. All crew members sleep 1.8 hours less. Stress and fatigue rise and mood falls.'),
    offsets: (crewIds) => Object.fromEntries(crewIds.map((id) => [`crew:${id}:sleep_duration`, -1.8])),
  },
  infection: {
    label: tx('One crew member gets sick'),
    about: tx('The first crew member gets a fever of about 38.5 °C. The heart rate of this crew member rises with the fever.'),
    offsets: (crewIds) => ({ [`crew:${crewIds[0]}:body_temperature`]: 1.8 }),
  },
  low_food: {
    label: tx('One crew member eats too little'),
    about: tx('The second crew member eats 40% less than the target. Blood sugar and mood fall over the next days.'),
    offsets: (crewIds) => ({ [`crew:${crewIds[1] ?? crewIds[0]}:energy_intake`]: -40 }),
  },
  low_water: {
    label: tx('One crew member drinks too little'),
    about: tx('The third crew member drinks 1.2 litres less each day. Blood pressure falls and the heart rate rises.'),
    offsets: (crewIds) => ({ [`crew:${crewIds[2] ?? crewIds[0]}:water_intake`]: -1.2 }),
  },
}

// Auto-run: the server moves the mission forward by 1 hour every 2 seconds.
const AUTO_RUN_INTERVAL_MS = 2000
const timers = new Map<string, NodeJS.Timeout>()

export function startAutoRun(missionId: string, onChange: (missionId: string) => void) {
  db.prepare(`UPDATE missions SET auto_run = 1 WHERE id = ?`).run(missionId)
  if (timers.has(missionId)) return
  timers.set(
    missionId,
    setInterval(() => {
      advance(missionId, 1)
      onChange(missionId)
    }, AUTO_RUN_INTERVAL_MS),
  )
}

export function stopAutoRun(missionId: string) {
  db.prepare(`UPDATE missions SET auto_run = 0 WHERE id = ?`).run(missionId)
  clearInterval(timers.get(missionId))
  timers.delete(missionId)
}

// After a restart of the server, continue the missions that were on auto-run.
export function resumeAutoRuns(onChange: (missionId: string) => void) {
  const rows = db.prepare(`SELECT id FROM missions WHERE auto_run = 1`).all() as { id: string }[]
  for (const row of rows) startAutoRun(row.id, onChange)
}
