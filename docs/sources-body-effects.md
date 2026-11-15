# Effects on the body: sources, rules, and limits of the data

This file is for `shared/trip/effects.ts`.
It gives each number and each statement of that file with the exact quote, the place in the source, and the URL.
It also gives the rule for the radiation units, our own choices, and what we could not confirm.

We got each source on 2026-11-15 and read the text of each quote in the document itself.
A line that starts with `>` is an exact quote.

## 1. The sources

| Short name | Document | URL |
|---|---|---|
| STD-V1 | NASA-STD-3001 Volume 1, "Crew Health", revision C, approved 2023-09-15. The NASA standards page linked this revision as the current one on 2026-11-15. | https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf |
| STD-V2 | NASA-STD-3001 Volume 2, revision F, approved 2026-07-14. The file name has the year 2025, but the file is revision F. | https://www.nasa.gov/wp-content/uploads/2025/05/nasa-std-3001-vol-2.pdf |
| TB-020 | NASA technical brief OCHMO-TB-020, "Design for Ionizing Radiation Protection", revision G, 2025-06-06 | https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf |
| TB-003 | NASA technical brief OCHMO-TB-003, "Habitable Atmosphere", revision A, 2023-11-30 | https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-003-habitable-atmosphere.pdf |
| TB-002 | NASA technical brief OCHMO-TB-002, "Environmental Control & Life Support System (ECLSS): Human-Centered Approach", revision B, 2023-11-14 | https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-002-eclss.pdf |
| TB-008 | NASA technical brief OCHMO-TB-008, "Fire Protection", revision A, 2023-11-29 | https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-008-fire-protection.pdf |
| TB-004 | NASA technical brief OCHMO-TB-004, "Carbon Dioxide (CO2)", revision D, 2026-03-10 | https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf |
| Law and Alexander | "CO2 on the International Space Station: An Operations Update", NASA document NTRS 20150019624 | https://ntrs.nasa.gov/citations/20150019624 |
| HIDH | NASA Human Integration Design Handbook, NASA/SP-2010-3407 revision 1 (2014). The page numbers below are the numbers printed on the pages. | https://www.nasa.gov/wp-content/uploads/2015/03/human_integration_design_handbook_revision_1.pdf |
| ARS chapter | Wu, Huff, Casey, Kim, and Cucinotta, "Risk of Acute Radiation Syndromes Due to Solar Particle Events", chapter 5 of "Human Health and Performance Risks of Space Exploration Missions", pages 171 to 190. This is the evidence book of the NASA Human Research Program. | https://humanresearchroadmap.nasa.gov/evidence/reports/ARS.pdf |
| HRR cancer | NASA Human Research Roadmap, "Risk of Radiation Carcinogenesis", last published 2026-08-17 | https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=96 |
| HRR heart | NASA Human Research Roadmap, "Risk of Cardiovascular Adaptations Contributing to Adverse Mission Performance and Health Outcomes", last published 2025-05-13 | https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=179 |
| HRR brain | NASA Human Research Roadmap, "Risk of Adverse Cognitive or Behavioral Changes and Psychiatric Disorders Leading to In-mission Health and Performance and Long-term Health Effects", last published 2025-05-13 | https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=99 |
| HRR hypoxia | NASA Human Research Roadmap, "Risk of Reduced Crew Health and Performance Due to Hypoxia", last published 2025-05-13 | https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=173 |
| HRP hazard page | NASA Human Research Program, "Space Radiation" (one of the five hazards of human spaceflight) | https://www.nasa.gov/hrp/hazard-space-radiation/ |

Note about TB-020: the address `https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf` gives revision E of 2022-12-27. Revision G is the newer one. Each TB-020 quote below is in revision G.

## 2. Radiation: the limits of NASA

### 2.1 The dose limits by organ

`DOSE_LIMITS` in `shared/trip/effects.ts`. Source: STD-V1, section 4.8.2, table 4.8-1 "Dose Limits for Career/Non-Cancer Effects (in mGy-Eq. or mGy)", page 40. We also looked at a picture of the page to check the columns.

| Effect | Region of the figure | 30 days | 1 year | Career | Row of the table |
|---|---|---|---|---|---|
| `rad_lens` | eyes | 1,000 mGy-Eq | 2,000 mGy-Eq | 4,000 mGy-Eq | see the first quote |
| `rad_skin` | body | 1,500 mGy-Eq | 3,000 mGy-Eq | 6,000 mGy-Eq | see the second quote |
| `rad_blood` | body | 250 mGy-Eq | 500 mGy-Eq | no limit | see the third quote |
| `rad_heart` | chest | 250 mGy-Eq | 500 mGy-Eq | 1,000 mGy-Eq | see the fourth quote |
| `rad_brain` | brain | 500 mGy | 1,000 mGy | 1,500 mGy | see the fifth quote |

