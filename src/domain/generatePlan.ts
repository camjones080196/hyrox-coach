import { addDays, daysBetween, mondayOf } from './dates'
import { DIVISIONS, STATION_ORDER, stationStandard } from './standards'
import type {
  AthleteProfile,
  Block,
  DivisionStandard,
  Level,
  Phase,
  Plan,
  PlanWeek,
  Session,
  SessionType,
  StationId,
} from './types'

// Generates a starter plan from the athlete profile. The output is plain data;
// once saved, every session and block can be edited by hand in the app. The
// generator is only used to create (or regenerate) a plan.

const LEVEL_VOLUME: Record<Level, number> = { beginner: 0.65, intermediate: 0.85, advanced: 1 }
const LEVEL_LOAD: Record<Level, number> = { beginner: -0.1, intermediate: 0, advanced: 0.05 }
const PHASE_LOAD: Record<Phase, number> = { base: 0.6, build: 0.8, specific: 1, taper: 0.9, race: 1 }
const PHASE_RPE: Record<Phase, number> = { base: 6, build: 7, specific: 8, taper: 7, race: 9 }

/** Session types for a normal week, by number of training days. */
const WEEK_TEMPLATES: Record<number, SessionType[]> = {
  2: ['hybrid', 'stations'],
  3: ['run', 'strength', 'stations'],
  4: ['run', 'strength', 'stations', 'hybrid'],
  5: ['run', 'strength', 'stations', 'run', 'hybrid'],
  6: ['run', 'strength', 'stations', 'recovery', 'run', 'hybrid'],
}

export function buildWeeks(profile: AthleteProfile): PlanWeek[] {
  const start = mondayOf(profile.startDate)
  const raceMonday = mondayOf(profile.raceDate)
  const total = Math.floor(daysBetween(start, raceMonday) / 7) + 1 // includes race week
  if (total < 1) throw new Error('Race date must be after the start date')

  const training = total - 1 // weeks before race week
  const taper = training >= 10 ? 2 : training >= 4 ? 1 : 0
  const rest = training - taper
  const specific = Math.round(rest * 0.3)
  const build = Math.round(rest * 0.35)
  const base = rest - specific - build

  const weeks: PlanWeek[] = []
  for (let i = 0; i < total; i++) {
    let phase: Phase
    if (i === total - 1) phase = 'race'
    else if (i < base) phase = 'base'
    else if (i < base + build) phase = 'build'
    else if (i < base + build + specific) phase = 'specific'
    else phase = 'taper'
    // Every 4th week of normal training is an easier week to absorb the work.
    const deload = (phase === 'base' || phase === 'build' || phase === 'specific') && i % 4 === 3
    weeks.push({ week: i + 1, phase, startDate: addDays(start, i * 7), deload })
  }
  return weeks
}

interface Ctx {
  profile: AthleteProfile
  division: DivisionStandard
  week: PlanWeek
  /** Weeks into the current phase, from 0. */
  phaseWeek: number
  volume: number
  load: number
  rpe: number
}

function round(n: number, step: number) {
  return Math.max(step, Math.round(n / step) * step)
}

function loadFor(ctx: Ctx, station: StationId): number | undefined {
  const std = stationStandard(ctx.profile.division, station)
  if (std.weightKg === undefined) return undefined
  if (ctx.load === 1) return std.weightKg
  const step = station === 'wall_balls' ? 1 : station.startsWith('sled') ? 2.5 : 2
  return round(std.weightKg * ctx.load, step)
}

/** A fraction of the race distance/reps for a station, scaled by volume. */
function stationBlock(ctx: Ctx, id: string, station: StationId, fraction: number, sets: number, extra: Partial<Block> = {}): Block {
  const std = stationStandard(ctx.profile.division, station)
  const exerciseId = adaptiveSwap(ctx, station)
  const b: Block = {
    id,
    exerciseId,
    sets,
    weightKg: loadFor(ctx, station),
    restSec: 90,
    targetRpe: ctx.rpe,
    ...extra,
  }
  if (std.reps) b.reps = round(std.reps * fraction * ctx.volume, 5)
  else if (std.distanceM) b.distanceM = round(std.distanceM * fraction * ctx.volume, station.startsWith('sled') ? 12.5 : 10)
  if (std.implements && std.implements > 1) b.notes = `${std.implements} x ${b.weightKg} kg`
  return b
}

/** Use the adaptive-standard version of a station where the division calls for it. */
function adaptiveSwap(ctx: Ctx, station: StationId): string {
  const d = ctx.profile.division
  if (station === 'wall_balls' && (d === 'neuro_major' || d === 'lower_limb')) return 'box_wall_balls'
  if (station === 'burpee_broad_jump' && d !== 'men_open' && d !== 'neuro_minor') return 'burpee_walkout'
  return station
}

