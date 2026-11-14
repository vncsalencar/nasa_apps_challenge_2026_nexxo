// The voice listener of the app, as a React hook.
// This file is the contract between the listener and the assistant bar. Keep the exported names and types.
//
// The listener runs fully in the page: a small model finds speech in the microphone stream,
// a small Whisper model writes the sentence as text, and the listener looks for the trigger word.
// No audio leaves the device.
//
// This file is small and is part of the main bundle. The heavy code is in listener.ts and
// whisper.worker.ts. The browser loads them only when start() runs.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Listener } from './listener.ts'

export type VoiceState =
  | 'off' // the microphone is closed
  | 'loading' // the models load (see "progress")
  | 'listening' // the microphone is open and no person speaks
  | 'hearing' // a person speaks now
  | 'transcribing' // the model writes the sentence
  | 'error' // see "error"

export type Voice = {
  state: VoiceState
  // 0 to 1 while the models load, null in each other state.
  progress: number | null
  // The newest sentence that the model wrote, with or without the trigger word.
  heard: string | null
  // True for some seconds after the person said only the trigger word. The next sentence is the command.
  armed: boolean
  error: string | null
  // Opens the microphone and loads the models. The first call must come from a tap.
  start: () => Promise<void>
  stop: () => void
  // Sets "armed" to true for 8 seconds. The page calls it after the app asks a question aloud.
  arm: () => void
  // The page calls mute(true) while it speaks an answer, so the listener does not hear the app.
  mute: (on: boolean) => void
}

export type VoiceOptions = {
  // The word that starts a command, for example "Nexxo".
  trigger: string
  // The command, with the trigger word removed. For "Nexxo, open the cabin" it gets "open the cabin".
  onCommand: (text: string) => void
}

// The choice of the person stays in the browser, so the listener starts again after a reload.
const STORAGE_KEY = 'nexxo-voice'

function remember(value: 'on' | 'off') {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // The browser does not allow storage. The listener works without it.
  }
}

// True if the person turned the listener on before, and the browser can open the microphone with no question.
async function canStartAlone(): Promise<boolean> {
  try {
    if (localStorage.getItem(STORAGE_KEY) !== 'on') return false
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName })
    return status.state === 'granted'
  } catch {
    return false
  }
}

// One start of the listener. A new start or a stop replaces it, and then its events are ignored.
type Run = { listener: Listener | null }

export function useVoice(options: VoiceOptions): Voice {
  const [state, setState] = useState<VoiceState>('off')
  const [progress, setProgress] = useState<number | null>(null)
  const [heard, setHeard] = useState<string | null>(null)
  const [armed, setArmed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The newest options, so the listener does not start again when the page gives a new function.
  const latest = useRef(options)
  useEffect(() => {
    latest.current = options
  })

  const run = useRef<Run | null>(null)
  // The page can call mute() and arm() before the models are ready. The listener gets the values then.
  const muted = useRef(false)
  const armWaits = useRef(false)

  // "quiet" is for the start with no tap: if the browser blocks it, the state goes back to "off" with no error.
  const begin = useCallback(async (quiet: boolean) => {
    if (run.current) return
    const mine: Run = { listener: null }
    run.current = mine
    const active = () => run.current === mine
    setError(null)
    setHeard(null)
    setArmed(false)
    setProgress(0)
    setState('loading')
    const fail = (message: string) => {
      if (!active()) return
      run.current = null
      setProgress(null)
      setArmed(false)
      setError(quiet ? null : message)
      setState(quiet ? 'off' : 'error')
    }
    try {
      const { startListener } = await import('./listener.ts')
      const listener = await startListener(
        () => latest.current.trigger,
        {
          onState: (value) => active() && setState(value),
          onProgress: (value) => active() && setProgress(value),
          onHeard: (text) => active() && setHeard(text),
          onArmed: (value) => active() && setArmed(value),
          onCommand: (text) => active() && latest.current.onCommand(text),
          onError: (message) => {
            quiet = false
            fail(message)
          },
        },
        () => !active(),
      )
      if (!listener) return
      if (!active()) {
        listener.stop()
        return
      }
      mine.listener = listener
      if (muted.current) listener.mute(true)
      if (armWaits.current) listener.arm()
      armWaits.current = false
      remember('on')
    } catch (problem) {
      // listener.ts gives errors in plain words. Each other error means that the code did not load.
      const plain = problem instanceof Error && problem.name === 'VoiceError'
      fail(plain ? problem.message : 'The voice listener did not load. Check the network and try again.')
    }
  }, [])

  const end = useCallback(() => {
    const current = run.current
    run.current = null
    current?.listener?.stop()
    armWaits.current = false
    setProgress(null)
    setArmed(false)
    setError(null)
    setState('off')
  }, [])

  const start = useCallback(() => begin(false), [begin])

  const stop = useCallback(() => {
    end()
    remember('off')
  }, [end])

  const mute = useCallback((on: boolean) => {
    muted.current = on
    run.current?.listener?.mute(on)
  }, [])

  const arm = useCallback(() => {
    const listener = run.current?.listener
    if (listener) listener.arm()
    // The models load now. Arm the listener when it is ready.
    else if (run.current) armWaits.current = true
  }, [])

  useEffect(() => {
    let mounted = true
    void canStartAlone().then((yes) => {
      if (yes && mounted) void begin(true)
    })
    return () => {
      mounted = false
      // Close the microphone when the page goes away. The stored choice stays.
      const current = run.current
      run.current = null
      current?.listener?.stop()
    }
  }, [begin])

  return { state, progress, heard, armed, error, start, stop, arm, mute }
}
