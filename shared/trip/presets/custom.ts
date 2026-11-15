// A mission that the presenter sets: the length of the flight and the dose rate come from the
// simulator. Nothing here is a measurement.
import type { Preset, SourceRef } from '../types.ts'
import { FLAG_STORMS, FLAG_UNITS, MARS_CABIN, TRANSIT_HABITAT } from './msl.ts'

const OWN_VALUE: SourceRef = { short: 'Your own value', title: 'No source: you set this value in the simulator.', url: '' }
const OWN_PATH: SourceRef = { short: 'Model of this app', title: 'No source: the app computes a simple transfer orbit from the Earth to Mars for the length that you set.', url: '' }

export const custom: Preset = {
  id: 'custom',
  name: 'Custom',
  summary: 'Your own mission: set the length of the flight and the dose rate in the simulator.',
  badge: 'modelled',
  destination: 'mars',
  frame: 'sun',
  trajectory: {
    file: null,
    source: OWN_PATH,
    note: 'The app computes the path: a simple transfer orbit from the Earth to Mars for the length that you set. It is not the path of a real flight.',
    badge: 'modelled',
  },
  phases: [
    {
      id: 'cruise',
      label: 'Transfer flight',
      kind: 'cruise',
      days: 200,
      rate: {
        value: 0,
        unit: 'mSv',
        instrument: 'none: your own value',
        shielding: 'Your own assumption.',
        solar: 'Your own assumption.',
        says: 'This rate is not a measurement. You set it in the simulator.',
        source: OWN_VALUE,
        badge: 'modelled',
      },
      note: 'The length and the dose rate come from the simulator. The first values are 200 days and 0.',
    },
  ],
  crew: 4,
  cabin: MARS_CABIN,
  flags: [
    'This mission is your own model. The dose rate is the value that you set, and no instrument measured it.',
    'For a real value to start from: MSL RAD measured 1.84 mSv for each day inside its spacecraft on the way to Mars (2011 to 2012).',
    FLAG_UNITS,
    FLAG_STORMS,
  ],
  sources: [TRANSIT_HABITAT],
}
