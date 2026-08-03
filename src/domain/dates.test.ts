import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, formatDaysSince, formatRelativeDay, fromISODate, toISODate } from './dates'

describe('local calendar days', () => {
  it('round-trips a date without sliding across the UTC boundary', () => {
    // The bug this guards: `new Date('2026-08-03')` parses as UTC midnight and
    // renders as 2 August anywhere west of Greenwich.
    const iso = '2026-08-03'
    expect(toISODate(fromISODate(iso))).toBe(iso)
  })

  it('counts whole days across a month boundary', () => {
    expect(daysBetween('2026-07-30', '2026-08-03')).toBe(4)
  })

  it('counts whole days across a leap day', () => {
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2)
  })

  it('returns a negative count for a future date', () => {
    expect(daysBetween('2026-08-10', '2026-08-03')).toBe(-7)
  })

  it('adds days across a year boundary', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
  })
})

describe('formatRelativeDay', () => {
  const today = '2026-08-03' // a Monday

  it('names the days either side of today', () => {
    expect(formatRelativeDay('2026-08-03', today)).toBe('Today')
    expect(formatRelativeDay('2026-08-04', today)).toBe('Tomorrow')
    expect(formatRelativeDay('2026-08-02', today)).toBe('Yesterday')
  })

  it('uses a bare weekday inside the past week', () => {
    expect(formatRelativeDay('2026-07-31', today)).toBe('Friday')
  })

  it('falls back to a dated form further out', () => {
    expect(formatRelativeDay('2026-06-15', today)).toBe('Mon, Jun 15')
  })

  it('includes the year once it differs', () => {
    expect(formatRelativeDay('2025-06-15', today)).toBe('Sun, Jun 15 2025')
  })
})

describe('formatDaysSince', () => {
  it('reads as language rather than a raw count', () => {
    expect(formatDaysSince(null)).toBe('Never')
    expect(formatDaysSince(0)).toBe('Today')
    expect(formatDaysSince(1)).toBe('Yesterday')
    expect(formatDaysSince(9)).toBe('9 days')
    expect(formatDaysSince(21)).toBe('3 weeks')
    expect(formatDaysSince(90)).toBe('3 months')
  })
})
