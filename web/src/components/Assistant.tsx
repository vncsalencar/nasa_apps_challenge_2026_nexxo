import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { api, type AssistantReply, type Notification } from '../api.ts'
import { lang, t } from '../i18n.ts'
import { useVoice, type VoiceState } from '../voice/useVoice.ts'
import { Icon } from './Icon.tsx'
import './assistant.css'

// The bar at the bottom of the dashboard. The crew member types or says one sentence, and the
// app answers and maybe does an action. With the microphone on, the page listens all the time
// and starts a command when it hears "Nexxo". The speech is turned into text in the page.
const TRIGGER = 'Nexxo'
// false: the bar shows no microphone button, and the crew member types. Set it to true when the voice listener is ready.
const VOICE_READY = true

type Line = { role: 'user' | 'assistant'; text: string }
type Talk = { crewId: number; asked: string; reply: string | null; did: string[]; source: AssistantReply['source'] | null; failed: boolean }

// The voice listener understands only English for now. So the example command stays English in each language.
const STATE_TEXT: Record<VoiceState, string> = {
  off: t('Voice is off'),
  loading: t('Loading the voice model'),
  listening: t('Listening. Say "{trigger}, how am I?"', { trigger: TRIGGER }),
  hearing: t('I hear you'),
  transcribing: t('One moment'),
  error: t('Voice has a problem'),
}

// The language of the speech of the browser.
const SPEECH_LANG = lang === 'pt-BR' ? 'pt-BR' : 'en-US'
// The speech of the browser reads some units wrong. Each language writes them as words.
const SPEECH_WORDS: [RegExp, string][] =
  lang === 'pt-BR'
    ? [
        [/\bCO2\b/g, 'C O 2'],
        [/mmHg/g, 'milímetros de mercúrio'],
        [/mGy\/(dia|day)/g, 'miligrays por dia'],
        [/mGy/g, 'miligrays'],
        [/mg\/dL/g, 'miligramas por decilitro'],
        [/°C/g, 'graus Celsius'],
        [/\bbpm\b/g, 'batimentos por minuto'],
        [/(\d) h\b/g, '$1 horas'],
        [/(\d) L\b/g, '$1 litros'],
      ]
    : [
        [/\bCO2\b/g, 'C O 2'],
        [/mmHg/g, 'millimeters of mercury'],
        [/mGy\/day/g, 'milligray each day'],
        [/mGy/g, 'milligray'],
        [/mg\/dL/g, 'milligrams per deciliter'],
        [/°C/g, 'degrees Celsius'],
        [/\bbpm\b/g, 'beats per minute'],
        [/(\d) h\b/g, '$1 hours'],
        [/(\d) L\b/g, '$1 liters'],
      ]
function forSpeech(text: string) {
  return SPEECH_WORDS.reduce((spoken, [unit, words]) => spoken.replace(unit, words), text)
}

type Props = {
  missionId: string
  crewId: number
  // The unread notifications of this crew member, newest first.
  unread: Notification[]
  // true if the server uses the language model for the answers.
  modelOn: boolean
  onShow: (show: NonNullable<AssistantReply['show']>) => void
}

