// The effects of the trip on the body: the data and the rules of the "effects on the body" card.
//
// Three hazards can affect a crew member: the CO2 and the O2 of the cabin, and the radiation dose.
// bodyEffects() gives one list of effects for the values of one mission day. Each effect has what
// a source reports, the comparison with the value now, and the steps that lower the risk.
//
// docs/sources-body-effects.md gives the exact quote, the place, and the URL of each number and
// of each statement in this file. It also lists what we could not confirm.
//
// THE RULE FOR THE O2 VALUES
// "o2MmHg" of the input is the inspired O2 partial pressure (PIO2), as shared/trip/lifesupport.ts
// gives it. The limits of NASA-STD-3001 Volume 2 [V2 6003] are limits of PIO2, so the app compares
// them with no change. The hypoxia table of the NASA handbook (HIDH, table 6.2-4) uses the O2
// partial pressure of the air. For that table the app turns PIO2 back into the O2 pressure of the
// dry cabin gas with the formula of the standard: PIO2 = (total pressure − 47 mmHg) × O2 fraction.
//
// THE RULE FOR THE RADIATION UNITS
// The app has a dose that an instrument measured at one place inside or outside a spacecraft. The
// charts show it as a dose equivalent (mSv) or as an absorbed dose (mGy). The NASA limits use other
// quantities, each for a place inside the body:
//   - effective dose (mSv): a weighted sum of the doses in the organs, from a NASA model
//   - organ dose in mGy-Eq: the absorbed dose in one organ × the relative biological effectiveness (RBE)
//   - organ dose in mGy: the absorbed dose in one organ
// The app never converts. It compares the number of the charts with the number of the limit:
//
//   quantity of the limit          charts in mSv                      charts in mGy
//   effective dose (mSv)           nearest match                      no comparison
//   organ dose in mGy              rough (mSv is the larger number)   nearest match
//   organ dose in mGy-Eq           rough                              rough (mGy is the smaller number)
//
//   - "nearest match": the two are the same kind of quantity, but the place differs (instrument, organ).
//   - "rough": the two are different quantities. The ratio is an indicator only. The effect then
//     gets half of its weight (ROUGH_WEIGHT), so a rough comparison never shows the full alert color.
//   - "no comparison": the intensity is 0 and the text tells why. This follows shared/trip/radiation.ts,
//     which applies the career limit to a series in mSv only.
//   - "mSv is the larger number": at the same place, a dose equivalent is the absorbed dose × a quality
//     factor of 1 or more (HIDH, table 6.8-1).
//   - "mGy is the smaller number": at the same place, a dose in mGy-Eq is the absorbed dose × the RBE, which
//     is 1.5 for protons and 2.5 for heavy ions in the standard (table 4.8-2).
//   The dose in an organ also differs from the dose at the instrument, so no comparison is exact.
// Each radiation effect has a "caveat" text with the two quantities.
//
// The weights and the regions of the figure are our choice. They are not from a NASA document.
import { BANDS, DEFAULT_PRESSURE_MMHG, LIMIT_1H_MMHG, intensity as bandIntensity, type Band, type BandRegion } from '../co2.ts'
import type { Effect, EffectRegion, EffectsInput, Hazard, Mitigation } from './effects-types.ts'
import { O2_SOURCE, cabinO2MmHg } from './lifesupport.ts'
import { CAREER_LIMIT } from './limits.ts'
import { O2_RANGE_MMHG, type DoseUnit, type SourceRef } from './types.ts'

// THE TEXTS FOR ANOTHER LANGUAGE
// Each text of this file is an English string. A page translates a text with the English text as
// the key. A fixed text is one key. A text with numbers ("measure") is a list of sentences. Each
// sentence is a template with named places, for example "CO2 now: {value} mmHg.", and the values
// of the places. So the count of keys stays small, and the page writes each number in the way of
// its language. The English text of the contract ("measure", "caveat") is still filled.

// A number in a text, with the count of decimals that the text shows.
export type Shown = { value: number; decimals: number }
// One sentence of a text with numbers: the English template, and the value of each {name} of the template.
export type TextPart = {
  key: string
  values?: Record<string, string | number | Shown>
  // true: the sentence only tells that the comparison is rough. A page that marks a rough
  // comparison in its own way can leave this sentence out.
  rough?: true
}

// An effect with the value where it starts, in the unit of its source. The list of bodyEffects()
// is in the order of this value inside each hazard.
export type BodyEffect = Effect & {
  start: number
  // The sentences of "measure". textOf() of each sentence, joined with a space, gives "measure".
  measureParts: TextPart[]
  // The fixed texts of "caveat". Joined with a space, they give "caveat". Empty: no caveat.
  caveatParts: string[]
  // true: the quantity of the charts and the quantity of the source differ, so the comparison is a
  // rough indicator only. A page must not show such an effect as a firm statement.
  rough: boolean
  // For a rough comparison: the texts of the caveat that name the two quantities. A page shows them next to the result.
  roughWhy: string[]
}

// The English text of one sentence.
export function textOf(part: TextPart): string {
  return part.key.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const value = part.values?.[name]
    if (value === undefined) return whole
    return typeof value === 'object' ? value.value.toFixed(value.decimals) : String(value)
  })
}
const textOfAll = (parts: TextPart[]) => parts.map(textOf).join(' ')

// The sentences of the "measure" texts. {name} is the place of a value.
export const MEASURE = {
  noData: 'No data.',
  oneValue: 'The source gives one value: {value} {unit}.',
  band: 'The band goes from {from} to {to} {unit}.',
  limit: 'Limit: {limit} {unit}.',
  ofLimit: 'This is {percent}% of the limit.',
  co2Now: 'CO2 now: {value} mmHg.',
  co2Hour: '1-hour average: {value} mmHg.',
  o2Now: 'Inspired O2 now: {value} mmHg.',
  o2BandDown: 'The band goes from {from} mmHg down to {to} mmHg.',
  o2BandUp: 'The band goes from {from} mmHg up to {to} mmHg.',
  o2LowLimit: 'Lower limit of the 1-hour average: {limit} mmHg.',
  o2AbsoluteLow: 'Absolute lower limit: {limit} mmHg.',
  o2HighLimit: 'Upper limit for an unlimited time: {limit} mmHg.',
  o2ShortHigh: 'Upper limit for 6 to 9 hours: {limit} mmHg.',
  o2Cabin: 'O2 of the cabin gas now: {cabin} mmHg (inspired: {inspired} mmHg, total pressure: {total} mmHg).',
  o2Handbook: 'The handbook gives this effect at {value} mmHg.',
  noComparison: 'No comparison. The charts show the absorbed dose in mGy, and this limit is an effective dose in mSv.',
  noStorm: 'No solar particle event is active now.',
  stormNow: 'A solar particle event is active now.',
  dose30Days: 'Dose of the last 30 days: {dose} {unit}.',
  doseYear: 'Dose of the last 365 days: {dose} {unit}.',
  doseMission: 'Dose of this mission: {dose} {unit}.',
  doseDay: 'Dose of this mission day: {dose} {unit}.',
  limit30Days: 'Limit for 30 days: {limit} {unit}.',
  limitYear: 'Limit for 1 year: {limit} {unit}.',
  limitCareer: 'Limit for a career: {limit} {unit}.',
  roughOfLimit: 'Rough indicator: the number is {percent}% of the number of the limit. The quantities differ.',
  rough: 'Rough indicator: the quantities differ.',
} as const
const NO_DATA: TextPart[] = [{ key: MEASURE.noData }]

export type EffectsOptions = {
  // The total pressure of the cabin in mmHg. The app needs it for the hypoxia table of the handbook. Default: 760.
  totalPressureMmHg?: number
}

