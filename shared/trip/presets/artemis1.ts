// Artemis I: the uncrewed flight of Orion around the Moon, 16 November to 11 December 2022.
//
// Each number has its exact quote and its place in the source in docs/sources-lunar.md.
// The radiation values are from George et al., Nature 634, 48–52 (2024).
import type { Phase, Preset, Rate, SourceRef } from '../types.ts'

// ---------------------------------------------------------------------------------------
// Sources. The Artemis II, lunar orbit, and Gateway presets use some of them too.
// ---------------------------------------------------------------------------------------
export const GEORGE_2024: SourceRef = {
  short: 'George et al. 2024',
  title: 'George, S. P., Gaza, R., Matthiä, D., et al. Space radiation measurements during the Artemis I lunar mission. Nature 634, 48–52 (2024).',
  url: 'https://www.nature.com/articles/s41586-024-07927-7',
}

export const ORION_VOLUME: SourceRef = {
  short: 'NASA, Orion by the Numbers (2026)',
  title: 'NASA fact sheet "Orion by the Numbers" (2026): habitable volume 330 ft³ / 9.34 m³, pressurized volume 690.6 ft³ / 19.56 m³.',
  url: 'https://www.nasa.gov/wp-content/uploads/2026/01/orion-by-the-numbers-2026b.pdf',
}

// JPL asks for this reference (Horizons manual, "Acknowledgements"), with the date of retrieval.
// The date is in the trajectory file.
export const HORIZONS_CREDIT =
  'Giorgini, JD and JPL Solar System Dynamics Group, NASA/JPL Horizons On-Line Ephemeris System, https://ssd.jpl.nasa.gov/horizons/. The trajectory file holds the date of retrieval.'

const HORIZONS: SourceRef = {
  short: 'JPL Horizons',
  title: 'NASA/JPL Horizons On-Line Ephemeris System, target "Artemis 1 (spacecraft)" (-1023).',
  url: 'https://ssd.jpl.nasa.gov/horizons/',
  credit: HORIZONS_CREDIT,
}

const NASA_BLOG: SourceRef = {
  short: 'NASA Artemis I flight day posts',
  title: 'NASA, Artemis I flight day posts (November and December 2022): outbound flyby, orbit insertion, orbit departure, return flyby, splashdown.',
  url: 'https://www.nasa.gov/blogs/missions/2022/12/11/artemis-i-flight-day-26-orion-splashes-down-concluding-historic-artemis-i-mission/',
}

const NASA_MISSION: SourceRef = {
  short: 'NASA, Artemis I',
  title: 'NASA, Artemis I mission page: launch at 1:47 a.m. EST on 16 November 2022, splashdown at 12:40 p.m. EST on 11 December 2022.',
  url: 'https://www.nasa.gov/mission/artemis-i/',
}

// ---------------------------------------------------------------------------------------
// The timeline, in minutes after the launch (16 November 2022, 06:47 UTC).
// ---------------------------------------------------------------------------------------
const MINUTES_PER_DAY = 1440
// 16 November, 10:45 UTC: the end of the pass through the outer belt (George et al. 2024, Fig. 2).
const BELTS_END = 238
// 21 November, 12:57 UTC: the closest point of the outbound flyby (NASA: 6:57 a.m. CST).
const OUTBOUND_FLYBY = 7570
// 25 November, 21:52 UTC: the burn into the distant retrograde orbit. The NASA post says
// "4:52 p.m. CST", but the NASA schedule says 4:52 p.m. EST, and the JPL Horizons trajectory
// shows the burn at 21:52 UTC.
const ORBIT_START = 13_865
// 1 December, 21:53 UTC: the burn out of the orbit (NASA: 3:53 p.m. CST).
const ORBIT_END = 22_506
// 5 December, 16:43 UTC: the closest point of the return flyby (NASA: 10:43 a.m. CST).
const RETURN_FLYBY = 27_956
// 11 December, 17:40 UTC: the splashdown (NASA: 9:40 a.m. PST).
const SPLASHDOWN = 36_653

const days = (fromMinute: number, toMinute: number) => (toMinute - fromMinute) / MINUTES_PER_DAY

