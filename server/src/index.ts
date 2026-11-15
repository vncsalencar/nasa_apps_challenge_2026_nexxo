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
  // The model, the pictures, the 3D decoder, and the built files of the app can stay 4 hours in
  // the cache of Cloudflare and of the browser, so the server does not send the large model to
  // each person. The built files have a new name with each change. If the model or a picture
  // changes, give the file a new name.
  const LONG = /^\/(models|draco|assets)\//
  app.use(
    express.static(webDist, {
      setHeaders: (response) => {
        if (LONG.test(response.req.path)) response.setHeader('cache-control', 'public, max-age=14400')
      },
    }),
  )
  app.use((_request, response) => {
    response.sendFile(resolve(webDist, 'index.html'))
  })
}

app.listen(port, () => {
  console.log(`Nexxo listens on http://localhost:${port}.`)
})
