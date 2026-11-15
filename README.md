# Nexxo

Nexxo is health monitoring software for astronauts. It is a project for the NASA Space Apps Challenge 2026, challenge "Create Health Monitoring Software for Astronauts on Space Missions".

The app holds two ideas, so the team can test and compare them:

| Idea | Page | In one sentence |
|---|---|---|
| CO2 exposure | `/` | The cabin CO2 of the station from a real record, what NASA documents report at that value, and the time that is left before a limit. |
| Trip forecast | `/trip` | A whole mission on a timeline with a map, and forecasts of the communication delay, the radiation dose, the cabin air, and the effects on the body. |

Both pages use the same server, the same simulator page (`/simulator`), the same math, and the same components. The section "How to compare the two ideas" has a short checklist.

## The CO2 page: "CO2 exposure"

CO2 builds up in a closed cabin. On the International Space Station, crews report headaches, fatigue, and slower work at CO2 values that are legal on Earth. The page shows the cabin CO2, what NASA documents report at that value, and how much time is left before a limit.

**The dashboard** (the first page, `/`) has one panel, "CO2 exposure", with four parts:

| Part | What it shows |
|---|---|
| Cabin CO2 now | The CO2 partial pressure in mmHg and in ppm, and the 1-hour average against the NASA limit of 3 mmHg. |
| Body map | A body figure (2D or 3D). A region gets color when the CO2 value is in a symptom band that a NASA document reports. A tooltip gives the band and its source. |
| Headache risk | The averages of 1 hour, 24 hours, and 7 days. Each average has its own reference. The gauge shows the odds of a headache, compared with the odds at a 7-day average of 2.5 mmHg. |
| Time to limit | A countdown to 3.0 mmHg and to the start of each symptom band, from a model of the cabin. A chart shows the last 24 hours and the next 24 hours. |

**The simulator** (`/simulator`) is for the presenter. No page links to it: type the address. It is made for a phone. Each control has an effect at once on every open page. It has two tabs: "CO2 exposure" with the controls below, and "Trip" with the controls of the trip page (the mission, the mission day, the solar cycle, a storm, the crew and its day, the scrubber, the oxygen generator, the Sabatier reactor, and the cabin volume). The two groups of settings do not change each other, so you can compare the two pages.

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

## The trip page: "Trip forecast"

The page `/trip` is the second idea. It shows a whole mission on a timeline with a 2D map, and forecasts along the trip: the communication delay, the radiation dose, the CO2 and the O2 of the cabin, and the effects on the body. Drag the mission day, and each part follows. The simulator page has a tab "Trip" with the controls.

| Part | What it shows |
|---|---|
| Mission picker | Ten mission presets. Each one has a badge and its sources. |
| Mission day | The phases of the flight with a cursor that you can drag. |
| Map | Where the spacecraft is: a map with the Sun in the middle for Mars, with the Earth in the middle for the Moon, and a ground track for the station with the South Atlantic Anomaly. |
| Communication delay | The one-way light time between the Earth and the spacecraft, from the real positions, and a sentence such as "Ground support delayed 12 min". |
| Radiation dose | The dose of each day and the total dose, with the instrument, the shielding, and the solar cycle of the measurement. In mSv, the NASA career limit of 600 mSv is a line. |
| Compare missions | The total dose of 2 or 3 missions on one chart, in one unit only. |
| Effects on the body | A body figure in 2D or 3D. Color shows where the radiation dose, the CO2, or the O2 can affect the astronaut. A tap on a part shows what a source reports there and what the crew can do. |
| Cabin air | The CO2 and the O2 of the cabin around the cursor, with the daily pattern of sleep and exercise, and a countdown after a failure. |
| Headache risk, time to limit | The same two cards as on the CO2 page, fed by the CO2 forecast of the trip. |
| Model check | For the station preset only: the cabin model next to the real CO2 record, with the error. |

Each chart has a badge:

| Badge | Meaning |
|---|---|
| REAL DATA | A measured series, or a real trajectory. |
| REAL RATE (published mean) | The mean of a measurement, from a paper. |
| MODELLED | Computed by a model of this app. |
| PROXY | A real value from another mission, where this mission has none. |

### Mission presets

Each preset is one file in `shared/trip/presets/`. The dose rates are for each day.

