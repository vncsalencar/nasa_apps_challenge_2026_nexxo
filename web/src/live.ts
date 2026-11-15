// The live data of the app. The server runs one simulator for all screens, and it sends each
// change through one open connection (server-sent events). This hook keeps the newest state.
import { useCallback, useEffect, useState } from 'react'
import { HISTORY_STEPS, type Cdra, type ModelParams } from '../../shared/co2.ts'
import { defaultTrip } from '../../shared/trip/defaults.ts'
import { DEFAULT_PRESET, PRESET_BY_ID } from '../../shared/trip/presets/index.ts'
import type { TripState } from '../../shared/trip/types.ts'

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
  // How many mission days the clock of the trip can move each second.
  tripSpeeds: number[]
}

export type Live = {
  about: About
  // The settings of the CO2 page.
  state: State
  // The settings of the trip page. The CO2 settings and the trip settings do not change each other.
  trip: TripState
  // The values of the last 7 days in ppm, one each 5 minutes. The last one is the newest.
  ppm: number[]
  // The source of each value.
  src: number[]
}

type Message =
  | { type: 'about'; about: About }
  // A server from before the trip page sends no "trip".
  | { type: 'full'; state: State; trip?: TripState; ppm: number[]; src: number[] }
  | { type: 'tick'; state: State; ppm: number[]; src: number[] }
  | { type: 'last'; state: State; ppm: number; src: number }
  | { type: 'state'; state: State }
  | { type: 'trip'; trip: TripState }

// A change of settings. The trip fields go inside "trip", for example control({ trip: { day: 12.5 } }).
export type Control = (change: Record<string, unknown>) => Promise<void>

function apply(live: Partial<Live>, message: Message): Partial<Live> {
  switch (message.type) {
    case 'about':
      return { ...live, about: message.about }
    case 'full':
      // With a server from before the trip page, the trip keeps the first settings of the first
      // preset, so the CO2 page still works with that server.
      return { ...live, state: message.state, trip: message.trip ?? live.trip ?? defaultTrip(PRESET_BY_ID[DEFAULT_PRESET]), ppm: message.ppm, src: message.src }
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
    case 'trip':
      return { ...live, trip: message.trip }
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

  const live = data.about && data.state && data.trip && data.ppm && data.src && data.ppm.length > 0 ? (data as Live) : null
  return { live, online, control }
}
