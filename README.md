# Nexxo

Nexxo is a health monitoring dashboard for astronauts on space missions.
It is our project for the NASA Space Apps challenge in [docs/challenge-description.md](docs/challenge-description.md).

## What the app does

- **Missions.** All data belongs to a mission. Each mission has its own address, so two devices can open the same mission.
- **Dashboard** (`/m/<mission>`). The home screen tells the crew member what to do now, with one clear action for each item. It has three views: Readiness (a score and the next action), Bridge (one very large value, black screen), and Companion (the app explains each value as a talk). Each detail screen is a page with its own address: Body, Cabin, Check-ups, Alerts, History, and Log. On a phone, a bar at the bottom opens the screens. A chip at the top right selects the crew member. A new alert covers the full screen until the crew member answers. An engineer can say "I am on it" for a cabin problem, and the other crew members then see who works on it.
- **Simulator** (`/m/<mission>/admin`). It controls the mission from a phone during a demo. One tap sets a value now (for example a cabin CO2 alert, or a fever for one crew member), sends a test alert to a role or a person, or asks a check-up. It also selects what the audience screen shows (the crew member, the view, the open screen), moves the clock, and resets the mission between two runs. A change on a phone updates the dashboard on another screen at once.
- **Check-ups.** When a value looks wrong, the app asks the crew member a question, for example "Do you have a headache?" when cabin CO2 is high.
- **Causes of a symptom.** When a crew member reports a symptom, the app looks in the cabin data and in the data of that crew member for values that agree with a known cause. For example, a headache report shows the cabin CO2 of the last hours and the sleep of the last nights. The app also tells if other crew members report the same symptom.
- **Crew patterns.** The app compares the crew members with each other. The same symptom in two crew members points to a shared cause. A change in one crew member only points to a personal cause. A change in the whole crew points to the cabin or the schedule.
- **Notifications by role.** Health notifications go to the crew member and to the medical officers. Cabin notifications go to the engineers, and alerts also go to the commander.
- **History.** The app records each action and each notification. The Log screen shows the whole mission. The History screen shows one crew member only: the values that this person entered, the symptoms that this person reported, the answers, the actions, the sentences to the assistant, and the notifications that this person got.
- **Assistant.** A bar at the bottom of the dashboard takes one sentence, typed or spoken, for example "how am I?", "I have a headache", "yes", "I am on it", or "open the cabin". The app answers in one or two short sentences and does the action. Fixed rules understand the sentence, so the assistant needs no network. If the insights are on and the server has a key, a language model understands the sentence and uses the same actions as tools.
- **Voice.** With the microphone on, the page listens all the time. A sentence that starts with "Nexxo" is a command. A small speech model turns the speech into text inside the page, so no audio leaves the device. The browser reads the answer aloud.
- **Insights from a language model (optional).** A model reads the data of the mission and writes a short insight with suggested actions. Each mission turns this on or off in the simulator.

## Languages

The app has English and Brazilian Portuguese. The switch is in the menu of the crew chip, on the first page, and in the simulator. The first language follows the browser.

- The English text is the key. A language file maps each English text to its translation. A text with no translation shows in English.
- Web: `t('Open the cabin')` and `tn(count, one, other)` in `web/src/i18n.ts`. The texts are in `web/src/locales/pt-BR/`, one file for each area.
- Server: `tx('The sensor reads {value}.', { value })` in `server/src/i18n.ts`. The server stores a text in a form that it can show in each language, and each response leaves the server in the language of the request (header `x-lang`). So one stored notification reads in English for one crew member and in Portuguese for the next. The texts are in `server/src/locales/pt-BR/`.
- Numbers follow the language: 38.7 in English, 38,7 in Portuguese.
- The assistant understands typed sentences in both languages. The voice listener understands English only, because its speech model is English-only.
- `GET /api/i18n/missing` lists the server texts that were shown in Portuguese with no translation. In the browser, `window.__i18nMissing` lists the same for the web app.

To add a language: add it to `LANGS` in both `i18n.ts` files, copy the `pt-BR` folders, and translate the values.

## Data

