// The assistant: a crew member says or types one sentence, and the app answers with one or
// two short sentences and maybe does an action. The page reads the answer aloud.
//
// Two ways to understand the sentence:
//   1. Fixed rules (always there). They need no network, so they also work with no link to Earth.
//      They understand English and Brazilian Portuguese. The language of the request selects the set.
//   2. A language model (optional). The server uses it when the insights are on for the mission
//      and the server has a key. The model gets the same actions as tools.
// If the model fails, the server uses the fixed rules.
//
// Each answer is a tx() token (see i18n.ts). The response renders it in the language of the request.
// The model gets all its data in English and writes its answer in the language of the crew member.
import Anthropic from '@anthropic-ai/sdk'
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod'
import type { Request, Response, Router } from 'express'
import { z } from 'zod'
import { answerCheckup, crewName, endClaim, hourOf, markAllRead, reportSymptom, startClaim } from './actions.ts'
import { claimsOf } from './claims.ts'
import { db } from './db.ts'
import { langOf, localize, lowerFirst, render, tx, txn, type Lang } from './i18n.ts'
import { adviceFor, indicatorById, num, statusOf, valueText, type BodyPart, type Status } from './indicators.ts'
import { getSettings } from './insights/index.ts'
import { ROLES, emit } from './monitor.ts'
import { RULES, ruleById } from './rules.ts'
import { crewOf } from './simulator.ts'

const SHEETS = ['body', 'cabin', 'checkups', 'alerts', 'history', 'log'] as const
const MODES = ['readiness', 'bridge', 'companion'] as const
type Sheet = (typeof SHEETS)[number]
type Mode = (typeof MODES)[number]
// What the app says when it opens a screen or a view. Each text is a full sentence, so a language can change the word order.
const SHEET_REPLY: Record<Sheet | 'home', string> = {
  body: tx('Here is the body screen.'),
  cabin: tx('Here is the cabin screen.'),
  checkups: tx('Here is the check-ups screen.'),
  alerts: tx('Here is the alerts screen.'),
  history: tx('Here is the history screen.'),
  log: tx('Here is the mission log screen.'),
  home: tx('Here is the home screen.'),
}
const MODE_REPLY: Record<Mode, string> = {
  readiness: tx('Here is the readiness view.'),
  bridge: tx('Here is the bridge view.'),
  companion: tx('Here is the companion view.'),
}

export type AssistantReply = {
  // What the app says. Short, because the page reads it aloud.
  reply: string
  // What the server did, one sentence for each action.
  did: string[]
  // What the page must show now. null: no change.
  show: { sheet?: Sheet | null; mode?: Mode } | null
  // true if the reply ends with a question for the crew member. The page then listens for the answer.
  expectsAnswer: boolean
  // Who understood the sentence.
  source: 'rules' | 'model'
}

