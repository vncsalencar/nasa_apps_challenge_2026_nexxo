// ExoMars Trace Gas Orbiter (TGO): the flight of the orbiter of ESA and Roscosmos to Mars,
// 14 March to 19 October 2016. The Liulin-MO dosimeter (a Bulgarian instrument, a part of the
// Russian FREND instrument) measured the radiation from 22 April to 15 September 2016.
//
// Each number has its exact quote and its place in the source in docs/sources-mars-iss.md.
import type { Preset, Rate, SourceRef } from '../types.ts'
import {
  FLAG_FLAT_LINE,
  FLAG_LIMIT,
  FLAG_NO_CREW,
  FLAG_SHIELDING,
  FLAG_SILICON,
  FLAG_SOLAR_CYCLE,
  FLAG_STORMS,
  FLAG_UNITS,
  GUO_2021,
  HORIZONS_TGO,
  MARS_CABIN,
  TRANSIT_HABITAT,
} from './msl.ts'

export const SEMKOVA_2018: SourceRef = {
  short: 'Semkova et al. 2018',
  title:
    'Semkova, J., Koleva, R., Benghin, V., et al. Charged particles radiation measurements with Liulin-MO dosimeter of FREND instrument aboard ExoMars Trace Gas Orbiter during the transit and in high elliptic Mars orbit. Icarus 303, 53–66 (2018).',
  url: 'https://doi.org/10.1016/j.icarus.2017.12.034',
}

// The data file of the instrument team, and its user manual (section 5.10).
export const LIULIN_DATA: SourceRef = {
  short: 'Liulin-MO data, SRTI-BAS',
  title:
    'Unified web-based database of Liulin-type instruments, data source LIULIN_MO, file "Cruise to Mars" (22 April to 15 September 2016). ' +
    'Space Research and Technology Institute, Bulgarian Academy of Sciences, ESA contract 4000117692/16/NL/NDe.',
  url: 'http://esa-pro.space.bas.bg/datasources/LIULIN_MO',
  credit:
    'Liulin-MO data: J. Semkova (Space Research and Technology Institute, Bulgarian Academy of Sciences) and V. Benghin (Institute of Biomedical Problems, Russian Academy of Sciences). Reference: Semkova et al., Icarus 303, 53–66 (2018).',
}

export const SEMKOVA_2025: SourceRef = {
  short: 'Semkova et al. 2025',
  title:
    'Semkova, J., Koleva, R., Benghin, V., et al. Radiation conditions in Mars vicinity during different phases of the solar cycle according measurements by Liulin-MO dosimeter aboard the Trace Gas Orbiter. ' +
    'Proceedings of the 17th Workshop "Solar Influences on the Magnetosphere, Ionosphere and Atmosphere" (2025).',
  url: 'https://www.spaceclimate.bas.bg/ws-sozopol/pdf/Articles/Semkova2025.pdf',
}

export const ESA_2018: SourceRef = {
  short: 'ESA 2018',
  title: 'ESA, "ExoMars highlights radiation risk for Mars astronauts, and watches as dust storm subsides" (19 September 2018).',
  url: 'https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Exploration/ExoMars/ExoMars_highlights_radiation_risk_for_Mars_astronauts_and_watches_as_dust_storm_subsides',
}

