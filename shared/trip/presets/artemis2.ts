// Artemis II: the first crewed flight of Orion around the Moon, 1 to 11 April 2026 (UTC).
//
// The flight path and the dates are real. NASA has not published the measured dose yet
// (checked on 15 November 2026), so the dose rates are the Artemis I rates, as a proxy.
// Each number has its exact quote and its place in the source in docs/sources-lunar.md.
import type { Phase, Preset, Rate, SourceRef } from '../types.ts'
import { ARTEMIS1_COSMIC_RAYS, GEORGE_2024, HORIZONS_CREDIT, ORION_VOLUME } from './artemis1.ts'

const HORIZONS: SourceRef = {
  short: 'JPL Horizons',
  title: 'NASA/JPL Horizons On-Line Ephemeris System, target "Artemis II (spacecraft)" (-1024), the Orion spacecraft "Integrity".',
  url: 'https://ssd.jpl.nasa.gov/horizons/',
  credit: HORIZONS_CREDIT,
}

const NASA_BLOG: SourceRef = {
  short: 'NASA Artemis II flight day posts',
  title: 'NASA, Artemis II flight day posts (April 2026): launch, translunar injection burn, lunar flyby, splashdown.',
  url: 'https://www.nasa.gov/blogs/missions/2026/04/10/artemis-ii-flight-day-10-re-entry-live-updates/',
}

const NASA_SENSORS: SourceRef = {
  short: 'NASA, Artemis II research',
  title: 'NASA, "Artemis II Crew Both Subjects and Scientists in NASA Deep Space Research": the radiation sensors inside Orion.',
  url: 'https://www.nasa.gov/general/artemis-ii-crew-both-subjects-and-scientists-in-nasa-deep-space-research/',
}

// ---------------------------------------------------------------------------------------
// The timeline, in minutes after the launch (1 April 2026, 22:35 UTC).
// ---------------------------------------------------------------------------------------
const MINUTES_PER_DAY = 1440
// 2 April, 23:49 UTC: the start of the translunar injection burn (NASA: 7:49 p.m. EDT).
const INJECTION = 1514
// 6 April, 23:00 UTC: the closest point to the Moon, 4,067 miles above it (NASA: 7:00 p.m. EDT).
const FLYBY = 7225
// 11 April, 00:07 UTC: the splashdown (NASA: 8:07 p.m. EDT on 10 April).
const SPLASHDOWN = 13_052

const days = (fromMinute: number, toMinute: number) => (toMinute - fromMinute) / MINUTES_PER_DAY

// The Artemis I rate after the belts, as a proxy.
const COSMIC_RAYS: Rate = {
  ...ARTEMIS1_COSMIC_RAYS,
  badge: 'proxy',
  proxyOf: 'Artemis I',
  says: 'Proxy from Artemis I, the same spacecraft type with no crew. George et al. 2024 give 0.96 to 1.24 mSv for each day from galactic cosmic rays, at three places in Orion. We use the middle of this range, 1.10.',
}

// No value: the Artemis I belt dose is for another path through the belts.
const EARTH_ORBIT: Rate = {
  value: null,
  unit: 'mSv',
  instrument: 'No published measurement',
  shielding: 'Inside the Orion crew module',
  solar: 'April 2026',
  says: 'No data. NASA has not published the measured dose of Artemis II. Artemis I passed the Van Allen belts one time, in about 4 hours. Artemis II stayed about 25 hours in a high Earth orbit before it left for the Moon, so the Artemis I belt dose does not apply.',
  source: NASA_SENSORS,
  badge: 'proxy',
}

const phases: Phase[] = [
  {
    id: 'belts',
    label: 'High Earth orbit (Van Allen belts)',
    kind: 'belts',
    days: days(0, INJECTION),
    rate: EARTH_ORBIT,
    note: 'From the launch on 1 April 2026 at 22:35 UTC to the burn toward the Moon on 2 April at 23:49 UTC. Orion flew one high orbit around the Earth, with its highest point at about 70,000 km.',
  },
  {
    id: 'cruise',
    label: 'Cruise to the Moon',
    kind: 'cruise',
    days: days(INJECTION, FLYBY),
    rate: COSMIC_RAYS,
    note: 'From the burn toward the Moon to the closest point of the flyby on 6 April 2026 at 23:00 UTC, 4,067 miles (6,545 km) above the Moon. The first hours of this phase still pass the Van Allen belts, and the proxy rate does not count them.',
  },
  {
    id: 'return',
    label: 'Return',
    kind: 'return',
    days: days(FLYBY, SPLASHDOWN),
    rate: COSMIC_RAYS,
    note: 'From the flyby to the splashdown in the Pacific Ocean on 11 April 2026 at 00:07 UTC (10 April, 8:07 p.m. EDT).',
  },
]

export const artemis2: Preset = {
  id: 'artemis2',
  name: 'Moon: Artemis II (crewed, 2026)',
  summary: 'Artemis II flew four astronauts in the Orion spacecraft around the Moon and back in 9 days, from 1 to 11 April 2026 (UTC).',
  badge: 'real-trajectory-proxy',
  destination: 'moon',
  frame: 'earth',
  trajectory: {
    file: 'artemis2',
    source: HORIZONS,
    note: 'The real flight path of Orion, from the navigation data of NASA Johnson Space Center, as JPL Horizons gives it. The data start 3 hours 24 minutes after the launch, when Orion left the upper stage.',
    badge: 'real-data',
  },
  phases,
  crew: 4,
  cabin: { name: 'Orion crew module', freeVolumeM3: 9.34, source: ORION_VOLUME },
  flags: [
    'Artemis I proxy. NASA has not published the measured dose of Artemis II (checked on 15 November 2026). The dose rates of the cruise and of the return are the Artemis I rates.',
    'The first day has no dose value. Artemis II stayed about 25 hours in a high Earth orbit, on another path through the Van Allen belts than Artemis I. So the total dose of the mission is not complete.',
    'Artemis I flew in November and December 2022. Artemis II flew in April 2026. The dose rate from cosmic rays changes with the solar cycle, so the real rate of Artemis II can differ.',
    'NASA said before the flight that Orion carries six HERA sensors, four M-42 EXT sensors, and one Crew Active Dosimeter for each astronaut. Their results can replace the proxy when NASA publishes them.',
    'The phases count from the launch. The trajectory file starts 3 hours 24 minutes after the launch.',
  ],
  sources: [NASA_BLOG, HORIZONS, GEORGE_2024, NASA_SENSORS, ORION_VOLUME],
}