export function Assistant({ missionId, crewId, unread, modelOn, onShow }: Props) {
  const [lastTalk, setTalk] = useState<Talk | null>(null)
  // The answer for one crew member does not show for the next one.
  const talk = lastTalk?.crewId === crewId ? lastTalk : null
  const [draft, setDraft] = useState('')
  // Closed: only a small button shows. Open: the input and the ideas show.
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const history = useRef<Line[]>([])
  // The newest values for the functions that the voice listener keeps.
  const live = useRef({ missionId, crewId, onShow })
  useEffect(() => {
    live.current = { missionId, crewId, onShow }
  })
  const voiceRef = useRef<ReturnType<typeof useVoice> | null>(null)

  // Reads a text aloud. The listener is deaf in that time, so the app does not hear itself.
  const speak = useCallback((text: string, thenListenForAnswer: boolean) => {
    const voice = voiceRef.current
    if (!voice || voice.state === 'off' || voice.state === 'error') return
    let ended = false
    const end = () => {
      if (ended) return
      ended = true
      voiceRef.current?.mute(false)
      if (thenListenForAnswer) voiceRef.current?.arm()
    }
    // A browser with no speech still listens for the answer to a question.
    if (!('speechSynthesis' in window)) return end()
    const utterance = new SpeechSynthesisUtterance(forSpeech(text))
    utterance.lang = SPEECH_LANG
    utterance.rate = 1.05
    utterance.onend = end
    utterance.onerror = end
    voice.mute(true)
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
    // Some browsers never report the end of the speech. The listener must not stay deaf.
    setTimeout(end, 2500 + text.length * 80)
  }, [])

  const ask = useCallback(
    async (text: string, spoken: boolean) => {
      const asked = text.trim()
      if (!asked) return
      const { missionId: mission, crewId: crew } = live.current
      setBusy(true)
      setTalk({ crewId: crew, asked, reply: null, did: [], source: null, failed: false })
      try {
        const answer = await api<AssistantReply>(`/missions/${mission}/assistant`, { text: asked, history: history.current.slice(-8) }, 'POST', `crew:${crew}`)
        history.current = [...history.current, { role: 'user' as const, text: asked }, { role: 'assistant' as const, text: answer.reply }].slice(-12)
        setTalk({ crewId: crew, asked, reply: answer.reply, did: answer.did, source: answer.source, failed: false })
        if (answer.show) live.current.onShow(answer.show)
        if (spoken) speak(answer.reply, answer.expectsAnswer)
      } catch (error) {
        setTalk({ crewId: crew, asked, reply: error instanceof Error ? error.message : t('The server did not answer.'), did: [], source: null, failed: true })
      } finally {
        setBusy(false)
      }
    },
    [speak],
  )

  const voice = useVoice({ trigger: TRIGGER, onCommand: useCallback((text: string) => void ask(text, true), [ask]) })
  useEffect(() => {
    voiceRef.current = voice
  })

  // A new talk starts when the page shows another crew member.
  useEffect(() => {
    history.current = []
  }, [crewId])

  // With voice on, the app reads a new alert aloud one time.
  const spokenAlert = useRef<number | null>(null)
  const newestAlert = unread.find((notification) => notification.severity === 2)
  useEffect(() => {
    const id = newestAlert?.id ?? 0
    // The alerts that exist when the page opens stay silent.
    if (spokenAlert.current === null || id <= spokenAlert.current) {
      spokenAlert.current = Math.max(spokenAlert.current ?? 0, id)
      return
    }
    spokenAlert.current = id
    if (newestAlert) speak(t('Alert. {title}. Say {trigger}, I saw it.', { title: newestAlert.title, trigger: TRIGGER }), false)
  }, [newestAlert, speak])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void ask(draft, false)
    setDraft('')
  }

  const on = voice.state !== 'off' && voice.state !== 'error'
  const stateText =
    voice.state === 'error'
      ? (voice.error ?? STATE_TEXT.error)
      : voice.state === 'loading' && voice.progress !== null
        ? t('Loading the voice model: {percent}%', { percent: Math.round(voice.progress * 100) })
        : voice.armed && voice.state === 'listening'
          ? t('Yes? Say your command now.')
          : STATE_TEXT[voice.state]

  // The server understands these sentences in the language of the page.
  const suggestions = [t('How am I?'), t('What should I do now?'), t('What is the CO2?')]

  return (
    <section className={`as-dock ${open ? 'is-open' : ''}`} aria-label={t('Nexxo assistant')}>
      {talk && (
        <div className="as-talk" aria-live="polite">
          <button type="button" className="as-close" aria-label={t('Close the answer')} onClick={() => setTalk(null)}>
            <Icon name="close" size={18} />
          </button>
          <p className="as-asked">
            <span className="muted">{t('You:')}</span> {talk.asked}
          </p>
          <p className={`as-reply ${talk.failed ? 'status-alert' : ''}`}>{talk.reply ?? t('One moment…')}</p>
          {talk.did.map((action) => (
            <p key={action} className="as-did">
              <span className="status-normal" aria-hidden="true">●</span> {t('Done: {action}', { action })}
            </p>
          ))}
          {talk.source && <p className="as-source muted">{talk.source === 'model' ? t('Answer from the language model') : t('Answer from the fixed rules, no network needed')}</p>}
        </div>
      )}
      {open ? (
        <div className="as-panel">
          {!talk && (
            <div className="as-ideas">
              {suggestions.map((text) => (
                <button type="button" key={text} className="pill" onClick={() => void ask(text, false)}>
                  {text}
                </button>
              ))}
            </div>
          )}
          <div className="as-bar">
            {VOICE_READY && (
              <button
                type="button"
                className={`as-mic as-mic-${voice.state} ${voice.armed ? 'as-mic-armed' : ''}`}
                aria-pressed={on}
                aria-label={on ? t('Turn the voice off') : t('Turn the voice on')}
                title={on ? t('Turn the voice off') : t('Turn the voice on. The page then listens for "{trigger}".', { trigger: TRIGGER })}
                onClick={() => (on ? voice.stop() : void voice.start())}
              >
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
                  <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
            <form className="as-form" onSubmit={submit}>
              <input
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={on ? t('Say "{trigger}, …" or type here', { trigger: TRIGGER }) : t('Ask Nexxo')}
                aria-label={t('Ask Nexxo')}
                maxLength={300}
                enterKeyHint="send"
                autoFocus
              />
              <button type="submit" className="as-send" aria-label={t('Ask')} disabled={busy || !draft.trim()}>
                <Icon name="send" size={20} />
              </button>
            </form>
            <button type="button" className="as-hide" aria-label={t('Close the assistant')} onClick={() => setOpen(false)}>
              <Icon name="chevron" size={20} />
            </button>
          </div>
          <p className="as-state small" role="status">
            {VOICE_READY && <span className={`as-dot as-dot-${voice.state}`} aria-hidden="true" />}
            {VOICE_READY && <span>{stateText}</span>}
            {on && voice.heard && <span className="muted as-heard">{t('Heard: “{text}”', { text: voice.heard })}</span>}
            {!on && <span className="muted as-heard">{modelOn ? t('Language model: on') : t('Fixed rules, no network needed')}</span>}
          </p>
          {/* The voice listener understands only English for now. A page in another language says so. */}
          {VOICE_READY && lang !== 'en' && <p className="as-note small muted">{t('Voice commands are in English for now.')}</p>}
        </div>
      ) : (
        <button type="button" className={`as-fab ${on ? `as-fab-${voice.state}` : ''}`} aria-label={t('Ask Nexxo')} onClick={() => setOpen(true)}>
          <Icon name="spark" size={22} />
          <span className="as-fab-label">{on ? (voice.state === 'listening' ? t('Say "{trigger}"', { trigger: TRIGGER }) : STATE_TEXT[voice.state]) : t('Ask Nexxo')}</span>
        </button>
      )}
    </section>
  )
}
