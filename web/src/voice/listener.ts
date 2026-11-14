// The voice listener. useVoice.ts loads this file only when the person turns the listener on,
// so the heavy packages are not in the main bundle of the app.
//
// The pipeline, all in the page:
//   microphone -> speech detector (Silero VAD) -> one spoken sentence -> Whisper (in a Web Worker) -> text -> trigger word
import type { MicVAD } from '@ricky0123/vad-web'
import { parseSentence } from './trigger.ts'
import type { VoiceState } from './useVoice.ts'
import type { Device, WorkerReply, WorkerRequest } from './whisper.worker.ts'

export type ListenerEvents = {
  onState: (state: VoiceState) => void
  onProgress: (value: number | null) => void
  onHeard: (text: string) => void
  onArmed: (armed: boolean) => void
  onCommand: (text: string) => void
  // The listener stopped by itself because of an error. The microphone is closed.
  onError: (message: string) => void
}

export type Listener = {
  stop: () => void
  mute: (on: boolean) => void
  arm: () => void
}

// One line for each sentence, for the test page and for measurements.
export type SentenceInfo = {
  text: string
  result: 'noise' | 'trigger' | 'command' | 'ignored' | 'muted' | 'dropped'
  command: string | null
  // The length of the audio, in seconds.
  seconds: number
  // The time that the model needed, in milliseconds.
  modelMs: number
  // The time from the end of the speech to the result, in milliseconds.
  // It includes the silence that the speech detector waits for (END_SILENCE_MS).
  afterSpeechMs: number
}

// Settings for tests. The test page changes them before it starts the listener.
export const voiceDebug: {
  onSentence: ((info: SentenceInfo) => void) | null
  onReady: ((info: { device: Device; model: string; bytes: number; loadMs: number }) => void) | null
  model?: string
  device?: Device
  dtype?: string
} = { onSentence: null, onReady: null }

// A sentence ends after this much silence. A short value gives a fast answer.
// If the person stops for longer after the trigger word, the listener is "armed" and takes the next sentence.
const END_SILENCE_MS = 600
// Audio that the listener keeps from before the speech starts, so the first sound is not cut off.
const BEFORE_SPEECH_MS = 400
// The listener drops shorter sounds (a click, a cough).
const MIN_SPEECH_MS = 250
// The listener cuts a sentence that is longer than this.
const MAX_SENTENCE_MS = 15000
// How long the listener waits for a command after the trigger word alone.
const ARMED_MS = 8000
// The sound of the loudspeaker stops a short time after the page calls mute(false).
const UNMUTE_DELAY_MS = 300
// If the model is slower than the person, the listener keeps only the newest sentences.
const MAX_WAITING = 2
const SAMPLE_RATE = 16000

// An error with a message in plain words, for the person.
export class VoiceError extends Error {
  name = 'VoiceError'
}

const NOT_SUPPORTED = 'This browser cannot run the voice model.'

// ---- The Whisper worker. One worker for the page. It stays loaded between stop() and start(). ----

type ReadyInfo = { device: Device; model: string; bytes: number }
type Result = { text: string; ms: number }

let worker: Worker | null = null
let workerReady: Promise<ReadyInfo> | null = null
let progressListener: ((value: number) => void) | null = null
let nextId = 1
const waiting = new Map<number, { resolve: (result: Result) => void; reject: (error: Error) => void }>()

function dropWorker() {
  worker?.terminate()
  worker = null
  workerReady = null
  for (const entry of waiting.values()) entry.reject(new Error('The voice model stopped.'))
  waiting.clear()
}

// A switch for the demo: the value "wasm" or "webgpu" of "nexxo-voice-device" in localStorage makes the
// listener use this device only. With no value, the worker uses WebGPU if the browser has a graphics card for it.
function storedDevice(): Device | undefined {
  try {
    const value = localStorage.getItem('nexxo-voice-device')
    return value === 'wasm' || value === 'webgpu' ? value : undefined
  } catch {
    return undefined
  }
}

