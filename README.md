# Nexxo

Nexxo is a CO2 exposure panel for astronauts. It is a project for the NASA Space Apps Challenge 2026, challenge "Create Health Monitoring Software for Astronauts on Space Missions".

CO2 builds up in a closed cabin. On the International Space Station, crews report headaches, fatigue, and slower work at CO2 values that are legal on Earth. Nexxo shows the cabin CO2, what NASA documents report at that value, and how much time is left before a limit.

## What the app does

The app has two pages.

**The dashboard** (the first page, `/`) has one panel, "CO2 exposure", with four parts:

| Part | What it shows |
|---|---|
| Cabin CO2 now | The CO2 partial pressure in mmHg and in ppm, and the 1-hour average against the NASA limit of 3 mmHg. |
| Body map | A body figure (2D or 3D). A region gets color when the CO2 value is in a symptom band that a NASA document reports. A tooltip gives the band and its source. |
| Headache risk | The averages of 1 hour, 24 hours, and 7 days. Each average has its own reference. The gauge shows the odds of a headache, compared with the odds at a 7-day average of 2.5 mmHg. |
| Time to limit | A countdown to 3.0 mmHg and to the start of each symptom band, from a model of the cabin. A chart shows the last 24 hours and the next 24 hours. |

**The simulator** (`/simulator`) is for the presenter. No page links to it: type the address. It is made for a phone. Each control has an effect at once on every open dashboard.

| Control | Effect |
|---|---|
| Mode | "Real data replay" plays the real CO2 record. "Simulated" lets you set the value, and the clock then moves it with the cabin model. |
| Cabin CO2 | A slider in ppm, with the value in mmHg next to it. Buttons for steps and for the start of each symptom band. |
| "As if the cabin had this value for the last" | Fills the last 1 hour, 24 hours, or 7 days with the value now, so the averages move at once. |
| Crew count | 1 to 7 persons. |
| CDRA status | Both beds, one bed, or off. The CDRA is the Carbon Dioxide Removal Assembly of the station. |
| Clock | Play, pause, four speeds, and a slider for the place in the real record. |
| Settings of the model | The total cabin pressure and the numbers of the cabin model. Each one shows its source. |

The dashboard always shows the mode. Real data has the green label "REAL DATA REPLAY · RR-9". Simulated data has the blue label "SIMULATED", a tag on the value, and its own line color in the chart.

The pages are in English and in Brazilian Portuguese. The first language comes from the browser.

## Data

**Source:** NASA Environmental Data Application (EDA), https://visualization.osdr.nasa.gov/eda/, mission Rodent Research-9 (RR-9), field `co2_iss`: the cabin CO2 of the International Space Station in ppm, one value each 5 minutes.

