// Finds the trigger word at the start of a sentence that the Whisper model wrote.
//
// The model does not know the word "Nexxo". It writes a word that sounds almost the same, for
// example "Nexo", "Nexus", or the two words "Next so". So the match compares how the words sound,
// not how they are written.

export type Parsed =
  // The usual output of the model for noise or silence. The listener drops it.
  | { kind: 'noise' }
  // The person said only the trigger word.
  | { kind: 'trigger' }
  // The trigger word and a command. "text" has no trigger word.
  | { kind: 'command'; text: string }
  // A sentence without the trigger word.
  | { kind: 'other'; text: string }

// What the model writes when it hears no words. All in lower case, with no punctuation.
const NOISE = new Set([
  '',
  'you',
  'thank you',
  'thanks',
  'thank you very much',
  'thanks for watching',
  'thank you for watching',
  'bye',
  'bye bye',
  'so',
  'oh',
  'uh',
  'um',
  'hmm',
  'mm',
  'the',
  'i',
  'a',
])

// A word that a person can say before the trigger word.
const GREETINGS = new Set(['hey', 'hi', 'hay', 'hello', 'ok', 'okay', 'yo', 'and', 'so', 'well'])

// Real words that the model writes for a trigger word, found in tests. The key is the sound of the trigger word.
const ALSO: Record<string, string[]> = {
  nekso: ['nexus'],
}

// How the model writes a long "o" at the end of a word when it splits the word in two: "Next so", "Next oh".
const LONG_O = ['o', 'oh', 'owe', 'so', 'sew', 'sow', 'zo']

// Writes a word as its sounds, so words that sound the same get the same key.
// "nexxo", "nexo", "necso" and "nex o" all get the key "nekso".
export function soundKey(word: string): string {
  let s = word.toLowerCase().replace(/[^a-z]/g, '')
  s = s
    // Two equal letters in a row sound the same as one.
    .replace(/(.)\1+/g, '$1')
    .replace(/x/g, 'ks')
    .replace(/ck/g, 'k')
    .replace(/c(?=[eiy])/g, 's')
    .replace(/c/g, 'k')
    .replace(/q/g, 'k')
    .replace(/z/g, 's')
    .replace(/ph/g, 'f')
    .replace(/h/g, '')
    // A long "o" at the end has many spellings: "nexo", "nexoe", "nexow".
    .replace(/(oe|ow|ou|eau|oa)$/, 'o')
  return s.replace(/(.)\1+/g, '$1')
}

// The number of single-letter changes (add, remove, replace) that make "a" equal to "b".
export function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        previous[j] + 1,
        row[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    previous = row
  }
  return previous[b.length]
}

const VOWELS = /[aeiouy]/g
const VOWELS_AT_END = /[aeiouy]+$/

// True if the heard words sound like the trigger word.
// "words" is one word, or two words if the model split the trigger word.
export function soundsLikeTrigger(words: string[], trigger: string): boolean {
  const target = soundKey(trigger)
  if (words.length === 1) {
    const heard = soundKey(words[0])
    if (heard === target) return true
    if (ALSO[target]?.includes(words[0])) return true
    // The consonants carry the word. They must be the same, in the same order.
    if (heard.replace(VOWELS, '') !== target.replace(VOWELS, '')) return false
    // The trigger word ends with a vowel sound, so the heard word must too. "Next" and "necks" do not.
    if (VOWELS_AT_END.test(target) !== VOWELS_AT_END.test(heard)) return false
    // One vowel can differ: "naxo", "nexa".
    return editDistance(heard, target) <= 1
  }
  // Two words with the sound of the trigger word: "nex o", "neck so".
  if (soundKey(words.join('')) === target) return true
  // The model wrote the start as a real word and the last sound as a second word: "next so", "next oh".
  const front = target.replace(VOWELS_AT_END, '')
  const last = target.slice(front.length)
  if (front === target || front.length < 3) return false
  const first = soundKey(words[0])
  if (first !== front && first !== `${front}t`) return false
  const endings = last === 'o' ? LONG_O : [last, front.slice(-1) + last]
  return endings.includes(words[1])
}

type Word = { text: string; start: number; end: number }

function wordsOf(sentence: string): Word[] {
  const words: Word[] = []
  for (const match of sentence.matchAll(/[\p{L}\p{N}]+(?:'[\p{L}]+)?/gu)) {
    words.push({
      text: match[0].toLowerCase().replace(/'s$/, ''),
      start: match.index,
      end: match.index + match[0].length,
    })
  }
  return words
}

// The sentence in lower case with no punctuation.
function plain(sentence: string): string {
  return wordsOf(sentence)
    .map((word) => word.text)
    .join(' ')
}

export function isNoise(sentence: string): boolean {
  const text = sentence.trim()
  // The model writes sounds that are not speech in brackets: "[BLANK_AUDIO]", "(music)", "*sigh*".
  if (/^[\s[(*♪]/.test(text) && /^(\s*(\[[^\]]*\]|\([^)]*\)|\*[^*]*\*|♪+)\s*)+$/.test(text)) return true
  return NOISE.has(plain(text))
}

// Removes the punctuation that stays at the two ends when the trigger word is cut off.
function tidy(text: string): string {
  return text
    .replace(/^[\s,.;:!?…\-–—]+/, '')
    .replace(/[\s,.]+$/, '')
    .trim()
}

export function parseSentence(sentence: string, trigger: string): Parsed {
  if (isNoise(sentence)) return { kind: 'noise' }
  const words = wordsOf(sentence)
  // The trigger word is the first word, or the second word after a greeting ("Hey Nexxo").
  const first = words.length > 1 && GREETINGS.has(words[0].text) ? 1 : 0
  // Try two words first, because the model can split the word ("Nex o", "Next so").
  for (const count of [2, 1]) {
    const part = words.slice(first, first + count)
    if (part.length < count) continue
    // Two words are one trigger word only with no end of a sentence between them. "Next. So ..." is not.
    if (count === 2 && /[.!?]/.test(sentence.slice(part[0].end, part[1].start))) continue
    if (!soundsLikeTrigger(part.map((word) => word.text), trigger)) continue
    const rest = tidy(sentence.slice(part[part.length - 1].end))
    return rest ? { kind: 'command', text: rest } : { kind: 'trigger' }
  }
  return { kind: 'other', text: tidy(sentence) }
}