function loadWhisper(onProgress: (value: number) => void): Promise<ReadyInfo> {
  progressListener = onProgress
  if (workerReady) return workerReady
  const made = new Worker(new URL('./whisper.worker.ts', import.meta.url), { type: 'module' })
  worker = made
  workerReady = new Promise<ReadyInfo>((resolve, reject) => {
    made.onmessage = (event: MessageEvent<WorkerReply>) => {
      const reply = event.data
      if (reply.type === 'progress') progressListener?.(reply.value)
      else if (reply.type === 'ready') resolve(reply)
      else if (reply.type === 'result') {
        waiting.get(reply.id)?.resolve({ text: reply.text, ms: reply.ms })
        waiting.delete(reply.id)
      } else if (reply.id != null) {
        waiting.get(reply.id)?.reject(new Error(reply.message))
        waiting.delete(reply.id)
      } else {
        reject(new Error(reply.message))
      }
    }
    made.onerror = (event) => {
      // The worker stopped with an error (for example, the browser had no memory left).
      reject(new Error(event.message || 'The worker did not start.'))
      if (worker === made) dropWorker()
    }
    const request: WorkerRequest = {
      type: 'load',
      model: voiceDebug.model,
      device: voiceDebug.device ?? storedDevice(),
      dtype: voiceDebug.dtype,
    }
    made.postMessage(request)
  })
  // If the load fails, remove the worker, so the next start() tries again.
  workerReady.catch(() => {
    if (worker === made) dropWorker()
  })
  return workerReady
}

// "hint" is the trigger word. The model uses it to write this word in the same way each time.
function transcribe(audio: Float32Array, hint: string): Promise<Result> {
  return new Promise((resolve, reject) => {
    if (!worker) return reject(new Error('The voice model is not loaded.'))
    const id = nextId++
    waiting.set(id, { resolve, reject })
    const request: WorkerRequest = { type: 'transcribe', id, audio, hint }
    worker.postMessage(request, [audio.buffer])
  })
}

// ---- The microphone ----

async function openMicrophone(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    })
  } catch (error) {
    const name = error instanceof DOMException ? error.name : ''
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      throw new VoiceError('The browser did not allow the microphone.')
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      throw new VoiceError('The browser found no microphone.')
    }
    throw new VoiceError('The microphone did not start.')
  }
}

// ---- The listener ----

type Segment = {
  audio: Float32Array
  // The length of the audio. The buffer moves to the worker, so the listener keeps the length here.
  seconds: number
  // Times from performance.now(): when the speech started, and when the speech detector closed the sentence.
  startAt: number
  endAt: number
  // True if the sentence was cut at the maximum length. Then no silence came before the end.
  cut: boolean
}

