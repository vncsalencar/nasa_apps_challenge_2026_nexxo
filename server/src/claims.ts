// "I am on it": a crew member claims a problem, so the crew knows who works on it.
// A claim belongs to a topic, the same topic that a notification has, for example
// "env:co2_partial_pressure".
import { db } from './db.ts'

db.exec(`
  CREATE TABLE IF NOT EXISTS claims (
    id INTEGER PRIMARY KEY,
    mission_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    crew_id INTEGER NOT NULL,
    hour INTEGER NOT NULL,
    -- NULL while the crew member still works on it.
    done_hour INTEGER
  );
  CREATE INDEX IF NOT EXISTS claims_by_mission ON claims (mission_id, topic);
`)

// A claim counts for one mission day. After that the problem is open for a new claim.
const CLAIM_HOURS = 24

export function claimsOf(missionId: string, hour: number) {
  return db
    .prepare(
      `SELECT id, topic, crew_id AS crewId, hour, done_hour AS doneHour FROM claims
       WHERE mission_id = ? AND hour > ? ORDER BY id DESC`,
    )
    .all(missionId, hour - CLAIM_HOURS) as { id: number; topic: string; crewId: number; hour: number; doneHour: number | null }[]
}

// Returns false if the same crew member already works on this topic.
export function claim(missionId: string, topic: string, crewId: number, hour: number): boolean {
  const open = claimsOf(missionId, hour).some((row) => row.topic === topic && row.crewId === crewId && row.doneHour === null)
  if (open) return false
  db.prepare(`INSERT INTO claims (mission_id, topic, crew_id, hour) VALUES (?, ?, ?, ?)`).run(missionId, topic, crewId, hour)
  return true
}

export function finishClaim(missionId: string, claimId: number, hour: number) {
  db.prepare(`UPDATE claims SET done_hour = ? WHERE id = ? AND mission_id = ? AND done_hour IS NULL`).run(hour, claimId, missionId)
}