// ---------------------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------------------
const STD_V1_URL = 'https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf'
const STD_V2_URL = 'https://www.nasa.gov/wp-content/uploads/2025/05/nasa-std-3001-vol-2.pdf'
const TB004_URL = 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf'
const HIDH_URL = 'https://www.nasa.gov/wp-content/uploads/2015/03/human_integration_design_handbook_revision_1.pdf'

export const EFFECT_SOURCES = {
  organLimits: {
    short: 'NASA-STD-3001 Vol. 1, table 4.8-1',
    title: 'NASA-STD-3001 Volume 1, revision C (2023), section 4.8.2, table 4.8-1 "Dose Limits for Career/Non-Cancer Effects (in mGy-Eq. or mGy)", page 40',
    url: STD_V1_URL,
  },
  careerLimit: {
    short: 'NASA-STD-3001 Vol. 1 [V1 4030]',
    title: 'NASA-STD-3001 Volume 1, revision C (2023), requirement [V1 4030] "Career Space Permissible Exposure Limit for Spaceflight Radiation", page 39',
    url: STD_V1_URL,
  },
  eventLimit: {
    short: 'NASA-STD-3001 Vol. 1 [V1 4031]',
    title: 'NASA-STD-3001 Volume 1, revision C (2023), requirement [V1 4031] "Radiation Limits – Solar Particle Events", page 41',
    url: STD_V1_URL,
  },
  alara: {
    short: 'NASA-STD-3001 Vol. 1 [V1 4029]',
    title: 'NASA-STD-3001 Volume 1, revision C (2023), requirement [V1 4029] "As Low as Reasonably Achievable (ALARA) Principle", page 39',
    url: STD_V1_URL,
  },
  shorterFlight: {
    short: 'NASA-STD-3001 Vol. 1, section 4.8.4',
    title: 'NASA-STD-3001 Volume 1, revision C (2023), rationale of requirement [V1 4032], page 43',
    url: STD_V1_URL,
  },
  dosimeter: {
    short: 'NASA-STD-3001 Vol. 2 [V2 6162]',
    title: 'NASA-STD-3001 Volume 2, revision F (2026), requirement [V2 6162] "Personal Monitoring of Space Radiation Exposure", section 6.8.1.4',
    url: STD_V2_URL,
  },
  o2Range: {
    short: 'NASA-STD-3001 Vol. 2 [V2 6003]',
    title: 'NASA-STD-3001 Volume 2, revision F (2026), requirement [V2 6003] and table 6.2-1 "Inspired Oxygen Partial Pressure Exposure Ranges", section 6.2.1.2',
    url: STD_V2_URL,
  },
  co2Limit: {
    short: 'NASA-STD-3001 Vol. 2 [V2 6004]',
    title: 'NASA-STD-3001 Volume 2, revision F (2026), requirement [V2 6004] "Nominal Vehicle/Habitat Carbon Dioxide Levels", section 6.2.1.3',
    url: STD_V2_URL,
  },
  radiationBrief: {
    short: 'NASA OCHMO-TB-020',
    title: 'NASA technical brief OCHMO-TB-020, Design for Ionizing Radiation Protection, revision G (2025)',
    url: 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf',
  },
  atmosphereBrief: {
    short: 'NASA OCHMO-TB-003',
    title: 'NASA technical brief OCHMO-TB-003, Habitable Atmosphere, revision A (2023)',
    url: 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-003-habitable-atmosphere.pdf',
  },
  lifeSupportBrief: {
    short: 'NASA OCHMO-TB-002',
    title: 'NASA technical brief OCHMO-TB-002, Environmental Control & Life Support System (ECLSS), revision B (2023), page 10',
    url: 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-002-eclss.pdf',
  },
  fireBrief: {
    short: 'NASA OCHMO-TB-008',
    title: 'NASA technical brief OCHMO-TB-008, Fire Protection, revision A (2023), page 6',
    url: 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-008-fire-protection.pdf',
  },
  co2Brief: {
    short: 'NASA OCHMO-TB-004',
    title: 'NASA technical brief OCHMO-TB-004, Carbon Dioxide (CO2), revision D',
    url: TB004_URL,
  },
  co2Station: {
    short: 'Law & Alexander, NTRS 20150019624',
    title: 'Law and Alexander, CO2 on the International Space Station: An Operations Update. NASA document NTRS 20150019624',
    url: 'https://ntrs.nasa.gov/citations/20150019624',
  },
  hypoxiaTable: {
    short: 'NASA HIDH, table 6.2-4',
    title: 'NASA Human Integration Design Handbook, NASA/SP-2010-3407 revision 1 (2014), table 6.2-4 "Effects of Hypoxia", page 343',
    url: HIDH_URL,
  },
  shuttleMasks: {
    short: 'NASA HIDH, section 6.2.2.2.1',
    title: 'NASA Human Integration Design Handbook, NASA/SP-2010-3407 revision 1 (2014), section 6.2.2.2.1, page 344',
    url: HIDH_URL,
  },
  acute: {
    short: 'Wu et al., NASA HRP evidence book',
    title:
      'Wu, Huff, Casey, Kim, and Cucinotta, "Risk of Acute Radiation Syndromes Due to Solar Particle Events", chapter 5 of "Human Health and Performance Risks of Space Exploration Missions" (evidence book of the NASA Human Research Program), pages 173 to 177',
    url: 'https://humanresearchroadmap.nasa.gov/evidence/reports/ARS.pdf',
  },
  cancerRisk: {
    short: 'NASA HRP, Risk of Radiation Carcinogenesis',
    title: 'NASA Human Research Roadmap, "Risk of Radiation Carcinogenesis" (web page, published 2026-08-17)',
    url: 'https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=96',
  },
  heartRisk: {
    short: 'NASA HRP, cardiovascular risk',
    title: 'NASA Human Research Roadmap, "Risk of Cardiovascular Adaptations Contributing to Adverse Mission Performance and Health Outcomes" (web page, published 2025-05-13)',
    url: 'https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=179',
  },
  brainRisk: {
    short: 'NASA HRP, cognitive and behavioral risk',
    title:
      'NASA Human Research Roadmap, "Risk of Adverse Cognitive or Behavioral Changes and Psychiatric Disorders Leading to In-mission Health and Performance and Long-term Health Effects" (web page, published 2025-05-13)',
    url: 'https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=99',
  },
  hypoxiaRisk: {
    short: 'NASA HRP, hypoxia risk',
    title: 'NASA Human Research Roadmap, "Risk of Reduced Crew Health and Performance Due to Hypoxia" (web page, published 2025-05-13)',
    url: 'https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=173',
  },
  radiationHazard: {
    short: 'NASA HRP, Space Radiation',
    title: 'NASA Human Research Program, "Space Radiation" (web page of the five hazards of human spaceflight)',
    url: 'https://www.nasa.gov/hrp/hazard-space-radiation/',
  },
} satisfies Record<string, SourceRef>

const S = EFFECT_SOURCES

// ---------------------------------------------------------------------------------------
// The hazards
// ---------------------------------------------------------------------------------------
export const HAZARDS: Hazard[] = ['co2', 'o2', 'radiation']

export const HAZARD_LABEL: Record<Hazard, string> = { co2: 'CO2', o2: 'O2', radiation: 'Radiation' }

export const HAZARD_SAYS: Record<Hazard, string> = {
  co2: `The crew makes CO2, and the scrubber removes it. If the scrubber removes less, the CO2 pressure of the cabin rises. NASA limits the 1-hour average to ${LIMIT_1H_MMHG} mmHg.`,
  o2: `The crew uses O2, and the generator or the bottles replace it. NASA sets a target range of ${O2_RANGE_MMHG.low} to ${O2_RANGE_MMHG.high} mmHg for the inspired O2 pressure. Too little O2 gives hypoxia. An atmosphere that is rich in O2 can feed a fire.`,
  radiation:
    'Galactic cosmic rays arrive all the time, and shielding is not effective against them. A solar particle event is rare, and shielding is effective against it. NASA limits the dose of a career, the dose of one solar particle event, and the dose in some organs.',
}

