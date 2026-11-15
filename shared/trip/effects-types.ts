// The contract of the "effects on the body" card of the trip page. The card shows a body figure
// (2D or 3D). A region gets color when a hazard of the trip can affect it: the CO2 and the O2 of
// the cabin, and the radiation dose. A tap on a region shows what a source reports there and
// what the crew can do about it.
import type { DoseUnit, SourceRef } from './types.ts'

export type Hazard = 'co2' | 'o2' | 'radiation'

// The regions of the body figure (see web/src/components/heat.ts), plus "body" for the whole
// body and "none" for an effect with no place on the body (for example sleep or the cancer risk of a career).
export type EffectRegion = 'body' | 'head' | 'chest' | 'abdomen' | 'arms' | 'legs' | 'brain' | 'eyes' | 'face' | 'airway' | 'none'

// One thing that the crew can do to lower a risk.
export type Mitigation = {
  text: string
  // The source that names this step. Absent: it is an idea of this app, and "ours" is true.
  source?: SourceRef
  ours?: boolean
}

export type Effect = {
  id: string
  hazard: Hazard
  region: EffectRegion
  // A short name, for example "Lens of the eye: cataract".
  title: string
  // What the source reports, and at which value. One or two short sentences.
  says: string
  source: SourceRef
  // "band": a source reports the symptom at this value (as the CO2 bands).
  // "limit": a limit that NASA sets for this organ or for the whole body.
  kind: 'band' | 'limit'
  // What the app compares now, with the numbers, for example "Dose of the last 30 days: 55 mSv. Limit: 250 mGy-Eq."
  measure: string
  // How far the value is into the band or toward the limit, from 0 to 1.
  intensity: number
  // How strong the color of this effect can get, from 0 to 1. A more serious effect gets a stronger color. Our choice.
  weight: number
  // A warning about the comparison, for example that the measured quantity and the quantity of the limit differ.
  caveat?: string
  mitigations: Mitigation[]
}

// What the card knows at one mission day.
export type EffectsInput = {
  // The CO2 partial pressure now and its mean of the last hour, in mmHg.
  co2MmHg: number
  co2HourMeanMmHg: number
  // The O2 partial pressure now, in mmHg.
  o2MmHg: number
  // The radiation dose in the unit of the charts. null: no data.
  dose: {
    unit: DoseUnit
    // From the start of the mission to now.
    total: number | null
    // The last 30 days and the last 365 days (or the whole mission if it is shorter).
    last30Days: number | null
    lastYear: number | null
    // The dose of the day of the cursor.
    today: number | null
  }
  // True if a solar particle event (a what-if storm of the presenter) is active at the cursor.
  stormNow: boolean
}