// ---------------------------------------------------------------------------------------
// Dose rates
// ---------------------------------------------------------------------------------------
const HERA = 'Orion HERA (Hybrid Electronic Radiation Assessor, NASA), three sensors'
const HERA_SHIELDING =
  'Inside the Orion crew module, at three places. The median shielding is 25 g/cm² at the sensor on the cabin wall (HSU2) and 45 g/cm² at the sensor HPU (aluminium equivalent).'
const SOLAR_2022 = 'Near the middle of solar cycle 25, between solar minimum and solar maximum (November and December 2022).'

// The dose rate from galactic cosmic rays in Orion, after the Van Allen belts. The paper gives one
// rate for the whole flight after the belts. It gives no rate for the cruise or for the orbit alone.
// Absorbed dose: (10.21 to 10.75 mGy) / 25.29 days = 0.404 to 0.425 mGy for each day.
export const ARTEMIS1_COSMIC_RAYS: Rate = {
  value: 1.1,
  plusMinus: 0.14,
  unit: 'mSv',
  instrument: HERA,
  shielding: HERA_SHIELDING,
  solar: SOLAR_2022,
  says: 'The paper gives 0.96 to 1.24 mSv for each day from galactic cosmic rays, at three places in Orion. We use the middle of this range, 1.10. Plus or minus 0.14 covers the range.',
  source: GEORGE_2024,
  badge: 'real-rate',
  other: {
    value: 0.414,
    plusMinus: 0.011,
    unit: 'mGy',
    says: 'The paper gives the total absorbed dose from galactic cosmic rays: 10.21 to 10.75 mGy at the same three sensors. We divide it by the 25.29 days after the belts. The rate for each day is our division, not a number of the paper.',
  },
}

// The dose of the passes through the Van Allen belts. The paper gives a total for each sensor,
// not a rate for each day. Inner belt plus outer belt, three HERA sensors:
//   dose equivalent 1.80 + 0.12, 1.88 + 0.13, 3.94 + 0.18 mSv: 1.92 to 4.12 mSv, middle 3.02
//   absorbed dose   1.45 + 0.08, 1.49 + 0.08, 3.13 + 0.13 mGy: 1.53 to 3.26 mGy, middle 2.395
// The rate below is the middle divided by the length of the phase (238 minutes), so the phase
// has the published total.
const BELTS: Rate = {
  value: 18.27,
  plusMinus: 6.66,
  unit: 'mSv',
  instrument: HERA,
  shielding: HERA_SHIELDING,
  solar: SOLAR_2022,
  says: 'The paper gives the total dose of the belt passes, not a rate: 1.80 to 3.94 mSv in the inner belt and 0.12 to 0.18 mSv in the outer belt, at three places in Orion. The sum is 1.92 to 4.12 mSv. We use the middle, 3.02 mSv, for the whole phase. The rate for each day is this total divided by the length of the phase, which is our division.',
  source: GEORGE_2024,
  badge: 'real-rate',
  other: {
    value: 14.49,
    plusMinus: 5.23,
    unit: 'mGy',
    says: 'The paper gives the total absorbed dose of the belt passes: 1.45 to 3.13 mGy in the inner belt and 0.08 to 0.13 mGy in the outer belt. The sum is 1.53 to 3.26 mGy. We use the middle, 2.395 mGy, for the whole phase. The rate for each day is our division.',
  },
}

const ONE_RATE = 'The paper gives one cosmic-ray rate for the whole flight after the belts. It gives no rate for this phase alone.'

