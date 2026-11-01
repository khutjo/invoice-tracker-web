import { describe, expect, it } from 'vitest'
import { formatZar, roundCentsAwayFromZero } from '../formatters'

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
})
