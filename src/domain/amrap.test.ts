import { describe, expect, it } from 'vitest'
import { AMRAP_TEMPLATES, amrapParts, buildAmrapRound } from './amrap'
import { resolveBlock } from './multiAthlete'
import { EXERCISE_BY_ID } from './exercises'

const dan = { id: 'dan', division: 'neuro_major' as const, level: 'beginner' as const }
const cam = { id: 'cam', division: 'men_open' as const, level: 'intermediate' as const }

describe('AMRAP templates', () => {
  it('build valid rounds for every template', () => {
    for (const t of AMRAP_TEMPLATES) {
      const round = buildAmrapRound(t, [dan, cam], 'x')
      expect(round).toHaveLength(t.movements.length)
      for (const b of round) {
        expect(EXERCISE_BY_ID[b.exerciseId], b.exerciseId).toBeDefined()
        expect(b.sets).toBe(1)
        expect(b.reps ?? b.distanceM ?? b.durationSec).toBeGreaterThan(0)
      }
    }
  })

  it('scales the same round to each athlete', () => {
    const round = buildAmrapRound(AMRAP_TEMPLATES.find((t) => t.id === 'run_wb')!, [dan, cam], 'x')
    const [run, wb] = round
    expect(resolveBlock(run, 'dan').distanceM).toBeLessThan(resolveBlock(run, 'cam').distanceM!)
    expect(resolveBlock(wb, 'dan').exerciseId).toBe('box_wall_balls')
    expect(resolveBlock(wb, 'cam')).toMatchObject({ exerciseId: 'wall_balls', reps: 20 })
  })

  it('separates warm-up from the round', () => {
    const parts = amrapParts([{ id: 'w', exerciseId: 'row_easy', sets: 1, section: 'warmup' }, { id: 'm', exerciseId: 'wall_balls', sets: 1 }])
    expect(parts.warmup.map((b) => b.id)).toEqual(['w'])
    expect(parts.round.map((b) => b.id)).toEqual(['m'])
  })
})
