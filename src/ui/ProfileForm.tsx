import { useState } from 'react'
import { DIVISIONS, STATION_NAMES, STATION_ORDER } from '../domain/standards'
import { mondayOf } from '../domain/dates'
import type { Athlete, DivisionId, Level, PlanSettings } from '../domain/types'
import { newId, today } from '../data/model'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function defaultSettings(): PlanSettings {
  return {
    daysPerWeek: 4,
    trainingDays: [0, 2, 4, 5],
    sessionMinutes: 60,
    raceDate: '2027-03-25',
    startDate: mondayOf(today()),
    weakStations: [],
  }
}

export function defaultAthletes(): Athlete[] {
  return [
    { id: newId('ath'), name: '', division: 'neuro_major', level: 'beginner', limitations: '' },
    { id: newId('ath'), name: '', division: 'men_open', level: 'intermediate', limitations: '' },
  ]
}

interface Props {
  initialSettings: PlanSettings
  initialAthletes: Athlete[]
  submitLabel: string
  onSubmit: (s: PlanSettings, athletes: Athlete[], regenerate: boolean) => void
  /** Show the "rebuild the plan" option (settings screen). */
  allowKeepPlan?: boolean
}

export function PlanForm({ initialSettings, initialAthletes, submitLabel, onSubmit, allowKeepPlan }: Props) {
  const [p, setP] = useState<PlanSettings>(initialSettings)
  const [athletes, setAthletes] = useState<Athlete[]>(initialAthletes)
  const [regenerate, setRegenerate] = useState(!allowKeepPlan)
  const set = <K extends keyof PlanSettings>(k: K, v: PlanSettings[K]) => setP((x) => ({ ...x, [k]: v }))
  const setAthlete = (id: string, patch: Partial<Athlete>) => setAthletes((all) => all.map((a) => (a.id === id ? { ...a, ...patch } : a)))

  const toggleDay = (d: number) => {
    const days = p.trainingDays.includes(d) ? p.trainingDays.filter((x) => x !== d) : [...p.trainingDays, d].sort()
    setP((x) => ({ ...x, trainingDays: days, daysPerWeek: Math.max(2, Math.min(6, days.length)) }))
  }

  const daysOk = p.trainingDays.length >= 2 && p.trainingDays.length <= 6
  const datesOk = p.raceDate > p.startDate
  const namesOk = athletes.length > 0 && athletes.every((a) => a.name.trim())

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault()
        if (daysOk && datesOk && namesOk) onSubmit({ ...p, daysPerWeek: p.trainingDays.length }, athletes.map((a) => ({ ...a, name: a.name.trim() })), regenerate)
      }}
    >
      <h2>Athletes</h2>
      <p className="small muted">Everyone does the same workouts. Weights, distances and exercise versions are set for each person's division and level.</p>
      {athletes.map((a, i) => (
        <div key={a.id} className="card stack-sm" style={{ background: 'var(--bg)' }}>
          <div className="spread">
            <b>Athlete {i + 1}</b>
            {athletes.length > 1 && (
              <button type="button" className="btn small ghost danger" onClick={() => setAthletes(athletes.filter((x) => x.id !== a.id))}>Remove</button>
            )}
          </div>
          <label className="field">Name<input value={a.name} onChange={(e) => setAthlete(a.id, { name: e.target.value })} placeholder="Name" /></label>
          <label className="field">
            Division
            <select value={a.division} onChange={(e) => setAthlete(a.id, { division: e.target.value as DivisionId })}>
              {Object.values(DIVISIONS).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <span className="tiny">{DIVISIONS[a.division].description} Run legs: {DIVISIONS[a.division].runLegM} m.</span>
          </label>
          <div className="stack-sm">
            <span className="small muted">Current level</span>
            <div className="toggle-group">
              {(['beginner', 'intermediate', 'advanced'] as Level[]).map((l) => (
                <button type="button" key={l} className={`toggle ${a.level === l ? 'on' : ''}`} onClick={() => setAthlete(a.id, { level: l })}>
                  {l[0].toUpperCase() + l.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            Limitations and notes
            <input value={a.limitations ?? ''} onChange={(e) => setAthlete(a.id, { limitations: e.target.value })} placeholder="e.g. right leg weaker, no jumping" />
          </label>
        </div>
      ))}
      <button type="button" className="btn small" onClick={() => setAthletes([...athletes, { id: newId('ath'), name: '', division: 'men_open', level: 'intermediate' }])}>＋ Add athlete</button>
      <span className="tiny muted">Beginner: new to this kind of training. Intermediate: trains regularly. Advanced: has raced or trains hard 4+ days a week.</span>
      {!namesOk && <span className="small" style={{ color: 'var(--warn)' }}>Give every athlete a name.</span>}

      <h2>Shared schedule</h2>
      <div className="stack-sm">
        <span className="small muted">Training days ({p.trainingDays.length} per week, 2 to 6)</span>
        <div className="toggle-group">
          {DAY_NAMES.map((n, i) => (
            <button type="button" key={n} className={`toggle ${p.trainingDays.includes(i) ? 'on' : ''}`} onClick={() => toggleDay(i)}>{n}</button>
          ))}
        </div>
        {!daysOk && <span className="small" style={{ color: 'var(--warn)' }}>Pick between 2 and 6 days.</span>}
      </div>

      <label className="field">
        Session length (minutes)
        <input type="number" inputMode="numeric" min={20} max={150} step={5} value={p.sessionMinutes} onChange={(e) => set('sessionMinutes', Number(e.target.value) || 60)} />
      </label>

      <div className="num-grid">
        <label className="field">Plan starts<input type="date" value={p.startDate} onChange={(e) => set('startDate', e.target.value)} /></label>
        <label className="field">Race day<input type="date" value={p.raceDate} onChange={(e) => set('raceDate', e.target.value)} /></label>
      </div>
      {!datesOk && <span className="small" style={{ color: 'var(--warn)' }}>Race day must be after the start date.</span>}

      <div className="stack-sm">
        <span className="small muted">Stations to work on most</span>
        <div className="toggle-group">
          {STATION_ORDER.map((s) => (
            <button
              type="button"
              key={s}
              className={`toggle ${p.weakStations.includes(s) ? 'on' : ''}`}
              onClick={() => set('weakStations', p.weakStations.includes(s) ? p.weakStations.filter((x) => x !== s) : [...p.weakStations, s].slice(-3))}
            >
              {STATION_NAMES[s]}
            </button>
          ))}
        </div>
        <span className="tiny muted">Up to 3. These show up in every station session.</span>
      </div>

      {allowKeepPlan && (
        <label className="row small">
          <input type="checkbox" checked={regenerate} onChange={(e) => setRegenerate(e.target.checked)} />
          <span>Rebuild upcoming sessions from these settings. Past and logged sessions are kept; manual edits to future sessions are replaced.</span>
        </label>
      )}

      <button className="btn primary block" type="submit" disabled={!daysOk || !datesOk || !namesOk}>{submitLabel}</button>
    </form>
  )
}
