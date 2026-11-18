import { fmtDate } from '../format'

export interface Point { date: string; value: number }

/** Minimal line chart for progress over time. */
export function LineChart({ points, format = (v) => String(v), invert = false }: { points: Point[]; format?: (v: number) => string; invert?: boolean }) {
  if (points.length === 0) return <div className="card flat empty small">Nothing logged yet. Log a workout to see this chart.</div>
  const W = 320, H = 140, P = { l: 40, r: 10, t: 10, b: 22 }
  const vals = points.map((p) => p.value)
  let min = Math.min(...vals), max = Math.max(...vals)
  if (min === max) { min -= 1; max += 1 }
  const x = (i: number) => P.l + (points.length === 1 ? (W - P.l - P.r) / 2 : (i / (points.length - 1)) * (W - P.l - P.r))
  const y = (v: number) => {
    const f = (v - min) / (max - min)
    return P.t + (invert ? f : 1 - f) * (H - P.t - P.b)
  }
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img">
        <line className="grid" x1={P.l} x2={W - P.r} y1={y(max)} y2={y(max)} />
        <line className="axis" x1={P.l} x2={W - P.r} y1={H - P.b} y2={H - P.b} />
        {points.length > 1 && <path className="area" d={`${d} L${x(points.length - 1).toFixed(1)},${H - P.b} L${x(0).toFixed(1)},${H - P.b} Z`} />}
        <text x={P.l - 4} y={y(max) + 3} textAnchor="end">{format(max)}</text>
        <text x={P.l - 4} y={y(min) + 3} textAnchor="end">{format(min)}</text>
        <text x={x(0)} y={H - 6} textAnchor="start">{fmtDate(points[0].date, { day: 'numeric', month: 'short' })}</text>
        {points.length > 1 && <text x={x(points.length - 1)} y={H - 6} textAnchor="end">{fmtDate(points.at(-1)!.date, { day: 'numeric', month: 'short' })}</text>}
        <path className="line" d={d} />
        {points.map((p, i) => <circle key={i} className="dot" cx={x(i)} cy={y(p.value)} r={3.5} />)}
      </svg>
    </div>
  )
}
