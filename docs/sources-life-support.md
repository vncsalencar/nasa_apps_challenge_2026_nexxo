# Life support model: sources and assumptions

This file is for `shared/trip/lifesupport.ts` and `shared/trip/calibration.ts`.
It gives each number of the model with the exact quote, the place in the source, and the URL.
It also lists each assumption, and each place where the source says something that we did not expect.

## 1. The model

The cabin is one volume of air that is fully mixed. The model moves in steps of 1 minute.

- CO2 change = CO2 that the crew makes (by activity) − CO2 that the scrubber removes.
- O2 change = O2 from the generator (or from the bottles) − O2 that the crew uses (by activity).

The crew has three activities: sleep, nominal, and exercise. The schedule (`Schedule`) is the day of crew member 0.

**Assumption: the crew members exercise one after the other, because the spacecraft has one exercise device.** For each session of the schedule, crew member 0 starts at the hour of the schedule, crew member 1 starts `exerciseMinutes` later, and so on. All crew members sleep at the same time. If a shifted session reaches the sleep time, the exercise still happens. So at each minute the CO2 and O2 rates of the crew are the sum over the crew members, each one by its own activity.

- `activityAt` gives the activity of crew member 0. `dailyTotals` gives the day of one person.
- `crewActivityAt` gives what the crew does as a group: "sleep" when all sleep, "exercise" when at least one crew member exercises, else "nominal". The forecast uses it for `now.activity` and for the chart.
- `crewDailyTotals` gives the day of the whole crew. It is the crew count × `dailyTotals`, unless a shifted session reaches the sleep time.

The CO2 part uses the cabin model of `shared/co2.ts`. Each step is the exact solution of that equation for 1 minute. So with a constant activity the model gives the balance of `modelOf`.

The pressure of 1 kg of gas comes from the ideal gas law: pressure = amount × R × temperature / volume. For CO2 the molar mass is 0.04401 kg for each mol (`mmHgPerKg` of `shared/co2.ts`). For O2 it is 0.031998 kg for each mol (`mmHgPerKgO2`).

## 2. Crew: O2 use and CO2 output

### 2.1 Profile `hidh`: NASA handbook rates

Source: NASA Human Integration Design Handbook (HIDH), NASA/SP-2010-3407 revision 1 (2014), section 6.2.3.1.4, table 6.2-10 "Crew-Induced Metabolic Loads for a Standard Mission Day with Exercise", page 361.
URL: https://www.nasa.gov/wp-content/uploads/2015/03/human_integration_design_handbook_revision_1.pdf

The same rows are in the NASA brief OCHMO-TB-004 "Carbon Dioxide (CO2)", revision D, page 6.
URL: https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf

The rates are for one person, in kg for each minute × 10⁻⁴. We checked each number in both documents.

| Activity | Hours in the handbook day | O2 use | CO2 output | Row of table 6.2-10 |
|---|---|---|---|---|
| Sleep | 8 | 3.60 | 4.55 | "Sleep 8 ... 3.60 (7.94) 4.55 (10.03)" |
| Nominal | 14.5, plus 1 hour of recovery at the same rates | 5.68 | 7.20 | "Nominal 14.5 ... 5.68 (12.55) 7.20 (15.87)" |
| Exercise at 75% of VO2max | 0.5 | 39.40 | 49.85 | "Exercise 0 - 15 min at 75% VO2max 0.25 ... 39.40 (86.86) 49.85 (109.90)", and the same for 15 to 30 minutes |
| Total for each day, with exercise | 24 | 0.82 kg | 1.04 kg | "Total Per Day(3) 24 ... 0.82 (1.80) 1.04 (2.29)" |
| Total for each day, no exercise (table 6.2-11) | 24 | 0.72 kg | 0.91 kg | "Total Per Day(3) 24 ... 0.72 (1.59) 0.91 (2.00)" |

More quotes from the handbook:

