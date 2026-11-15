// Small line icons. Each one is 24 by 24 and takes the color of its text.
const PATHS = {
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5.5M12 7.6v.2',
  play: 'M8 5.5v13l10.5-6.5z',
  pause: 'M8.5 5.5v13M15.5 5.5v13',
  minus: 'M6 12h12',
  plus: 'M6 12h12M12 6v12',
  restart: 'M4.5 12a7.5 7.5 0 1 0 2.4-5.5M4.5 5v3.5H8',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  )
}
