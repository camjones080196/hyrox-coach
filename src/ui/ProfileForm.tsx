import { useState } from 'react'
import { DIVISIONS, STATION_NAMES, STATION_ORDER } from '../domain/standards'
import { mondayOf } from '../domain/dates'
import type { AthleteProfile, DivisionId, Level } from '../domain/types'
import { today } from '../data/model'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DEFAULT_DAYS: Record<number, number[]> = { 2: [1, 5], 3: [0, 2, 5], 4: [0, 2, 4, 5], 5: [0, 1, 3, 4, 5], 6: [0, 1, 2, 3, 4, 5] }

export function defaultProfile(): AthleteProfile {
  return {
    name: '',
    division: 'neuro_major',
    level: 'beginner',
    daysPerWeek: 4,
    trainingDays: DEFAULT_DAYS[4],
    sessionMinutes: 60,
    raceDate: '2027-03-25',
    startDate: mondayOf(today()),
    weakStations: [],
    limitations: '',
  }
}

interface Props {
  initial: AthleteProfile
  submitLabel: string
  onSubmit: (p: AthleteProfile, regenerate: boolean) => void
  /** Show the "rebuild the plan" option (settings screen). */
  allowKeepPlan?: boolean
}

export function ProfileForm({ initial, submitLabel, onSubmit, allowKeepPlan }: Props) {
  const [p, setP] = useState<AthleteProfile>(initial)
  const [regenerate, setRegenerate] = useState(!allowKeepPlan)
  const set = <K extends keyof AthleteProfile>(k: K, v: AthleteProfile[K]) => setP((x) => ({ ...x, [k]: v }))

  const toggleDay = (d: number) => {
    const days = p.trainingDays.includes(d) ? p.trainingDays.filter((x) => x !== d) : [...p.trainingDays, d].sort()
    setP((x) => ({ ...x, trainingDays: days, daysPerWeek: Math.max(2, Math.min(6, days.length)) }))
  }

  const daysOk = p.trainingDays.length >= 2 && p.trainingDays.length <= 6
  const datesOk = p.raceDate > p.startDate

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault()
        if (daysOk && datesOk) onSubmit({ ...p, daysPerWeek: p.trainingDays.length }, regenerate)
      }}
    >
      <label className="field">
        Athlete name
        <input value={p.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Josh" />
      </label>

      <label className="field">
        Division
        <select value={p.division} onChange={(e) => set('division', e.target.value as DivisionId)}>
          {Object.values(DIVISIONS).map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <span className="small">{DIVISIONS[p.division].description} Run legs: {DIVISIONS[p.division].runLegM} m.</span>
      </label>

      <div className="stack-sm">
        <span className="small muted">Current level</span>
        <div className="toggle-group">
          {(['beginner', 'intermediate', 'advanced'] as Level[]).map((l) => (
            <button type="button" key={l} className={`toggle ${p.level === l ? 'on' : ''}`} onClick={() => set('level', l)}>
              {l[0].toUpperCase() + l.slice(1)}
            </button>
          ))}
        </div>
        <span className="tiny muted">Beginner: new to this kind of training. Intermediate: trains regularly. Advanced: has raced or trains hard 4+ days a week.</span>
      </div>

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
        <label className="field">
          Plan starts
          <input type="date" value={p.startDate} onChange={(e) => set('startDate', e.target.value)} />
        </label>
        <label className="field">
          Race day
          <input type="date" value={p.raceDate} onChange={(e) => set('raceDate', e.target.value)} />
        </label>
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

      <label className="field">
        Limitations and notes
        <textarea value={p.limitations ?? ''} onChange={(e) => set('limitations', e.target.value)} placeholder="e.g. right leg weaker, no jumping, physio says avoid deep flexion" />
      </label>

      {allowKeepPlan && (
        <label className="row small">
          <input type="checkbox" checked={regenerate} onChange={(e) => setRegenerate(e.target.checked)} />
          <span>Rebuild upcoming sessions from these settings. Past and logged sessions are kept; manual edits to future sessions are replaced.</span>
        </label>
      )}

      <button className="btn primary block" type="submit" disabled={!daysOk || !datesOk}>{submitLabel}</button>
    </form>
  )
}
