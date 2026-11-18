import { describe, expect, it } from 'vitest'
import { measureMode, toMeasure } from './measure'

const base = { id: 'b', exerciseId: 'x', sets: 1 }

describe('toMeasure', () => {
  it('switches between any measure and keeps one target', () => {
    const t = toMeasure({ ...base, reps: 20, weightKg: 6 }, 'time')
    expect(t).toMatchObject({ durationSec: 60, weightKg: 6 })
    expect(t.reps).toBeUndefined()
    const d = toMeasure({ ...base, durationSec: 120 }, 'distance')
    expect(d.distanceM).toBe(450)
    expect(measureMode(toMeasure(d, 'reps'))).toBe('reps')
    expect(toMeasure({ ...base, distanceM: 300 }, 'calories').calories).toBe(20)
  })
  it('fills a default when the block has no target', () => {
    expect(toMeasure(base, 'reps', { measure: 'reps' }).reps).toBe(10)
  })
})
