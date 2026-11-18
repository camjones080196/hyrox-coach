import { generatePlan } from './generatePlan'
import { OVERRIDE_FIELDS, type Athlete, type Block, type BlockOverride, type Plan, type PlanSettings } from './types'

/**
 * Build one shared plan for several athletes. Everyone gets the same sessions;
 * each block holds the first athlete's targets, plus per-athlete overrides where
 * another athlete's division or level gives different numbers or a different
 * exercise (e.g. regular wall balls instead of wall balls to a box).
 */
export function generateSharedPlan(settings: PlanSettings, athletes: Athlete[]): Plan {
  if (!athletes.length) throw new Error('Add at least one athlete')
  const plans = athletes.map((a) => generatePlan({ ...settings, name: a.name, division: a.division, level: a.level, limitations: a.limitations }))
  const [base, ...others] = plans
  const blockMaps = others.map((p) => new Map(p.sessions.flatMap((s) => s.blocks.map((b) => [b.id, b] as const))))

  for (const session of base.sessions) {
    session.blocks = session.blocks.map((b) => {
      const overrides: Record<string, BlockOverride> = {}
      blockMaps.forEach((m, i) => {
        const other = m.get(b.id)
        if (!other) return
        const diff = diffBlock(b, other)
        if (Object.keys(diff).length) overrides[athletes[i + 1].id] = diff
      })
      return Object.keys(overrides).length ? { ...b, athletes: overrides } : b
    })
  }
  return base
}

function diffBlock(base: Block, other: Block): BlockOverride {
  const d: Record<string, unknown> = {}
  for (const f of OVERRIDE_FIELDS) if (base[f] !== other[f]) d[f] = other[f]
  return d as BlockOverride
}

/** The block as a given athlete should do it. */
export function resolveBlock(b: Block, athleteId?: string): Block {
  const o = athleteId ? b.athletes?.[athleteId] : undefined
  if (!o) return b
  const out: Block = { ...b }
  for (const f of OVERRIDE_FIELDS) if (f in o) (out as unknown as Record<string, unknown>)[f] = o[f]
  return out
}
