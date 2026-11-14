// The Brazilian Portuguese texts of the server. The key is the English template.
// Each area has its own file, so people can work on them at the same time.
import { assistant } from './pt-BR/assistant.ts'
import { catalog } from './pt-BR/catalog.ts'
import { medical } from './pt-BR/medical.ts'

export const ptBR: Record<string, string> = { ...catalog, ...medical, ...assistant }