const phases: Phase[] = [
  {
    id: 'belts',
    label: 'Van Allen belts',
    kind: 'belts',
    days: days(0, BELTS_END),
    rate: BELTS,
    note: 'From the launch at 06:47 UTC to the end of the outer belt at 10:45 UTC. Orion passed the inner belt (protons) from 07:12 to 07:42 UTC and the outer belt (electrons) from 08:45 to 10:45 UTC.',
  },
  {
    id: 'cruise',
    label: 'Cruise to the Moon',
    kind: 'cruise',
    days: days(BELTS_END, OUTBOUND_FLYBY),
    rate: ARTEMIS1_COSMIC_RAYS,
    note: `Until the outbound flyby on 21 November 2022, 130 km above the Moon. ${ONE_RATE}`,
  },
  {
    id: 'to-orbit',
    label: 'Flyby to the distant orbit',
    kind: 'orbit',
    days: days(OUTBOUND_FLYBY, ORBIT_START),
    rate: ARTEMIS1_COSMIC_RAYS,
    note: `From the outbound flyby to the burn into the distant retrograde orbit on 25 November 2022. At the flyby, the Moon blocked about one third of the cosmic rays for a short time. ${ONE_RATE}`,
  },
  {
    id: 'orbit',
    label: 'Distant retrograde orbit',
    kind: 'orbit',
    days: days(ORBIT_START, ORBIT_END),
    rate: ARTEMIS1_COSMIC_RAYS,
    note: `Orion flew half of one distant retrograde orbit, about 40,000 miles (64,000 km) above the Moon, from 25 November to 1 December 2022. ${ONE_RATE}`,
  },
  {
    id: 'from-orbit',
    label: 'Distant orbit to the return flyby',
    kind: 'orbit',
    days: days(ORBIT_END, RETURN_FLYBY),
    rate: ARTEMIS1_COSMIC_RAYS,
    note: `From the burn out of the orbit to the return flyby on 5 December 2022, 128 km above the Moon. ${ONE_RATE}`,
  },
  {
    id: 'return',
    label: 'Return',
    kind: 'return',
    days: days(RETURN_FLYBY, SPLASHDOWN),
    rate: ARTEMIS1_COSMIC_RAYS,
    note: `From the return flyby to the splashdown on 11 December 2022 at 17:40 UTC. ${ONE_RATE} NASA switched HERA off shortly before the entry into the atmosphere.`,
  },
]

export const artemis1: Preset = {
  id: 'artemis1',
  name: 'Moon: Artemis I (Orion, uncrewed, 2022)',
  summary: 'Artemis I flew the Orion spacecraft with no crew around the Moon and back in 25.5 days, from 16 November to 11 December 2022.',
  badge: 'real-rate',
  destination: 'moon',
  frame: 'earth',
  trajectory: {
    file: 'artemis1',
    source: HORIZONS,
    note: 'The real flight path of Orion, from the navigation data of NASA Johnson Space Center, as JPL Horizons gives it. The data start about 2 hours after the launch.',
    badge: 'real-data',
  },
  phases,
  crew: 4,
  cabin: { name: 'Orion crew module', freeVolumeM3: 9.34, source: ORION_VOLUME },
  findings: [
    {
      text: 'In the inner Van Allen belt, the least shielded places in Orion got about 4 times the dose rate of the most shielded place: 287 and 240 µGy for each minute against 69.',
      source: GEORGE_2024,
    },
    {
      text: 'Near the end of the inner belt pass, Orion turned by 90 degrees for an engine burn. The dose rate went down by about 50%, because the thick parts of Orion then faced the protons.',
      source: GEORGE_2024,
    },
    {
      text: 'At the two close flybys, the Moon blocked about one third of the galactic cosmic rays.',
      source: GEORGE_2024,
    },
    {
      text: 'No solar particle event occurred during the mission.',
      source: GEORGE_2024,
    },
    {
      text: 'Galactic cosmic rays gave most of the dose. The inner belt gave up to 23% of the total dose at one sensor.',
      source: GEORGE_2024,
    },
    {
      text: 'The total of the mission was 26.7 to 35.4 mSv (11.90 to 13.47 mGy) at the three HERA sensors.',
      source: GEORGE_2024,
    },
  ],
  flags: [
    'Artemis I flew no crew. The preset keeps a crew of 4 for the cabin model, because Orion carries 4 astronauts.',
    'Orion has heavy shielding. The paper says that its dose equivalent rates from cosmic rays were "as much as 60% lower" than the earlier measurement of MSL RAD on the way to Mars. Do not compare this rate with MSL RAD without the difference in shielding and in the solar cycle.',
    'The numbers in the body of the paper give a smaller difference than 60%: 0.96 to 1.24 mSv for each day in Orion against 1.58 for MSL RAD. That is 22% to 39% lower (our arithmetic).',
    'The paper gives a range for three sensors, not one value. The rates of this preset are the middle of that range.',
    'The paper gives a total dose for the Van Allen belts, not a rate. The belt rate for each day is that total divided by the length of the phase (our division).',
    'The phases count from the launch. The trajectory file starts about 2 hours after the launch.',
  ],
  sources: [GEORGE_2024, NASA_MISSION, NASA_BLOG, ORION_VOLUME, HORIZONS],
}