// The symptoms that the assistant knows, with the words that people use for them in each language.
// The name is an identifier: the database keeps the English name. The Portuguese patterns have no
// accents, because the rules remove the accents from the sentence before the match.
const SYMPTOMS: { name: string; bodyPart: BodyPart; words: Record<Lang, RegExp> }[] = [
  {
    name: 'Headache',
    bodyPart: 'head',
    words: {
      en: /\b(headache|head ache|head hurts|head is hurting|migraine)\b/,
      'pt-BR': /\b(dor(es)? (de|na) cabeca|cabeca (doi|esta doendo|ta doendo|doendo|dolorida)|doi (a |minha )?cabeca|enxaqueca)\b/,
    },
  },
  {
    name: 'Dizziness',
    bodyPart: 'head',
    words: { en: /\b(dizzy|dizziness|light headed|lightheaded)\b/, 'pt-BR': /\b(tont[oa]|tontura|tonteira|zonz[oa]|vertigem)\b/ },
  },
  {
    name: 'Blurred vision',
    bodyPart: 'head',
    words: {
      en: /\b(blurred vision|blurry vision|vision is blurry|see blurry|cannot see well)\b/,
      'pt-BR': /\b((visao|vista) (esta |ta )?(turva|embacada|borrada)|(vendo|enxergando) (tudo )?(embacado|borrado|turvo|mal)|nao (consigo )?(enxergo|enxergar|vejo|ver) (bem|direito))\b/,
    },
  },
  { name: 'Fever', bodyPart: 'head', words: { en: /\b(fever|feverish|chills)\b/, 'pt-BR': /\b(febre|febril|calafrios?)\b/ } },
  {
    name: 'Stuffy nose',
    bodyPart: 'head',
    words: { en: /\b(stuffy nose|blocked nose|congested)\b/, 'pt-BR': /\b(nariz (esta |ta )?(entupido|tapado|congestionado|trancado)|congestao nasal|congestionad[oa])\b/ },
  },
  {
    name: 'Low mood',
    bodyPart: 'head',
    words: { en: /\b(low mood|sad|feel down|feeling down|depressed)\b/, 'pt-BR': /\b(humor baixo|triste|tristeza|pra baixo|para baixo|deprimid[oa]|desanimad[oa])\b/ },
  },
  {
    name: 'Fatigue',
    bodyPart: 'head',
    words: { en: /\b(fatigue|tired|exhausted|no energy)\b/, 'pt-BR': /\b(fadiga|cansad[oa]|cansaco|exaust[oa]|esgotad[oa]|sem energia)\b/ },
  },
  {
    name: 'Chest pain',
    bodyPart: 'chest',
    words: {
      en: /\b(chest pain|chest hurts|pain in my chest)\b/,
      'pt-BR': /\b(dor(es)? no peito|peito (doi|esta doendo|ta doendo|doendo)|doi (o |meu )?peito|aperto no peito)\b/,
    },
  },
  {
    name: 'Palpitations',
    bodyPart: 'chest',
    words: {
      en: /\b(palpitations|heart is racing|heart races|racing heart)\b/,
      'pt-BR': /\b(palpitac(ao|oes)|coracao (esta |ta )?(acelerado|disparado|disparou|batendo (muito )?(rapido|forte)))\b/,
    },
  },
  {
    name: 'Short of breath',
    bodyPart: 'chest',
    words: {
      en: /\b(short of breath|hard to breathe|cannot breathe|can t breathe|trouble breathing)\b/,
      'pt-BR': /\b(falta de ar|sem ar|dificil respirar|dificuldade (para|pra|de|em) respirar|nao (consigo|posso) respirar( direito| bem)?|respirando mal)\b/,
    },
  },
  { name: 'Cough', bodyPart: 'chest', words: { en: /\b(cough|coughing)\b/, 'pt-BR': /\b(tosse|tossindo|tossir)\b/ } },
  {
    name: 'Nausea',
    bodyPart: 'abdomen',
    words: {
      en: /\b(nausea|nauseous|feel sick|sick to my stomach|want to vomit)\b/,
      'pt-BR': /\b(nauseas?|enjoad[oa]|enjoo|ansia de vomito|vontade de vomitar|quero vomitar)\b/,
    },
  },
  {
    name: 'Stomach pain',
    bodyPart: 'abdomen',
    words: {
      en: /\b(stomach pain|stomach ache|stomachache|stomach hurts|belly hurts)\b/,
      'pt-BR': /\b(dor(es)? (de|no) estomago|dor(es)? (de|na) barriga|dor abdominal|(estomago|barriga) (doi|esta doendo|ta doendo|doendo))\b/,
    },
  },
  {
    name: 'No appetite',
    bodyPart: 'abdomen',
    words: {
      en: /\b(no appetite|not hungry|cannot eat)\b/,
      'pt-BR': /\b(sem apetite|sem fome|falta de apetite|nao (tenho|estou com|to com|sinto) (apetite|fome)|nao consigo comer|perdi (o apetite|a fome))\b/,
    },
  },
  {
    name: 'Back pain',
    bodyPart: 'abdomen',
    words: {
      en: /\b(back pain|back hurts|backache)\b/,
      'pt-BR': /\b(dor(es)? nas costas|dor(es)? na coluna|dor lombar|costas (doem|estao doendo|tao doendo|doendo|doloridas)|doem as costas)\b/,
    },
  },
  {
    name: 'Muscle pain',
    bodyPart: 'arms',
    words: {
      en: /\b(muscle pain|sore muscles|muscles hurt)\b/,
      'pt-BR': /\b(dor(es)? muscular(es)?|dor(es)? nos musculos|musculos (estao |tao )?(doem|doloridos|doendo))\b/,
    },
  },
  { name: 'Numbness', bodyPart: 'arms', words: { en: /\b(numb|numbness)\b/, 'pt-BR': /\b(dormencia|dormentes?|formigamento|formigando)\b/ } },
  {
    name: 'Skin rash',
    bodyPart: 'arms',
    words: { en: /\brash\b/, 'pt-BR': /\b(erupcao|irritacao na pele|alergia na pele|manchas? na pele|brotoejas?)\b/ },
  },
  {
    name: 'Joint pain',
    bodyPart: 'legs',
    words: {
      en: /\b(joint pain|joints hurt|knee hurts|knees hurt)\b/,
      'pt-BR': /\b(dor(es)? nas articulacoes|dor(es)? nas juntas|dor(es)? no joelho|dor(es)? nos joelhos|(juntas|articulacoes|joelhos) (estao |tao )?(doem|doendo|doloridos|doloridas)|joelho (esta |ta )?(doi|doendo|dolorido))\b/,
    },
  },
  { name: 'Weakness', bodyPart: 'legs', words: { en: /\b(weak|weakness)\b/, 'pt-BR': /\b(frac[oa]|fraqueza)\b/ } },
]

// The symptom names that have a translation: the list above and the symptoms of the check-up rules.
// The key is the name in small letters. The names are plain English identifiers, not tokens.
const KNOWN_SYMPTOMS = new Map([...SYMPTOMS.map((symptom) => symptom.name), ...RULES.map((rule) => rule.symptom.name)].map((name) => [name.toLowerCase(), name]))

// The words of one language for the fixed rules. The rules test them on the sentence in small
// letters, with no accents and no punctuation.
type Grammar = {
  // Screens and views. A sentence about a screen has one of the words in "screenVerb".
  screenVerb: RegExp
  modes: [Mode, RegExp][]
  // The first match counts. null is the home screen.
  sheets: [Sheet | null, RegExp][]
  // A symptom counts only in a sentence about the speaker.
  firstPerson: RegExp
  // A sentence that asks for something. It never records a symptom. The rules test it on the sentence with punctuation.
  question: RegExp | null
  // The words that turn "I have a headache" into "I do not have a headache".
  negation: RegExp
  // Answers to an open question.
  no: RegExp
  // "No" at the start of a sentence with punctuation after it, for example "Não, obrigado".
  noLead: RegExp | null
  yes: RegExp
  // With one of these words, the sentence does not start work, end work or mark notifications.
  deny: RegExp | null
  claim: RegExp
  finish: RegExp
  markRead: RegExp
  next: RegExp
  alerts: RegExp
  // The words that people use for each value. The first match counts.
  values: [string, RegExp][]
  status: RegExp
  help: RegExp
}

