// All mission presets, in the order of the mission picker.
import type { Preset, PresetId } from '../types.ts'
import { iss } from './iss.ts'
import { artemis1 } from './artemis1.ts'
import { artemis2 } from './artemis2.ts'
import { lunarOrbit } from './lunar-orbit.ts'
import { lunarSurface } from './lunar-surface.ts'
import { gateway } from './gateway.ts'
import { msl } from './msl.ts'
import { tgo } from './tgo.ts'
import { marsReference } from './mars-reference.ts'
import { custom } from './custom.ts'

export const PRESETS: Preset[] = [iss, artemis1, artemis2, lunarOrbit, lunarSurface, gateway, msl, tgo, marsReference, custom]
export const PRESET_BY_ID = Object.fromEntries(PRESETS.map((preset) => [preset.id, preset])) as Record<PresetId, Preset>
// The first preset that the page shows.
export const DEFAULT_PRESET: PresetId = 'msl'