// The paper gives one value for each of the two detector pairs: 372 ± 37 and 390 ± 39 µGy for
// each day. A Rate holds one value, so this one is the mean of the two: 381 µGy = 0.381 mGy.
// Our daily series from the data file of the team has the same mean (0.380 mGy).
export const LIULIN_CRUISE_RATE: Rate = {
  value: 0.381,
  plusMinus: 0.038,
  unit: 'mGy',
  instrument: 'Liulin-MO dosimeter of the FREND instrument',
  shielding:
    'Outside the body of the orbiter, on the FREND instrument. The mass of the spacecraft around the detectors shields them with 1 to 100 g/cm², about 20 g/cm² as a mean (the paper of 2018 gave about 10 g/cm²).',
  solar: 'Declining phase of solar cycle 24 (April to September 2016).',
  says:
    'The mean dose rate in silicon from galactic cosmic rays in the transit to Mars, from 22 April to 15 September 2016, is 372 ± 37 and 390 ± 39 µGy for each day in two perpendicular directions. ' +
    'The value here is the mean of the two directions. The dose equivalent rate of the same period is about 2 ± 0.3 mSv for each day.',
  source: SEMKOVA_2018,
  badge: 'real-rate',
  other: {
    value: 2.0,
    plusMinus: 0.3,
    unit: 'mSv',
    says:
      'The dose equivalent rate from galactic cosmic rays in the transit, from 22 April to 15 September 2016, is about 2 ± 0.3 mSv for each day. ' +
      'The team computes it from the measured dose and a quality factor that depends on the energy that each particle leaves. We could not read the mean quality factor of the cruise in the paper.',
  },
}

// The trajectory file runs from the launch day, 14 March 2016 (20:13 UTC), to the burn that put
// the orbiter in orbit around Mars on 19 October 2016 (13:05 to 15:24 GMT, ESA): 218.8 days.
export const TGO_CRUISE_DAYS = 219

export const tgo: Preset = {
  id: 'tgo',
  name: 'Mars: ExoMars TGO cruise (2016)',
  summary:
    'The flight of the ExoMars Trace Gas Orbiter of ESA and Roscosmos to Mars, from 14 March to 19 October 2016. The Liulin-MO dosimeter measured the radiation on the way.',
  badge: 'real-data',
  destination: 'mars',
  frame: 'sun',
  trajectory: {
    file: 'tgo',
    source: HORIZONS_TGO,
    note: 'The real path of the orbiter from JPL Horizons, from the launch day, 14 March 2016, to the arrival in orbit around Mars on 19 October 2016, with the places of the Earth and Mars.',
    badge: 'real-data',
  },
  phases: [
    {
      id: 'cruise',
      label: 'Cruise to Mars',
      kind: 'cruise',
      days: TGO_CRUISE_DAYS,
      rate: LIULIN_CRUISE_RATE,
      note:
        'Liulin-MO measured from 22 April to 15 September 2016, with a pause from 19 July to 11 August. The rate is the mean of that time. ' +
        'The instrument saw no solar particle event in the cruise.',
    },
  ],
  crew: 4,
  cabin: MARS_CABIN,
  findings: [
    {
      text:
        'ESA: on a flight of six months to Mars and six months back, an astronaut could get at least 60% of the total radiation dose limit that is recommended for a career. ' +
        'ESA does not name the limit in this text. The text is from 2018, before NASA set its limit of 600 mSv.',
      source: ESA_2018,
    },
    {
      text: 'In the cruise, the dosimeter measured galactic cosmic rays only. It registered no solar particle event.',
      source: LIULIN_DATA,
    },
    {
      text:
        'The RAD team compared the two flights: the higher value of TGO comes mainly from the weaker Sun of 2016, and the different shielding of the two spacecraft changed the result little.',
      source: GUO_2021,
    },
    {
      text:
        'In the data file of the team, the dose rate rose by about 3% while the orbiter went from 1.08 to 1.38 AU from the Sun (374 to 386 µGy for each day). This is our reading of the file. A part of the rise comes from the Sun, which became less active in these months.',
      source: LIULIN_DATA,
    },
  ],
  flags: [FLAG_NO_CREW, FLAG_FLAT_LINE, FLAG_SOLAR_CYCLE, FLAG_SHIELDING, FLAG_UNITS, FLAG_SILICON, FLAG_LIMIT, FLAG_STORMS],
  sources: [SEMKOVA_2018, LIULIN_DATA, SEMKOVA_2025, GUO_2021, ESA_2018, HORIZONS_TGO, TRANSIT_HABITAT],
}
