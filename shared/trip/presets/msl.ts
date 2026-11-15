// Mars Science Laboratory (MSL): the flight that took the Curiosity rover to Mars,
// 26 November 2011 to 6 August 2012. The RAD instrument measured the radiation inside the
// spacecraft for most of the flight.
//
// Each number has its exact quote and its place in the source in docs/sources-mars-iss.md.
// The TGO and the crewed reference presets use the sources, the rates, and the texts of this file.
import type { Preset, Rate, SourceRef } from '../types.ts'

// ---------------------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------------------
export const ZEITLIN_2013: SourceRef = {
  short: 'Zeitlin et al. 2013',
  title: 'Zeitlin, C., Hassler, D. M., Cucinotta, F. A., et al. Measurements of energetic particle radiation in transit to Mars on the Mars Science Laboratory. Science 340, 1080–1084 (2013).',
  url: 'https://doi.org/10.1126/science.1235989',
}

export const HASSLER_2014: SourceRef = {
  short: 'Hassler et al. 2014',
  title: "Hassler, D. M., Zeitlin, C., Wimmer-Schweingruber, R. F., et al. Mars' surface radiation environment measured with the Mars Science Laboratory's Curiosity rover. Science 343, 1244797 (2014).",
  url: 'https://doi.org/10.1126/science.1244797',
}

// A short open paper of the RAD team that gives the cruise and the surface value in one sentence.
export const ZEITLIN_2014: SourceRef = {
  short: 'Zeitlin et al. 2014',
  title: 'Zeitlin, C., Hassler, D. M., Wimmer-Schweingruber, R. F., et al. New results from the MSL-RAD experiment on Curiosity. Eighth International Conference on Mars (2014), abstract 1151.',
  url: 'https://www.hou.usra.edu/meetings/8thmars2014/pdf/1151.pdf',
}

export const GUO_2015: SourceRef = {
  short: 'Guo et al. 2015',
  title: 'Guo, J., Zeitlin, C., Wimmer-Schweingruber, R. F., et al. Variations of dose rate observed by MSL/RAD in transit to Mars. Astronomy & Astrophysics 577, A58 (2015).',
  url: 'https://arxiv.org/abs/1503.06631',
}

export const GUO_2021: SourceRef = {
  short: 'Guo et al. 2021',
  title: 'Guo, J., Zeitlin, C., Wimmer-Schweingruber, R. F., et al. Radiation environment for future human exploration on the surface of Mars: the current understanding based on MSL/RAD dose measurements. The Astronomy and Astrophysics Review 29, 8 (2021).',
  url: 'https://doi.org/10.1007/s00159-021-00136-5',
}

export const MATTHIA_2016: SourceRef = {
  short: 'Matthiä et al. 2016',
  title: 'Matthiä, D., Ehresmann, B., Lohf, H., et al. The Martian surface radiation environment – a comparison of models and MSL/RAD measurements. Journal of Space Weather and Space Climate 6, A13 (2016).',
  url: 'https://doi.org/10.1051/swsc/2016008',
}

// JPL asks for this reference (Horizons manual, "Acknowledgements"), with the date of retrieval.
// The date is in the trajectory file.
const HORIZONS_CREDIT =
  'Giorgini, JD and JPL Solar System Dynamics Group, NASA/JPL Horizons On-Line Ephemeris System, https://ssd.jpl.nasa.gov/horizons/. The trajectory file holds the date of retrieval.'

export const HORIZONS_MSL: SourceRef = {
  short: 'JPL Horizons',
  title: 'NASA/JPL Horizons On-Line Ephemeris System, target "Mars Science Laboratory (spacecraft)" (-76), with the Earth and Mars, relative to the Sun.',
  url: 'https://ssd.jpl.nasa.gov/horizons/',
  credit: HORIZONS_CREDIT,
}

export const HORIZONS_TGO: SourceRef = {
  short: 'JPL Horizons',
  title: 'NASA/JPL Horizons On-Line Ephemeris System, target "ExoMars16 TGO (spacecraft)" (-143), with the Earth and Mars, relative to the Sun.',
  url: 'https://ssd.jpl.nasa.gov/horizons/',
  credit: HORIZONS_CREDIT,
}

// The cabin of the Mars presets. MSL and TGO had no crew and no cabin, so the CO2 and O2
// forecast uses a NASA design of a habitat for the flight to Mars.
export const TRANSIT_HABITAT: SourceRef = {
  short: 'Simon et al. 2015 (NASA)',
  title:
    'Simon, M. A., Toups, L., Howe, A. S., Wald, S. Evolvable Mars Campaign Long Duration Habitation Strategies: Architectural Approaches to Enable Human Exploration Missions. AIAA SPACE 2015. ' +
    'Figure 1, "Mars transit habitat baseball card - 1100 days": crew 4, pressurized volume 210.7 m³, habitable volume 100.0 m³.',
  url: 'https://ntrs.nasa.gov/citations/20160006311',
}

