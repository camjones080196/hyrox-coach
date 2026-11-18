import { describe, expect, it } from 'vitest'
import { buildWeeks, generatePlan } from './generatePlan'
import { EXERCISE_BY_ID } from './exercises'
import type { AthleteProfile } from './types'

const profile: AthleteProfile = {
  name: 'Test',
  division: 'neuro_major',
  level: 'beginner',
  daysPerWeek: 4,
  trainingDays: [0, 2, 4, 5],
  sessionMinutes: 60,
  raceDate: '2027-03-25',
  startDate: '2026-11-23',
  weakStations: ['wall_balls'],
}

describe('buildWeeks', () => {
  it('runs from the start Monday to race week with phases in order', () => {
    const weeks = buildWeeks(profile)
    expect(weeks[0].startDate).toBe('2026-11-23')
    expect(weeks.at(-1)!.phase).toBe('race')
    expect(weeks.at(-1)!.startDate).toBe('2027-03-22')
    const order = ['base', 'build', 'specific', 'taper', 'race']
    const idx = weeks.map((w) => order.indexOf(w.phase))
    expect(idx).toEqual([...idx].sort((a, b) => a - b))
    expect(weeks.filter((w) => w.phase === 'taper')).toHaveLength(2)
  })
})

describe('generatePlan', () => {
  const plan = generatePlan(profile)

  it('only uses known exercises', () => {
    for (const s of plan.sessions) for (const b of s.blocks) expect(EXERCISE_BY_ID[b.exerciseId], b.exerciseId).toBeDefined()
  })

  it('schedules sessions on the chosen weekdays and ends on race day', () => {
    const normal = plan.sessions.filter((s) => s.week === 1)
    expect(normal.map((s) => s.date)).toEqual(['2026-11-23', '2026-11-25', '2026-11-27', '2026-11-28'])
    expect(plan.sessions.at(-1)!.date).toBe('2027-03-25')
    expect(plan.sessions.at(-1)!.type).toBe('race')
  })

  it('uses division race standards on race day', () => {
    const race = plan.sessions.at(-1)!
    const legs = race.blocks.filter((b) => b.exerciseId === 'run_compromised')
    expect(legs).toHaveLength(8)
    expect(legs[0].distanceM).toBe(350)
    const wb = race.blocks.find((b) => b.exerciseId === 'box_wall_balls')!
    expect(wb.reps).toBe(100)
    expect(wb.weightKg).toBe(4)
  })

  it('progresses station loads towards race weight', () => {
    const sledLoads = plan.sessions
      .flatMap((s) => s.blocks.map((b) => ({ week: s.week, b })))
      .filter((x) => x.b.exerciseId === 'sled_push' && x.b.weightKg)
    expect(sledLoads[0].b.weightKg!).toBeLessThan(75)
    expect(Math.max(...sledLoads.map((x) => x.b.weightKg!))).toBeGreaterThanOrEqual(75)
  })

  it('puts weak stations in every station session', () => {
    for (const s of plan.sessions.filter((x) => x.type === 'stations')) {
      expect(s.blocks.some((b) => b.exerciseId === 'box_wall_balls')).toBe(true)
    }
  })

  it('includes race simulations in the specific phase', () => {
    expect(plan.sessions.some((s) => s.type === 'simulation')).toBe(true)
  })

  it('includes timed AMRAPs in the build phase', () => {
    const amraps = plan.sessions.filter((s) => s.type === 'amrap')
    expect(amraps.length).toBeGreaterThan(0)
    for (const a of amraps) {
      expect(a.capMin).toBeGreaterThan(0)
      expect(plan.weeks.find((w) => w.week === a.week)!.phase).toBe('build')
    }
  })

  it('handles every days-per-week setting', () => {
    for (let d = 2; d <= 6; d++) {
      const p = generatePlan({ ...profile, daysPerWeek: d, trainingDays: [0, 1, 2, 3, 4, 5].slice(0, d) })
      expect(p.sessions.filter((s) => s.week === 2)).toHaveLength(d)
    }
  })
})
