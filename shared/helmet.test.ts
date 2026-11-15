// Tests of the helmet sensors. Run: npm test
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CALM_MMHG, JET, ROUTINES, SENSOR_IDS, calmHelmet, clearHelmet, endNotice, levelOf, seeNotice, risingSensors, sendNotice, sensorsAt, setSensor, startJet, startRoutine, stepHelmet } from './helmet.ts'

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
    const routine = ROUTINES.find((item) => item.id === 'mouth')!
    let state = startRoutine(calmHelmet(0.1), 'mouth')
    assert.deepEqual(risingSensors(state), SENSOR_IDS.filter((id) => routine.sensors.includes(id)))
    state = stepHelmet(state, 5)
    assert.equal(state.sensors.mouth.value, CALM_MMHG + 0.5)
    assert.equal(state.sensors.back.value, CALM_MMHG)
    for (let second = 0; second < 100; second++) state = stepHelmet(state, 1)
    assert.equal(state.sensors['mouth'].value, routine.target)
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
    let state = clearHelmet(setSensor(startRoutine(calmHelmet(1), 'all'), 'forehead', 6))
    assert.equal(state.routine, null)
    for (let second = 0; second < 10; second++) state = stepHelmet(state, 1)
    assert.ok(SENSOR_IDS.every((id) => state.sensors[id].value === CALM_MMHG))
  })

  it('sends an alert only while a sensor is above the red limit', () => {
    const calm = calmHelmet()
    assert.equal(sendNotice(calm, 'info'), calm)
    const red = setSensor(setSensor(calm, 'mouth', 4), 'neck', 2.6)
    assert.deepEqual(sendNotice(red, 'jet').notice, { kind: 'jet', sensors: ['mouth'], full: false })
    assert.equal(endNotice(sendNotice(red, 'info')).notice, null)
  })

  it('shows the alert on the full screen until the crew member answers it', () => {
    const red = setSensor(calmHelmet(), 'mouth', 4)
    const sent = sendNotice(red, 'info', true)
    assert.equal(sent.notice?.full, true)
    // The answer closes the full screen form. The alert stays in the page.
    assert.deepEqual(seeNotice(sent).notice, { kind: 'info', sensors: ['mouth'], full: false })
    assert.equal(seeNotice(red), red)
  })

  it('lowers the red sensors with the micro air jet in the jet time', () => {
    const calm = calmHelmet()
    assert.equal(startJet(calm), calm)
    let state = startJet(setSensor(setSensor(calm, 'back', 4.5), 'mouth', 2.6))
    assert.deepEqual(state.jet, { sensors: ['back'], done: false })
    // Only the red sensor moves, and it is at the middle after half of the time.
    state = stepHelmet(state, JET.seconds / 2)
    assert.equal(state.sensors.back.value, 2.95)
    assert.equal(state.sensors.mouth.value, 2.6)
    assert.equal(state.jet?.done, false)
    state = stepHelmet(state, JET.seconds / 2)
    assert.deepEqual(state.sensors.back, { value: JET.target, target: JET.target })
    assert.equal(state.jet?.done, true)
    // A new value from the simulator ends the state of the jet.
    assert.equal(setSensor(state, 'neck', 2).jet, null)
  })

  it('ends the alert when the micro air jet lowers the values', () => {
    let state = startJet(sendNotice(setSensor(calmHelmet(), 'back', 4.5), 'jet', true))
    assert.equal(state.notice?.kind, 'jet')
    state = stepHelmet(state, JET.seconds)
    assert.equal(state.notice, null)
  })

  it('ends the alert when no sensor is above the red limit', () => {
    const sent = sendNotice(setSensor(calmHelmet(), 'mouth', 4), 'info')
    assert.equal(setSensor(sent, 'back', 2).notice?.kind, 'info')
    assert.equal(setSensor(sent, 'mouth', 3).notice, null)
    // The value goes down step by step, and the alert ends when it reaches the limit.
    let state = clearHelmet(sent)
    state = stepHelmet(state, 1)
    assert.equal(state.notice?.kind, 'info')
    state = stepHelmet(state, 100)
    assert.equal(state.notice, null)
  })
})
