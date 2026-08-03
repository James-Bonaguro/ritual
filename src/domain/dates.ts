/*
 * All dates in this app are local calendar days (`YYYY-MM-DD`), never UTC
 * instants. A session belongs to the day you were at the gym; parsing it as
 * UTC would slide it a day backwards for anyone west of Greenwich.
 */

export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function today(): string {
  return toISODate(new Date())
}

export function tomorrow(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return toISODate(d)
}

/** Parses `YYYY-MM-DD` at local midnight. */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function addDays(iso: string, days: number): string {
  const d = fromISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/**
 * Whole days between two calendar days. Both are normalised to local midnight
 * first, so a DST transition in between can't produce 0.96 of a day.
 */
export function daysBetween(fromISO: string, toISO: string): number {
  const from = fromISODate(fromISO).getTime()
  const to = fromISODate(toISO).getTime()
  return Math.round((to - from) / 86_400_000)
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** "Today", "Yesterday", "Tomorrow", "Tuesday", or "Tue, 3 Aug" further out. */
export function formatRelativeDay(iso: string, reference = today()): string {
  const delta = daysBetween(reference, iso)
  if (delta === 0) return 'Today'
  if (delta === 1) return 'Tomorrow'
  if (delta === -1) return 'Yesterday'

  const date = fromISODate(iso)
  // Inside the past week a bare weekday is unambiguous and reads better.
  if (delta < 0 && delta > -7) return WEEKDAYS[date.getDay()]

  const sameYear = date.getFullYear() === fromISODate(reference).getFullYear()
  const base = `${WEEKDAYS[date.getDay()].slice(0, 3)}, ${MONTHS[date.getMonth()].slice(0, 3)} ${date.getDate()}`
  return sameYear ? base : `${base} ${date.getFullYear()}`
}

export function formatLongDay(iso: string): string {
  const date = fromISODate(iso)
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`
}

export function formatMonthYear(iso: string): string {
  const date = fromISODate(iso)
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

/** "12 days", "3 weeks", "Never" — the staleness badge text. */
export function formatDaysSince(days: number | null): string {
  if (days === null) return 'Never'
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 14) return `${days} days`
  if (days < 60) return `${Math.round(days / 7)} weeks`
  return `${Math.round(days / 30)} months`
}
