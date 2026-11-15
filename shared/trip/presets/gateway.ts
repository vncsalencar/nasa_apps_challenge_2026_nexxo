// Gateway: the small station that NASA and its partners planned for an orbit around the Moon.
// No station has flown, so each radiation number of this preset is a proxy from Artemis I.
// Each number has its exact quote and its place in the source in docs/sources-lunar.md.
import type { Preset, Rate, SourceRef } from '../types.ts'
import { ARTEMIS1_COSMIC_RAYS, GEORGE_2024 } from './artemis1.ts'

const GATEWAY_CAPABILITIES: SourceRef = {
  short: 'NASA, Gateway Capabilities',
  title: 'NASA, "Gateway Capabilities": crew, habitable volume, and orbit of the station.',
  url: 'https://www.nasa.gov/gateway-capabilities/',
}

const NASA_PAUSE: SourceRef = {
  short: 'NASA release 26-025 (24 March 2026)',
  title: 'NASA news release 26-025, "NASA Unveils Initiatives to Achieve America’s National Space Policy", 24 March 2026.',
  url: 'https://www.nasa.gov/news-release/nasa-unveils-initiatives-to-achieve-americas-national-space-policy/',
}

const COMPUTED: SourceRef = { short: 'Computed by this app', title: 'This app computes the place. No flight path of a real mission is behind it.', url: '' }

// The Artemis I rate after the Van Allen belts, as a proxy.
const COSMIC_RAYS: Rate = {
  ...ARTEMIS1_COSMIC_RAYS,
  badge: 'proxy',
  proxyOf: 'Artemis I',
  says: 'Proxy from Artemis I: no station has flown in this orbit. George et al. 2024 give 0.96 to 1.24 mSv for each day from galactic cosmic rays inside Orion, far from the Earth. We use the middle of this range, 1.10.',
}

export const gateway: Preset = {
  id: 'gateway',
  name: 'Lunar Gateway (planned station)',
  summary: 'Gateway is a small station that NASA and its partners planned for a near-rectilinear halo orbit around the Moon. This preset is a stay of 30 days on it.',
  badge: 'proxy',
  destination: 'moon',
  frame: 'earth',
  trajectory: {
    file: null,
    source: COMPUTED,
    note: 'No real flight path. The map puts the station at the place of the Moon. The planned orbit takes about 6.5 days, between about 1,500 km and about 70,000 km from the Moon.',
    badge: 'modelled',
  },
  phases: [
    {
      id: 'orbit',
      label: 'Gateway orbit',
      kind: 'orbit',
      days: 30,
      rate: COSMIC_RAYS,
      note: 'A near-rectilinear halo orbit: a long orbit over the poles of the Moon. The length of 30 days is our choice.',
    },
  ],
  crew: 4,
  cabin: { name: 'Gateway, fully assembled', freeVolumeM3: 125, source: GATEWAY_CAPABILITIES },
  flags: [
    'Gateway has no flown station data. Every Gateway number is a proxy.',
    'Artemis I proxy. The dose rate is the rate that Artemis I measured inside Orion after the Van Allen belts. The shielding of Gateway is not the shielding of Orion, so the real rate can differ.',
    'NASA said on 24 March 2026 that it intends to pause Gateway in its current form.',
    'The stay of 30 days is our choice. NASA planned stays of 30 to 90 days for up to four astronauts, with Orion attached.',
    'The habitable volume of about 125 m³ is the NASA number for the fully assembled station. An early station has fewer modules, so it has less volume.',
    'Artemis I flew in November and December 2022. The dose rate from cosmic rays changes with the solar cycle.',
  ],
  sources: [GEORGE_2024, GATEWAY_CAPABILITIES, NASA_PAUSE],
}
