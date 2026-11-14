import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

// SQLite is built into Node 22, so the server needs no native package.
const databasePath = resolve(process.env.DATABASE_PATH ?? 'data/nexxo.db')
mkdirSync(dirname(databasePath), { recursive: true })

export const db = new DatabaseSync(databasePath)

// Time in a mission is a count of hours from the start of the mission ("hour").
// The real time of a reading is start_time + hour.
db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS missions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    start_time TEXT NOT NULL,
    -- The current hour of the mission. The next reading gets this hour.
    sim_hour INTEGER NOT NULL DEFAULT 0,
    auto_run INTEGER NOT NULL DEFAULT 0,
    -- JSON object: the values that the admin simulator adds to new readings.
    offsets TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS crew (
    id INTEGER PRIMARY KEY,
    mission_id TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY,
    mission_id TEXT NOT NULL,
    -- "env" for the cabin, or "crew:<id>" for a crew member.
    subject TEXT NOT NULL,
    indicator TEXT NOT NULL,
    value REAL NOT NULL,
    hour INTEGER NOT NULL,
    -- Where the value comes from: nasa, nasa_replay, simulated, or admin.
    source TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS readings_by_subject
    ON readings (mission_id, subject, indicator, hour);

  CREATE TABLE IF NOT EXISTS symptoms (
    id INTEGER PRIMARY KEY,
    mission_id TEXT NOT NULL,
    crew_id INTEGER NOT NULL,
    body_part TEXT NOT NULL,
    name TEXT NOT NULL,
    -- open or resolved
    status TEXT NOT NULL DEFAULT 'open',
    hour INTEGER NOT NULL,
    resolved_hour INTEGER
  );

  CREATE TABLE IF NOT EXISTS checkups (
    id INTEGER PRIMARY KEY,
    mission_id TEXT NOT NULL,
    crew_id INTEGER NOT NULL,
    rule_id TEXT NOT NULL,
    -- pending, confirmed, or dismissed
    status TEXT NOT NULL DEFAULT 'pending',
    reason TEXT NOT NULL,
    hour INTEGER NOT NULL,
    answered_hour INTEGER
  );
  CREATE INDEX IF NOT EXISTS checkups_by_mission ON checkups (mission_id, crew_id, rule_id, hour);

  -- The current status of each indicator of each subject. The server compares each new
  -- reading with this row to find a change of status.
  CREATE TABLE IF NOT EXISTS indicator_status (
    mission_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    indicator TEXT NOT NULL,
    -- normal, caution, or alert
    status TEXT NOT NULL,
    value REAL NOT NULL,
    since_hour INTEGER NOT NULL,
    PRIMARY KEY (mission_id, subject, indicator)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY,
    mission_id TEXT NOT NULL,
    -- The crew member who gets the notification. NULL means the flight surgeons on the ground.
    crew_id INTEGER,
    -- 0 is information, 1 is caution, 2 is alert.
    severity INTEGER NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    -- What the notification is about, for example "env:co2_partial_pressure".
    -- The server uses it to avoid the same notification many times.
    topic TEXT NOT NULL,
    hour INTEGER NOT NULL,
    read_hour INTEGER
  );
  CREATE INDEX IF NOT EXISTS notifications_by_topic ON notifications (mission_id, topic, hour);

  -- The history of the mission: each action of a person and each thing the app did.
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY,
    mission_id TEXT NOT NULL,
    hour INTEGER NOT NULL,
    -- Who did it: "simulator", "crew:<id>", or "system" for the app.
    actor TEXT NOT NULL,
    -- For example "status.changed" or "checkup.answered".
    type TEXT NOT NULL,
    summary TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  CREATE INDEX IF NOT EXISTS events_by_mission ON events (mission_id, id);
`)

// Columns that came after the first version. SQLite has no "ADD COLUMN IF NOT EXISTS".
function addColumn(table: string, column: string, type: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  if (!columns.some((row) => row.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
}
// JSON: the possible causes that the server found in the data at the time of the report (see causes.ts).
addColumn('symptoms', 'explanation', 'TEXT')

export function transaction<T>(work: () => T): T {
  db.exec('BEGIN')
  try {
    const result = work()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
