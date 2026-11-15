# Sources of the Mars, ISS, and custom presets, and of the career limit

This file lists each number of these files, with the exact quote, the place in the source, and the URL:

- `shared/trip/presets/msl.ts`, `tgo.ts`, `mars-reference.ts`, `iss.ts`, `custom.ts`
- `shared/trip/limits.ts`
- `web/src/trip/data/eda-rr9-radiation.json` (made by `server/scripts/fetch-eda-radiation.ts`)
- `web/src/trip/data/liulin-cruise.json` (made by `server/scripts/fetch-liulin.ts`)

We read each source on 15 November 2026. A quote is in quotation marks and is word for word.
Where the app uses a number that is not in the source (a mean, a rounding), this file says "our arithmetic".

Two quantities appear, and the app never adds or converts them:

- Absorbed dose, in mGy (or µGy): the energy that the radiation leaves in a material. The material matters: the same radiation gives a lower dose in silicon than in water or tissue.
- Dose equivalent, in mSv (or µSv): the absorbed dose times a quality factor (Q) for the harm that each kind of particle does to the body.

GCR means galactic cosmic rays. SEP or SPE means solar energetic particles or a solar particle event. AU is the mean distance between the Earth and the Sun.

## 0. How we read the sources, and what we could not confirm

Three papers are behind a paywall, and we did not open their full text: Zeitlin et al. 2013 (Science), Hassler et al. 2014 (Science), and Semkova et al. 2018 (Icarus).
For each of their numbers we looked for the same number in an open text of the same team, and this file names that open text.
Section 8 lists each value that we could not confirm in a text that we read.

| Source | How we read it |
|---|---|
| NASA-STD-3001 Volume 1 Revision C | Full text (PDF from nasa.gov) |
| Zeitlin et al. 2013, Science | Abstract only (PubMed). Numbers confirmed in open papers of the same team (sections 2.1 to 2.3) |
| Hassler et al. 2014, Science | Not opened. Numbers confirmed in open papers of the same team (section 3) |
| Zeitlin et al. 2014, 8th Mars conference, abstract 1151 | Full text (PDF, open) |
| Guo et al. 2015, A&A 577, A58 | Full text (arXiv:1503.06631) |
| Guo et al. 2021, Astron. Astrophys. Rev. 29, 8 | Full text (open access) |
| Matthiä et al. 2016, J. Space Weather Space Clim. 6, A13 | Full text (open access) |
| Semkova et al. 2018, Icarus | Not opened. The two dose rates are confirmed by our own mean of the data file of the team (section 4.2). The dose equivalent is confirmed in Guo et al. 2021 |
| Liulin database: data file, source page, user manual | Full text and data |
| Semkova et al. 2025, workshop proceedings and slides | Full text (open) |
| ESA articles of 2016 and 2018 | Full text |
| Berger et al. 2018, Space Weather | Abstract (Crossref) |
| NASA EDA page of RR-9 and its chart code | Full page and data |
| ICES-2023-311, Simon et al. 2015 | Full text (NASA NTRS) |

## 1. The career limit (`shared/trip/limits.ts`)

NASA-STD-3001, NASA Spaceflight Human-System Standard, Volume 1: Crew Health, Revision C. Approved 2023-09-15. "Superseding NASA-STD-3001, Volume 1, Revision B".
URL: https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf

The NASA page of the standards linked Revision C on 15 November 2026: https://www.nasa.gov/directorates/esdmd/hhp/human-spaceflight-and-aviation-standards/

| Value in the app | Quote | Place in the source |
|---|---|---|
| 600 mSv, effective dose, over a career | "[V1 4030] An individual crewmember's total career effective radiation dose due to spaceflight radiation exposure shall be less than 600 mSv. This limit is universal for all ages and sexes." | Section 4.8.2, "Career Space Permissible Exposure Limit for Spaceflight Radiation", page 39 of 86 |
| The limit is for the NASA effective dose | "Note: The NASA effective dose for determining the threshold limit is calculated using the NASA Q (based on the NASA cancer model of 2012 [...]), 35-year-old female model parameters (tissue weighting factors, phantom etc.), for both males and females." | The note below [V1 4030], page 39 |
| The reason: 3% risk | "The total career dose limit is based on ensuring each crewmember (inclusive of all ages and sexes) remains below 3% mean risk of cancer mortality (risk of exposure-induced death (REID)) above the non-exposed baseline mean." | Rationale of [V1 4030], pages 39 and 40 |
| The limit counts all flights | "Individual crewmember career dose includes all past spaceflight radiation exposures, plus the projected exposure for an upcoming mission." | Rationale of [V1 4030], page 40 |

