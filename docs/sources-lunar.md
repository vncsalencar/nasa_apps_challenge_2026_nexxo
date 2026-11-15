# Sources of the lunar mission presets

This file lists each number of the five lunar presets, with the exact quote, the place in the source, and the URL.
The presets are in `shared/trip/presets/`: `artemis1.ts`, `artemis2.ts`, `lunar-orbit.ts`, `lunar-surface.ts`, `gateway.ts`.

We read each source on 15 November 2026. A quote is in quotation marks and is word for word.
Where the app uses a number that is not in the source (a middle of a range, a division), this file says "our arithmetic".

Two quantities appear, and the app never adds or converts them:

- Absorbed dose, in mGy (or µGy): the energy that the radiation leaves in a material.
- Dose equivalent, in mSv (or µSv): the absorbed dose times a quality factor for the harm to the body.

## 1. Artemis I

### 1.1 Radiation: George et al. 2024

George, S. P., Gaza, R., Matthiä, D., et al. "Space radiation measurements during the Artemis I lunar mission." Nature 634, 48–52 (2024). Open access.
URL: https://www.nature.com/articles/s41586-024-07927-7

The paper splits the flight into three parts: inner belt, outer belt, and galactic cosmic rays (GCR, all the flight after the belts).
It gives no separate value for the cruise, for the distant retrograde orbit, or for the return. So the five phases after the belts use one rate.

