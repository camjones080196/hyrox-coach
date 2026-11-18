// Small inline SVG icon set (stroke icons, 24px grid) so the app looks the
// same on every phone instead of relying on emoji.
import type { SessionType } from '../domain/types'

const PATHS: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  calendar: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 10h16M8 2v4M16 2v4',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  dumbbell: 'M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  run: 'M13 4.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0M7 21l3-5 3 2v4M6 12l3-4 4 1 2 3h3M10 16l1-6',
  sled: 'M3 17h15a3 3 0 0 0 3-3M5 17V9h8l2 4v4M15 13h3M8 9V6',
  repeat: 'M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4',
  timer: 'M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 10v4l2 2M9 2h6',
  leaf: 'M5 21c0-9 5-15 15-16-1 10-7 15-15 16zM5 21l8-8',
  flag: 'M4 22V4M4 4h13l-2 4 2 4H4',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  move: 'M8 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M14 3h7v7M21 3l-9 9',
  check: 'M5 12l5 5L20 7',
  chevronRight: 'M9 6l6 6-6 6',
  chevronLeft: 'M15 6l-6 6 6 6',
  chevronDown: 'M6 9l6 6 6-6',
  plus: 'M12 5v14M5 12h14',
  swap: 'M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7',
  trash: 'M4 7h16M10 11v6M14 11v6M5 7l1 13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-13M9 7V4h6v3',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  close: 'M6 6l12 12M18 6 6 18',
  skip: 'M5 5l10 7-10 7zM19 5v14',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  cloud: 'M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9a4.5 4.5 0 0 0 1 9z',
}

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 20, className, strokeWidth = 2 }: { name: IconName; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  )
}

export const TYPE_ICON: Record<SessionType, IconName> = {
  run: 'run',
  strength: 'dumbbell',
  stations: 'sled',
  hybrid: 'repeat',
  amrap: 'bolt',
  simulation: 'timer',
  recovery: 'leaf',
  race: 'flag',
}

/** Coloured square tile with the session-type icon. */
export function TypeTile({ type, size = 40 }: { type: SessionType; size?: number }) {
  return (
    <span className={`type-tile t-${type}`} style={{ width: size, height: size }}>
      <Icon name={TYPE_ICON[type]} size={Math.round(size * 0.5)} />
    </span>
  )
}