export const CREW_OF_FOUR: SourceRef = {
  short: 'Takada et al. 2023 (NASA)',
  title: 'Takada, K., Hornyak, D., Garr, J., et al. Status of the Advanced Oxygen Generation Assembly. 52nd International Conference on Environmental Systems, ICES-2023-311 (2023).',
  url: 'https://ntrs.nasa.gov/citations/20230008013',
}

export const MARS_CABIN: Preset['cabin'] = {
  name: 'NASA Mars transit habitat (design study of 2015)',
  freeVolumeM3: 100,
  source: TRANSIT_HABITAT,
  assumption:
    'The air volume of the cabin is the habitable volume of the design: 100 m³ for a crew of 4 (25 m³ for each person). ' +
    'The pressurized volume of the design is 210.7 m³, but equipment and stores fill a part of it. NASA gives no free air volume.',
}

// ---------------------------------------------------------------------------------------
// The radiation rates of MSL RAD
// ---------------------------------------------------------------------------------------
export const MSL_CRUISE_RATE: Rate = {
  value: 1.84,
  plusMinus: 0.33,
  unit: 'mSv',
  instrument: 'MSL RAD (Radiation Assessment Detector)',
  shielding:
    'Inside the spacecraft, on the Curiosity rover. The shielding was not even: about 16 g/cm² as a mean over all directions, and less than 5 g/cm² for about 30% of the sky above the instrument.',
  solar: 'Rise and maximum of solar cycle 24, which was a very weak maximum (December 2011 to July 2012).',
  says:
    'In cruise, the dose equivalent rate from galactic cosmic rays was 1.84 ± 0.33 mSv for each day. ' +
    'The absorbed dose rate of the same measurement was 0.481 ± 0.080 mGy for each day, and the mean quality factor was 3.82 ± 0.25.',
  source: ZEITLIN_2013,
  badge: 'real-rate',
  other: {
    value: 0.481,
    plusMinus: 0.08,
    unit: 'mGy',
    says:
      'The absorbed dose rate from galactic cosmic rays in cruise was 0.481 ± 0.080 mGy for each day, as dose in water (converted from the silicon detector). ' +
      'In the silicon detector itself it was 0.332 ± 0.023 mGy for each day.',
  },
}

export const MARS_SURFACE_RATE: Rate = {
  value: 0.64,
  plusMinus: 0.12,
  unit: 'mSv',
  instrument: 'MSL RAD on the Curiosity rover',
  shielding: 'On the surface of Mars in Gale crater, under the atmosphere: about 21 g/cm² of carbon dioxide above the instrument. The planet blocks the radiation from below.',
  solar: 'Near the maximum of solar cycle 24, which was a very weak maximum (August 2012 to June 2013).',
  says:
    'On the surface, the dose equivalent rate from galactic cosmic rays was 0.64 ± 0.12 mSv for each day. ' +
    'The absorbed dose rate was 0.21 ± 0.04 mGy for each day, and the mean quality factor was about 3.05.',
  source: HASSLER_2014,
  badge: 'real-rate',
  other: {
    value: 0.21,
    plusMinus: 0.04,
    unit: 'mGy',
    says: 'The absorbed dose rate from galactic cosmic rays at Gale crater was 0.210 ± 0.040 mGy for each day, as dose in tissue.',
  },
}

// ---------------------------------------------------------------------------------------
// Notes that more than one Mars preset shows
// ---------------------------------------------------------------------------------------
export const FLAG_FLAT_LINE =
  'The dose line of the cruise is flat, because the distance from the Sun changes the dose very little on this path. ' +
  'Galactic cosmic rays grow by about 4.5% for each AU in this part of the Solar System. The RAD team calls the effect between 1 and 1.5 AU "very small" (Guo et al. 2015). ' +
  'An AU is the mean distance between the Earth and the Sun.'

export const FLAG_SOLAR_CYCLE =
  'The Sun changes the dose more than the path does. MSL flew in 2011 and 2012, in the rise and the weak maximum of solar cycle 24. ' +
  'An active Sun keeps a part of the galactic cosmic rays out, so the dose is lower at solar maximum. ' +
  'ExoMars TGO flew in 2016, in the declining phase of the same cycle, and it measured a higher dose equivalent: about 2.0 against 1.84 mSv for each day.'

