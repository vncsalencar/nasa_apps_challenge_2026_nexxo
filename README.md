# Nexxo

Nexxo is health monitoring software for astronauts. It is a project for the NASA Space Apps Challenge 2026, challenge "Create Health Monitoring Software for Astronauts on Space Missions".

The app shows CO2 sensors inside a space suit helmet. It has two pages:

| Page | Address | For whom |
|---|---|---|
| Helmet page | `/` | The audience, or the crew member. It shows the helmet, the sensors, and the alerts. |
| Simulator page | `/simulator` | The presenter. It sets the sensor values and sends the alerts. No page links to it: type the address. |

The sensors and their values are a simulation. No real suit data is behind them.

## The helmet page

The page shows a space suit helmet with four CO2 sensors inside it:

| Sensor | Place |
|---|---|
| Forehead | Front zone, near the forehead. |
| Mouth | Front zone, in front of the mouth. |
| Neck | Front zone, below the mouth, near the neck ring. |
| Back of the head | Back zone, behind the head. |

Each sensor has a light, a label with its value in mmHg, and a colored area on the helmet, so you see where the CO2 is: at the front or at the back, high or low.

| Color | CO2 partial pressure |
|---|---|
| Green | below 2.3 mmHg |
| Yellow | 2.3 to 3.0 mmHg |
| Red | above 3.0 mmHg |

A switch selects the view:

- **3D:** the model itself. You can turn it with a drag. The page starts with this view on each device that can draw 3D graphics.
- **2D:** two still pictures, from the front and from the back. They do not move. The page starts with this view when the device cannot draw 3D graphics, or when the person selected 2D before.

The places of the sensors in the pictures come from the 3D model, so both views show a sensor at the same place of the helmet.

On a wide screen, the information is at the right of the helmet. On a phone, it is below the helmet. The information has these parts:

- A status line that names the sensors where the CO2 rises or is high.
- One row for each sensor, with its value, its place, and what to do.
- The color key, and a reference line with the NASA documents.
- A language switch (English and Brazilian Portuguese) in the top bar.

## The simulator page

The simulator page controls the helmet page. Each control has an effect at once on every open helmet page.

| Section | What it does |
|---|---|
| Scenarios | Three ready states for a demonstration or a video: "All normal", "CO2 pocket at the mouth", and "Critical alert behind the head" (4.5 mmHg). |
| Alert to the crew | Sends an alert to the helmet page while a sensor is red. See below. |
| Routines | A routine raises some sensors step by step: "Mouth and neck rise", "Forehead rises", "Back of the head rises", and "All sensors rise". "Back to calm" moves all sensors back step by step. |
| Sensors | A slider for each sensor sets its value at once. |

The language switch of this page is at the bottom.

## Alerts

When a sensor is above the red limit (3.0 mmHg), the simulator page tells the presenter that a manual action can be advisable. The presenter can then send an alert to the helmet page. The alert has two kinds:

| Kind | What the helmet page shows |
|---|---|
| Information only | The sensors that passed the limit, and that a manual action can be necessary. |
| Advice of a micro air jet | The sensors that passed the limit, and the advice to start a micro air jet at these places to lower the CO2. |

The presenter also selects how the helmet page shows the alert:

- **In the page:** a card above the status line.
- **Full screen:** the alert covers the page with one color, the values of the sensors, and the answer "I saw it". The answer, or the Escape key, closes the full screen form only on the screen of that person, so one person does not close it for all. The alert then stays in the page. A button of the simulator page closes the full screen form on all screens.

The presenter can remove the alert. The alert also ends by itself when no sensor is above the limit.

## The micro air jet

While a sensor is red, the simulator page has a button "Start the micro air jet". Only the simulator page can start the jet, so all helmet pages show the same values. The helmet page shows only the advice.

The jet lowers each red sensor to 1.4 mmHg in 3 seconds. The status line says that the jet is on. After it, the status line says that the flow is stable and that all sensors are below the NASA limit of 3.0 mmHg.

