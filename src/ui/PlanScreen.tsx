import { useState } from 'react'
import { getLog, getSessions, getWeeks, newId, saveSession, today, useStore } from '../data/model'
import { addDays, mondayOf } from '../domain/dates'
import type { Block, PlanWeek, Session } from '../domain/types'
import { fmtDate, PHASE_NAMES } from '../format'
import { SessionCard } from './TodayScreen'

const DAY = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function scaleBlock(b: Block, f: number): Block {
  const r = (n: number | undefined, step: number) => (n === undefined ? n : Math.max(step, Math.round((n * f) / step) * step))
  return {
    ...b,
    sets: f < 1 && b.sets > 1 ? Math.max(1, Math.round(b.sets * f)) : b.sets,
    reps: r(b.reps, 1),
    distanceM: r(b.distanceM, 10),
    durationSec: r(b.durationSec, 30),
  }
}

export function PlanScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const store = useStore()
  const weeks = getWeeks(store)
  const sessions = getSessions(store)
  const current = weeks.find((w) => w.startDate === mondayOf(today()))?.week ?? weeks[0]?.week
  const [open, setOpen] = useState<number | undefined>(current)

  return (
    <div className="stack">
      <h1>Plan</h1>
      <p className="small muted">Tap a week to see its sessions. Tap a session to edit, swap exercises, move it or log it.</p>
      {weeks.map((w) => (
        <WeekCard key={w.week} w={w} sessions={sessions.filter((s) => s.date >= w.startDate && s.date < addDays(w.startDate, 7))} open={open === w.week} current={current === w.week} onToggle={() => setOpen(open === w.week ? undefined : w.week)} onOpen={onOpen} />
      ))}
      {weeks.length === 0 && <p className="muted">No plan yet. Set one up in Settings.</p>}
    </div>
  )
}

function WeekCard({ w, sessions, open, current, onToggle, onOpen }: { w: PlanWeek; sessions: Session[]; open: boolean; current: boolean; onToggle: () => void; onOpen: (id: string) => void }) {
  const store = useStore()
  const t = today()
  const done = sessions.filter((s) => { const l = getLog(store, s.id); return l && l.status !== 'skipped' }).length

  const scaleWeek = (f: number) => {
    for (const s of sessions) {
      if (getLog(store, s.id) || s.date < t) continue
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
    <div className={`card stack-sm ${current ? 'today' : ''}`}>
      <button className="spread" onClick={onToggle} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
        <div className="stack-sm" style={{ gap: 2 }}>
          <b>Week {w.week} · {fmtDate(w.startDate, { day: 'numeric', month: 'short' })}</b>
          <div className="row-wrap">
            <span className={`chip ${w.phase}`}>{PHASE_NAMES[w.phase]}</span>
            {w.deload && <span className="chip">Easier week</span>}
            {current && <span className="chip warn">This week</span>}
          </div>
        </div>
        <span className="small muted">{done}/{sessions.length} {open ? '▴' : '▾'}</span>
      </button>
      <div className="week-strip">
        {DAY.map((d, i) => {
          const date = addDays(w.startDate, i)
          const s = sessions.filter((x) => x.date === date)
          const logged = s.length > 0 && s.every((x) => { const l = getLog(store, x.id); return l && l.status !== 'skipped' })
          const miss = s.length > 0 && date < t && !logged
          return <div key={i} className={`d ${s.length ? 'has' : ''} ${logged ? 'done' : miss ? 'miss' : ''}`}>{d}</div>
        })}
      </div>
      {open && (
        <div className="stack-sm" style={{ marginTop: 6 }}>
          {sessions.map((s) => <SessionCard key={s.id} s={s} onOpen={() => onOpen(s.id)} />)}
          <div className="row-wrap">
            <button className="btn small" onClick={addSession}>＋ Add session</button>
            <button className="btn small" onClick={() => scaleWeek(0.8)}>Make easier (−20%)</button>
            <button className="btn small" onClick={() => scaleWeek(1.1)}>Make harder (+10%)</button>
          </div>
          <span className="tiny muted">Easier/harder changes sets, reps, distances and times on this week's upcoming sessions. Weights stay the same.</span>
        </div>
      )}
    </div>
  )
}