// Opens the microphone, loads the two models, and starts to listen.
// "cancelled" lets the caller stop a start that is not complete. Then the function returns null.
export async function startListener(
  trigger: () => string,
  events: ListenerEvents,
  cancelled: () => boolean,
): Promise<Listener | null> {
  if (
    !navigator.mediaDevices?.getUserMedia ||
    typeof AudioContext === 'undefined' ||
    typeof Worker === 'undefined' ||
    typeof WebAssembly === 'undefined'
  ) {
    throw new VoiceError(NOT_SUPPORTED)
  }

  const loadStarted = performance.now()
  events.onProgress(0)
  // Ask for the microphone first, so the question of the browser comes right after the tap.
  const stream = await openMicrophone()
  let context: AudioContext | null = new AudioContext()
  // The browser can hold the audio after the computer sleeps. Start it again.
  context.onstatechange = () => {
    if (!stopped && context?.state === 'suspended') void context.resume().catch(() => {})
  }
  let vad: MicVAD | null = null
  let stopped = false

  const closeAll = () => {
    stopped = true
    // This ends the capture. The browser tab stops showing the microphone sign.
    for (const track of stream.getTracks()) {
      track.onended = null
      track.stop()
    }
    const oldVad = vad
    const oldContext = context
    if (oldContext) oldContext.onstatechange = null
    vad = null
    context = null
    void (async () => {
      try {
        await oldVad?.destroy()
      } catch {
        // The speech detector was not started yet.
      }
      try {
        await oldContext?.close()
      } catch {
        // The audio context was closed before.
      }
    })()
  }

  if (cancelled()) {
    closeAll()
    return null
  }

  // State of the listener.
  let speaking = false
  // True when the sound is long enough to be speech. The state "hearing" starts then, so a click does not show.
  let realSpeech = false
  let cutNow = false
  let speechStartAt = 0
  let muted = false
  // True if a part of the present sentence came in while the listener was muted.
  let spoiled = false
  let cutTimer: number | undefined
  let unmuteTimer: number | undefined
  const queue: Segment[] = []
  let busy = false
  // The listener is armed from "armedFrom" to "armedUntil". A sentence that starts in this time is a command.
  let armedFrom = 0
  let armedUntil = 0
  let armedTimer: number | undefined
  // The page called arm() while the listener was muted. The time starts at mute(false).
  let armWaits = false

  const stop = () => {
    if (stopped) return
    window.clearTimeout(cutTimer)
    window.clearTimeout(unmuteTimer)
    window.clearTimeout(armedTimer)
    closeAll()
    queue.length = 0
  }

  const report = () => {
    if (stopped) return
    events.onState(speaking && realSpeech ? 'hearing' : busy || queue.length > 0 ? 'transcribing' : 'listening')
  }

  const disarm = () => {
    window.clearTimeout(armedTimer)
    if (armedUntil === 0) return
    armedUntil = 0
    events.onArmed(false)
  }

  const inArmedTime = (startAt: number) => armedUntil > 0 && startAt >= armedFrom && startAt <= armedUntil

  // When the armed time ends, wait for a sentence that started in time and is not written yet.
  const checkArmedEnd = () => {
    if (stopped || armedUntil === 0) return
    const candidate = (speaking && inArmedTime(speechStartAt)) || busy || queue.length > 0
    if (candidate) armedTimer = window.setTimeout(checkArmedEnd, 500)
    else disarm()
  }

  const arm = (from: number) => {
    window.clearTimeout(armedTimer)
    armedFrom = from
    armedUntil = performance.now() + ARMED_MS
    armedTimer = window.setTimeout(checkArmedEnd, ARMED_MS + 50)
    events.onArmed(true)
  }

  const handleText = (segment: Segment, text: string, modelMs: number) => {
    const parsed = parseSentence(text, trigger())
    const info: SentenceInfo = {
      text,
      result: 'ignored',
      command: null,
      seconds: segment.seconds,
      modelMs,
      afterSpeechMs: Math.round(performance.now() - segment.endAt + (segment.cut ? 0 : END_SILENCE_MS)),
    }
    if (parsed.kind === 'noise') {
      info.result = 'noise'
    } else {
      events.onHeard(text)
      const wasArmed = inArmedTime(segment.startAt)
      if (parsed.kind === 'trigger') {
        info.result = 'trigger'
        arm(segment.endAt)
      } else if (parsed.kind === 'command' || wasArmed) {
        info.result = 'command'
        info.command = parsed.text
        disarm()
        events.onCommand(parsed.text)
      }
    }
    voiceDebug.onSentence?.(info)
  }

  const work = async () => {
    if (busy) return
    busy = true
    while (queue.length > 0 && !stopped) {
      const segment = queue.shift()!
      try {
        const { text, ms } = await transcribe(segment.audio, trigger())
        if (stopped) break
        handleText(segment, text, ms)
      } catch {
        if (stopped) break
        if (!worker) {
          // The worker is gone, so no sentence can work. Close the microphone and tell the person.
          stop()
          events.onError('The voice model stopped. Start the listener again.')
          return
        }
        // One sentence failed. Go on with the next sentence.
      }
    }
    busy = false
    report()
  }

  const onSpeechStart = () => {
    speaking = true
    realSpeech = false
    speechStartAt = performance.now()
    spoiled = muted
    window.clearTimeout(cutTimer)
    cutTimer = window.setTimeout(cutSentence, MAX_SENTENCE_MS)
    report()
  }

  const speechOver = () => {
    speaking = false
    realSpeech = false
    window.clearTimeout(cutTimer)
  }

  const onSpeechEnd = (audio: Float32Array, cut = false) => {
    speechOver()
    const info = (result: SentenceInfo['result']) =>
      voiceDebug.onSentence?.({
        text: '',
        result,
        command: null,
        seconds: audio.length / SAMPLE_RATE,
        modelMs: 0,
        afterSpeechMs: 0,
      })
    if (muted || spoiled) {
      info('muted')
    } else if (audio.length >= (MIN_SPEECH_MS / 1000) * SAMPLE_RATE) {
      const limit = ((MAX_SENTENCE_MS + BEFORE_SPEECH_MS) / 1000) * SAMPLE_RATE
      const kept = audio.length > limit ? audio.slice(0, limit) : audio
      queue.push({
        audio: kept,
        seconds: kept.length / SAMPLE_RATE,
        startAt: speechStartAt,
        endAt: performance.now(),
        cut,
      })
      while (queue.length > MAX_WAITING) {
        queue.shift()
        info('dropped')
      }
      void work()
    }
    report()
  }

  // The speech detector can change one thing at a time (pause, start), so these calls run in a row.
  let vadChain: Promise<void> = Promise.resolve()
  const withVad = (action: (vad: MicVAD) => Promise<void>) => {
    vadChain = vadChain.then(async () => {
      if (stopped || !vad) return
      try {
        await action(vad)
      } catch {
        // The speech detector was destroyed in the meantime.
      }
    })
  }

  // Ends a sentence that is too long. The pause makes the speech detector give the audio that it has.
  // The microphone stays open, because pauseStream and resumeStream do nothing (see below).
  function cutSentence() {
    withVad(async (vad) => {
      if (!speaking || muted) return
      cutNow = true
      vad.setOptions({ submitUserSpeechOnPause: true })
      await vad.pause()
      vad.setOptions({ submitUserSpeechOnPause: false })
      cutNow = false
      speechOver()
      await vad.start()
      report()
    })
  }

  const applyMute = (on: boolean) => {
    window.clearTimeout(unmuteTimer)
    if (on) {
      if (muted) return
      muted = true
      spoiled = true
      // The pause drops the sentence that the speech detector collects, and stops the detector.
      withVad(async (vad) => {
        await vad.pause()
        speechOver()
        report()
      })
    } else {
      if (!muted) return
      unmuteTimer = window.setTimeout(() => {
        withVad(async (vad) => {
          muted = false
          spoiled = false
          await vad.start()
          if (armWaits) {
            armWaits = false
            arm(performance.now())
          }
          report()
        })
      }, UNMUTE_DELAY_MS)
    }
  }

  let whisperPart = 0
  const whisper = loadWhisper((value) => {
    whisperPart = Math.max(whisperPart, value)
    // The Whisper files are almost all of the download. The last part is the start of the two models.
    if (!stopped && !cancelled()) events.onProgress(Math.min(0.95, whisperPart * 0.95))
  })

  const detector = (async () => {
    const { MicVAD } = await import('@ricky0123/vad-web')
    // A full address with the host. With a path only, the Vite dev server changes the address
    // when the runtime imports its file, and the import fails.
    const base = new URL(`${import.meta.env.BASE_URL}voice/vad/`, window.location.origin).href
    return MicVAD.new({
      model: 'v5',
      // The app serves these files itself (see scripts/copy-voice-assets.mjs).
      baseAssetPath: base,
      onnxWASMBasePath: base,
      audioContext: context ?? undefined,
      startOnLoad: false,
      getStream: async () => stream,
      // The listener owns the stream. A pause of the speech detector must not close the microphone.
      pauseStream: async () => {},
      resumeStream: async (same) => same,
      positiveSpeechThreshold: 0.5,
      negativeSpeechThreshold: 0.35,
      redemptionMs: END_SILENCE_MS,
      preSpeechPadMs: BEFORE_SPEECH_MS,
      minSpeechMs: MIN_SPEECH_MS,
      submitUserSpeechOnPause: false,
      ortConfig: (ort) => {
        ort.env.logLevel = 'error'
        // The page is not cross-origin isolated, so WebAssembly has one thread.
        ort.env.wasm.numThreads = 1
      },
      onSpeechStart,
      onSpeechRealStart: () => {
        realSpeech = true
        report()
      },
      onSpeechEnd: (audio) => onSpeechEnd(audio, cutNow),
      onVADMisfire: () => {
        speechOver()
        report()
      },
    })
  })()

  let ready: ReadyInfo
  try {
    const results = await Promise.all([whisper, detector])
    ready = results[0]
    vad = results[1]
    if (cancelled()) {
      closeAll()
      return null
    }
    // A browser can hold the audio back when the start did not come from a tap.
    // Then resume() does not finish, so wait for one second only.
    const audio = context as AudioContext
    if (audio.state !== 'running') {
      await Promise.race([audio.resume().catch(() => {}), new Promise((done) => setTimeout(done, 1000))])
    }
    if (audio.state !== 'running') throw new VoiceError('The browser did not start the audio. Tap to start.')
    await vad.start()
  } catch (error) {
    // The speech detector can be ready when the Whisper model fails. Close it too.
    void detector.then((made) => made.destroy()).catch(() => {})
    closeAll()
    if (cancelled()) return null
    if (error instanceof VoiceError) throw error
    console.error('voice listener:', error)
    const network = navigator.onLine === false || /fetch|network|load failed|http/i.test(String(error))
    throw new VoiceError(
      network ? 'The voice model did not load. Check the network and try again.' : NOT_SUPPORTED,
    )
  }

  for (const track of stream.getTracks()) {
    // The microphone was removed, or the browser took the permission back.
    track.onended = () => {
      if (stopped) return
      stop()
      events.onError('The microphone stopped.')
    }
  }

  voiceDebug.onReady?.({ ...ready, loadMs: Math.round(performance.now() - loadStarted) })
  events.onProgress(null)
  report()

  return {
    stop,
    mute: (on) => {
      if (!stopped) applyMute(on)
    },
    arm: () => {
      if (stopped) return
      if (muted) armWaits = true
      else arm(performance.now())
    },
  }
}
