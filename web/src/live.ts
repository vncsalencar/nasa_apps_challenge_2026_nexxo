// The live data of the app. The server runs one simulator for all screens, and it sends each
// change through one open connection (server-sent events). This hook keeps the newest state.
import { useCallback, useEffect, useState } from 'react'
import { HISTORY_STEPS, type Cdra, type ModelParams } from '../../shared/co2.ts'

export type Mode = 'replay' | 'simulated'
// The source of one value: the real record, the cabin model, or the hand of the presenter.
export const SOURCE = { record: 0, model: 1, manual: 2 } as const

export type State = {
  mode: Mode
  playing: boolean
  // How many 5-minute steps the clock makes each second.
  speed: number
  // Steps since the start of the record.
  step: number
  timeMs: number
  crew: number
  cdra: Cdra
  params: ModelParams
}

export type About = {
  source: { name: string; url: string; credit: string; mission: string; field: string; unit: string; retrievedAt: string }
  milestones: Record<string, string>
  startTime: string
  steps: number
  yearShift: number
  // The mean of each hour of the record, in ppm.
  hourly: number[]
  speeds: number[]
  holdHours: number[]
  ppmLimits: { min: number; max: number }
}

export type Live = {
  about: About
  state: State
  // The values of the last 7 days in ppm, one each 5 minutes. The last one is the newest.
  ppm: number[]
  // The source of each value.
  src: number[]
}

type Message =
  | { type: 'about'; about: About }
  | { type: 'full'; state: State; ppm: number[]; src: number[] }
  | { type: 'tick'; state: State; ppm: number[]; src: number[] }
  | { type: 'last'; state: State; ppm: number; src: number }
  | { type: 'state'; state: State }

export type Control = (change: Record<string, unknown>) => Promise<void>

function apply(live: Partial<Live>, message: Message): Partial<Live> {
  switch (message.type) {
    case 'about':
      return { ...live, about: message.about }
    case 'full':
      return { ...live, state: message.state, ppm: message.ppm, src: message.src }
    case 'tick':
      return {
        ...live,
        state: message.state,
        ppm: [...(live.ppm ?? []), ...message.ppm].slice(-HISTORY_STEPS),
        src: [...(live.src ?? []), ...message.src].slice(-HISTORY_STEPS),
      }
    case 'last':
      return {
        ...live,
        state: message.state,
        ppm: [...(live.ppm ?? []).slice(0, -1), message.ppm],
        src: [...(live.src ?? []).slice(0, -1), message.src],
      }
    case 'state':
      return { ...live, state: message.state }
  }
}

export function useLive(): { live: Live | null; online: boolean; control: Control } {
  const [data, setData] = useState<Partial<Live>>({})
  const [online, setOnline] = useState(true)

  useEffect(() => {
    // The browser opens the connection again by itself after a break. The server then sends all values again.
    const events = new EventSource('/api/stream')
    events.onopen = () => setOnline(true)
    events.onerror = () => setOnline(false)
    events.onmessage = (event) => {
      const message = JSON.parse(event.data) as Message
      setData((current) => apply(current, message))
    }
    return () => events.close()
  }, [])

  const control = useCallback<Control>(async (change) => {
    const response = await fetch('/api/control', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(change) })
    if (!response.ok) throw new Error(((await response.json().catch(() => null)) as { error?: string } | null)?.error ?? `Error ${response.status}`)
  }, [])

  const live = data.about && data.state && data.ppm && data.src && data.ppm.length > 0 ? (data as Live) : null
  return { live, online, control }
}
