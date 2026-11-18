import { describe, expect, it } from 'vitest'
import { generateSharedPlan, resolveBlock } from './multiAthlete'
import type { Athlete, PlanSettings } from './types'

const settings: PlanSettings = { daysPerWeek: 4, trainingDays: [0, 2, 4, 5], sessionMinutes: 60, raceDate: '2027-03-25', startDate: '2026-11-23', weakStations: ['wall_balls'] }
const bro: Athlete = { id: 'a1', name: 'Bro', division: 'neuro_major', level: 'beginner' }
const cam: Athlete = { id: 'a2', name: 'Cam', division: 'men_open', level: 'intermediate' }

describe('generateSharedPlan', () => {
  const plan = generateSharedPlan(settings, [bro, cam])
  const race = plan.sessions.at(-1)!

  it('gives each athlete their own race standards on shared sessions', () => {
    const wb = race.blocks.find((b) => b.exerciseId === 'box_wall_balls')!
    expect(resolveBlock(wb, 'a1')).toMatchObject({ exerciseId: 'box_wall_balls', weightKg: 4 })
    expect(resolveBlock(wb, 'a2')).toMatchObject({ exerciseId: 'wall_balls', weightKg: 6 })
    const leg = race.blocks.find((b) => b.exerciseId === 'run_compromised')!
    expect(resolveBlock(leg, 'a1').distanceM).toBe(350)
    expect(resolveBlock(leg, 'a2').distanceM).toBe(1000)
    const push = race.blocks.find((b) => b.exerciseId === 'sled_push')!
    expect(resolveBlock(push, 'a2').weightKg).toBe(152)
  })

  it('keeps one shared set of sessions', () => {
    const ids = plan.sessions.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('works with a single athlete and no overrides', () => {
    const p = generateSharedPlan(settings, [bro])
    expect(p.sessions.every((s) => s.blocks.every((b) => !b.athletes))).toBe(true)
  })
})