Extended Data Table 1, "HERA dose quantities split by phase of flight" (an image in the paper,
https://www.nature.com/articles/s41586-024-07927-7/tables/3). D is the absorbed dose, Q the mean quality factor, H the dose equivalent:

| Flight phase | HPU: D (mGy) | Q | H (mSv) | HSU1: D (mGy) | Q | H (mSv) | HSU2: D (mGy) | Q | H (mSv) |
|---|---|---|---|---|---|---|---|---|---|
| Inner belt | 1.45 ± 0.16 | 1.24 ± 0.03 | 1.80 ± 0.20 | 1.49 ± 0.17 | 1.26 ± 0.03 | 1.88 ± 0.21 | 3.13 ± 0.35 | 1.26 ± 0.03 | 3.94 ± 0.45 |
| Outer belt | 0.08 ± 0.01 | 1.46 ± 0.13 | 0.12 ± 0.02 | 0.08 ± 0.01 | 1.60 ± 0.15 | 0.13 ± 0.02 | 0.13 ± 0.01 | 1.40 ± 0.10 | 0.18 ± 0.02 |
| GCR | 10.75 ± 1.19 | 2.30 ± 0.05 | 24.7 ± 2.8 | 10.32 ± 1.15 | 2.63 ± 0.05 | 27.1 ± 3.06 | 10.21 ± 1.13 | 3.06 ± 0.06 | 31.2 ± 3.52 |
| Whole mission | 12.28 ± 1.28 | - | 26.7 ± 2.8 | 11.90 ± 1.32 | - | 29.2 ± 3.1 | 13.47 ± 1.5 | - | 35.4 ± 3.6 |

HPU, HSU1, and HSU2 are the three sensors of HERA (Hybrid Electronic Radiation Assessor, NASA). HSU1 is in the storm shelter. HSU2 is on the wall of the crew cabin.

| Value in the app | Quote | Place in the source |
|---|---|---|
| Cosmic rays, dose equivalent: 1.10 ± 0.14 mSv for each day | "Calculated dose equivalent rates from GCRs were 0.96–1.24 mSv d−1." | Main text, the paragraph that starts "Calculation of the ICRP60". Also Table 2, row "Artemis I": "0.96–1.24" |
| Cosmic rays, absorbed dose: 0.414 ± 0.011 mGy for each day | GCR row of Extended Data Table 1: D = 10.75, 10.32, 10.21 mGy. "Following the belt transit, Orion spent 25 days in the interplanetary galactic cosmic ray (GCR) environment." | Extended Data Table 1. Main text, the paragraph after Fig. 2 |
| Belts, dose equivalent: 3.02 mSv for the phase (18.27 ± 6.66 mSv for each day) | Inner belt and outer belt rows of Extended Data Table 1. "Total mission dose equivalents were 26.7–35.4 mSv, with between 1.80 and 3.94 mSv attributable to the belt passes (Extended Data Table 1)." | Extended Data Table 1. Main text, the paragraph that starts "Calculation of the ICRP60" |
| Belts, absorbed dose: 2.395 mGy for the phase (14.49 ± 5.23 mGy for each day) | Inner belt and outer belt rows of Extended Data Table 1 | Extended Data Table 1 |
| Times of the belt passes: 07:12 to 07:42 UTC and 08:45 to 10:45 UTC | "Cumulative doses for the belt passes for HERA, EAD, M-42 and CAD dominated by the proton-belt crossings (07:12–07:42 UTC), with only small contributions from the electron-belt crossing (08:45–10:45 UTC)." | Caption of Fig. 2, part d |
| Shielding: 25 and 45 g/cm² | "(median aluminium equivalent areal density: 25 g cm−2 for HSU2 and 45 g cm−2 for HPU)" | Main text, the paragraph that starts "Calculation of the ICRP60" |
| Solar cycle: near the middle | "It can be seen from the ACE CRIS flux that this is roughly in the midpoint of the solar cycle, neither in solar minimum or maximum." | Supplementary Information, "Supplementary Materials 3" |
| Whole mission: 26.7 to 35.4 mSv, 11.90 to 13.47 mGy | Whole mission row of Extended Data Table 1 | Extended Data Table 1 |
| HERA off before the entry | "HERA was automatically powered up by the Orion flight computers at 50,000-ft altitude and then remained powered until shortly before re-entry, when it was shut off." | Methods, "NASA HERA detector" |

Our arithmetic for these rates:

- Cosmic rays, mSv: the middle of 0.96 and 1.24 is 1.10. Plus or minus 0.14 covers the range. The plus or minus is the range between the sensor places. It is not the error of the instrument, which the paper gives as about 11%.
- Cosmic rays, mGy: the phases after the belts are 25.288 days long (from 10:45 UTC on 16 November to 17:40 UTC on 11 December). 10.21 / 25.288 = 0.404 and 10.75 / 25.288 = 0.425. The middle is 0.414, plus or minus 0.011.
- Belts, mSv: inner belt plus outer belt is 1.80 + 0.12 = 1.92 (HPU), 1.88 + 0.13 = 2.01 (HSU1), 3.94 + 0.18 = 4.12 (HSU2). The middle of 1.92 and 4.12 is 3.02, plus or minus 1.10. The belt phase is 238 minutes long (0.1653 days). 3.02 / 0.1653 = 18.27, and 1.10 / 0.1653 = 6.66.
- Belts, mGy: 1.45 + 0.08 = 1.53, 1.49 + 0.08 = 1.57, 3.13 + 0.13 = 3.26. The middle of 1.53 and 3.26 is 2.395, plus or minus 0.865. 2.395 / 0.1653 = 14.49, and 0.865 / 0.1653 = 5.23.
- Check: with these rates the app gives 30.8 mSv and 12.9 mGy for the mission. The paper gives 26.7 to 35.4 mSv and 11.90 to 13.47 mGy.

The findings of the preset:

| Finding | Quote | Place in the source |
|---|---|---|
| About 4 times more dose rate at the least shielded places, in the inner belt | "Measurements of the inner proton belt show an up to fourfold difference in dose rates between the most (M-42 SN127: 69 µGy min−1) and the two least shielded locations (EAD MU01: 240 µGy min−1 and HERA HSU2: 287 µGy min−1) in Orion (Fig. 2a)." | Main text, second paragraph. Also in the abstract |
| The 90 degree turn cut the dose rate by about 50% | "Towards the end of the inner-belt transit, Orion performed a 90° rotation lasting 5 min to execute trans-lunar injection (Fig. 3a and Supplementary Fig. 6). During this manoeuvre, an unexpected decrease in the dose rate of 50% was observed in comparison with AP9-IRENE calculated proton fluxes (Fig. 3b)." And: "Here we conclude that the dose reduction originated from the rotation of bulkier parts of Orion into the proton plane (Fig. 3d)." | Main text, the paragraph before Fig. 3. Also in the abstract: "around 50%" |
| The Moon blocked about one third of the cosmic rays at the close flybys. No solar particle event | "No solar-particle events occurred during the Artemis I mission and the only changes in the environment were dose reductions of the GCR values of a third owing to the solid angle blocked by the Moon during close approaches (Fig. 2f,g)." | Main text, the paragraph after Fig. 2 |
| The inner belt gave up to 23% of the total | "Overall exposure was dominated by GCRs (Fig. 2e), although the inner proton belt (Fig. 2d) contributed up to 23% to the total cumulative dose for EAD MU01" | Main text, the paragraph after Fig. 2 |

The claim "about 60% lower than earlier missions":

- The abstract says: "Interplanetary cosmic-ray dose equivalent rates in Orion were as much as 60% lower than previous observations." The reference of this sentence is number 9: Zeitlin et al., Science 340, 1080–1084 (2013), the MSL RAD measurement on the way to Mars. The abstract names one earlier measurement, not many missions.
- The main text says: "These results are lower than the data reported by other, more lightly shielded instruments for a similar period of the solar cycle, such as the MSL-RAD (1.58 mSv d−1) (Supplementary Fig. 7) or CRaTER (1.55 mSv d−1). They are similar to those calculated for interplanetary space from high-latitude measurements inside the International Space Station (1.40 mSv d−1) (Table 2)."
- Our arithmetic with the numbers of the main text: 0.96 / 1.58 = 0.61 and 1.24 / 1.58 = 0.78. So Orion was 22% to 39% lower than MSL RAD, not 60% lower. The lowest Orion rate is about 60% of the MSL RAD rate. We could not get "60% lower" from any pair of numbers in the paper.
- The paper also says: "The experimentally derived dose equivalents for such a mission are about 30% lower than those reported in the literature so far".
- So the preset shows the quote of the abstract and our arithmetic next to it.

### 1.2 Timeline

All times in the app are UTC. EST is UTC minus 5 hours, CST is UTC minus 6 hours, PST is UTC minus 8 hours.

| Event | UTC | Quote | Source |
|---|---|---|---|
| Launch | 16 November 2022, 06:47 | "The Artemis I mission launched from Launch Pad 39B at Kennedy Space Center in Florida at 1:47 a.m. EST on Nov. 16, 2022." | https://www.nasa.gov/mission/artemis-i/ . Also George et al. 2024, caption of Fig. 1: "After launch at 06:47 UTC on 16 November 2022" |
| End of the belts | 16 November, 10:45 | See the caption of Fig. 2 above | George et al. 2024 |
| Outbound flyby, closest point | 21 November, 12:57 | "Orion completed the outbound powered flyby at 6:44 a.m., passing about 81 miles above the surface at 6:57 a.m." (the post uses CST) | https://www.nasa.gov/blogs/missions/2022/11/21/artemis-i-flight-day-six-orion-performs-lunar-flyby-closest-outbound-approach/ |
| Burn into the distant retrograde orbit | 25 November, 21:52 | "successfully performed a burn to insert Orion into a distant retrograde orbit by firing the orbital maneuvering system engine for 1 minutes and 28 seconds at 4:52 p.m. CST" | https://www.nasa.gov/blogs/missions/2022/11/25/artemis-i-flight-day-10-orion-enters-distant-retrograde-orbit/ |
| Burn out of the orbit | 1 December, 21:53 | "The spacecraft successfully completed the distant retrograde departure burn at 3:53 p.m. CST, firing its main engine for 1 minute 45 seconds" | https://www.nasa.gov/blogs/missions/2022/12/01/artemis-i-flight-day-16-orion-successfully-completes-distant-retrograde-departure-burn/ |
| Return flyby, closest point | 5 December, 16:43 | "The spacecraft made its second and final close approach to the Moon at 10:43 a.m. CST Monday, Dec. 5, just before its return powered flyby burn, passing 80.6 miles above the lunar surface." | https://www.nasa.gov/blogs/missions/2022/12/05/artemis-i-flight-day-20-orion-conducts-return-powered-flyby/ |
| Splashdown | 11 December, 17:40 | "NASA’s Orion spacecraft successfully completed a parachute-assisted splashdown in the Pacific Ocean at 9:40 PST, 12:40 EST" | https://www.nasa.gov/blogs/missions/2022/12/11/artemis-i-flight-day-26-orion-splashes-down-concluding-historic-artemis-i-mission/ |

The time of the burn into the orbit has a conflict in the NASA texts. The post of 25 November says "4:52 p.m. CST", which is 22:52 UTC.
The post of 21 November gives the plan in EST: "NASA TV coverage of the distant retrograde orbit insertion burn will begin at 4:30 p.m. EST Friday, with the burn scheduled to occur at 4:52 p.m." That is 21:52 UTC.
We checked with the JPL Horizons trajectory of Artemis I: the velocity of Orion changes between 21:52 and 21:58 UTC on 25 November. So the app uses 21:52 UTC.
The same check confirms the other events: the closest points at 12:57 to 12:58 UTC (130 km) and at 16:43 to 16:44 UTC (130 km), and the burn out of the orbit at 21:53 UTC.

The distances of the flybys: George et al. 2024, caption of Fig. 1: "It passed the Moon twice on 21 November (first lunar fly-by at a distance of 130 km) and on 5 December (second lunar fly-by at a distance of 128 km)."
The distant orbit: "The orbit is distant in that Orion will fly about 40,000 miles above the Moon. Due to the distance of the orbit, it will take Orion nearly a week to complete half an orbit around the Moon" (NASA post of 25 November 2022).

Phase lengths, from the times above: belts 0.1653 days, cruise 5.0917, flyby to orbit 4.3715, orbit 6.0007, orbit to flyby 3.7847, return 6.0396. The sum is 25.4535 days. NASA: "after a 25.5 day mission to the Moon".

### 1.3 Cabin and crew

- Habitable volume 9.34 m³: "HABITABLE VOLUME ... 330 ft3 / 9.34 m3" and "PRESSURIZED VOLUME ... 690.6 ft3 / 19.56 m3". NASA fact sheet "Orion by the Numbers" (2026), https://www.nasa.gov/wp-content/uploads/2026/01/orion-by-the-numbers-2026b.pdf
- The same number on a NASA page: "Orion’s cabin has a habitable volume of 330 cubic feet, giving the crew about as much living space as two minivans." https://www.nasa.gov/reference/crew-module/
- Crew of 4: "NUMBER OF CREW ... 4" (same fact sheet). Artemis I flew no crew. The preset keeps 4 for the cabin model and says so in a flag.

### 1.4 Trajectory

JPL Horizons, target "Artemis 1 (spacecraft)" (-1023). Horizons says: "Post-launch Orion trajectory data from NASA/JSC navigation (concatenated)", file "Post_TLI_Orion_AsFlown_20221213_EPH_OEM", from 2022-Nov-16 08:46 to 2022-Dec-11 17:20.
So the file starts about 2 hours after the launch (06:47:44 UTC), and the phases of the preset count from the launch.

The reference that JPL asks for (Horizons manual, section "Acknowledgements", https://ssd.jpl.nasa.gov/horizons/manual.html):
"Giorgini, JD and JPL Solar System Dynamics Group, NASA/JPL Horizons On-Line Ephemeris System, < https://ssd.jpl.nasa.gov/horizons/ >, data retrieved YYYY-MON-DD."

## 2. Artemis II

### 2.1 Timeline

EDT is UTC minus 4 hours.

| Event | UTC | Quote | Source |
|---|---|---|---|
| Launch | 1 April 2026, 22:35 | "lifted off from Kennedy Space Center’s Launch Complex 39B in Florida at 6:35 p.m. EDT to begin its journey to deep space" | https://www.nasa.gov/blogs/missions/2026/04/01/live-artemis-ii-launch-day-updates/ . JPL Horizons: "Launched April 1 @ 22:35:12 UTC" |
| Burn toward the Moon (translunar injection) | 2 April, 23:49 | "NASA’s Orion spacecraft fired its main engine for five minutes and 50 seconds beginning at 7:49 p.m. EDT, to successfully complete the translunar injection (TLI) burn" | https://www.nasa.gov/blogs/missions/2026/04/02/artemis-ii-flight-day-2-orion-completes-tli-burn-crew-begins-journey-to-the-moon/ |
| Closest point to the Moon | 6 April, 23:00 | "the spacecraft and its crew made their closest approach at 7:00 p.m., flying at about 4,067 miles above the surface. Two minutes later, the crew reached the mission’s maximum distance from Earth at 252,756 miles" | https://www.nasa.gov/blogs/missions/2026/04/06/artemis-ii-flight-day-6-crew-wraps-historic-lunar-flyby/ . JPL Horizons: "6 23:01 - Closest approach to Moon center (8282 km)" |
| Splashdown | 11 April, 00:07 | "They successfully completed a parachute-assisted splashdown in the Pacific Ocean off the coast of San Diego at 8:07 p.m. EDT (5:07 p.m. PDT)." | https://www.nasa.gov/blogs/missions/2026/04/10/artemis-ii-flight-day-10-re-entry-live-updates/ |

The high Earth orbit of the first day: JPL Horizons lists "Perigee raise maneuver (2223 x 185 km)" 49 minutes 50 seconds after the launch and "Apogee raise maneuver (70377 km)" 1 hour 47 minutes 57 seconds after the launch. The preset says "about 70,000 km".

Phase lengths: high Earth orbit 1.0514 days, cruise 3.9660, return 4.0465. The sum is 9.0639 days. JPL Horizons: "9/01:32 ... Splashdown".

### 2.2 Radiation: no published result, so Artemis I is the proxy

We found no dose result of Artemis II from NASA (searched on 15 November 2026: the NASA site and the web).
One news site gave "approximately 12 millisieverts" for each crew member with no NASA document behind it. We did not use it.

So the cruise and the return use the Artemis I cosmic-ray rate (section 1.1), with the badge "proxy" and `proxyOf: 'Artemis I'`.

The first phase (high Earth orbit) has no value. Artemis I passed the belts one time in about 4 hours. Artemis II stayed about 25 hours in an orbit between 185 km and about 70,000 km before the burn toward the Moon. The Artemis I belt dose is for another path, so we did not copy it.

The sensors on Artemis II, from NASA before the flight (https://www.nasa.gov/general/artemis-ii-crew-both-subjects-and-scientists-in-nasa-deep-space-research/):
"six active radiation sensors, collectively called the Hybrid Electronic Radiation Assessors, will be deployed at various locations inside the Orion crew module. The crew are also each assigned a device called the Crew Active Dosimeter". And: "Artemis II will carry four of the monitors" (the M-42 EXT of the German Space Agency DLR).

### 2.3 Cabin and trajectory

The cabin is the Orion crew module (section 1.3).
The trajectory is JPL Horizons, target "Artemis II (spacecraft)" (-1024). Horizons says: "Post-launch Orion II trajectory data from NASA/JSC navigation (concatenated). Trajectory data starts after nominal ICPS separation, 3h24m18s after launch". The name of the capsule: "The crew has chosen the nickname "Integrity" for the Artemis II Orion capsule."

## 3. Lunar orbit, 100 km

### 3.1 Radiation: Chandrayaan-1 RADOM

The measurement is from: Dachev, T. P., Tomov, B. T., Matviichuk, Yu. N., Dimitrov, P. S., Vadawale, S. V., Goswami, J. N., De Angelis, G., Girish, V. "An overview of RADOM results for earth and moon radiation environment on Chandrayaan-1 satellite." Advances in Space Research 48, 779–791 (2011). https://doi.org/10.1016/j.asr.2011.05.009

**We could not open the full text of this paper (paywall).** We read the value in an open paper that cites it:
Wimmer-Schweingruber, R. F., et al. "The Lunar Lander Neutron and Dosimetry (LND) Experiment on Chang’E 4." Space Science Reviews 216, 104 (2020). Open text: https://arxiv.org/abs/2001.11028 , section 2 "Science Objectives":

"Fairly recent measurements in lunar orbit were provided by the Radiation Dose Monitor (RADOM) on board Chandrayaan-1 [21]. The spacecraft reached its operational 100 km circular orbit on November 12, 2008. Measurements showed a dose rate of 0.227 mGy per day averaged over 3545 hours of measurement time (20/11/2008 to 18/5/2009). During the last three months of the mission (20/05/2009 to 28/08/2009) the spacecraft reached a 200 km orbit. The dose rate increased to 0.257 mGy per day owing to the reduction of the lunar shadow effect for cosmic rays and to the increase of the cosmic ray flux related to the reduced solar activity."

Reference [21] of that paper is Dachev et al. 2011. So the value in the app is 0.227 mGy for each day, an absorbed dose. It has no dose equivalent (mSv).

Two texts of the RADOM team agree with it:

- Vadawale, Goswami, Dachev, Tomov, Girish (2010), https://arxiv.org/abs/1012.2014 , section 4.3: "Overall particle flux in the 100 km orbit was found to be ~2.5 particles cm-2 s-1, and the corresponding absorbed dose rate was ~10 µGy h-1." 10 µGy for each hour is 0.24 mGy for each day. On the solar cycle: "It should be noted that the solar activity was at the historically lowest during the operation of the Chandrayaan-1".
- De Angelis, Dachev, Tomov, Matviichuk, Dimitrov (2012), abstract of paper IAC-12,A1,4,4,x13018, https://iafastro.directory/iac/paper/id/13018/abstract-pdf/IAC-12,A1,4,4,x13018.brief.pdf : "the GCR doses fall down because of the Moon surface shielding to about 8.8 µGy/h and remained stable around this value". That is 0.21 mGy for each day, a little lower. The shielding: "with a shielding pattern of 0.45 g/cm2 on the 2π solid angle before the detector and more shielding on the other 2π solid angle at the back side of the detector". The instrument: "a miniature (98 grams, 100 mW) 256 channels spectrometer of the deposited energy (dose) in a single 2 cm2 0.3 mm thick silicon detector".

For comparison only, as a dose equivalent: George et al. 2024, Table 2, row "Low lunar orbit": "1.55 (ref. 10)". Reference 10 is Schwadron et al. 2018 (the CRaTER instrument on the Lunar Reconnaissance Orbiter). The caption says the table is "for the December 2022 time frame". The app shows this as a finding and does not use it as a rate.

### 3.2 Cabin, crew, length

These are our choice, because Chandrayaan-1 had no crew: the Orion crew module (9.34 m³, section 1.3), 4 astronauts, 14 days.
The limit of Orion: "The crew module can accommodate four crew members on missions for up to 21 days without docking with another spacecraft" (https://www.nasa.gov/reference/crew-module/).

The app computes the place: it puts the spacecraft at the place of the Moon.

## 4. Lunar surface stay

### 4.1 Radiation: Chang'E 4 LND

Zhang, S., Wimmer-Schweingruber, R. F., Yu, J., et al. "First measurements of the radiation dose on the lunar surface." Science Advances 6, eaaz1334 (2020). https://doi.org/10.1126/sciadv.aaz1334 . Open text: https://pmc.ncbi.nlm.nih.gov/articles/PMC7518862/

| Value in the app | Quote | Place in the source |
|---|---|---|
| Dose equivalent: 1.369 mSv for each day | "LND measured an average dose equivalent of 1369 μSv/day on the surface of the Moon." | Section "Discussion", first paragraph |
| Plus or minus 0.254 mSv for each day | "we obtain the GCR dose equivalent rate of 57.1 ± 10.6 μSv/hour from charged particles" | Section "Results", the paragraph before Table 1. 10.6 times 24 is 254 (our arithmetic) |
| Absorbed dose: 0.317 ± 0.024 mGy for each day | "We measured an average total absorbed dose rate in silicon of 13.2 ± 1 μGy/hour and a neutral particle dose rate of 3.1 ± 0.5 μGy/hour." | Abstract. 13.2 times 24 is 316.8 µGy, and 1 times 24 is 24 µGy (our arithmetic). Table 1 gives "13.2 ± 0.7" for the same value |
| Charged particles only in the dose equivalent | "Subtracting the neutral contribution, we find that the average absorbed dose rate due to charged particles is 10.2 ± 1.1 μGy/hour in Si. After conversion of the LET spectrum to LET in water, as discussed in Introduction, we obtain an average quality factor of 〈Q〉 = 4.3 ± 0.7." | Section "Results", the paragraph before Table 1 |
| Shielding: about 1 g/cm² | "we arrive at an average shielding thickness of ~3.5 mm Al equivalent. This corresponds to a shielding of ~1 g/cm2 that can be compared to typical shielding values for extravehicular activities (EVAs) discussed, e.g., in (23), of 0.3 g/cm2 of space suit fabric and 1 g/cm2 for a pressurized rover vessel. Thus, the values reported here can be taken as good estimates for the dose rate during EVAs on the lunar surface." | Section "Results", the paragraph after Table 1 |
| Solar cycle: near minimum, an upper limit | "Because the Sun is currently still in an extended activity minimum (30), the dose rate from GCR reported here may be considered as an upper limit for human exploration of the Moon during conditions of low solar activity." | Section "Discussion", first paragraph |
| Dates of the measurement | "Figure 3 shows time-resolved measurements acquired by LND from 3 January to 12 January and from 31 January to 10 February 2019" | Section "Materials and Methods", last paragraph |
| 2.6 times the station | "For the same time period, the dose equivalent onboard the International Space Station (ISS) as measured with the DOSIS 3D DOSTEL instruments (29) was 731 μSv/day with contributions only from GCR of 523 μSv/day. ... Therefore, the daily GCR dose equivalent on the surface of the Moon is around a factor of 2.6 higher than the dose inside the ISS." | Section "Discussion", first paragraph |
| Neutral particles: 23 ± 8% | "Thus, we find that neutral particles contributed a nonnegligible fraction of 23 ± 8% to the total dose" | Section "Results" |
| No solar particle event | "In the time period reported here, no SPE was observed from the surface of the Moon." | Last paragraph of the text |

A note about the absorbed dose: the paper has two values of 13.2. The total dose rate in silicon (charged and neutral particles) is 13.2 ± 1 µGy for each hour. The dose rate of the charged particles alone is 10.2 ± 1.1 in silicon, which is "13.2 ± 1.4 μGy/hour converted to water". The app uses the first one, the value of the abstract.

The credit, from the acknowledgments of the paper: "The LND instrument is supported by the German Space Agency, DLR, and its Space Administration under grant 50 JR 1604 to the Christian-Albrechts-University (CAU) Kiel." And: "We thank ... the China National Space Administration (CNSA) for data acquisition and dissemination." The author contributions name six people who "designed LND". Kiel University is an address of all six in the paper.
The landing: "Lander and rover were launched at 18:23 UTC on December 7, 2018 and landed in the von Kármán crater at 02:26 UTC on January 3, 2019" (Wimmer-Schweingruber et al. 2020, abstract).

For another time of the solar cycle: George et al. 2024, Table 2, row "Lunar surface": "0.81 (ref. 40)". Reference 40 is Zhang et al. 2020. The caption says the table is "for the December 2022 time frame". The app shows this as a finding.

### 4.2 Cabin, crew, length

Burke, C., Howard, R. L., Kessler, P. "Internal Layout of a Lunar Surface Habitat." AIAA ASCEND 2022. NASA Technical Reports Server, document 20220013669. https://ntrs.nasa.gov/citations/20220013669

- Volume 127 m³: "The habitat enclosure provides approximately 127 m3 habitable volume. For two crew, this is nearly 64 m3 of habitable volume per crewmember."
- Crew of 2 and 30 days: "At delivery, the SH will support a crew of two for approximately 30 days. Additionally, in a contingency it will be capable of providing a safe haven for four crew for seven days."

This is a concept of NASA, not a habitat that flew. The simulator can change the length of the stay from 1 to 180 days. These limits are our choice.

## 5. Gateway

No station has flown, so no dose measurement of Gateway exists. The dose rate is the Artemis I cosmic-ray rate (section 1.1), with the badge "proxy" and `proxyOf: 'Artemis I'`.

| Value in the app | Quote | Source |
|---|---|---|
| Habitable volume 125 m³ | "Once fully assembled, Gateway will be about one-fifth the size of the ISS and weigh approximately 63 metric tons with an interior habitable volume (sustained capability) of about 125 cubic meters." | https://www.nasa.gov/gateway-capabilities/ |
| Crew of 4, stay of 30 days | "Early configurations of Gateway with Orion attached can accommodate up to four astronauts for 30-90 days." | https://www.nasa.gov/gateway-capabilities/ |
| Orbit | "Gateway will travel in a unique polar orbit around the Moon known as near-rectilinear halo orbit (NRHO), completing one orbit in about one week (6.5 days). This orbit will bring Gateway within approximately 1,500 kilometers of the Moon at its closest approach and as far as about 70,000 kilometers at its farthest point." | https://www.nasa.gov/gateway-capabilities/ |
| Status | "As part of this strategy, the agency intends to pause Gateway in its current form and shift focus to infrastructure that enables sustained surface operations." | NASA news release 26-025, 24 March 2026, https://www.nasa.gov/news-release/nasa-unveils-initiatives-to-achieve-americas-national-space-policy/ |

The length of 30 days is our choice, at the low end of the NASA range. The app computes the place: it puts the station at the place of the Moon.

## 6. What we could not confirm

1. **Dachev et al. 2011, full text.** The paper is behind a paywall. The value 0.227 mGy for each day is from Wimmer-Schweingruber et al. 2020, which cites it. Two texts of the RADOM team give about 10 and about 8.8 µGy for each hour (0.24 and 0.21 mGy for each day). A person with access to the journal must check the table of the paper.
2. **A measured dose of Artemis II.** We found no result from NASA. When NASA publishes it, replace the proxy rates and fill the first phase.
3. **"About 60% lower".** The phrase is in the abstract of George et al. 2024 only. The numbers of the main text give 22% to 39% lower than MSL RAD (section 1.1).
4. **"CNSA is not a Space Apps partner agency."** The team lead gave this statement for the flag. We did not check the list of the partner agencies of Space Apps 2026.
5. **The time zone of the burn into the distant retrograde orbit.** The NASA post says CST, the NASA plan says EST. The JPL Horizons trajectory agrees with EST (section 1.2).
6. **The habitable volume of Orion in older NASA texts.** A web search showed older NASA fact sheets with 316 ft³. We did not open them. The app uses the 2026 fact sheet (330 ft³, 9.34 m³).
7. **The apogee of the first orbit of Artemis II.** JPL Horizons gives "70377 km" and does not say if this is the height above the surface or the distance from the middle of the Earth.
8. **The solar cycle in April 2026.** We have no source for the state of the solar cycle during Artemis II. The preset gives the two dates only.
9. **A rate for the distant retrograde orbit alone, and a rate for the Van Allen belts for each day.** The paper gives neither. The app uses one cosmic-ray rate for all phases after the belts, and a belt rate that is the published belt dose divided by the length of the phase.
10. **One line of Table 1 of George et al. 2024** has "9.42 ± 10.4" for the stomach sensor, which looks like a misprint of 1.04. The app does not use this table.
