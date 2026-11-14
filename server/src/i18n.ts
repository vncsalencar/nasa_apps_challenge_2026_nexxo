// Translation of the texts that the server writes: notifications, questions, advice, the log.
//
// The English text is the key. Server code writes a text with tx():
//   tx('The sensor reads {value}. Normal: {range}.', { value: '3.65 mmHg', range })
// tx() does not return the final text. It returns a small token that holds the English
// template and the values. The server can store the token in the database, put it inside
// another text, or join it with other texts. When a response leaves the server, render()
// turns each token into the language of the reader. So one stored notification reads in
// English for one crew member and in Portuguese for the next.
//
// A text with no token passes through unchanged. So old rows and free text still work.
import type { NextFunction, Request, Response } from 'express'
import { ptBR } from './locales/pt-BR.ts'

export type Lang = 'en' | 'pt-BR'
export const LANGS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'pt-BR', label: 'Português (Brasil)' },
]
const DICTIONARY: Record<Lang, Record<string, string>> = { en: {}, 'pt-BR': ptBR }

// These two characters mark a token. They do not occur in normal text.
const OPEN = '⟦'
const CLOSE = '⟧'

export type Params = Record<string, string | number>

// Writes a text for later translation. A value in "params" replaces {name} in the template.
// {name:1} formats a number with 1 decimal in the way of the language (38.7 or 38,7).
export function tx(template: string, params?: Params): string {
  return OPEN + JSON.stringify(params ? [template, params] : [template]) + CLOSE
}

// The same for a text with a count: "1 question" and "{count} questions".
export function txn(count: number, one: string, other: string, params?: Params): string {
  return tx(count === 1 ? one : other, { count, ...params })
}

// Makes the first letter of a text small after the translation, for a label inside a sentence:
// tx('You entered {label}.', { label: lowerFirst(indicator.label) }). A text that starts with two
// capital letters, such as "CO2", stays as it is. Do not use toLowerCase() on a token: it breaks the token.
export function lowerFirst(text: string): string {
  return OPEN + JSON.stringify(['{text}', { text }, 'lowerFirst']) + CLOSE
}

// English templates that a language has no translation for. See GET /api/i18n/missing.
export const missing: Record<string, Set<string>> = { 'pt-BR': new Set() }

function fill(template: string, params: Params | undefined, lang: Lang): string {
  if (!params) return template
  return template.replace(/\{(\w+)(?::(\d))?\}/g, (whole, name: string, decimals?: string) => {
    const value = params[name]
    if (value === undefined) return whole
    if (typeof value === 'number') {
      if (decimals === undefined) return String(value)
      return value.toLocaleString(lang, { minimumFractionDigits: Number(decimals), maximumFractionDigits: Number(decimals), useGrouping: false })
    }
    // A value can hold tokens of its own.
    return render(value, lang)
  })
}

// Turns each token in a text into the language. Text outside of tokens stays as it is.
export function render(text: string, lang: Lang): string {
  let start = text.indexOf(OPEN)
  if (start === -1) return text
  let out = ''
  let position = 0
  while (start !== -1) {
    // Find the end of this token. A token can hold other tokens inside its values.
    let depth = 0
    let end = -1
    for (let index = start; index < text.length; index++) {
      if (text[index] === OPEN) depth++
      else if (text[index] === CLOSE && --depth === 0) {
        end = index
        break
      }
    }
    if (end === -1) break
    out += text.slice(position, start)
    try {
      const [template, params, option] = JSON.parse(text.slice(start + 1, end)) as [string, Params | undefined, string | undefined]
      const translated = DICTIONARY[lang][template]
      // A template that is only one value, such as "{text}", needs no translation.
      if (translated === undefined && lang !== 'en' && !/^\{\w+\}$/.test(template)) missing[lang]?.add(template)
      let piece = fill(translated ?? template, params, lang)
      if (option === 'lowerFirst' && !/^\p{Lu}[\p{Lu}\d]/u.test(piece)) piece = piece.charAt(0).toLocaleLowerCase(lang) + piece.slice(1)
      out += piece
    } catch {
      out += text.slice(start, end + 1)
    }
    position = end + 1
    start = text.indexOf(OPEN, position)
  }
  return out + text.slice(position)
}

// Renders each text in a value of any shape: an object, a list, a text.
export function localize<T>(value: T, lang: Lang): T {
  if (typeof value === 'string') return render(value, lang) as T
  if (Array.isArray(value)) return value.map((item) => localize(item, lang)) as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) out[key] = localize(item, lang)
    return out as T
  }
  return value
}

// The language of a request: the header "x-lang", or "?lang=", or the language of the browser.
export function langOf(request: Request): Lang {
  const asked = String(request.get('x-lang') ?? request.query.lang ?? request.get('accept-language') ?? '')
  return asked.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en'
}

// Each JSON response leaves the server in the language of the request.
export function translateResponses(request: Request, response: Response, next: NextFunction) {
  const send = response.json.bind(response)
  response.json = (body: unknown) => send(localize(body, langOf(request)))
  next()
}
