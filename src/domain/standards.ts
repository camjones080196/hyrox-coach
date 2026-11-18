import type { DivisionId, DivisionStandard, StationId } from './types'

const RULEBOOK = 'HYROX Adaptive Rulebook (2024), hyrox.com'

export const STATION_ORDER: StationId[] = [
  'skierg',
  'sled_push',
  'sled_pull',
  'burpee_broad_jump',
  'row',
  'farmers_carry',
  'sandbag_lunge',
  'wall_balls',
]

export const STATION_NAMES: Record<StationId, string> = {
  skierg: 'SkiErg',
  sled_push: 'Sled push',
  sled_pull: 'Sled pull',
  burpee_broad_jump: 'Burpee broad jump',
  row: 'Row',
  farmers_carry: 'Farmers carry',
  sandbag_lunge: 'Sandbag lunges',
  wall_balls: 'Wall balls',
}

// Men's standards. Weights for sleds include the sled.
export const DIVISIONS: Record<DivisionId, DivisionStandard> = {
  neuro_major: {
    id: 'neuro_major',
    name: 'Neurological Major',
    description: 'Impairment affecting two or more limbs (e.g. incomplete paraplegia). Orthoses, walkers or trolleys allowed.',
    runLegM: 350,
    source: RULEBOOK,
    stations: [
      { station: 'skierg', distanceM: 1000 },
      { station: 'sled_push', distanceM: 50, weightKg: 75 },
      { station: 'sled_pull', distanceM: 50, weightKg: 50 },
      { station: 'burpee_broad_jump', distanceM: 80, notes: 'Crutch adaptation available: 2 burpees/walkouts then 4 crutch steps.' },
      { station: 'row', distanceM: 1000 },
      { station: 'farmers_carry', distanceM: 100, weightKg: 24, implements: 2 },
      { station: 'sandbag_lunge', distanceM: 50, weightKg: 10 },
      { station: 'wall_balls', reps: 100, weightKg: 4, targetHeightM: 3, notes: 'Plyo box (~75 cm) provided for stability.' },
    ],
  },
  neuro_minor: {
    id: 'neuro_minor',
    name: 'Neurological Minor',
    description: 'Minor neurological limitation, usually one limb, with good mobility and strength.',
    runLegM: 750,
    source: `${RULEBOOK}. Note: rulebook also mentions ~350 m laps for neurological athletes; confirm with organisers.`,
    stations: [
      { station: 'skierg', distanceM: 1000 },
      { station: 'sled_push', distanceM: 50, weightKg: 75 },
      { station: 'sled_pull', distanceM: 50, weightKg: 75 },
      { station: 'burpee_broad_jump', distanceM: 80 },
      { station: 'row', distanceM: 1000 },
      { station: 'farmers_carry', distanceM: 200, weightKg: 24, implements: 1 },
      { station: 'sandbag_lunge', distanceM: 100, weightKg: 20 },
      { station: 'wall_balls', reps: 100, weightKg: 6, targetHeightM: 3 },
    ],
  },
  lower_limb: {
    id: 'lower_limb',
    name: 'Lower Limb Impairment',
    description: 'Partial or complete loss of function in one or both legs.',
    runLegM: 1000,
    source: RULEBOOK,
    stations: [
      { station: 'skierg', distanceM: 1000 },
      { station: 'sled_push', distanceM: 25, weightKg: 102 },
      { station: 'sled_pull', distanceM: 25, weightKg: 103, notes: 'May pull seated or standing.' },
      { station: 'burpee_broad_jump', distanceM: 80, notes: 'Crutch adaptation available.' },
      { station: 'row', distanceM: 1000 },
      { station: 'farmers_carry', distanceM: 200, weightKg: 24, implements: 2, notes: 'Crutch users carry one kettlebell.' },
      { station: 'sandbag_lunge', distanceM: 100, weightKg: 20 },
      { station: 'wall_balls', reps: 100, weightKg: 6, targetHeightM: 3, notes: 'Plyo box (~75 cm) provided for stability.' },
    ],
  },
  men_open: {
    id: 'men_open',
    name: 'Men Open (reference)',
    description: 'Standard men\'s open division, for comparison.',
    runLegM: 1000,
    source: 'HYROX Singles Rulebook',
    stations: [
      { station: 'skierg', distanceM: 1000 },
      { station: 'sled_push', distanceM: 50, weightKg: 152 },
      { station: 'sled_pull', distanceM: 50, weightKg: 103 },
      { station: 'burpee_broad_jump', distanceM: 80 },
      { station: 'row', distanceM: 1000 },
      { station: 'farmers_carry', distanceM: 200, weightKg: 24, implements: 2 },
      { station: 'sandbag_lunge', distanceM: 100, weightKg: 20 },
      { station: 'wall_balls', reps: 100, weightKg: 6, targetHeightM: 3 },
    ],
  },
}

export function stationStandard(division: DivisionId, station: StationId) {
  const s = DIVISIONS[division].stations.find((x) => x.station === station)
  if (!s) throw new Error(`No standard for ${station} in ${division}`)
  return s
}