function stationFocus(ctx: Ctx, count: number): StationId[] {
  // Weak stations first, then rotate through the rest week by week.
  const weak = ctx.profile.weakStations
  const others = STATION_ORDER.filter((s) => !weak.includes(s))
  const shift = ctx.week.week % others.length
  const rotated = [...others.slice(shift), ...others.slice(0, shift)]
  return [...weak, ...rotated].slice(0, count)
}

function legBlock(ctx: Ctx, id: string, reps: number, extra: Partial<Block> = {}): Block {
  return {
    id,
    exerciseId: 'run_intervals',
    sets: Math.max(1, Math.round(reps * ctx.volume)),
    distanceM: ctx.division.runLegM,
    restSec: ctx.week.phase === 'base' ? 120 : 75,
    targetRpe: ctx.rpe,
    ...extra,
  }
}

type Builder = (ctx: Ctx, sid: string) => Omit<Session, 'id' | 'date' | 'week'>

const BUILDERS: Record<SessionType, Builder> = {
  run: (ctx, sid) => {
    const easy = ctx.phaseWeek % 2 === 0 || ctx.week.phase === 'base'
    return easy
      ? {
          type: 'run',
          title: 'Aerobic run',
          focus: 'Build the engine at an easy, conversational pace.',
          minutes: Math.round(ctx.profile.sessionMinutes * 0.8),
          blocks: [
            { id: `${sid}-b1`, exerciseId: 'run_easy', sets: 1, durationSec: round(ctx.profile.sessionMinutes * 0.7 * ctx.volume, 5) * 60, targetRpe: 5 },
            { id: `${sid}-b2`, exerciseId: 'mobility_flow', sets: 1, durationSec: 600 },
          ],
        }
      : {
          type: 'run',
          title: 'Race-leg intervals',
          focus: `Repeat ${ctx.division.runLegM} m legs at race pace.`,
          minutes: ctx.profile.sessionMinutes,
          blocks: [
            { id: `${sid}-b1`, exerciseId: 'run_easy', sets: 1, durationSec: 600, targetRpe: 4, notes: 'Warm-up' },
            legBlock(ctx, `${sid}-b2`, 6),
            { id: `${sid}-b3`, exerciseId: 'mobility_flow', sets: 1, durationSec: 300 },
          ],
        }
  },

  strength: (ctx, sid) => {
    const reps = ctx.week.phase === 'base' ? 10 : ctx.week.phase === 'build' ? 8 : 6
    const sets = Math.max(2, Math.round(3 * ctx.volume + (ctx.week.phase === 'build' ? 1 : 0)))
    const mk = (n: number, exerciseId: string, r = reps, extra: Partial<Block> = {}): Block => ({
      id: `${sid}-b${n}`, exerciseId, sets, reps: r, restSec: 90, targetRpe: ctx.rpe, ...extra,
    })
    return {
      type: 'strength',
      title: 'Strength',
      focus: 'Leg drive for sleds and lunges, pulling strength, and core control.',
      minutes: ctx.profile.sessionMinutes,
      blocks: [
        { id: `${sid}-b0`, exerciseId: 'single_leg_balance', sets: 2, durationSec: 30, notes: 'Each side, as a warm-up' },
        mk(1, 'box_squat'),
        mk(2, 'hip_thrust'),
        mk(3, 'bent_row'),
        mk(4, 'db_press'),
        mk(5, 'split_squat_supported', reps, { notes: 'Each leg' }),
        mk(6, 'dead_bug', 8, { notes: 'Each side', restSec: 45 }),
      ],
    }
  },

  stations: (ctx, sid) => {
    const focus = stationFocus(ctx, 3)
    return {
      type: 'stations',
      title: 'Station skills',
      focus: `Technique and capacity on ${focus.map((s) => s.replace(/_/g, ' ')).join(', ')}.`,
      minutes: ctx.profile.sessionMinutes,
      blocks: [
        { id: `${sid}-b0`, exerciseId: 'row_easy', sets: 1, durationSec: 480, targetRpe: 4, notes: 'Warm-up' },
        ...focus.map((s, i) => stationBlock(ctx, `${sid}-b${i + 1}`, s, 0.5, 3)),
      ],
    }
  },

  hybrid: (ctx, sid) => {
    const focus = stationFocus(ctx, 2)
    const rounds = Math.max(2, Math.round(4 * ctx.volume))
    return {
      type: 'hybrid',
      title: 'Run + station rounds',
      focus: 'Practise switching between running and stations.',
      minutes: ctx.profile.sessionMinutes,
      blocks: [
        { id: `${sid}-b0`, exerciseId: 'run_easy', sets: 1, durationSec: 480, targetRpe: 4, notes: 'Warm-up' },
        legBlock(ctx, `${sid}-b1`, 1, { sets: rounds, exerciseId: 'run_compromised', notes: `Alternate with the stations below, ${rounds} rounds, minimal rest`, restSec: 0 }),
        ...focus.map((s, i) => stationBlock(ctx, `${sid}-b${i + 2}`, s, 0.4, rounds, { restSec: 0 })),
      ],
    }
  },

  simulation: (ctx, sid) => {
    const half = ctx.phaseWeek % 2 === 0
    const stations = half ? STATION_ORDER.slice(0, 4) : STATION_ORDER.slice(4)
    return {
      type: 'simulation',
      title: half ? 'Half simulation: stations 1-4' : 'Half simulation: stations 5-8',
      focus: 'Race order, race weights, race pacing. Note your splits.',
      minutes: Math.max(ctx.profile.sessionMinutes, 60),
      blocks: [
        { id: `${sid}-b0`, exerciseId: 'run_easy', sets: 1, durationSec: 600, targetRpe: 4, notes: 'Warm-up' },
        ...stations.flatMap((s, i) => [
          legBlock({ ...ctx, volume: 1 }, `${sid}-r${i}`, 1, { exerciseId: 'run_compromised', restSec: 0 }),
          stationBlock({ ...ctx, volume: 1 }, `${sid}-s${i}`, s, 1, 1, { restSec: 0 }),
        ]),
      ],
    }
  },

  recovery: (ctx, sid) => ({
    type: 'recovery',
    title: 'Recovery',
    focus: 'Easy movement and mobility. Keep it genuinely easy.',
    minutes: Math.min(40, ctx.profile.sessionMinutes),
    blocks: [
      { id: `${sid}-b1`, exerciseId: 'bike_easy', sets: 1, durationSec: 1200, targetRpe: 3 },
      { id: `${sid}-b2`, exerciseId: 'mobility_flow', sets: 1, durationSec: 900 },
    ],
  }),

  race: (ctx, sid) => ({
    type: 'race',
    title: 'Race day: HYROX',
    focus: `${ctx.division.name}. Trust the training.`,
    minutes: 90,
    blocks: STATION_ORDER.flatMap((s, i) => [
      legBlock({ ...ctx, volume: 1 }, `${sid}-r${i}`, 1, { exerciseId: 'run_compromised', restSec: 0, targetRpe: 9 }),
      stationBlock({ ...ctx, volume: 1, load: 1 }, `${sid}-s${i}`, s, 1, 1, { restSec: 0, targetRpe: 9 }),
    ]),
  }),
}

