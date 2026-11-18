import { useState } from 'react'
import { deleteSession, exerciseById, getLog, getSessions, newId, saveLog, saveSession, today, useStore, type SessionLog, type SetLog } from '../data/model'
import type { Block, Session, SessionType } from '../domain/types'
import { blockSummary, fmtDate, fmtDuration, num, parseTime, SESSION_TYPES, timeInput } from '../format'
import { BlockEditor } from './BlockEditor'
import { ExercisePicker } from './ExercisePicker'

type Mode = 'view' | 'edit' | 'log'

export function SessionScreen({ id, onBack }: { id: string; onBack: () => void }) {
  const store = useStore()
  const session = getSessions(store).find((s) => s.id === id)
  const [mode, setMode] = useState<Mode>('view')
  if (!session) {
    return (
      <div className="stack">
        <button className="btn ghost" onClick={onBack}>‹ Back</button>
        <p className="muted">This session was deleted.</p>
      </div>
    )
  }
  const log = getLog(store, session.id)

  return (
    <div className="stack">
      <div className="spread">
        <button className="btn ghost small" onClick={mode === 'view' ? onBack : () => setMode('view')}>‹ {mode === 'view' ? 'Back' : 'Cancel'}</button>
        <span className="small muted">{fmtDate(session.date, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
      </div>
      {mode === 'view' && <SessionView session={session} log={log} onEdit={() => setMode('edit')} onLog={() => setMode('log')} />}
      {mode === 'edit' && (
        <SessionEdit
          session={session}
          onDone={() => setMode('view')}
          onDelete={() => {
            deleteSession(store, session.id)
            onBack()
          }}
        />
      )}
      {mode === 'log' && <SessionLogForm session={session} existing={log} onDone={() => setMode('view')} />}
    </div>
  )
}

function SessionView({ session, log, onEdit, onLog }: { session: Session; log?: SessionLog; onEdit: () => void; onLog: () => void }) {
  const store = useStore()
  const [moving, setMoving] = useState(false)
  const t = SESSION_TYPES[session.type]
  return (
    <>
      <div className="stack-sm">
        <span className="chip">{t.icon} {t.name}</span>
        <h1>{session.title}</h1>
        <p className="muted">{session.focus}</p>
        <p className="small muted">About {session.minutes} min</p>
      </div>

      {log && (
        <div className={`card ${log.status === 'skipped' ? 'skipped' : 'done'} stack-sm`}>
          <div className="spread">
            <b>{log.status === 'done' ? '✓ Completed' : log.status === 'partial' ? '◐ Partly done' : 'Skipped'}</b>
            {log.rpe && <span className="chip">Effort {log.rpe}/10</span>}
          </div>
          {log.notes && <p className="small">{log.notes}</p>}
        </div>
      )}

      <div className="card">
        {session.blocks.map((b, i) => {
          const ex = exerciseById(store, b.exerciseId)
          const logged = log?.blocks[b.id]?.filter((s) => s.done)
          return (
            <div key={b.id} className="block-row">
              <span className="block-idx">{i + 1}</span>
              <div className="grow stack-sm" style={{ gap: 2 }}>
                <div className="spread">
                  <b>{ex.name}</b>
                  <span className="small">{blockSummary(b)}</span>
                </div>
                {(b.restSec || b.targetRpe) && (
                  <span className="tiny muted">
                    {b.restSec ? `Rest ${fmtDuration(b.restSec)}` : ''}
                    {b.restSec && b.targetRpe ? ' · ' : ''}
                    {b.targetRpe ? `Effort ${b.targetRpe}/10` : ''}
                  </span>
                )}
                {b.notes && <span className="small">{b.notes}</span>}
                {ex.notes && <span className="tiny muted">{ex.notes}</span>}
                {logged && logged.length > 0 && <span className="tiny" style={{ color: 'var(--good)' }}>Logged: {logged.map((s) => blockSummary({ sets: 1, ...s })).join(', ')}</span>}
              </div>
            </div>
          )
        })}
        {session.blocks.length === 0 && <p className="muted small">No exercises yet. Tap Edit to add some.</p>}
      </div>

      <button className="btn primary block" onClick={onLog}>{log ? 'Edit log' : 'Log this workout'}</button>
      <div className="row">
        <button className="btn grow" onClick={onEdit}>✎ Edit workout</button>
        <button className="btn grow" onClick={() => setMoving(!moving)}>📅 Move</button>
      </div>
      {moving && (
        <div className="card stack-sm">
          <label className="field">
            Move to
            <input type="date" defaultValue={session.date} onChange={(e) => e.target.value && saveSession(store, { ...session, date: e.target.value })} />
          </label>
          <div className="row-wrap">
            <button className="btn small" onClick={() => saveSession(store, { ...session, date: today() })}>Today</button>
            <button className="btn small" onClick={() => {
              const d = new Date(Date.now() + 86_400_000 - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
              saveSession(store, { ...session, date: d })
            }}>Tomorrow</button>
          </div>
        </div>
      )}
      {!log && (
        <button className="btn ghost danger" onClick={() => saveLog(store, { sessionId: session.id, status: 'skipped', blocks: {}, completedAt: new Date().toISOString() })}>
          Mark as skipped
        </button>
      )}
    </>
  )
}

function SessionEdit({ session, onDone, onDelete }: { session: Session; onDone: () => void; onDelete: () => void }) {
  const store = useStore()
  const [draft, setDraft] = useState<Session>(session)
  const [adding, setAdding] = useState(false)
  const set = <K extends keyof Session>(k: K, v: Session[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const setBlocks = (blocks: Block[]) => set('blocks', blocks)

  return (
    <div className="stack">
      <label className="field">Title<input value={draft.title} onChange={(e) => set('title', e.target.value)} /></label>
      <div className="num-grid">
        <label className="field">Date<input type="date" value={draft.date} onChange={(e) => set('date', e.target.value)} /></label>
        <label className="field">Minutes<input type="number" inputMode="numeric" value={draft.minutes} onChange={(e) => set('minutes', num(e.target.value) ?? 0)} /></label>
      </div>
      <label className="field">
        Workout type
        <select value={draft.type} onChange={(e) => set('type', e.target.value as SessionType)}>
          {Object.entries(SESSION_TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.name}</option>)}
        </select>
      </label>
      <label className="field">Focus<textarea value={draft.focus} onChange={(e) => set('focus', e.target.value)} style={{ minHeight: 60 }} /></label>

      <h2>Exercises</h2>
      {draft.blocks.map((b, i) => (
        <BlockEditor
          key={b.id}
          block={b}
          index={i}
          count={draft.blocks.length}
          onChange={(nb) => setBlocks(draft.blocks.map((x) => (x.id === b.id ? nb : x)))}
          onRemove={() => setBlocks(draft.blocks.filter((x) => x.id !== b.id))}
          onMove={(dir) => {
            const arr = [...draft.blocks]
            const j = i + dir
            ;[arr[i], arr[j]] = [arr[j], arr[i]]
            setBlocks(arr)
          }}
        />
      ))}
      <button className="btn block" onClick={() => setAdding(true)}>＋ Add exercise</button>
      {adding && (
        <ExercisePicker
          onClose={() => setAdding(false)}
          onPick={(e) => {
            const b: Block = { id: newId('b'), exerciseId: e.id, sets: 3 }
            if (e.measure === 'reps') b.reps = 10
            if (e.measure === 'distance') b.distanceM = 250
            if (e.measure === 'time') b.durationSec = 300
            setBlocks([...draft.blocks, b])
            setAdding(false)
          }}
        />
      )}

      <button className="btn primary block" onClick={() => { saveSession(store, draft); onDone() }}>Save changes</button>
      <button className="btn ghost danger" onClick={() => { if (window.confirm('Delete this session?')) onDelete() }}>Delete session</button>
    </div>
  )
}

function initialSets(b: Block, existing?: SetLog[]): SetLog[] {
  if (existing?.length) return existing
  return Array.from({ length: b.sets }, () => ({ reps: b.reps, weightKg: b.weightKg, distanceM: b.distanceM, durationSec: b.durationSec, done: false }))
}

type Col = 'reps' | 'weightKg' | 'distanceM' | 'durationSec'
const COL_LABEL: Record<Col, string> = { reps: 'Reps', weightKg: 'kg', distanceM: 'm', durationSec: 'Time' }

function columnsFor(b: Block): Col[] {
  const cols: Col[] = []
  if (b.reps !== undefined) cols.push('reps')
  if (b.distanceM !== undefined) cols.push('distanceM')
  if (b.weightKg !== undefined) cols.push('weightKg')
  // Always allow a time for distance work so pace can be tracked.
  if (b.durationSec !== undefined || b.distanceM !== undefined) cols.push('durationSec')
  return cols.length ? cols : ['reps']
}

function SessionLogForm({ session, existing, onDone }: { session: Session; existing?: SessionLog; onDone: () => void }) {
  const store = useStore()
  const [blocks, setBlocks] = useState<Record<string, SetLog[]>>(() =>
    Object.fromEntries(session.blocks.map((b) => [b.id, initialSets(b, existing?.blocks[b.id])])),
  )
  const [rpe, setRpe] = useState<number | undefined>(existing?.rpe)
  const [notes, setNotes] = useState(existing?.notes ?? '')

  const update = (bid: string, i: number, patch: Partial<SetLog>) =>
    setBlocks((all) => ({ ...all, [bid]: all[bid].map((s, j) => (j === i ? { ...s, ...patch } : s)) }))

  const allSets = Object.values(blocks).flat()
  const doneCount = allSets.filter((s) => s.done).length

  const save = () => {
    const status = doneCount === 0 ? 'skipped' : doneCount === allSets.length ? 'done' : 'partial'
    saveLog(store, { sessionId: session.id, status, rpe, notes: notes || undefined, blocks, completedAt: new Date().toISOString() })
    onDone()
  }

  return (
    <div className="stack">
      <div className="spread">
        <h1>Log workout</h1>
        <button className="btn small" onClick={() => setBlocks((all) => Object.fromEntries(Object.entries(all).map(([k, v]) => [k, v.map((s) => ({ ...s, done: true }))])))}>
          Tick all
        </button>
      </div>
      <p className="small muted">Targets are filled in. Change anything that was different, then tick each set you did.</p>

      {session.blocks.map((b) => {
        const ex = exerciseById(store, b.exerciseId)
        const cols = columnsFor(b)
        const sets = blocks[b.id]
        return (
          <div key={b.id} className="card stack-sm">
            <div className="spread">
              <b>{ex.name}</b>
              <span className="small muted">{blockSummary(b)}</span>
            </div>
            <div className="set-row tiny muted" style={{ ['--cols' as string]: cols.length }}>
              <span>Set</span>
              {cols.map((c) => <span key={c} className="center">{COL_LABEL[c]}</span>)}
              <span>✓</span>
            </div>
            {sets.map((s, i) => (
              <div key={i} className="set-row" style={{ ['--cols' as string]: cols.length }}>
                <span className="small muted center">{i + 1}</span>
                {cols.map((c) =>
                  c === 'durationSec' ? (
                    <input key={c} inputMode="numeric" placeholder="m:ss" defaultValue={timeInput(s.durationSec)} onBlur={(e) => update(b.id, i, { durationSec: parseTime(e.target.value) })} />
                  ) : (
                    <input key={c} type="number" inputMode="decimal" value={s[c] ?? ''} onChange={(e) => update(b.id, i, { [c]: num(e.target.value) })} />
                  ),
                )}
                <input type="checkbox" checked={s.done} onChange={(e) => update(b.id, i, { done: e.target.checked })} aria-label={`Set ${i + 1} done`} />
              </div>
            ))}
            <div className="row">
              <button className="btn small ghost" onClick={() => setBlocks((all) => ({ ...all, [b.id]: [...all[b.id], { ...(all[b.id].at(-1) ?? { done: false }), done: false }] }))}>＋ Set</button>
              {sets.length > 1 && <button className="btn small ghost" onClick={() => setBlocks((all) => ({ ...all, [b.id]: all[b.id].slice(0, -1) }))}>－ Set</button>}
            </div>
          </div>
        )
      })}

      <div className="stack-sm">
        <span className="small muted">How hard was it overall? (1 easy, 10 flat out)</span>
        <div className="toggle-group">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button key={n} className={`toggle ${rpe === n ? 'on' : ''}`} onClick={() => setRpe(n)} style={{ minWidth: 40 }}>{n}</button>
          ))}
        </div>
      </div>
      <label className="field">Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did it feel? Any pain or issues?" /></label>
      <button className="btn primary block" onClick={save}>Save log ({doneCount}/{allSets.length} sets)</button>
    </div>
  )
}
