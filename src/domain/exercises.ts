import type { Exercise } from './types'

// Starter exercise library. Users can add their own in the app; these are the
// defaults the plan generator draws from. Ids are stable so logs keep working.
export const EXERCISES: Exercise[] = [
  // Running / locomotion
  { id: 'run_easy', name: 'Easy run / walk-run', category: 'run', measure: 'time', notes: 'Conversational effort. Walk breaks are fine.', alternatives: ['bike_easy', 'row_easy'], adaptiveFriendly: true },
  { id: 'run_intervals', name: 'Run intervals', category: 'run', measure: 'distance', notes: 'Run each rep at race effort, walk recovery.', alternatives: ['bike_intervals', 'run_easy'] },
  { id: 'run_compromised', name: 'Compromised run (after station)', category: 'run', measure: 'distance', notes: 'Run straight off a station to practise race legs.', alternatives: ['run_intervals'] },
  { id: 'bike_easy', name: 'Bike / assault bike easy', category: 'conditioning', measure: 'time', notes: 'Low-impact aerobic swap for running.', alternatives: ['run_easy', 'row_easy'], adaptiveFriendly: true },
  { id: 'bike_intervals', name: 'Assault bike intervals', category: 'conditioning', measure: 'time', alternatives: ['run_intervals', 'ski_intervals'], adaptiveFriendly: true },

  // Ergs
  { id: 'skierg', name: 'SkiErg', category: 'erg', station: 'skierg', measure: 'distance', notes: 'Can be done with a wider stance or seated on a box for balance.', alternatives: ['ski_intervals', 'band_pulldown'], adaptiveFriendly: true },
  { id: 'ski_intervals', name: 'SkiErg intervals', category: 'erg', station: 'skierg', measure: 'distance', alternatives: ['skierg', 'bike_intervals'], adaptiveFriendly: true },
  { id: 'row', name: 'Row', category: 'erg', station: 'row', measure: 'distance', notes: 'Strap feet securely; arms-and-body rowing is an option if leg drive is limited.', alternatives: ['row_easy', 'bike_intervals'], adaptiveFriendly: true },
  { id: 'row_easy', name: 'Row easy', category: 'erg', station: 'row', measure: 'time', alternatives: ['bike_easy', 'run_easy'], adaptiveFriendly: true },

  // Stations
  { id: 'sled_push', name: 'Sled push', category: 'station', station: 'sled_push', measure: 'distance', notes: 'Low hips, short fast steps. Arms locked if leg drive is uneven.', alternatives: ['prowler_heavy', 'wall_drive'] },
  { id: 'prowler_heavy', name: 'Heavy sled push (strength)', category: 'station', station: 'sled_push', measure: 'distance', alternatives: ['sled_push', 'leg_press'] },
  { id: 'wall_drive', name: 'Wall drive / treadmill push (motor off)', category: 'station', station: 'sled_push', measure: 'time', notes: 'Use when no sled is available.', alternatives: ['sled_push'] },
  { id: 'sled_pull', name: 'Sled pull', category: 'station', station: 'sled_pull', measure: 'distance', notes: 'Can be done seated or standing (lower limb division).', alternatives: ['rope_pull_seated', 'bent_row'], adaptiveFriendly: true },
  { id: 'rope_pull_seated', name: 'Seated rope pull', category: 'station', station: 'sled_pull', measure: 'distance', alternatives: ['sled_pull', 'bent_row'], adaptiveFriendly: true },
  { id: 'burpee_broad_jump', name: 'Burpee broad jump', category: 'station', station: 'burpee_broad_jump', measure: 'distance', alternatives: ['burpee_walkout', 'burpee_step'] },
  { id: 'burpee_walkout', name: 'Burpee walkout + steps', category: 'station', station: 'burpee_broad_jump', measure: 'distance', notes: 'Hands down, walk out to plank, walk back, then step forward. Matches the adaptive crutch standard.', alternatives: ['burpee_broad_jump', 'burpee_step'], adaptiveFriendly: true },
  { id: 'burpee_step', name: 'Step-back burpee', category: 'station', station: 'burpee_broad_jump', measure: 'reps', alternatives: ['burpee_walkout'], adaptiveFriendly: true },
  { id: 'farmers_carry', name: 'Farmers carry', category: 'station', station: 'farmers_carry', measure: 'distance', notes: 'Tall posture, short steps. Use one hand and a crutch/rail if needed.', alternatives: ['suitcase_carry', 'kb_hold'], adaptiveFriendly: true },
  { id: 'suitcase_carry', name: 'Suitcase carry (one side)', category: 'station', station: 'farmers_carry', measure: 'distance', alternatives: ['farmers_carry', 'kb_hold'], adaptiveFriendly: true },
  { id: 'kb_hold', name: 'Static kettlebell hold', category: 'strength', station: 'farmers_carry', measure: 'time', notes: 'Grip work without walking.', alternatives: ['farmers_carry'], adaptiveFriendly: true },
  { id: 'sandbag_lunge', name: 'Sandbag walking lunge', category: 'station', station: 'sandbag_lunge', measure: 'distance', alternatives: ['split_squat_supported', 'step_up'] },
  { id: 'split_squat_supported', name: 'Supported split squat', category: 'strength', station: 'sandbag_lunge', measure: 'reps', notes: 'Hold a rail or rack for balance.', alternatives: ['sandbag_lunge', 'step_up'], adaptiveFriendly: true },
  { id: 'step_up', name: 'Box step-up', category: 'strength', station: 'sandbag_lunge', measure: 'reps', notes: 'Low box, hand support allowed.', alternatives: ['split_squat_supported'], adaptiveFriendly: true },
  { id: 'wall_balls', name: 'Wall balls', category: 'station', station: 'wall_balls', measure: 'reps', notes: 'Squat to the box if one is used on race day.', alternatives: ['box_wall_balls', 'thruster_db'] },
  { id: 'box_wall_balls', name: 'Wall balls to a box', category: 'station', station: 'wall_balls', measure: 'reps', notes: 'Squat to a ~75 cm box, as provided in adaptive divisions.', alternatives: ['wall_balls', 'thruster_db'], adaptiveFriendly: true },
  { id: 'thruster_db', name: 'Dumbbell thruster', category: 'strength', station: 'wall_balls', measure: 'reps', alternatives: ['wall_balls', 'box_wall_balls'] },

  // Strength
  { id: 'box_squat', name: 'Box squat', category: 'strength', measure: 'reps', notes: 'Controlled depth to a box.', alternatives: ['leg_press', 'goblet_squat'], adaptiveFriendly: true },
  { id: 'goblet_squat', name: 'Goblet squat', category: 'strength', measure: 'reps', alternatives: ['box_squat', 'leg_press'] },
  { id: 'leg_press', name: 'Leg press', category: 'strength', measure: 'reps', notes: 'Single-leg or both; machine gives stability.', alternatives: ['box_squat'], adaptiveFriendly: true },
  { id: 'rdl', name: 'Romanian deadlift', category: 'strength', measure: 'reps', alternatives: ['hip_thrust', 'cable_pull_through'] },
  { id: 'hip_thrust', name: 'Hip thrust / glute bridge', category: 'strength', measure: 'reps', alternatives: ['rdl'], adaptiveFriendly: true },
  { id: 'cable_pull_through', name: 'Cable pull-through', category: 'strength', measure: 'reps', alternatives: ['rdl', 'hip_thrust'], adaptiveFriendly: true },
  { id: 'bent_row', name: 'Chest-supported row', category: 'strength', measure: 'reps', alternatives: ['rope_pull_seated', 'band_pulldown'], adaptiveFriendly: true },
  { id: 'band_pulldown', name: 'Lat pulldown', category: 'strength', measure: 'reps', alternatives: ['bent_row'], adaptiveFriendly: true },
  { id: 'db_press', name: 'Dumbbell shoulder press', category: 'strength', measure: 'reps', alternatives: ['push_up'], adaptiveFriendly: true },
  { id: 'push_up', name: 'Push-up (incline OK)', category: 'strength', measure: 'reps', alternatives: ['db_press'], adaptiveFriendly: true },
  { id: 'dead_bug', name: 'Dead bug', category: 'strength', measure: 'reps', notes: 'Core control; slow and braced.', alternatives: ['pallof_press', 'plank'], adaptiveFriendly: true },
  { id: 'pallof_press', name: 'Pallof press', category: 'strength', measure: 'reps', alternatives: ['dead_bug'], adaptiveFriendly: true },
  { id: 'plank', name: 'Plank', category: 'strength', measure: 'time', alternatives: ['dead_bug'], adaptiveFriendly: true },
  { id: 'single_leg_balance', name: 'Single-leg balance (supported)', category: 'mobility', measure: 'time', notes: 'Fingertip support as needed. Builds stability for lunges and carries.', adaptiveFriendly: true },

  // Mobility / recovery
  { id: 'mobility_flow', name: 'Mobility flow', category: 'mobility', measure: 'time', notes: 'Hips, ankles, thoracic spine. Follow physio guidance.', adaptiveFriendly: true },
]

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]))