> Lens*# 1,000 mGy-Eq 2,000 mGy-Eq 4,000 mGy-Eq

> Skin# 1,500 mGy-Eq 3,000 mGy-Eq 6,000 mGy-Eq

> Blood-forming Organs# 250 mGy-Eq 500 mGy-Eq Not applicable

> Circulatory System**## 250 mGy-Eq 500 mGy-Eq 1000 mGy-Eq

> Central Nervous System***## 500 mGy 1,000 mGy 1,500 mGy

Place: STD-V1, table 4.8-1, page 40. https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf

The table has one more row. The app does not compare it, because the app has no dose of heavy ions alone. `EFFECT_NOTES.rad_brain` tells this.

> Central Nervous System*** (Z≥10)## - 100 mGy 250 mGy

Place: STD-V1, table 4.8-1, page 40. https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf

The notes of the table, which the texts of the effects use:

> *Lens limits are intended to prevent early (<5 years) severe cataracts, e.g., from a solar particle event. An additional cataract risk exists at lower doses from cosmic rays for sub-clinical cataracts, which may progress to severe types after long latency (>5 years) and are not preventable by existing mitigation measures; however, they are deemed an acceptable risk to the program.

> **Circulatory system doses calculated as average over heart muscle and adjacent arteries.

> ***Central Nervous System limits are to be calculated at the hippocampus.

Place: STD-V1, notes of table 4.8-1, page 40. https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf

The relative biological effectiveness (RBE) is the factor that turns an absorbed dose into a dose in mGy-Eq. The caveat texts use two of its values.

> Heavy Ions 2.5 (1-4)

> Protons > 2 MeV 1.5 -

Place: STD-V1, table 4.8-2 "Relative Biological Effectiveness (RBE) for Non-Cancer Effects of the Lens, Skin, BFO, and Circulatory Systems, used for mGy-eq calculations", page 41. https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf

### 2.2 The career limit (`rad_career`)

> [V1 4030] An individual crewmember’s total career effective radiation dose due to spaceflight radiation exposure shall be less than 600 mSv. This limit is universal for all ages and sexes.

> The total career dose limit is based on ensuring each crewmember (inclusive of all ages and sexes) remains below 3% mean risk of cancer mortality (risk of exposure-

> induced death (REID)) above the non-exposed baseline mean.

> Individual crewmember career dose includes all past spaceflight radiation exposures, plus the projected exposure for an upcoming mission.

Place: STD-V1, section 4.8.2, pages 39 and 40. The second quote goes over the page break. https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf

The region is `none`: the cancer risk of a career has no single place on the body. The contract in `shared/trip/effects-types.ts` names this case.

### 2.3 The limit for one solar particle event (`rad_event_limit`)

> [V1 4031] The program shall protect crewmembers from exposure to the design reference Solar Particle Event (SPE) environment proton energy spectrum (sum of the October 1989 events) to less than an effective dose of 250 mSv.

> The 250 mSv effective dose threshold was chosen to minimize acute effects and protects for the limits for all organs listed in Table 4.8-1

Place: STD-V1, section 4.8.3, page 41. https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf

This requirement is for the design of a spacecraft and for one reference event. The NASA brief words it as a limit for each event:

> short-term radiation exposure to solar particle events is limited to an effective dose of 250 mSv per event to minimize acute effects.

Place: TB-020, page 1. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf

The app compares the dose of one mission day with this limit, and only while a solar particle event is active (`stormNow`). A day with cosmic rays only is not an event.

## 3. Radiation: what sources report

### 3.1 Acute effects of a solar particle event (`rad_acute_sickness`, `rad_acute_skin`)

The band of `rad_acute_sickness` is 500 to 1,000 mGy (0.5 to 1 Gy). The value of `rad_acute_skin` is 4,000 mGy (4 Gy).

> Doses that are in the range of 0.5 to 1 Gy cause minor acute damage to the hemopoietic system and mild prodromal effects (nausea, vomiting, anorexia, and fatigue) in a small number of irradiated persons (Anno et al., 1989). In the dose range of 1 to 2 Gy acute, prodromal effects and injury to the hemopoietic system increase significantly.

