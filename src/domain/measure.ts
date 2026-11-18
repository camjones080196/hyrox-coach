import type { Block, Exercise } from './types'

/** What a block's target is counted in. Any exercise can use any of these. */
export type MeasureMode = 'reps' | 'distance' | 'calories' | 'time'

export const MEASURE_LABEL: Record<MeasureMode, string> = { reps: 'Reps', distance: 'Distance', calories: 'Calories', time: 'Time' }

export function measureMode(b: Block, ex?: Pick<Exercise, 'measure'>): MeasureMode {
  if (b.reps !== undefined) return 'reps'
  if (b.calories !== undefined) return 'calories'
  if (b.distanceM !== undefined) return 'distance'
  if (b.durationSec !== undefined) return 'time'
  return ex?.measure === 'distance' ? 'distance' : ex?.measure === 'calories' ? 'calories' : ex?.measure === 'time' ? 'time' : 'reps'
}

// Rough conversions so switching keeps a sensible target, which can then be edited.
const SEC_PER_REP = 3
const M_PER_MIN = 225 // steady pace
const M_PER_CAL = 15 // rower, SkiErg or run

function secondsOf(b: Block): number | undefined {
  if (b.reps !== undefined) return b.reps * SEC_PER_REP
  if (b.calories !== undefined) return ((b.calories * M_PER_CAL) / M_PER_MIN) * 60
  if (b.distanceM !== undefined) return (b.distanceM / M_PER_MIN) * 60
  if (b.durationSec !== undefined) return b.durationSec
  return undefined
}

/** Switch a block to a different measure, converting the target roughly. */
export function toMeasure(b: Block, mode: MeasureMode, ex?: Pick<Exercise, 'measure'>): Block {
  if (measureMode(b, ex) === mode && (b.reps ?? b.calories ?? b.distanceM ?? b.durationSec) !== undefined) return b
  const s = secondsOf(b)
  const { reps: _r, distanceM: _d, calories: _c, durationSec: _t, ...rest } = b
  const m = s !== undefined ? (s / 60) * M_PER_MIN : undefined
  switch (mode) {
    case 'reps':
      return { ...rest, reps: s ? Math.max(1, Math.round(s / SEC_PER_REP)) : 10 }
    case 'calories':
      return { ...rest, calories: m ? Math.max(1, Math.round(m / M_PER_CAL)) : 15 }
    case 'distance':
      return { ...rest, distanceM: m ? Math.max(25, Math.round(m / 25) * 25) : 250 }
    case 'time':
      return { ...rest, durationSec: s ? Math.max(15, Math.round(s / 15) * 15) : 60 }
  }
}