History: Revision B (2022-01-05) already had the limit of 600 mSv. The document history log of Revision C lists 4.8.2/[V1 4030] among the changed sections. The words of Revision B were "An individual astronaut's total career effective radiation dose due to space flight radiation exposure shall be less than 600 mSv" (NASA technical brief OCHMO-TB-020 Rev E, which quotes Revision B, https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf). Revision C writes "crewmember" and "spaceflight".

**A limit of the comparison.** The limit is for effective dose, which NASA computes for the whole body with its own quality factors. The instruments give dose equivalent at one point. Both use mSv. Guo et al. 2021 (section 2.3) warn about this: "There are other definitions used in the field of radiation biology (equivalent dose, effective dose, etc.) which use the same SI unit (Sv); this may be a source of confusion when these disparate quantities are compared to one another". So the app shows the day when a mission passes the limit as an estimate (`CAREER_LIMIT.note`, and a flag on the Mars presets).

## 2. MSL/Curiosity cruise (`msl.ts`)

### 2.1 The paper: Zeitlin et al. 2013

Zeitlin, C., Hassler, D. M., Cucinotta, F. A., et al. "Measurements of energetic particle radiation in transit to Mars on the Mars Science Laboratory." Science 340, 1080–1084 (2013).
URL: https://doi.org/10.1126/science.1235989. Abstract: https://pubmed.ncbi.nlm.nih.gov/23723233/

We read the abstract only:

- "The Mars Science Laboratory spacecraft, containing the Curiosity rover, was launched to Mars on 26 November 2011, and for most of the 253-day, 560-million-kilometer cruise to Mars, the Radiation Assessment Detector made detailed measurements of the energetic particle radiation environment inside the spacecraft."
- "The dose equivalent for even the shortest round-trip with current propulsion systems and comparable shielding is found to be 0.66 ± 0.12 sievert."

### 2.2 Where we read each number of the paper

| Value in the app | Quote | Open source |
|---|---|---|
| Dose equivalent in cruise: 1.84 mSv for each day | "In cruise, the dose equivalent rate from GCR was found to be 1.84 mSv/day, and on the surface the rate is 0.64 mSv/day." | Zeitlin et al. 2014, "New results from the MSL-RAD experiment on Curiosity", Eighth International Conference on Mars, abstract 1151, section "Implications for Future Human Exploration". https://www.hou.usra.edu/meetings/8thmars2014/pdf/1151.pdf |
| ± 0.33 mSv | Not read in a text. It agrees with the abstract of the paper: 0.66 ± 0.12 Sv for a round trip of 360 days of flight is 1.84 ± 0.33 mSv for each day (our arithmetic). The 360 days are in Zeitlin et al. 2014: "A cruise duration of 360 days would, under similar heliospheric and shielding conditions, be expected to give a total of 660 mSv". | See section 8 |
| Absorbed dose in cruise: 0.481 mGy for each day, in water | "Subsequent to Zeitlin et al. (2013), we have re-evaluated the conversion factor used to obtain tissue dose from dose in silicon, and this yields the slightly lower dose rate (458 µGy/day) shown here compared to the earlier reported value (481 µGy/day)." | Guo et al. 2015, footnote 2. https://arxiv.org/abs/1503.06631 |
| ± 0.080 mGy | "the Mars Science Laboratory (MSL) spacecraft carrying Curiosity measured a dose rate of 0.48 ± 0.08 mGy/day during the cruise phase (Hassler et al., 2014)" | Atri et al. 2022, arXiv:2208.00892, section 2.2 (a paper of another team that cites the number). https://arxiv.org/abs/2208.00892 |
| In the silicon detector: 0.332 ± 0.023 mGy for each day | "During quiet periods in solar activity, the average GCR dose rate measured by the silicon and plastic scintillators was about 332 ± 23 µGy/day and 461 ± 92 µGy/day, respectively (Zeitlin et al. 2013)." | Guo et al. 2015, section 2 |
| Mean quality factor: 3.82 ± 0.25 | "A value of 3.82 ± 0.25 was measured during MSL's cruise phase (Zeitlin et al. 2013)." | Guo et al. 2015, section 2.4 |
| RAD measured from 6 December 2011 to 14 July 2012 | "It was switched on December 6, 2011 and, with few interruptions, measured through July 14, 2012 when it was temporarily switched off in preparation for the landing." | Guo et al. 2021, section 4.3.5. https://doi.org/10.1007/s00159-021-00136-5 |
| Five solar particle events, 24.7 mSv, about 5%, cruise total about 466 mSv | "Only five SEP events were observed during the 253-day cruise to Mars as already reported by Zeitlin et al. (2013) [...] The summed dose equivalent of the five observed SEPs is 24.7 mSv, roughly 5% of the contribution to the total cruise dose equivalent (≈ 466 mSv)." | Guo et al. 2015, section 3 |
| Shielding of RAD in cruise | "In the case of MSL, the shielding around RAD was highly non-uniform (Zeitlin et al. 2013). A ray-tracing analysis showed that nearly 30% of the solid angle above RAD was only lightly shielded (< 5 g/cm2), while the 50% of the solid angle in the lower hemisphere was shielded by 8–10 g/cm2. The remaining 20% of the solid angle was heavily shielded (≈ 20 g/cm2). The shielding depth averaged over all incident directions was roughly 16 g/cm2." | Guo et al. 2021, section 7.2.2 |
| Solar cycle | "The MSL/RAD data were obtained under the rising and maximum phase of an unusually weak solar cycle." | Guo et al. 2015, section 3 |
| Solar cycle | "The estimation of the cruise phase radiation environment is based on the shielding configuration of the MSL spacecraft carried out during a very weak solar maximum." | Guo et al. 2021, section 8.1 |

