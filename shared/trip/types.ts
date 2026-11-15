// The contract of the "Mars Trip Forecast" page. Each part of the trip code uses these types:
// the mission presets, the trajectory files, the geometry, the radiation forecast, the life
// support forecast, and the settings of the simulator.
//
// This file holds types and a few constants only. It imports nothing but the CO2 math.
import type { Cdra } from '../co2.ts'

// ---------------------------------------------------------------------------------------
// Sources and badges
// ---------------------------------------------------------------------------------------
export type SourceRef = {
  // A short name for a label, for example "Zeitlin et al. 2013".
  short: string
  // The full title, with journal or document number.
  title: string
  url: string
  // A credit line that the data owner asks for, if any.
  credit?: string
}

// The badge of a mission preset.
export type PresetBadge = 'real-data' | 'real-rate' | 'real-trajectory-proxy' | 'proxy' | 'real-rate-modelled' | 'modelled'
// The badge of one chart or one value:
//   real-data  a measured series          real-rate  a published mean of a measurement
//   modelled   computed by our model      proxy      a real value from another mission, used in place of a missing one
export type ChartBadge = 'real-data' | 'real-rate' | 'modelled' | 'proxy'

// ---------------------------------------------------------------------------------------
// Mission presets
// ---------------------------------------------------------------------------------------
export const PRESET_IDS = ['iss', 'artemis1', 'artemis2', 'lunar-orbit', 'lunar-surface', 'gateway', 'msl', 'tgo', 'mars-reference', 'custom'] as const
export type PresetId = (typeof PRESET_IDS)[number]

// Absorbed dose (mGy) and dose equivalent (mSv) are different quantities. A chart never puts
// both on one axis. The app converts one into the other only with a stated quality factor.
export type DoseUnit = 'mGy' | 'mSv'

export type Rate = {
  // The dose for each day, in "unit". null: we found no value that we could check, so the page shows "no data".
  value: number | null
  // The uncertainty that the source gives, in "unit".
  plusMinus?: number
  unit: DoseUnit
  // The instrument that measured the value, for example "MSL RAD".
  instrument: string
  // Where the instrument was, for example "inside the cruise stage" or "outside the orbiter".
  shielding: string
  // The state of the solar cycle at the time of the measurement, for example "near solar maximum".
  solar: string
  // What the source says, in one or two short English sentences, with the number.
  says: string
  source: SourceRef
  badge: ChartBadge
  // The mission that the value comes from, if it is not the mission of this preset. For example "Artemis I".
  proxyOf?: string
  // The same measurement as the other quantity, if the source gives it. For example, MSL RAD gives
  // 1.84 mSv for each day (dose equivalent) and also the absorbed dose in mGy. The page can then show
  // a whole mission in one unit with no conversion of our own.
  other?: { value: number; plusMinus?: number; unit: DoseUnit; says: string }
}

export type PhaseKind = 'leo' | 'departure' | 'belts' | 'cruise' | 'orbit' | 'surface' | 'return'

export type Phase = {
  id: string
  label: string
  kind: PhaseKind
  // The length of the phase in days. A fraction is fine, for example 0.2 for a pass through the Van Allen belts.
  days: number
  rate: Rate
  note?: string
}

// The setting of the solar cycle. It also selects the instrument of the cruise rate.
export const SOLAR_IDS = ['max', 'declining'] as const
export type SolarId = (typeof SOLAR_IDS)[number]

// The three kinds of map:
//   ground  the track of a low orbit on a map of the Earth. A point is [longitude, latitude] in degrees.
//   earth   the Earth in the middle, with the Moon. A point is [x, y] in km, in the plane of the orbit of the Moon.
//   sun     the Sun in the middle, with the Earth and Mars. A point is [x, y] in AU, in the plane of the ecliptic.
export type Frame = 'ground' | 'earth' | 'sun'
export type Point = [number, number]

export type Preset = {
  id: PresetId
  name: string
  // One sentence about the mission.
  summary: string
  badge: PresetBadge
  destination: 'leo' | 'moon' | 'mars'
  frame: Frame
  trajectory: {
    // The name of the trajectory file in web/src/trip/data/, without ".json". null: the app computes the path.
    file: string | null
    source: SourceRef
    // How the path was made, in one or two short sentences.
    note: string
    badge: ChartBadge
  }
  // The phases in the order of the flight. The sum of their days is the length of the mission.
  // A preset with "surfaceStay" or "returnTrip" lists those phases too. The settings of the
  // simulator then change their length or remove them.
  phases: Phase[]
  // The solar-cycle choices of this preset, if it has any. A choice replaces the rate of each "cruise" and "return" phase.
  solar?: Record<SolarId, Rate>
  // The id of the phase with a length that the simulator can change, and its limits in days.
  surfaceStay?: { phaseId: string; defaultDays: number; minDays: number; maxDays: number }
  // The id of the phase that the simulator can switch off (the return flight).
  returnTrip?: { phaseId: string }
  crew: number
  cabin: {
    name: string
    freeVolumeM3: number
    // The source of the volume. If absent, "assumption" tells why we chose the number.
    source?: SourceRef
    assumption?: string
  }
  // Findings of the mission that the page shows as a list, each with its source.
  findings?: { text: string; source: SourceRef }[]
  // Notes that the page must show for this preset, for example about shielding or about a proxy.
  flags: string[]
  sources: SourceRef[]
}