| Preset | Badge | Trajectory | Radiation |
|---|---|---|---|
| ISS, 6 months | REAL DATA | Ground track from the CelesTrak orbit elements | NASA EDA, RR-9: 30 real days, mean 0.32 mGy. No value in mSv. |
| Moon: Artemis I (2022, uncrewed) | REAL RATE | JPL Horizons | Orion HERA sensors (George and others, Nature 2024): 1.10 ± 0.14 mSv after the radiation belts. |
| Moon: Artemis II (2026, crewed) | REAL TRAJECTORY + PROXY | JPL Horizons | NASA published no crew dose yet. The cruise uses the Artemis I rate as a proxy. The first phase has no data. |
| Lunar orbit, 100 km | REAL RATE | Simple orbit at the Moon | Chandrayaan-1 RADOM (ISRO orbiter, Bulgarian instrument): 0.227 mGy. |
| Lunar surface stay | REAL RATE | Fixed place on the Moon | Chang'E 4 LND (Zhang and others, Science Advances 2020): 1.369 ± 0.254 mSv. |
| Lunar Gateway | PROXY | At the Moon | No flown data. Artemis I rate as a proxy. |
| Mars: MSL/Curiosity cruise (first preset) | REAL DATA | JPL Horizons, 26 November 2011 to 6 August 2012 | MSL RAD inside the spacecraft (Zeitlin and others, Science 2013): 1.84 ± 0.33 mSv. |
| Mars: ExoMars TGO cruise (2016) | REAL DATA | JPL Horizons, 219 days | Liulin-MO (Semkova and others, Icarus 2018): 0.381 ± 0.038 mGy. The real daily series of 90 days is in the chart in mGy. |
| Mars: crewed reference | REAL RATE + MODELLED | MSL path, a surface stay, and a mirrored return | MSL RAD cruise rate, 0.64 ± 0.12 mSv on the surface of Mars (Hassler and others, Science 2014), and a solar-cycle choice. |
| Custom | MODELLED | A transfer orbit that this app computes | Your own rate. |

A value that we could not check in its source is empty, and the page shows "no data". The files `docs/sources-lunar.md`, `docs/sources-mars-iss.md`, `docs/sources-life-support.md`, and `docs/sources-body-effects.md` hold the exact quote, the place in the source, and the address for each number, and the list of what we could not confirm.

### Data sources and credit lines

