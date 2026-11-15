// The career limit of the radiation dose for an astronaut.
//
// Checked on 15 November 2026 in the text of the standard (docs/sources-mars-iss.md has the
// quote and the page). Revision C is the revision that the NASA page of the standards links.
import type { SourceRef } from './types.ts'

export const CAREER_LIMIT: {
  mSv: number
  // What the source says, in its own words.
  says: string
  source: SourceRef
  // The quantity of the limit, and why the page compares it with care.
  quantity: string
  note: string
} = {
  mSv: 600,
  says:
    "An individual crewmember's total career effective radiation dose due to spaceflight radiation exposure shall be less than 600 mSv. " +
    'This limit is universal for all ages and sexes.',
  source: {
    short: 'NASA-STD-3001 Vol. 1 Rev. C',
    title:
      'NASA-STD-3001, NASA Spaceflight Human-System Standard, Volume 1: Crew Health, Revision C (approved 15 September 2023), ' +
      'section 4.8.2 "Career Space Permissible Exposure Limit for Spaceflight Radiation", requirement [V1 4030], page 39.',
    url: 'https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf',
  },
  quantity: 'effective dose',
  note:
    'The limit is for effective dose: a dose for the whole body, which NASA computes with its own quality factors and a model of the body. ' +
    'The instruments in this app give dose equivalent at one point behind their own shielding. Both use the unit mSv, but they are not the same quantity. ' +
    'So the day when a mission passes the limit is an estimate. The limit counts all flights of a career, not one mission. ' +
    'NASA set it to keep the mean risk of death from cancer caused by the exposure below 3%.',
}
