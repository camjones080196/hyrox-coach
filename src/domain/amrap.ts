// AMRAP templates. Each movement is defined relative to the athlete's race
// standards, so the same template gives Men Open and adaptive athletes their
// own distances, reps, loads and exercise versions.
import { diffBlock } from './multiAthlete'
import { DIVISIONS, stationStandard } from './standards'
import type { Athlete, Block, DivisionId, Level, StationId } from './types'

type Movement =
  | { kind: 'run'; legFraction: number }
  | { kind: 'station'; station: StationId; fraction: number }
  | { kind: 'fixed'; exerciseId: string; reps?: number; distanceM?: number; durationSec?: number }

export interface AmrapTemplate {
  id: string
  name: string
  description: string
  capMin: number
  movements: Movement[]
}

export const AMRAP_TEMPLATES: AmrapTemplate[] = [
  {
    id: 'stations',
    name: 'Station mix',
    description: 'Short run, wall balls, carry and lunges. The HYROX classic.',
    capMin: 15,
    movements: [
      { kind: 'run', legFraction: 0.5 },
      { kind: 'station', station: 'wall_balls', fraction: 0.15 },
      { kind: 'station', station: 'farmers_carry', fraction: 0.25 },
      { kind: 'station', station: 'sandbag_lunge', fraction: 0.2 },
    ],
  },
  {
    id: 'run_wb',
    name: 'Run + wall balls',
    description: 'Practise running on tired legs straight off wall balls.',
    capMin: 12,
    movements: [
      { kind: 'run', legFraction: 0.6 },
      { kind: 'station', station: 'wall_balls', fraction: 0.2 },
    ],
  },
  {
    id: 'engine',
    name: 'Engine',
    description: 'SkiErg, row and burpees. Big aerobic hit, low leg impact.',
    capMin: 20,
    movements: [
      { kind: 'station', station: 'skierg', fraction: 0.25 },
      { kind: 'station', station: 'row', fraction: 0.25 },
      { kind: 'station', station: 'burpee_broad_jump', fraction: 0.125 },
    ],
  },
  {
    id: 'grip',
    name: 'Grip & legs',
    description: 'Sled pull, carries and lunges for the back half of the race.',
    capMin: 15,
    movements: [
      { kind: 'station', station: 'sled_pull', fraction: 0.5 },
      { kind: 'station', station: 'farmers_carry', fraction: 0.25 },
      { kind: 'station', station: 'sandbag_lunge', fraction: 0.2 },
    ],
  },
  {
    id: 'strength',
    name: 'Strength circuit',
    description: 'Bodyweight and light dumbbell work. Good for a gym-light day.',
    capMin: 12,
    movements: [
      { kind: 'fixed', exerciseId: 'box_squat', reps: 10 },
      { kind: 'fixed', exerciseId: 'push_up', reps: 8 },
      { kind: 'fixed', exerciseId: 'bent_row', reps: 10 },
      { kind: 'fixed', exerciseId: 'dead_bug', reps: 10 },
    ],
  },
]

const LOAD: Record<Level, number> = { beginner: 0.7, intermediate: 0.85, advanced: 1 }

const roundTo = (n: number, step: number) => Math.max(step, Math.round(n / step) * step)

/** The adaptive version of a station where the division calls for it. */
export function stationExercise(division: DivisionId, station: StationId): string {
  if (station === 'wall_balls' && (division === 'neuro_major' || division === 'lower_limb')) return 'box_wall_balls'
  if (station === 'burpee_broad_jump' && division !== 'men_open' && division !== 'neuro_minor') return 'burpee_walkout'
  return station
}

function movementBlock(m: Movement, id: string, division: DivisionId, level: Level): Block {
  const base: Block = { id, exerciseId: '', sets: 1, restSec: 0, section: 'main' }
  if (m.kind === 'run') {
    const leg = Math.min(DIVISIONS[division].runLegM, 400)
    return { ...base, exerciseId: 'run_compromised', distanceM: Math.max(100, roundTo(leg * m.legFraction, 25)) }
  }
  if (m.kind === 'fixed') {
    const { kind: _kind, ...rest } = m
    return { ...base, ...rest }
  }
  const std = stationStandard(division, m.station)
  const b: Block = { ...base, exerciseId: stationExercise(division, m.station) }
  if (std.reps) b.reps = roundTo(std.reps * m.fraction, 5)
  else if (std.distanceM) b.distanceM = roundTo(std.distanceM * m.fraction, m.station.startsWith('sled') ? 12.5 : 10)
  if (std.weightKg) b.weightKg = roundTo(std.weightKg * LOAD[level], m.station === 'wall_balls' ? 1 : m.station.startsWith('sled') ? 2.5 : 2)
  return b
}

/** A warm-up block that sits before the AMRAP clock starts. */
export function amrapWarmup(id: string): Block {
  return { id, exerciseId: 'row_easy', sets: 1, durationSec: 480, targetRpe: 4, notes: 'Warm-up, before the clock starts', section: 'warmup' }
}

/**
 * Build the round for a template. Block values are for the first athlete; the
 * others get per-athlete overrides where their division or level differs.
 */
export function buildAmrapRound(template: AmrapTemplate, athletes: Pick<Athlete, 'id' | 'division' | 'level'>[], idPrefix: string): Block[] {
  if (!athletes.length) return []
  const [first, ...rest] = athletes
  return template.movements.map((m, i) => {
    const id = `${idPrefix}-m${i + 1}`
    const b = movementBlock(m, id, first.division, first.level)
    const overrides: NonNullable<Block['athletes']> = {}
    for (const a of rest) {
      const d = diffBlock(b, movementBlock(m, id, a.division, a.level))
      if (Object.keys(d).length) overrides[a.id] = d
    }
    return Object.keys(overrides).length ? { ...b, athletes: overrides } : b
  })
}

/** Split an AMRAP session's blocks into warm-up, the repeated round and cool-down. */
export function amrapParts(blocks: Block[]) {
  return {
    warmup: blocks.filter((b) => b.section === 'warmup'),
    round: blocks.filter((b) => !b.section || b.section === 'main'),
    cooldown: blocks.filter((b) => b.section === 'cooldown'),
  }
}
