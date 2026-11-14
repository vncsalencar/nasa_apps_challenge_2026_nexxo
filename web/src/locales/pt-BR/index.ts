// The Brazilian Portuguese texts of the web app. The key is the English text.
// Each area has its own file, so people can work on them at the same time.
import { alerts } from './alerts.ts'
import { bodyCabin } from './body-cabin.ts'
import { checkups } from './checkups.ts'
import { frame } from './frame.ts'
import { homes } from './homes.ts'
import { shared } from './shared.ts'
import { simulator } from './simulator.ts'

export const ptBR: Record<string, string> = { ...shared, ...frame, ...homes, ...bodyCabin, ...checkups, ...alerts, ...simulator }