const GRAMMAR: Record<Lang, Grammar> = {
  en: {
    screenVerb: /\b(open|show|go to|display|see|close|go back|switch|change)\b/,
    modes: [
      ['bridge', /\b(bridge)\b/],
      ['readiness', /\b(readiness|ready ness)\b/],
      ['companion', /\b(companion)\b/],
    ],
    sheets: [
      ['checkups', /\b(check ?ups?|questions?)\b/],
      ['alerts', /\b(alerts?|notifications?|inbox)\b/],
      ['log', /\b(mission log|log)\b/],
      ['history', /\b(history|what i (did|reported|entered))\b/],
      ['cabin', /\b(cabin|station|air)\b/],
      ['body', /\b(body|my values|vitals|health)\b/],
      [null, /\b(close|go back|home)\b/],
    ],
    firstPerson: /\b(i have|i ve got|i got|i feel|i am|i m|im|my|i do not|i don t|i dont|i did not|i didn t)\b/,
    question: null,
    negation: /\b(no|not|don t|dont|do not|never)\b/,
    no: /^(no|nope|negative|i do not|i don t|i dont|i feel fine|i am fine|i m fine|im fine)\b/,
    noLead: null,
    yes: /^(yes|yeah|yep|yup|i do|affirmative|correct|confirm|that is right)\b/,
    deny: null,
    claim: /\b(i am on it|i m on it|im on it|on it|i take it|i will fix it|i ll fix it|i will check it)\b/,
    finish: /\b(work is done|it is fixed|it s fixed|i fixed it|i am done|i m done|job is done|finished)\b/,
    markRead: /\b(i saw it|mark .*read|acknowledge|dismiss)\b/,
    next: /\b(what (should|do|can|must) i do|what now|what next|what s next|next step|what is next)\b/,
    alerts: /\b(alerts?|notifications?)\b/,
    values: [
      ['co2_partial_pressure', /\b(co2|co 2|c o 2|c02|carbon dioxide|air quality|the air)\b/],
      ['cabin_temperature', /\b(cabin temperature|temperature of the cabin|temperature in the cabin|how (hot|warm|cold) is it)\b/],
      ['cabin_humidity', /\bhumid/],
      ['radiation_dose_rate', /\bradiation\b/],
      ['body_temperature', /\b(my temperature|body temperature|fever)\b/],
      ['heart_rate', /\b(heart rate|pulse|heartbeat|heart beat)\b/],
      ['blood_pressure_systolic', /\bblood pressure\b/],
      ['blood_glucose', /\b(blood sugar|glucose)\b/],
      ['sleep_duration', /\b(sleep|slept)\b/],
      ['mood_score', /\bmood\b/],
      ['stress_score', /\bstress/],
      ['fatigue_score', /\b(fatigue|tired)\b/],
      ['water_intake', /\b(water|drink|drank)\b/],
      ['energy_intake', /\b(food|eat|ate|calories)\b/],
      ['exercise_minutes', /\b(exercise|workout|training)\b/],
      ['cabin_temperature', /\btemperature\b/],
    ],
    status: /\b(how am i|how are my|status|report|summary|how is the (crew|cabin|station)|how do i look|my readiness|anything wrong|everything ok)\b/,
    help: /\b(help|what can (i|you) (say|do))\b/,
  },

  // Brazilian Portuguese. In Portuguese, "não" also starts sentences that are not an answer
  // ("não sei", "não terminei", "não estou bem"). So "no" must be the whole sentence here, or
  // "não" with a comma after it. All other sentences with "não" get no answer for the open question.
  'pt-BR': {
    screenVerb: /\b(abr(ir|a|e)|mostr(ar|a|e)|(ir|va|vai) (para|pra)|ver|veja|exib(ir|a|e)|fech(ar|a|e)|volt(ar|a|e)|troc(ar|a)|troque|mud(ar|a|e)|quero|leva|leve)\b/,
    modes: [
      ['bridge', /\b(ponte|bridge)\b/],
      ['readiness', /\b(prontidao|readiness)\b/],
      ['companion', /\b(companheiro|companion)\b/],
    ],
    sheets: [
      ['checkups', /\b(check ?ups?|checapes?|perguntas?)\b/],
      ['alerts', /\b(alertas?|notificac(ao|oes)|avisos?|caixa de entrada)\b/],
      ['log', /\b(registro da missao|registro|diario de bordo|log)\b/],
      ['history', /\b(historico|o que (eu )?(fiz|relatei|informei|registrei))\b/],
      // No bare "ar" here: "falta de ar" is a symptom.
      ['cabin', /\b(cabine|cabina|estacao)\b/],
      ['body', /\b(corpo|meus valores|sinais vitais|saude)\b/],
      // "Fechar" and "voltar" count only with no other content in the sentence. So "a tosse volta toda noite"
      // and "volta a falta de ar" do not open the home screen.
      [null, /^((pode|por favor|agora) )?(fech(ar|a|e)|volt(ar|a|e))( (a|o|essa|esta|isso|tudo|tela|janela|atras|para|pra|ao|inicio|inicial|por favor))*$|\b(inicio|tela inicial)\b/],
    ],
    firstPerson: /\b(estou|to|tou|tenho|tive|sinto|senti|sentindo|fiquei|ando|eu|me|meu|minha|meus|minhas|nao|sem|doi|doem|doendo)\b/,
    question: /^(como|qual|quais|quant[oa]s?|o que|que|quando|onde|por ?que|sera que)\b|\?$/,
    negation: /\b(nao|nunca|jamais|sem|nem|nenhum|nenhuma)\b/,
    no: /^((nao )?(eu )?nao( (tenho|estou|to|tou|sinto|senti|tive))?( nao| nada| nenhum| nenhuma| isso)?|nao obrigad[oa]|negativo|nunca|jamais|de jeito nenhum|nenhum|nenhuma|(eu )?(estou|to|tou|me sinto) (muito )?(bem|otim[oa])( obrigad[oa])?)$/,
    noLead: /^(nao|negativo|nunca)\s*[,.;!]/,
    yes: /^(sim\b(?!.*\bnao\b).*|isso( mesmo)?|e isso( mesmo)?|claro|com certeza|afirmativo|positivo|correto|exato|exatamente|confirmo|confirmado|e verdade|verdade|aham|uhum|(eu )?(estou|to|tou|tenho|sinto)( sim)?)$/,
    deny: /\b(nao|nunca)\b/,
    claim: /\b(deixa comigo|deixe comigo|pode deixar|eu cuido|eu assumo|eu resolvo|eu pego|vou (resolver|cuidar|consertar|arrumar|verificar)|estou cuidando)\b/,
    finish: /\b(trabalho (terminou|acabou|esta feito|esta pronto|foi concluido)|terminei|acabei o trabalho|(esta|ta) (consertado|resolvido)|consertei|resolvi|resolvido|arrumei|concluido|finalizei)\b/,
    markRead: /\b(ja vi|ja li|eu vi|eu li|marc(ar|a|que) .*lid[oa]s?|ciente|dispens(ar|a|e))\b/,
    next: /\b(o que (eu )?(devo|faco|posso|preciso|tenho que|tenho de) fazer|o que (eu )?faco|o que fazer|o que vem (agora|depois)|proximo passo)\b|^e agora$/,
    alerts: /\b(alertas?|notificac(ao|oes)|avisos?)\b/,
    values: [
      ['co2_partial_pressure', /\b(co2|co 2|c o 2|c02|gas carbonico|dioxido de carbono|qualidade do ar|o ar)\b/],
      ['cabin_temperature', /\b(temperatura (da|na) cabine|esta (quente|frio)|faz (calor|frio))\b/],
      ['cabin_humidity', /\bumid/],
      ['radiation_dose_rate', /\bradiac/],
      ['body_temperature', /\b(minha temperatura|temperatura corporal|temperatura do (meu )?corpo|febre)\b/],
      ['heart_rate', /\b(frequencia cardiaca|batimentos?|pulso|pulsacao|coracao)\b/],
      ['blood_pressure_systolic', /\bpressao\b/],
      ['blood_glucose', /\b(glicemia|glicose|acucar)\b/],
      ['sleep_duration', /\b(sono|dormi|dormiu|durmo|dormindo)\b/],
      ['mood_score', /\bhumor\b/],
      ['stress_score', /\b(estresse|stress|estressad[oa])\b/],
      ['fatigue_score', /\b(fadiga|cansaco|cansad[oa])\b/],
      ['water_intake', /\b(agua|bebi|beber|hidratacao)\b/],
      ['energy_intake', /\b(comida|comi|comer|calorias|alimentacao|refeicoes)\b/],
      ['exercise_minutes', /\b(exercicios?|treino|treinei|atividade fisica)\b/],
      ['cabin_temperature', /\btemperatura\b/],
    ],
    status: /\b(como (eu )?(estou|to|tou)|como estao (os )?meus|status|situacao|relatorio|resumo|como esta a (tripulacao|cabine|estacao)|como eu pareco|minha prontidao|algo errado|alguma coisa errada|algum problema|tudo (ok|bem|certo))\b/,
    help: /\b(ajuda|ajudar|comandos|o que (eu )?posso (dizer|falar|fazer)|o que voce (pode|sabe) fazer)\b/,
  },
}