// ---------------------------------------------------------------------------------------
// Trajectory files (web/src/trip/data/<file>.json). Scripts make them one time, so the app needs no network.
// ---------------------------------------------------------------------------------------
export type TrajectoryFile = {
  file: string
  frame: Frame
  source: SourceRef & { retrievedAt: string; target: string }
  // The time of the first sample, ISO 8601, UTC.
  startTime: string
  // The time between two samples, in hours.
  stepHours: number
  // The place of the spacecraft at each sample.
  craft: Point[]
  // The place of each body at each sample: "moon" in the earth frame, "earth" and "mars" in the sun frame. Empty in the ground frame.
  bodies: Record<string, Point[]>
  // The distance from the middle of the Earth to the spacecraft at each sample, in km (in 3D, not in the plane of the map).
  earthDistanceKm: number[]
  // The distance from the Sun to the spacecraft at each sample, in AU. Absent in the ground frame.
  sunDistanceAu?: number[]
  // Ground frame only: true where the spacecraft is inside the South Atlantic Anomaly.
  saa?: boolean[]
  // True if the samples repeat after the last one (a ground track of some orbits).
  loop?: boolean
}

// ---------------------------------------------------------------------------------------
// Geometry of one mission (shared/trip/geometry.ts makes it from a preset and its file)
// ---------------------------------------------------------------------------------------
export const LIGHT_KM_PER_SECOND = 299_792.458
export const KM_PER_AU = 149_597_870.7

export type PhaseSpan = { phase: Phase; fromDay: number; toDay: number }

export type Place = {
  day: number
  craft: Point
  bodies: Record<string, Point>
  earthDistanceKm: number
  // The one-way light time between the Earth and the spacecraft, in seconds.
  lightSeconds: number
  sunDistanceAu: number | null
  // Ground frame: is the spacecraft inside the South Atlantic Anomaly now. null in the other frames.
  inSaa: boolean | null
  phaseId: string
  // True where our model made the place (a mirrored return, a simple orbit). False where it is from a real trajectory.
  modelled: boolean
}

export type Geometry = {
  frame: Frame
  // The length of the mission in days, with the settings of the simulator.
  days: number
  spans: PhaseSpan[]
  // The path of the spacecraft for the map, and the mission day of each point.
  path: Point[]
  pathDays: number[]
  // The path of each body for the map (for the same days as "path").
  bodyPaths: Record<string, Point[]>
  // The light time for the chart: one value for each sample day.
  delay: { day: number; seconds: number; modelled: boolean }[]
  // The place at any mission day (it can be a fraction). Between two samples the value is interpolated.
  at: (day: number) => Place
}

// ---------------------------------------------------------------------------------------
// Radiation forecast (shared/trip/radiation.ts)
// ---------------------------------------------------------------------------------------
// A solar particle event that the presenter adds. It is a what-if scenario, not a forecast.
export type Storm = {
  day: number
  // The extra dose of the event, in the unit of the dose series that is on the screen.
  dose: number
  // How long the event lasts.
  hours: number
}

export type DosePoint = {
  day: number
  // The dose rate of this day, in "unit" for each day. null: no data.
  rate: number | null
  // The total dose from the start of the mission to the end of this day. null after the first day with no data.
  total: number | null
  phaseId: string
}

export type DoseSeries = {
  unit: DoseUnit
  points: DosePoint[]
  // The rate that each phase uses, after the solar-cycle setting.
  rates: { span: PhaseSpan; rate: Rate }[]
  storms: Storm[]
  // The mission day when the total passes the career limit. null: it does not, or the unit is not mSv.
  limitDay: number | null
  // True if at least one phase has no data, so the total is not complete.
  incomplete: boolean
}

// ---------------------------------------------------------------------------------------
// Life support forecast: CO2 and O2 in a well-mixed cabin (shared/trip/lifesupport.ts)
// ---------------------------------------------------------------------------------------
export type Activity = 'sleep' | 'nominal' | 'exercise'

// The source of the metabolic rates. "hidh": NASA HIDH rates by activity (via OCHMO-TB-004).
// "exercise90": the profile of NTRS 20190027563, 1.08 kg of CO2 each day with 90 minutes of exercise.
export const METABOLIC_IDS = ['hidh', 'exercise90'] as const
export type MetabolicId = (typeof METABOLIC_IDS)[number]

