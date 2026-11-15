// Tests of the life support model. Run: node --test shared/trip/lifesupport.test.ts
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CDRA_RATE, DEFAULT_PARAMS, HISTORY_STEPS, mmHgPerKg, modelOf } from '../co2.ts'
import {
  LOOK_AHEAD_DAYS,
  METABOLIC,
  MINUTES_PER_DAY,
  O2_KG_PER_MOL,
  O2_SOURCE,
  OGA,
  SABATIER,
  activityAt,
  cabinForecast,
  cabinO2MmHg,
  crewActivityAt,
  crewDailyTotals,
  dailyPattern,
  dailyTotals,
  generatorKgPerDay,
  inspiredO2MmHg,
  minutesByActivity,
  mmHgPerKgO2,
  o2LoopClosure,
  runCabin,
  scrubberUnitsNow,
  type CabinState,
} from './lifesupport.ts'
import { DEFAULT_SCHEDULE, O2_RANGE_MMHG, TRIP_LIMITS, type Activity, type LifeSupport, type Schedule } from './types.ts'

const near = (actual: number, expected: number, tolerance: number) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`)

const schedule = (over: Partial<Schedule> = {}): Schedule => ({ ...DEFAULT_SCHEDULE, exerciseStartHours: [...DEFAULT_SCHEDULE.exerciseStartHours], ...over })
// A day with one activity only.
const ALL_NOMINAL = schedule({ sleepHours: 0, exerciseStartHours: [] })
const ALL_SLEEP = schedule({ sleepHours: 24, exerciseStartHours: [] })
const ALL_EXERCISE = schedule({ sleepHours: 0, exerciseStartHours: [0], exerciseMinutes: MINUTES_PER_DAY })

// A cabin for a flight to Mars: 4 persons, 100 m³, one scrubber. And a station with other removal that always works.
const life = (over: Partial<LifeSupport> = {}): LifeSupport => ({
  crew: 4,
  freeVolumeM3: 100,
  temperatureC: 22.5,
  totalPressureMmHg: 760,
  metabolic: 'hidh',
  schedule: schedule(),
  scrubber: 'both',
  scrubberUnits: 1,
  ogaOn: true,
  ogaKgPerDay: null,
  bottledO2Kg: 0,
  sabatier: false,
  ...over,
})
const station = (over: Partial<LifeSupport> = {}) => life({ crew: 6, freeVolumeM3: 916, scrubberUnits: 1, otherUnits: 0.5, ...over })

// The crew of "life()" at one minute of the default day, counted by hand: all 4 persons sleep from 22:00 to 06:00.
// From 08:00 to 10:00 and from 16:00 to 18:00 one person exercises (4 sessions of 30 minutes, one after the other).
const defaultCrewAt = (minute: number): Record<Activity, number> => {
  const ofDay = ((minute % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  if (ofDay >= 22 * 60 || ofDay < 6 * 60) return { sleep: 4, nominal: 0, exercise: 0 }
  const one = (ofDay >= 8 * 60 && ofDay < 10 * 60) || (ofDay >= 16 * 60 && ofDay < 18 * 60)
  return one ? { sleep: 0, nominal: 3, exercise: 1 } : { sleep: 0, nominal: 4, exercise: 0 }
}
const defaultCrewKg = (rates: Record<Activity, number>, minute: number) => {
  const crew = defaultCrewAt(minute)
  return crew.sleep * rates.sleep + crew.nominal * rates.nominal + crew.exercise * rates.exercise
}

// The factor between the O2 pressure of the dry cabin gas and the inspired O2 pressure at 760 mmHg.
const INSPIRED = (760 - 47) / 760

// The state of the daily pattern at one minute of the day.
const patternAt = (settings: LifeSupport, minute: number, bottledO2Kg = settings.bottledO2Kg): CabinState => {
  const pattern = dailyPattern(settings)
  const ofDay = ((minute % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  return { co2MmHg: pattern.co2MmHg[ofDay], o2MmHg: pattern.o2MmHg[ofDay], bottledO2Kg }
}
// A direct run of the model from the change to a later minute, with no shortcut.
const direct = (nominal: LifeSupport, current: LifeSupport, changedDay: number, day: number) => {
  const changeMinute = Math.round(changedDay * MINUTES_PER_DAY)
  const nowMinute = Math.round(day * MINUTES_PER_DAY)
  return runCabin(current, patternAt(nominal, changeMinute, current.bottledO2Kg), changeMinute, nowMinute - changeMinute)
}
// The hours until a direct run crosses the target, from the first minute where the value is on the other side.
const directHoursTo = (settings: LifeSupport, start: CabinState, fromMinute: number, pick: (state: CabinState) => number, target: number) => {
  const side = pick(start) > target
  let before = pick(start)
  let found: number | null = null
  runCabin(settings, start, fromMinute, LOOK_AHEAD_DAYS * MINUTES_PER_DAY, (state, minute) => {
    const value = pick(state)
    if (found === null && minute > fromMinute && (value > target !== side || value === target)) {
      found = (minute - fromMinute - 1 + (before - target) / (before - value)) / 60
    }
    before = value
  })
  return found as number | null
}

describe('metabolic rates', () => {
  it('holds the rates of the NASA handbook, table 6.2-10', () => {
    assert.deepEqual(METABOLIC.hidh.o2KgPerMin, { sleep: 3.6e-4, nominal: 5.68e-4, exercise: 39.4e-4 })
    assert.deepEqual(METABOLIC.hidh.co2KgPerMin, { sleep: 4.55e-4, nominal: 7.2e-4, exercise: 49.85e-4 })
  })

  it('gives the daily totals of the handbook for the day of the handbook', () => {
    // 8 hours of sleep, one exercise session of 30 minutes: 0.82 kg of O2 and 1.04 kg of CO2.
    const withExercise = dailyTotals({ metabolic: 'hidh', schedule: schedule({ exerciseStartHours: [8] }) })
    assert.equal(withExercise.o2Kg.toFixed(2), '0.82')
    assert.equal(withExercise.co2Kg.toFixed(2), '1.04')
    assert.deepEqual(METABOLIC.hidh.sourceDay, { sleepHours: 8, exerciseMinutes: 30, o2Kg: 0.82, co2Kg: 1.04 })
    // No exercise: 0.72 and 0.91.
    const noExercise = dailyTotals({ metabolic: 'hidh', schedule: schedule({ exerciseStartHours: [] }) })
    assert.equal(noExercise.o2Kg.toFixed(2), '0.72')
    assert.equal(noExercise.co2Kg.toFixed(2), '0.91')
  })

  it('gives more for the default schedule of the app, which has 60 minutes of exercise', () => {
    const totals = dailyTotals({ metabolic: 'hidh', schedule: DEFAULT_SCHEDULE })
    near(totals.o2Kg, 0.9204, 1e-9)
    near(totals.co2Kg, 1.1655, 1e-9)
    assert.deepEqual(minutesByActivity(DEFAULT_SCHEDULE), { sleep: 480, nominal: 900, exercise: 60 })
  })

  it('has a respiratory quotient of 0.92 in the handbook rates', () => {
    for (const activity of ['sleep', 'nominal', 'exercise'] as Activity[]) {
      const quotient = METABOLIC.hidh.co2KgPerMin[activity] / 0.04401 / (METABOLIC.hidh.o2KgPerMin[activity] / O2_KG_PER_MOL)
      near(quotient, 0.92, 0.005)
    }
  })

  it('gives the daily totals of Ewert and Stromgren for 90 minutes of exercise', () => {
    // Sleep and nominal are the rates of the paper. Exercise is the mean of 30 aerobic and 60 resistive minutes.
    near(METABOLIC.exercise90.o2KgPerMin.exercise, (30 * 3.99 + 60 * 1.43) / 90 / 1000, 1e-15)
    near(METABOLIC.exercise90.co2KgPerMin.exercise, 3.0e-3, 1e-15)
    const totals = dailyTotals({ metabolic: 'exercise90', schedule: schedule({ exerciseMinutes: 45 }) })
    // The paper prints 1.08 kg of CO2 and 0.89 kg of O2. The sum of its own table is 1.0815 and 0.8964.
    assert.equal(totals.co2Kg.toFixed(2), '1.08')
    near(totals.o2Kg, 0.8964, 1e-9)
    near(totals.o2Kg, METABOLIC.exercise90.sourceDay.o2Kg, 0.007)
    // With the default schedule (60 minutes of exercise) the totals are lower.
    near(dailyTotals({ metabolic: 'exercise90', schedule: DEFAULT_SCHEDULE }).co2Kg, 1.0122, 1e-9)
  })
})

describe('schedule', () => {
  it('finds the activity of each minute of the default day', () => {
    const at = (hour: number, minute = 0) => activityAt(DEFAULT_SCHEDULE, hour * 60 + minute)
    assert.equal(at(22), 'sleep')
    assert.equal(at(0), 'sleep')
    assert.equal(at(5, 59), 'sleep')
    assert.equal(at(6), 'nominal')
    assert.equal(at(8), 'exercise')
    assert.equal(at(8, 29), 'exercise')
    assert.equal(at(8, 30), 'nominal')
    assert.equal(at(16, 10), 'exercise')
    assert.equal(at(21, 59), 'nominal')
  })

  it('repeats each day, and an exercise session wins over sleep', () => {
    assert.equal(activityAt(DEFAULT_SCHEDULE, MINUTES_PER_DAY + 8 * 60), 'exercise')
    assert.equal(activityAt(DEFAULT_SCHEDULE, -60), 'sleep')
    const late = schedule({ exerciseStartHours: [23.75], exerciseMinutes: 30 })
    assert.equal(activityAt(late, 23 * 60 + 50), 'exercise')
    assert.equal(activityAt(late, 10), 'exercise')
    assert.equal(activityAt(late, 20), 'sleep')
  })

  it('lets the crew members exercise one after the other, and sleep at the same time', () => {
    // 7 persons: the sessions of 30 minutes fill 08:00 to 11:30 and 16:00 to 19:30. Never two persons at the same time.
    const seven = life({ crew: 7 })
    const use = (minute: number) => runCabin({ ...seven, ogaOn: false }, { co2MmHg: 2, o2MmHg: 150, bottledO2Kg: 1000 }, minute, 1).bottledO2Kg
    const rates = METABOLIC.hidh.o2KgPerMin
    for (let minute = 0; minute < MINUTES_PER_DAY; minute++) {
      const asleep = minute >= 22 * 60 || minute < 6 * 60
      const session = (minute >= 8 * 60 && minute < 11.5 * 60) || (minute >= 16 * 60 && minute < 19.5 * 60)
      const expected = asleep ? 7 * rates.sleep : session ? 6 * rates.nominal + rates.exercise : 7 * rates.nominal
      near(1000 - use(minute), expected, 1e-9)
      assert.equal(crewActivityAt(DEFAULT_SCHEDULE, 7, minute), asleep ? 'sleep' : session ? 'exercise' : 'nominal')
    }
    // Crew member 0 exercises from 08:00 to 08:30. At 09:45 the fourth person exercises.
    assert.equal(activityAt(DEFAULT_SCHEDULE, 9 * 60 + 45), 'nominal')
    assert.equal(crewActivityAt(DEFAULT_SCHEDULE, 4, 9 * 60 + 45), 'exercise')
    assert.equal(crewActivityAt(DEFAULT_SCHEDULE, 3, 9 * 60 + 45), 'nominal')
    assert.equal(crewActivityAt(DEFAULT_SCHEDULE, 1, 8 * 60 + 10), activityAt(DEFAULT_SCHEDULE, 8 * 60 + 10))
    // The crew as a whole makes the crew count × the daily totals of one person.
    near(crewDailyTotals(seven).co2Kg, 7 * dailyTotals(seven).co2Kg, 1e-9)
    near(crewDailyTotals(seven).o2Kg, 7 * dailyTotals(seven).o2Kg, 1e-9)
  })

  it('keeps the exercise when a shifted session reaches the sleep time', () => {
    // Sessions from 21:00: the third person exercises from 22:00 to 22:30, when the others sleep.
    const late = schedule({ exerciseStartHours: [21] })
    assert.equal(crewActivityAt(late, 4, 22 * 60 + 10), 'exercise')
    assert.equal(crewActivityAt(late, 2, 22 * 60 + 10), 'sleep')
    // These 60 minutes of exercise replace sleep, not nominal work. So the crew total is a little above 4 × one person.
    const settings = life({ schedule: late })
    const extra = 60 * (METABOLIC.hidh.co2KgPerMin.nominal - METABOLIC.hidh.co2KgPerMin.sleep)
    near(crewDailyTotals(settings).co2Kg, 4 * dailyTotals(settings).co2Kg + extra, 1e-9)
    // The generator still makes what the whole crew uses, so the O2 is level.
    near(generatorKgPerDay(settings), crewDailyTotals(settings).o2Kg, 1e-12)
    assert.equal(dailyPattern(settings).o2Level, true)
  })

  it('counts 1440 minutes in a day for each schedule', () => {
    for (const item of [DEFAULT_SCHEDULE, ALL_NOMINAL, ALL_SLEEP, ALL_EXERCISE, schedule({ sleepStartHour: 3, sleepHours: 6.5, exerciseStartHours: [1, 2, 20], exerciseMinutes: 50 })]) {
      const minutes = minutesByActivity(item)
      assert.equal(minutes.sleep + minutes.nominal + minutes.exercise, MINUTES_PER_DAY)
    }
    assert.deepEqual(minutesByActivity(ALL_EXERCISE), { sleep: 0, nominal: 0, exercise: MINUTES_PER_DAY })
  })
})

describe('CO2', () => {
  it('reaches the balance of the model of shared/co2.ts with a constant activity', () => {
    for (const [day, activity] of [[ALL_NOMINAL, 'nominal'], [ALL_SLEEP, 'sleep'], [ALL_EXERCISE, 'exercise']] as const) {
      for (const scrubber of ['both', 'one', 'off'] as const) {
        const settings = station({ schedule: day, scrubber })
        const model = modelOf({ ...DEFAULT_PARAMS, co2PerPersonKgDay: METABOLIC.hidh.co2KgPerMin[activity] * MINUTES_PER_DAY, otherRemoval: 0.5 }, 6, scrubber)
        const end = runCabin(settings, { co2MmHg: 1, o2MmHg: 150, bottledO2Kg: 0 }, 0, 150 * MINUTES_PER_DAY)
        near(end.co2MmHg, model.balance, 1e-9)
        near(dailyPattern(settings).meanCo2MmHg!, model.balance, 1e-9)
      }
    }
    // The handbook day gives 1.04 kg for each person. A constant rate of 1.04 kg gives the balance of the CO2 page.
    near(modelOf(DEFAULT_PARAMS, 6, 'both').balance, 2.635, 0.005)
  })

  it('counts the removal: (both 1, one bed 0.5, off 0) × scrubber units + other units', () => {
    assert.equal(scrubberUnitsNow({ scrubber: 'both', scrubberUnits: 1 }), 1)
    assert.equal(scrubberUnitsNow({ scrubber: 'one', scrubberUnits: 1 }), DEFAULT_PARAMS.oneBedShare)
    assert.equal(scrubberUnitsNow({ scrubber: 'off', scrubberUnits: 1 }), 0)
    assert.equal(scrubberUnitsNow({ scrubber: 'both', scrubberUnits: 2 }), 2)
    assert.equal(scrubberUnitsNow({ scrubber: 'one', scrubberUnits: 2 }), 1)
    assert.equal(scrubberUnitsNow({ scrubber: 'off', scrubberUnits: 2 }), 0)
    // The other removal always works.
    assert.equal(scrubberUnitsNow({ scrubber: 'both', scrubberUnits: 1, otherUnits: 0.5 }), 1.5)
    assert.equal(scrubberUnitsNow({ scrubber: 'one', scrubberUnits: 1, otherUnits: 0.5 }), 1)
    assert.equal(scrubberUnitsNow({ scrubber: 'off', scrubberUnits: 3, otherUnits: 0.66 }), 0.66)
    assert.equal(scrubberUnitsNow({ scrubber: 'both', scrubberUnits: 0.2 }), 0.2)
    // Two units remove two times what one unit removes, so 4 persons on 2 units have the balance of 2 persons on 1 unit.
    const calm = { schedule: ALL_NOMINAL }
    near(dailyPattern(life({ ...calm, scrubberUnits: 2 })).meanCo2MmHg!, dailyPattern(life({ ...calm, crew: 2 })).meanCo2MmHg!, 1e-9)
    // A scrubber on one bed with 2 units is one unit on both beds.
    near(dailyPattern(life({ scrubber: 'one', scrubberUnits: 2 })).meanCo2MmHg!, dailyPattern(life()).meanCo2MmHg!, 1e-9)
  })

  it('removes 1.723 × ppCO2 − 0.37975 kg each day for one unit', () => {
    // One minute from 3 mmHg with one unit: the fall is near (crew output − removal) × pressure of 1 kg.
    const settings = life({ schedule: ALL_NOMINAL })
    const perKg = mmHgPerKg(settings)
    const made = (4 * METABOLIC.hidh.co2KgPerMin.nominal * MINUTES_PER_DAY) / MINUTES_PER_DAY
    const removed = (CDRA_RATE.kgPerDayPerMmHg * 3 - CDRA_RATE.offsetKgPerDay) / MINUTES_PER_DAY
    const after = runCabin(settings, { co2MmHg: 3, o2MmHg: 150, bottledO2Kg: 0 }, 0, 1)
    near(after.co2MmHg - 3, (made - removed) * perKg, 1e-5)
  })

  it('rises by exactly the CO2 of the crew × pressure of 1 kg after the scrubber fails', () => {
    const off = life({ scrubber: 'off' })
    const perKg = mmHgPerKg(off)
    let before = 2
    runCabin(off, { co2MmHg: 2, o2MmHg: 150, bottledO2Kg: 0 }, 0, MINUTES_PER_DAY, (state, minute) => {
      if (minute === 0) return
      near(state.co2MmHg - before, defaultCrewKg(METABOLIC.hidh.co2KgPerMin, minute - 1) * perKg, 1e-12)
      before = state.co2MmHg
    })
    // A full day adds the daily total of the crew.
    const day = runCabin(off, { co2MmHg: 2, o2MmHg: 150, bottledO2Kg: 0 }, 0, MINUTES_PER_DAY)
    near(day.co2MmHg - 2, 4 * dailyTotals(off).co2Kg * perKg, 1e-9)
  })

  it('shows the same rise in the forecast, from the nominal pattern at the time of the failure', () => {
    const nominal = life()
    const off = life({ scrubber: 'off' })
    const perKg = mmHgPerKg(off)
    // The failure is at 12:00 of day 3. Two hours later the crew is at nominal work.
    const forecast = cabinForecast(nominal, off, 3.5, 3.5 + 2 / 24)
    const start = patternAt(nominal, 3.5 * MINUTES_PER_DAY)
    near(forecast.now.co2MmHg, start.co2MmHg + 120 * 4 * METABOLIC.hidh.co2KgPerMin.nominal * perKg, 1e-9)
    assert.equal(forecast.dailyMeanCo2MmHg, null)
    // With other removal that always works, the cabin still has a balance.
    assert.notEqual(cabinForecast(station(), station({ scrubber: 'off' }), 3.5, 4).dailyMeanCo2MmHg, null)
  })
})

describe('daily pattern', () => {
  it('repeats: one more day from the pattern gives the pattern again', () => {
    for (const settings of [station(), life(), life({ freeVolumeM3: 9 }), life({ scrubber: 'one', metabolic: 'exercise90' })]) {
      const pattern = dailyPattern(settings)
      runCabin(settings, patternAt(settings, 0), 0, MINUTES_PER_DAY, (state, minute) => {
        near(state.co2MmHg, pattern.co2MmHg[minute % MINUTES_PER_DAY], 1e-8)
        near(state.o2MmHg, pattern.o2MmHg[minute % MINUTES_PER_DAY], 1e-8)
      })
    }
  })

  it('is where a long run of the model ends, from any start', () => {
    const settings = station()
    const pattern = dailyPattern(settings)
    for (const start of [0, 1, 9]) {
      const end = runCabin(settings, { co2MmHg: start, o2MmHg: 150, bottledO2Kg: 0 }, 0, 40 * MINUTES_PER_DAY + 500)
      near(end.co2MmHg, pattern.co2MmHg[500], 1e-8)
    }
  })

  it('removes in one day what the crew makes in one day', () => {
    // removal = units × (1.723 × mean CO2 − 0.37975) kg each day, and it must equal crew × daily CO2 of one person.
    for (const settings of [station(), life(), life({ metabolic: 'exercise90', crew: 3, freeVolumeM3: 300 })]) {
      const units = scrubberUnitsNow(settings)
      const removed = units * (CDRA_RATE.kgPerDayPerMmHg * dailyPattern(settings).meanCo2MmHg! - CDRA_RATE.offsetKgPerDay)
      near(removed, settings.crew * dailyTotals(settings).co2Kg, 0.01)
    }
    // The station with 6 persons and the default schedule: (6 × 1.1655 + 1.5 × 0.37975) / (1.5 × 1.723) = 2.926 mmHg.
    near(dailyPattern(station()).meanCo2MmHg!, 2.926, 0.002)
  })

  it('swings with the activity: highest at the end of an exercise session, lowest before the first one', () => {
    const pattern = dailyPattern(station())
    const highest = pattern.co2MmHg.indexOf(Math.max(...pattern.co2MmHg))
    const lowest = pattern.co2MmHg.indexOf(Math.min(...pattern.co2MmHg))
    // 6 persons exercise one after the other: from 08:00 to 11:00 and from 16:00 to 19:00.
    assert.ok(highest === 11 * 60 || highest === 19 * 60)
    // The CO2 falls in the sleep, and it still falls a little in the morning, until the first session starts at 08:00.
    assert.equal(lowest, 8 * 60)
    assert.ok(pattern.co2MmHg[6 * 60] < pattern.co2MmHg[22 * 60])
  })
})

describe('O2', () => {
  it('uses the ideal gas law with the molar mass of O2', () => {
    // 1 kg of O2 is 31.25 mol. At 22.5 °C in 916 m³: 31.25 × 8.314 × 295.65 / 916 = 83.87 Pa = 0.6291 mmHg.
    near(mmHgPerKgO2({ freeVolumeM3: 916, temperatureC: 22.5 }), 0.6291, 0.0005)
    near(mmHgPerKgO2({ freeVolumeM3: 916, temperatureC: 22.5 }) / mmHgPerKg({ freeVolumeM3: 916, temperatureC: 22.5 }), 0.04401 / 0.031998, 1e-12)
  })

  it('reports the inspired O2 pressure, the quantity of the NASA range', () => {
    // Air at sea level: 20.95% of 760 mmHg is 159.2 mmHg in the dry gas, and 149.4 mmHg inspired.
    near(inspiredO2MmHg(0.2095 * 760, 760), 149.4, 0.05)
    near(cabinO2MmHg(inspiredO2MmHg(160, 760), 760), 160, 1e-9)
    assert.deepEqual(O2_SOURCE.range, O2_RANGE_MMHG)
    assert.equal(O2_SOURCE.startMmHg, 150)
  })

  it('stays level with the generator on, and the mean of the day is the middle of the range', () => {
    for (const settings of [station(), life(), life({ metabolic: 'exercise90' })]) {
      const pattern = dailyPattern(settings)
      assert.equal(pattern.o2Level, true)
      near(pattern.o2MmHg.reduce((sum, value) => sum + value, 0) / MINUTES_PER_DAY, 150, 1e-9)
      const start = patternAt(settings, 0)
      near(runCabin(settings, start, 0, MINUTES_PER_DAY).o2MmHg, start.o2MmHg, 1e-9)
      near(runCabin(settings, start, 0, 20 * MINUTES_PER_DAY).o2MmHg, start.o2MmHg, 1e-8)
      near(generatorKgPerDay(settings), settings.crew * dailyTotals(settings).o2Kg, 1e-12)
    }
    assert.equal(cabinForecast(station(), station(), 0, 50).hoursToO2(O2_RANGE_MMHG.low), null)
  })

  it('falls at the rate that the crew uses with the generator off', () => {
    const off = life({ ogaOn: false })
    const perKg = mmHgPerKgO2(off) * INSPIRED
    let before = 150
    runCabin(off, { co2MmHg: 2, o2MmHg: 150, bottledO2Kg: 0 }, 0, MINUTES_PER_DAY, (state, minute) => {
      if (minute === 0) return
      near(before - state.o2MmHg, defaultCrewKg(METABOLIC.hidh.o2KgPerMin, minute - 1) * perKg, 1e-10)
      before = state.o2MmHg
    })
    const day = runCabin(off, { co2MmHg: 2, o2MmHg: 150, bottledO2Kg: 0 }, 0, MINUTES_PER_DAY)
    near(150 - day.o2MmHg, 4 * dailyTotals(off).o2Kg * perKg, 1e-9)
    assert.equal(generatorKgPerDay(off), 0)
  })

  it('takes O2 from the bottles first, so the bottles delay the fall', () => {
    const nominal = life()
    const perDay = 4 * dailyTotals(nominal).o2Kg
    const bottles = life({ ogaOn: false, bottledO2Kg: 3 * perDay })
    // For 3 days the bottles give what the crew uses: the O2 does not move, and the bottles go down.
    const start: CabinState = { co2MmHg: 2, o2MmHg: 150, bottledO2Kg: bottles.bottledO2Kg }
    const oneDay = runCabin(bottles, start, 0, MINUTES_PER_DAY)
    near(oneDay.o2MmHg, 150, 1e-9)
    near(oneDay.bottledO2Kg, 2 * perDay, 1e-9)
    const threeDays = runCabin(bottles, start, 0, 3 * MINUTES_PER_DAY)
    near(threeDays.o2MmHg, 150, 1e-9)
    near(threeDays.bottledO2Kg, 0, 1e-9)
    // Then the O2 falls as with no bottles.
    const fourDays = runCabin(bottles, start, 0, 4 * MINUTES_PER_DAY)
    near(150 - fourDays.o2MmHg, perDay * mmHgPerKgO2(bottles) * INSPIRED, 1e-8)

    // In the forecast: the time to the low end of the range is 3 days longer with the bottles.
    const withNone = cabinForecast(nominal, life({ ogaOn: false }), 10, 10).hoursToO2(O2_RANGE_MMHG.low)!
    const withBottles = cabinForecast(nominal, bottles, 10, 10).hoursToO2(O2_RANGE_MMHG.low)!
    near(withBottles - withNone, 72, 1e-6)
    // The forecast shows what is left in the bottles.
    near(cabinForecast(nominal, bottles, 10, 11).now.bottledO2Kg, 2 * perDay, 1e-9)
    assert.equal(cabinForecast(nominal, bottles, 10, 9).now.bottledO2Kg, 0)
  })

  it('rises when the generator makes more than the crew uses', () => {
    const more = life({ ogaKgPerDay: OGA.maxKgPerDay })
    assert.equal(generatorKgPerDay(more), 9.25)
    assert.equal(OGA.maxKgPerDay, TRIP_LIMITS.ogaKgPerDay.max)
    const day = runCabin(more, { co2MmHg: 2, o2MmHg: 150, bottledO2Kg: 0 }, 0, MINUTES_PER_DAY)
    near(day.o2MmHg - 150, (9.25 - 4 * dailyTotals(more).o2Kg) * mmHgPerKgO2(more) * INSPIRED, 1e-8)
    assert.ok(cabinForecast(life(), more, 2, 2).hoursToO2(O2_RANGE_MMHG.high)! > 0)
  })

  it('builds the O2 loop closure from the numbers of ESA', () => {
    assert.equal(o2LoopClosure(life({ crew: 3 })), 0)
    // 3 persons: half of the CO2, and 1 mol of O2 for each mol of CO2. The handbook has 0.92 mol of CO2 for each mol of O2.
    near(o2LoopClosure(life({ crew: 3, sabatier: true })), SABATIER.co2Share * 0.92, 0.002)
    // One system serves 3 persons.
    near(o2LoopClosure(life({ crew: 4, sabatier: true })), (SABATIER.co2Share * 0.92 * 3) / 4, 0.002)
    near(o2LoopClosure(station({ sabatier: true })), (SABATIER.co2Share * 0.92 * 3) / 6, 0.002)
    // The reactor gets its hydrogen from the generator.
    assert.equal(o2LoopClosure(life({ crew: 3, sabatier: true, ogaOn: false, bottledO2Kg: 100 })), 0)
    const half = (3 * dailyTotals(life()).o2Kg) / 2
    near(o2LoopClosure(life({ crew: 3, sabatier: true, ogaKgPerDay: half })), 0.25, 1e-9)
    // The forecast gives the closure of the settings at the cursor.
    assert.equal(cabinForecast(life(), life({ sabatier: true }), 5, 4).o2LoopClosure, 0)
    near(cabinForecast(life(), life({ sabatier: true }), 5, 6).o2LoopClosure, (0.5 * 0.92 * 3) / 4, 0.002)
    assert.equal(cabinForecast(life(), life({ sabatier: false }), 5, 6).o2LoopClosure, 0)
  })
})

describe('cabin forecast', () => {
  const nominal = life()

  it('gives the series that the page needs', () => {
    const forecast = cabinForecast(nominal, life({ scrubber: 'one' }), 20, 23.4)
    assert.equal(forecast.pastCo2MmHg.length, HISTORY_STEPS)
    assert.equal(forecast.pastCo2MmHg[HISTORY_STEPS - 1], forecast.now.co2MmHg)
    assert.equal(forecast.chart.length, 72 * 12 + 1)
    assert.equal(forecast.chart[0].hour, -24)
    assert.equal(forecast.chart[forecast.chart.length - 1].hour, 48)
    const atNow = forecast.chart[24 * 12]
    assert.deepEqual(atNow, { hour: 0, co2MmHg: forecast.now.co2MmHg, o2MmHg: forecast.now.o2MmHg, activity: forecast.now.activity })
    assert.equal(forecast.nextCo2MmHg.length, 24 * 12 + 1)
    assert.equal(forecast.nextCo2MmHg[0], forecast.now.co2MmHg)
    assert.equal(forecast.nextCo2MmHg[12], forecast.chart[25 * 12].co2MmHg)
    // The activity is what the crew does as a group. 0.4 of a day is 09:36: the fourth person exercises.
    assert.equal(forecast.now.activity, 'exercise')
    assert.equal(cabinForecast(nominal, nominal, 0, 23 + 8.25 / 24).now.activity, 'exercise')
    assert.equal(cabinForecast(nominal, nominal, 0, 23.5).now.activity, 'nominal')
    assert.equal(cabinForecast(nominal, nominal, 0, 23 + 2 / 24).now.activity, 'sleep')
    // With 2 persons, nobody exercises at 09:36.
    assert.equal(cabinForecast(life({ crew: 2 }), life({ crew: 2 }), 0, 23.4).now.activity, 'nominal')
  })

  it('has the daily pattern of the nominal settings before the change', () => {
    const failed = life({ scrubber: 'off', ogaOn: false })
    for (const day of [0, 3.25, 7.999, 19.5]) {
      const forecast = cabinForecast(nominal, failed, 20, day)
      const expected = patternAt(nominal, Math.round(day * MINUTES_PER_DAY))
      near(forecast.now.co2MmHg, expected.co2MmHg, 1e-12)
      near(forecast.now.o2MmHg, expected.o2MmHg, 1e-12)
      near(forecast.dailyMeanCo2MmHg!, dailyPattern(nominal).meanCo2MmHg!, 1e-12)
    }
    // One day before the change, the chart shows the nominal day and then the failure.
    const forecast = cabinForecast(nominal, failed, 20, 19)
    const pattern = dailyPattern(nominal)
    for (const point of forecast.chart.filter((item) => item.hour <= 24)) {
      const minute = Math.round((19 * 24 + point.hour) * 60)
      near(point.co2MmHg, pattern.co2MmHg[minute % MINUTES_PER_DAY], 1e-12)
    }
    const last = forecast.chart[forecast.chart.length - 1]
    near(last.co2MmHg, direct(nominal, failed, 20, 21).co2MmHg, 1e-9)
    near(last.o2MmHg, direct(nominal, failed, 20, 21).o2MmHg, 1e-9)
    // The time to 3 mmHg counts from the cursor, so it is more than the 24 hours to the failure.
    assert.ok(cabinForecast(life({ crew: 2 }), life({ crew: 2, scrubber: 'off' }), 20, 19).hoursToCo2(3)! > 24)
  })

  it('agrees with a direct run of the model after the change', () => {
    const cases: [string, LifeSupport, number, number][] = [
      ['one bed, same day', life({ scrubber: 'one' }), 5.3, 5.31],
      ['one bed, 3 days', life({ scrubber: 'one' }), 5.3, 8.77],
      ['scrubber off, 2 days', life({ scrubber: 'off' }), 5.3, 7.5],
      ['more crew, 100 days', life({ crew: 7 }), 5.3, 105.6],
      ['generator off, 12 days', life({ ogaOn: false }), 5.3, 17.25],
      ['generator off with bottles, 40 days', life({ ogaOn: false, bottledO2Kg: 100 }), 5.3, 45.1],
      ['strong generator, 30 days', life({ ogaKgPerDay: 9.25 }), 5.3, 35.9],
      ['small cabin, scrubber off, 6 days', life({ freeVolumeM3: 9, scrubber: 'off' }), 5.3, 11.4],
    ]
    for (const [name, current, changedDay, day] of cases) {
      const forecast = cabinForecast(nominal, current, changedDay, day)
      const expected = direct(nominal, current, changedDay, day)
      assert.ok(Math.abs(forecast.now.co2MmHg - expected.co2MmHg) < 1e-6, `${name}: CO2 ${forecast.now.co2MmHg} and ${expected.co2MmHg}`)
      assert.ok(Math.abs(forecast.now.o2MmHg - expected.o2MmHg) < 1e-6, `${name}: O2 ${forecast.now.o2MmHg} and ${expected.o2MmHg}`)
      assert.ok(Math.abs(forecast.now.bottledO2Kg - expected.bottledO2Kg) < 1e-6, `${name}: bottles ${forecast.now.bottledO2Kg} and ${expected.bottledO2Kg}`)
    }
  })

  it('agrees with a direct run far after the change, where it jumps over days', () => {
    const cases: [string, LifeSupport, number][] = [
      ['one bed', life({ scrubber: 'one' }), 700.37],
      ['scrubber off', life({ scrubber: 'off' }), 300.2],
      ['scrubber off, large cabin', life({ scrubber: 'off', freeVolumeM3: 1500, crew: 1 }), 900.6],
      ['generator off', life({ ogaOn: false }), 400.9],
      ['generator off with bottles', life({ ogaOn: false, bottledO2Kg: 500 }), 250.45],
      ['generator off with bottles, later', life({ ogaOn: false, bottledO2Kg: 500 }), 600.45],
      ['weak generator', life({ ogaKgPerDay: 3.5 }), 500.1],
      ['strong generator', life({ ogaKgPerDay: 9.25 }), 800.8],
      ['strong generator, large cabin', life({ ogaKgPerDay: 4, freeVolumeM3: 1500 }), 1100.3],
    ]
    for (const [name, current, day] of cases) {
      const forecast = cabinForecast(nominal, current, 2.6, day)
      const expected = direct(nominal, current, 2.6, day)
      assert.ok(Math.abs(forecast.now.co2MmHg - expected.co2MmHg) < 1e-6, `${name}: CO2 ${forecast.now.co2MmHg} and ${expected.co2MmHg}`)
      assert.ok(Math.abs(forecast.now.o2MmHg - expected.o2MmHg) < 1e-6, `${name}: O2 ${forecast.now.o2MmHg} and ${expected.o2MmHg}`)
      assert.ok(Math.abs(forecast.now.bottledO2Kg - expected.bottledO2Kg) < 1e-6, `${name}: bottles ${forecast.now.bottledO2Kg} and ${expected.bottledO2Kg}`)
      // A cursor that moves back uses the same run.
      const back = cabinForecast(nominal, current, 2.6, day - 150.25)
      near(back.now.o2MmHg, direct(nominal, current, 2.6, day - 150.25).o2MmHg, 1e-6)
      near(back.now.co2MmHg, direct(nominal, current, 2.6, day - 150.25).co2MmHg, 1e-6)
    }
  })

  it('gives the past 7 days across the change', () => {
    const current = life({ scrubber: 'one' })
    const forecast = cabinForecast(nominal, current, 10, 12.5)
    const first = Math.round(12.5 * MINUTES_PER_DAY) - (HISTORY_STEPS - 1) * 5
    const pattern = dailyPattern(nominal)
    for (const index of [0, 500, 1294]) {
      // Before day 10: the nominal pattern.
      const minute = first + index * 5
      assert.ok(minute < 10 * MINUTES_PER_DAY)
      near(forecast.pastCo2MmHg[index], pattern.co2MmHg[minute % MINUTES_PER_DAY], 1e-12)
    }
    for (const index of [1295, 1500, 2015]) {
      const minute = first + index * 5
      near(forecast.pastCo2MmHg[index], direct(nominal, current, 10, minute / MINUTES_PER_DAY).co2MmHg, 1e-9)
    }
  })

  it('finds the hours to 3 mmHg of CO2 and to 145 mmHg of O2 as a direct run does', () => {
    const cases: [string, LifeSupport, number, number][] = [
      ['scrubber and generator off, at the change', life({ crew: 2, scrubber: 'off', ogaOn: false }), 6.5, 6.5],
      ['scrubber and generator off, 3 hours later', life({ crew: 2, scrubber: 'off', ogaOn: false }), 6.5, 6.625],
      ['one bed and bottles', life({ crew: 3, scrubber: 'one', ogaOn: false, bottledO2Kg: 20 }), 6.5, 6.52],
      ['station with 3 persons, CDRA off', station({ crew: 3, scrubber: 'off', ogaOn: false }), 6.5, 6.9],
    ]
    for (const [name, current, changedDay, day] of cases) {
      // The settings before the change: the same cabin with nothing wrong.
      const before = { ...current, scrubber: 'both' as const, ogaOn: true, bottledO2Kg: 0 }
      const forecast = cabinForecast(before, current, changedDay, day)
      const nowMinute = Math.round(day * MINUTES_PER_DAY)
      const start = direct(before, current, changedDay, day)
      const toCo2 = directHoursTo(current, start, nowMinute, (state) => state.co2MmHg, 3)
      const toO2 = directHoursTo(current, start, nowMinute, (state) => state.o2MmHg, 145)
      assert.notEqual(toCo2, null, name)
      assert.notEqual(toO2, null, name)
      near(forecast.hoursToCo2(3)!, toCo2!, 1e-6)
      near(forecast.hoursToO2(145)!, toO2!, 1e-6)
    }
  })

  it('gives the exact time for a straight rise, 0 at the target, and null out of reach', () => {
    // 2 persons, scrubber off, all at nominal work: the CO2 rises in a straight line.
    const calm = life({ crew: 2, schedule: ALL_NOMINAL })
    const off = life({ crew: 2, schedule: ALL_NOMINAL, scrubber: 'off', ogaOn: false })
    const forecast = cabinForecast(calm, off, 4, 4)
    const co2PerHour = 2 * METABOLIC.hidh.co2KgPerMin.nominal * 60 * mmHgPerKg(off)
    near(forecast.hoursToCo2(3)!, (3 - forecast.now.co2MmHg) / co2PerHour, 1e-9)
    const o2PerHour = 2 * METABOLIC.hidh.o2KgPerMin.nominal * 60 * mmHgPerKgO2(off) * INSPIRED
    near(forecast.hoursToO2(145)!, 5 / o2PerHour, 1e-9)
    near(forecast.hoursToO2(O2_SOURCE.mildHypoxiaMmHg)!, 23 / o2PerHour, 1e-9)
    assert.equal(forecast.hoursToCo2(forecast.now.co2MmHg), 0)
    assert.equal(forecast.hoursToO2(150), 0)
    // The CO2 only rises, and the O2 only falls.
    assert.equal(forecast.hoursToCo2(forecast.now.co2MmHg - 0.5), null)
    assert.equal(forecast.hoursToO2(155), null)
    // Nothing is wrong: the CO2 of this calm cabin stays at its balance.
    assert.equal(cabinForecast(calm, calm, 4, 4).hoursToCo2(3), null)
    // The look ahead ends after 30 days.
    const slow = life({ crew: 1, freeVolumeM3: 1500, schedule: ALL_NOMINAL, ogaOn: false })
    assert.equal(cabinForecast(slow, slow, 0, 0).hoursToO2(100), null)
    assert.ok(cabinForecast(slow, slow, 0, 0).hoursToO2(149)! < LOOK_AHEAD_DAYS * 24)
  })

  it('keeps each value finite and not below 0 at the limits of the settings', () => {
    const hard: LifeSupport[] = [
      life({ crew: 7, freeVolumeM3: 5, scrubber: 'off', ogaOn: false }),
      life({ crew: 7, freeVolumeM3: 5, scrubber: 'off', ogaKgPerDay: 9.25, metabolic: 'exercise90' }),
      life({ crew: 1, freeVolumeM3: 1500, scrubberUnits: 0, otherUnits: 0.01, ogaKgPerDay: 0, bottledO2Kg: 500 }),
      life({ crew: 0, freeVolumeM3: 0, temperatureC: NaN, totalPressureMmHg: NaN, scrubberUnits: NaN, otherUnits: NaN, ogaKgPerDay: NaN, bottledO2Kg: -5 }),
      life({ crew: 2.5, scrubberUnits: -3, otherUnits: -1 }),
      life({ schedule: { sleepStartHour: NaN, sleepHours: 99, exerciseStartHours: [NaN, 30], exerciseMinutes: -5 } }),
    ]
    for (const current of hard) {
      for (const [changedDay, day] of [[0, 0], [3.3, 1200], [50, 2], [NaN, NaN], [-4, -2.5]]) {
        const forecast = cabinForecast(nominal, current, changedDay, day)
        for (const value of [forecast.now.co2MmHg, forecast.now.o2MmHg, forecast.now.bottledO2Kg, forecast.o2LoopClosure, ...forecast.pastCo2MmHg, ...forecast.nextCo2MmHg]) {
          assert.ok(Number.isFinite(value) && value >= 0, `${value}`)
        }
        for (const point of forecast.chart) assert.ok(Number.isFinite(point.co2MmHg) && point.co2MmHg >= 0 && Number.isFinite(point.o2MmHg) && point.o2MmHg >= 0)
        assert.ok(forecast.pastCo2MmHg.length === HISTORY_STEPS && !forecast.pastCo2MmHg.includes(undefined as unknown as number))
        for (const hours of [forecast.hoursToCo2(3), forecast.hoursToO2(145), forecast.hoursToCo2(NaN)]) assert.ok(hours === null || (Number.isFinite(hours) && hours >= 0))
        assert.ok(forecast.dailyMeanCo2MmHg === null || Number.isFinite(forecast.dailyMeanCo2MmHg))
      }
    }
    // No partial pressure goes above the total pressure.
    const full = cabinForecast(nominal, hard[0], 0, 400)
    assert.equal(full.now.co2MmHg, 760)
    assert.equal(full.now.o2MmHg, 0)
    assert.equal(cabinForecast(nominal, hard[1], 0, 400).now.o2MmHg, 760 - 47)
  })

  it('is fast enough for a slider', () => {
    const current = life({ scrubber: 'one', ogaOn: false, bottledO2Kg: 40 })
    cabinForecast(nominal, current, 5, 5).hoursToCo2(3)
    const start = performance.now()
    const count = 200
    for (let index = 0; index < count; index++) {
      // The cursor moves, and then a setting moves.
      const forecast = index % 2 ? cabinForecast(nominal, current, 5, 5 + index * 3.7) : cabinForecast(nominal, life({ crew: 1 + (index % 7), scrubber: 'one' }), 5 + index, 6 + index)
      forecast.hoursToCo2(3)
      forecast.hoursToO2(145)
    }
    const each = (performance.now() - start) / count
    assert.ok(each < 25, `${each.toFixed(2)} ms for each call`)
  })
})