Place: ARS chapter, page 176. https://humanresearchroadmap.nasa.gov/evidence/reports/ARS.pdf

> Prodromal effects are not noted below low-LET radiation doses of 0.5 Gy (Mettler and Upton, 1995).

> The ED10 (a dose in which 10% of a population receives the effect) has been estimated to be 4 Gy for erythema and 14 Gy for the more serious moist desquamation (Strom, 2003; Haskin et al., 1997). Protraction of exposure increases the dose that is required for a given degree of severity by a factor of about 3.

> The skin may receive a dose that is up to a magnitude greater than that of internal organs from an SPE during an EVA, when minimal protection is available (Kim et al., 2006a).

Place: ARS chapter, page 177. https://humanresearchroadmap.nasa.gov/evidence/reports/ARS.pdf

"Prodromal" effects are the first symptoms. "Erythema" is redness of the skin. "Low-LET radiation" is radiation such as gamma rays and x-rays.

These values are for gamma rays and x-rays. The chapter says that the effect of protons is less known (`doseCaveat`):

> While ARS has been well defined for gamma- and X-ray exposures, less is known about the acute effects from whole-body exposures to SPE protons

Place: ARS chapter, page 173. https://humanresearchroadmap.nasa.gov/evidence/reports/ARS.pdf

The chapter also says when acute radiation sickness is likely (`EFFECT_NOTES.rad_acute_sickness`):

> Shielding is an effective countermeasure to SPEs inside spacecraft, making ARS extremely unlikely except in EVA or combined EVA and intravehicular activity (IVA) scenarios.

Place: ARS chapter, page 175. https://humanresearchroadmap.nasa.gov/evidence/reports/ARS.pdf

The NASA brief names the same effects with no numbers (`EFFECT_NOTES.rad_event_limit`):

> Acute radiation syndromes, such as nausea, vomiting, and fatigue, may occur due to in mission radiation exposure, as well as skin injuries and depletion of blood-forming organs.

Place: TB-020, page 2. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf

### 3.2 What the dose does over a long mission

**Cancer** (`EFFECT_NOTES.rad_career`):

> Given crew is exposed to radiation from the space environment, there is the possibility for increased cancer morbidity or mortality.

> no epidemiological data exists for exposures to space radiation.

> Overall REID uncertainty is large with upper 95% confidence levels 3-4 times larger than estimated central values.

Place: HRR cancer, "Risk Statement" and "HSRB State of Knowledge". https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=96

**Heart and blood vessels** (`rad_heart_disease`, a value of 500 mGy, and `EFFECT_NOTES.rad_heart_disease`):

> A statistical increase in atherosclerosis-related cardiovascular pathologies are observed at late time points when exposed to ionizing radiation (e.g., gamma-rays and x-rays) at and above 500 milligray (mGy) terrestrially in human.

> Epidemiological evidence does not support an increased lifetime risk of cardiovascular disease death in astronauts, but mission durations have been limited largely to 4-6 months and there has been limited follow-up.

Place: HRR heart, "HSRB State of Knowledge". https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=179

**Central nervous system** (`EFFECT_NOTES.rad_brain`). The sources give no dose value, so the app has no band for it:

> Animal research suggests possible short-term cognitive decrements due to radiation with uncertain human translatability.

Place: HRR brain, "HSRB State of Knowledge". https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=99

> Radiation exposure increases cancer risk, damages the central nervous system, can alter cognitive function, reduce motor function, and prompt behavioral changes.

Place: HRP hazard page. https://www.nasa.gov/hrp/hazard-space-radiation/

### 3.3 The text of the hazard (`HAZARD_SAYS.radiation`)

> Occurs continuously, omni-directional, varying in flux with solar cycle. Lower GCR levels occur during solar maximum.

> Shielding is NOT effective due to secondary radiation produced in shielding and tissue.

> Infrequent events occurring most often during solar cycle maximum

Place: TB-020, page 2. GCR is short for galactic cosmic rays. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf

## 4. Radiation: the rule for the units

### 4.1 The problem

The app has a dose that an instrument measured at one place inside or outside a spacecraft. The charts show it in one of two units:

- mSv: a dose equivalent. It is the absorbed dose times a quality factor for the cancer risk.
- mGy: an absorbed dose.

The limits of NASA use three other quantities, each for a place inside the body:

- An effective dose in mSv: a weighted sum of the doses in the organs. NASA computes it with its own model.
- A dose in one organ in mGy-Eq: the absorbed dose in the organ times the RBE.
- An absorbed dose in one organ in mGy.

