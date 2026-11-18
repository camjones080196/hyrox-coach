import { getLog, getProfile, getSessions, getWeeks, saveLog, saveSession, today, useStore } from '../data/model'
import { addDays, daysBetween, mondayOf } from '../domain/dates'
import { DIVISIONS } from '../domain/standards'
import type { Session } from '../domain/types'
import { fmtDate, PHASE_NAMES, SESSION_TYPES } from '../format'

export function SessionCard({ s, onOpen }: { s: Session; onOpen: () => void }) {
  const store = useStore()
  const log = getLog(store, s.id)
  const t = today()
  const cls = log ? (log.status === 'skipped' ? 'skipped' : 'done') : s.date < t ? 'missed' : s.date === t ? 'today' : ''
  const type = SESSION_TYPES[s.type]
  return (
    <button className={`card tap ${cls}`} onClick={onOpen}>
      <div className="spread">
        <span className="small muted">{fmtDate(s.date)}</span>
        <span className="tiny muted">{log ? (log.status === 'done' ? '✓ Done' : log.status === 'partial' ? '◐ Partial' : 'Skipped') : s.date < t ? 'Missed' : `${s.minutes} min`}</span>
      </div>
      <div className="row" style={{ marginTop: 4 }}>
        <span>{type.icon}</span>
        <b className="grow">{s.title}</b>
      </div>
      <p className="small muted" style={{ marginTop: 2 }}>{s.focus}</p>
    </button>
  )
}

export function TodayScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const store = useStore()
  const profile = getProfile(store)!
  const sessions = getSessions(store)
  const t = today()
  const daysToRace = daysBetween(t, profile.raceDate)
  const week = getWeeks(store).find((w) => w.startDate === mondayOf(t))
  const todays = sessions.filter((s) => s.date === t)
  const next = sessions.filter((s) => s.date > t).slice(0, 3)
  const missed = sessions.filter((s) => s.date < t && s.date >= addDays(t, -7) && !getLog(store, s.id))

  const weekSessions = sessions.filter((s) => s.date >= mondayOf(t) && s.date < addDays(mondayOf(t), 7))
  const weekDone = weekSessions.filter((s) => getLog(store, s.id)?.status === 'done' || getLog(store, s.id)?.status === 'partial').length

  return (
    <div className="stack">
      <div className="stack-sm">
        <span className="small muted">{profile.name ? `${profile.name} · ` : ''}{DIVISIONS[profile.division].name}</span>
        <h1>{daysToRace > 0 ? `${daysToRace} days to race day` : daysToRace === 0 ? 'Race day! 🏁' : 'Race done'}</h1>
        {week && (
          <div className="row-wrap">
            <span className={`chip ${week.phase}`}>{PHASE_NAMES[week.phase]}{week.deload ? ' · easier week' : ''}</span>
            <span className="chip">Week {week.week}</span>
            <span className="chip">{weekDone}/{weekSessions.length} done this week</span>
          </div>
        )}
      </div>

      <h2>Today</h2>
      {todays.length ? todays.map((s) => <SessionCard key={s.id} s={s} onOpen={() => onOpen(s.id)} />) : <p className="muted">Rest day. Recovery is training too.</p>}

      {missed.length > 0 && (
        <div className="stack-sm">
          <h2>Missed this week</h2>
          {missed.map((s) => (
            <div key={s.id} className="card missed stack-sm">
              <div className="spread">
                <b>{SESSION_TYPES[s.type].icon} {s.title}</b>
                <span className="small muted">{fmtDate(s.date)}</span>
              </div>
              <div className="row-wrap">
                <button className="btn small" onClick={() => saveSession(store, { ...s, date: t })}>Do it today</button>
                <button className="btn small" onClick={() => saveSession(store, { ...s, date: addDays(t, 1) })}>Tomorrow</button>
                <button className="btn small" onClick={() => onOpen(s.id)}>Log it</button>
                <button className="btn small ghost" onClick={() => saveLog(store, { sessionId: s.id, status: 'skipped', blocks: {}, completedAt: new Date().toISOString() })}>Skip</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2>Coming up</h2>
      {next.map((s) => <SessionCard key={s.id} s={s} onOpen={() => onOpen(s.id)} />)}
      {next.length === 0 && <p className="muted small">Nothing planned.</p>}
    </div>
  )
}
