// Tests of the helmet sensors. Run: npm test
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CALM_MMHG, ROUTINES, SENSOR_IDS, calmHelmet, clearHelmet, levelOf, risingSensors, sensorsAt, setSensor, startRoutine, stepHelmet } from './helmet.ts'

describe('helmet sensors', () => {
  it('gives each sensor a color by its value', () => {
    assert.equal(levelOf(1.2), 'normal')
    assert.equal(levelOf(2.29), 'normal')
    assert.equal(levelOf(2.3), 'caution')
    assert.equal(levelOf(3.0), 'caution')
    assert.equal(levelOf(3.01), 'alert')
  })

  it('starts calm, with no sensor that rises', () => {
    const state = calmHelmet()
    assert.deepEqual(Object.keys(state.sensors), SENSOR_IDS)
    assert.deepEqual(risingSensors(state), [])
    assert.equal(sensorsAt(state, 'normal').length, SENSOR_IDS.length)
    // A calm helmet does not change.
    assert.equal(stepHelmet(state, 10), state)
  })

  it('raises only the sensors of a routine, step by step, up to the target', () => {
    const routine = ROUTINES.find((item) => item.id === 'top-right')!
    let state = startRoutine(calmHelmet(0.1), 'top-right')
    assert.deepEqual(risingSensors(state), SENSOR_IDS.filter((id) => routine.sensors.includes(id)))
    state = stepHelmet(state, 5)
    assert.equal(state.sensors['top-right'].value, CALM_MMHG + 0.5)
    assert.equal(state.sensors.left.value, CALM_MMHG)
    for (let second = 0; second < 100; second++) state = stepHelmet(state, 1)
    assert.equal(state.sensors['top-right'].value, routine.target)
    assert.deepEqual(risingSensors(state), [])
    assert.deepEqual(sensorsAt(state, 'alert'), SENSOR_IDS.filter((id) => routine.sensors.includes(id)))
  })

  it('sets one sensor at once and keeps the value', () => {
    let state = setSensor(calmHelmet(), 'mouth', 3.5)
    assert.equal(state.sensors.mouth.value, 3.5)
    state = stepHelmet(state, 60)
    assert.equal(state.sensors.mouth.value, 3.5)
    assert.equal(setSensor(state, 'mouth', 99).sensors.mouth.value, 8)
    assert.equal(setSensor(state, 'nothing', 3), state)
  })

  it('goes back to the calm value', () => {
    let state = clearHelmet(setSensor(startRoutine(calmHelmet(1), 'all'), 'top', 6))
    assert.equal(state.routine, null)
    for (let second = 0; second < 10; second++) state = stepHelmet(state, 1)
    assert.ok(SENSOR_IDS.every((id) => state.sensors[id].value === CALM_MMHG))
  })
})
