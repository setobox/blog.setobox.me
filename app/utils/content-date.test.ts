import { describe, expect, it } from 'vitest'
import {
  contentUtcMonth,
  contentUtcYear,
  formatContentDate,
  isoContentDate,
} from './content-date'

describe('content dates', () => {
  it('formats calendar dates deterministically in UTC', () => {
    const date = '2026-01-01T00:00:00.000Z'
    expect(isoContentDate(date)).toBe('2026-01-01')
    expect(formatContentDate(date)).toBe('2026/01/01')
    expect(contentUtcYear(date)).toBe(2026)
    expect(contentUtcMonth(date)).toBe(1)
  })
})