Data and visualizations are courtesy of the Environmental Data Application (EDA) (https://visualization.osdr.nasa.gov/eda/).

The EDA has no download route for a program. The script `server/scripts/fetch-eda.ts` reads the data block inside the EDA page and writes `server/seed/eda-rr-9-co2.json`. The app reads this file, so it needs no network when it runs.

**Flags of the RR-9 record:**

| Flag | What we do |
|---|---|
| The EDA dates the RR-9 telemetry in 2018. The mission flew in 2017: SpaceX CRS-12 launched on 14 August 2017. The EDA radiation data of RR-9 is dated 2017. | The script moves the telemetry dates by −1 year. The app shows 2017. |
| The data before the transfer of the animals to the station is launch and transit. It falls to 400 ppm. | The script keeps only the window from "Animal transfer to ISS" to "Undock": 18 August 2017, 15:43 UTC, to 16 September 2017, 08:43 UTC. This is 8,269 values. |
| One 5-minute step of the window has no value. | The step keeps the value before it. |
| The source gives times with no time zone. | We read them as UTC. |

The window has a mean of 3,015 ppm and a highest value of 4,051 ppm.

## Unit conversion

The EDA gives ppm. The NASA limits use the partial pressure in mmHg.

```
ppCO2 in mmHg = ppm × total cabin pressure in mmHg ÷ 1,000,000
```

The default total pressure is 760 mmHg. You can change it on the simulator page. At 760 mmHg, 1 mmHg is about 1,316 ppm. The mean of the record, 3,015 ppm, is 2.3 mmHg. The highest value, 4,051 ppm, is 3.1 mmHg.

## Limits and symptom bands

Each number in the panel has a tooltip with its source. This is the full list.

| Value | What the source says | Source |
|---|---|---|
| 1-hour average, 3 mmHg | "The system shall limit the average one-hour CO2 partial pressure (ppCO2) in the habitable volume to no more than 3 mmHg." | NASA-STD-3001 Volume 2 [V2 6004], quoted in OCHMO-TB-004, page 6 |
| 7-day average, 2.5 mmHg | "To keep the risk of headache below 1%, average 7-day CO2 needs to be maintained below 2.5 mmHg" | OCHMO-TB-004, page 5. Law and others, 2014 |
| Odds of a headache | "For each 1-mm Hg increase in CO2, the odds of a crew member reporting a headache doubled." The study used averages of 24 hours and of 7 days. | Law and others, 2014 |
| 46 headaches, 1,716 observations | "The final analysis was based on 1716 observations. For headache, 46 headaches were observed." | NTRS 20140003857, the NASA abstract of the same study |
| 2.3 to 2.7 mmHg, whole body | "Between 2.3-2.7 mmHg, fatigue and full-headedness have been reported." | Law and Alexander, NTRS 20150019624 |
| 2.7 to 3.0 mmHg, brain | "Between 2.7-3.0 mmHg, there have been self-reports of procedure missed steps or procedures going long." | Law and Alexander, NTRS 20150019624 |
| Above 3.0 to 3.4 mmHg, head | "Above 3.0-3.4 mmHg, headaches have been reported." | Law and Alexander, NTRS 20150019624 |
| 2.8 to 4.5 mmHg, head | "Headaches at levels between 2.8-4.5 mmHg; worsening with increasing levels of CO2" | OCHMO-TB-004, page 4 |
| 3.5 mmHg, eyes, airway, sleep | "Chronic cough, poor sleep, blurred vision, and frontal headaches reported at 3.5 mmHg." | OCHMO-TB-004, page 4 |
| 4.5 to 5.0 mmHg, face | "5th cranial nerve dysesthesia at 4.5-5.0 mmHg." | OCHMO-TB-004, page 4 |
| Above 4.5 mmHg, whole body | "Fatigue malaise, decreased sleep, and nausea reported at levels above 4.5 mmHg." | OCHMO-TB-004, page 4 |

Notes:

- The two sources give different values for the start of headaches. The panel shows both bands.
- The body map shows where NASA documents report symptoms at the CO2 value now. No sensor on a person is behind it. The legend says: "Risk by NASA-reported symptom band — not measured body data."
- The intensity of a band is 0 below its start and 1 at or above its end. A band with one value (3.5 mmHg, above 4.5 mmHg) is fully on from that value.
- The source for 2.7 to 3.0 mmHg tells about missed steps and long procedures. It does not use the word "cognition". We show this band on the brain.
- The odds are relative to the odds at 2.5 mmHg: odds = 2 ^ (7-day average − 2.5). This is an estimate for a group of people. It is not a diagnosis.
- The panel shows no odds for an average below 2 mmHg. We did not find this limit in the study of 2014. It comes from an earlier NASA analysis (James and others, 2011), which had "only 20 PMCs that had a 24-hour average CO2 value below 2 mmHg". A PMC is a private medical conference of a crew member.

## The cabin model

The model is one volume of air that is fully mixed.

```
change of CO2 = (CO2 that the crew makes − CO2 that the station removes) ÷ free volume of the cabin
```

Well-mixed model: real local exposure near the face can be higher (microgravity pockets). CO2 stays in pockets where the air does not move.

| Setting | Default | Source or assumption |
|---|---|---|
| CO2 that one person makes | 1.04 kg each day | NASA Human Integration Design Handbook (NASA/SP-2010-3407 revision 1), table 6.2-10. The same value is in the NASA baseline document for life support (BVAD, NASA/TP-2015-218570 revision 1, table 3-33). Revision 2 of the BVAD gives 1.085 kg. Without exercise, the handbook gives 0.91 kg. |
| Removal by the CDRA, both beds | 1.723 × ppCO2 − 0.37975 kg each day | El Sherif and Knox, 2005 (NTRS 20050210002), equation 1, for 2.0 to 3.9 mmHg. This is the minimum rate that NASA requires. The same paper and OCHMO-TB-004 say: "CDRA continuously removes six person-equivalent of CO2, when operating with both CO2 removal beds". The equation gives 6 kg each day at about 3.7 mmHg. **Assumption:** the model uses the equation also outside 2.0 to 3.9 mmHg. |
| Removal by the CDRA, one bed | half of both beds | El Sherif and Knox, 2005: "During single-bed operation, the system provides 3 person-equivalent removal capabilities." |
| Other CO2 removal of the station | 0.5, as a multiple of one CDRA | **Assumption**, set from the RR-9 record. The station also has a second CDRA and the Russian Vozdukh system (OCHMO-TB-004). With 0.5, the model holds 6 persons near 2.65 mmHg, as the record does. With 0, one CDRA alone holds 6 persons at 3.84 mmHg. |
| Free volume of the cabin | 916 m³ | NASA Reference Guide to the International Space Station, 2015, page 78: "a pressurized volume of approximately 916 m3". **Assumption:** all of it is air. NASA gives no free volume. The station of today has 1,005 m³. |
| Cabin temperature | 22.5 °C | **Assumption.** The gas law needs it to turn kg of CO2 into mmHg. |
| Total cabin pressure | 760 mmHg | The station keeps the cabin near the pressure at sea level. |

You can change each setting on the simulator page, except the equation of the CDRA.

Because the removal rate rises with the CO2 pressure, the cabin moves to a balance value. The countdown is the exact solution of the equation. If the balance is below a limit, the panel says "not reached".

### How close the model gets to the real record

The crew of the station changed two times in the window of the record: from 6 to 3 persons on 2 September 2017 (Soyuz MS-04 left), and back to 6 on 13 September 2017 (Soyuz MS-06 docked). The model gets these crew counts and the first value of the record, and nothing else. `npm run validate-model -w server` prints this comparison.

| Check | Real record | Model, default settings |
|---|---|---|
| Level with 6 persons | 2.66 mmHg | 2.63 mmHg (the setting "other removal" was set to match this) |
| Level with 3 persons | 1.65 mmHg | 1.43 mmHg |
| Whole record, 29 days | | RMS error 0.33 mmHg, mean error −0.09 mmHg |
| Fall after the crew went from 6 to 3, 4 days | 2.43 to 1.63 mmHg | ends at 1.44 mmHg, RMS error 0.68 mmHg |
| Rise after the crew went from 3 to 6, 3 days | 1.62 to 2.62 mmHg | ends at 2.61 mmHg, RMS error 0.56 mmHg |
| The 5 fastest rises over 3 hours | 0.11 to 0.14 mmHg each hour | at most 0.09 mmHg each hour with the CDRA off, and 0.12 with no removal at all |

What this tells:

- The model gets the levels right. It gets the level with 3 persons from the level with 6 persons with an error of 0.2 mmHg.
- The model is too fast for the two large changes. The real record needs about 2 days to follow a new crew count. The model needs about 1 day. The record also stays high for more than one day after the crew left. The model does not know when the ground changed the CO2 removal.
- The short rises of the record are faster than a fully mixed station permits, also with no CO2 removal at all. One sensor sees local effects: the air flow near it, people near it, and the cycle of the CDRA. This is why the panel says that the local exposure can be higher than the model.
- With no other removal (one CDRA alone), the RMS error for the whole record is 0.97 mmHg.

## Parts

| Part | Tools | Folder |
|---|---|---|
| The math | Plain TypeScript with no imports | `shared/` |
| Server | Node 22 with Express. Node runs the TypeScript files directly. | `server/` |
| Web app | React 19, TypeScript, Vite, recharts for the chart, three.js for the 3D figure | `web/` |

| File | Content |
|---|---|
| `shared/co2.ts` | The unit conversion, the rolling averages, the symptom bands, the headache odds, and the cabin model. |
| `server/src/engine.ts` | The simulator: one clock and one CO2 value for all screens, with the values of the last 7 days. |
| `server/src/index.ts` | The API, the live connection to the pages, and the built web app. |
| `server/scripts/fetch-eda.ts` | Gets the record from the EDA page. |
| `server/scripts/validate-model.ts` | Compares the model with the record. |
| `web/src/pages/Dashboard.tsx` | The dashboard. |
| `web/src/pages/Simulator.tsx` | The simulator page. |
| `web/src/components/BodyFigure.tsx`, `BodyFigure3D.tsx` | The 2D and the 3D body figure. |
| `web/src/texts.ts` | The sources and the texts of the bands and the settings. |
| `web/src/locales/pt-BR.ts` | The Portuguese texts. |

The server keeps the state in memory. A restart starts the simulator again from its first state: real data replay, 7 days into the record.

The files in `docs/` are background research from an earlier, wider version of the project. They describe features that this version does not have.

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
3. Open that address on the screen for the audience. This is the dashboard.
4. Open the same address with `/simulator` at the end on the phone.
5. Move the CO2 slider. The dashboard follows at once.

## Tests

`npm test` runs the tests with the test runner of Node. They cover:

- the conversion between ppm and mmHg, with the check values of the RR-9 record,
- the rolling averages,
- the symptom bands and the headache odds,
- the cabin model and the time to a limit,
- the simulator engine and the RR-9 record file.

## Deploy

The app runs at https://nexxo.vncs.dev on the VPS `hostinger`. The address is open, with no login. Each person who knows the address can open `/simulator` and change what all dashboards show.

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
| `npm test` | Runs the tests. |
| `npm run typecheck` | Checks the types of the server and builds the React app. |
| `npm run lint` | Runs the linter on the React app. |
| `npm run build` | Builds the React app into `web/dist`. |
| `npm start` | Starts the server. It also serves `web/dist` if that folder exists. |
| `npm run fetch-eda -w server` | Downloads the RR-9 record again. |
| `npm run validate-model -w server` | Compares the cabin model with the record. |

## Settings

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3001` | The port of the server. |
| `WEB_DIST` | `../web/dist` | The folder with the built React app. |

## Sources

| Short name | Document |
|---|---|
| EDA | NASA Environmental Data Application, https://visualization.osdr.nasa.gov/eda/ |
| OCHMO-TB-004 | NASA Office of the Chief Health and Medical Officer, technical brief "Carbon Dioxide (CO2)", revision D. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf |
| Law and Alexander | "CO2 on the International Space Station: An Operations Update". https://ntrs.nasa.gov/citations/20150019624 |
| Law and others, 2014 | "Relationship between carbon dioxide levels and reported headaches on the International Space Station". J Occup Environ Med 56(5):477-83. https://pubmed.ncbi.nlm.nih.gov/24806559/ . We read the abstract only. PubMed lists a correction of September 2014, which we did not read. |
| NTRS 20140003857 | The NASA abstract of the same study. https://ntrs.nasa.gov/citations/20140003857 |
| James and others, 2011 | "Crew Health and Performance Improvements with Reduced Carbon Dioxide Levels and the Resource Impact to Accomplish Those Reductions". https://ntrs.nasa.gov/citations/20100039645 |
| HIDH | NASA Human Integration Design Handbook, NASA/SP-2010-3407 revision 1. https://www.nasa.gov/wp-content/uploads/2015/03/human_integration_design_handbook_revision_1.pdf |
| BVAD | NASA Life Support Baseline Values and Assumptions Document, NASA/TP-2015-218570 revision 1. https://ntrs.nasa.gov/citations/20180001338 |
| El Sherif and Knox, 2005 | "International Space Station Carbon Dioxide Removal Assembly (ISS CDRA) Concepts and Advancements". https://ntrs.nasa.gov/citations/20050210002 |
| Station guide | NASA Reference Guide to the International Space Station, 2015. https://www.nasa.gov/wp-content/uploads/2017/09/np-2015-05-022-jsc-iss-guide-2015-update-111015-508c.pdf |
| Crew changes | NASA releases of September 2017: https://www.nasa.gov/news-release/three-international-space-station-crewmates-safely-return-to-earth/ and https://www.nasa.gov/news-release/three-new-crew-members-arrive-at-international-space-station/ |

This app is a prototype for a hackathon. It is not a medical device.