So no number of the app is the same quantity as a limit. The dose in an organ also differs from the dose at the instrument, because the spacecraft and the body are in the way.

### 4.2 The rule

The app never converts a dose. It compares the number of the charts with the number of the limit, and it tells how good the comparison is.

| Quantity of the limit or of the source | Charts in mSv | Charts in mGy |
|---|---|---|
| Effective dose in mSv (`rad_career`, `rad_event_limit`) | nearest match | no comparison |
| Organ dose in mGy (`rad_brain`) | rough | nearest match |
| Absorbed dose of gamma rays or x-rays (`rad_heart_disease`, `rad_acute_sickness`, `rad_acute_skin`) | rough | nearest match |
| Organ dose in mGy-Eq (`rad_lens`, `rad_skin`, `rad_blood`, `rad_heart`) | rough | rough |

- **Nearest match.** The two are the same kind of quantity. The place differs. The effect keeps its full weight.
- **Rough.** The two are different quantities. The ratio is an indicator only. The `measure` text says "Rough indicator", and the effect gets half of its weight (`ROUGH_WEIGHT = 0.5`). The body figure reaches the full alert color at a heat of 0.85 (`heatMix` in `web/src/components/heat.ts`), so a rough comparison never shows the full alert color. The factor 0.5 is our choice.
- **No comparison.** The intensity is 0, and the `measure` text tells why. This follows `shared/trip/radiation.ts`, which applies the career limit to a series in mSv only.

Each radiation effect has a `caveat` text. It names the quantity of the charts and the quantity of the source.

### 4.3 Which number is the larger one

For two of the rough comparisons, a source tells which number is the larger one at the same place.

Charts in mSv, limit in mGy: the number in mSv is the larger one. So the comparison shows more than the real part of the limit.

> The dose equivalent is obtained by multiplying the absorbed dose by the quality factor (Q), which is used to weight doses in an attempt to account for the energy deposition effect (LET).

Place: HIDH, section 6.8.2, page 509. Table 6.8-1 on the same page gives Q = 1 below 10 keV/µm, Q = 0.32 L − 2.2 from 10 to 100 keV/µm, and Q = 300 / √L above 100 keV/µm. The table is a picture in the file, so we read it from a picture of the page. https://www.nasa.gov/wp-content/uploads/2015/03/human_integration_design_handbook_revision_1.pdf

Charts in mGy, limit in mGy-Eq: the number in mGy is the smaller one, because the RBE of table 4.8-2 is 1.5 for protons and 2.5 for heavy ions (section 2.1). So the comparison shows less than the real part of the limit.

Charts in mSv, limit in mGy-Eq: we found no source that tells which number is the larger one. The two use different factors:

> The unit of Gray-equivalent is distinct from the unit of Sievert that is used to project cancer risk because distinct radiation quality functions occur for ARS and cancer.

Place: ARS chapter, page 175. https://humanresearchroadmap.nasa.gov/evidence/reports/ARS.pdf

> To express the potential to damage individual organs, the NCRP 132 (2000)] adopted the use of the Gray equivalent (Gy-Eq). This quantity is analogous to the dose equivalent, as it applies a Q-like effectiveness value to the absorbed dose, but it applies only to deterministic effects in individual organs.

Place: HIDH, section 6.8.2, page 509. https://www.nasa.gov/wp-content/uploads/2015/03/human_integration_design_handbook_revision_1.pdf

The definitions of NASA for the two other terms:

> Effective Dose: The tissue-weighted sum of the equivalent doses in all specified tissues and organs of the human body and represents the stochastic health risk to the whole body

> Sievert: A derived (not directly measured) unit of dose equivalent or NASA equivalent dose of radiation which accounts for the biological effect (radiation quality and tissue sensitivity) of ionizing radiation in reference to carcinogenic potential.

Place: STD-V1, appendix with the definitions, pages 62 and 64. https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf

### 4.4 The time windows

| Limit | Dose of the input |
|---|---|
| 30 days | `dose.last30Days` |
| 1 year | `dose.lastYear` |
| Career | `dose.total`, the dose of this mission |

The intensity of a limit is the dose ÷ the limit for the window where this ratio is highest, and it is 1 at most. A window with a dose of `null` does not count. If all windows are `null`, the intensity is 0 and the `measure` text is "No data."

The career of a crew member also has the dose of earlier flights (section 2.2). The app knows this mission only, and the caveat says so.

