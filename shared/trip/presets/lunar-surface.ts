// A stay on the surface of the Moon. No crewed flight is behind this preset: the dose rate is
// the measurement of the LND instrument on the Chang'E 4 lander (2019), and the crew, the cabin,
// and the length of the stay follow a NASA concept for a surface habitat.
// Each number has its exact quote and its place in the source in docs/sources-lunar.md.
import type { Preset, Rate, SourceRef } from '../types.ts'
import { GEORGE_2024 } from './artemis1.ts'

const ZHANG_2020: SourceRef = {
  short: 'Zhang et al. 2020',
  title: 'Zhang, S., Wimmer-Schweingruber, R. F., Yu, J., et al. First measurements of the radiation dose on the lunar surface. Science Advances 6, eaaz1334 (2020).',
  url: 'https://doi.org/10.1126/sciadv.aaz1334',
  credit:
    'Lunar Lander Neutrons and Dosimetry (LND) experiment on the Chang’E 4 lander of the China National Space Administration (CNSA). A team at Kiel University (Germany) designed LND, with support of the German Space Agency at DLR (grant 50 JR 1604).',
}

const SURFACE_HABITAT: SourceRef = {
  short: 'Burke, Howard, Kessler 2022 (NASA)',
  title: 'Burke, C., Howard, R. L., Kessler, P. Internal Layout of a Lunar Surface Habitat. AIAA ASCEND 2022. NASA Technical Reports Server, document 20220013669.',
  url: 'https://ntrs.nasa.gov/citations/20220013669',
}

const COMPUTED: SourceRef = { short: 'Computed by this app', title: 'This app computes the place. No flight path of a real mission is behind it.', url: '' }

// The paper gives the values for each hour. For each day: times 24.
//   dose equivalent 57.1 ± 10.6 µSv for each hour. The paper also gives 1369 µSv for each day.
//   absorbed dose   13.2 ± 1 µGy for each hour, which is 316.8 ± 24 µGy for each day.
const LND: Rate = {
  value: 1.369,
  plusMinus: 0.254,
  unit: 'mSv',
  instrument: 'Chang’E 4 LND (Lunar Lander Neutrons and Dosimetry, Kiel University, on the CNSA lander)',
  shielding: 'Inside the payload compartment of the lander, behind about 1 g/cm² (about 3.5 mm of aluminium). The paper compares this with a space suit or a rover, not with a habitat.',
  solar: 'Near solar minimum (January and February 2019), when galactic cosmic rays are strongest.',
  says: 'LND measured "an average dose equivalent of 1369 μSv/day on the surface of the Moon", which is 57.1 ± 10.6 µSv for each hour. This value counts charged particles only.',
  source: ZHANG_2020,
  badge: 'real-rate',
  other: {
    value: 0.317,
    plusMinus: 0.024,
    unit: 'mGy',
    says: 'The paper gives "an average total absorbed dose rate in silicon of 13.2 ± 1 μGy/hour", which is 0.317 mGy for each day. This value also counts neutral particles (3.1 ± 0.5 µGy for each hour).',
  },
}

export const lunarSurface: Preset = {
  id: 'lunar-surface',
  name: 'Lunar surface stay',
  summary: 'A stay of 30 days on the surface of the Moon, with the dose rate that the Chang’E 4 lander measured there in 2019.',
  badge: 'real-rate',
  destination: 'moon',
  frame: 'earth',
  trajectory: {
    file: null,
    source: COMPUTED,
    note: 'No real flight path. The map puts the crew at the place of the Moon.',
    badge: 'modelled',
  },
  phases: [
    {
      id: 'surface',
      label: 'Lunar surface',
      kind: 'surface',
      days: 30,
      rate: LND,
      note: 'LND measured in the Von Kármán crater on the far side of the Moon, from 3 to 12 January and from 31 January to 10 February 2019.',
    },
  ],
  // The simulator can change the length of the stay. The limits are our choice.
  surfaceStay: { phaseId: 'surface', defaultDays: 30, minDays: 1, maxDays: 180 },
  crew: 2,
  cabin: { name: 'NASA Surface Habitat (concept)', freeVolumeM3: 127, source: SURFACE_HABITAT },
  findings: [
    {
      text: 'The dose equivalent on the Moon was about 2.6 times the dose equivalent inside the International Space Station in the same days (1369 against 523 µSv for each day from galactic cosmic rays).',
      source: ZHANG_2020,
    },
    {
      text: 'Neutral particles (neutrons and gamma rays from the lunar soil) gave 23 ± 8% of the absorbed dose.',
      source: ZHANG_2020,
    },
    {
      text: 'No solar particle event occurred during the measurement.',
      source: ZHANG_2020,
    },
    {
      text: 'For another time of the solar cycle: George et al. 2024 list 0.81 mSv for each day on the lunar surface for December 2022, with Zhang et al. 2020 as the source.',
      source: GEORGE_2024,
    },
  ],
  flags: [
    'The rate comes from the Chang’E 4 lander of CNSA (China National Space Administration). CNSA is not a Space Apps partner agency. The LND instrument is German: a team at Kiel University designed it, with support of the German Space Agency at DLR.',
    'The instrument sat behind thin shielding (about 1 g/cm²), like a space suit or a rover. The paper says the value is a good estimate for work outside in a space suit. A habitat with more shielding gets a lower dose.',
    'The rate is from a time near solar minimum. The paper says it is an upper limit of the dose from galactic cosmic rays at low solar activity.',
    'The dose equivalent (mSv) counts charged particles only. The absorbed dose (mGy) also counts neutral particles.',
    'The stay of 30 days and the crew of 2 are our choice. They follow the NASA Surface Habitat concept: 2 astronauts for about 30 days, in about 127 m³.',
  ],
  sources: [ZHANG_2020, SURFACE_HABITAT, GEORGE_2024],
}
