// App-level types and operations on top of the store.
import { createContext, useContext } from 'react'
import { EXERCISES } from '../domain/exercises'
import { generateSharedPlan } from '../domain/multiAthlete'
import type { Athlete, Exercise, PlanSettings, PlanWeek, Session } from '../domain/types'
import { toISO } from '../domain/dates'
import { Store, useStoreVersion } from './store'

export interface SetLog {
  reps?: number
  weightKg?: number
  distanceM?: number
  durationSec?: number
  done: boolean
}

export interface SessionLog {
  sessionId: string
  athleteId: string
  status: 'done' | 'partial' | 'skipped'
  /** Overall effort, 1-10. */
  rpe?: number
  notes?: string
  /** Per block id, one entry per set. */
  blocks: Record<string, SetLog[]>
  completedAt: string
  by?: string
}

export const StoreContext = createContext<Store | null>(null)

export function useStore() {
  const s = useContext(StoreContext)
  if (!s) throw new Error('No store')
  useStoreVersion(s)
  return s
}

export const today = () => toISO(new Date(Date.now() - new Date().getTimezoneOffset() * 60_000))

export function getSettings(s: Store) {
  return s.get<PlanSettings>('profile', 'main')
}

export function getAthletes(s: Store) {
  return s.all<Athlete & { order?: number }>('athlete').sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name))
}

export function saveAthlete(s: Store, a: Athlete & { order?: number }) {
  return s.put('athlete', a.id, a)
}

/** Which athlete this phone is showing. */
export const AthleteContext = createContext<{ athleteId: string; setAthleteId: (id: string) => void }>({ athleteId: '', setAthleteId: () => {} })
export const useAthlete = () => useContext(AthleteContext)

const ATHLETE_KEY = 'hyrox-coach-athlete'
export function savedAthleteId() {
  try { return localStorage.getItem(ATHLETE_KEY) } catch { return null }
}
export function rememberAthleteId(id: string) {
  try { localStorage.setItem(ATHLETE_KEY, id) } catch { /* ignore */ }
}

/** Convert data saved before multi-athlete support (profile held one athlete). */
export async function migrate(s: Store) {
  const old = s.get<PlanSettings & Partial<Athlete>>('profile', 'main')
  if (!old || !old.division || getAthletes(s).length) return
  const { name, division, level, limitations, ...settings } = old
  const a: Athlete = { id: newId('ath'), name: name || 'Athlete', division, level: level ?? 'beginner', limitations }
  const logs = s.all<SessionLog>('log').filter((l) => !l.athleteId)
  await s.removeMany(logs.map((l) => ({ kind: 'log' as const, id: l.sessionId })))
  await s.putMany([
    { kind: 'profile', id: 'main', data: settings },
    { kind: 'athlete', id: a.id, data: { ...a, order: 0 } },
    ...logs.map((l) => ({ kind: 'log' as const, id: logKey(l.sessionId, a.id), data: { ...l, athleteId: a.id } })),
  ])
}

export function getWeeks(s: Store) {
  return s.all<PlanWeek>('week').sort((a, b) => a.week - b.week)
}

export function getSessions(s: Store) {
  return s.all<Session>('session').sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
}

export const logKey = (sessionId: string, athleteId: string) => `${sessionId}~${athleteId}`

export function getLog(s: Store, sessionId: string, athleteId: string) {
  return s.get<SessionLog>('log', logKey(sessionId, athleteId))
}

/** True if anyone has logged this session. */
export function anyLog(s: Store, sessionId: string) {
  return getAthletes(s).some((a) => !!getLog(s, sessionId, a.id))
}

export function getExercises(s: Store): Exercise[] {
  const custom = s.all<Exercise>('exercise')
  const byId = new Map(EXERCISES.map((e) => [e.id, e]))
  for (const c of custom) byId.set(c.id, c)
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function exerciseById(s: Store, id: string): Exercise {
  return (
    s.get<Exercise>('exercise', id) ??
    EXERCISES.find((e) => e.id === id) ?? { id, name: id, category: 'strength', measure: 'reps' }
  )
}

export function saveSession(s: Store, session: Session) {
  return s.put('session', session.id, session)
}

export function deleteSession(s: Store, id: string) {
  return s.removeMany([{ kind: 'session', id }, ...getAthletes(s).map((a) => ({ kind: 'log' as const, id: logKey(id, a.id) }))])
}

export function saveLog(s: Store, log: SessionLog) {
  return s.put('log', logKey(log.sessionId, log.athleteId), log)
}

/**
 * Save settings and athletes and (re)generate the plan. Past sessions and
 * anything already logged are kept; only future, unlogged sessions are replaced.
 */
export async function applyPlan(s: Store, settings: PlanSettings, athletes: Athlete[], regenerate: boolean) {
  const athleteDocs = athletes.map((a, i) => ({ kind: 'athlete' as const, id: a.id, data: { ...a, order: i } }))
  const removed = getAthletes(s).filter((a) => !athletes.some((x) => x.id === a.id))
  if (removed.length) await s.removeMany(removed.map((a) => ({ kind: 'athlete' as const, id: a.id })))
  if (!regenerate) return s.putMany([{ kind: 'profile', id: 'main', data: settings }, ...athleteDocs])
  const plan = generateSharedPlan(settings, athletes)
  const t = today()
  const keep = new Set(getSessions(s).filter((x) => x.date < t || anyLog(s, x.id)).map((x) => x.id))
  const removeSessions = getSessions(s).filter((x) => !keep.has(x.id))
  const removeWeeks = getWeeks(s).filter((w) => !plan.weeks.some((p) => p.week === w.week))
  await s.removeMany([
    ...removeSessions.map((x) => ({ kind: 'session' as const, id: x.id })),
    ...removeWeeks.map((w) => ({ kind: 'week' as const, id: `w${w.week}` })),
  ])
  const keptDates = new Set(getSessions(s).map((x) => x.date))
  return s.putMany([
    { kind: 'profile', id: 'main', data: settings },
    ...athleteDocs,
    ...plan.weeks.map((w) => ({ kind: 'week' as const, id: `w${w.week}`, data: w })),
    ...plan.sessions
      .filter((x) => x.date >= t && !keep.has(x.id) && !keptDates.has(x.date))
      .map((x) => ({ kind: 'session' as const, id: x.id, data: x })),
  ])
}

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