function weekTypes(profile: AthleteProfile, week: PlanWeek, phaseWeek: number): SessionType[] {
  const days = Math.min(6, Math.max(2, profile.daysPerWeek))
  const types = [...WEEK_TEMPLATES[days]]
  if (week.phase === 'specific' && !week.deload) {
    // Swap the hybrid (or the last session) for a race simulation.
    const i = types.lastIndexOf('hybrid')
    types[i >= 0 ? i : types.length - 1] = 'simulation'
  }
  if (week.phase === 'taper' && phaseWeek === 0 && days >= 3) {
    types[types.length - 1] = 'simulation'
  }
  return types
}

export function generatePlan(profile: AthleteProfile): Plan {
  const division = DIVISIONS[profile.division]
  const weeks = buildWeeks(profile)
  const days = [...profile.trainingDays].sort((a, b) => a - b)
  const sessions: Session[] = []

  let phaseStart = 0
  weeks.forEach((week, i) => {
    if (i > 0 && weeks[i - 1].phase !== week.phase) phaseStart = i
    const phaseWeek = i - phaseStart
    const progression = week.phase === 'taper' ? 0.6 : 1 + Math.min(phaseWeek, 4) * 0.05
    const ctx: Ctx = {
      profile,
      division,
      week,
      phaseWeek,
      volume: LEVEL_VOLUME[profile.level] * progression * (week.deload ? 0.6 : 1),
      load: Math.min(1.05, PHASE_LOAD[week.phase] + LEVEL_LOAD[profile.level]),
      rpe: week.deload ? 5 : PHASE_RPE[week.phase],
    }

    if (week.phase === 'race') {
      // Two short openers early in the week, then the race.
      const raceDay = profile.raceDate
      const openers = days.filter((d) => addDays(week.startDate, d) < addDays(raceDay, -1)).slice(0, 2)
      openers.forEach((d) => {
        const id = `w${week.week}-d${d}`
        sessions.push({ id, date: addDays(week.startDate, d), week: week.week, ...BUILDERS.recovery(ctx, id), title: 'Race-week opener', focus: 'Short and sharp. Stay fresh.' })
      })
      const id = `w${week.week}-race`
      sessions.push({ id, date: raceDay, week: week.week, ...BUILDERS.race(ctx, id) })
      return
    }

    const types = weekTypes(profile, week, phaseWeek)
    days.slice(0, types.length).forEach((d, j) => {
      const id = `w${week.week}-d${d}`
      sessions.push({ id, date: addDays(week.startDate, d), week: week.week, ...BUILDERS[types[j]](ctx, id) })
    })
  })

  return { weeks, sessions }
}