## Assumptions

Read these before you use a number of this app.

- **The color limits are those of a cabin.** Yellow starts at 2.3 mmHg, where crews on the station first report symptoms (Law and Alexander). Red starts above 3.0 mmHg, the NASA limit for the 1-hour average in a cabin (NASA-STD-3001 Volume 2 [V2 6004], quoted in OCHMO-TB-004, page 6). We have no checked limit for the air inside a helmet.
- **The text of a red sensor** says "Risk of headache and of loss of focus". The sources report headaches from 2.8 mmHg (OCHMO-TB-004) and slower thinking from 2.7 mmHg (Law and Alexander). These values are also for a cabin.
- **The micro air jet is an idea of this app:** a jet with a small flow, because it is inside the helmet, near the face. No real suit function is behind it. The target of 1.4 mmHg and the time of 3 seconds are our choice for the demonstration, not a model of a real jet.
- **The calm value of 1.2 mmHg, the routines, and the scenarios are our choice.**
- **The steps in the rows** ("Check the air flow of the suit", and so on) are ideas of this app, not medical advice.

## The 3D model

The helmet is the helmet of the space suit that Neil Armstrong used on Apollo 11. The model is the 3D scan of the Smithsonian Institution, National Air and Space Museum (https://3d.si.edu/object/3d/armstrong-space-suit:d8c63ba6-4ebc-11ea-b77f-2e728ce88125). The page draws the scan as it is and cuts it below the helmet.

| File | Content |
|---|---|
| `web/public/models/armstrong.bin` | The model, a glTF binary (.glb). The name ends with `.bin` because Cloudflare keeps a copy of `.bin` files by default, and not of `.glb` files. |
| `web/public/models/helmet-front.webp`, `helmet-back.webp` | The two pictures of the 2D view. They are stills of the same model. |
| `web/public/draco/` | The decoder of the 3D library for this model. |

The server lets Cloudflare and the browser keep the files in `models/`, `draco/`, and `assets/` for 4 hours. So if you change the model or a picture, give the file a new name.

In development, `window.__helmetShot(1100)` in the 3D view gives the two pictures and the sensor places again.

**Usage terms of the model:** the scene file of the Smithsonian says "(c) Smithsonian Institution. All rights reserved." We did not find a CC0 mark for this model. The Smithsonian permits personal, educational, and other non-commercial use of such content, with a credit. So this project uses the model only for this non-commercial hackathon entry and shows the credit on the page. Do not use the model for a commercial purpose.

## Parts

| Part | Tools | Folder |
|---|---|---|
| The rules | Plain TypeScript with no imports | `shared/` |
| Server | Node 22 with Express. Node runs the TypeScript files directly. | `server/` |
| Web app | React 19, TypeScript, Vite, three.js for the 3D view | `web/` |

| File | Content |
|---|---|
| `shared/helmet.ts` | The sensors, the color limits, the routines, the alert, and the micro air jet. |
| `server/src/helmet.ts` | The state of the sensors, the stream to the pages, and the control route. |
| `server/src/index.ts` | Starts the server and serves the built web app. |
| `web/src/pages/Helmet.tsx` | The helmet page. |
| `web/src/pages/Simulator.tsx` | The simulator page. |
| `web/src/helmet/Helmet3D.tsx` | The 3D view. |
| `web/src/helmet/HelmetControls.tsx` | The controls of the simulator page. |
| `web/src/helmet/NoticeOverlay.tsx` | The full screen alert. |
| `web/src/helmet/useHelmet.ts` | The live state of the sensors in a page, and the text of the status line. |
| `web/src/i18n.ts`, `web/src/locales/` | The translation. The English text is the key. |

The server keeps the state in memory. A restart starts with all sensors at the calm value.

The server sends each change to all open pages through one stream (`GET /api/helmet/stream`, server-sent events). `GET /api/helmet` shows the state. `POST /api/helmet` takes a JSON object with one or more of these fields:

| Field | Meaning |
|---|---|
| `reset: true` | All sensors go to the calm value at once. |
| `clear: true` | All sensors go to the calm value step by step. |
| `rate` | How fast a value moves, in mmHg for each second: 0.03, 0.08, or 0.25. |
| `routine` | Starts a routine: `mouth`, `forehead`, `back`, or `all`. |
| `set: { id, mmHg }` | Sets one sensor (`forehead`, `mouth`, `neck`, `back`) to a value from 0 to 8. |
| `jet: true` | Starts the micro air jet at the red sensors. |
| `notice` | `info` or `jet` sends an alert. `null` removes it. With `full: true`, the alert shows on the full screen. |
| `seen: true` | Closes the full screen form of the alert on all screens. |

The files `docs/health-indicator-map.md` and `docs/data-correlations.md` are background research from an earlier, wider version of the project. They describe features that this version does not have.

The project has no automated tests.

## Run the app with Docker

You need only Docker.

1. Run `docker compose up --build`.
2. Open http://localhost:3001.
3. For the simulator, open http://localhost:3001/simulator.

## Develop with Docker

This mode reloads the app when you change a file.

1. Run `docker compose --profile dev up dev`.
2. Open http://localhost:5173.

## Develop with Node on your machine

You need Node 22.18 or newer.
If you use Nix, run `nix develop` (or `direnv allow`) to get it.

1. Run `npm install`.
2. Run `npm run dev`.
3. Open http://localhost:5173.

Vite serves the React app on port 5173 and forwards `/api` to the server on port 3001.

## Use the simulator from a phone

1. Connect the phone and the computer to the same network.
2. Start the app. Vite prints a "Network" address, for example `http://192.168.1.20:5173`.
3. Open that address on the screen for the audience. This is the helmet page.
4. Open the same address with `/simulator` at the end on the phone.
5. Press a scenario or move a slider. The helmet page follows at once.

## Deploy

The app runs at https://nexxo.vncs.dev on the VPS `hostinger`. The address is open, with no login. Each person who knows the address can open `/simulator` and change what all helmet pages show.

To send a new version, you need SSH access to the VPS over Tailscale.

1. Stage or commit your changes in git. The script sends only the files that git knows.
2. Run `./deploy/deploy.sh`.

The script copies the files to `/root/apps/nexxo`, builds the Docker image there, and starts it on the loopback port 8085.

| File | Content |
|---|---|
| `deploy/compose.yml` | The Docker Compose project that runs on the VPS. |
| `deploy/deploy.sh` | The script that sends and starts a new version. |
| `deploy/nexxo.nix` | A copy of the Caddy settings in `/etc/nixos/nexxo.nix` on the VPS. |

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Starts the server and the React app with live reload. |
| `npm run typecheck` | Checks the types of the server and builds the React app. |
| `npm run lint` | Runs the linter on the React app. |
| `npm run build` | Builds the React app into `web/dist`. |
| `npm start` | Starts the server. It also serves `web/dist` if that folder exists. |

## Settings

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3001` | The port of the server. |
| `WEB_DIST` | `../web/dist` | The folder with the built React app. |

## Sources

| Short name | Document |
|---|---|
| OCHMO-TB-004 | NASA Office of the Chief Health and Medical Officer, technical brief "Carbon Dioxide (CO2)", revision D. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf |
| NASA-STD-3001 | NASA Space Flight Human-System Standard, Volume 2, requirement [V2 6004]. We read it as quoted in OCHMO-TB-004, page 6. |
| Law and Alexander | "CO2 on the International Space Station: An Operations Update". https://ntrs.nasa.gov/citations/20150019624 |
| Armstrong space suit | Smithsonian Institution, National Air and Space Museum, 3D scan. https://3d.si.edu/object/3d/armstrong-space-suit:d8c63ba6-4ebc-11ea-b77f-2e728ce88125 |

This app is a prototype for a hackathon. It is not a medical device.
