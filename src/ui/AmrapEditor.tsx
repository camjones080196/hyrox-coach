import { useState } from 'react'
import { exerciseById, getAthletes, newId, useStore } from '../data/model'
import { AMRAP_TEMPLATES, amrapParts, amrapWarmup, buildAmrapRound, type AmrapTemplate } from '../domain/amrap'
import { resolveBlock } from '../domain/multiAthlete'
import type { Block, Exercise, Session } from '../domain/types'
import { blockSummary, num, parseTime, timeInput } from '../format'
import { ExercisePicker } from './ExercisePicker'
import { Icon } from './Icon'

const CAPS = [8, 10, 12, 15, 20, 25, 30]

interface Props {
  draft: Session
  setDraft: (fn: (d: Session) => Session) => void
  scope: string
  applyEdit: (orig: Block, edited: Block, scope: string) => Block
}

type Field = 'reps' | 'distanceM' | 'durationSec'

function amountField(b: Block, ex: Exercise): Field {
  if (b.reps !== undefined) return 'reps'
  if (b.distanceM !== undefined) return 'distanceM'
  if (b.durationSec !== undefined) return 'durationSec'
  return ex.measure === 'distance' ? 'distanceM' : ex.measure === 'time' ? 'durationSec' : 'reps'
}

function defaultsFor(e: Exercise, section: Block['section']): Block {
  const b: Block = { id: newId('b'), exerciseId: e.id, sets: 1, restSec: 0, section }
  if (e.measure === 'reps') b.reps = 10
  if (e.measure === 'distance') b.distanceM = 200
  if (e.measure === 'time') b.durationSec = section === 'warmup' ? 300 : 60
  return b
}

export function AmrapEditor({ draft, setDraft, scope, applyEdit }: Props) {
  const store = useStore()
  const athletes = getAthletes(store)
  const [picking, setPicking] = useState<null | { section: 'warmup' | 'main'; swap?: string }>(null)
  const { warmup, round, cooldown } = amrapParts(draft.blocks)
  const cap = draft.capMin ?? 15
  const warmupMin = Math.round(warmup.reduce((t, b) => t + (b.durationSec ?? 300) * (b.sets || 1), 0) / 60)

  const setParts = (w: Block[], r: Block[]) => setDraft((d) => ({ ...d, blocks: [...w, ...r, ...cooldown] }))

  const setCap = (c: number | undefined) =>
    setDraft((d) => ({
      ...d,
      capMin: c,
      minutes: (c ?? 0) + warmupMin + 5,
      title: c && /^\d+-minute/.test(d.title) ? d.title.replace(/^\d+-minute/, `${c}-minute`) : d.title,
    }))

  const applyTemplate = (t: AmrapTemplate) => {
    if (round.length && !window.confirm(`Replace this round with "${t.name}"?`)) return
    const r = buildAmrapRound(t, athletes, newId('a'))
    setDraft((d) => ({
      ...d,
      capMin: t.capMin,
      title: `${t.capMin}-minute ${t.name.toLowerCase()} AMRAP`,
      focus: t.description,
      minutes: t.capMin + (warmup.length ? warmupMin : 8) + 5,
      blocks: [...(warmup.length ? warmup : [amrapWarmup(newId('w'))]), ...r, ...cooldown],
    }))
  }

  const updateIn = (list: Block[], which: 'warmup' | 'main', id: string, edited: Block | null) => {
    const next = edited === null ? list.filter((b) => b.id !== id) : list.map((b) => (b.id === id ? applyEdit(b, edited, scope) : b))
    if (which === 'warmup') setParts(next, round)
    else setParts(warmup, next)
  }
  const move = (list: Block[], which: 'warmup' | 'main', i: number, dir: -1 | 1) => {
    const arr = [...list]
    ;[arr[i], arr[i + dir]] = [arr[i + dir], arr[i]]
    if (which === 'warmup') setParts(arr, round)
    else setParts(warmup, arr)
  }

  const shown = (b: Block) => (scope === 'all' ? b : resolveBlock(b, scope))
  const summaryFor = (athleteId?: string) =>
    round.map((b) => { const r = resolveBlock(b, athleteId); return `${blockSummary({ ...r, sets: 1 })} ${exerciseById(store, r.exerciseId).name.toLowerCase()}` }).join(' · ')

  const rowProps = (b: Block, i: number, list: Block[], which: 'warmup' | 'main') => ({
    v: shown(b),
    index: i,
    count: list.length,
    onEdit: (patch: Partial<Block>) => updateIn(list, which, b.id, { ...shown(b), ...patch }),
    onSwap: () => setPicking({ section: which, swap: b.id }),
    onMove: (dir: -1 | 1) => move(list, which, i, dir),
    onRemove: () => updateIn(list, which, b.id, null),
  })

  return (
    <div className="stack">
      <div className="card stack-sm">
        <span className="eyebrow">Time cap</span>
        <div className="toggle-group">
          {CAPS.map((c) => (
            <button key={c} className={`toggle ${cap === c ? 'on' : ''}`} onClick={() => setCap(c)}>{c} min</button>
          ))}
          <input type="number" inputMode="numeric" min={1} aria-label="Custom time cap" style={{ width: 90, minHeight: 40 }} value={draft.capMin ?? ''} placeholder="Other" onChange={(e) => setCap(num(e.target.value))} />
        </div>
      </div>

      <div className="stack-sm">
        <span className="eyebrow">Start from a template</span>
        <div className="template-strip">
          {AMRAP_TEMPLATES.map((t) => (
            <button key={t.id} className="card tap template" onClick={() => applyTemplate(t)}>
              <b>{t.name}</b>
              <span className="tiny muted">{t.description}</span>
              <span className="chip" style={{ marginTop: 'auto' }}>{t.capMin} min</span>
            </button>
          ))}
        </div>
        <span className="tiny muted">Templates scale distances, reps, weights and exercise versions to each athlete's division and level.</span>
      </div>

      <div className="card stack-sm">
        <div className="spread"><span className="eyebrow">Warm-up</span><span className="tiny muted">before the clock starts</span></div>
        {warmup.map((b, i) => <AmrapRow key={`${b.id}-${scope}`} {...rowProps(b, i, warmup, 'warmup')} />)}
        <button className="btn small" onClick={() => setPicking({ section: 'warmup' })}><Icon name="plus" size={16} /> Add warm-up</button>
      </div>

      <div className="card stack-sm" style={{ borderColor: 'var(--accent)' }}>
        <div className="spread"><span className="eyebrow">Each round</span><span className="tiny muted">repeat for {cap} min</span></div>
        {round.map((b, i) => <AmrapRow key={`${b.id}-${scope}`} {...rowProps(b, i, round, 'main')} />)}
        {round.length === 0 && <p className="small muted">No movements yet. Pick a template above or add one.</p>}
        <button className="btn small" onClick={() => setPicking({ section: 'main' })}><Icon name="plus" size={16} /> Add movement</button>
      </div>

      {round.length > 0 && (
        <div className="notice stack-sm">
          <b>Per round</b>
          {athletes.length > 1
            ? athletes.map((a) => <span key={a.id} className="small"><b>{a.name}:</b> {summaryFor(a.id)}</span>)
            : <span className="small">{summaryFor(athletes[0]?.id)}</span>}
        </div>
      )}

      {picking && (
        <ExercisePicker
          current={picking.swap ? shown(draft.blocks.find((b) => b.id === picking.swap)!).exerciseId : undefined}
          onClose={() => setPicking(null)}
          onPick={(e) => {
            if (picking.swap) {
              const list = picking.section === 'warmup' ? warmup : round
              const orig = list.find((b) => b.id === picking.swap)!
              updateIn(list, picking.section, orig.id, { ...shown(orig), exerciseId: e.id })
            } else if (picking.section === 'warmup') {
              setParts([...warmup, defaultsFor(e, 'warmup')], round)
            } else {
              setParts(warmup, [...round, defaultsFor(e, 'main')])
            }
            setPicking(null)
          }}
        />
      )}
    </div>
  )
}