- Page 360: "For purposes of spacecraft design modeling, O2 consumption and CO2 output are considered to be at the 75% VO2max level during exercise, and return to nominal values when exercise has stopped."
- Page 360, the list of what the table assumes: "An 82-kg (181-lb) crewmember", "A 30-minute exercise period", "Respiratory quotient = 0.92 (applied volumetrically)".
- Page 361, footnote 4: "A respiratory quotient of 0.92 was assumed for the oxygen consumption and carbon dioxide output determinations."

The respiratory quotient is the CO2 that the body makes divided by the O2 that it uses, in mol.

Note: the table in OCHMO-TB-004 gives 0.25 hours for the row "Nominal". The handbook gives 14.5 hours. The rates and the totals are the same in both.

**The handbook day and the day of this app are different.**

| Day | Sleep | Exercise | O2 for one person | CO2 for one person |
|---|---|---|---|---|
| Handbook, table 6.2-10 | 8 hours | 1 session of 30 minutes | 0.82 kg (the sum of the rows is 0.8192) | 1.04 kg (the sum is 1.0376) |
| Handbook, table 6.2-11 | 8 hours | none | 0.72 kg (0.7181) | 0.91 kg (0.9096) |
| This app, `DEFAULT_SCHEDULE` | 8 hours | 2 sessions of 30 minutes | 0.92 kg (0.9204) | 1.17 kg (1.1655) |

So the default day of this app has 60 minutes of exercise, and it gives 12% more CO2 than the handbook day. The model does not scale the rates. `dailyTotals` gives the sum of the minutes of the schedule × the rate of each activity.

### 2.2 Profile `exercise90`: a long mission with 90 minutes of exercise

Source: Ewert and Stromgren, "Astronaut Mass Balance for Long Duration Missions", 49th International Conference on Environmental Systems, ICES-2019-126, 2019. NTRS 20190027563.
URL: https://ntrs.nasa.gov/citations/20190027563 (PDF: https://ntrs.nasa.gov/api/citations/20190027563/downloads/20190027563.pdf)

Quotes, page 3, section II.B:

- "Table 6.2-10 in the HIDH was developed about 12 years ago, primarily for the short duration Orion missions, and includes only 30 minutes of exercise per person per day. The current recommendation for missions over 30 days is 90 minutes of exercise (30 minutes aerobic plus 60 minutes resistive) per person per day."
- "Here we focus on the daily total outputs of 1.08 kg of CO2, 2.53 kg of combined perspiration and respiration water vapor, and 0.51 kg of liquid sweat."
- "A daily O2 requirement of 0.89 kg is also predicted by the model."

Figure 1 on page 2 shows the same values: "0.89 kg Oxygen" and "CO2 1.08 kg".

**The O2 number of this document is 0.89 kg, not 0.85 kg.** The value 0.85 kg is in a different paper, about the oxygen generator (see 4.2).

The paper gives rates by activity, in table 1 on page 4 ("Updated metabolic profile for an 82kg astronaut exercising 90 minutes a day"), in g for each minute:

| Activity in table 1 | Hours | O2 use | CO2 output |
|---|---|---|---|
| Nominal, and recovery | 14.5 | 0.59 | 0.69 |
| Exercise - Aerobic | 0.5 | 3.99 | 5.22 |
| Exercise - Resistance | 1.0 | 1.43 | 1.89 |
| Sleep | 8 | 0.37 | 0.44 |
| "Daily results" | 24 | 0.89 kg | 1.08 kg |

The sum of the rows is 0.8964 kg of O2 and 1.0815 kg of CO2. The NASA Life Support Baseline Values and Assumptions Document, NASA/TP-2015-218570 revision 2 (2022), has the same rates in table 3-25 (page 49) with the totals "0.90 kg" and "1.08 kg", and it gives 0.895 and 1.085 kg in table 3-31 (page 58). URL: https://ntrs.nasa.gov/citations/20210024855

**How the profile maps to the three activities of this app (our choice):**

