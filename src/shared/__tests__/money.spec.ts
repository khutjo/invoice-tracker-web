import { describe, expect, it } from 'vitest'
import {
  calculateInvoicePreview,
  calculateLinePreview,
  formatZar,
  roundHalfAwayFromZero,
} from '../money'

describe('money helper (BigInt per-line VAT and commercial rounding)', () => {
  it('rounds half a cent away from zero: 0.5 x 0.01 = 0.01', () => {
    const line = calculateLinePreview(0.5, 0.01, 0)
    expect(line.lineTotal).toBe(0.01)
    expect(line.lineTotalCents).toBe(1n)
  })

  it('rounds VAT per line rather than on the sum: two lines of 0.03 at 15% have 0.00 VAT each and 0.00 in total', () => {
    const preview = calculateInvoicePreview([
      { quantity: 1, unitPrice: 0.03, vatRate: 0.15 },
      { quantity: 1, unitPrice: 0.03, vatRate: 0.15 },
    ])

    expect(preview.lines[0]?.vatAmount).toBe(0)
    expect(preview.lines[1]?.vatAmount).toBe(0)
    expect(preview.subtotal).toBe(0.06)
    expect(preview.vatTotal).toBe(0)
    expect(preview.total).toBe(0.06)
  })

  it('calculates 2.5 x 380.00 = 950.00', () => {
    const line = calculateLinePreview(2.5, 380.0, 0.15)
    expect(line.lineTotal).toBe(950.0)
    expect(line.vatAmount).toBe(142.5)
  })

  it('calculates 1299.99 at 15% as 195.00 VAT', () => {
    const line = calculateLinePreview(1, 1299.99, 0.15)
    expect(line.lineTotal).toBe(1299.99)
    expect(line.vatAmount).toBe(195.0)
  })

  it('handles huge quantities and prices via BigInt without overflow', () => {
    const line = calculateLinePreview(1_000_000, 100_000_000, 0.15)
    expect(line.lineTotalCents).toBe(10_000_000_000_000_000n)
    expect(roundHalfAwayFromZero(15n, 10n)).toBe(2n)
  })

  it('formats ZAR currency with Intl.NumberFormat en-ZA', () => {
    const formatted = formatZar(1610.0)
    expect(formatted).toContain('R')
    expect(formatted).toMatch(/1[\s\u00a0]?610[,.]00/)
  })
})