const STATUS_PHRASE: Record<Status, string> = { normal: tx('That is normal.'), caution: tx('That is a caution.'), alert: tx('That is an alert.') }
const RANK: Record<Status, number> = { normal: 0, caution: 1, alert: 2 }

function rangeText([low, high]: [number | null, number | null], unit: string) {
  if (low === null) return tx('up to {high} {unit}', { high: num(high!), unit })
  if (high === null) return tx('{low} {unit} or more', { low: num(low), unit })
  return tx('{low} to {high} {unit}', { low: num(low), high: num(high), unit })
}

type Row = { subject: string; indicator: string; value: number; status: Status }

// The actions and the facts for one crew member. The fixed rules and the model both use them.
// Each function returns a text with tx() tokens.
function toolbox(missionId: string, crewId: number, turn: Pick<AssistantReply, 'did' | 'show' | 'expectsAnswer'>) {
  const actor = `crew:${crewId}`
  const subject = `crew:${crewId}`
  const crew = crewOf(missionId)
  const member = crew.find((candidate) => candidate.id === crewId)!

  const readings = (): Row[] =>
    (
      db
        .prepare(
          `SELECT subject, indicator, value FROM readings
           WHERE id IN (SELECT max(id) FROM readings WHERE mission_id = ? AND subject IN ('env', ?) GROUP BY subject, indicator)`,
        )
        .all(missionId, subject) as { subject: string; indicator: string; value: number }[]
    )
      .filter((row) => indicatorById.has(row.indicator))
      .map((row) => ({ ...row, status: statusOf(row.indicator, row.value) }))
  // The values that are not normal. Alerts first, and the body before the cabin.
  const problems = () =>
    readings()
      .filter((row) => row.status !== 'normal')
      .sort((a, b) => RANK[b.status] - RANK[a.status] || Number(a.subject === 'env') - Number(b.subject === 'env'))
  const pending = () =>
    (
      db.prepare(`SELECT id, rule_id AS ruleId, reason FROM checkups WHERE mission_id = ? AND crew_id = ? AND status = 'pending' ORDER BY id`).all(missionId, crewId) as {
        id: number
        ruleId: string
        reason: string
      }[]
    ).flatMap((row) => {
      const rule = ruleById.get(row.ruleId)
      return rule ? [{ ...row, rule }] : []
    })
  const openSymptoms = () =>
    db.prepare(`SELECT name FROM symptoms WHERE mission_id = ? AND crew_id = ? AND status = 'open'`).all(missionId, crewId) as { name: string }[]
  const unread = () =>
    db
      .prepare(`SELECT id, severity, title, body, topic FROM notifications WHERE mission_id = ? AND crew_id = ? AND read_hour IS NULL ORDER BY severity DESC, id DESC LIMIT 10`)
      .all(missionId, crewId) as { id: number; severity: number; title: string; body: string; topic: string }[]

  // The label and the value of a row, as values for a template. A cabin value has its label as it is.
  // A body value has "Your" before the label, so the label starts with a small letter.
  const partsOf = (row: Row) => {
    const indicator = indicatorById.get(row.indicator)!
    return { label: row.subject === 'env' ? indicator.label : lowerFirst(indicator.label), value: valueText(indicator, row.value) }
  }
  // "Cabin CO2 is 4.10 mmHg." or "Your heart rate at rest is 104 bpm."
  const isSentence = (row: Row) => (row.subject === 'env' ? tx('{label} is {value}.', partsOf(row)) : tx('Your {label} is {value}.', partsOf(row)))
  const sentenceOf = (row: Row) => {
    const indicator = indicatorById.get(row.indicator)!
    const first = `${isSentence(row)} ${STATUS_PHRASE[row.status]}`
    return row.status === 'normal' ? first : `${first} ${tx('Normal is {range}.', { range: rangeText(indicator.normal, indicator.unit) })}`
  }
  const medicalOfficers = () => crew.filter((candidate) => candidate.role === 'medical_officer' && candidate.id !== crewId).map((candidate) => candidate.name)

  return {
    member,
    readings,
    problems,
    pending,
    openSymptoms,
    unread,

    // A short report of the state of this crew member and of the cabin.
    status(): string {
      const list = problems()
      const questions = pending().length
      if (list.length === 0 && questions === 0) return tx('All your values and the cabin values are normal. No question is open.')
      const parts = list.slice(0, 3).map((row) => {
        if (row.subject === 'env') return row.status === 'alert' ? tx('{label} is {value}, an alert.', partsOf(row)) : tx('{label} is {value}, a caution.', partsOf(row))
        return row.status === 'alert' ? tx('Your {label} is {value}, an alert.', partsOf(row)) : tx('Your {label} is {value}, a caution.', partsOf(row))
      })
      if (list.length > 3) parts.push(tx('{count} more values are not normal.', { count: list.length - 3 }))
      if (list.length === 0) parts.push(tx('All your values and the cabin values are normal.'))
      if (questions) parts.push(txn(questions, 'One question waits for your answer.', '{count} questions wait for your answer.'))
      return parts.join(' ')
    },

    // The one thing to do now.
    next(): string {
      const [question] = pending()
      if (question) {
        turn.expectsAnswer = true
        return `${tx('First, answer this question.')} ${question.rule.question} ${tx('Say yes or no.')}`
      }
      const [row] = problems()
      if (!row) return tx('Nothing to do now. All your values and the cabin values are normal.')
      return `${isSentence(row)} ${adviceFor(row.indicator, row.value)}`
    },

    // One value, with its status and what to do.
    value(indicatorId: string): string {
      const indicator = indicatorById.get(indicatorId)
      if (!indicator) return tx('I do not know this value.')
      const row = readings().find((candidate) => candidate.indicator === indicatorId)
      if (!row) return tx('I have no value for {label} yet.', { label: lowerFirst(indicator.label) })
      if (indicatorId === 'blood_pressure_systolic') {
        const lower = readings().find((candidate) => candidate.indicator === 'blood_pressure_diastolic')
        if (lower) {
          const status = RANK[lower.status] > RANK[row.status] ? lower.status : row.status
          const worse = RANK[lower.status] > RANK[row.status] ? lower : row
          const first = `${tx('Your blood pressure is {upper:0} over {lower:0}.', { upper: row.value, lower: lower.value })} ${STATUS_PHRASE[status]}`
          return status === 'normal' ? first : `${first} ${adviceFor(worse.indicator, worse.value)}`
        }
      }
      return row.status === 'normal' ? sentenceOf(row) : `${sentenceOf(row)} ${adviceFor(row.indicator, row.value)}`
    },

    // Records a symptom. If an open question asks for the same symptom, this answers "yes" to it.
    // "name" is plain text: an English name from the list above, or the words of the model.
    symptom(name: string, bodyPart: BodyPart): string {
      const clean = name.trim().slice(0, 60)
      const lower = clean.toLowerCase()
      // The database gets "clean". The person gets the name in their language, if the server knows this symptom.
      const known = KNOWN_SYMPTOMS.get(lower)
      const shown = known === clean ? tx(clean) : clean
      const symptom = known ? lowerFirst(tx(known)) : lower
      const question = pending().find((candidate) => candidate.rule.symptom.name.toLowerCase() === lower)
      if (question) {
        answerCheckup(missionId, question.id, 'confirmed', actor)
        turn.did.push(tx('Answered "yes" to "{question}"', { question: question.rule.question }))
        return `${tx('I recorded your {symptom}.', { symptom })} ${question.rule.action}`
      }
      if (openSymptoms().some((open) => open.name.toLowerCase() === lower)) return tx('Your {symptom} is on your list already.', { symptom })
      const explanation = reportSymptom(missionId, crewId, bodyPart, clean, actor)
      turn.did.push(tx('Recorded the symptom "{symptom}"', { symptom: shown }))
      const told = medicalOfficers()
      // "A and B and C".
      const names = told.length ? told.reduce((first, second) => tx('{first} and {second}', { first, second })) : ''
      const parts = [names ? tx('I recorded your {symptom} and told {names}.', { symptom, names }) : tx('I recorded your {symptom}.', { symptom })]
      if (explanation.urgent) parts.push(tx('This can be an emergency. I also told the flight surgeons on the ground.'))
      if (explanation.causes[0]) parts.push(tx('First step: {action}', { action: explanation.causes[0].action }))
      return parts.join(' ')
    },

    // Answers the oldest open question. With "symptom", it answers the question that asks for this
    // symptom, so "I do not have a headache" never answers a question about a fever.
    answer(yes: boolean, symptom?: string): string {
      const open = pending()
      const question = open.find((candidate) => candidate.rule.symptom.name === symptom) ?? open[0]
      const nextQuestion = open.find((candidate) => candidate !== question)
      if (!question) return tx('No question is open now.')
      answerCheckup(missionId, question.id, yes ? 'confirmed' : 'dismissed', actor)
      turn.did.push(yes ? tx('Answered "yes" to "{question}"', { question: question.rule.question }) : tx('Answered "no" to "{question}"', { question: question.rule.question }))
      const parts = [yes ? `${tx('I recorded: yes.')} ${question.rule.action}` : tx('I recorded: no.')]
      if (nextQuestion) {
        turn.expectsAnswer = true
        parts.push(`${tx('Next question.')} ${nextQuestion.rule.question}`)
      }
      return parts.join(' ')
    },

    // "I am on it" for the worst cabin problem.
    claim(): string {
      const cabin = problems().filter((row) => row.subject === 'env')
      const mine = claimsOf(missionId, hourOf(missionId)).filter((row) => row.crewId === crewId && row.doneHour === null)
      const row = cabin.find((candidate) => !mine.some((claimed) => claimed.topic === `env:${candidate.indicator}`)) ?? cabin[0]
      if (!row) return tx('No cabin problem is open now.')
      const label = indicatorById.get(row.indicator)!.label
      if (!startClaim(missionId, crewId, `env:${row.indicator}`, label, actor)) return tx('You work on {label} already.', { label })
      turn.did.push(tx('Said "I am on it" for {label}', { label }))
      return tx('Noted. The crew now sees that you work on {label}.', { label })
    },

    // Ends the newest open claim of this crew member.
    finish(): string {
      const [mine] = claimsOf(missionId, hourOf(missionId)).filter((row) => row.crewId === crewId && row.doneHour === null)
      if (!mine) return tx('You have no open work.')
      endClaim(missionId, mine.id, crewId, actor)
      const label = indicatorById.get(mine.topic.replace(/^env:/, ''))?.label
      turn.did.push(label ? tx('Finished the work on {label}', { label }) : tx('Finished the work on the problem'))
      return label ? tx('Recorded. The work on {label} is done.', { label }) : tx('Recorded. The work on the problem is done.')
    },

    markRead(): string {
      const count = markAllRead(missionId, crewId)
      if (count === 0) return tx('You have no unread notifications.')
      turn.did.push(tx('Marked {count} notifications as read', { count }))
      return txn(count, 'I marked 1 notification as read.', 'I marked {count} notifications as read.')
    },

    alerts(): string {
      const list = unread()
      if (list.length === 0) return tx('You have no unread notifications.')
      const first = list.slice(0, 2).map((row) => `${row.title}.`)
      return [txn(list.length, 'You have {count} unread notification.', 'You have {count} unread notifications.'), ...first].join(' ')
    },

    showSheet(sheet: Sheet | null): string {
      turn.show = { ...turn.show, sheet }
      return SHEET_REPLY[sheet ?? 'home']
    },
    showMode(mode: Mode): string {
      turn.show = { ...turn.show, mode, sheet: null }
      return MODE_REPLY[mode]
    },
  }
}

