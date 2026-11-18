import { useState } from 'react'
import { exerciseById, getAthletes, getLog, getSessions, getSettings, today, useAthlete, useStore } from '../data/model'
import { resolveBlock } from '../domain/multiAthlete'
import { DIVISIONS, STATION_NAMES, STATION_ORDER } from '../domain/standards'
import type { StationId } from '../domain/types'
import { fmtDuration } from '../format'
import { LineChart, type Point } from './Chart'

export function ProgressScreen() {
  const store = useStore()
  const { athleteId } = useAthlete()
  const profile = getSettings(store)!
  const athlete = getAthletes(store).find((a) => a.id === athleteId)!
  const division = DIVISIONS[athlete.division]
  const t = today()
  const sessions = getSessions(store)
  const past = sessions.filter((s) => s.date <= t)
  const logs = past.map((s) => ({ s, log: getLog(store, s.id, athleteId) }))
  const done = logs.filter((x) => x.log && x.log.status !== 'skipped')
  const completion = past.length ? Math.round((done.length / past.length) * 100) : 0
  const rpes = done.map((x) => x.log!.rpe).filter((r): r is number => !!r)
  const avgRpe = rpes.length ? (rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1) : '–'
  const [station, setStation] = useState<StationId>(profile.weakStations[0] ?? 'sled_push')

  // Collect every completed set, with its exercise.
  const sets = done.flatMap(({ s, log }) =>
    s.blocks.map((b) => resolveBlock(b, athleteId)).flatMap((b) => (log!.blocks[b.id] ?? []).filter((x) => x.done).map((x) => ({ date: s.date, ex: exerciseById(store, b.exerciseId), set: x }))),
  )

  const byDate = (pts: Point[], pick: (a: number, b: number) => number) => {
    const m = new Map<string, number>()
    for (const p of pts) m.set(p.date, m.has(p.date) ? pick(m.get(p.date)!, p.value) : p.value)
    return [...m.entries()].sort().map(([date, value]) => ({ date, value }))
  }

  const stationSets = sets.filter((x) => x.ex.station === station)
  const std = division.stations.find((x) => x.station === station)!
  const weightPts = byDate(stationSets.filter((x) => x.set.weightKg).map((x) => ({ date: x.date, value: x.set.weightKg! })), Math.max)
  const volumePts = byDate(
    stationSets.map((x) => ({ date: x.date, value: (std.reps ? x.set.reps : x.set.distanceM) ?? 0 })).filter((p) => p.value > 0),
    (a, b) => a + b,
  )

  // Pace (seconds per km) for any running set with both distance and time.
  const pacePts = byDate(
    sets.filter((x) => x.ex.category === 'run' && x.set.distanceM && x.set.durationSec).map((x) => ({ date: x.date, value: Math.round((x.set.durationSec! / x.set.distanceM!) * 1000) })),
    Math.min,
  )
  const rpePts = done.filter((x) => x.log!.rpe).map((x) => ({ date: x.s.date, value: x.log!.rpe! }))

  // Race readiness: best logged load vs race load.
  const readiness = STATION_ORDER.map((st) => {
    const s = division.stations.find((x) => x.station === st)!
    const best = Math.max(0, ...sets.filter((x) => x.ex.station === st && x.set.weightKg).map((x) => x.set.weightKg!))
    return { st, race: s.weightKg, best }
  }).filter((r) => r.race)

  return (
    <div className="stack">
      <div className="stack-sm"><h1>Progress</h1><span className="small muted">{athlete.name} · {division.name}</span></div>
      <div className="stats">
        <div className="card stat"><b>{done.length}</b><span className="small muted">sessions done</span></div>
        <div className="card stat"><b>{completion}%</b><span className="small muted">completed</span></div>
        <div className="card stat"><b>{avgRpe}</b><span className="small muted">avg effort</span></div>
      </div>

      <div className="card stack-sm">
        <h2>Race loads</h2>
        <p className="small muted">Heaviest weight logged against the {division.name} race weight.</p>
        {readiness.map((r) => {
          const pct = Math.min(100, Math.round((r.best / r.race!) * 100))
          return (
            <div key={r.st} className="stack-sm" style={{ gap: 2 }}>
              <div className="spread small"><span style={{ fontWeight: 600 }}>{STATION_NAMES[r.st]}</span><span className="muted" style={{ fontWeight: 600 }}>{r.best || '–'} / {r.race} kg</span></div>
              <div className="bar"><div className={pct >= 100 ? 'full' : ''} style={{ width: `${pct}%` }} /></div>
            </div>
          )
        })}
      </div>

      <div className="card stack-sm">
        <h2>Stations</h2>
        <select value={station} onChange={(e) => setStation(e.target.value as StationId)}>
          {STATION_ORDER.map((s) => <option key={s} value={s}>{STATION_NAMES[s]}</option>)}
        </select>
        {std.weightKg !== undefined && (
          <>
            <span className="small muted">Heaviest weight per session (race: {std.weightKg} kg)</span>
            <LineChart points={weightPts} format={(v) => `${v}kg`} />
          </>
        )}
        <span className="small muted">Total {std.reps ? 'reps' : 'metres'} per session (race: {std.reps ?? std.distanceM})</span>
        <LineChart points={volumePts} />
      </div>

      <div className="card stack-sm">
        <h2>Run pace</h2>
        <span className="small muted">Fastest pace per km on logged runs with a time. Lower is faster.</span>
        <LineChart points={pacePts} format={(v) => fmtDuration(v)} invert />
      </div>

      <div className="card stack-sm">
        <h2>Effort</h2>
        <span className="small muted">How hard each session felt (1 to 10)</span>
        <LineChart points={rpePts} />
      </div>
    </div>
  )
}