// The source of each text of HAZARD_SAYS.
export const HAZARD_SOURCE: Record<Hazard, SourceRef> = { co2: S.co2Limit, o2: S.o2Range, radiation: S.radiationBrief }

// ---------------------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------------------
const clamp = (value: number) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0)
const real = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value)

// A pressure in mmHg in a sentence. One decimal, or none for a whole number.
const mm = (value: number): Shown => ({ value, decimals: Number.isInteger(value) ? 0 : 1 })
// A pressure in mmHg in a sentence, with one decimal as the sources write it: 3.0.
const mm1 = (value: number): Shown => ({ value, decimals: 1 })
// A dose in a sentence: 1500 or 55.2 or 0.48.
function doseShown(value: number): Shown {
  const size = Math.abs(value)
  return { value, decimals: size >= 100 ? 0 : size >= 10 ? 1 : 2 }
}
// A dose in a fixed text: 1,500 or 55.2 or 0.48.
function doseText(value: number): string {
  const size = Math.abs(value)
  if (size >= 100) return Math.round(value).toLocaleString('en-US')
  return value.toFixed(size >= 10 ? 1 : 2)
}
const percent = (ratio: number) => Math.round(ratio * 100)

// How far a value is below "from", on the way down to "to": 0 at or above "from", 1 at or below "to".
function fall(value: number, from: number, to: number): number {
  if (!(value < from)) return 0
  return to < from ? clamp((from - value) / (from - to)) : 1
}
// How far a value is above "from", on the way up to "to": 0 at or below "from", 1 at or above "to".
function rise(value: number, from: number, to: number): number {
  if (!(value > from)) return 0
  return to > from ? clamp((value - from) / (to - from)) : 1
}

// The fields of an effect with no caveat and with a comparison that is not rough.
const FIRM = { caveatParts: [] as string[], rough: false, roughWhy: [] as string[] }
// The fields of an effect with a caveat and with a comparison that is not rough.
const withCaveat = (...caveatParts: string[]) => ({ caveat: caveatParts.join(' '), caveatParts, rough: false, roughWhy: [] as string[] })

const ours = (text: string): Mitigation => ({ text, ours: true })
const step = (text: string, source: SourceRef): Mitigation => ({ text, source })
// A step of this app that follows from a fact of a source. The source gives the fact, not the step.
const fromFact = (text: string, source: SourceRef): Mitigation => ({ text, source, ours: true })

// ---------------------------------------------------------------------------------------
// CO2: the symptom bands of shared/co2.ts, and the limit of the 1-hour average
// ---------------------------------------------------------------------------------------
const CO2_STEPS = {
  repair: step('Find and repair the scrubber that removes less CO2, or switch on a spare scrubber.', S.co2Brief),
  airFlow: step('Raise the air flow where you work, so that no pocket of CO2 forms near your face.', S.co2Limit),
  airFlowSleep: fromFact('Raise the air flow at the sleep place. CO2 can stay in a pocket where the air does not move.', S.co2Limit),
  lessActivity: step('Do less heavy work and exercise for a time. A person makes less CO2 at rest.', S.lifeSupportBrief),
  diet: step('Eat more fat and less carbohydrate. NASA says that this can lower the CO2 that the crew makes.', S.co2Brief),
  move: fromFact('Move to a module with less CO2. On the station, the CO2 is not the same in all modules.', S.co2Brief),
  hourLimit: step(`Keep the 1-hour average at or below ${LIMIT_1H_MMHG} mmHg.`, S.co2Limit),
  weekMean: step('Keep the 7-day average below 2.5 mmHg. NASA says that this keeps the headache risk below 1%.', S.co2Brief),
  report: ours('Tell the flight surgeon about the symptom.'),
}
const CO2_COMMON: Mitigation[] = [CO2_STEPS.repair, CO2_STEPS.airFlow, CO2_STEPS.lessActivity]

// The source of a band, by the source name of shared/co2.ts.
const BAND_SOURCE: Partial<Record<Band['source'], SourceRef>> = {
  ntrs2015: S.co2Station,
  ochmo: { ...S.co2Brief, title: `${S.co2Brief.title}, page 4` },
}
// "sleep" is not a place on the body. The other regions of a band have the same name on the figure.
const bandRegion = (region: BandRegion): EffectRegion => (region === 'sleep' ? 'none' : region)

// A CO2 pressure as a text, with one decimal as the sources write it: 3.0.
const co2Text = (value: number) => value.toFixed(1)
const between = (band: Band) => (band.to === null ? `at ${co2Text(band.from)} mmHg` : `between ${co2Text(band.from)} and ${co2Text(band.to)} mmHg`)

// The texts of each band. The numbers come from the band. The titles are the texts of the CO2 page (web/src/texts.ts).
const BAND_TEXT: Record<string, { title: string; says: (band: Band) => string; more: Mitigation[] }> = {
  fatigue: {
    title: 'Fatigue and a feeling of a full head',
    says: (band) => `Crew members of the station reported fatigue and a feeling of a full head ${between(band)}.`,
    more: [CO2_STEPS.report],
  },
  cognition: {
    title: 'Missed steps of a procedure, and procedures that go long',
    says: (band) => `Crew members of the station reported missed steps of a procedure, and procedures that went long, ${between(band)}.`,
    more: [ours('Read each step of a procedure aloud, and let a second person check the work.')],
  },
  headache_ochmo: {
    title: 'Headache, worse with more CO2',
    says: (band) => `NASA reports headaches ${between(band)} on earlier missions. They get worse with more CO2.`,
    more: [CO2_STEPS.weekMean, CO2_STEPS.report],
  },
  headache_ntrs: {
    title: 'Headache',
    says: (band) => (band.to === null ? `Crew members of the station reported headaches above ${co2Text(band.from)} mmHg.` : `Crew members of the station reported headaches above ${co2Text(band.from)} to ${co2Text(band.to)} mmHg.`),
    more: [CO2_STEPS.weekMean, CO2_STEPS.report],
  },
  vision: {
    title: 'Blurred vision',
    says: (band) => `NASA reports blurred vision ${between(band)} on earlier missions.`,
    more: [CO2_STEPS.report],
  },
  cough: {
    title: 'Chronic cough',
    says: (band) => `NASA reports a chronic cough ${between(band)} on earlier missions.`,
    more: [CO2_STEPS.report],
  },
  sleep: {
    title: 'Poor sleep',
    says: (band) => `NASA reports poor sleep ${between(band)} on earlier missions.`,
    more: [CO2_STEPS.airFlowSleep],
  },
  face: {
    title: 'Numb or tingling face (5th cranial nerve)',
    says: (band) => `NASA reports an abnormal feeling in the area of the 5th cranial nerve, which serves the face, ${between(band)} on earlier missions.`,
    more: [CO2_STEPS.report],
  },
  malaise: {
    title: 'Fatigue, malaise, less sleep, and nausea',
    says: (band) => `NASA reports fatigue, malaise, less sleep, and nausea above ${co2Text(band.from)} mmHg on earlier missions.`,
    more: [CO2_STEPS.move, CO2_STEPS.report],
  },
}

