// Small line icons for the navigation. Each one is 24 by 24 and takes the color of its text.
const PATHS = {
  home: 'M4 11.5 12 4l8 7.5M6.5 10v9.5h11V10',
  body: 'M12 7.2a2.1 2.1 0 1 0 0-4.2 2.1 2.1 0 0 0 0 4.2ZM5.5 10h13M12 10v5m0 0-3 6m3-6 3 6',
  cabin: 'M3.5 9h10a2.8 2.8 0 1 0-2.8-2.8M3.5 13h14.5a2.8 2.8 0 1 1-2.8 2.8M3.5 17h6',
  checkups: 'M8.5 5.5h-2a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-13a1 1 0 0 0-1-1h-2M9 4h6v3H9zM9 13.5l2.2 2.2 4-4.2',
  alerts: 'M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2h-14zM10 20.5a2.1 2.1 0 0 0 4 0',
  log: 'M8 6.5h11M8 12h11M8 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01',
  history: 'M4.5 12a7.5 7.5 0 1 0 2.4-5.5M4.5 5v3.5H8M12 8v4.3l2.8 1.7',
  chevron: 'm7 9.5 5 5 5-5',
  close: 'M6.5 6.5l11 11m0-11-11 11',
  spark: 'M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9zM18.5 16l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z',
  sliders: 'M4 7h9m4 0h3M4 17h3m4 0h9M15 4.5v5M9 14.5v5',
  send: 'M5 12h13m-5.5-5.5L18 12l-5.5 5.5',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  )
}
