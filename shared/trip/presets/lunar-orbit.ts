// A stay in a circular orbit 100 km above the Moon. No crewed flight is behind this preset:
// the dose rate is a measurement of the robotic orbiter Chandrayaan-1 (ISRO, India), and the
// cabin and the length of the stay are our choice.
// Each number has its exact quote and its place in the source in docs/sources-lunar.md.
import type { Preset, Rate, SourceRef } from '../types.ts'
import { GEORGE_2024, ORION_VOLUME } from './artemis1.ts'

// The paper with the measurement. We could not open its full text (paywall).
const DACHEV_2011: SourceRef = {
  short: 'Dachev et al. 2011',
  title: 'Dachev, T. P., Tomov, B. T., Matviichuk, Yu. N., et al. An overview of RADOM results for earth and moon radiation environment on Chandrayaan-1 satellite. Advances in Space Research 48, 779–791 (2011).',
  url: 'https://doi.org/10.1016/j.asr.2011.05.009',
}

// The open paper where we read the value. It cites Dachev et al. 2011 for it.
const WIMMER_2020: SourceRef = {
  short: 'Wimmer-Schweingruber et al. 2020',
  title: 'Wimmer-Schweingruber, R. F., Yu, J., Böttcher, S. I., et al. The Lunar Lander Neutron and Dosimetry (LND) Experiment on Chang’E 4. Space Science Reviews 216, 104 (2020). Section 2.',
  url: 'https://arxiv.org/abs/2001.11028',
}

const RADOM_QUOTED: SourceRef = {
  short: 'Dachev et al. 2011, as quoted in Wimmer-Schweingruber et al. 2020',
  title: `${DACHEV_2011.title} We read the value in: ${WIMMER_2020.title}`,
  url: WIMMER_2020.url,
}

const VADAWALE_2010: SourceRef = {
  short: 'Vadawale et al. 2010',
  title: 'Vadawale, S. V., Goswami, J. N., Dachev, T. P., Tomov, B. T., Girish, V. Radiation Environment in Earth-Moon Space: Results from RADOM Experiment Onboard Chandrayaan-1. arXiv:1012.2014 (2010).',
  url: 'https://arxiv.org/abs/1012.2014',
}

const DE_ANGELIS_2012: SourceRef = {
  short: 'De Angelis et al. 2012',
  title: 'De Angelis, G., Dachev, T. P., Tomov, B., Matviichuk, Yu., Dimitrov, P. Lunar Radiation Environment Chandrayaan-1 RADOM Experiment Data: Final Analysis. 63rd International Astronautical Congress, paper IAC-12,A1,4,4,x13018 (2012), abstract.',
  url: 'https://iafastro.directory/iac/paper/id/13018/abstract-pdf/IAC-12,A1,4,4,x13018.brief.pdf',
}

const COMPUTED: SourceRef = { short: 'Computed by this app', title: 'This app computes the place. No flight path of a real mission is behind it.', url: '' }

const RADOM: Rate = {
  value: 0.227,
  unit: 'mGy',
  instrument: 'Chandrayaan-1 RADOM (Radiation Dose Monitor of the Bulgarian Academy of Sciences, on the ISRO orbiter)',
  shielding: 'On the robotic orbiter, behind about 0.45 g/cm² on the side of the detector that faces space, and more on the other side (De Angelis et al. 2012).',
  solar: 'Deep solar minimum (November 2008 to May 2009), when galactic cosmic rays are strongest.',
  says: 'RADOM measured "a dose rate of 0.227 mGy per day averaged over 3545 hours" in the 100 km orbit, from 20 November 2008 to 18 May 2009. It is an absorbed dose in a silicon detector. The sentence is from Wimmer-Schweingruber et al. 2020, which cites Dachev et al. 2011.',
  source: RADOM_QUOTED,
  badge: 'real-rate',
}

export const lunarOrbit: Preset = {
  id: 'lunar-orbit',
  name: 'Lunar orbit',
  summary: 'A stay of 14 days in a circular orbit 100 km above the Moon, with the dose rate that the robotic orbiter Chandrayaan-1 measured there.',
  badge: 'real-rate',
  destination: 'moon',
  frame: 'earth',
  trajectory: {
    file: null,
    source: COMPUTED,
    note: 'No real flight path. The map puts the spacecraft at the place of the Moon, because an orbit of 100 km is too small for the scale of the map.',
    badge: 'modelled',
  },
  phases: [
    {
      id: 'orbit',
      label: 'Lunar orbit, 100 km',
      kind: 'orbit',
      days: 14,
      rate: RADOM,
      note: 'The length of 14 days is our choice. In the 200 km orbit of the last three months, the same source gives 0.257 mGy for each day.',
    },
  ],
  crew: 4,
  cabin: {
    name: 'Orion crew module',
    freeVolumeM3: 9.34,
    source: ORION_VOLUME,
    assumption: 'The cabin is our choice: Chandrayaan-1 had no crew. We use the Orion crew module with 4 astronauts, the NASA spacecraft for lunar orbit.',
  },
  findings: [
    {
      text: 'In the 100 km orbit, the Moon blocks a part of the sky. The dose rate went up from 0.227 to 0.257 mGy for each day when the orbiter moved up to 200 km, because the Moon blocked less and the Sun was less active.',
      source: RADOM_QUOTED,
    },
    {
      text: 'For comparison, as a dose equivalent: George et al. 2024 list 1.55 mSv for each day in low lunar orbit for December 2022, from the CRaTER instrument on the Lunar Reconnaissance Orbiter. That is another instrument and another time, so the app does not use it as the rate.',
      source: GEORGE_2024,
    },
  ],
  flags: [
    'The rate is an absorbed dose (mGy). The source gives no dose equivalent (mSv) for this measurement, so the mSv chart shows no data.',
    'The rate comes from a robotic orbiter with thin shielding, at a deep solar minimum. A crewed spacecraft with more shielding, at another time of the solar cycle, gets another dose.',
    'The length of 14 days, the crew of 4, and the Orion cabin are our choice. NASA says that Orion can keep 4 astronauts for up to 21 days.',
    'We could not open the full text of Dachev et al. 2011. The value is from a later paper that cites it. A report of the RADOM team (Vadawale et al. 2010) gives about 10 µGy for each hour at 100 km, which agrees (about 0.24 mGy for each day).',
  ],
  sources: [DACHEV_2011, WIMMER_2020, VADAWALE_2010, DE_ANGELIS_2012, GEORGE_2024, ORION_VOLUME],
}