The acute values (section 3.1) and the limit for one event use `dose.today`, the dose of one mission day. The sources speak of a dose that arrives in hours. The app has no dose of one event alone.

## 5. O2

### 5.1 Which O2 value the app has

`o2MmHg` of the input is the inspired O2 partial pressure (PIO2). `shared/trip/lifesupport.ts` gives this value. The standard defines it in the head of table 6.2-1 as PIO2 = (PB − 47) × FIO2:

> PB – Ambient Barometric Pressure (mmHg)

> FIO2 – The dry-gas decimal fraction of ambient O2

Place: STD-V2, table 6.2-1, page 53 of the file. https://www.nasa.gov/wp-content/uploads/2025/05/nasa-std-3001-vol-2.pdf

### 5.2 The ranges of the standard (`O2_LIMITS`)

> [V2 6003] The system shall maintain inspired oxygen partial pressure (PIO2) in accordance with Table 6.2-1—Inspired Oxygen Partial Pressure Exposure Ranges.

Place: STD-V2, section 6.2.1.2, page 51 of the file. https://www.nasa.gov/wp-content/uploads/2025/05/nasa-std-3001-vol-2.pdf

We read table 6.2-1 from a picture of page 53, because the text copy mixes the columns. The row "PIO2 (mmHg)":

| Column of the table | Value | Acceptable duration | In `O2_LIMITS` |
|---|---|---|---|
| Normoxia Target Range | 145-155 | Indefinite | `targetLow`, `targetHigh` |
| Indefinite Hyperoxia Upper Limit | 356 | Indefinite | `high` |
| Short-Term Hyperoxia Upper Limit | 791 | 6-9 Hours | `shortTermHigh` |
| Mild Hypoxia Lower Limit | 127 | Indefinite with monitoring | `mildHypoxia` |

The notes of the table:

> **** 1-hour time-weighted average with an absolute lower limit for the minimum hypoxia range of 122 mmHg/2.36 psia

> **There is no opportunity to collect data in microgravity with PIO2 of 127 mmHg to cover the durations of Exploration Class missions, so a health monitoring and mitigation plan are required to implement this condition

Place: STD-V2, notes of table 6.2-1, page 53 of the file. https://www.nasa.gov/wp-content/uploads/2025/05/nasa-std-3001-vol-2.pdf

"Normoxia" is normal O2. "Hyperoxia" is too much O2. "Hypoxia" is too little O2.

How the app uses the ranges:

| Effect | Kind | Intensity |
|---|---|---|
| `o2_low_target` | band | 0 at 145 mmHg, 1 at 127 mmHg |
| `o2_low_limit` | limit | 0 at 127 mmHg, 1 at 122 mmHg. The limit of 127 mmHg is for a 1-hour average. The app has the value now, and the caveat says so. |
| `o2_high_fire` | band | 0 at 155 mmHg, 1 at 356 mmHg |
| `o2_high_limit` | limit | 0 at 356 mmHg, 1 at 791 mmHg |

The fire risk (`o2_high_fire`, `HAZARD_SAYS.o2`). No source gives a number for the fire risk, so the band shows only how far the O2 is above the target range.

> Oxygen-rich atmospheres, however, present safety hazards because of their ability to feed fires.

Place: STD-V2, section 6.2.2.1, rationale of [V2 6006], page 54 of the file. https://www.nasa.gov/wp-content/uploads/2025/05/nasa-std-3001-vol-2.pdf

### 5.3 The hypoxia table of the handbook (`HYPOXIA_TABLE`)

> Table 6.2-4 lists some effects of hypoxia on humans at approximate atmospheric oxygen partial pressures.

> 137 2.65 Accepted limit of alertness. Loss of night vision. Earliest symptom is dilation of the pupils.

> 114 2.20 Performance seriously impaired. Hallucinations, excitation, apathy.

> 100 1.93 Physical coordination impaired, emotionally upset, paralysis, loss of memory.

> 84 1.62 Eventual irreversible unconsciousness.

> 0–46 0–0.89 Anoxia – near-immediate unconsciousness, convulsions, paralysis. Death in 90 to 180 seconds.

Place: HIDH, section 6.2.2.2.1, table 6.2-4 "Effects of Hypoxia", page 343. The first number of a row is the O2 partial pressure in mmHg, and the second number is the same pressure in psia. https://www.nasa.gov/wp-content/uploads/2015/03/human_integration_design_handbook_revision_1.pdf

The first row of the table is the normal value:

> 160 3.09 Normal (sea-level atmosphere).

