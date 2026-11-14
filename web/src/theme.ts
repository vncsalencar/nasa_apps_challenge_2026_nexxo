import { useEffect, useState } from 'react'
import { t } from './i18n.ts'

// The three ways to show the home page. The crew member selects one, and the browser keeps the choice.
export type Mode = 'readiness' | 'bridge' | 'companion'
export const MODES: { id: Mode; label: string; about: string }[] = [
  { id: 'readiness', label: t('Readiness'), about: t('One score, what to do now, three areas.') },
  { id: 'bridge', label: t('Bridge'), about: t('One value in focus. Reads from far away.') },
  { id: 'companion', label: t('Companion'), about: t('The app talks to you, one question at a time.') },
]
const KEY = 'nexxo-mode'

function stored(): Mode {
  try {
    const value = localStorage.getItem(KEY)
    if (MODES.some((mode) => mode.id === value)) return value as Mode
  } catch {
    // The browser blocks storage. Use the default.
  }
  return 'readiness'
}

export function useMode() {
  const [mode, setMode] = useState<Mode>(stored)
  useEffect(() => {
    // The Bridge mode has its own look: black, large numbers, almost no boxes.
    document.documentElement.dataset.look = mode === 'bridge' ? 'bridge' : 'soft'
    try {
      localStorage.setItem(KEY, mode)
    } catch {
      // The choice then lasts until the page closes.
    }
  }, [mode])
  return [mode, setMode] as const
}
