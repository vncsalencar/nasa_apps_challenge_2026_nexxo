// Translation of the texts of the web app.
//
// The English text is the key: t('Body map'), t('in {time}', { time }).
// A language file maps the English text to its translation. If a text has no translation,
// the app shows the English text.
//
// The language is fixed when the page loads. setLang() saves the new language and loads the
// page again, so each text of the page is in one language.
import { ptBR } from './locales/pt-BR.ts'

export type Lang = 'en' | 'pt-BR'
export const LANGS: { id: Lang; label: string; short: string }[] = [
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'pt-BR', label: 'Português (Brasil)', short: 'PT' },
]
const DICTIONARY: Record<Lang, Record<string, string>> = { en: {}, 'pt-BR': ptBR }
const KEY = 'nexxo-lang'

function first(): Lang {
  try {
    const stored = localStorage.getItem(KEY)
    if (LANGS.some((item) => item.id === stored)) return stored as Lang
  } catch {
    // The browser blocks storage. Use the language of the browser.
  }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en'
}

export const lang: Lang = first()
if (typeof document !== 'undefined') document.documentElement.lang = lang

export function setLang(next: Lang) {
  if (next === lang) return
  try {
    localStorage.setItem(KEY, next)
  } catch {
    // The choice cannot be saved, so the page cannot change the language.
    return
  }
  window.location.reload()
}

export type Params = Record<string, string | number>

// English texts that the current language has no translation for. For people who translate:
// open the pages, then read window.__i18nMissing in the console.
const missing = new Set<string>()
if (typeof window !== 'undefined') (window as unknown as { __i18nMissing: Set<string> }).__i18nMissing = missing

// A number in the way of the language: 38.7 in English, 38,7 in Portuguese.
export function fmt(value: number, decimals = 0): string {
  return value.toLocaleString(lang, { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: false })
}

// Returns the text in the current language. A value in "params" replaces {name}.
// {name:1} formats a number with 1 decimal.
export function t(text: string, params?: Params): string {
  const translated = DICTIONARY[lang][text]
  if (translated === undefined && lang !== 'en') missing.add(text)
  const template = translated ?? text
  if (!params) return template
  return template.replace(/\{(\w+)(?::(\d))?\}/g, (whole, name: string, decimals?: string) => {
    const value = params[name]
    if (value === undefined) return whole
    return typeof value === 'number' && decimals !== undefined ? fmt(value, Number(decimals)) : String(value)
  })
}

// A text with a count: tn(count, '{count} person', '{count} persons').
export function tn(count: number, one: string, other: string, params?: Params): string {
  return t(count === 1 ? one : other, { count, ...params })
}