Place: HIDH, table 6.2-4, page 343. https://www.nasa.gov/wp-content/uploads/2015/03/human_integration_design_handbook_revision_1.pdf

The table uses the O2 partial pressure of the air, not PIO2. So the app turns PIO2 back into the O2 pressure of the dry cabin gas with the formula of the standard: cabin O2 = PIO2 × total pressure ÷ (total pressure − 47 mmHg). `bodyEffects()` takes the total pressure as an option. The default is 760 mmHg. At 760 mmHg, 137 mmHg of the cabin gas is 128.5 mmHg of PIO2.

The table gives one value for each effect. So an effect is fully on at or below its value, as a CO2 band with one value.

The handbook marks this section:

> *The information in this section is currently under evaluation and an update is planned for the next revision of this document.

Place: HIDH, section 6.2.2.2.1, page 342. https://www.nasa.gov/wp-content/uploads/2015/03/human_integration_design_handbook_revision_1.pdf

### 5.4 More that the sources say (`EFFECT_NOTES`)

> Hypoxia-induced physiologic changes include:

> CNS: mental changes, at times undetectable to crew

> Vision: decreases in color, night, and peripheral vision

Place: TB-003, page 5. The same list has: "Nonspecific: fatigue, nausea, headache, dizziness, mood alterations", "Sleep: decrease in quality", and "Breathing: hyperventilation". https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-003-habitable-atmosphere.pdf

> the acute change in ppO2 from normoxic to potentially hypoxic can result in AMS symptoms including headache, nausea, dizziness or fatigue which could potentially affect performance.

Place: TB-003, page 14. AMS is short for acute mountain sickness. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-003-habitable-atmosphere.pdf

> This can result in toxic oxygen levels, potentially leading to respiratory concerns or tissue-level injury.

Place: TB-003, page 6. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-003-habitable-atmosphere.pdf

> In addition to hypobaric hypoxia associated with staged denitrogenation, there are additional factors that can result in hypoxic exposure to the crewmember such as cabin depressurization, Environmental Control and Life Support System (ECLSS) failure, toxic exposure or crewmember illness/injury.

Place: HRR hypoxia, notes of the risk statement. https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=173

## 6. CO2

The CO2 effects come from `BANDS` of `shared/co2.ts`. `shared/trip/effects.ts` copies no number of a band: it reads the start, the end, the region, the weight, and the source name from each band. It adds the title, the `says` text, and the steps. The README section "Limits and symptom bands" has the quote of each band. We checked the quotes again:

> Between 2.3-2.7 mmHg, fatigue and full-headedness have been reported. Between 2.7-3.0 mmHg, there have been self-reports of procedure missed steps or procedures going long. Above 3.0-3.4 mmHg, headaches have been reported.

Place: Law and Alexander, abstract. https://ntrs.nasa.gov/citations/20150019624

> Anecdotal evidence from previous spaceflight missions have found the following associations between CO2 levels and symptomology:

> Fatigue malaise, decreased sleep, and nausea reported at levels above 4.5 mmHg.

> 5th cranial nerve dysesthesia at 4.5-5.0 mmHg.

> Chronic cough, poor sleep, blurred vision, and frontal headaches reported at 3.5 mmHg.

Place: TB-004, page 4. The same list has "Headaches at levels between 2.8-4.5 mmHg; worsening with increasing levels of CO2". https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf

The limit (`co2_limit_1h`, with `LIMIT_1H_MMHG` of `shared/co2.ts`):

> [V2 6004] The system shall limit the average one-hour CO2 partial pressure (ppCO2) in the habitable volume to no more than 3 mmHg.

Place: STD-V2, section 6.2.1.3, page 53 of the file. https://www.nasa.gov/wp-content/uploads/2025/05/nasa-std-3001-vol-2.pdf

Our choice for the limit: the effect is off at or below 3 mmHg and on above it. It is not the ratio of the value to the limit. A calm cabin of the station is near 80% to 90% of this limit all the time, so a ratio would show an active effect on each day. The `measure` text gives the percent.

## 7. What the crew can do

A step with a source: the source names the step. A step with a source and the mark "our idea" (`ours: true`): the source gives a fact, and the step is our idea from that fact. A step with the mark only: we found no source.

### 7.1 Radiation