- Sleep and nominal: the rates of table 1, with no change.
- Exercise: this app has one exercise rate, and the paper has two. We use the mean of the 90 minutes:
  O2 = (30 × 3.99 + 60 × 1.43) / 90 = 2.283 g for each minute. CO2 = (30 × 5.22 + 60 × 1.89) / 90 = 3.000 g for each minute.

With 90 minutes of exercise in the schedule (for example 2 sessions of 45 minutes), the model gives the totals of the paper: 0.896 kg of O2 and 1.08 kg of CO2.
With `DEFAULT_SCHEDULE` (60 minutes) the same rates give 0.85 kg of O2 and 1.01 kg of CO2. So the profile gives "1.08 kg" only when the schedule has 90 minutes of exercise.

## 3. CO2 removal

Source: El Sherif and Knox, "International Space Station Carbon Dioxide Removal Assembly (ISS CDRA) Concepts and Advancements", 2005, NTRS 20050210002, equation 1. URL: https://ntrs.nasa.gov/citations/20050210002
Also OCHMO-TB-004 revision D, page 8.

- OCHMO-TB-004, page 8: "CDRA continuously removes six person-equivalent of CO2, when operating with both CO2 removal beds (dual beds functioning)." and "Minimum ISS CO2 removal rate is based on the equation for human equivalent unit (HEU) with the CO2 partial pressure ranging from 2.0 to 3.9 mmHg."
- El Sherif and Knox: "Eq 1 HEUs 1.723 * (pp CO2, mmHg) - 0.37975" and "Where 1 HEU is approximately 1 kg CO2 /day".
- El Sherif and Knox: "During single-bed operation, the system provides 3 person-equivalent removal capabilities."

The model:

- removal in kg for each day = units × (1.723 × ppCO2 − 0.37975), and never below 0.
- units = (both beds: 1, one bed: 0.5, off: 0) × `scrubberUnits` + `otherUnits`.

`scrubberUnits` is how many scrubbers like one CDRA the cabin has. A failure of the scrubber (one bed, or off) applies to all of them. `otherUnits` is other CO2 removal that always works. Only the station has it. If it is absent, it is 0.

The numbers are `CDRA_RATE` and `DEFAULT_PARAMS.oneBedShare` of `shared/co2.ts`. No system adds CO2.

Example with nothing wrong: 4 persons, `scrubberUnits` 2, the handbook rates and `DEFAULT_SCHEDULE`.

| Cabin | Daily mean | Highest CO2 of the day | Highest 1-hour average |
|---|---|---|---|
| 100 m³ | 1.57 mmHg | 2.68 mmHg | 2.56 mmHg |
| 9 m³ | 1.57 mmHg | 3.21 mmHg | 3.21 mmHg |

The daily mean does not depend on the volume. In the small cabin the CO2 follows the crew in minutes, so it stays at 3.21 mmHg while one person exercises. This is above the limit of 3.0 mmHg for the 1-hour average.

## 4. O2

### 4.1 The O2 range, and which O2 pressure the model shows

Source: NASA-STD-3001 Volume 2, revision F (approved 2026-07-14), section 6.2.1.2, requirement [V2 6003], page 49, and table 6.2-1 "Inspired Oxygen Partial Pressure Exposure Ranges", page 51.
URL: https://standards.nasa.gov/system/files/tmp/NASA-STD-3001%20Vol%202%20Rev%20F.pdf
The NASA brief OCHMO-TB-003 "Habitable Atmosphere" (page 10) shows the same requirement and table from revision D.

- "[V2 6003] The system shall maintain inspired oxygen partial pressure (PIO2) in accordance with Table 6.2-1—Inspired Oxygen Partial Pressure Exposure Ranges."
- Table 6.2-1: "Inspired O2 partial pressure PIO2 = (PB − 47) ∗ FIO2", with "PB – Ambient Barometric Pressure (mmHg)" and "FIO2 – The dry-gas decimal fraction of ambient O2".
- Table 6.2-1, row "PIO2 (mmHg)": "Normoxia Target Range 145-155", "Indefinite Hyperoxia Upper Limit 356", "Short-Term Hyperoxia Upper Limit 791", "Mild Hypoxia Lower Limit 127****".
- Footnote: "**** 1-hour time-weighted average with an absolute lower limit for the minimum hypoxia range of 122 mmHg/2.36 psia".

