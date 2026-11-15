// A crewed reference mission to Mars. No such mission has flown. The path of the flight is the
// real path of MSL, the radiation rates are published means of real instruments (MSL RAD and
// Liulin-MO), and the mission itself (crew, stay, return) is our model.
//
// Each number has its exact quote and its place in the source in docs/sources-mars-iss.md.
import type { Preset, Rate } from '../types.ts'
import {
  CREW_OF_FOUR,
  FLAG_FLAT_LINE,
  FLAG_LIMIT,
  FLAG_REVISED,
  FLAG_SHIELDING,
  FLAG_SOLAR_CYCLE,
  FLAG_STORMS,
  FLAG_UNITS,
  GUO_2021,
  HASSLER_2014,
  HORIZONS_MSL,
  MARS_CABIN,
  MARS_SURFACE_RATE,
  MATTHIA_2016,
  MSL_CRUISE_DAYS,
  MSL_CRUISE_RATE,
  TRANSIT_HABITAT,
  ZEITLIN_2013,
  ZEITLIN_2014,
} from './msl.ts'
import { LIULIN_CRUISE_RATE, SEMKOVA_2018 } from './tgo.ts'

// The rates are real, but they come from flights with no crew. "proxyOf" tells the page so.
const cruiseAtSolarMax: Rate = { ...MSL_CRUISE_RATE, proxyOf: 'MSL/Curiosity cruise, 2011 to 2012' }
const cruiseInDecline: Rate = { ...LIULIN_CRUISE_RATE, proxyOf: 'ExoMars TGO cruise, 2016' }
const surface: Rate = { ...MARS_SURFACE_RATE, proxyOf: 'Curiosity rover on Mars, 2012 to 2013' }

export const marsReference: Preset = {
  id: 'mars-reference',
  name: 'Mars: crewed reference',
  summary:
    'A model of a crewed mission to Mars: a crew of 4 flies the path of MSL, stays on the surface, and flies back. The radiation rates are published means of real instruments.',
  badge: 'real-rate-modelled',
  destination: 'mars',
  frame: 'sun',
  trajectory: {
    file: 'msl',
    source: HORIZONS_MSL,
    note:
      'The flight to Mars is the real path of MSL from JPL Horizons (26 November 2011 to 6 August 2012). ' +
      'The stay and the return flight are our model: no spacecraft has flown from Mars back to the Earth.',
    badge: 'real-data',
  },
  phases: [
    {
      id: 'cruise',
      label: 'Cruise to Mars',
      kind: 'cruise',
      days: MSL_CRUISE_DAYS,
      rate: cruiseAtSolarMax,
      note: 'The path and the length of the MSL flight. The solar cycle setting selects the instrument: MSL RAD (near solar maximum) or Liulin-MO (declining phase).',
    },
    {
      id: 'surface',
      label: 'Mars surface stay',
      kind: 'surface',
      days: 30,
      rate: surface,
      note: 'The rate that the Curiosity rover measured in Gale crater. You can set the length of the stay. The solar cycle setting does not change this rate.',
    },
    {
      id: 'return',
      label: 'Return to the Earth',
      kind: 'return',
      days: MSL_CRUISE_DAYS,
      rate: cruiseAtSolarMax,
      note: 'Our model: the return flight has the same length and the same rate as the flight to Mars.',
    },
  ],
  solar: { max: cruiseAtSolarMax, declining: cruiseInDecline },
  surfaceStay: { phaseId: 'surface', defaultDays: 30, minDays: 0, maxDays: 600 },
  returnTrip: { phaseId: 'return' },
  crew: 4,
  cabin: MARS_CABIN,
  findings: [
    {
      text:
        'The RAD team made the first estimate from data for a crewed mission: 360 days of flight give about 660 mSv, and 500 days on the surface give about 320 mSv. Together this is about 1 Sv.',
      source: ZEITLIN_2014,
    },
    {
      text: 'NASA plans its next oxygen generator for a deep space mission with a crew of 4 and a length of 3 years. This preset uses the same crew.',
      source: CREW_OF_FOUR,
    },
    {
      text: 'The NASA habitat design for the flight to Mars holds a crew of 4 for up to 1,100 days, with 25 m³ of habitable volume for each person.',
      source: TRANSIT_HABITAT,
    },
  ],
  flags: [
    'This mission is a model. No crew has flown to Mars. The rates come from instruments on flights with no crew, behind the shielding of those spacecraft.',
    'The stay on the surface and the return flight are our choices. The return flight copies the length and the rate of the flight to Mars.',
    'The surface rate is from one place and one time: Gale crater, under about 21 g/cm² of atmosphere, near the weak maximum of solar cycle 24. The page has no surface rate for the declining phase, so the solar cycle setting changes the two flights only.',
    FLAG_SOLAR_CYCLE,
    FLAG_SHIELDING,
    FLAG_FLAT_LINE,
    FLAG_UNITS,
    'In mGy, the two flight rates are not the same kind of value: the RAD value is the dose in water, and the Liulin-MO value is the dose in silicon. Compare the solar cycle settings in mSv.',
    FLAG_REVISED,
    FLAG_LIMIT,
    FLAG_STORMS,
  ],
  sources: [ZEITLIN_2013, HASSLER_2014, ZEITLIN_2014, MATTHIA_2016, SEMKOVA_2018, GUO_2021, HORIZONS_MSL, TRANSIT_HABITAT, CREW_OF_FOUR],
}