A check of our own: 0.481 mGy × 3.82 = 1.84 mSv. The three numbers agree.

The press release of the team rounds the value: "The RAD data show an average GCR dose equivalent rate of 1.8 milliSieverts per day in cruise." It also says "Only about 5 percent of the radiation dose was associated with solar particles" and "the results are representative of a trip to Mars under conditions of low to moderate solar activity." (Southwest Research Institute, May 2013, https://www.swri.org/press-release/swri-led-team-calculates-radiation-exposure-associated-trip-mars)

### 2.3 The team later lowered the cruise value

"The GCR dose rate measured by the plastic scintillator "E" was about 461 ± 92 µGy/day and the dose equivalent rate is about 1.58 ± 0.22 mSv/day (Zeitlin et al. 2019). (This revised value, about 15% smaller than our original estimate in Zeitlin et al. (2013), was based on a reanalysis of the cruise data using an improved method to remove RTG background from the measured LET spectrum, as well as a revised silicon to water conversion factor.)" (Guo et al. 2021, section 4.3.5.)

RTG is the nuclear power source of the rover. Zeitlin et al. 2019 is "Measurements of radiation quality factor on Mars with the Mars Science Laboratory Radiation Assessment Detector", Life Sciences in Space Research 22, 89–97, https://doi.org/10.1016/j.lssr.2019.07.010. We did not open it.

Guo et al. 2015 already used a value between the two: "the average RAD cruise measurement (Zeitlin et al. 2013): 1.75 ± 0.30 mSv/day".

**What the app does.** The preset keeps 1.84 ± 0.33, the value of the paper of 2013. The reason: the surface value of 2014 (0.64) comes from the same method, so the two phases of the crewed reference mission fit together. A flag on the presets (`FLAG_REVISED`) tells the reader about 1.58 ± 0.22. The lead can decide to use 1.58 in place of 1.84: change `MSL_CRUISE_RATE` in `msl.ts` (value 1.58, plusMinus 0.22, other 0.461 ± 0.092 mGy in the plastic detector).

### 2.4 Dates and length

- Launch on 26 November 2011, cruise of 253 days: the abstract of Zeitlin et al. 2013 (section 2.1).
- The trajectory file `msl.json` (JPL Horizons) runs from 26 November 2011, 15:51 UTC, to 6 August 2012, 05:18 UTC. This is 253.6 days. The preset uses 253 days, as the paper does.

## 3. Mars surface (`MARS_SURFACE_RATE` in `msl.ts`, used by `mars-reference.ts`)

Hassler, D. M., Zeitlin, C., Wimmer-Schweingruber, R. F., et al. "Mars' surface radiation environment measured with the Mars Science Laboratory's Curiosity rover." Science 343, 1244797 (2014).
URL: https://doi.org/10.1126/science.1244797. We did not open the paper.

| Value in the app | Quote | Open source |
|---|---|---|
| Dose equivalent: 0.64 ± 0.12 mSv for each day. Absorbed dose: 0.21 ± 0.04 mGy for each day, in tissue | "MSL-RAD measured a dose rate in tissue of 0.21 ± 0.04 mGy/day and a dose equivalent rate of 0.64 ± 0.12 mSv/day Hassler et al. 2014)." | Matthiä et al. 2016, caption of Fig. 11, and Table 2. Authors of the RAD team are among the authors. https://doi.org/10.1051/swsc/2016008 |
| 0.64 mSv for each day | "In cruise, the dose equivalent rate from GCR was found to be 1.84 mSv/day, and on the surface the rate is 0.64 mSv/day." | Zeitlin et al. 2014 (section 2.2) |
| 0.210 ± 0.040 mGy for each day | "the average GCR dose rate at Gale Crater varied between 0.210 ± 0.040 mGy/day" | Atri et al. 2022, arXiv:2208.00892, section 2.2 (cites Hassler et al. 2014) |
| Mean quality factor about 3.05 | "The <Q> value calculated based on the data shown in Fig. 5 is 3.05 ± 0.3 for the Martian surface case compared to 3.82 ± 0.3 for the cruise phase." | Guo et al. 2021, section 2.3. Matthiä et al. 2016, Table 2, gives 3.05 ± 0.26 |
| About 21 g/cm² of atmosphere above the instrument | "the vertical column depth of the Martian atmosphere averaged about 21 g/cm2 during this period" | Guo et al. 2021, section 2.2. Also Zeitlin et al. 2014: "RAD is shielded by about 20 g cm-2 of CO2" |
| Near a weak solar maximum | "MSL landed on Mars at a time that had been predicted to be near the maximum of Cycle 24 solar activity. However, the Cycle 24 maximum has proven to be extraordinarily weak by historical standards, resulting in GCR dose rates that are higher than would have been expected based on previous cycles." | Zeitlin et al. 2014, section "Highlights from the Surface Mission" |

A check of our own: 0.21 mGy × 3.05 = 0.64 mSv.

Notes:

- The press release of the team gives another number: "an average GCR dose equivalent rate of 0.67 millisieverts per day from August 2012 to June 2013 on the Martian surface" (Southwest Research Institute, December 2013, as a web search showed it. We did not open the page). The papers of the team use 0.64. The app uses 0.64.
- The time of the measurement, "August 2012 to June 2013", is from that press release.
- In later years the team measured a lower quality factor on the surface: "in more recent data average about 2.3" (Guo et al. 2021, section 2.3). The surface dose also rose as the Sun became less active. The app has one surface rate only, for the time near solar maximum.

## 4. ExoMars TGO cruise (`tgo.ts`, `liulin-cruise.json`)

### 4.1 The paper: Semkova et al. 2018

Semkova, J., Koleva, R., Benghin, V., et al. "Charged particles radiation measurements with Liulin-MO dosimeter of FREND instrument aboard ExoMars Trace Gas Orbiter during the transit and in high elliptic Mars orbit." Icarus 303, 53–66 (2018).
URL: https://doi.org/10.1016/j.icarus.2017.12.034. We could not open the paper or its abstract page (the publisher and the NASA ADS page refuse a program).

A web search showed these sentences of the abstract (NASA ADS record 2018Icar..303...53S). We did not read them on the page itself:
"The average measured dose rate in Si from GCR during the transit to Mars for the period April 22-September 15, 2016 is 372 ± 37 μGy d−1 and 390 ± 39 μGy d−1 in two perpendicular directions." The same abstract gives the dose equivalent rate: "about 2 ± 0.3 mSv d−1".

### 4.2 Where we confirmed each number

| Value in the app | How we confirmed it |
|---|---|
| 372 ± 37 and 390 ± 39 µGy for each day, in silicon, two directions | Our own mean of the data file of the team (section 4.3): 370.9 and 389.3 µGy for each day for the columns "Dose AB" and "Dose CD". The ± values are not in the file. They are 10% of the values |
| The app value: 0.381 ± 0.038 mGy for each day | Our arithmetic: the mean of 372 and 390, and the mean of 37 and 39. The mean of our daily series is 0.380. The team gives one value for the same period in 2025: "April-September, 2016, (GCR, no SEPs) - first half of decreasing phase of cycle 24 [...] 15.9 ± 1.6" µGy for each hour, "free space at 1.5 AU" (slides of Semkova et al., 17th workshop "Solar Influences on the Magnetosphere, Ionosphere and Atmosphere", 2025, table "Total dose rate during different phases of the solar cycles 24 and 25", https://www.spaceclimate.bas.bg/ws-sozopol/pdf/17th/Wednesday/Semkova.pdf). 15.9 × 24 = 382 µGy for each day |
| Dose equivalent: about 2.0 ± 0.3 mSv for each day | "The measured dose equivalent rate from GCRs is about 2.0 ± 0.3 mSv/day for the cruise period from April 22 until September 15, 2016, somewhat higher than the rate of 1.58 ± 0.22 mSv/day measured by MSL/RAD in 2012." Guo et al. 2021, section 8.1.1 |
| The quality factor of the cruise | **Not confirmed.** We could not read it. The app gives no number. For the later orbit around Mars the team gives "quality factor Q 3.5±0.26" (EPSC2020-50, https://meetingorganizer.copernicus.org/EPSC2020/EPSC2020-50.html). The app does not use it |
| Dose in silicon | The source page of the instrument: "The absorbed dose in a silicon detector D Si [Gy] is calculated by dividing the summarized energy deposition in the spectrum in Joules to the mass of the detector in kilograms" (http://esa-pro.space.bas.bg/node/82) |
| Measured from 22 April to 15 September 2016, pause from 19 July to 11 August, no solar particle event | "From 22.04.2016 to 18.07.2016 one of the 3He and the scintillate detectors of FREND, as well as Liulin-MO were turned on almost continuously. From 19.07.2016 to 11.08.2016 during Deep Space Maneuvers of TGO all FREND modules were turned off. From 11.08.2016 to 15.09.2016 Liulin-MO was turned on periodically. The Liulin-MO data for the period 22.04 - 15.09 corresponds to TGO cruise to Mars. During that cruise the dosimeter has measured the dosimetric parameters of GCR. No SPE were registered by the dosimeter." Liulin database user manual (30 July 2018), section 5.10, page 54. http://esa-pro.space.bas.bg/sites/default/files/Liulin_database_user_manual_August_2018.pdf |
| Where the instrument sits, and its shielding | "Place, Shielding [g cm-2]: Outside the ExoMars TGO satellite on FREND Instrument 1-100 g cm-2" (user manual, section 5.10, and http://esa-pro.space.bas.bg/node/82). "The shielding distribution covers a thickness range from 0.9 to 178 g cm-2. The mean shielding is about 20 g cm-2 [Semkova et al, 2021]." (Semkova et al. 2025, proceedings, section 2, https://www.spaceclimate.bas.bg/ws-sozopol/pdf/Articles/Semkova2025.pdf) |
| The paper of 2018 gave about 10 g/cm² | "The averaged spacecraft shielding around the Liulin-MO detectors is about 10 g/cm2 which is smaller than the mean depth within RAD's FOV, but close to the median depth." Guo et al. 2021, section 8.1.1, which cites Semkova et al. 2018 |
| Declining phase of solar cycle 24 | "the Liulin-MO detectors (Semkova et al. 2018) on board the Exomars Trace Gas Orbiter (TGO) launched on March 14, 2016 and injected into orbit around Mars on October 19 and thus measuring the cruise radiation during the declining phase of Solar cycle 24" Guo et al. 2021, section 8 |
| The Sun explains the difference between TGO and MSL | "The difference is mainly driven by the difference in solar modulation in the two time periods. [...] This seems to suggest that the different shielding conditions of TGO and MSL did not significantly influence the GCR radiation environment therein." Guo et al. 2021, section 8.1.1 |
| ESA: at least 60% of the career limit | "The results imply that on a six-month journey to the Red Planet, and assuming six-months back again, an astronaut could be exposed to at least 60% of the total radiation dose limit recommended for their entire career." Also: "The ExoMars measurements cover a period of declining solar activity, corresponding to a high radiation dose." ESA, 19 September 2018. https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Exploration/ExoMars/ExoMars_highlights_radiation_risk_for_Mars_astronauts_and_watches_as_dust_storm_subsides. ESA does not name the limit |

Liulin-MO is a Bulgarian instrument (Space Research and Technology Institute of the Bulgarian Academy of Sciences, SRTI-BAS). It is a module of the Russian FREND instrument (Space Research Institute, Moscow) on the orbiter of ESA and Roscosmos.

### 4.3 The data file `liulin-cruise.json`

Source page: http://esa-pro.space.bas.bg/datasources/LIULIN_MO. File: http://esa-pro.space.bas.bg/sites/default/files/Liulin_MO_cruise.zip (one file, `Liulin_MO_cruise.csv`, 2,163 lines, no header line).

The format, as the page says: "Cruise to Mars: Date, Time, X_tgo km, Y_tgo km, Z_tgo km, TGO-Earth km, TGO_Mars km, Flux AB, Flux CD, Dose AB, Dose CD." A line of the file: `22/04/2016 13:15:38,-136828896.35, -86721481.78, -6669500.61, 13397338.62, 85852572.07, 2.96, 3.13, 15.26, 15.01`.

What the script does (`node server/scripts/fetch-liulin.ts`):

1. It reads the columns "Dose AB" and "Dose CD": the dose rate in the two detector pairs, one value for each hour.
2. **The unit is our reading.** The file and the page do not name the unit of the dose columns. We read it as µGy for each hour, in silicon. The check: the means of the file are then 370.9 and 389.3 µGy for each day, and the paper gives 372 and 390. The script stops if the means differ from the paper by more than 5%.
3. It removes 71 repeated lines. On 3, 4, and 5 June 2016 the file holds each hourly value two times, about 30 seconds apart.
4. A daily value is the mean of the hourly values of one UTC day, times 24 hours, divided by 1000 (mGy). `total` is the mean of the two detectors. `parts.ab` and `parts.cd` are the two detectors.
5. A day with fewer than 12 hourly values is `null` (no data). The series has 146 days, from 23 April to 15 September 2016. 90 days have data.
6. The source gives times with no zone. We read them as UTC.

Result: mean 0.380 mGy for each day, lowest day 0.358, highest day 0.410.

**For the lead:** `total` holds `null` for the days with no data, so its type is `(number | null)[]`, not `number[]`. The first value is 40 days after the launch day (`missionDayOfStart`).

**Terms of use.** The site names no licence. The user manual says for this data set: "Please acknowledge data provider: 1. Jordanka Semkova, SRTI-BAS [...] 2. Victor Benghin, IBMP-RAS". The home page says: "The ownership of Liulin-MO data belongs to SRTI-BAS, IKI-Moscow and IMBP-Moscow", and the aim of the database is "a web-based database that will serve users from all over the world". Semkova et al. 2025 point readers to the same page: "The data from the Liulin-MO measurements used in this paper are part of the Unified web-based database with Liulin-type instruments available at https://esa-pro.space.bas.bg/datasources." The data file carries the credit line in `source.credit`. The page must show it.

### 4.4 Dates and length

- Launch on 14 March 2016, orbit around Mars on 19 October 2016: Guo et al. 2021 (quote in section 4.2).
- "TGO's Mars orbit insertion burn lasted from 13:05 to 15:24 GMT on 19 October" (ESA, 19 October 2016, https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Exploration/ExoMars/ExoMars_TGO_reaches_Mars_orbit_while_EDM_situation_under_assessment).
- The trajectory file `tgo.json` (JPL Horizons) runs from 14 March 2016, 20:13 UTC, to 19 October 2016, 14:52 UTC. This is 218.8 days. The preset uses 219 days.
- The orbiter was 1.08 AU from the Sun on 22 April and 1.38 AU on 15 September 2016 (our arithmetic from the X, Y, Z columns of the data file).

## 5. The flags of the Mars presets

| Flag | Source |
|---|---|
| (a) The dose line of the cruise is flat | "The radial gradient of galactic cosmic rays in the inner heliosphere has been studied by Gieseler et al. (2008) and they estimated GCR flux increases at a radial gradient rate of 4.5% per AU in the inner heliosphere. Considering that the spacecraft moved progressively outward in the solar system from 1 AU to about 1.5 AU, we corrected this gradient increase on the measured dose rate. This effect is however very small (within 2% of correction) and has only affected slightly the analysis that follows." Guo et al. 2015, section 2.2 |
| (a) Our reading of the Liulin-MO file | The mean dose rate was 374 µGy for each day between 1.05 and 1.15 AU (22 April to 16 May 2016) and 386 µGy between 1.35 and 1.40 AU (16 August to 15 September 2016). This is a rise of 3%. A part of it comes from the Sun, which became less active in these months. This is our arithmetic, not a result of the team |
| (b) MSL near a weak solar maximum, TGO in the declining phase | Sections 2.2 and 4.2 |
| (c) Different shielding | Sections 2.2 and 4.2 |
| (d) mGy and mSv | Guo et al. 2021, section 2.3: "Multiplying the measured dose with the above estimated <Q>, we can obtain the dose equivalent (in sievert or Sv)" |
| (d) Silicon and water | "For a given incident flux, the dose rate in silicon is generally less than the dose rate in plastic because of the comparatively large ionization potential of silicon." Guo et al. 2021, section 4.3.5. RAD: 332 µGy for each day in silicon, 481 in water (section 2.2). Liulin-MO: 372 and 390 in silicon |
| (e) A storm in the simulator is a what-if scenario | Our statement. The real flights: five events for MSL (24.7 mSv), none for the TGO instrument (sections 2.2 and 4.2) |
| The limit is for effective dose | Section 1 |
| The team lowered the cruise value of MSL | Section 2.3 |
| No crew | MSL and TGO carried no crew. The crew of 4 and the cabin are for the CO2 and O2 forecast (section 6) |

**A trap for the page.** In the crewed reference preset the solar cycle setting changes the instrument of the two flights. In mSv this works: 1.84 (near solar maximum) and 2.0 (declining phase). In mGy it misleads: 0.481 (RAD, in water) and 0.381 (Liulin-MO, in silicon), so the declining phase looks lower. A flag of the preset says so. The lead can decide to show the solar cycle comparison in mSv only.

## 6. Crew and cabin of the Mars presets

| Value in the app | Quote | Source |
|---|---|---|
| Crew 4 | "A deep space mission is envisioned to have a crew of 4 and a duration of 3 years." | Takada, K., Hornyak, D., Garr, J., et al. "Status of the Advanced Oxygen Generation Assembly." 52nd International Conference on Environmental Systems, ICES-2023-311 (2023), introduction. https://ntrs.nasa.gov/citations/20230008013 |
| Cabin air volume 100 m³ | Figure 1, "Mars transit habitat baseball card - 1100 days": "Max Crew Capacity 4", "Max Crewed Mission Duration 1100 d", "Destination Earth-Mars Transit", "Pressurized Vol. 210.7 m3", "Habitable Vol. 100.0 m3". The text: "25 m3/person habitable volume" and "Each of these habitats support a crew of four". | Simon, M. A., Toups, L., Howe, A. S., Wald, S. "Evolvable Mars Campaign Long Duration Habitation Strategies: Architectural Approaches to Enable Human Exploration Missions." AIAA SPACE 2015. https://ntrs.nasa.gov/citations/20160006311 |

**Assumption:** the air volume of the cabin is the habitable volume of this design (100 m³). The design gives no free air volume. The pressurized volume (210.7 m³) holds equipment and stores too. This is a design study of 2015, not a habitat that NASA builds. A newer NASA study gives larger habitats, for example "a pressurized volume of about 317 cubic meters" for four crew and 1,200 days (Gateway Lunar Habitat Modules as the Basis for a Modular Mars Transit Habitat, 2020, https://ntrs.nasa.gov/citations/20200002332). We did not use it, because it gives no habitable volume in the part that we read.

The custom preset uses the same crew and cabin.

## 7. ISS, 6 months (`iss.ts`, `eda-rr9-radiation.json`)

### 7.1 The record

NASA Open Science Data Repository, Environmental Data Application (EDA), mission Rodent Research-9 (RR-9), radiation data.
URL: https://visualization.osdr.nasa.gov/eda/dashboard_RR-9
Credit: "Data and visualizations are courtesy of the Environmental Data Application (EDA) (https://visualization.osdr.nasa.gov/eda/)"

The EDA has no download route for a program. The script reads the data block inside the page (`radiation_data`: `time`, `gcr`, `saa`, `total`, `accumulated`, `milestones`).

| Fact | Quote | Place in the source |
|---|---|---|
| The unit is mGy for each day | `yaxis = "Dose [mGy/day]"` | The chart code of the EDA, https://visualization.osdr.nasa.gov/eda/static/js/radiation_plots.js |
| Absorbed dose, in water, preliminary, from instruments on the station | "Radiation dose received by the samples is calculated through dosimetry techniques. Doses are in water based on standard conversion from dose in silicon. Doses include approximate dose received on launch vehicle before transfer to the ISS. Since there was no dosimetry on the launch vehicle, dose is approximated based on average values in the US Lab. Data are cumulative absorbed doses from preliminary analysis of results from instruments on the International Space Station, analyzed by subject matter experts from the Space Radiation Analysis Group (SRAG), NASA-JSC." | The "info" text of "Radiation data" on the page |
| The total is the sum of the two parts | "The total radiation dose is the sum of the GCR and SAA absorbed doses." | The "info" text of "Total Radiation Dose" |
| The window | Milestones of the radiation data: "Animal transfer to ISS": 2017-08-18, "Undock": 2017-09-16, "LAR Return": 2017-09-17 | The data block |

The source does not name the instruments, and it gives no dose equivalent (mSv). So the ISS preset has a value in mGy only.

What the script does (`node server/scripts/fetch-eda-radiation.ts`): it keeps the days from the transfer to the undock (30 days, 18 August to 16 September 2017), checks that each total is the sum of its two parts, and writes the values with 5 decimals.

| Value in the app | Where it comes from |
|---|---|
| Rate of the phase: 0.32 mGy for each day | Our arithmetic: the mean of the 30 daily totals is 0.3197. GCR part 0.138, SAA part 0.181 |
| Without the day of the solar particle event: 0.31 | Our arithmetic: 0.3119 |
| 180 days | The choice of the team lead for a stay of six months. The record has 30 days |

The radiation dates of RR-9 are in 2017 and are right. (The CO2 telemetry of the same page is dated one year too late. See the README.)

### 7.2 The day with the high value

On 11 September 2017 the GCR part is 0.390 mGy. The median of the GCR part is 0.126 mGy. On 12 September it is 0.164 mGy.

This is the time of the solar particle event of 10 September 2017:

- "an SPE was observed in September 2017, which was (a) a ground-level enhancement, (b) measured with various radiation detector systems onboard the ISS, and (c) observed on the surface of Mars. This paper gives an overview of the 10 September 2017 SPE measured with the DOSIS 3D-DOSTEL and the ISS-RAD (Radiation Assessment Detector) instruments, both located at this time in close proximity to each other in the Columbus Laboratory of the ISS. The additional dose received during the SPE was 146.2 μGy in Si as measured by ISS-RAD and 67.8 μGy in Si as measured by the DOSIS 3D-DOSTEL instruments. In comparison, the dose measured on the surface of Mars with the Mars Science Laboratory-RAD instrument accounted to 418 μGy in Si." Berger, T., Matthiä, D., Burmeister, S., et al. "The Solar Particle Event on 10 September 2017 as observed onboard the International Space Station (ISS)." Space Weather 16, 1173–1189 (2018), abstract. https://doi.org/10.1029/2018SW001920
- At Mars: "The SEP onset as seen in the dose rate data is about 19:50UT on 10 September. The event peaked on 11 September" (Guo et al. 2021, section 7.3.1).
- The solar cycle: "Even though we are currently approaching the next solar minimum" (Berger et al. 2018, abstract).

**Our reading, not a statement of the source:** the EDA does not label the day, so the link between the value of 11 September and the event is ours. The EDA counts the extra dose in its GCR part. The extra dose of the record on 11 and 12 September is about 0.30 mGy in water (our arithmetic), which is more than the 0.146 mGy in silicon of ISS-RAD. We did not find the reason. The instruments and their places can differ.

### 7.3 Crew and cabin

These two values are from the README of the project (the CO2 work of the team lead). We did not check them again.

- Cabin 916 m³: NASA Reference Guide to the International Space Station, 2015, page 78: "a pressurized volume of approximately 916 m3". https://www.nasa.gov/wp-content/uploads/2017/09/np-2015-05-022-jsc-iss-guide-2015-update-111015-508c.pdf. **Assumption:** all of it is air.
- Crew 6: the crew of the station in the RR-9 window, with 3 persons from 2 to 13 September 2017. NASA releases: https://www.nasa.gov/news-release/three-international-space-station-crewmates-safely-return-to-earth/ and https://www.nasa.gov/news-release/three-new-crew-members-arrive-at-international-space-station/

### 7.4 OSDR RadLab

The OSDR RadLab (https://visualization.osdr.nasa.gov/radlab/) was not reachable on 15 November 2026: the server answered "500 Internal Server Error" at `/radlab/gui/overview/`. We added no data from it.

## 8. Values that we could not confirm in a text that we read

| Value | State |
|---|---|
| ± 0.33 of the MSL cruise dose equivalent (1.84 ± 0.33 mSv for each day) | Not read. It agrees with the abstract of the paper (0.66 ± 0.12 Sv for 360 days). A web search showed "1.84 ± 0.30" for the table of Hassler et al. 2014. The two papers can give different ± values |
| ± 0.080 of the MSL cruise absorbed dose | Read only in a paper of another team that cites it as "0.48 ± 0.08 mGy/day" |
| "372 ± 37" and "390 ± 39" as words of Semkova et al. 2018 | Not read on the page of the paper. A web search showed the sentence of the abstract. Our own means of the data file of the team give 371 and 389 |
| The mean quality factor of the TGO cruise | Not found. The app gives no number |
| The time of the surface measurement of Hassler et al. 2014 (August 2012 to June 2013, about 300 Martian days) | From a press release and from web search results, not from the paper |
| The surface value 0.67 mSv of the press release against 0.64 of the papers | We did not find the reason. The app uses 0.64 |
| The instruments of the EDA radiation record | The source does not name them |
| Crew 6 and cabin 916 m³ of the station | Taken from the README, not checked again |
| The licence of the Liulin-MO data | The site names none. It asks for an acknowledgement (section 4.3) |

## 9. Not done

- The count of solar energetic particle events for each year from NASA DONKI (`web/src/trip/data/donki-sep.json`). The API of api.nasa.gov now allows a range of 60 days for each request ("Date range cannot exceed 60 days"), and the demo key allows about 30 requests in an hour. Eleven years need about 67 requests. The direct server of DONKI (kauai.ccmc.gsfc.nasa.gov) did not answer.
