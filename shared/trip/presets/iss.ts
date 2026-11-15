// Six months on the International Space Station, in low Earth orbit (LEO).
//
// The radiation rate is the mean of a real record: the daily absorbed dose on the station in the
// window of the Rodent Research-9 mission (18 August to 16 September 2017), from the NASA
// Environmental Data Application (EDA). The script server/scripts/fetch-eda-radiation.ts makes
// the file web/src/trip/data/eda-rr9-radiation.json with the value of each day.
//
// Each number has its exact quote and its place in the source in docs/sources-mars-iss.md.
import type { Preset, Rate, SourceRef } from '../types.ts'
import { FLAG_STORMS, FLAG_UNITS } from './msl.ts'

export const EDA_RADIATION: SourceRef = {
  short: 'NASA EDA, RR-9',
  title:
    'NASA Open Science Data Repository, Environmental Data Application (EDA), mission Rodent Research-9, radiation data: the absorbed dose of each day on the International Space Station, ' +
    'analysed by the Space Radiation Analysis Group (SRAG) of NASA-JSC.',
  url: 'https://visualization.osdr.nasa.gov/eda/dashboard_RR-9',
  credit: 'Data and visualizations are courtesy of the Environmental Data Application (EDA) (https://visualization.osdr.nasa.gov/eda/)',
}

export const BERGER_2018: SourceRef = {
  short: 'Berger et al. 2018',
  title: 'Berger, T., Matthiä, D., Burmeister, S., et al. The solar particle event on 10 September 2017 as observed onboard the International Space Station (ISS). Space Weather 16, 1173–1189 (2018).',
  url: 'https://doi.org/10.1029/2018SW001920',
}

export const ISS_GUIDE: SourceRef = {
  short: 'NASA ISS Reference Guide 2015',
  title: 'NASA, Reference Guide to the International Space Station, 2015, page 78: "a pressurized volume of approximately 916 m3".',
  url: 'https://www.nasa.gov/wp-content/uploads/2017/09/np-2015-05-022-jsc-iss-guide-2015-update-111015-508c.pdf',
}

export const ISS_CREW_2017: SourceRef = {
  short: 'NASA releases, September 2017',
  title:
    'NASA news releases of September 2017 on the crew of the station: three crew members left on 2 September 2017 (Soyuz MS-04), and three arrived on 13 September 2017 (Soyuz MS-06). The station had 6 persons before and after.',
  url: 'https://www.nasa.gov/news-release/three-new-crew-members-arrive-at-international-space-station/',
}

const CELESTRAK: SourceRef = {
  short: 'CelesTrak',
  title: 'CelesTrak GP element set of ISS (ZARYA), NORAD catalog number 25544.',
  url: 'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE',
  credit: 'Orbit elements from CelesTrak (https://celestrak.org).',
}

// The mean of the 30 days of the record: 0.3197 mGy for each day (galactic cosmic rays 0.138,
// South Atlantic Anomaly 0.181). The script prints these values.
export const ISS_RATE: Rate = {
  value: 0.32,
  unit: 'mGy',
  instrument: 'Dosimeters on the station, analysed by the NASA Space Radiation Analysis Group (the source does not name the instruments)',
  shielding: 'Inside the International Space Station, in low Earth orbit. The magnetic field of the Earth shields the station from a part of the cosmic rays.',
  solar: 'Declining phase of solar cycle 24, on the way to solar minimum (August and September 2017).',
  says:
    'The record gives the absorbed dose of each day in mGy, as dose in water. The mean of the 30 days from 18 August to 16 September 2017 is 0.32 mGy for each day: ' +
    '0.14 from galactic cosmic rays and 0.18 from the passes through the South Atlantic Anomaly. The mean is our arithmetic on the daily values of the source.',
  source: EDA_RADIATION,
  badge: 'real-data',
}

export const iss: Preset = {
  id: 'iss',
  name: 'ISS, 6 months (LEO)',
  summary:
    'A stay of six months on the International Space Station, in low Earth orbit. The dose rate is the mean of a real NASA record of 30 days in 2017.',
  badge: 'real-data',
  destination: 'leo',
  frame: 'ground',
  trajectory: {
    file: 'iss',
    source: CELESTRAK,
    note: 'The ground track of the station, computed by this app from the orbit elements of CelesTrak. The elements are from the day of retrieval, not from 2017.',
    badge: 'real-data',
  },
  phases: [
    {
      id: 'leo',
      label: 'Low Earth orbit',
      kind: 'leo',
      days: 180,
      rate: ISS_RATE,
      note: 'The record has 30 days. The preset uses its mean for all 180 days.',
    },
  ],
  crew: 6,
  cabin: {
    name: 'International Space Station',
    freeVolumeM3: 916,
    source: ISS_GUIDE,
    assumption: 'All of the pressurized volume is air. NASA gives no free air volume. The crew of 6 is the crew of the station in most of the window of the record.',
  },
  findings: [
    {
      text:
        'On 11 September 2017 the record shows 0.39 mGy from cosmic rays, about 3 times a normal day. This is the time of the solar particle event that started on 10 September 2017. ' +
        'Two instruments in the Columbus laboratory of the station measured an extra dose of 146.2 and 67.8 µGy in silicon from this event. The link between the record and the event is our reading: the source of the record does not label the day.',
      source: BERGER_2018,
    },
    {
      text: 'More than half of the dose of a normal day comes from the passes through the South Atlantic Anomaly, a region over the South Atlantic Ocean where the magnetic field of the Earth is weak: 0.18 of 0.32 mGy.',
      source: EDA_RADIATION,
    },
    {
      text: 'The crew of the station was 6 persons in the window of the record, and 3 persons from 2 to 13 September 2017.',
      source: ISS_CREW_2017,
    },
  ],
  flags: [
    'The dose rate is absorbed dose in mGy only. The source gives no dose equivalent in mSv for this record, so the page has no mSv value for this mission and cannot compare it with the career limit.',
    'The record covers 30 days in 2017, and the preset uses its mean for 180 days. The dose on the station changes with the solar cycle and with the height of the orbit.',
    'The mean includes one day with a solar particle event (11 September 2017). Without that day the mean is 0.31 mGy for each day.',
    'The source calls these values a preliminary analysis. The doses are in water, converted by NASA from the dose in silicon.',
    FLAG_UNITS,
    FLAG_STORMS,
  ],
  sources: [EDA_RADIATION, BERGER_2018, ISS_GUIDE, ISS_CREW_2017, CELESTRAK],
}