// The day of one crew member. All crew members have the same day.
export type Schedule = {
  // The hour of the day when the sleep starts (0 to 23), and its length in hours.
  sleepStartHour: number
  sleepHours: number
  // The hour of the day when each exercise session starts, and the length of one session in minutes.
  exerciseStartHours: number[]
  exerciseMinutes: number
}
export const DEFAULT_SCHEDULE: Schedule = { sleepStartHour: 22, sleepHours: 8, exerciseStartHours: [8, 16], exerciseMinutes: 30 }

export type LifeSupport = {
  crew: number
  freeVolumeM3: number
  temperatureC: number
  totalPressureMmHg: number
  metabolic: MetabolicId
  schedule: Schedule
  // The CO2 scrubber, a system like the CDRA of the station: both beds, one bed, or off.
  scrubber: Cdra
  // How many scrubbers "like one CDRA with both beds" the cabin has when the scrubber is on both beds.
  // On one bed the scrubber removes half, and off it removes nothing.
  scrubberUnits: number
  // Other CO2 removal that always works, in the same unit. Only the station has it (a second CDRA
  // and the Russian Vozdukh system). Absent means 0.
  otherUnits?: number
  // The oxygen generator (OGA, electrolysis of water).
  ogaOn: boolean
  // The O2 that the generator makes, in kg for each day. null: as much as the crew uses in a day.
  ogaKgPerDay: number | null
  // O2 in bottles, in kg. The cabin uses it when the generator is off.
  bottledO2Kg: number
  // The Sabatier reactor. It changes the "O2 loop closure" only, not the gas in the cabin.
  sabatier: boolean
}

export type CabinNow = {
  co2MmHg: number
  o2MmHg: number
  activity: Activity
  // The O2 that is left in the bottles, in kg.
  bottledO2Kg: number
}

// What the page shows for CO2 and O2 at one mission day.
export type CabinForecast = {
  now: CabinNow
  // The CO2 of the last 7 days in mmHg, one value each 5 minutes, oldest first. The last value is "now".
  // The CO2 cards (averages, body map) read this.
  pastCo2MmHg: number[]
  // The chart: from 24 hours before now to 48 hours after now, one value each 5 minutes.
  chart: { hour: number; co2MmHg: number; o2MmHg: number; activity: Activity }[]
  // The CO2 of the next 24 hours in mmHg, one value each 5 minutes. The first value is "now".
  nextCo2MmHg: number[]
  // The hours until the CO2 reaches this value from now. 0: at it now. null: not in the next 30 days.
  hoursToCo2: (targetMmHg: number) => number | null
  // The hours until the O2 goes below or above this value from now. null: not in the next 30 days.
  hoursToO2: (targetMmHg: number) => number | null
  // The mean CO2 of a full day with the settings now, after the cabin reached its daily pattern. null: it never does (for example, scrubber off).
  dailyMeanCo2MmHg: number | null
  // The part of the O2 that the crew uses that comes back from the CO2 (Sabatier reactor), from 0 to 1. 0 with the reactor off.
  o2LoopClosure: number
}

// NASA-STD-3001 Volume 2 [V2 6003]: the range of the O2 partial pressure for normal work, in mmHg.
export const O2_RANGE_MMHG = { low: 145, high: 155 }

// ---------------------------------------------------------------------------------------
// The settings of the trip in the simulator (server/src/engine.ts holds them, all pages get them)
// ---------------------------------------------------------------------------------------
export type TripState = {
  preset: PresetId
  // The mission day of the cursor. It can be a fraction: 12.5 is noon of day 12.
  day: number
  playing: boolean
  // How many mission days the clock moves each second.
  speed: number
  solar: SolarId
  // The quantity of the radiation charts: dose equivalent (mSv) or absorbed dose (mGy).
  doseUnit: DoseUnit
  storms: Storm[]
  // The length of the surface stay in days, and if the mission has a return flight. Only some presets use them.
  surfaceDays: number
  returnTrip: boolean
  // The custom preset: the length of the flight in days, and the dose rate with its unit.
  customDays: number
  customRate: number
  customUnit: DoseUnit
  // The life support settings now.
  life: LifeSupport
  // The mission day when the life support settings changed last. Before this day, the cabin has
  // the nominal settings of the preset (scrubber on both beds, generator on). From this day on,
  // it has the settings in "life". So a failure starts at the day where the presenter set it.
  lifeChangedDay: number
  // Up to three presets for the comparison chart.
  compare: PresetId[]
}

export const TRIP_SPEEDS = [0.01, 0.05, 0.25, 1, 5]
export const TRIP_LIMITS = {
  crew: { min: 1, max: 7 },
  freeVolumeM3: { min: 5, max: 1500 },
  surfaceDays: { min: 0, max: 600 },
  customDays: { min: 1, max: 1200 },
  customRate: { min: 0, max: 10 },
  stormDose: { min: 1, max: 2000 },
  stormHours: { min: 1, max: 120 },
  ogaKgPerDay: { min: 0, max: 9.25 },
  bottledO2Kg: { min: 0, max: 500 },
  storms: 5,
}
