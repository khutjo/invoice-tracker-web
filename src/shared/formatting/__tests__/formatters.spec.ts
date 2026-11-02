import { describe, expect, it } from 'vitest'
import { formatZar, pluralize, roundCentsAwayFromZero } from '../formatters'

describe('formatters', () => {
  it('rounds half away from zero to two decimals', () => {
    expect(roundCentsAwayFromZero(10.005)).toBe(10.01)
    expect(roundCentsAwayFromZero(10.004)).toBe(10.0)
    expect(roundCentsAwayFromZero(199.99 * 0.15)).toBe(30.0)
    expect(roundCentsAwayFromZero(-10.005)).toBe(-10.01)
  })

  it('formats ZAR currency strings', () => {
    const formatted = formatZar(1250.5)
    expect(formatted).toContain('R')
    expect(formatted).toMatch(/1[\s,\u00a0]?250[.,]50/)
  })

  it('pluralize handles 0, 1 and 2', () => {
    expect(pluralize(0, 'invoice')).toBe('0 invoices')
    expect(pluralize(1, 'invoice')).toBe('1 invoice')
    expect(pluralize(2, 'invoice')).toBe('2 invoices')
    expect(pluralize(1, 'day')).toBe('1 day')
    expect(pluralize(14, 'day')).toBe('14 days')
  })
})