**The range 145 to 155 mmHg is correct. But it is a range of the inspired O2 partial pressure (PIO2), not of the O2 partial pressure of the cabin gas.** The 47 mmHg is the pressure of the water vapor in the airways. For example, air at sea level has 159 mmHg of O2 in the dry gas (20.95% of 760 mmHg), and its PIO2 is 149 mmHg.

So each O2 value of the model (`o2MmHg`) is PIO2, and `O2_RANGE_MMHG` applies to it with no change. `inspiredO2MmHg` and `cabinO2MmHg` convert between the two. At 760 mmHg, the range 145 to 155 mmHg of PIO2 is 154.6 to 165.2 mmHg of O2 in the dry cabin gas.

The cabin starts at the middle of the range, 150 mmHg. More exactly: the mean of the nominal day is 150 mmHg.

`O2_SOURCE` also holds 127 mmHg (the lower limit for mild hypoxia), 122 mmHg (the absolute lower limit), and 356 mmHg (the upper limit for an unlimited time).

### 4.2 The oxygen generator (OGA)

Source: Takada, Hornyak, Garr, Van Keuren and others, "Status of the Advanced Oxygen Generation Assembly", 52nd International Conference on Environmental Systems, ICES-2023-311, 2023. NTRS 20230008013.
URL: https://ntrs.nasa.gov/citations/20230008013

- Page 2: "The ISS OGA generates oxygen at a selectable rate, up to 20.4 lb/day (9.25 kg/day), at 46.9 A PSM current, 100% production rate. This can support 10.88 crew (assumes 1.874 lb [0.85 kg] oxygen/day/crew metabolic rate)."
- Page 1: "A deep space mission is envisioned to have a crew of 4 and a duration of 3 years. The system design will be based on the International Space Station (ISS) Oxygen Generation Assembly (OGA)".

So 9.25 kg for each day is confirmed, and this paper is the source of "0.85 kg of O2". It is the O2 use of one person that NASA assumes to say how many persons the generator can supply.

The model: with the generator on, it makes `ogaKgPerDay` kg each day at a constant rate. `null` means: as much as the crew uses in a full day with the schedule, so the O2 is level from day to day. Inside a day the O2 still moves a little: it falls during exercise and it rises during sleep.

### 4.3 Bottles

With the generator off, the bottles give exactly what the crew uses, minute by minute. So the O2 does not move until the bottles are empty. Then the O2 falls at the rate that the crew uses. With the generator on, the model does not use the bottles. This behavior is an assumption of this app, not a value from a source.

### 4.4 The Sabatier reactor and the O2 loop closure

Source: European Space Agency, "Advanced Closed Loop System" (ACLS), web page.
URL: https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Research/Advanced_Closed_Loop_System

- "The new system recycles half of the carbon dioxide thereby saving about 400 l of water that needs to be launched to the International Space Station each year."
- "it will be part of the Space Station's life support system and produce oxygen for three astronauts"
- "Hydrogen, coming from the Oxygen Generation Assembly, and carbon dioxide react over a catalyst to form water and methane. The water is condensed and separated from the product gas stream and fed back to the electrolyser. Methane is vented into space together with excess carbon dioxide, which explains why only 50% of the recovered CO2 is actually recovered."
- "Can generate about 50% of the water needed for oxygen production on the Space Station"

Ewert and Stromgren (see 2.2), page 5, give the reason for the 50%: "The hydrogen required for this reaction is supplied from the byproduct of splitting water to produce oxygen, and this becomes the limiting factor. Extra CO2 is vented overboard along with the methane (CH4)". Their equation 1 is "4 H2 + CO2 → 2 H2O + CH4".

