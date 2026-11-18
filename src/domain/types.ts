// Core data types for the training model. Everything here is plain data so it
// can be stored in the shared database and edited freely in the app.

export type DivisionId = 'neuro_major' | 'neuro_minor' | 'lower_limb' | 'men_open'

export type StationId =
  | 'skierg'
  | 'sled_push'
  | 'sled_pull'
  | 'burpee_broad_jump'
  | 'row'
  | 'farmers_carry'
  | 'sandbag_lunge'
  | 'wall_balls'

export interface StationStandard {
  station: StationId
  /** Metres for distance stations. */
  distanceM?: number
  /** Reps for rep stations (wall balls). */
  reps?: number
  /** Load in kg. For carries this is per hand; `implements` says how many. */
  weightKg?: number
  implements?: number
  /** Wall ball target height in metres. */
  targetHeightM?: number
  notes?: string
}

export interface DivisionStandard {
  id: DivisionId
  name: string
  description: string
  /** Distance run before each station. */
  runLegM: number
  stations: StationStandard[]
  source: string
}

export type Level = 'beginner' | 'intermediate' | 'advanced'

export type ExerciseCategory = 'run' | 'erg' | 'station' | 'strength' | 'conditioning' | 'mobility'

export interface Exercise {
  id: string
  name: string
  category: ExerciseCategory
  /** The race station this trains, if any. */
  station?: StationId
  /** What the exercise is usually prescribed in. */
  measure: 'reps' | 'distance' | 'time'
  /** Coaching notes, including adaptive cues. */
  notes?: string
  /** Ids of exercises that can be swapped in for this one. */
  alternatives?: string[]
  /** True when it suits athletes with limited lower-limb function or balance. */
  adaptiveFriendly?: boolean
}

export interface AthleteProfile {
  name: string
  division: DivisionId
  level: Level
  /** Training days per week (2-6). */
  daysPerWeek: number
  /** Preferred weekdays, 0 = Monday ... 6 = Sunday. Length should match daysPerWeek. */
  trainingDays: number[]
  /** Typical session length in minutes. */
  sessionMinutes: number
  /** ISO date (yyyy-mm-dd). */
  raceDate: string
  /** ISO date the plan starts on (snapped to the Monday of that week). */
  startDate: string
  /** Stations to give extra attention to. */
  weakStations: StationId[]
  /** Free-text limitations, e.g. "left leg weaker, no jumping". */
  limitations?: string
}

export type Phase = 'base' | 'build' | 'specific' | 'taper' | 'race'

export type SessionType = 'run' | 'stations' | 'strength' | 'hybrid' | 'simulation' | 'recovery' | 'race'

export interface Block {
  id: string
  exerciseId: string
  sets: number
  reps?: number
  distanceM?: number
  durationSec?: number
  weightKg?: number
  restSec?: number
  /** Rate of perceived effort target, 1-10. */
  targetRpe?: number
  notes?: string
}

export interface Session {
  id: string
  /** ISO date. */
  date: string
  week: number
  type: SessionType
  title: string
  /** Short purpose of the session. */
  focus: string
  blocks: Block[]
  /** Estimated minutes. */
  minutes: number
}

export interface PlanWeek {
  week: number
  phase: Phase
  /** ISO date of the Monday. */
  startDate: string
  deload: boolean
}

export interface Plan {
  weeks: PlanWeek[]
  sessions: Session[]
}
