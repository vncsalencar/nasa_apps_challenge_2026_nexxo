// What each home mode and each sheet gets from the dashboard shell.
import type { Catalog, Series, Snapshot } from './api.ts'
import type { Situation } from './derive.ts'
import { t } from './i18n.ts'

// The detail screens. Each one is a page with its own address, for example /m/<mission>/cabin.
// "history" is the personal history of the selected crew member. "log" is the log of the whole mission.
export type SheetTab = 'body' | 'cabin' | 'checkups' | 'alerts' | 'history' | 'log'
export const SHEET_LABEL: Record<SheetTab, string> = { body: t('Body'), cabin: t('Cabin'), checkups: t('Check-ups'), alerts: t('Alerts'), history: t('History'), log: t('Log') }

export type Ctx = {
  snapshot: Snapshot
  catalog: Catalog
  // The state of the selected crew member: what is wrong and what to do. See derive.ts.
  s: Situation
  crewId: number
  // The readings of the last 30 days: of the selected crew member, and of the cabin.
  // Each point is [hour, value, source].
  crewSeries: Series
  cabinSeries: Series
  // Sends an action to the server as the selected crew member, for example
  // act('/checkups/12/answer', { answer: 'confirmed' }). The page updates by itself after it.
  act: (path: string, body?: unknown) => Promise<void>
  // Opens a detail screen. "focus" is the id of an indicator to open there, for example 'body_temperature'.
  open: (tab: SheetTab, focus?: string) => void
  selectCrew: (id: number) => void
  // The indicator that the sheet must show open, or null.
  focus: string | null
}
