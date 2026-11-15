// The server of Nexxo. It keeps the state of the helmet sensors (helmet.ts), sends each change
// to all open pages, and serves the built web app.
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import express from 'express'
import { addHelmet } from './helmet.ts'

const port = Number(process.env.PORT ?? 3001)

const app = express()
app.use(express.json({ limit: '10kb' }))

// The helmet sensors: the state, the stream, and the control route.
addHelmet(app)

app.use('/api', (_request, response) => {
  response.status(404).json({ error: 'This address does not exist.' })
})

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
  console.log(`Nexxo listens on http://localhost:${port}.`)
})