interface RowProps {
  v: Block
  index: number
  count: number
  onEdit: (patch: Partial<Block>) => void
  onSwap: () => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
}

function AmrapRow({ v, index, count, onEdit, onSwap, onMove, onRemove }: RowProps) {
  const store = useStore()
  const ex = exerciseById(store, v.exerciseId)
  const field = amountField(v, ex)
  const label = field === 'reps' ? 'Reps' : field === 'distanceM' ? 'Metres' : 'Time'
  return (
    <div className="amrap-row">
      <div className="spread">
        <button className="amrap-name" onClick={onSwap}>
          <span className="block-idx">{index + 1}</span>
          <span className="truncate">{ex.name}</span>
          <Icon name="swap" size={14} className="muted" />
        </button>
        <div className="row" style={{ gap: 0 }}>
          <button className="icon-btn" disabled={index === 0} onClick={() => onMove(-1)} aria-label="Move up"><Icon name="up" size={16} /></button>
          <button className="icon-btn" disabled={index === count - 1} onClick={() => onMove(1)} aria-label="Move down"><Icon name="down" size={16} /></button>
          <button className="icon-btn" onClick={onRemove} aria-label="Remove"><Icon name="trash" size={16} /></button>
        </div>
      </div>
      <div className="amrap-inputs">
        <label className="field">
          {label}
          {field === 'durationSec' ? (
            <input inputMode="numeric" placeholder="m:ss" defaultValue={timeInput(v.durationSec)} onBlur={(e) => onEdit({ durationSec: parseTime(e.target.value) })} />
          ) : (
            <input type="number" inputMode="numeric" value={v[field] ?? ''} onChange={(e) => onEdit({ [field]: num(e.target.value) })} />
          )}
        </label>
        <label className="field">
          Weight kg
          <input type="number" inputMode="decimal" step="0.5" placeholder="–" value={v.weightKg ?? ''} onChange={(e) => onEdit({ weightKg: num(e.target.value) })} />
        </label>
      </div>
    </div>
  )
}
