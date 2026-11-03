import { describe, expect, it } from 'vitest'
import { isOverpaid, isPartiallyPaid } from '../status'

describe('invoice status helpers', () => {
  it('isOverpaid is true only when the balance is below zero', () => {
    expect(isOverpaid({ balance: -0.01 })).toBe(true)
    expect(isOverpaid({ balance: 0 })).toBe(false)
    expect(isOverpaid({ balance: 100 })).toBe(false)
  })

  it('isPartiallyPaid is true only while something has been paid but less than the total', () => {
    expect(isPartiallyPaid({ amountPaid: 0, total: 1610 })).toBe(false)
    expect(isPartiallyPaid({ amountPaid: 500, total: 1610 })).toBe(true)
    expect(isPartiallyPaid({ amountPaid: 1610, total: 1610 })).toBe(false)
    expect(isPartiallyPaid({ amountPaid: 1700, total: 1610 })).toBe(false)
  })
})