function co2Effects(input: EffectsInput): BodyEffect[] {
  const now = input.co2MmHg
  const effects: BodyEffect[] = []
  for (const band of BANDS) {
    const text = BAND_TEXT[band.id]
    const source = BAND_SOURCE[band.source]
    // A band with no text or no source in this file gets no effect. The test finds such a band.
    if (!text || !source) continue
    const range: TextPart =
      band.to === null
        ? { key: MEASURE.oneValue, values: { value: mm1(band.from), unit: 'mmHg' } }
        : { key: MEASURE.band, values: { from: mm1(band.from), to: mm1(band.to), unit: 'mmHg' } }
    const measureParts: TextPart[] = real(now) ? [{ key: MEASURE.co2Now, values: { value: mm1(now) } }, range] : NO_DATA
    effects.push({
      id: `co2_${band.id}`,
      hazard: 'co2',
      region: bandRegion(band.region),
      title: text.title,
      says: text.says(band),
      source,
      kind: 'band',
      measure: textOfAll(measureParts),
      measureParts,
      intensity: real(now) ? bandIntensity(now, band) : 0,
      weight: band.weight,
      mitigations: [...CO2_COMMON, ...text.more],
      start: band.from,
      ...FIRM,
    })
  }

  // The limit of NASA. A calm cabin of the station is near 80% to 90% of this limit all the time, so a
  // ratio would color the card on each day. The effect is off at or below the limit and on above it.
  const mean = input.co2HourMeanMmHg
  const limitParts: TextPart[] = real(mean)
    ? [
        { key: MEASURE.co2Hour, values: { value: mm1(mean) } },
        { key: MEASURE.limit, values: { limit: mm1(LIMIT_1H_MMHG), unit: 'mmHg' } },
        { key: MEASURE.ofLimit, values: { percent: percent(mean / LIMIT_1H_MMHG) } },
      ]
    : NO_DATA
  effects.push({
    id: 'co2_limit_1h',
    hazard: 'co2',
    region: 'none',
    title: 'CO2 limit of NASA for the 1-hour average',
    says: `NASA requires that the 1-hour average of the CO2 pressure in the cabin is no more than ${LIMIT_1H_MMHG} mmHg.`,
    source: S.co2Limit,
    kind: 'limit',
    measure: textOfAll(limitParts),
    measureParts: limitParts,
    intensity: real(mean) && mean > LIMIT_1H_MMHG ? 1 : 0,
    weight: 0.8,
    mitigations: [CO2_STEPS.hourLimit, ...CO2_COMMON, CO2_STEPS.diet],
    start: LIMIT_1H_MMHG,
    ...FIRM,
  })
  // The order of the start values. Effects with the same start keep their order.
  return effects.sort((a, b) => a.start - b.start)
}

// ---------------------------------------------------------------------------------------
// O2: the ranges of NASA-STD-3001 Volume 2 [V2 6003], and the hypoxia table of the NASA handbook
// ---------------------------------------------------------------------------------------
// Table 6.2-1 of the standard, in mmHg of inspired O2 (PIO2).
export const O2_LIMITS = {
  // The target range for normal O2.
  targetLow: O2_RANGE_MMHG.low,
  targetHigh: O2_RANGE_MMHG.high,
  // The lower limit for mild hypoxia, as a 1-hour average: acceptable for an unlimited time with monitoring.
  mildHypoxia: O2_SOURCE.mildHypoxiaMmHg,
  // The absolute lower limit.
  absoluteLow: O2_SOURCE.absoluteLowMmHg,
  // The upper limit for an unlimited time.
  high: O2_SOURCE.highLimitMmHg,
  // The upper limit for a short time: 6 to 9 hours.
  shortTermHigh: 791,
}

// Table 6.2-4 of the NASA handbook: the effects of hypoxia "at approximate atmospheric oxygen
// partial pressures", in mmHg of the O2 of the air. The row for 160 mmHg is "Normal (sea-level atmosphere)".
export const HYPOXIA_TABLE: { id: string; cabinO2MmHg: number; region: EffectRegion; title: string; says: string; weight: number }[] = [
  {
    id: 'o2_night_vision',
    cabinO2MmHg: 137,
    region: 'eyes',
    title: 'Low O2: loss of night vision',
    says: 'At an O2 pressure of 137 mmHg in the air: the accepted limit of alertness, and loss of night vision. The first symptom is that the pupils get wider.',
    weight: 0.6,
  },
  {
    id: 'o2_performance',
    cabinO2MmHg: 114,
    region: 'brain',
    title: 'Low O2: performance seriously impaired',
    says: 'At an O2 pressure of 114 mmHg in the air: performance is seriously impaired. Hallucinations, excitation, and apathy occur.',
    weight: 0.9,
  },
  {
    id: 'o2_coordination',
    cabinO2MmHg: 100,
    region: 'body',
    title: 'Low O2: impaired coordination, loss of memory',
    says: 'At an O2 pressure of 100 mmHg in the air: physical coordination is impaired. The person is emotionally upset. Paralysis and loss of memory occur.',
    weight: 1,
  },
  {
    id: 'o2_unconscious',
    cabinO2MmHg: 84,
    region: 'brain',
    title: 'Low O2: unconsciousness',
    says: 'At an O2 pressure of 84 mmHg in the air: the person becomes unconscious in the end, and this cannot be reversed.',
    weight: 1,
  },
  {
    id: 'o2_anoxia',
    cabinO2MmHg: 46,
    region: 'body',
    title: 'No O2: death in minutes',
    says: 'At an O2 pressure of 0 to 46 mmHg in the air: the person becomes unconscious almost at once, with convulsions and paralysis. Death comes in 90 to 180 seconds.',
    weight: 1,
  },
]

const O2_STEPS = {
  mask: step('Put on an oxygen mask when you feel a symptom of hypoxia. NASA trains the crew to do this.', S.atmosphereBrief),
  maskNow: step('Put on an oxygen mask. On the Space Shuttle, the crew put on masks if the O2 pressure fell below 121 mmHg.', S.shuttleMasks),
  supplement: step('Give the crew more O2 from a mask or a bottle. NASA names this as the main treatment for hypoxia.', S.atmosphereBrief),
  watch: step('Watch the other crew members for symptoms. A person with hypoxia often does not notice it.', S.atmosphereBrief),
  lessActivity: step('Do less heavy work and exercise. A person uses less O2 at rest.', S.lifeSupportBrief),
  restore: ours('Repair the oxygen generator, or add O2 from the bottles, until the O2 is in the target range.'),
  lower: step('Lower the O2 pressure of the cabin gas. NASA names this as the main treatment for too much O2.', S.atmosphereBrief),
  fire: step('Keep the O2 level low. NASA says that this reduces the potential for fire in a spacecraft.', S.fireBrief),
  slowGenerator: ours('Lower the rate of the oxygen generator, or close the O2 bottles.'),
  report: ours('Tell the flight surgeon about each symptom.'),
}

const HANDBOOK_CAVEAT = [
  'The handbook gives approximate values for the O2 pressure of the air, and it says that this section is under evaluation.',
  'The app has the inspired O2 pressure. It turns this value into the O2 pressure of the dry cabin gas with the formula of the NASA standard and the total pressure of the cabin.',
]
const NOW_NOT_HOUR = 'The limit of 127 mmHg is for a 1-hour average. The app compares the value now.'

