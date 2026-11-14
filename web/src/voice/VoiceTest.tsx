// The test page of the voice listener (voice-test.html). The app does not use this component.
// It shows what the listener hears, and it puts the same values in window.__voice for a test script.
//
// Settings in the address, for measurements:
//   ?model=onnx-community/whisper-tiny.en   another Whisper model
//   ?device=wasm or ?device=webgpu          one device only
//   ?dtype=q8                               another number format of the weights
import { useCallback, useEffect, useRef, useState } from 'react'
import { voiceDebug } from './listener.ts'
import type { SentenceInfo } from './listener.ts'
import { useVoice } from './useVoice.ts'

type ReadyInfo = { device: string; model: string; bytes: number; loadMs: number }
type Row = SentenceInfo & { at: number }

type TestWindow = Window & { __voice?: Record<string, unknown> }

const query = new URLSearchParams(window.location.search)
voiceDebug.model = query.get('model') ?? undefined
voiceDebug.dtype = query.get('dtype') ?? undefined
const device = query.get('device')
if (device === 'wasm' || device === 'webgpu') voiceDebug.device = device

export function VoiceTest() {
  const [rows, setRows] = useState<Row[]>([])
  const [commands, setCommands] = useState<string[]>([])
  const [ready, setReady] = useState<ReadyInfo | null>(null)
  const [muted, setMuted] = useState(false)
  const started = useRef(0)

  const onCommand = useCallback((text: string) => setCommands((list) => [...list, text]), [])
  const voice = useVoice({ trigger: query.get('trigger') ?? 'Nexxo', onCommand })

  useEffect(() => {
    voiceDebug.onSentence = (info) =>
      setRows((list) => [...list, { ...info, at: Math.round(performance.now() - started.current) }])
    voiceDebug.onReady = (info) => {
      started.current = performance.now()
      setReady(info)
    }
    return () => {
      voiceDebug.onSentence = null
      voiceDebug.onReady = null
    }
  }, [])

  const { start, stop, arm, mute } = voice
  const setMute = useCallback(
    (on: boolean) => {
      mute(on)
      setMuted(on)
    },
    [mute],
  )

  // The test script reads these values and calls these functions.
  useEffect(() => {
    ;(window as TestWindow).__voice = {
      state: voice.state,
      progress: voice.progress,
      heard: voice.heard,
      armed: voice.armed,
      error: voice.error,
      sentences: rows,
      commands,
      ready,
      start,
      stop,
      arm,
      mute: setMute,
    }
  })

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: 16, display: 'grid', gap: 16 }}>
      <h1 className="display">Voice listener test</h1>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-primary" onClick={() => void start()}>
          Start
        </button>
        <button type="button" className="btn" onClick={stop}>
          Stop
        </button>
        <button type="button" className="btn" aria-pressed={muted} onClick={() => setMute(!muted)}>
          {muted ? 'Mute is on' : 'Mute is off'}
        </button>
        <button type="button" className="btn" onClick={arm}>
          Arm
        </button>
      </div>
      <section className="card" aria-live="polite">
        <p>
          State: <strong id="voice-state">{voice.state}</strong>
          {voice.armed ? ' (armed: the next sentence is the command)' : ''}
        </p>
        {voice.progress != null && <p>Models: {Math.round(voice.progress * 100)} %</p>}
        {voice.error && <p className="status-alert">{voice.error}</p>}
        <p>Heard: {voice.heard ?? 'nothing yet'}</p>
        {ready && (
          <p className="muted small">
            {ready.model} on {ready.device}, {(ready.bytes / 1e6).toFixed(1)} MB of model files, ready after{' '}
            {ready.loadMs} ms
          </p>
        )}
      </section>
      <section className="card">
        <h2>Commands</h2>
        {commands.length === 0 && <p className="muted">No command yet. Say "Nexxo, open the cabin".</p>}
        <ol>
          {commands.map((text, index) => (
            <li key={index}>{text}</li>
          ))}
        </ol>
      </section>
      <section className="card">
        <h2>Sentences</h2>
        <ol className="small">
          {rows.map((row, index) => (
            <li key={index}>
              <strong>{row.result}</strong> "{row.text}" ({row.seconds.toFixed(1)} s of audio, model {row.modelMs} ms,{' '}
              {row.afterSpeechMs} ms after the speech)
            </li>
          ))}
        </ol>
      </section>
    </main>
  )
}