The chemistry: CO2 + 4 H2 → CH4 + 2 H2O in the reactor, then 2 H2O → 2 H2 + O2 in the generator. So each mol of CO2 that reacts gives 1 mol of O2 back. The generator makes 2 mol of H2 for each mol of O2, and the reactor needs 4 mol of H2 for each mol of CO2. So the reactor can return at most half of the O2 that the generator makes.

The formula of `o2LoopClosure`, all amounts in mol for each day:

```
O2 back = the smaller of
            0.5 × CO2 of min(crew, 3) persons × 1      (ESA: half of the CO2, one system serves 3 persons)
            0.5 × O2 that the generator makes          (the hydrogen limit)
closure = O2 back / O2 that the crew uses              (0 with the reactor off, and 0 with the generator off)
```

The CO2 and O2 amounts come from `dailyTotals` of the settings. For example, with the handbook rates (0.92 mol of CO2 for each mol of O2): 46% for a crew of 3 or less, 35% for a crew of 4, 23% for a crew of 6. This agrees with the "about 50%" of ESA for the three astronauts that the system serves.

The reactor changes this number only. It does not change the gas in the cabin.

## 5. The daily pattern and the forecast

- Before `changedDay`, the cabin has the daily pattern of the nominal settings: the day that repeats. The model finds it by runs of one day until a run ends at its own start value (to 10⁻¹⁰ mmHg).
- From `changedDay` on, the model runs with the settings now. It starts from the state of the nominal pattern at that time of day, with the bottles full (`current.bottledO2Kg`).
- If the nominal settings have no day that repeats (no CO2 removal at all, or an O2 that is not level), the model uses the first day from 0 mmHg of CO2 and from 150 mmHg of O2 as the nominal day. The presets do not have such settings.
- Times are rounded to the minute. The fraction of `day` is the time of day.
- `hoursToCo2` and `hoursToO2` look 30 days ahead. They give the first time when the value crosses the target, from above or from below.
- Far after the change, the model does not make each minute again. When two days in a row change by the same amount (for example: the CO2 repeats, and the O2 falls by the same amount each day), it jumps over the days until a value comes near one of its limits. The tests compare this with a direct run, minute by minute.

## 6. The check against the real record (RR-9)

`issCalibration` runs the model over the window of the RR-9 record: 18 August 2017, 15:43 UTC, to 16 September 2017 (690 hours). README.md describes the record.

Settings: volume 916 m³, one CDRA with both beds (`scrubberUnits` 1) plus the other removal of the station (`otherUnits` = `ISS_OTHER_UNITS` = 0.66), `hidh` rates, `DEFAULT_SCHEDULE` in UTC, crew count from the NASA releases:

| From (UTC) | Crew | Source |
|---|---|---|
| Start of the record | 6 | The crew before 3 persons left: 3 persons left and 3 persons stayed (the two sources of the next row). |
| 2 September 2017, 21:58 | 3 | NASA space station blog: the three persons of Soyuz MS-04 "undocked from the International Space Station at 5:58 p.m. EDT". https://www.nasa.gov/blogs/spacestation/2017/09/02/expedition-52-trio-undocks-from-station/ . NASA release: "The three-person crew will operate the station until the arrival of" the next crew. https://www.nasa.gov/news-release/three-international-space-station-crewmates-safely-return-to-earth/ |
| 13 September 2017, 02:55 | 6 | NASA: Soyuz MS-06 docked "at 10:55 p.m. EDT Tuesday, Sept. 12", and the arrival "restores the station's crew to six". https://www.nasa.gov/news-release/three-new-crew-members-arrive-at-international-space-station/ |

The model gets the crew counts. It starts from its own daily pattern for 6 persons.

**One number is set from this record: the other CO2 removal of the station, `ISS_OTHER_UNITS` = 0.66.** The station also has a second CDRA and the Russian Vozdukh system (OCHMO-TB-004), and no source gives their removal rate. We set it so that the daily mean of the model with 6 persons is the mean of the real record with 6 persons before the undock (2.659 mmHg, 4,395 values):

```
removal = crew output:  (1 + other) × (1.723 × 2.659 − 0.37975) = 6 × 1.1655 kg each day
other = 6.993 / 4.202 − 1 = 0.664, rounded to 0.66
```