function o2Effects(input: EffectsInput, totalPressureMmHg: number): BodyEffect[] {
  const inspired = input.o2MmHg
  const known = real(inspired)
  // The O2 pressure of the dry cabin gas, for the table of the handbook.
  const cabin = known && totalPressureMmHg > 47 ? cabinO2MmHg(inspired, totalPressureMmHg) : NaN
  const L = O2_LIMITS
  // The sentences of a "measure" text: the O2 value now, then the numbers of the effect.
  const withNow = (...more: TextPart[]): TextPart[] => (known ? [{ key: MEASURE.o2Now, values: { value: mm1(inspired) } }, ...more] : NO_DATA)
  const measured = (...more: TextPart[]) => {
    const measureParts = withNow(...more)
    return { measure: textOfAll(measureParts), measureParts }
  }

  const lowTarget: BodyEffect = {
    id: 'o2_low_target',
    hazard: 'o2',
    region: 'body',
    title: 'Low O2: below the target range (mild hypoxia)',
    says: `The target range of NASA for the inspired O2 pressure is ${L.targetLow} to ${L.targetHigh} mmHg. NASA accepts mild hypoxia down to ${L.mildHypoxia} mmHg for an unlimited time, if a plan monitors the health of the crew.`,
    source: S.o2Range,
    kind: 'band',
    ...measured({ key: MEASURE.o2BandDown, values: { from: L.targetLow, to: L.mildHypoxia } }),
    intensity: known ? fall(inspired, L.targetLow, L.mildHypoxia) : 0,
    weight: 0.3,
    mitigations: [O2_STEPS.restore, O2_STEPS.lessActivity, O2_STEPS.watch, O2_STEPS.mask],
    start: L.targetLow,
    ...FIRM,
  }

  const lowLimit: BodyEffect = {
    id: 'o2_low_limit',
    hazard: 'o2',
    region: 'body',
    title: 'Low O2: below the lower limit of NASA',
    says: `The lower limit of NASA for the inspired O2 pressure is ${L.mildHypoxia} mmHg as a 1-hour average. The absolute lower limit is ${L.absoluteLow} mmHg.`,
    source: S.o2Range,
    kind: 'limit',
    ...measured({ key: MEASURE.o2LowLimit, values: { limit: L.mildHypoxia } }, { key: MEASURE.o2AbsoluteLow, values: { limit: L.absoluteLow } }),
    intensity: known ? fall(inspired, L.mildHypoxia, L.absoluteLow) : 0,
    weight: 0.8,
    ...withCaveat(NOW_NOT_HOUR),
    mitigations: [O2_STEPS.supplement, O2_STEPS.restore, O2_STEPS.lessActivity, O2_STEPS.watch, O2_STEPS.report],
    start: L.mildHypoxia,
  }

  const table: BodyEffect[] = HYPOXIA_TABLE.map((row) => {
    const measureParts: TextPart[] = Number.isFinite(cabin)
      ? [
          { key: MEASURE.o2Cabin, values: { cabin: mm1(cabin), inspired: mm1(inspired), total: mm(totalPressureMmHg) } },
          { key: MEASURE.o2Handbook, values: { value: row.cabinO2MmHg } },
        ]
      : NO_DATA
    return {
    id: row.id,
    hazard: 'o2',
    region: row.region,
    title: row.title,
    says: row.says,
    source: S.hypoxiaTable,
    kind: 'band',
    measure: textOfAll(measureParts),
    measureParts,
    // The table gives one value for each effect, so the effect is fully on at or below that value.
    intensity: Number.isFinite(cabin) && cabin <= row.cabinO2MmHg ? 1 : 0,
    weight: row.weight,
    ...withCaveat(...HANDBOOK_CAVEAT),
    mitigations: [O2_STEPS.maskNow, O2_STEPS.restore, O2_STEPS.lessActivity, O2_STEPS.watch],
    start: row.cabinO2MmHg,
    }
  })

  const highFire: BodyEffect = {
    id: 'o2_high_fire',
    hazard: 'o2',
    region: 'none',
    title: 'High O2: above the target range, higher fire risk',
    says: `The target range of NASA ends at ${L.targetHigh} mmHg of inspired O2. NASA accepts up to ${L.high} mmHg for an unlimited time. But the standard also says that an atmosphere that is rich in O2 is a safety hazard, because it can feed a fire.`,
    source: S.o2Range,
    kind: 'band',
    ...measured({ key: MEASURE.o2BandUp, values: { from: L.targetHigh, to: L.high } }),
    intensity: known ? rise(inspired, L.targetHigh, L.high) : 0,
    weight: 0.5,
    ...withCaveat('The fire risk depends on the O2 percentage of the cabin gas and on the materials. The app has no number for the fire risk. The band shows only how far the O2 is above the target range.'),
    mitigations: [O2_STEPS.fire, O2_STEPS.slowGenerator],
    start: L.targetHigh,
  }

  const highLimit: BodyEffect = {
    id: 'o2_high_limit',
    hazard: 'o2',
    region: 'chest',
    title: 'High O2: above the upper limit of NASA',
    says: `The upper limit of NASA for the inspired O2 pressure is ${L.high} mmHg for an unlimited time, and ${L.shortTermHigh} mmHg for 6 to 9 hours.`,
    source: S.o2Range,
    kind: 'limit',
    ...measured({ key: MEASURE.o2HighLimit, values: { limit: L.high } }, { key: MEASURE.o2ShortHigh, values: { limit: L.shortTermHigh } }),
    intensity: known ? rise(inspired, L.high, L.shortTermHigh) : 0,
    weight: 0.8,
    mitigations: [O2_STEPS.lower, O2_STEPS.slowGenerator, O2_STEPS.fire, O2_STEPS.report],
    start: L.high,
    ...FIRM,
  }

  // From the normal range outward: first the low side, then the high side. The first table row
  // (137 mmHg of the cabin gas) is 128.5 mmHg of inspired O2 at 760 mmHg, so it comes before the lower limit.
  const [nightVision, ...lower] = table
  return [lowTarget, nightVision, lowLimit, ...lower, highFire, highLimit]
}

// ---------------------------------------------------------------------------------------
// Radiation
// ---------------------------------------------------------------------------------------
// The quantity of a limit or of a reported value.
//   effective  effective dose in mSv          organEq  organ dose in mGy-Eq
//   organ      organ dose in mGy              gamma    absorbed dose of gamma rays or x-rays in mGy
export type DoseQuantity = 'effective' | 'organEq' | 'organ' | 'gamma'
// How well the unit of the charts fits the quantity. See "THE RULE FOR THE RADIATION UNITS" above.
export type DoseMatch = 'nearest' | 'rough' | 'none'

// A rough comparison gets this part of the weight of the effect. Our choice.
export const ROUGH_WEIGHT = 0.5

export function doseMatch(unit: DoseUnit, quantity: DoseQuantity): DoseMatch {
  if (quantity === 'effective') return unit === 'mSv' ? 'nearest' : 'none'
  if (quantity === 'organEq') return 'rough'
  return unit === 'mGy' ? 'nearest' : 'rough'
}

const QUANTITY_UNIT: Record<DoseQuantity, string> = { effective: 'mSv', organEq: 'mGy-Eq', organ: 'mGy', gamma: 'mGy' }

const CHARTS_MSV = 'The charts show a dose equivalent in mSv, measured at one place of a spacecraft.'
const CHARTS_MGY = 'The charts show an absorbed dose in mGy, measured at one place of a spacecraft.'
// The dose inside the body is not the dose at the instrument: the spacecraft and the body are in the way.
const IN_ORGAN = 'inside one organ, where the dose differs from the dose at the instrument'
const ROUGH = 'The app does not convert, so read the result as a rough indicator only.'

// The warning about one comparison, as fixed texts: the quantity of the charts, the quantity of the
// source, and which number is the larger one at the same place, if a source tells it.
// "why" has the texts that name the two quantities of a rough comparison.
function doseCaveat(unit: DoseUnit, quantity: DoseQuantity): { parts: string[]; why: string[] } {
  const charts = unit === 'mSv' ? CHARTS_MSV : CHARTS_MGY
  if (quantity === 'effective') {
    const theirs =
      unit === 'mSv'
        ? 'The limit is an effective dose in mSv: a weighted sum of the doses in the organs, from a model of NASA. The two are close, but they are not the same quantity.'
        : 'The limit is an effective dose in mSv. These are different quantities, and the app does not convert. Switch the charts to mSv to compare.'
    return { parts: [charts, theirs], why: [] }
  }
  if (quantity === 'organEq') {
    const theirs = `The limit is a dose in mGy-Eq ${IN_ORGAN}.`
    const factor =
      unit === 'mSv'
        ? 'A dose in mGy-Eq and a dose equivalent use different factors for the biological effect.'
        : 'A dose in mGy-Eq is the absorbed dose times a factor: 1.5 for protons and 2.5 for heavy ions. So at the same place, the number in mGy-Eq is the larger one.'
    return { parts: [charts, theirs, factor, ROUGH], why: [charts, theirs, ROUGH] }
  }
  const theirs =
    quantity === 'organ'
      ? `The limit is an absorbed dose in mGy ${IN_ORGAN}.`
      : 'The source gives an absorbed dose of gamma rays or x-rays in the body. Less is known about the effect of the particles in space.'
  if (unit === 'mGy') return { parts: [charts, theirs], why: [] }
  const factor = 'A dose equivalent is the absorbed dose times a quality factor of 1 or more. So at the same place, the number in mSv is the larger one.'
  return { parts: [charts, theirs, factor, ROUGH], why: [charts, theirs, ROUGH] }
}

