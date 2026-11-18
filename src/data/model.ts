// App-level types and operations on top of the store.
import { createContext, useContext } from 'react'
import { EXERCISES } from '../domain/exercises'
import { generatePlan } from '../domain/generatePlan'
import type { AthleteProfile, Exercise, PlanWeek, Session } from '../domain/types'
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

export function getProfile(s: Store) {
  return s.get<AthleteProfile>('profile', 'main')
}

export function getWeeks(s: Store) {
  return s.all<PlanWeek>('week').sort((a, b) => a.week - b.week)
}

export function getSessions(s: Store) {
  return s.all<Session>('session').sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
}

export function getLog(s: Store, sessionId: string) {
  return s.get<SessionLog>('log', sessionId)
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
  return s.removeMany([{ kind: 'session', id }, { kind: 'log', id }])
}

export function saveLog(s: Store, log: SessionLog) {
  return s.put('log', log.sessionId, log)
}

/**
 * Save the profile and (re)generate the plan. Past sessions and anything
 * already logged are kept; only future, unlogged sessions are replaced.
 */
export async function applyProfile(s: Store, profile: AthleteProfile, regenerate: boolean) {
  if (!regenerate) return s.put('profile', 'main', profile)
  const plan = generatePlan(profile)
  const t = today()
  const keep = new Set(
    getSessions(s).filter((x) => x.date < t || getLog(s, x.id)).map((x) => x.id),
  )
  const removeSessions = getSessions(s).filter((x) => !keep.has(x.id))
  const removeWeeks = getWeeks(s).filter((w) => !plan.weeks.some((p) => p.week === w.week))
  await s.removeMany([
    ...removeSessions.map((x) => ({ kind: 'session' as const, id: x.id })),
    ...removeWeeks.map((w) => ({ kind: 'week' as const, id: `w${w.week}` })),
  ])
  const keptDates = new Set(getSessions(s).map((x) => x.date))
  return s.putMany([
    { kind: 'profile', id: 'main', data: profile },
    ...plan.weeks.map((w) => ({ kind: 'week' as const, id: `w${w.week}`, data: w })),
    ...plan.sessions
      .filter((x) => x.date >= t && !keep.has(x.id) && !keptDates.has(x.date))
      .map((x) => ({ kind: 'session' as const, id: x.id, data: x })),
  ])
}

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
