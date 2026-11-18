import { useState } from 'react'
import { anyLog, getLog, getSessions, getWeeks, newId, saveSession, today, useAthlete, useStore } from '../data/model'
import { addDays, mondayOf } from '../domain/dates'
import type { Block, BlockOverride, PlanWeek, Session } from '../domain/types'
import { fmtDate, PHASE_NAMES } from '../format'
import { SessionCard } from './TodayScreen'
import { Icon } from './Icon'

const DAY = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function scaleValues<T extends BlockOverride>(b: T, f: number): T {
  const r = (n: number | undefined, step: number) => (n === undefined ? n : Math.max(step, Math.round((n * f) / step) * step))
  const out = { ...b }
  if (b.sets !== undefined) out.sets = f < 1 && b.sets > 1 ? Math.max(1, Math.round(b.sets * f)) : b.sets
  if (b.reps !== undefined) out.reps = r(b.reps, 1)
  if (b.distanceM !== undefined) out.distanceM = r(b.distanceM, 10)
  if (b.durationSec !== undefined) out.durationSec = r(b.durationSec, 30)
  return out
}

/** Scale a block for everyone, including each athlete's own numbers. */
function scaleBlock(b: Block, f: number): Block {
  const out = scaleValues(b, f)
  if (b.athletes) out.athletes = Object.fromEntries(Object.entries(b.athletes).map(([k, o]) => [k, scaleValues(o, f)]))
  return out
}

export function PlanScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const store = useStore()
  const weeks = getWeeks(store)
  const sessions = getSessions(store)
  const current = weeks.find((w) => w.startDate === mondayOf(today()))?.week ?? weeks[0]?.week
  const [open, setOpen] = useState<number | undefined>(current)

  const PHASE_COLOR: Record<string, string> = { base: 'var(--base)', build: 'var(--build)', specific: 'var(--specific)', taper: 'var(--taper)', race: 'var(--accent)' }
  const phases = (['base', 'build', 'specific', 'taper'] as const).filter((p) => weeks.some((w) => w.phase === p))

  return (
    <div className="stack">
      <div className="stack-sm">
        <h1>Plan</h1>
        <p className="small muted">Tap a week to open it, then a session to edit, swap exercises, move or log it.</p>
      </div>
      {weeks.length > 0 && (
        <div className="card stack-sm">
          <div className="spread"><span className="eyebrow">Road to race day</span><span className="tiny muted">{weeks.length} weeks</span></div>
          <div className="timeline">
            {weeks.map((w) => (
              <div key={w.week} className={w.week === current ? 'now' : ''} style={{ flex: 1, background: PHASE_COLOR[w.phase], opacity: w.deload ? 0.45 : 1 }} title={`Week ${w.week}`} />
            ))}
          </div>
          <div className="legend">
            {phases.map((p) => <span key={p}><i style={{ background: PHASE_COLOR[p] }} />{PHASE_NAMES[p]}</span>)}
            <span><i style={{ background: 'var(--accent)' }} />Race</span>
            <span><i style={{ background: 'var(--muted)', opacity: 0.45 }} />Easier week</span>
          </div>
        </div>
      )}
      {weeks.map((w) => (
        <WeekCard key={w.week} w={w} sessions={sessions.filter((s) => s.date >= w.startDate && s.date < addDays(w.startDate, 7))} open={open === w.week} current={current === w.week} onToggle={() => setOpen(open === w.week ? undefined : w.week)} onOpen={onOpen} />
      ))}
      {weeks.length === 0 && <p className="muted">No plan yet. Set one up in Settings.</p>}
    </div>
  )
}

function WeekCard({ w, sessions, open, current, onToggle, onOpen }: { w: PlanWeek; sessions: Session[]; open: boolean; current: boolean; onToggle: () => void; onOpen: (id: string) => void }) {
  const store = useStore()
  const { athleteId } = useAthlete()
  const t = today()
  const done = sessions.filter((s) => { const l = getLog(store, s.id, athleteId); return l && l.status !== 'skipped' }).length

  const scaleWeek = (f: number) => {
    for (const s of sessions) {
      if (anyLog(store, s.id) || s.date < t) continue
      saveSession(store, { ...s, blocks: s.blocks.map((b) => scaleBlock(b, f)), minutes: Math.round(s.minutes * (f < 1 ? 0.85 : 1.05)) })
    }
  }

  const addSession = () => {
    const date = w.startDate < t && addDays(w.startDate, 6) >= t ? t : w.startDate
    const s: Session = { id: newId('s'), date, week: w.week, type: 'strength', title: 'New session', focus: '', blocks: [], minutes: 45 }
    saveSession(store, s)
    onOpen(s.id)
  }

  return (
    <div className={`card stack-sm week-card ${current ? 'current' : ''}`}>
      <button className="week-head" onClick={onToggle} aria-expanded={open}>
        <div className="stack-sm" style={{ gap: 4 }}>
          <div className="row" style={{ gap: 8 }}>
            <h3>Week {w.week}</h3>
            <span className="small muted">{fmtDate(w.startDate, { day: 'numeric', month: 'short' })} – {fmtDate(addDays(w.startDate, 6), { day: 'numeric', month: 'short' })}</span>
          </div>
          <div className="row-wrap" style={{ gap: 6 }}>
            <span className={`chip ${w.phase}`}>{PHASE_NAMES[w.phase]}</span>
            {w.deload && <span className="chip">Easier week</span>}
            {current && <span className="chip accent">This week</span>}
          </div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <span className="small muted" style={{ fontWeight: 700 }}>{done}/{sessions.length}</span>
          <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', display: 'inline-grid' }}><Icon name="chevronDown" size={18} className="muted" /></span>
        </div>
      </button>
      <div className="week-strip">
        {DAY.map((d, i) => {
          const date = addDays(w.startDate, i)
          const s = sessions.filter((x) => x.date === date)
          const logged = s.length > 0 && s.every((x) => { const l = getLog(store, x.id, athleteId); return l && l.status !== 'skipped' })
          const miss = s.length > 0 && date < t && !logged
          return <div key={i} className={`d ${s.length ? 'has' : ''} ${logged ? 'done' : miss ? 'miss' : ''} ${date === t ? 'today' : ''}`}>{d}</div>
        })}
      </div>
      {open && (
        <div className="stack-sm" style={{ marginTop: 6 }}>
          {sessions.map((s) => <SessionCard key={s.id} s={s} onOpen={() => onOpen(s.id)} />)}
          <div className="row-wrap">
            <button className="btn small" onClick={addSession}><Icon name="plus" size={16} /> Add session</button>
            <button className="btn small" onClick={() => scaleWeek(0.8)}>Easier −20%</button>
            <button className="btn small" onClick={() => scaleWeek(1.1)}>Harder +10%</button>
          </div>
          <span className="tiny muted">Easier/harder changes sets, reps, distances and times on this week's upcoming sessions. Weights stay the same. Applies to everyone.</span>
        </div>
      )}
    </div>
  )
}
