// The check of the life support model against a real record: the cabin CO2 of the International
// Space Station during the Rodent Research-9 (RR-9) mission, from 18 August to 16 September 2017.
//
// The model gets the crew count of the station at each time. It starts from its own daily pattern
// for 6 persons. One number of the model is set from the record: the other CO2 removal of the
// station (ISS_OTHER_UNITS). The page gets the real hourly means from the server.
import { CDRA_RATE, DEFAULT_PARAMS, DEFAULT_PRESSURE_MMHG, ppmToMmHg } from '../co2.ts'
import { MINUTES_PER_DAY, dailyPattern, stepCabin, stepperOf, type CabinState, type Stepper } from './lifesupport.ts'
import { DEFAULT_SCHEDULE, type LifeSupport, type SourceRef } from './types.ts'

const UNDOCK_POST: SourceRef = {
  short: 'NASA, 2 September 2017',
  title: 'NASA space station blog, "Expedition 52 Trio Undocks from Station": Soyuz MS-04 with 3 persons "undocked from the International Space Station at 5:58 p.m. EDT". The NASA release of the same day says that a "three-person crew" stays.',
  url: 'https://www.nasa.gov/blogs/spacestation/2017/09/02/expedition-52-trio-undocks-from-station/',
}
const ARRIVE_RELEASE: SourceRef = {
  short: 'NASA release, 12 September 2017',
  title: 'NASA release "Three New Crew Members Arrive at International Space Station": Soyuz MS-06 docked at 10:55 p.m. EDT, which "restores the station\'s crew to six".',
  url: 'https://www.nasa.gov/news-release/three-new-crew-members-arrive-at-international-space-station/',
}

// The crew count of the station in the window of the RR-9 record. "from: null" is the start of the record.
export const ISS_CREW: { from: string | null; count: number; source: SourceRef }[] = [
  // The crew was 6 persons before 3 of them left: 3 persons left, and 3 persons stayed.
  { from: null, count: 6, source: UNDOCK_POST },
  { from: '2017-09-02T21:58:00Z', count: 3, source: UNDOCK_POST },
  { from: '2017-09-13T02:55:00Z', count: 6, source: ARRIVE_RELEASE },
]

// The other CO2 removal of the station (a second CDRA, the Russian Vozdukh system), as a multiple
// of one CDRA with both beds. It always works. No source gives this number, so it is set from the
// RR-9 record: with this value, the daily mean of the model with 6 persons is the mean of the real
// record with 6 persons before the undock, 2.66 mmHg.
//
//   removal = crew output:  (1 + other) × (1.723 × 2.66 − 0.37975) = 6 × 1.1655 kg each day
//   other = 6.993 / 4.203 − 1 = 0.66 (2 decimals)
//
// 1.1655 kg is the CO2 of one person for each day with the handbook rates and the default schedule.
// The CO2 page uses 1.04 kg for each person, so its value for the same number is 0.5.
export const ISS_OTHER_UNITS = 0.66

// The cabin of the station for this check. README.md gives the source of the volume.
export function issLife(crew: number): LifeSupport {
  return {
    crew,
    freeVolumeM3: DEFAULT_PARAMS.freeVolumeM3,
    temperatureC: DEFAULT_PARAMS.temperatureC,
    totalPressureMmHg: DEFAULT_PRESSURE_MMHG,
    metabolic: 'hidh',
    schedule: { ...DEFAULT_SCHEDULE, exerciseStartHours: [...DEFAULT_SCHEDULE.exerciseStartHours] },
    scrubber: 'both',
    scrubberUnits: 1,
    otherUnits: ISS_OTHER_UNITS,
    ogaOn: true,
    ogaKgPerDay: null,
    bottledO2Kg: 0,
    sabatier: false,
  }
}

// What the page must say next to the comparison.
export const CALIBRATION_NOTE =
  'The model gets the crew count of the station: 6 persons, then 3, then 6. It starts from its own daily pattern for 6 persons. The crew follows the default schedule in UTC. ' +
  'One number is set from this record: the other CO2 removal of the station, 0.66 times one CDRA. It makes the level of the model with 6 persons equal to the mean of the record before the crew changed. ' +
  'So the level with 6 persons is not a test. The test is the fall after 3 persons left, the level with 3 persons, and the rise after 3 persons came. ' +
  'One sensor sees local effects, and the model does not know when the ground changed the CO2 removal.'

export type IssCalibration = {
  // The hour of each value, from the start of the record: 0, 1, 2...
  hours: number[]
  // The real hourly mean and the hourly mean of the model, in mmHg.
  realMmHg: number[]
  modelMmHg: number[]
  // The root of the mean of the squared errors, and the mean error (model − real), in mmHg.
  rmsMmHg: number
  meanErrorMmHg: number
  // The crew count from each hour on. The hour can be a fraction.
  crew: { fromHour: number; count: number; source: SourceRef }[]
  // The kg of CO2 that the station removes each day for each mmHg of CO2: (1 + ISS_OTHER_UNITS) × 1.723.
  removalPerMmHgKgDay: number
  note: string
}

// Runs the model over the window of the record and compares the hourly means.
//   hourlyPpm  the real hourly means in ppm, the first hour starts at "startMs"
//   startMs    the time of the first value of the record, in milliseconds (UTC)
// The schedule of the crew uses UTC, which is the time of the station.
export function issCalibration(hourlyPpm: number[], startMs: number): IssCalibration {
  const crew = ISS_CREW.map((item) => ({
    fromHour: item.from === null ? 0 : (Date.parse(item.from) - startMs) / 3_600_000,
    count: item.count,
    source: item.source,
  }))
  const crewAt = (minute: number) => {
    let count = crew[0].count
    for (const item of crew) if (minute >= item.fromHour * 60) count = item.count
    return count
  }

  // One set of model numbers for each crew count.
  const steppers = new Map<number, Stepper>()
  const stepperFor = (count: number) => {
    let stepper = steppers.get(count)
    if (!stepper) steppers.set(count, (stepper = stepperOf(issLife(count))))
    return stepper
  }

  const firstMinuteOfDay = ((Math.floor(startMs / 60_000) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  const pattern = dailyPattern(issLife(crewAt(0)))
  const state: CabinState = { co2MmHg: pattern.co2MmHg[firstMinuteOfDay], o2MmHg: pattern.o2MmHg[firstMinuteOfDay], bottledO2Kg: 0 }

  const hours: number[] = []
  const realMmHg: number[] = []
  const modelMmHg: number[] = []
  let squares = 0
  let errors = 0
  let count = 0
  for (let hour = 0; hour < hourlyPpm.length; hour++) {
    // The mean of the 60 values of the hour, one at the start of each minute.
    let sum = 0
    for (let minute = hour * 60; minute < (hour + 1) * 60; minute++) {
      sum += state.co2MmHg
      stepCabin(stepperFor(crewAt(minute)), state, (firstMinuteOfDay + minute) % MINUTES_PER_DAY)
    }
    const model = sum / 60
    const real = ppmToMmHg(hourlyPpm[hour])
    hours.push(hour)
    realMmHg.push(real)
    modelMmHg.push(model)
    if (Number.isFinite(real)) {
      squares += (model - real) ** 2
      errors += model - real
      count += 1
    }
  }

  return {
    hours,
    realMmHg,
    modelMmHg,
    rmsMmHg: count ? Math.sqrt(squares / count) : NaN,
    meanErrorMmHg: count ? errors / count : NaN,
    crew,
    removalPerMmHgKgDay: (1 + ISS_OTHER_UNITS) * CDRA_RATE.kgPerDayPerMmHg,
    note: CALIBRATION_NOTE,
  }
}