The CO2 page uses 1.04 kg of CO2 for each person and day, so its value for the same number is 0.5. This model has 1.1655 kg with `DEFAULT_SCHEDULE`, so it needs more removal for the same level.

**Result, hourly mean of the model against the real hourly mean:**

| Check | Real record | Model | Is it a test? |
|---|---|---|---|
| Whole record, 690 hours | | **RMS error 0.38 mmHg**, mean error −0.06 mmHg | In part |
| Level with 6 persons, before the undock (366 hours) | 2.66 mmHg | 2.67 mmHg, RMS error 0.25 mmHg | No: `ISS_OTHER_UNITS` was set to give this level |
| Fall after the crew went from 6 to 3, first 4 days | | RMS error 0.64 mmHg, mean error −0.56 mmHg | Yes |
| Level with 3 persons, from 3 days after the undock | 1.65 mmHg | 1.45 mmHg | Yes |
| Rise after the crew went from 3 to 6, last 3 days | | RMS error 0.60 mmHg, mean error +0.51 mmHg | Yes |

The calibrated "k" (`removalPerMmHgKgDay`) is (1 + 0.66) × 1.723 = 2.86 kg of CO2 for each day and each mmHg.

What this tells:

- The level with 6 persons is not a test, because one number was set to give it.
- The test is what the model does when the crew changes. It gets the level with 3 persons from the level with 6 persons with an error of 0.2 mmHg.
- The model is too fast for the two changes. It falls and rises in about 1 day. The real record needs about 2 days, and it stays high for more than one day after the crew left. The model does not know when the ground changed the CO2 removal.
- One sensor sees local effects: the air flow near it, people near it, and the cycle of the CDRA.

## 7. Assumptions and limits

1. The cabin is fully mixed. The real CO2 near the face can be higher, because CO2 stays in pockets where the air does not move in microgravity.
2. The model uses the CDRA equation also outside 2.0 to 3.9 mmHg.
3. The number of scrubbers of a cabin (`scrubberUnits`) is an assumption of the preset. No source gives it. The other removal of the station (`otherUnits`) is set from the RR-9 record (see 6).
4. The crew members exercise one after the other (see 1), and they all sleep at the same time. The model has one rate for each activity, the same for each person.
5. The generator makes O2 at a constant rate. A real cabin adds O2 when the pressure falls. So in a small cabin the O2 of the model moves more than a real cabin does: it rises in the sleep and falls in the day. For 4 persons: 148 to 152 mmHg in 100 m³, and 132 to 170 mmHg in 9 m³.
6. The total pressure of the cabin is constant. The model does not count nitrogen, water vapor in the cabin, or leaks.
7. No partial pressure goes above the total pressure, and no value goes below 0. The top of PIO2 is the total pressure − 47 mmHg.
8. The exercise rate of `exercise90` is a mean of two rates of the source (see 2.2).
9. The schedule of the calibration is in UTC. The real times of sleep and exercise of the crew in 2017 are not in the model.
10. Bottles: see 4.3. Loop closure: one system like the ACLS of ESA, see 4.4.

## 8. What the sources say that we did not expect

| We expected | The source says |
|---|---|
| 0.85 kg of O2 with the 1.08 kg of CO2 (NTRS 20190027563) | NTRS 20190027563 says 0.89 kg of O2. The 0.85 kg is in ICES-2023-311, as the O2 use that sizes the generator. |
| O2 range 145 to 155 mmHg | Correct, but for the inspired O2 partial pressure (PIO2), not for the O2 of the cabin gas. The model shows PIO2. |
| `exercise90` gives 1.08 kg of CO2 | Only with 90 minutes of exercise in the schedule. `DEFAULT_SCHEDULE` has 60 minutes and gives 1.01 kg. |
| The handbook day is the default day | The handbook day has 30 minutes of exercise. `DEFAULT_SCHEDULE` has 60 minutes and gives 0.92 kg of O2 and 1.17 kg of CO2. |
