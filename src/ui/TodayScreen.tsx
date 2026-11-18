import { exerciseById, getAthletes, getLog, getSessions, getSettings, getWeeks, saveLog, saveSession, today, useAthlete, useStore } from '../data/model'
import { addDays, daysBetween, mondayOf, parseISO } from '../domain/dates'
import { resolveBlock } from '../domain/multiAthlete'
import { DIVISIONS } from '../domain/standards'
import type { Session } from '../domain/types'
import { blockSummary, fmtDate, PHASE_NAMES, SESSION_TYPES } from '../format'
import { Icon, TypeTile } from './Icon'

function DateBadge({ date }: { date: string }) {
  const d = parseISO(date)
  return (
    <div className="date-badge">
      <span>{d.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' })}</span>
      <b>{d.getUTCDate()}</b>
    </div>
  )
}

export function SessionCard({ s, onOpen, showDate = true }: { s: Session; onOpen: () => void; showDate?: boolean }) {
  const store = useStore()
  const { athleteId } = useAthlete()
  const log = getLog(store, s.id, athleteId)
  const t = today()
  const missed = !log && s.date < t
  const cls = log?.status === 'skipped' ? 'skipped' : missed ? 'missed' : s.date === t && !log ? 'today' : ''
  return (
    <button className={`card tap s-card ${cls}`} onClick={onOpen}>
      {showDate && <DateBadge date={s.date} />}
      <TypeTile type={s.type} />
      <div className="grow">
        <div className="title truncate">{s.title}</div>
        <div className="meta">
          {s.title !== SESSION_TYPES[s.type].name ? `${SESSION_TYPES[s.type].name} · ` : ''}{s.minutes} min · {s.blocks.length} {s.blocks.length === 1 ? 'exercise' : 'exercises'}
          {missed && ' · missed'}
          {log?.status === 'skipped' && ' · skipped'}
        </div>
      </div>
      {log && log.status !== 'skipped' ? (
        <span className={`status ${log.status}`}><Icon name="check" size={14} strokeWidth={3} /></span>
      ) : (
        <Icon name="chevronRight" size={18} className="muted" />
      )}
    </button>
  )
}

export function TodayScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const store = useStore()
  const { athleteId } = useAthlete()
  const settings = getSettings(store)!
  const athlete = getAthletes(store).find((a) => a.id === athleteId)!
  const sessions = getSessions(store)
  const weeks = getWeeks(store)
  const t = today()
  const daysToRace = daysBetween(t, settings.raceDate)
  const week = weeks.find((w) => w.startDate === mondayOf(t))
  const todays = sessions.filter((s) => s.date === t)
  const next = sessions.filter((s) => s.date > t).slice(0, 4)
  const missed = sessions.filter((s) => s.date < t && s.date >= addDays(t, -7) && !getLog(store, s.id, athleteId))

  const weekSessions = sessions.filter((s) => s.date >= mondayOf(t) && s.date < addDays(mondayOf(t), 7))
  const weekDone = weekSessions.filter((s) => ['done', 'partial'].includes(getLog(store, s.id, athleteId)?.status ?? '')).length
  const planProgress = weeks.length && week ? Math.round(((week.week - 1) / weeks.length) * 100) : 0

  return (
    <div className="stack">
      <div className="hero stack">
        <div className="spread" style={{ alignItems: 'flex-start' }}>
          <div className="stack-sm" style={{ gap: 2 }}>
            <span className="eyebrow">{athlete.name} · {DIVISIONS[athlete.division].name}</span>
            <div className="row" style={{ alignItems: 'baseline', gap: 8, marginTop: 6 }}>
              <span className="big">{Math.max(0, daysToRace)}</span>
              <span className="big-label">{daysToRace === 1 ? 'day to race day' : daysToRace === 0 ? 'Race day!' : 'days to race day'}</span>
            </div>
          </div>
        </div>
        {week && (
          <>
            <div className="row-wrap">
              <span className="chip accent">{PHASE_NAMES[week.phase]}</span>
              <span className="chip">Week {week.week} of {weeks.length}</span>
              {week.deload && <span className="chip">Easier week</span>}
            </div>
            <div className="stack-sm">
              <div className="progress"><div style={{ width: `${planProgress}%` }} /></div>
              <span className="tiny" style={{ color: 'rgb(246 246 242 / 0.65)' }}>
                {weekDone} of {weekSessions.length} sessions done this week · race {fmtDate(settings.raceDate, { day: 'numeric', month: 'long' })}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="section-title"><span className="eyebrow">Today</span><span className="tiny muted">{fmtDate(t, { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
      {todays.length ? todays.map((s) => <TodayFeature key={s.id} s={s} onOpen={() => onOpen(s.id)} />) : (
        <div className="card flat empty">
          <Icon name="leaf" size={28} />
          <p style={{ marginTop: 6, fontWeight: 700, color: 'var(--text)' }}>Rest day</p>
          <p className="small">Recovery is training too.</p>
        </div>
      )}

      {missed.length > 0 && (
        <>
          <div className="section-title"><span className="eyebrow">Missed this week</span></div>
          {missed.map((s) => (
            <div key={s.id} className="card stack-sm" style={{ borderLeft: '4px solid var(--warn)' }}>
              <div className="row">
                <TypeTile type={s.type} size={34} />
                <div className="grow">
                  <b className="truncate">{s.title}</b>
                  <div className="tiny muted">{fmtDate(s.date)}</div>
                </div>
              </div>
              <div className="row-wrap">
                <button className="btn small" onClick={() => saveSession(store, { ...s, date: t })}>Move to today</button>
                <button className="btn small" onClick={() => saveSession(store, { ...s, date: addDays(t, 1) })}>Tomorrow</button>
                <button className="btn small" onClick={() => onOpen(s.id)}>Log it</button>
                <button className="btn small ghost" onClick={() => saveLog(store, { sessionId: s.id, athleteId, status: 'skipped', blocks: {}, completedAt: new Date().toISOString() })}>Skip</button>
              </div>
            </div>
          ))}
        </>
      )}

      <div className="section-title"><span className="eyebrow">Coming up</span></div>
      {next.map((s) => <SessionCard key={s.id} s={s} onOpen={() => onOpen(s.id)} />)}
      {next.length === 0 && <p className="muted small">Nothing planned.</p>}
    </div>
  )
}

function TodayFeature({ s, onOpen }: { s: Session; onOpen: () => void }) {
  const store = useStore()
  const { athleteId } = useAthlete()
  const log = getLog(store, s.id, athleteId)
  const blocks = s.blocks.map((b) => resolveBlock(b, athleteId))
  return (
    <div className="card feature">
      <div className="feature-head">
        <TypeTile type={s.type} size={48} />
        <div className="grow">
          <h2>{s.title}</h2>
          <div className="small muted">{s.title !== SESSION_TYPES[s.type].name ? `${SESSION_TYPES[s.type].name} · ` : ''}{s.minutes} min · {s.blocks.length} exercises</div>
        </div>
        {log && log.status !== 'skipped' && <span className="chip good"><Icon name="check" size={12} strokeWidth={3} /> Done</span>}
      </div>
      {s.focus && <p className="small muted" style={{ padding: '0 16px 10px' }}>{s.focus}</p>}
      <div className="feature-list">
        <ul>
          {blocks.slice(0, 5).map((b) => (
            <li key={b.id}><span className="truncate">{exerciseById(store, b.exerciseId).name}</span><span>{blockSummary(b)}</span></li>
          ))}
          {blocks.length > 5 && <li><span className="muted">+{blocks.length - 5} more</span><span /></li>}
        </ul>
      </div>
      <div className="feature-foot">
        <button className="btn primary grow" onClick={onOpen}>
          {log ? 'View workout' : 'Start workout'} <Icon name="chevronRight" size={18} />
        </button>
      </div>
    </div>
  )
}
