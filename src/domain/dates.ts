// Small date helpers working on ISO yyyy-mm-dd strings in UTC, so results
// don't shift with the phone's time zone.

export function parseISO(d: string): Date {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, day))
}

export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function addDays(d: string, n: number): string {
  const x = parseISO(d)
  x.setUTCDate(x.getUTCDate() + n)
  return toISO(x)
}

/** 0 = Monday ... 6 = Sunday */
export function weekday(d: string): number {
  return (parseISO(d).getUTCDay() + 6) % 7
}

export function mondayOf(d: string): string {
  return addDays(d, -weekday(d))
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000)
}
