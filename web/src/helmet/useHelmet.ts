// The live state of the helmet sensors. The server keeps one state for all screens and sends
// each change through its own stream.
import { useCallback, useEffect, useState } from 'react'
import { LEVELS, SENSORS, levelOf, risingSensors, sensorsAt, type HelmetState, type Level } from '../../../shared/helmet.ts'
import { fmt, t } from '../i18n.ts'

export type SendHelmet = (change: Record<string, unknown>) => Promise<void>

export function useHelmet(): { helmet: HelmetState | null; online: boolean; send: SendHelmet } {
  const [helmet, setHelmet] = useState<HelmetState | null>(null)
  const [online, setOnline] = useState(true)
  useEffect(() => {
    const events = new EventSource('/api/helmet/stream')
    events.onopen = () => setOnline(true)
    events.onerror = () => setOnline(false)
    events.onmessage = (event) => setHelmet(JSON.parse(event.data) as HelmetState)
    return () => events.close()
  }, [])
  const send = useCallback<SendHelmet>(async (change) => {
    const response = await fetch('/api/helmet', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(change) })
    if (!response.ok) throw new Error(((await response.json().catch(() => null)) as { error?: string } | null)?.error ?? `Error ${response.status}`)
  }, [])
  return { helmet, online, send }
}

const labelOf = (id: string) => t(SENSORS.find((sensor) => sensor.id === id)?.label ?? id)
const names = (ids: string[]) => ids.map(labelOf).join(', ')

// The short alert of the page: the sensors that rise now come first, then the highest level.
export function helmetAlert(helmet: HelmetState): { level: Level; text: string } {
  const rising = risingSensors(helmet)
  const alert = sensorsAt(helmet, 'alert')
  const caution = sensorsAt(helmet, 'caution')
  const level: Level = alert.length ? 'alert' : caution.length ? 'caution' : 'normal'
  if (rising.length) {
    const worst = rising.some((id) => levelOf(helmet.sensors[id].value) !== 'normal') ? level : 'caution'
    return { level: worst === 'normal' ? 'caution' : worst, text: t('CO2 levels are rising at these sensors: {names}.', { names: names(rising) }) }
  }
  if (helmet.jet && !helmet.jet.done) return { level: level === 'normal' ? 'caution' : level, text: t('The micro air jet is on. CO2 goes down at these sensors: {names}.', { names: names(helmet.jet.sensors) }) }
  if (helmet.jet?.done && level === 'normal') return { level, text: t('Flow stable. All sensors are below the NASA limit of {value} mmHg (NASA-STD-3001).', { value: fmt(LEVELS.alert, 1) }) }
  if (alert.length) return { level, text: t('CO2 is high at these sensors: {names}.', { names: names(alert) }) }
  if (caution.length) return { level, text: t('CO2 is above the first level at these sensors: {names}.', { names: names(caution) }) }
  return { level, text: t('All sensors are in the normal range.') }
}