type Toolbox = ReturnType<typeof toolbox>

// The Portuguese text names Portuguese sentences, so each example works with the rules of that language.
const HELP = tx('You can say: how am I, what should I do, what is the CO2, I have a headache, yes, no, I am on it, or open the cabin.')

// The fixed rules: find what the sentence means from its words.
function byRules(box: Toolbox, raw: string, lang: Lang): string {
  // Small letters and no accents. Text from speech recognition has no accents sometimes.
  const plain = raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
  // The sentence with its punctuation. Only "question" and "noLead" need it.
  const marked = plain
    .replace(/[^a-z0-9 ,.;!?]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const text = plain
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return tx('I did not hear a command.')
  const grammar = GRAMMAR[lang]
  const has = (pattern: RegExp) => pattern.test(text)

  // Screens and views.
  if (has(grammar.screenVerb)) {
    const mode = grammar.modes.find(([, words]) => has(words))
    if (mode) return box.showMode(mode[0])
    const sheet = grammar.sheets.find(([, words]) => has(words))
    if (sheet) return box.showSheet(sheet[0])
  }

  // A symptom, said in the first person.
  if (has(grammar.firstPerson) && !grammar.question?.test(marked)) {
    const symptom = SYMPTOMS.find((candidate) => candidate.words[lang].test(text))
    if (symptom) {
      // Look for "not" outside of the words of the symptom. "I have no appetite" and
      // "não consigo respirar" report a symptom. "I do not have a headache" does not.
      if (grammar.negation.test(text.replace(symptom.words[lang], ' '))) {
        const asked = box.pending().some((candidate) => candidate.rule.symptom.name === symptom.name)
        return asked ? box.answer(false, symptom.name) : tx('Good. I did not record a {symptom}.', { symptom: lowerFirst(tx(symptom.name)) })
      }
      return box.symptom(symptom.name, symptom.bodyPart)
    }
  }

  // Answers to an open question.
  // "No" comes first, so "I do not" never counts as "I do".
  if (has(grammar.no) || grammar.noLead?.test(marked)) return box.answer(false)
  if (has(grammar.yes)) return box.answer(true)

  // Work on a cabin problem.
  if (!(grammar.deny && has(grammar.deny))) {
    if (has(grammar.claim)) return box.claim()
    if (has(grammar.finish)) return box.finish()
    if (has(grammar.markRead)) return box.markRead()
  }

  if (has(grammar.next)) return box.next()
  if (has(grammar.alerts)) return box.alerts()

  // One value.
  const value = grammar.values.find(([, words]) => words.test(text))
  if (value) return box.value(value[0])

  if (has(grammar.status)) return box.status()
  if (has(grammar.help)) return HELP
  return `${tx('I did not understand "{text}".', { text: raw.trim().slice(0, 80) })} ${HELP}`
}

// The data of one crew member for the model, as JSON in plain English. It holds the cabin and this person only.
// The labels, the questions and the advice are tx() tokens, so the server renders them to English first.
function contextFor(missionId: string, box: Toolbox) {
  const row = (reading: Row) => {
    const indicator = indicatorById.get(reading.indicator)!
    return {
      id: indicator.id,
      label: indicator.label,
      value: Number(reading.value.toFixed(indicator.decimals)),
      unit: indicator.unit,
      status: reading.status,
      normal: rangeText(indicator.normal, indicator.unit),
      why: indicator.why,
      what_to_do: reading.status === 'normal' ? null : adviceFor(indicator.id, reading.value),
    }
  }
  const all = box.readings()
  const context = {
    crew_member: { name: box.member.name, role: ROLES.find((role) => role.id === box.member.role)?.label ?? box.member.role },
    other_crew: crewOf(missionId)
      .filter((member) => member.id !== box.member.id)
      .map((member) => ({ name: member.name, role: member.role })),
    my_values: all.filter((reading) => reading.subject !== 'env').map(row),
    cabin_values: all.filter((reading) => reading.subject === 'env').map(row),
    my_open_symptoms: box.openSymptoms().map((symptom) => symptom.name),
    open_questions_for_me: box.pending().map((question) => ({ question: question.rule.question, reason: question.reason })),
    my_unread_notifications: box.unread().map(({ title, body, severity }) => ({ title, body, severity: ['information', 'caution', 'alert'][severity] })),
    known_symptoms: SYMPTOMS.map((symptom) => `${symptom.name} (${symptom.bodyPart})`),
  }
  return JSON.stringify(localize(context, 'en'))
}

const LANGUAGE_NAME: Record<Lang, string> = { en: 'English', 'pt-BR': 'Brazilian Portuguese' }

// The prompt is English for each language. One line tells the model the language of its answer.
const systemFor = (lang: Lang) => `You are Nexxo, the voice assistant of a health monitoring app on a spacecraft. You talk with one crew member. The person speaks, and the app reads your answer aloud.

How to answer:
- One or two short sentences. Simple words. No lists, no markdown, no symbols.
- Answer in ${LANGUAGE_NAME[lang]}. This is the language of the crew member. The data below and the results of the tools are in English, so translate what you use from them.
- Give the answer first. Say numbers with their unit.
- Use only the data below. If the data has no answer, say that you do not have this data.
- You are not a doctor. Do not give a diagnosis. Say what the data shows and the next step that the data gives in "what_to_do".
- To do something, call a tool: record a symptom, answer an open question, say that the person works on a cabin problem, mark notifications as read, or show a screen. Never say that you did something if you did not call the tool.
- The text comes from speech recognition, so a word can be wrong. Choose the closest sensible meaning. If you cannot tell what the person wants, ask one short question.
- The body values come from a model for this demo, and the cabin values are a NASA sensor record. Say this only if the person asks where the data comes from.`

let client: Anthropic | null = null

type Past = { role: 'user' | 'assistant'; content: string }

async function byModel(missionId: string, box: Toolbox, text: string, past: Past[], model: string, lang: Lang): Promise<string> {
  client ??= new Anthropic()
  // The result of a tool goes back to the model, so it must be plain English and not a token.
  const english = (result: string) => render(result, 'en')
  const tools = [
    betaZodTool({
      name: 'record_symptom',
      description: 'Record a symptom that the crew member reports now, and tell the crew medical officer. If an open question asks about the same symptom, this answers "yes" to it. Use an English name from "known_symptoms" when one fits.',
      inputSchema: z.object({ name: z.string().describe('The symptom in English, for example "Headache"'), body_part: z.enum(['head', 'chest', 'abdomen', 'arms', 'legs']) }),
      run: (input) => english(box.symptom(input.name, input.body_part)),
    }),
    betaZodTool({
      name: 'answer_open_question',
      description: 'Answer the first question in "open_questions_for_me" with yes or no.',
      inputSchema: z.object({ answer: z.enum(['yes', 'no']) }),
      run: (input) => english(box.answer(input.answer === 'yes')),
    }),
    betaZodTool({
      name: 'claim_cabin_problem',
      description: 'The crew member says "I am on it": they start to work on the worst cabin problem. The other crew members then see who works on it.',
      inputSchema: z.object({}),
      run: () => english(box.claim()),
    }),
    betaZodTool({
      name: 'finish_cabin_work',
      description: 'The crew member says that the work on the cabin problem is done.',
      inputSchema: z.object({}),
      run: () => english(box.finish()),
    }),
    betaZodTool({
      name: 'mark_notifications_read',
      description: 'Mark all unread notifications of the crew member as read. This also closes a full-screen alert.',
      inputSchema: z.object({}),
      run: () => english(box.markRead()),
    }),
    betaZodTool({
      name: 'show_screen',
      description: 'Open one screen of the app for the crew member, or go back to the home screen. "history" is the personal history of this crew member. "log" is the log of the whole mission.',
      inputSchema: z.object({ screen: z.enum(['body', 'cabin', 'checkups', 'alerts', 'history', 'log', 'home']) }),
      run: (input) => english(box.showSheet(input.screen === 'home' ? null : input.screen)),
    }),
    betaZodTool({
      name: 'set_home_view',
      description: 'Change the home view: "readiness" (a score and the next action), "bridge" (one very large value), or "companion" (the app explains each value).',
      inputSchema: z.object({ view: z.enum(['readiness', 'bridge', 'companion']) }),
      run: (input) => english(box.showMode(input.view)),
    }),
  ]
  const final = await client.beta.messages.toolRunner({
    model,
    max_tokens: 2000,
    max_iterations: 4,
    system: `${systemFor(lang)}\n\nThe data now, as JSON:\n${contextFor(missionId, box)}`,
    tools,
    messages: [...past, { role: 'user', content: text }],
    // A voice answer must come fast, and the task is small.
    output_config: { effort: 'low' },
  })
  if (final.stop_reason === 'refusal') throw new Error('The model declined to answer.')
  // The answer of the model is free text in the language of the crew member. It passes through unchanged.
  const reply = final.content
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join(' ')
    .trim()
  if (!reply) throw new Error('The model gave no answer.')
  return reply
}

// The last sentences of the talk, in the shape that the model needs: user first, then in turns.
function pastOf(input: unknown): Past[] {
  if (!Array.isArray(input)) return []
  const past: Past[] = []
  for (const item of input.slice(-8)) {
    const role = item?.role === 'assistant' ? 'assistant' : item?.role === 'user' ? 'user' : null
    const content = typeof item?.text === 'string' ? item.text.trim().slice(0, 400) : ''
    if (!role || !content) continue
    if (past.length === 0 ? role !== 'user' : past[past.length - 1].role === role) continue
    past.push({ role, content })
  }
  if (past.length && past[past.length - 1].role === 'user') past.pop()
  return past
}

// true if this mission can use the model for the assistant.
export function modelIsOn(missionId: string) {
  const settings = getSettings(missionId)
  return settings.enabled && settings.provider === 'anthropic' && Boolean(process.env.ANTHROPIC_API_KEY)
}

// "lang" is the language of the crew member: it selects the fixed rules and the language of the model.
export async function handleCommand(missionId: string, crewId: number, text: string, history: unknown, lang: Lang = 'en'): Promise<AssistantReply> {
  const turn: Pick<AssistantReply, 'did' | 'show' | 'expectsAnswer'> = { did: [], show: null, expectsAnswer: false }
  const box = toolbox(missionId, crewId, turn)
  // history.ts reads the sentence from this line: it takes the text from the first quotation mark.
  emit(missionId, hourOf(missionId), `crew:${crewId}`, 'assistant.command', tx('{name} said to Nexxo: "{text}"', { name: crewName(missionId, crewId), text }))
  if (modelIsOn(missionId)) {
    try {
      const reply = await byModel(missionId, box, text, pastOf(history), getSettings(missionId).model, lang)
      return { reply, ...turn, expectsAnswer: turn.expectsAnswer || reply.endsWith('?'), source: 'model' }
    } catch (error) {
      console.error('The assistant could not use the model:', error instanceof Error ? error.message : error)
      // Go on with the fixed rules, but only if the model did nothing yet.
      if (turn.did.length) return { reply: tx('I did that, but I could not finish my answer.'), ...turn, source: 'model' }
    }
  }
  const reply = byRules(box, text, lang)
  return { reply, ...turn, source: 'rules' }
}

type Helpers = { idOf: (request: Request) => string; notify: (missionId: string) => void }

export function addAssistantRoutes(mission: Router, { idOf, notify }: Helpers) {
  // One sentence of a crew member, typed or spoken. The header "x-actor" names the crew member,
  // and the header "x-lang" gives the language of the sentence and of the answer.
  mission.post('/assistant', async (request: Request, response: Response) => {
    const id = idOf(request)
    const crewId = Number(String(request.get('x-actor') ?? '').split(':')[1])
    // The two characters that mark a token must not come from a person.
    const text = typeof request.body?.text === 'string' ? request.body.text.replace(/[⟦⟧]/g, '').trim().slice(0, 400) : ''
    if (!text || !crewOf(id).some((member) => member.id === crewId)) {
      response.status(400).json({ error: tx('Send text, as a crew member.') })
      return
    }
    const answer = await handleCommand(id, crewId, text, request.body?.history, langOf(request))
    notify(id)
    response.json(answer)
  })
}