// The fields of the caveat of one radiation effect: the texts of doseCaveat(), then the notes of the effect.
function doseCaveatFields(unit: DoseUnit, quantity: DoseQuantity, notes: string[]) {
  const { parts, why } = doseCaveat(unit, quantity)
  const caveatParts = [...parts, ...notes]
  const rough = doseMatch(unit, quantity) === 'rough'
  return { caveat: caveatParts.join(' '), caveatParts, rough, roughWhy: rough ? why : [] }
}
// The fields of a "measure" text.
const measured = (measureParts: TextPart[]) => ({ measure: textOfAll(measureParts), measureParts })

const RAD_STEPS = {
  shelter: step('Go to the storm shelter when the radiation alert comes.', S.radiationBrief),
  buildShelter: step('Build the storm shelter in the crew quarters: put the water containers and the materials with much hydrogen around the crew.', S.radiationBrief),
  endOutside: step('End the work outside in less than 2 hours after the alert, and go behind shielding.', S.radiationBrief),
  dosimeter: step('Wear your personal dosimeter inside the spacecraft and during work outside.', S.dosimeter),
  alara: step('Keep each exposure as low as you reasonably can. NASA requires this for all radiation exposures (ALARA).', S.alara),
  bestPlace: ours('Sleep and rest in the best shielded part of the cabin.'),
  solarMaximum: fromFact('Plan the flight near solar maximum. Cosmic rays are lower then. Solar particle events occur more often then, so the storm shelter is more important.', S.radiationBrief),
  shorter: fromFact('Choose a faster flight where the mission permits it. A shorter time in space gives a lower dose.', S.shorterFlight),
  report: ours('Tell the flight surgeon about each symptom, for example nausea.'),
}

type Window = 'last30Days' | 'lastYear' | 'total'
// "dose" and "limit" are the sentences of the "measure" text. "span" is a part of the "says" text.
const WINDOWS: { id: Window; dose: string; limit: string; span: string }[] = [
  { id: 'last30Days', dose: MEASURE.dose30Days, limit: MEASURE.limit30Days, span: 'in 30 days' },
  { id: 'lastYear', dose: MEASURE.doseYear, limit: MEASURE.limitYear, span: 'in 1 year' },
  { id: 'total', dose: MEASURE.doseMission, limit: MEASURE.limitCareer, span: 'in a career' },
]

// A limit of NASA for the dose. "limits" has one value for each time window. null: the standard gives no limit for this window.
export type DoseLimit = {
  id: string
  region: EffectRegion
  title: string
  // The name of the organ in the sentence "NASA limits the dose in ... to ...".
  organ: string
  // One more sentence of the source, after the limits.
  also: string
  quantity: DoseQuantity
  limits: Record<Window, number | null>
  weight: number
  source: SourceRef
  // One more warning for this limit.
  note?: string
  mitigations: Mitigation[]
}

const MISSION_ONLY = 'The app counts this mission only, and the dose of earlier flights adds to the career dose.'

// NASA-STD-3001 Volume 1, revision C, table 4.8-1 and requirement [V1 4030].
export const DOSE_LIMITS: DoseLimit[] = [
  {
    id: 'rad_blood',
    // The blood-forming organs are the bone marrow, which is in many bones. No single part of the figure is right, so the effect is on the whole body. Our choice.
    region: 'body',
    title: 'Blood-forming organs (bone marrow): dose limit',
    organ: 'the blood-forming organs',
    also: 'The standard gives no career limit for these organs.',
    quantity: 'organEq',
    limits: { last30Days: 250, lastYear: 500, total: null },
    weight: 0.9,
    source: S.organLimits,
    mitigations: [RAD_STEPS.shelter, RAD_STEPS.buildShelter, RAD_STEPS.alara, RAD_STEPS.dosimeter],
  },
  {
    id: 'rad_heart',
    region: 'chest',
    title: 'Heart and blood vessels: dose limit',
    organ: 'the circulatory system',
    also: 'NASA computes this dose as the average over the heart muscle and the arteries next to it.',
    quantity: 'organEq',
    limits: { last30Days: 250, lastYear: 500, total: 1000 },
    weight: 0.9,
    source: S.organLimits,
    note: MISSION_ONLY,
    mitigations: [RAD_STEPS.shelter, RAD_STEPS.alara, RAD_STEPS.shorter, RAD_STEPS.dosimeter],
  },
  {
    id: 'rad_brain',
    region: 'brain',
    title: 'Brain and nerves: dose limit',
    organ: 'the central nervous system',
    also: 'NASA computes this dose at the hippocampus, a part of the brain.',
    quantity: 'organ',
    limits: { last30Days: 500, lastYear: 1000, total: 1500 },
    weight: 0.9,
    source: S.organLimits,
    note: MISSION_ONLY,
    mitigations: [RAD_STEPS.shelter, RAD_STEPS.alara, RAD_STEPS.shorter, RAD_STEPS.dosimeter],
  },
  {
    id: 'rad_career',
    // The cancer risk of a career has no single place on the body (see effects-types.ts).
    region: 'none',
    title: 'Cancer risk: dose limit of a career',
    organ: '',
    also: 'NASA set this limit to keep the mean risk of death from a cancer that the radiation causes below 3%.',
    quantity: 'effective',
    // The same value as the limit line of the radiation chart (shared/trip/limits.ts).
    limits: { last30Days: null, lastYear: null, total: CAREER_LIMIT.mSv },
    weight: 1,
    source: S.careerLimit,
    note: MISSION_ONLY,
    mitigations: [RAD_STEPS.alara, RAD_STEPS.shorter, RAD_STEPS.solarMaximum, RAD_STEPS.bestPlace, RAD_STEPS.dosimeter],
  },
  {
    id: 'rad_lens',
    region: 'eyes',
    title: 'Lens of the eye: cataract',
    organ: 'the lens of the eye',
    also: 'These limits are to prevent a severe cataract in the first 5 years, for example after a solar particle event.',
    quantity: 'organEq',
    limits: { last30Days: 1000, lastYear: 2000, total: 4000 },
    weight: 0.7,
    source: S.organLimits,
    note: MISSION_ONLY,
    mitigations: [RAD_STEPS.shelter, RAD_STEPS.endOutside, RAD_STEPS.alara, RAD_STEPS.dosimeter],
  },
  {
    id: 'rad_skin',
    region: 'body',
    title: 'Skin: dose limit',
    organ: 'the skin',
    also: '',
    quantity: 'organEq',
    limits: { last30Days: 1500, lastYear: 3000, total: 6000 },
    weight: 0.6,
    source: S.organLimits,
    note: MISSION_ONLY,
    mitigations: [RAD_STEPS.endOutside, RAD_STEPS.shelter, RAD_STEPS.alara, RAD_STEPS.dosimeter],
  },
]

const and = (parts: string[]) => (parts.length <= 1 ? parts.join('') : parts.length === 2 ? parts.join(' and ') : `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`)

