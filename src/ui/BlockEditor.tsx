import { useState } from 'react'
import { exerciseById, useStore } from '../data/model'
import { isCardio, type Block } from '../domain/types'
import { num, parseTime, timeInput } from '../format'
import { ExercisePicker } from './ExercisePicker'
import { Icon } from './Icon'

interface Props {
  block: Block
  index: number
  count: number
  onChange: (b: Block) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
}

export function BlockEditor({ block, index, count, onChange, onRemove, onMove }: Props) {
  const store = useStore()
  const [picking, setPicking] = useState(false)
  const ex = exerciseById(store, block.exerciseId)
  const set = <K extends keyof Block>(k: K, v: Block[K]) => onChange({ ...block, [k]: v })
  const cardio = isCardio(ex)
  const mode = cardio ? cardioMode(block) : null

  return (
    <div className="card stack-sm">
      <div className="spread">
        <div className="row grow">
          <span className="block-idx">{index + 1}</span>
          <b className="grow">{ex.name}</b>
        </div>
        <div className="row" style={{ gap: 0 }}>
          <button className="icon-btn" disabled={index === 0} onClick={() => onMove(-1)} aria-label="Move up">
            <Icon name="up" size={18} />
          </button>
          <button className="icon-btn" disabled={index === count - 1} onClick={() => onMove(1)} aria-label="Move down">
            <Icon name="down" size={18} />
          </button>
          <button className="icon-btn" onClick={onRemove} aria-label="Remove">
            <Icon name="trash" size={18} />
          </button>
        </div>
      </div>
      <button className="btn small" onClick={() => setPicking(true)}><Icon name="swap" size={16} /> Swap exercise</button>
      {cardio && <CardioModeSwitch block={block} onChange={onChange} />}
      <div className="num-grid">
        <label className="field">Sets<input type="number" inputMode="numeric" min={1} value={block.sets} onChange={(e) => set('sets', Math.max(1, num(e.target.value) ?? 1))} /></label>
        <label className="field">Reps<input type="number" inputMode="numeric" value={block.reps ?? ''} onChange={(e) => set('reps', num(e.target.value))} /></label>
        <label className="field">Weight kg<input type="number" inputMode="decimal" step="0.5" value={block.weightKg ?? ''} onChange={(e) => set('weightKg', num(e.target.value))} /></label>
        {mode === 'calories' && (
          <label className="field">Calories<input type="number" inputMode="numeric" value={block.calories ?? ''} onChange={(e) => set('calories', num(e.target.value))} /></label>
        )}
        {(mode === null || mode === 'distance') && (
          <label className="field">Distance m<input type="number" inputMode="numeric" value={block.distanceM ?? ''} onChange={(e) => set('distanceM', num(e.target.value))} /></label>
        )}
        {(mode === null || mode === 'time') && (
          <label className="field">Time m:ss<input key={`t-${block.durationSec ?? ''}`} inputMode="numeric" defaultValue={timeInput(block.durationSec)} onBlur={(e) => set('durationSec', parseTime(e.target.value))} placeholder="e.g. 20 or 1:30" /></label>
        )}
        <label className="field">Rest s<input type="number" inputMode="numeric" value={block.restSec ?? ''} onChange={(e) => set('restSec', num(e.target.value))} /></label>
        <label className="field">Effort 1-10<input type="number" inputMode="numeric" min={1} max={10} value={block.targetRpe ?? ''} onChange={(e) => set('targetRpe', num(e.target.value))} /></label>
      </div>
      <label className="field">Notes<input value={block.notes ?? ''} onChange={(e) => set('notes', e.target.value || undefined)} /></label>
      {picking && (
        <ExercisePicker
          current={block.exerciseId}
          onClose={() => setPicking(false)}
          onPick={(e) => {
            set('exerciseId', e.id)
            setPicking(false)
          }}
        />
      )}
    </div>
  )
}

export type CardioMode = 'distance' | 'calories' | 'time'

/** How a cardio block is measured: calories, distance, or a target time. */
export function cardioMode(b: Block): CardioMode {
  if (b.calories !== undefined) return 'calories'
  if (b.distanceM !== undefined) return 'distance'
  if (b.durationSec !== undefined) return 'time'
  return 'distance'
}

// Rough conversions so switching keeps a sensible target, which can then be edited.
const M_PER_CAL = 15 // rower, SkiErg or run
const M_PER_MIN = 225 // steady pace

function metresOf(b: Block): number | undefined {
  if (b.distanceM !== undefined) return b.distanceM
  if (b.calories !== undefined) return b.calories * M_PER_CAL
  if (b.durationSec !== undefined) return (b.durationSec / 60) * M_PER_MIN
  return undefined
}

/** Switch a cardio block to a different measure, converting the target. */
export function toMode(b: Block, mode: CardioMode): Block {
  if (cardioMode(b) === mode) return b
  const m = metresOf(b)
  const { distanceM: _d, calories: _c, durationSec: _t, ...rest } = b
  if (mode === 'calories') return { ...rest, calories: m ? Math.max(1, Math.round(m / M_PER_CAL)) : 15 }
  if (mode === 'distance') return { ...rest, distanceM: m ? Math.max(50, Math.round(m / 50) * 50) : 250 }
  return { ...rest, durationSec: m ? Math.max(30, Math.round(((m / M_PER_MIN) * 60) / 15) * 15) : 60 }
}

/** Distance / Calories / Time switch for cardio blocks. */
export function CardioModeSwitch({ block, onChange, distanceLabel = 'Distance' }: { block: Block; onChange: (b: Block) => void; distanceLabel?: string }) {
  const mode = cardioMode(block)
  const opts: [CardioMode, string][] = [['distance', distanceLabel], ['calories', 'Calories'], ['time', 'Time']]
  return (
    <div className="seg" role="radiogroup" aria-label="Measure by" style={{ alignSelf: 'flex-start' }}>
      {opts.map(([m, label]) => (
        <button key={m} role="radio" aria-checked={mode === m} className={mode === m ? 'on' : ''} onClick={() => onChange(toMode(block, m))}>{label}</button>
      ))}
    </div>
  )
}
