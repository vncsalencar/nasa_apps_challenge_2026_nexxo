// The server of Nexxo. It runs the simulator (engine.ts) for the CO2 page and the trip page,
// sends each change to all open pages, and serves the built web app.
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import express, { type Response } from 'express'
import { TRIP_SPEEDS } from '../../shared/trip/types.ts'
import { HOLD_HOURS, PPM_LIMITS, SPEEDS, createEngine, type Message } from './engine.ts'
import { addHelmet } from './helmet.ts'
import { loadRecord } from './record.ts'

const port = Number(process.env.PORT ?? 3001)
const record = loadRecord()
const engine = createEngine(record)

// What does not change while the server runs: the facts of the record and the limits of the controls.
const about = {
  source: record.source,
  milestones: record.milestones,
  startTime: new Date(record.startMs).toISOString(),
  steps: record.ppm.length,
  yearShift: record.yearShift,
  hourly: record.hourly,
  speeds: SPEEDS,
  holdHours: HOLD_HOURS,
  ppmLimits: PPM_LIMITS,
  // How many mission days the clock of the trip can move each second.
  tripSpeeds: TRIP_SPEEDS,
}

// The open pages. Each one holds a connection that the server writes events to.
const pages = new Set<Response>()
const write = (page: Response, message: Message | { type: 'about'; about: typeof about }) => page.write(`data: ${JSON.stringify(message)}\n\n`)
const tell = (messages: Message[]) => {
  for (const message of messages) for (const page of pages) write(page, message)
}

const app = express()
app.use(express.json({ limit: '10kb' }))

// Server-sent events: one long answer that the server adds lines to.
app.get('/api/stream', (request, response) => {
  response.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    // Tells a proxy in front of the server to pass each line at once.
    'x-accel-buffering': 'no',
  })
  write(response, { type: 'about', about })
  write(response, engine.full())
  pages.add(response)
  request.on('close', () => pages.delete(response))
})

// The same data as one plain answer, for a check by hand: curl localhost:3001/api/state
app.get('/api/state', (_request, response) => {
  response.json({ about, ...engine.full() })
})

app.post('/api/control', (request, response) => {
  const result = engine.control(request.body)
  if (!Array.isArray(result)) {
    response.status(400).json(result)
    return
  }
  tell(result)
  // The answer holds the settings of the two groups after the request.
  response.json(engine.settings())
})

// The helmet page has its own state, stream, and control route.
addHelmet(app)

app.use('/api', (_request, response) => {
  response.status(404).json({ error: 'This address does not exist.' })
})

// The clocks of the simulator: the CO2 clock and the trip clock.
const TICK_MS = 1000
let lastTick = Date.now()
setInterval(() => {
  const now = Date.now()
  // A long stop of the process must not make one very large step.
  const messages = engine.tick(Math.min((now - lastTick) / 1000, 5))
  lastTick = now
  tell(messages)
}, TICK_MS)
// A line with no data each 20 seconds keeps the connection open through a proxy.
setInterval(() => {
  for (const page of pages) page.write(': still here\n\n')
}, 20_000)

// In production, the server also sends the built web app. Each address without a file gets
// the app, so a person can type /simulator in the browser.
const webDist = process.env.WEB_DIST ?? resolve(import.meta.dirname, '../../web/dist')
if (existsSync(webDist)) {
  app.use(express.static(webDist))
  app.use((_request, response) => {
    response.sendFile(resolve(webDist, 'index.html'))
  })
}

app.listen(port, () => {
  console.log(`Nexxo listens on http://localhost:${port}. Record: ${record.source.mission}, ${record.ppm.length} values.`)
})