function limitSays(limit: DoseLimit): string {
  const unit = QUANTITY_UNIT[limit.quantity]
  const parts = WINDOWS.filter((window) => limit.limits[window.id] !== null).map((window) => `${doseText(limit.limits[window.id] as number)} ${unit} ${window.span}`)
  const first =
    limit.quantity === 'effective'
      ? `NASA limits the effective dose of a whole career to less than ${doseText(limit.limits.total as number)} mSv, for all ages and sexes.`
      : `NASA limits the dose in ${limit.organ} to ${and(parts)}.`
  return limit.also ? `${first} ${limit.also}` : first
}

function limitEffect(limit: DoseLimit, dose: EffectsInput['dose']): BodyEffect {
  const match = doseMatch(dose.unit, limit.quantity)
  const unit = QUANTITY_UNIT[limit.quantity]
  const start = Math.min(...WINDOWS.map((window) => limit.limits[window.id] ?? Infinity))
  const base = {
    id: limit.id,
    hazard: 'radiation' as const,
    region: limit.region,
    title: limit.title,
    says: limitSays(limit),
    source: limit.source,
    kind: 'limit' as const,
    weight: limit.weight * (match === 'rough' ? ROUGH_WEIGHT : 1),
    ...doseCaveatFields(dose.unit, limit.quantity, limit.note ? [limit.note] : []),
    mitigations: limit.mitigations,
    start,
  }
  if (match === 'none') return { ...base, intensity: 0, ...measured([{ key: MEASURE.noComparison }]) }
  // The time window with the highest ratio of dose to limit.
  let worst: { window: (typeof WINDOWS)[number]; value: number; limit: number; ratio: number } | null = null
  for (const window of WINDOWS) {
    const value = dose[window.id]
    const max = limit.limits[window.id]
    if (!real(value) || max === null || !(max > 0)) continue
    const ratio = Math.max(0, value) / max
    if (worst === null || ratio > worst.ratio) worst = { window, value, limit: max, ratio }
  }
  if (worst === null) return { ...base, intensity: 0, ...measured(NO_DATA) }
  const result: TextPart =
    match === 'nearest'
      ? { key: MEASURE.ofLimit, values: { percent: percent(worst.ratio) } }
      : { key: MEASURE.roughOfLimit, values: { percent: percent(worst.ratio) }, rough: true }
  const parts: TextPart[] = [
    { key: worst.window.dose, values: { dose: doseShown(worst.value), unit: dose.unit } },
    { key: worst.window.limit, values: { limit: doseShown(worst.limit), unit } },
    result,
  ]
  return { ...base, intensity: clamp(worst.ratio), ...measured(parts) }
}

// A value where a source reports an effect, or a limit for one event, compared with one dose of the input.
export type DoseBand = {
  id: string
  region: EffectRegion
  title: string
  says: string
  kind: Effect['kind']
  quantity: DoseQuantity
  // Which dose of the input the app compares: the dose of the mission day, or the dose of the mission.
  dose: 'today' | 'total'
  // The band in the unit of the quantity. to null: the source gives one value.
  from: number
  to: number | null
  // true: the app compares only while a solar particle event is active.
  stormOnly?: boolean
  weight: number
  source: SourceRef
  // More warnings for this value. Each one is a fixed text.
  notes?: string[]
  mitigations: Mitigation[]
}

const DAY_NOT_EVENT = 'The source speaks of a dose in a short time, and the app compares the dose of one mission day, with the cosmic rays of that day in it.'

export const DOSE_BANDS: DoseBand[] = [
  {
    id: 'rad_event_limit',
    region: 'body',
    title: 'Solar particle event: dose limit for one event',
    says: 'NASA requires that the program protects the crew from the reference solar particle event to less than an effective dose of 250 mSv. NASA chose this value to minimize acute effects.',
    kind: 'limit',
    quantity: 'effective',
    dose: 'today',
    // A limit is on the way from 0: the intensity is the dose ÷ the limit.
    from: 0,
    to: 250,
    // A day with cosmic rays only is no event, so the effect is off with no solar particle event.
    stormOnly: true,
    weight: 0.9,
    source: S.eventLimit,
    notes: ['The limit is for one whole event, and the app compares the dose of one mission day, with the cosmic rays of that day in it.'],
    mitigations: [RAD_STEPS.shelter, RAD_STEPS.buildShelter, RAD_STEPS.endOutside, RAD_STEPS.dosimeter],
  },
  {
    id: 'rad_heart_disease',
    region: 'chest',
    title: 'Heart and blood vessels: disease in later years',
    says: 'Studies of people on Earth find more disease of the heart and the blood vessels in later years after a dose of 500 mGy or more of gamma rays or x-rays.',
    kind: 'band',
    quantity: 'gamma',
    dose: 'total',
    from: 500,
    to: null,
    weight: 0.8,
    source: S.heartRisk,
    notes: [MISSION_ONLY],
    mitigations: [RAD_STEPS.alara, RAD_STEPS.shorter, RAD_STEPS.shelter, RAD_STEPS.dosimeter],
  },
  {
    id: 'rad_acute_sickness',
    region: 'body',
    title: 'Acute radiation sickness: nausea, vomiting, fatigue',
    says: 'A dose of 0.5 to 1 Gy in a short time causes mild nausea, vomiting, loss of appetite, and fatigue in a small number of persons, and minor damage to the blood-forming system. From 1 to 2 Gy, these effects increase significantly.',
    kind: 'band',
    quantity: 'gamma',
    dose: 'today',
    from: 500,
    to: 1000,
    weight: 1,
    source: S.acute,
    notes: [DAY_NOT_EVENT],
    mitigations: [RAD_STEPS.shelter, RAD_STEPS.buildShelter, RAD_STEPS.endOutside, RAD_STEPS.report],
  },
  {
    id: 'rad_acute_skin',
    region: 'body',
    title: 'Skin: redness after a solar particle event',
    says: 'The dose that gives redness of the skin in 10% of persons is estimated as 4 Gy. If the dose arrives slowly, it must be about 3 times higher for the same effect.',
    kind: 'band',
    quantity: 'gamma',
    dose: 'today',
    from: 4000,
    to: null,
    weight: 0.8,
    source: S.acute,
    notes: ['This value is a dose in the skin. During work outside, the skin can get up to about 10 times the dose of the organs inside the body.', DAY_NOT_EVENT],
    mitigations: [RAD_STEPS.endOutside, RAD_STEPS.shelter, RAD_STEPS.report],
  },
]

function bandEffect(band: DoseBand, input: EffectsInput): BodyEffect {
  const dose = input.dose
  const match = doseMatch(dose.unit, band.quantity)
  const unit = QUANTITY_UNIT[band.quantity]
  const base = {
    id: band.id,
    hazard: 'radiation' as const,
    region: band.region,
    title: band.title,
    says: band.says,
    source: band.source,
    kind: band.kind,
    weight: band.weight * (match === 'rough' ? ROUGH_WEIGHT : 1),
    ...doseCaveatFields(dose.unit, band.quantity, band.notes ?? []),
    mitigations: band.mitigations,
    // A limit starts at its value. A band starts at its first value.
    start: band.kind === 'limit' ? (band.to ?? band.from) : band.from,
  }
  if (match === 'none') return { ...base, intensity: 0, ...measured([{ key: MEASURE.noComparison }]) }
  if (band.stormOnly && !input.stormNow) return { ...base, intensity: 0, ...measured([{ key: MEASURE.noStorm }]) }
  const value = dose[band.dose]
  if (!real(value)) return { ...base, intensity: 0, ...measured(NO_DATA) }
  const range: TextPart =
    band.kind === 'limit'
      ? { key: MEASURE.limit, values: { limit: doseShown(band.to ?? band.from), unit } }
      : band.to === null
        ? { key: MEASURE.oneValue, values: { value: doseShown(band.from), unit } }
        : { key: MEASURE.band, values: { from: doseShown(band.from), to: doseShown(band.to), unit } }
  const parts: TextPart[] = [{ key: band.dose === 'today' ? MEASURE.doseDay : MEASURE.doseMission, values: { dose: doseShown(value), unit: dose.unit } }]
  if (band.dose === 'today' && input.stormNow) parts.push({ key: MEASURE.stormNow })
  parts.push(range)
  if (match === 'rough') parts.push({ key: MEASURE.rough, rough: true })
  return { ...base, intensity: bandIntensity(Math.max(0, value), band), ...measured(parts) }
}