| Step in the app | Quote | Place |
|---|---|---|
| Go to the storm shelter when the radiation alert comes. | first quote below | TB-020, page 2 |
| Build the storm shelter in the crew quarters: put the water containers and the materials with much hydrogen around the crew. | second and third quote | TB-020, page 10 |
| End the work outside in less than 2 hours after the alert, and go behind shielding. | fourth quote | TB-020, page 10 |
| Plan the flight near solar maximum. Cosmic rays are lower then. Solar particle events occur more often then, so the storm shelter is more important. (source and our idea) | quotes of section 3.3 | TB-020, page 2 |

> Countermeasures: Shielding, monitoring, accurate event determination, dosimetry, and timely reporting to alert crew to seek shelter are essential for crew safety.

> Storm shelter: Additional Storm Shelter with an added 10 cm water equivalent in crew quarters to protect against centennial solar particle event.

> This can be achieved by rearranging items such as water containers and/or high hydrogen content materials.

> Real-time alert dosimetry also provides a very high level of protection for EVAs if termination occurs within 2 hours and there is access to shielding.

Place: TB-020, pages 2 and 10. An EVA is work outside the spacecraft. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf

The step "Wear your personal dosimeter inside the spacecraft and during work outside.":

> [V2 6162] The program shall monitor the radiation exposure produced by galactic cosmic rays, solar energetic particles, and trapped radiation received by individual crew members

> the space radiation exposure of each crew member must be monitored on an individual basis as crew activity leads to varying absorbed dose.

Place: STD-V2, section 6.8.1.4, page 111 of the file. The next sentence says that this monitoring "must occur inside vehicles, habitats, and during extravehicular activity". It goes over a page break. https://www.nasa.gov/wp-content/uploads/2025/05/nasa-std-3001-vol-2.pdf

The step "Keep each exposure as low as you reasonably can.":

> [V1 4029] All crewmember radiation exposures shall be minimized using the ALARA principle.

Place: STD-V1, section 4.8.1, page 39. ALARA is short for "as low as reasonably achievable". https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf

The step "Choose a faster flight where the mission permits it." (source and our idea):

> the tradeoff of reduced mission duration due to faster transit, which reduces the crew exposure to spaceflight radiation, is to be considered

Place: STD-V1, section 4.8.4, rationale of [V1 4032], page 43. https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf

Steps with no source (our idea): "Sleep and rest in the best shielded part of the cabin." and "Tell the flight surgeon about each symptom, for example nausea."

### 7.2 CO2

| Step in the app | Quote | Place |
|---|---|---|
| Find and repair the scrubber that removes less CO2, or switch on a spare scrubber. | first quote below | TB-004, page 7 |
| Move to a module with less CO2. (source and our idea) | second quote | TB-004, page 7 |
| Eat more fat and less carbohydrate. | third quote | TB-004, page 6 |
| Keep the 7-day average below 2.5 mmHg. | fourth quote | TB-004, page 5 |

> If the average ppCO2 is exceeded over several days for unknown reasons, the Flight Control Team will take corrective actions to either identify, diagnose, and repair degraded CO2 scrubbing equipment or activate supplemental CO2 scrubbing equipment as needed.

> There is a slight variation across the different nodes of the ISS due to location of CO2 scrubbing equipment and ventilation patterns.

> Modifying crew diet can help lower the environmental CO2 output levels (example: consuming more fats and less carbohydrates).

> To keep the risk of headache below 1%, average 7-day CO2 needs to be maintained below 2.5 mmHg

Place: TB-004, pages 5, 6, and 7. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf

The steps "Raise the air flow where you work" and "Raise the air flow at the sleep place" (the sleep place is our idea), and "Keep the 1-hour average at or below 3 mmHg":

> Achieving this level is dependent on individual and total crew generation of CO2 for all planned activities (factoring in metabolic rates and respiratory quotient), appropriate CO2 scrubbing and adequate ventilation flow rates to ensure that no localized pockets of CO2 are generated throughout the habitat.

Place: STD-V2, section 6.2.1.3, rationale of [V2 6004], page 53 of the file. https://www.nasa.gov/wp-content/uploads/2025/05/nasa-std-3001-vol-2.pdf

The steps "Do less heavy work and exercise" for CO2 and for O2:

> To reduce O2 consumption, activity level must be reduced. To reduce CO2 production, reduce activity and the Respiratory Quotient (RQ) by modifying the diet.

Place: TB-002, page 10. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-002-eclss.pdf

Steps with no source (our idea): "Tell the flight surgeon about the symptom." and "Read each step of a procedure aloud, and let a second person check the work."

### 7.3 O2

