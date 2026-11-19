import { Icon } from './Icon'
import { useState } from 'react'
import { getExercises, newId, useStore } from '../data/model'
import { EXERCISE_BY_ID } from '../domain/exercises'
import { STATION_NAMES, STATION_ORDER } from '../domain/standards'
import type { Exercise, ExerciseCategory, StationId } from '../domain/types'
import { Sheet } from './Sheet'

const CATS: ExerciseCategory[] = ['station', 'run', 'erg', 'strength', 'conditioning', 'hiit', 'mobility']

export function ExercisesScreen() {
  const store = useStore()
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Exercise | null>(null)
  const all = getExercises(store).filter((e) => e.name.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="stack">
      <div className="spread">
        <div className="stack-sm"><h1>Exercises</h1><span className="small muted">Your library. Tap one to edit it or add your own.</span></div>
        <button className="btn small primary" onClick={() => setEditing({ id: newId('ex'), name: '', category: 'strength', measure: 'reps', adaptiveFriendly: true })}><Icon name="plus" size={16} /> New</button>
      </div>
      <input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
      {all.map((e) => (
        <button key={e.id} className="card tap" onClick={() => setEditing(e)}>
          <div className="spread">
            <b>{e.name}</b>
            <div className="row">
              {e.station && <span className="chip">{STATION_NAMES[e.station]}</span>}
              {e.adaptiveFriendly && <span className="chip good">Adaptive</span>}
            </div>
          </div>
          {e.notes && <p className="small muted">{e.notes}</p>}
        </button>
      ))}
      {editing && <ExerciseForm ex={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function ExerciseForm({ ex, onClose }: { ex: Exercise; onClose: () => void }) {
  const store = useStore()
  const [e, setE] = useState(ex)
  const builtIn = !!EXERCISE_BY_ID[ex.id]
  const custom = !!store.get('exercise', ex.id)
  const set = <K extends keyof Exercise>(k: K, v: Exercise[K]) => setE((x) => ({ ...x, [k]: v }))
  return (
    <Sheet title={ex.name ? 'Edit exercise' : 'New exercise'} onClose={onClose}>
      <label className="field">Name<input value={e.name} onChange={(x) => set('name', x.target.value)} /></label>
      <div className="num-grid">
        <label className="field">Type
          <select value={e.category} onChange={(x) => set('category', x.target.value as ExerciseCategory)}>
            {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="field">Measured in
          <select value={e.measure} onChange={(x) => set('measure', x.target.value as Exercise['measure'])}>
            <option value="reps">Reps</option><option value="distance">Distance</option><option value="time">Time</option><option value="calories">Calories</option>
          </select>
        </label>
      </div>
      <label className="field">Trains station
        <select value={e.station ?? ''} onChange={(x) => set('station', (x.target.value || undefined) as StationId | undefined)}>
          <option value="">None</option>
          {STATION_ORDER.map((s) => <option key={s} value={s}>{STATION_NAMES[s]}</option>)}
        </select>
      </label>
      <label className="field">Coaching notes<textarea value={e.notes ?? ''} onChange={(x) => set('notes', x.target.value || undefined)} /></label>
      <label className="row small"><input type="checkbox" checked={!!e.adaptiveFriendly} onChange={(x) => set('adaptiveFriendly', x.target.checked)} /> Adaptive-friendly</label>
      <button className="btn primary block" disabled={!e.name.trim()} onClick={() => { store.put('exercise', e.id, e); onClose() }}>Save</button>
      {custom && (
        <button className="btn ghost danger" onClick={() => { store.removeMany([{ kind: 'exercise', id: e.id }]); onClose() }}>
          {builtIn ? 'Reset to default' : 'Delete exercise'}
        </button>
      )}
    </Sheet>
  )
}