function radiationEffects(input: EffectsInput): BodyEffect[] {
  const effects = [...DOSE_LIMITS.map((limit) => limitEffect(limit, input.dose)), ...DOSE_BANDS.map((band) => bandEffect(band, input))]
  // The order of the start values. Effects with the same start keep their order.
  return effects.sort((a, b) => a.start - b.start)
}

// ---------------------------------------------------------------------------------------
// More that a source says about an effect, with no number that the app can compare.
// The key is the id of the effect. The card can show these texts below "says".
// ---------------------------------------------------------------------------------------
export type EffectNote = { text: string; source: SourceRef }

export const EFFECT_NOTES: Record<string, EffectNote[]> = {
  rad_career: [
    { text: 'The NASA Human Research Program says: the radiation in space can raise the number of cancer cases and of cancer deaths in the crew.', source: S.cancerRisk },
    { text: 'No study of people exists for space radiation. The risk estimate of NASA is uncertain: the upper end of its 95% range is 3 to 4 times the central value.', source: S.cancerRisk },
  ],
  rad_brain: [
    { text: 'The standard has a second limit for heavy ions alone (charge of 10 or more): 100 mGy in 1 year and 250 mGy in a career. The app has no dose of heavy ions alone, so it does not compare that limit.', source: S.organLimits },
    { text: 'Research on animals suggests that radiation can lower the thinking performance for a short time. It is not certain that this is true for people.', source: S.brainRisk },
    { text: 'The NASA Human Research Program says: radiation exposure damages the central nervous system. It can change the thinking, reduce the control of movement, and change the behavior.', source: S.radiationHazard },
  ],
  rad_heart_disease: [
    { text: 'The data on astronauts does not show a higher risk of death from disease of the heart and the blood vessels. But most missions were 4 to 6 months long, and the follow-up is limited.', source: S.heartRisk },
  ],
  rad_lens: [
    { text: 'Cosmic rays add a risk of small cataracts at lower doses. These can get severe after more than 5 years, and the measures of today cannot prevent them. NASA accepts this risk.', source: S.organLimits },
  ],
  rad_event_limit: [
    { text: 'Acute radiation sickness, for example nausea, vomiting, and fatigue, can occur from the dose in a mission, and also skin injuries and loss of blood-forming cells.', source: S.radiationBrief },
  ],
  rad_acute_sickness: [{ text: 'Inside a spacecraft, shielding works against solar particle events. Acute radiation sickness is then extremely unlikely, except when the crew also works outside.', source: S.acute }],
  o2_high_limit: [{ text: 'Too much O2 can give toxic O2 levels. NASA says that this can lead to problems of the breathing or to injury of the tissue.', source: S.atmosphereBrief }],
  o2_low_target: [
    { text: 'A fast change from normal O2 to low O2 can give symptoms of mountain sickness: headache, nausea, dizziness, or fatigue.', source: S.atmosphereBrief },
    { text: 'Low O2 can also come from a loss of cabin pressure, a failure of the life support system, a toxic exposure, or an illness or injury.', source: S.hypoxiaRisk },
  ],
  o2_low_limit: [
    { text: 'Hypoxia changes the thinking, at times with no sign that the crew can notice. It lowers color vision, night vision, and side vision. It gives fatigue, nausea, headache, dizziness, mood changes, poor sleep, and fast breathing.', source: S.atmosphereBrief },
  ],
  co2_limit_1h: [{ text: 'NASA says: an average of 7 days below 2.5 mmHg keeps the risk of headache below 1%.', source: S.co2Brief }],
}

// ---------------------------------------------------------------------------------------
// The list of effects
// ---------------------------------------------------------------------------------------
// All effects for the values of one mission day, also those with intensity 0.
// The order is stable: CO2, then O2, then radiation. Inside CO2 and radiation, the order is the
// value where each effect starts. Inside O2, it goes from the normal range outward: first the
// low side, then the high side.
export function bodyEffects(input: EffectsInput, options: EffectsOptions = {}): BodyEffect[] {
  const pressure = real(options.totalPressureMmHg) && options.totalPressureMmHg > 0 ? options.totalPressureMmHg : DEFAULT_PRESSURE_MMHG
  return [...co2Effects(input), ...o2Effects(input, pressure), ...radiationEffects(input)]
}

// ---------------------------------------------------------------------------------------
// The color of the figure
// ---------------------------------------------------------------------------------------
// The nine regions of the body figure (the same names as HEAT_REGIONS of web/src/components/heat.ts).
export const FIGURE_REGIONS = ['head', 'chest', 'abdomen', 'arms', 'legs', 'brain', 'eyes', 'face', 'airway'] as const
export type FigureRegion = (typeof FIGURE_REGIONS)[number]
export const EFFECT_REGIONS: EffectRegion[] = ['body', ...FIGURE_REGIONS, 'none']

export type RegionHeat = { heat: number; hazard: Hazard | null }

// How strong the color of one effect is: intensity × weight, from 0 to 1.
export const strengthOf = (effect: Pick<Effect, 'intensity' | 'weight'>) => clamp(effect.intensity) * clamp(effect.weight)

// For each region, the strongest of its own effects (intensity × weight) and the hazard of that
// effect. "body" and "none" are regions of their own here: this function does not spread the
// whole-body value to the parts. figureHeatOf() does that.
export function regionHeatOf(effects: Effect[]): Record<EffectRegion, RegionHeat> {
  const heat = Object.fromEntries(EFFECT_REGIONS.map((region) => [region, { heat: 0, hazard: null }])) as Record<EffectRegion, RegionHeat>
  for (const effect of effects) {
    const strength = strengthOf(effect)
    if (strength > heat[effect.region].heat) heat[effect.region] = { heat: strength, hazard: effect.hazard }
  }
  return heat
}

// The part of the figure below each small region.
const BELOW: Partial<Record<FigureRegion, FigureRegion>> = { brain: 'head', eyes: 'head', face: 'head', airway: 'chest' }

// The heat and the hazard of each of the nine regions of the figure. The rule of the CO2 page (web/src/view.ts):
//   - The whole-body value also counts for each of the five parts (head, chest, abdomen, arms, legs).
//   - A small region (brain, eyes, face, airway) with no effect of its own stays at 0.
//   - A small region that is active is never cooler than the part below it.
export function figureHeatOf(effects: Effect[]): Record<FigureRegion, RegionHeat> {
  const own = regionHeatOf(effects)
  const stronger = (a: RegionHeat, b: RegionHeat) => (b.heat > a.heat ? b : a)
  const figure = {} as Record<FigureRegion, RegionHeat>
  for (const region of FIGURE_REGIONS) if (!BELOW[region]) figure[region] = stronger(own[region], own.body)
  for (const region of FIGURE_REGIONS) {
    const below = BELOW[region]
    if (below) figure[region] = own[region].heat > 0 ? stronger(own[region], figure[below]) : { heat: 0, hazard: null }
  }
  return figure
}

// A value from 0 to 1 for each of the nine regions of the figure. The body figures take this as "heat".
export function figureHeat(effects: Effect[]): Record<FigureRegion, number> {
  const figure = figureHeatOf(effects)
  return Object.fromEntries(FIGURE_REGIONS.map((region) => [region, figure[region].heat])) as Record<FigureRegion, number>
}