| Data | Source | In the app |
|---|---|---|
| Cabin CO2, temperature, humidity | Real record of the International Space Station during the NASA mission Rodent Research 6 (December 2017 to February 2018), from the [NASA Open Science Data Repository](https://visualization.osdr.nasa.gov/eda/) | Tag "NASA record" |
| Radiation dose for each day | The same record | Tag "NASA record" |
| The same values after the end of the record | The app replays the record from its start | Tag "NASA record, replayed" |
| Vitals of the crew | A model. NASA publishes no continuous vitals of single crew members. Open data for single persons exists only for lab samples of the private mission Inspiration4 ([OSD-575](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575)), and the app does not use it yet. The model uses numbers from NASA studies. | Tag "Model" |
| The 7-day average of CO2 and the mission total of the radiation dose | The server computes them each day from the NASA record | Tag "Computed" |
| Values that the simulator changed | The NASA record or the model, plus the change | Tag "Simulator" |
| Limits for the colors | NASA-STD-3001 and NASA technical briefs for the cabin, usual clinical ranges for the vitals | Panel "Data and limits" on the dashboard |

More facts about the data:

- `server/seed/osdr-rr-6.json` holds the record with the field names and units of NASA (`co2_iss` in ppm, `temperature_iss` in °C, `rh_iss` in %, `gcr` and `saa` in mGy for each day). Run `npm run fetch-osdr -w server` to download it again.
- The app stores CO2 in mmHg, because the NASA limits and the live station telemetry use mmHg. `server/src/dataset.ts` converts from ppm at a cabin pressure of 760 mmHg.
- The ids and units of the indicators follow [docs/health-indicator-map.md](docs/health-indicator-map.md). That document maps hazards, health problems, indicators, and their relations, with sources.
- The model of the vitals follows the cabin and the days before, with the relations in `server/src/relations.ts`. For example, high CO2 in the night gives less sleep, and less sleep gives a lower mood and more fatigue the next day. So a correlation in a chart shows this model. It does not show a discovery. A scenario of the simulator changes only the cause, and the model changes the effects.
- The app compares a crew member with a personal baseline: the mean of the 14 days that end 3 days before now.
- The crew members in the app do not exist. The app never shows data of real astronauts.
- The app is a prototype. It does not give medical advice.

## Insights from a language model

This part is off for each new mission. The check-ups, alerts, and notifications never depend on it.

1. Open the simulator of a mission.
2. In "Insights from a language model", turn the insights on.
3. Select a provider and a model.
4. Select "Ask for a new insight" on the dashboard or in the simulator.

| Provider | What you need |
|---|---|
| Claude (Anthropic API) | Set `ANTHROPIC_API_KEY` in the environment of the server. The default model is `claude-opus-5-5`. |
| Local model | A server with the "chat completions" API, for example [Ollama](https://ollama.com). The default address is `http://localhost:11434/v1`. From Docker, use `http://host.docker.internal:11434/v1`. |

Two more settings exist for each mission:

- **Ask when a status changes to alert.** The server asks one time in 12 mission hours at most.
- **Send the suggested actions as notifications.** Each action goes to the role that the model names. The title starts with "AI suggestion".

How it works in the code (`server/src/insights/`):

- `schema.ts` holds the shape of an insight and the instructions for the model.
- `index.ts` builds the data for the model, runs the request in the background, saves the result, and sends the notifications.
- `anthropic.ts` and `local.ts` are the two providers. To add a provider, write one function of the type `Provider` and add it to `PROVIDERS` in `index.ts`.
- The model gets readings, limits, symptoms, check-ups, and status changes. It also gets one value for each of the last 7 days, the personal baselines, the table of relations, and the crew patterns. It does not get the simulator settings.
- The app sends the data of the mission to the provider. With the Claude provider, the data leaves your machine.

## Parts

| Folder | Content |
|---|---|
| `web/` | The React app (Vite, TypeScript, Recharts for charts). `src/homes/` has the three home views, `src/sheets/` has the detail screens, and `src/pages/Admin.tsx` is the simulator. |
| `server/` | The Node server (Express, TypeScript). It keeps data in a SQLite file. |
| `server/seed/` | The NASA record that each mission starts with. |
| `docs/` | The challenge text and our research. |

Where to change things in the server:

| File | Content |
|---|---|
| `server/src/indicators.ts` | The indicators, their limits, and their sources. |
| `server/src/dataset.ts` | The NASA record and the model for the vitals. |
| `server/src/relations.ts` | The relations between indicators, and the numbers of the model for the vitals. |
| `server/src/rules.ts` | The rules that start a check-up. |
| `server/src/causes.ts` | The cause checks, the causes of each symptom, and the personal baseline. |
| `server/src/crew.ts` | The patterns across the crew. |
| `server/src/monitor.ts` | Status changes, notifications by role, and the history. |
| `server/src/simulator.ts` | Missions, the clock, and the scenarios. |
| `server/src/simulate.ts` | The demo functions of the simulator: set a value now, test alerts, test check-ups, reset, and the audience screen. |
| `server/src/claims.ts` | Who said "I am on it" for which problem. |
| `server/src/actions.ts` | The actions of a crew member (report a symptom, answer a check-up, and so on). The routes and the assistant both use them. |
| `server/src/history.ts` | The personal history of one crew member. |
| `server/src/assistant.ts` | The assistant: the fixed rules for a sentence, and the optional language model with tools. |
| `server/src/insights/` | The optional insights from a language model. |
| `server/src/index.ts` | The API routes. |

The server uses the SQLite module that is built into Node 22, so no native package is necessary.
Node runs the TypeScript files of the server directly, so the server has no build step.

## Run the app with Docker

You need only Docker.

1. Run `docker compose up --build`.
2. Open http://localhost:3001.

Docker keeps the SQLite file in the volume `nexxo-data`.

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
The server writes the SQLite file to `server/data/nexxo.db`.
If the tables in the code change, delete that file. The server creates it again.

## Deploy

The app runs at https://nexxo.vncs.dev on the VPS `hostinger`. The address is open, with no login. Each person who knows the address can use the simulator and delete missions.

To send a new version, you need SSH access to the VPS over Tailscale.

1. Stage or commit your changes in git. The script sends only the files that git knows.
2. Run `./deploy/deploy.sh`.

The script copies the files to `/root/apps/nexxo`, builds the Docker image there, and starts it on the loopback port 8085. The data stays in the Docker volume `nexxo_nexxo-data`.

| File | Content |
|---|---|
| `deploy/compose.yml` | The Docker Compose project that runs on the VPS. |
| `deploy/deploy.sh` | The script that sends and starts a new version. |
| `deploy/nexxo.nix` | A copy of the Caddy settings in `/etc/nixos/nexxo.nix` on the VPS. |

To use the Claude provider for the insights on the VPS, write `ANTHROPIC_API_KEY=...` into `/root/apps/nexxo/.env` and run the script again.

## Control a mission from a phone

1. Connect the phone and the computer to the same network.
2. Start the app. Vite prints a "Network" address, for example `http://192.168.1.20:5173`.
3. Open the dashboard of a mission on the computer.
4. Open the same address on the phone, select the same mission, and open "Simulator".
5. Tap a tile under "Trigger now", for example "Cabin CO2 alert". The dashboard shows the full-screen alert at once.
6. To run the demo again, tap "Clear alerts" two times.

Notes:

- A value that the simulator sets has the tag "Simulator" on each screen. A test alert and a test check-up start with "TEST".
- The same alert comes only one time in 48 mission hours. "Clear alerts" removes this limit for the next run.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Starts the server and the React app with live reload. |
| `npm run typecheck` | Checks the types of the server and builds the React app. |
| `npm run lint` | Runs the linter on the React app. |
| `npm run build` | Builds the React app into `web/dist`. |
| `npm start` | Starts the server. It also serves `web/dist` if that folder exists. |
| `npm run fetch-osdr -w server` | Downloads the NASA record again. |

## Settings

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3001` | The port of the server. |
| `DATABASE_PATH` | `data/nexxo.db` | The path of the SQLite file. |
| `WEB_DIST` | `../web/dist` | The folder with the built React app. |
| `ANTHROPIC_API_KEY` | none | The key for the Claude provider of the insights. |
| `LOCAL_LLM_BASE_URL` | `http://localhost:11434/v1` | The default address of the local model server. |
| `LOCAL_LLM_API_KEY` | none | A key for the local model server, if it needs one. |