| Data | Source and credit |
|---|---|
| Cabin CO2 and radiation of the station | Data and visualizations are courtesy of the Environmental Data Application (EDA) (https://visualization.osdr.nasa.gov/eda/). |
| Trajectories of MSL, ExoMars TGO, Artemis I, Artemis II, and the places of the Earth, Mars, and the Moon | Giorgini, JD and JPL Solar System Dynamics Group, NASA/JPL Horizons On-Line Ephemeris System, https://ssd.jpl.nasa.gov/horizons/. Each trajectory file holds the date of retrieval. |
| Radiation in the cruise to Mars, MSL | MSL RAD (Radiation Assessment Detector), NASA. Zeitlin and others, Science 340 (2013). Hassler and others, Science 343 (2014). |
| Radiation in the cruise to Mars, ExoMars | Liulin-MO data: J. Semkova (Space Research and Technology Institute, Bulgarian Academy of Sciences) and V. Benghin (Institute of Biomedical Problems, Russian Academy of Sciences), http://esa-pro.space.bas.bg/datasources/LIULIN_MO. Reference: Semkova and others, Icarus 303 (2018). ExoMars is a mission of ESA and Roscosmos. |
| Orbit of the station | Orbit elements from CelesTrak (https://celestrak.org). |
| Land shapes of the ground map | Made with Natural Earth. |

Scripts get each file one time and save it in `web/src/trip/data/`, so the app needs no network: `fetch-trajectories`, `fetch-iss-track`, `fetch-eda-radiation`, and `fetch-liulin` (see "Commands").

### Communication delay

One-way light time = distance between the Earth and the spacecraft ÷ the speed of light (299,792.458 km each second). The distance comes from the real positions of JPL Horizons. When MSL arrived at Mars, the light time was 13.8 minutes. The return of the crewed reference mission is the cruise in reverse. This is a model, and the page marks it as MODELLED: a real return waits for the right launch window.

### Radiation forecast

- The dose of a phase is a measured rate from a paper. The total is the sum over the days. The app has no model of the radiation.
- A solar-cycle choice exists for the crewed reference mission. "Near solar maximum" uses MSL RAD. "Declining phase" uses Liulin-MO.
- The career limit is 600 mSv of effective dose (NASA-STD-3001 Volume 1 revision C, [V1 4030]). The chart shows it only for a series in mSv, and marks the mission day when the total passes it.
- A storm (solar particle event) is a button of the simulator. It adds a dose that you choose at the mission day of the cursor.

### Cabin air: the CO2 and O2 forecast

The model is the same kind as the cabin model of the CO2 page (one volume of air that is fully mixed), in steps of 1 minute, with a day of the crew.

| Part | Value | Source or assumption |
|---|---|---|
| Rates of one person | Sleep: 3.60 O2 and 4.55 CO2. Nominal: 5.68 and 7.2. Exercise: 39.40 and 49.85. In kg for each minute × 10⁻⁴. | NASA Human Integration Design Handbook, by way of OCHMO-TB-004. |
| Second set of rates | 1.08 kg of CO2 and 0.89 kg of O2 each day with 90 minutes of exercise. | NASA NTRS 20190027563. You can select it on the simulator page. |
| Day of the crew | 8 hours of sleep and 2 sessions of 30 minutes of exercise. With the handbook rates, one person then makes 1.17 kg of CO2 and uses 0.92 kg of O2 each day. | The schedule is our default. You can change it. |
| Exercise | The crew members exercise one after the other. | **Assumption:** a spacecraft has one exercise device. |
| Scrubber | The CDRA equation of the CO2 page: 1.723 × ppCO2 − 0.38 kg each day for one unit. One bed removes half. | El Sherif and Knox, 2005. |
| Scrubber size | One unit for each 2 persons. | **Assumption**, for each cabin other than the station. |
| Station | One CDRA and other removal of 0.66 units. So the station removes 2.86 kg of CO2 each day for each mmHg. | Set from the RR-9 record with 6 persons. |
| Oxygen generator | On or off, with a rate up to 9.25 kg each day. By default it makes as much as the crew uses. | ICES-2023-311. |
| Sabatier reactor | It changes only the number "O2 loop closure". It converts about 50% of the CO2. | ESA ACLS. |
| Cabin volume | Station 916 m³, Orion 9.34 m³, Mars transit habitat 100 m³, lunar surface habitat 127 m³, Gateway 125 m³. | Each preset names its source. |
| O2 range | 145 to 155 mmHg. This is the pressure of the O2 that a person breathes in, not of the cabin air. | NASA-STD-3001 Volume 2 [V2 6003]. |

A failure starts at the mission day where the presenter sets it. Before that day, the cabin has its usual daily pattern.

**Check against the real record:** with the real crew counts of the station (6, 3, 6 persons), the model has an RMS error of 0.38 mmHg and a mean error of −0.06 mmHg against the RR-9 record. With 3 persons the model gives 1.45 mmHg and the record has 1.65 mmHg. The trip page shows this check for the station preset.

### Effects on the body

The card joins three hazards on one body figure:

- **CO2:** the symptom bands of the CO2 page.
- **O2:** the limits of NASA-STD-3001 Volume 2 for a low and a high O2 pressure.
- **Radiation:** the NASA dose limits for each organ (lens of the eye, skin, blood-forming organs, heart, central nervous system) and the career limit (NASA-STD-3001 Volume 1).

For each effect the card shows what the source reports, the comparison now, and a list "What you can do" with the source of each step. A step with no source is marked "our idea".

The radiation part is a rough indicator. The app has a dose that one instrument measured at one place (mSv or mGy). The organ limits use the dose in one organ, weighted by its biological effect (mGy-Eq), and the career limit uses the effective dose. These are different quantities. Each such effect carries this warning, and it gets a weaker color.

### Flags

These points are true for the trip page. Each one is also on the page, on the preset or the chart where it applies.

1. The cruise radiation almost does not change with the distance from the Sun between 1 and 1.5 AU. The dose line is flat on purpose.
2. MSL flew near the solar maximum, when the galactic cosmic rays are lower. ExoMars TGO flew in the declining phase, when they are higher. The page always shows which setting is active.
3. The shielding differs. MSL RAD was inside the spacecraft. Liulin-MO sits on the outside of the orbiter.
4. mGy (and µGy) is absorbed dose. mSv is dose equivalent. A chart never has both, and the app converts nothing. Where a source gives both for one measurement, the page can show the mission in either unit.
5. A solar particle event is a what-if scenario. Nobody can forecast its date.
6. The CO2 and O2 forecast is a well-mixed model. The local exposure near the face can be higher in microgravity.
7. The metabolic numbers differ by source: 0.82, 0.85, or 0.89 kg of O2, and 1.04 or 1.08 kg of CO2 each day. The page names the set that the model uses.
8. The EDA dates the RR-9 CO2 telemetry in 2018, but the mission flew in 2017. The app moves it by −1 year and keeps only the window from the transfer to the undock.
9. Artemis I flew no crew, and Orion has heavy shielding. The abstract of the paper says that its cruise dose rate was about 60% lower than on earlier missions. The numbers in the body of the paper give 22% to 39%. Do not compare it with MSL RAD without the shielding and the solar cycle.
10. The rate on the lunar surface comes from the lander Chang'E 4 of the Chinese space agency CNSA. The instrument (LND) is German: Kiel University, with DLR.
11. Gateway has no flown data. Each Gateway number is a proxy. NASA paused the program on 24 March 2026.

More points that the research found:

- The RAD team later gave a lower cruise rate for MSL: 1.58 ± 0.22 mSv (Zeitlin 2019, quoted in Guo 2021). The preset keeps 1.84 from the paper of 2013 and names the newer value.
- In mGy, the two cruise instruments are not the same kind of value: RAD gives the dose in water and Liulin-MO gives the dose in silicon. Compare the two solar settings in mSv.
- The 0.227 mGy of the lunar orbit is quoted from a later paper that cites the original, because the original is behind a paywall.
- The South Atlantic Anomaly on the map is an ellipse from limits for 500 km of altitude (1996). At the altitude of the station the region is smaller, so the map shows too many and too long passes.
- A custom flight of 259 days or less is an exact Kepler path. A longer flight uses the 259-day path with a slower clock, which is not physical.

## The helmet page

The page `/helmet` is a small third page. It shows an astronaut in a space suit with four CO2 sensors inside the helmet:

| Sensor | Place |
|---|---|
| Forehead | At the front of the helmet, near the forehead. |
| Mouth | At the front of the helmet, a little in front of the mouth. |
| Neck | At the front of the helmet, below the mouth, near the neck ring. |
| Back of the head | At the back of the helmet, behind the head. |

Each sensor has a light, a label with its value in mmHg, and a colored area on the helmet, so you see where the CO2 is: at the front or at the back, high or low.

| Color | CO2 partial pressure |
|---|---|
| Green | below 2.3 mmHg |
| Yellow | 2.3 to 3.0 mmHg |
| Red | above 3.0 mmHg |

A switch selects the view:

- **2D:** two still pictures, from the front and from the back. They do not move.
- **3D:** the model itself. You can turn it with a drag.

The places of the sensors in the pictures come from the 3D model, so both views show a sensor at the same place of the helmet. On a wide screen, the information is at the right of the astronaut: a short alert that names the sensors where the CO2 rises or is high, and one row for each sensor with its value, its place, and what to do. On a phone, the information is below the astronaut.

The tab "Helmet" of the simulator page controls it:

- A slider for each sensor sets its value at once.
- A routine raises some sensors step by step: "Mouth and neck rise", "Forehead rises", "Back of the head rises", and "All sensors rise". The page then shows, for example, "CO2 levels are rising at these sensors: Mouth, Neck."
- "Back to calm" moves all sensors back step by step.

The astronaut is the NASA model "Extravehicular Mobility Unit" from NASA 3D Resources (https://github.com/nasa/NASA-3D-Resources). NASA says that these assets are free and without copyright. The page shows it with few details: no backpack arms, no patches, and no text. The model is in `web/public/models/emu.glb`, the two pictures are stills of the same model, and the files in `web/public/draco/` are the decoder of the 3D library for this model. In development, `window.__helmetShot(1100)` in the 3D view gives the two pictures and the sensor places again.

The sensors and their values are a simulation. No real suit data is behind them. **Assumption:** the two color limits are those of a cabin (first reported symptoms at 2.3 mmHg, NASA limit of 3.0 mmHg for the 1-hour average), because we have no checked limit for the air inside a helmet. The calm value of 1.2 mmHg is our choice. The rules are in `shared/helmet.ts`, the server part is in `server/src/helmet.ts`, and the page is `web/src/pages/Helmet.tsx`.

## How to compare the two ideas

Open `/` and `/trip` next to each other, and use `/simulator` with its two tabs. Give each idea a mark from 1 to 5 for each point.

| Point | Questions | CO2 exposure | Trip forecast |
|---|---|---|---|
| Demo clarity | Can a person who sees it for 30 seconds say what it shows? Does one action on the simulator give one clear change? | | |
| Real-data share | How much of the screen is measured data, and how much is a model or a proxy? Count the badges. | | |
| Wow factor | Which moment makes the audience look up? For example the body that changes color, or the light time that grows to 14 minutes. | | |
| Build risk | What can fail in the live demo? What is still an assumption that a judge can question? | | |

What we know now, to start the talk:

- The CO2 page is one clear story with a real record at 5-minute steps. Its weak point: the cabin model follows a crew change two times faster than the real record.
- The trip page has more to show and more real sources (trajectories, three radiation instruments). Its weak points: the body effects of radiation are a rough indicator, the lunar presets have little data, and the page is long.

## Parts

| Part | Tools | Folder |
|---|---|---|
| The math | Plain TypeScript with no imports | `shared/` |
| Server | Node 22 with Express. Node runs the TypeScript files directly. | `server/` |
| Web app | React 19, TypeScript, Vite, recharts for the chart, three.js for the 3D figure | `web/` |

| File | Content |
|---|---|
| `shared/co2.ts` | The unit conversion, the rolling averages, the symptom bands, the headache odds, and the cabin model. |
| `shared/trip/types.ts` | The types of the trip: presets, trajectory files, geometry, radiation, life support, simulator settings. |
| `shared/trip/presets/` | One file for each mission preset, with each rate and its source. |
| `shared/trip/geometry.ts`, `groundtrack.ts`, `transfer.ts` | The places of the spacecraft and the light time, the ground track of the station, and the transfer orbit of the custom mission. |
| `shared/trip/radiation.ts` | The dose of each day, the total dose, the storms, the career limit, and the comparison. |
| `shared/trip/lifesupport.ts`, `calibration.ts` | The CO2 and O2 model with the day of the crew, and its check against the real record. |
| `shared/trip/effects.ts` | The effects of CO2, O2, and radiation on the body, with the steps that reduce each risk. |
| `server/src/engine.ts` | The simulator: the clock and the CO2 value of the CO2 page, and the settings of the trip page. |
| `server/src/index.ts` | The API, the live connection to the pages, and the built web app. |
| `server/scripts/fetch-eda.ts` | Gets the CO2 record from the EDA page. The other `fetch-*.ts` scripts get the trajectories, the orbit of the station, and the measured dose series. |
| `server/scripts/validate-model.ts` | Compares the model with the record. |
| `web/src/pages/Dashboard.tsx` | The CO2 page. |
| `web/src/pages/Trip.tsx`, `web/src/trip/` | The trip page, its cards, its data files (`data/`), and the code that joins them (`useTrip.ts`). |
| `web/src/pages/Simulator.tsx` | The simulator page with its two tabs. |
| `web/src/components/co2/` | The cards of the CO2 page. The trip page uses the headache risk and the time to limit cards for its own CO2 forecast. |
| `web/src/components/BodyFigure.tsx`, `BodyFigure3D.tsx` | The 2D and the 3D body figure. Both pages use them. |
| `web/src/texts.ts` | The sources and the texts of the bands and the settings. |
| `web/src/locales/pt-BR.ts`, `web/src/locales/pt-BR/` | The Portuguese texts. |

The server keeps the state in memory. A restart starts the simulator again from its first state: real data replay, 7 days into the record, and the MSL mission at day 0.

The server sends each change to all open pages through one stream (`/api/stream`, server-sent events). `POST /api/control` takes the CO2 settings at the top level and the trip settings inside `trip`, for example `{ "trip": { "day": 120, "life": { "scrubber": "off" } } }`. `GET /api/state` shows the whole state.

The files `docs/sources-*.md` hold the quotes and the addresses for the numbers of the trip page. The files `docs/health-indicator-map.md` and `docs/data-correlations.md` are background research from an earlier, wider version of the project. They describe features that this version does not have.

Each page part of the trip has a small test page for development, for example `/trip-test-w2.html` for the map. The production build does not hold them.

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
6. For the trip page, open the address with `/trip` at the end on the screen for the audience, and select the tab "Trip" on the phone.

## Tests

`npm test` runs the tests with the test runner of Node. They cover:

- the conversion between ppm and mmHg, with the check values of the RR-9 record,
- the rolling averages,
- the symptom bands and the headache odds,
- the cabin model and the time to a limit,
- the simulator engine and the RR-9 record file,
- the light time and the geometry of each mission,
- the ground track of the station and the transfer orbit,
- the dose of each day, the total dose, the storms, and the career limit,
- the CO2 and O2 model: the steady state, the rise after a failure, the daily pattern, and the check against the record,
- the effects on the body,
- the helmet sensors and their routines.

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
| `npm run fetch-eda -w server` | Downloads the RR-9 CO2 record again. |
| `npm run fetch-eda-radiation -w server` | Downloads the RR-9 radiation data again. |
| `npm run fetch-trajectories -w server` | Gets the trajectories from JPL Horizons again. |
| `npm run fetch-iss-track -w server` | Gets the orbit of the station from CelesTrak and computes the ground track again. |
| `npm run fetch-liulin -w server` | Downloads the Liulin-MO cruise data again. |
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
