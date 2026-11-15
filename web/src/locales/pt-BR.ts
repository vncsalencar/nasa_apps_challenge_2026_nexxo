// Brazilian Portuguese. The key is the English text. A text with no line here shows in English.
import { helmetTexts } from './pt-BR/helmet.ts'

// The frame of the pages.
const base: Record<string, string> = {
  Simulator: 'Simulador',
  Language: 'Idioma',
  'Loading the simulator…': 'Carregando o simulador…',
  'No connection to the server. The page tries again.': 'Sem conexão com o servidor. A página tenta de novo.',
  Simulated: 'Simulado',
  'no connection': 'sem conexão',
  '{from} to {to} mmHg': '{from} a {to} mmHg',
}

export const ptBR: Record<string, string> = { ...base, ...helmetTexts }