export const FLAG_SHIELDING =
  'The two instruments had different shielding. RAD was inside the MSL spacecraft, on the rover: about 16 g/cm² as a mean, with large differences between directions. ' +
  'Liulin-MO sits outside the body of the TGO orbiter, on the FREND instrument: from 1 to 100 g/cm², about 20 g/cm² as a mean. ' +
  'A crew cabin will have its own shielding, so its dose will differ from both.'

export const FLAG_UNITS =
  'mGy is absorbed dose: the energy that the radiation leaves in a material. mSv is dose equivalent: the absorbed dose times a quality factor for the harm that each kind of particle does to the body. ' +
  'The page shows a mission in one unit. It never adds the two units and it does no conversion of its own.'

export const FLAG_SILICON =
  'Take care with the mGy values of the two instruments. The Liulin-MO value is the dose in silicon, the material of its detectors. ' +
  'The RAD value is converted to dose in water, which is higher: RAD measured 0.332 mGy for each day in silicon and gives 0.481 in water.'

export const FLAG_STORMS =
  'A solar particle event that you add in the simulator is a what-if scenario. It is not a forecast: nobody can predict the day or the size of such an event.'

export const FLAG_NO_CREW = 'This flight had no crew. The crew of 4 and the cabin are a reference for the CO2 and O2 forecast only.'

export const FLAG_LIMIT =
  'The NASA career limit is for effective dose, a dose for the whole body. The instruments give dose equivalent at one point behind their own shielding. ' +
  'Both use mSv, but they are not the same quantity. So the day when the mission passes the limit is an estimate.'

export const FLAG_REVISED =
  'The RAD team later lowered its cruise value by about 15%, to 1.58 ± 0.22 mSv for each day (Zeitlin et al. 2019, reported in Guo et al. 2021). ' +
  'The new analysis removes the background of the power source of the rover in a better way, and it uses a new factor to convert the dose in silicon to the dose in water. ' +
  'This preset keeps 1.84, the value of the paper of 2013, because the surface value of 2014 comes from the same method.'

// ---------------------------------------------------------------------------------------
// The preset
// ---------------------------------------------------------------------------------------
// The paper counts a cruise of 253 days. The trajectory file runs from 26 November 2011,
// 15:51 UTC, to the landing on 6 August 2012, 05:18 UTC: 253.6 days.
export const MSL_CRUISE_DAYS = 253

export const msl: Preset = {
  id: 'msl',
  name: 'Mars: MSL/Curiosity cruise',
  summary:
    'The flight that took the Curiosity rover to Mars, from 26 November 2011 to 6 August 2012. The RAD instrument measured the radiation inside the spacecraft on the way.',
  badge: 'real-data',
  destination: 'mars',
  frame: 'sun',
  trajectory: {
    file: 'msl',
    source: HORIZONS_MSL,
    note: 'The real path of the spacecraft from JPL Horizons, from the launch on 26 November 2011 to the landing on 6 August 2012, with the places of the Earth and Mars.',
    badge: 'real-data',
  },
  phases: [
    {
      id: 'cruise',
      label: 'Cruise to Mars',
      kind: 'cruise',
      days: MSL_CRUISE_DAYS,
      rate: MSL_CRUISE_RATE,
      note:
        'RAD measured from 6 December 2011 to 14 July 2012. The rate is the mean for galactic cosmic rays. ' +
        'Five solar particle events added 24.7 mSv in total, about 5% of the dose of the cruise.',
    },
  ],
  crew: 4,
  cabin: MARS_CABIN,
  findings: [
    {
      text: 'For the shortest round trip to Mars with the propulsion of today and with shielding like that of MSL, the paper gives a dose equivalent of 0.66 ± 0.12 Sv.',
      source: ZEITLIN_2013,
    },
    {
      text: 'RAD saw five solar particle events in the cruise. Together they gave 24.7 mSv, about 5% of the dose equivalent of the cruise (about 466 mSv).',
      source: GUO_2015,
    },
    {
      text: 'The dose rate of RAD went up and down with the activity of the Sun, at nearly the same time as the cosmic ray counts on the Earth.',
      source: GUO_2021,
    },
  ],
  flags: [FLAG_NO_CREW, FLAG_REVISED, FLAG_FLAT_LINE, FLAG_SOLAR_CYCLE, FLAG_SHIELDING, FLAG_UNITS, FLAG_LIMIT, FLAG_STORMS],
  sources: [ZEITLIN_2013, ZEITLIN_2014, GUO_2015, GUO_2021, HORIZONS_MSL, TRANSIT_HABITAT],
}