| Step in the app | Quote | Place |
|---|---|---|
| Put on an oxygen mask when you feel a symptom of hypoxia. | first quote below | TB-003, page 3 |
| Give the crew more O2 from a mask or a bottle. | second quote | TB-003, page 6 |
| Watch the other crew members for symptoms. A person with hypoxia often does not notice it. | third and fourth quote | TB-003, page 6 |
| Lower the O2 pressure of the cabin gas. | fifth quote | TB-003, page 6 |

> Crew are trained to don oxygen masks anytime symptoms of hypoxia are experienced.

> Once diagnosed, the main treatment for hypoxia is to supply crew with supplemental oxygen to resolve the O2 deficiency.

> crew experiencing hypoxia may have loss of cognitive function and reasoning.

> Crewmembers are also trained to monitor fellow crewmembers for symptoms as it may be easier to recognize symptoms in others.

> Hyperoxia treatment primarily consists of reducing the partial pressure of oxygen in atmospheric gas and supportive care of any toxic sequelae.

Place: TB-003, pages 3 and 6. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-003-habitable-atmosphere.pdf

The step "Put on an oxygen mask. On the Space Shuttle, the crew put on masks if the O2 pressure fell below 121 mmHg.":

> The Space Shuttle maintained oxygen at 166 mmHg

> and oxygen masks were donned if the oxygen pressure fell below 121 mmHg (2.3 psi).

Place: HIDH, section 6.2.2.2.1, page 344. https://www.nasa.gov/wp-content/uploads/2015/03/human_integration_design_handbook_revision_1.pdf

The step "Keep the O2 level low. NASA says that this reduces the potential for fire in a spacecraft.":

> The potential for fire in a spacecraft can be reduced by maintaining the oxygen level below hazardous levels and by carefully selecting materials for compatibility with the O2 atmosphere.

Place: TB-008, page 6. https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-008-fire-protection.pdf

Steps with no source (our idea): "Repair the oxygen generator, or add O2 from the bottles, until the O2 is in the target range.", "Lower the rate of the oxygen generator, or close the O2 bottles.", and "Tell the flight surgeon about each symptom."

## 8. Our choices

No NASA document gives these. The code marks each one as our choice.

- **The weights.** `weight` orders how serious an effect is, from 0 to 1. A CO2 effect has the weight of its band. The O2 and radiation weights are ours.
- **The regions of the figure.** The lens is on the eyes, the central nervous system on the brain, and the circulatory system on the chest. The skin is on the whole body. The blood-forming organs are the bone marrow, which is in many bones. No single part of the figure is right for it, so this effect is on the whole body. The acute radiation sickness is also on the whole body, as the CO2 band with nausea.
- **The order of the list.** CO2, then O2, then radiation. Inside CO2 and radiation, the order is the value where each effect starts. Inside O2, the order goes from the normal range outward: first the low side, then the high side.
- **The limit of the 1-hour CO2 average** is on or off (section 6).
- **The factor 0.5 for a rough comparison** (section 4.2).
- **The start of an effect of a limit** in the list is the lowest limit of its time windows.

## 9. What we could not confirm

- **Which number is larger, mSv or mGy-Eq.** We found no source for it (section 4.3). For cosmic rays, the number in mSv is possibly the larger one, so the four organ effects in mGy-Eq possibly show too much with the charts in mSv. We did not check this.
- **The dose in an organ.** The app has no model of the body. No comparison with an organ limit is exact.
- **The effect of protons and heavy ions for the acute values.** The values of section 3.1 are for gamma rays and x-rays.
- **The year of the ARS chapter.** The file prints no year. STD-V1 names its source as "Human Research Program Evidence Book 2009".
- **The origin of the organ limits.** Table 4.8-1 names NCRP Report 132 (2000) and the evidence books of 2009 and 2016. We did not read them.
- **The fire risk as a number.** We found no NASA value that ties the fire risk to the O2 pressure.
- **The hypoxia table.** The handbook calls the values approximate and says that the section is under evaluation. We did not look for a newer revision of the handbook.
- **356 mmHg or 333 mmHg.** Table 6.2-1 of STD-V2 gives 356 mmHg as the upper limit for an unlimited time. The rationale text of the same requirement says: "A practical and defensible hyperoxic exposure limit would be a PIO2 of 333 mmHg". The app uses the table.
- **A dose value for effects on the central nervous system.** The sources that we read give none.
- **Steps with the mark "our idea".** Section 7 lists them.
- **Where the bone marrow is.** We have no source for the place of the blood-forming organs on the figure (section 8).
