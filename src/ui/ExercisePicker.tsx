import { useMemo, useState } from 'react'
import { exerciseById, getExercises, useStore } from '../data/model'
import type { Exercise, ExerciseCategory } from '../domain/types'
import { Sheet } from './Sheet'

const CATS: (ExerciseCategory | 'all')[] = ['all', 'station', 'run', 'erg', 'strength', 'conditioning', 'hiit', 'mobility']

/** Pick an exercise. When swapping, the current exercise's alternatives come first. */
export function ExercisePicker({ current, onPick, onClose }: { current?: string; onPick: (e: Exercise) => void; onClose: () => void }) {
  const store = useStore()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<ExerciseCategory | 'all'>('all')
  const [adaptiveOnly, setAdaptiveOnly] = useState(false)
  const all = getExercises(store)
  const cur = current ? exerciseById(store, current) : undefined
  const alts = (cur?.alternatives ?? []).map((id) => exerciseById(store, id))
  const sameStation = cur?.station ? all.filter((e) => e.station === cur.station && e.id !== cur.id && !cur.alternatives?.includes(e.id)) : []

  const filtered = useMemo(
    () => all.filter((e) => (cat === 'all' || e.category === cat) && (!adaptiveOnly || e.adaptiveFriendly) && e.name.toLowerCase().includes(q.toLowerCase())),
    [all, cat, q, adaptiveOnly],
  )

  const Item = ({ e }: { e: Exercise }) => (
    <button className="card tap" onClick={() => onPick(e)}>
      <div className="spread">
        <b>{e.name}</b>
        {e.adaptiveFriendly && <span className="chip good">Adaptive</span>}
      </div>
      {e.notes && <p className="small muted">{e.notes}</p>}
    </button>
  )

  return (
    <Sheet title={cur ? `Swap ${cur.name}` : 'Add exercise'} onClose={onClose}>
      {(alts.length > 0 || sameStation.length > 0) && !q && (
        <div className="stack-sm">
          <span className="small muted">Suggested swaps</span>
          {[...alts, ...sameStation].map((e) => <Item key={e.id} e={e} />)}
        </div>
      )}
      <input placeholder="Search exercises" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="toggle-group">
        {CATS.map((c) => (
          <button key={c} className={`toggle ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c === 'hiit' ? 'HIIT' : c[0].toUpperCase() + c.slice(1)}</button>
        ))}
        <button className={`toggle ${adaptiveOnly ? 'on' : ''}`} onClick={() => setAdaptiveOnly(!adaptiveOnly)}>Adaptive-friendly</button>
      </div>
      <div className="stack-sm">
        {filtered.map((e) => <Item key={e.id} e={e} />)}
        {filtered.length === 0 && <p className="small muted">No matches. Add your own in the Exercises tab.</p>}
      </div>
    </Sheet>
  )
}
