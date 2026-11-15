// The texts of the panel that name a source: the sources, the symptom bands, and the settings of the model.
// The numbers are in shared/co2.ts. README.md has the full list of sources with the exact quotes.
import type { BandRegion, Cdra, ModelParams, SourceId, WindowId } from '../../shared/co2.ts'
import type { HeatRegion } from './components/heat.ts'
import { t } from './i18n.ts'

export type Source = { short: string; title: string; url: string }
const OCHMO_URL = 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf'
export const SOURCES: Record<SourceId, Source> = {
  std3001: {
    short: 'NASA-STD-3001 [V2 6004]',
    title: t('NASA-STD-3001 Volume 2, requirement [V2 6004], as the NASA technical brief OCHMO-TB-004 gives it'),
    url: OCHMO_URL,
  },
  ochmo: {
    short: 'NASA OCHMO-TB-004',
    title: t('NASA technical brief OCHMO-TB-004, Carbon Dioxide (CO2)'),
    url: OCHMO_URL,
  },
  ntrs2015: {
    short: 'Law & Alexander, NTRS 20150019624',
    title: t('Law and Alexander, CO2 on the International Space Station: An Operations Update. NASA document NTRS 20150019624'),
    url: 'https://ntrs.nasa.gov/citations/20150019624',
  },
  law2014: {
    short: 'Law et al. 2014',
    title: t('Law and others, 2014. Relationship between carbon dioxide levels and reported headaches on the International Space Station. J Occup Environ Med 56(5):477-83'),
    url: 'https://pubmed.ncbi.nlm.nih.gov/24806559/',
  },
  counts2014: {
    short: 'NTRS 20140003857',
    title: t('The NASA abstract of the same study, NTRS 20140003857'),
    url: 'https://ntrs.nasa.gov/citations/20140003857',
  },
  james2011: {
    short: 'James et al. 2011',
    title: t('James and others, 2011. Crew Health and Performance Improvements with Reduced Carbon Dioxide Levels. NASA document NTRS 20100039645'),
    url: 'https://ntrs.nasa.gov/citations/20100039645',
  },
  hidh: {
    short: 'NASA HIDH',
    title: t('NASA Human Integration Design Handbook, NASA/SP-2010-3407 revision 1, table 6.2-10'),
    url: 'https://www.nasa.gov/wp-content/uploads/2015/03/human_integration_design_handbook_revision_1.pdf',
  },
  bvad: {
    short: 'NASA BVAD',
    title: t('NASA Life Support Baseline Values and Assumptions Document, NASA/TP-2015-218570 revision 1, table 3-33'),
    url: 'https://ntrs.nasa.gov/citations/20180001338',
  },
  guide2015: {
    short: t('NASA station guide, 2015'),
    title: t('NASA Reference Guide to the International Space Station, 2015, page 78'),
    url: 'https://www.nasa.gov/wp-content/uploads/2017/09/np-2015-05-022-jsc-iss-guide-2015-update-111015-508c.pdf',
  },
  cdra2005: {
    short: 'El Sherif & Knox 2005',
    title: t('El Sherif and Knox, 2005. International Space Station Carbon Dioxide Removal Assembly (ISS CDRA) Concepts and Advancements. NASA document NTRS 20050210002'),
    url: 'https://ntrs.nasa.gov/citations/20050210002',
  },
  eda: {
    short: 'NASA EDA',
    title: t('NASA Environmental Data Application (EDA), Rodent Research-9'),
    url: 'https://visualization.osdr.nasa.gov/eda/',
  },
}

// The name of each region of a band, and what the source reports there.
export const REGION_LABEL: Record<BandRegion, string> = {
  body: t('Whole body'),
  brain: t('Brain'),
  head: t('Head'),
  eyes: t('Eyes'),
  airway: t('Airway'),
  face: t('Face'),
  sleep: t('Sleep'),
}
export const BAND_SYMPTOM: Record<string, string> = {
  fatigue: t('Fatigue and a feeling of a full head'),
  cognition: t('Missed steps of a procedure, and procedures that go long'),
  headache_ochmo: t('Headache, worse with more CO2'),
  headache_ntrs: t('Headache'),
  vision: t('Blurred vision'),
  cough: t('Chronic cough'),
  sleep: t('Poor sleep'),
  face: t('Numb or tingling face (5th cranial nerve)'),
  malaise: t('Fatigue, malaise, less sleep, and nausea'),
}

// The bands that each region of the figure shows. A part with no band of its own shows the whole-body bands.
export const BAND_REGIONS_OF: Record<HeatRegion, BandRegion[]> = {
  head: ['head', 'body'],
  chest: ['body'],
  abdomen: ['body'],
  arms: ['body'],
  legs: ['body'],
  brain: ['brain'],
  eyes: ['eyes'],
  face: ['face'],
  airway: ['airway'],
}
export const FIGURE_LABEL: Record<HeatRegion, string> = {
  head: t('Head'),
  chest: t('Chest'),
  abdomen: t('Abdomen'),
  arms: t('Arms'),
  legs: t('Legs'),
  brain: t('Brain'),
  eyes: t('Eyes'),
  face: t('Face'),
  airway: t('Airway'),
}

export const WINDOW_LABEL: Record<WindowId, string> = { hour: t('1-hour average'), day: t('24-hour average'), week: t('7-day average') }
export const CDRA_LABEL: Record<Cdra, string> = { both: t('Both beds'), one: t('One bed'), off: t('Off') }

// The settings of the model: the name, the unit, and where the default value comes from.
// "assumed" is true where no NASA document gives the value that the model needs.
export const PARAM_TEXT: Record<keyof ModelParams, { label: string; unit: string; decimals: number; basis: string; source?: SourceId; assumed: boolean }> = {
  totalPressureMmHg: {
    label: t('Total cabin pressure'),
    unit: 'mmHg',
    decimals: 0,
    basis: t('The station keeps the cabin near the pressure at sea level, 760 mmHg. The record gives ppm. This value turns ppm into mmHg.'),
    assumed: false,
  },
  co2PerPersonKgDay: {
    label: t('CO2 that one person makes'),
    unit: t('kg each day'),
    decimals: 2,
    basis: t('1.04 kg each day for one person, with exercise. Without exercise the handbook gives 0.91 kg. The newer revision 2 of the NASA baseline document gives 1.085 kg.'),
    source: 'hidh',
    assumed: false,
  },
  freeVolumeM3: {
    label: t('Free volume of the cabin'),
    unit: 'm³',
    decimals: 0,
    basis: t('916 m³ is the pressurized volume of the station in 2015. Assumption: all of it is air. NASA gives no free volume. The station of today has 1,005 m³.'),
    source: 'guide2015',
    assumed: true,
  },
  temperatureC: {
    label: t('Cabin temperature'),
    unit: '°C',
    decimals: 1,
    basis: t('Assumption: a usual cabin temperature. The gas law needs it to turn kg of CO2 into mmHg.'),
    assumed: true,
  },
  oneBedShare: {
    label: t('CDRA on one bed, as a part of both beds'),
    unit: '',
    decimals: 2,
    basis: t('Both beds remove the CO2 of 6 persons. On one bed, the CDRA removes the CO2 of 3 persons.'),
    source: 'cdra2005',
    assumed: false,
  },
  otherRemoval: {
    label: t('Other CO2 removal of the station, in CDRA units'),
    unit: '',
    decimals: 2,
    basis: t('Assumption, set from the RR-9 record. The station also has a second CDRA and the Russian Vozdukh system. With 0.5, the model holds 6 persons near 2.65 mmHg, as the record does.'),
    assumed: true,
  },
}
