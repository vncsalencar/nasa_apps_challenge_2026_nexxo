// The helmet sensors on the server: one state for all screens, its own stream, and its own
// control route. It is apart from the simulator engine of the other two pages.
import type { Express, Response } from 'express'
import { NOTICE_KINDS, RATES, ROUTINES, SENSOR_IDS, VALUE_LIMITS, calmHelmet, clearHelmet, endNotice, seeNotice, sendNotice, setSensor, startJet, startRoutine, stepHelmet, type HelmetState, type NoticeKind } from '../../shared/helmet.ts'

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

// One request of the simulator page. Returns the new state, or an error text.
export function changeHelmet(state: HelmetState, body: unknown): HelmetState | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Send a JSON object.' }
  const input = body as Record<string, unknown>
  let next = state
  if (input.reset === true) next = calmHelmet(next.rate)
  if (input.clear === true) next = clearHelmet(next)
  if ('rate' in input) {
    if (!RATES.includes(input.rate as number)) return { error: `rate must be one of ${RATES.join(', ')}.` }
    next = { ...next, rate: input.rate as number }
  }
  if ('routine' in input) {
    if (!ROUTINES.some((routine) => routine.id === input.routine)) return { error: `routine must be one of ${ROUTINES.map((routine) => routine.id).join(', ')}.` }
    next = startRoutine(next, input.routine as string)
  }
  if ('set' in input) {
    const set = input.set as { id?: unknown; mmHg?: unknown } | null
    if (typeof set !== 'object' || set === null || !SENSOR_IDS.includes(set.id as string) || !isNumber(set.mmHg)) {
      return { error: `set must be { id, mmHg } with id one of ${SENSOR_IDS.join(', ')} and mmHg from ${VALUE_LIMITS.min} to ${VALUE_LIMITS.max}.` }
    }
    next = setSensor(next, set.id as string, set.mmHg)
  }
  // jet: true starts the micro air jet at the sensors above the red limit.
  if (input.jet === true) {
    const started = startJet(next)
    if (started === next) return { error: 'No sensor is above the red limit, so the micro air jet has nothing to lower.' }
    next = started
  }
  // notice: a kind sends an alert to the helmet page, and null removes the alert.
  // full: true shows this alert on the full screen. seen: true closes the full screen form.
  if ('notice' in input) {
    if (input.notice === null) {
      next = endNotice(next)
    } else {
      if (!NOTICE_KINDS.includes(input.notice as NoticeKind)) return { error: `notice must be null or one of ${NOTICE_KINDS.join(', ')}.` }
      if ('full' in input && typeof input.full !== 'boolean') return { error: 'full must be true or false.' }
      const sent = sendNotice(next, input.notice as NoticeKind, input.full === true)
      if (sent === next) return { error: 'No sensor is above the red limit, so there is no alert to send.' }
      next = sent
    }
  }
  if (input.seen === true) next = seeNotice(next)
  return next
}

export function addHelmet(app: Express) {
  let state = calmHelmet()
  const pages = new Set<Response>()
  const tell = () => {
    const line = `data: ${JSON.stringify(state)}\n\n`
    for (const page of pages) page.write(line)
  }

  app.get('/api/helmet/stream', (request, response) => {
    response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' })
    response.write(`data: ${JSON.stringify(state)}\n\n`)
    pages.add(response)
    request.on('close', () => pages.delete(response))
  })
  app.get('/api/helmet', (_request, response) => {
    response.json(state)
  })
  app.post('/api/helmet', (request, response) => {
    const result = changeHelmet(state, request.body)
    if ('error' in result) {
      response.status(400).json(result)
      return
    }
    state = result
    tell()
    response.json(state)
  })

  // The values move to their targets four times each second, so a change looks smooth.
  const TICK_MS = 250
  setInterval(() => {
    const next = stepHelmet(state, TICK_MS / 1000)
    if (next !== state) {
      state = next
      tell()
    }
  }, TICK_MS)
  setInterval(() => {
    for (const page of pages) page.write(': still here\n\n')
  }, 20_000)
}
