import { useState } from 'react'
import { deleteSession, exerciseById, getAthletes, getLog, getSessions, newId, saveLog, saveSession, today, useAthlete, useStore, type SessionLog, type SetLog } from '../data/model'
import { resolveBlock } from '../domain/multiAthlete'
import { OVERRIDE_FIELDS, type Block, type BlockOverride, type Session, type SessionType } from '../domain/types'
import { blockSummary, fmtDate, fmtDuration, num, parseTime, SESSION_TYPES, timeInput } from '../format'
import { BlockEditor } from './BlockEditor'
import { ExercisePicker } from './ExercisePicker'
import { Icon, TypeTile } from './Icon'

type Mode = 'view' | 'edit' | 'log'

export function SessionScreen({ id, onBack }: { id: string; onBack: () => void }) {
  const store = useStore()
  const session = getSessions(store).find((s) => s.id === id)
  const [mode, setMode] = useState<Mode>('view')
  const { athleteId } = useAthlete()
  if (!session) {
    return (
      <div className="stack">
        <button className="back" onClick={onBack}><Icon name="chevronLeft" size={18} /> Back</button>
        <p className="muted">This session was deleted.</p>
      </div>
    )
  }
  const log = getLog(store, session.id, athleteId)

  return (
    <div className="stack">
      <div className="spread">
        <button className="back" onClick={mode === 'view' ? onBack : () => setMode('view')}><Icon name="chevronLeft" size={18} /> {mode === 'view' ? 'Back' : 'Cancel'}</button>
        <span className="small muted" style={{ fontWeight: 600 }}>{fmtDate(session.date, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
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
  const { athleteId } = useAthlete()
  const others = getAthletes(store).filter((a) => a.id !== athleteId)
  const [moving, setMoving] = useState(false)
  const t = SESSION_TYPES[session.type]
  return (
    <>
      <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
        <TypeTile type={session.type} size={52} />
        <div className="stack-sm grow" style={{ gap: 4 }}>
          <h1>{session.title}</h1>
          <div className="small muted" style={{ fontWeight: 600 }}>{session.title !== t.name ? `${t.name} · ` : ''}about {session.minutes} min · {session.blocks.length} exercises</div>
        </div>
      </div>
      {session.focus && <p className="muted">{session.focus}</p>}
      {session.type === 'amrap' && (
        <div className="notice row" style={{ gap: 10 }}>
          <span style={{ flexShrink: 0, display: 'inline-grid' }}><Icon name="timer" size={22} /></span>
          <span><b>{session.capMin ?? '?'}-minute AMRAP.</b> Repeat the exercises below in order, as many rounds as you can before time runs out.</span>
        </div>
      )}

      {log && (
        <div className="card stack-sm" style={{ borderLeft: `4px solid ${log.status === 'skipped' ? 'var(--muted)' : 'var(--good)'}` }}>
          <div className="spread">
            <b className="row" style={{ gap: 6 }}>{log.status !== 'skipped' && <span className={`status ${log.status}`}><Icon name="check" size={14} strokeWidth={3} /></span>}{log.status === 'done' ? 'Completed' : log.status === 'partial' ? 'Partly done' : 'Skipped'}</b>
            {log.rpe && <span className="chip">Effort {log.rpe}/10</span>}
          </div>
          {session.type === 'amrap' && log.rounds !== undefined && (
            <p style={{ fontWeight: 800, fontSize: '1.25rem' }}>Score: {log.rounds} rounds{log.extraReps ? ` + ${log.extraReps} reps` : ''}</p>
          )}
          {log.notes && <p className="small">{log.notes}</p>}
        </div>
      )}

      <div className="card">
        {session.blocks.map((raw, i) => {
          const b = resolveBlock(raw, athleteId)
          const ex = exerciseById(store, b.exerciseId)
          const otherVersions = others
            .map((a) => ({ a, ob: resolveBlock(raw, a.id) }))
            .filter(({ ob }) => ob.exerciseId !== b.exerciseId || blockSummary(ob) !== blockSummary(b))
          const logged = log?.blocks[b.id]?.filter((s) => s.done)
          return (
            <div key={b.id} className="block-row">
              <span className="block-idx">{i + 1}</span>
              <div className="grow stack-sm" style={{ gap: 2 }}>
                <div className="spread" style={{ alignItems: 'flex-start' }}>
                  <b>{ex.name}</b>
                  <span className="block-amount">{blockSummary(b)}</span>
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
                {otherVersions.map(({ a, ob }) => (
                  <span key={a.id} className="other-version">{a.name}: {ob.exerciseId !== b.exerciseId ? `${exerciseById(store, ob.exerciseId).name}, ` : ''}{blockSummary(ob)}</span>
                ))}
                 {logged && logged.length > 0 && <span className="tiny" style={{ color: 'var(--good)', fontWeight: 600 }}>✓ Logged: {logged.map((s) => blockSummary({ sets: 1, ...s })).join(', ')}</span>}
              </div>
            </div>
          )
        })}
        {session.blocks.length === 0 && <p className="muted small">No exercises yet. Tap Edit to add some.</p>}
      </div>

      <button className="btn primary block" onClick={onLog}><Icon name={log ? 'edit' : 'check'} size={18} /> {log ? 'Edit log' : 'Log this workout'}</button>
      <div className="row">
        <button className="btn grow" onClick={onEdit}><Icon name="edit" size={18} /> Edit workout</button>
        <button className="btn grow" onClick={() => setMoving(!moving)}><Icon name="calendar" size={18} /> Move</button>
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
        <button className="btn ghost danger" onClick={() => saveLog(store, { sessionId: session.id, athleteId, status: 'skipped', blocks: {}, completedAt: new Date().toISOString() })}>
          Mark as skipped
        </button>
      )}
    </>
  )
}

function SessionEdit({ session, onDone, onDelete }: { session: Session; onDone: () => void; onDelete: () => void }) {
  const store = useStore()
  const athletes = getAthletes(store)
  const [draft, setDraft] = useState<Session>(session)
  const [adding, setAdding] = useState(false)
  const [scope, setScope] = useState<string>('all')
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
          {Object.entries(SESSION_TYPES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
        </select>
      </label>
      {draft.type === 'amrap' && (
        <label className="field">
          AMRAP time cap (minutes)
          <input type="number" inputMode="numeric" min={1} value={draft.capMin ?? ''} placeholder="e.g. 20" onChange={(e) => set('capMin', num(e.target.value))} />
          <span className="tiny">Each exercise below is one round's worth. Set sets to 1.</span>
        </label>
      )}
      <label className="field">Focus<textarea value={draft.focus} onChange={(e) => set('focus', e.target.value)} style={{ minHeight: 60 }} /></label>

      <h2>Exercises</h2>
      {athletes.length > 1 && (
        <div className="stack-sm">
          <span className="small muted">Exercise changes apply to</span>
          <div className="toggle-group">
            <button className={`toggle ${scope === 'all' ? 'on' : ''}`} onClick={() => setScope('all')}>Everyone</button>
            {athletes.map((a) => (
              <button key={a.id} className={`toggle ${scope === a.id ? 'on' : ''}`} onClick={() => setScope(a.id)}>{a.name} only</button>
            ))}
          </div>
          <span className="tiny muted">{scope === 'all' ? 'Changing a value here sets it for everyone.' : 'Only this person\'s version changes. Everyone else keeps theirs.'}</span>
        </div>
      )}
      {draft.blocks.map((b, i) => (
        <BlockEditor
          key={`${b.id}-${scope}`}
          block={scope === 'all' ? b : resolveBlock(b, scope)}
          index={i}
          count={draft.blocks.length}
          onChange={(nb) => setBlocks(draft.blocks.map((x) => (x.id === b.id ? applyEdit(x, nb, scope) : x)))}
          onRemove={() => setBlocks(draft.blocks.filter((x) => x.id !== b.id))}
          onMove={(dir) => {
            const arr = [...draft.blocks]
            const j = i + dir
            ;[arr[i], arr[j]] = [arr[j], arr[i]]
            setBlocks(arr)
          }}
        />
      ))}
      <button className="btn block" onClick={() => setAdding(true)}><Icon name="plus" size={18} /> Add exercise</button>
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

/** The athlete's most recent earlier AMRAP score, as text. */
function previousAmrap(store: ReturnType<typeof useStore>, session: Session, athleteId: string): string | null {
  const prev = getSessions(store)
    .filter((s) => s.type === 'amrap' && s.id !== session.id && s.date <= session.date)
    .map((s) => ({ s, l: getLog(store, s.id, athleteId) }))
    .filter((x) => x.l?.rounds !== undefined)
    .at(-1)
  if (!prev) return null
  return `${prev.l!.rounds} rounds${prev.l!.extraReps ? ` + ${prev.l!.extraReps} reps` : ''} (${prev.s.capMin} min, ${fmtDate(prev.s.date, { day: 'numeric', month: 'short' })})`
}

/** Apply an edited block either to everyone or as one athlete's override. */
function applyEdit(orig: Block, edited: Block, scope: string): Block {
  if (scope === 'all') {
    const changed = OVERRIDE_FIELDS.filter((f) => orig[f] !== edited[f])
    if (!orig.athletes || !changed.length) return { ...edited, athletes: orig.athletes }
    // A change for everyone replaces any personal value for that field.
    const athletes: Record<string, BlockOverride> = {}
    for (const [id, o] of Object.entries(orig.athletes)) {
      const copy: Record<string, unknown> = { ...o }
      for (const f of changed) delete copy[f]
      if (Object.keys(copy).length) athletes[id] = copy as BlockOverride
    }
    return { ...edited, athletes: Object.keys(athletes).length ? athletes : undefined }
  }
  const diff: Record<string, unknown> = {}
  for (const f of OVERRIDE_FIELDS) if (orig[f] !== edited[f]) diff[f] = edited[f]
  const athletes = { ...(orig.athletes ?? {}) }
  if (Object.keys(diff).length) athletes[scope] = diff as BlockOverride
  else delete athletes[scope]
  return { ...orig, athletes: Object.keys(athletes).length ? athletes : undefined }
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

function SessionLogForm({ session: rawSession, existing, onDone }: { session: Session; existing?: SessionLog; onDone: () => void }) {
  const store = useStore()
  const { athleteId } = useAthlete()
  const athlete = getAthletes(store).find((a) => a.id === athleteId)
  const session = { ...rawSession, blocks: rawSession.blocks.map((b) => resolveBlock(b, athleteId)) }
  const [blocks, setBlocks] = useState<Record<string, SetLog[]>>(() =>
    Object.fromEntries(session.blocks.map((b) => [b.id, initialSets(b, existing?.blocks[b.id])])),
  )
  const [rpe, setRpe] = useState<number | undefined>(existing?.rpe)
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const isAmrap = session.type === 'amrap'
  const [rounds, setRounds] = useState<number | undefined>(existing?.rounds)
  const [extraReps, setExtraReps] = useState<number | undefined>(existing?.extraReps)

  const update = (bid: string, i: number, patch: Partial<SetLog>) =>
    setBlocks((all) => ({ ...all, [bid]: all[bid].map((s, j) => (j === i ? { ...s, ...patch } : s)) }))

  const allSets = Object.values(blocks).flat()
  const doneCount = allSets.filter((s) => s.done).length

  const save = () => {
    const status = isAmrap
      ? (rounds || extraReps ? 'done' : doneCount ? 'partial' : 'skipped')
      : doneCount === 0 ? 'skipped' : doneCount === allSets.length ? 'done' : 'partial'
    saveLog(store, {
      sessionId: session.id, athleteId, status, rpe, notes: notes || undefined, blocks, completedAt: new Date().toISOString(),
      ...(isAmrap ? { rounds, extraReps } : {}),
    })
    onDone()
  }

  return (
    <div className="stack">
      <div className="spread">
        <h1>Log workout{athlete && getAthletes(store).length > 1 ? `: ${athlete.name}` : ''}</h1>
        <button className="btn small" onClick={() => setBlocks((all) => Object.fromEntries(Object.entries(all).map(([k, v]) => [k, v.map((s) => ({ ...s, done: true }))])))}>
          <Icon name="check" size={16} /> Tick all
        </button>
      </div>
      <p className="small muted">{isAmrap ? 'Enter your score, and adjust any weights you used.' : 'Targets are filled in. Change anything that was different, then tick each set you did.'}</p>
      {isAmrap && (
        <div className="card stack-sm" style={{ borderColor: 'var(--accent)' }}>
          <div className="row"><Icon name="timer" size={20} /><b>{session.capMin ?? '?'}-minute AMRAP score</b></div>
          <div className="num-grid">
            <label className="field">Full rounds<input type="number" inputMode="numeric" min={0} value={rounds ?? ''} onChange={(e) => setRounds(num(e.target.value))} /></label>
            <label className="field">Extra reps<input type="number" inputMode="numeric" min={0} value={extraReps ?? ''} onChange={(e) => setExtraReps(num(e.target.value))} /></label>
          </div>
          {previousAmrap(store, rawSession, athleteId) && <span className="small muted">Last AMRAP: {previousAmrap(store, rawSession, athleteId)}</span>}
        </div>
      )}

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
              <span className="center">Done</span>
            </div>
            {sets.map((s, i) => (
              <div key={i} className={`set-row ${s.done ? 'done' : ''}`} style={{ ['--cols' as string]: cols.length }}>
                <span className="small muted center">{i + 1}</span>
                {cols.map((c) =>
                  c === 'durationSec' ? (
                    <input key={c} inputMode="numeric" placeholder="m:ss" defaultValue={timeInput(s.durationSec)} onBlur={(e) => update(b.id, i, { durationSec: parseTime(e.target.value) })} />
                  ) : (
                    <input key={c} type="number" inputMode="decimal" value={s[c] ?? ''} onChange={(e) => update(b.id, i, { [c]: num(e.target.value) })} />
                  ),
                )}
                <button type="button" className={`set-check ${s.done ? 'on' : ''}`} onClick={() => update(b.id, i, { done: !s.done })} aria-pressed={s.done} aria-label={`Set ${i + 1} done`}>
                  <Icon name="check" size={18} strokeWidth={3} />
                </button>
              </div>
            ))}
            <div className="row">
              <button className="btn small ghost" onClick={() => setBlocks((all) => ({ ...all, [b.id]: [...all[b.id], { ...(all[b.id].at(-1) ?? { done: false }), done: false }] }))}><Icon name="plus" size={16} /> Set</button>
              {sets.length > 1 && <button className="btn small ghost" onClick={() => setBlocks((all) => ({ ...all, [b.id]: all[b.id].slice(0, -1) }))}>Remove set</button>}
            </div>
          </div>
        )
      })}

      <div className="stack-sm">
        <span className="small muted">How hard was it overall? (1 easy, 10 flat out)</span>
        <div className="rpe-grid">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button key={n} className={`toggle ${rpe === n ? 'on' : ''}`} onClick={() => setRpe(n)}>{n}</button>
          ))}
        </div>
        <div className="spread tiny muted"><span>Easy</span><span>Flat out</span></div>
      </div>
      <label className="field">Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did it feel? Any pain or issues?" /></label>
      <button className="btn primary block" onClick={save}>{isAmrap ? 'Save score' : `Save log (${doneCount}/${allSets.length} sets)`}</button>
    </div>
  )
}
