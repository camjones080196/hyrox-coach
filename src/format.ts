import type { Block, Phase, SessionType } from './domain/types'
import { parseISO } from './domain/dates'

export const PHASE_NAMES: Record<Phase, string> = {
  base: 'Base', build: 'Build', specific: 'Race-specific', taper: 'Taper', race: 'Race week',
}

export const SESSION_TYPES: Record<SessionType, { name: string; icon: string }> = {
  run: { name: 'Run', icon: '🏃' },
  strength: { name: 'Strength', icon: '🏋️' },
  stations: { name: 'Stations', icon: '🛷' },
  hybrid: { name: 'Run + stations', icon: '🔁' },
  simulation: { name: 'Simulation', icon: '⏱️' },
  recovery: { name: 'Recovery', icon: '🧘' },
  race: { name: 'Race', icon: '🏁' },
}

export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) {
  return parseISO(iso).toLocaleDateString(undefined, { ...opts, timeZone: 'UTC' })
}

export function fmtDuration(sec?: number) {
  if (sec === undefined) return ''
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`
  return s ? `${m}:${String(s).padStart(2, '0')}` : `${m} min`
}

export function fmtDistance(m?: number) {
  if (m === undefined) return ''
  return m >= 1000 && m % 100 === 0 ? `${m / 1000} km` : `${m} m`
}

export function blockSummary(b: Pick<Block, 'sets' | 'reps' | 'distanceM' | 'durationSec' | 'weightKg'>) {
  const amount = b.reps ? `${b.reps}` : b.distanceM ? fmtDistance(b.distanceM) : b.durationSec ? fmtDuration(b.durationSec) : ''
  let s = b.sets > 1 ? `${b.sets} × ${amount}` : amount
  if (b.weightKg) s += ` @ ${b.weightKg} kg`
  return s.trim()
}

/** "m:ss" or "mm" or "h:mm:ss" to seconds. */
export function parseTime(v: string): number | undefined {
  const t = v.trim()
  if (!t) return undefined
  const parts = t.split(':').map(Number)
  if (parts.some(Number.isNaN)) return undefined
  return parts.reduce((acc, p) => acc * 60 + p, 0) * (parts.length === 1 ? 60 : 1)
}

export function timeInput(sec?: number) {
  if (sec === undefined) return ''
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function num(v: string): number | undefined {
  if (v.trim() === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}
