const zarFormatter = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const invoiceDateFormatter = new Intl.DateTimeFormat('en-ZA', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export interface LineMoneyInput {
  quantity: number
  unitPrice: number
  vatRate: number
}

export interface LineMoneyPreview {
  lineTotal: number
  vatAmount: number
  lineTotalCents: bigint
  vatAmountCents: bigint
}

export interface InvoiceMoneyPreview {
  subtotal: number
  vatTotal: number
  total: number
  lines: LineMoneyPreview[]
}

/**
 * Converts a finite number into a scaled integer BigInt with `decimals` fractional digits
 * without IEEE-754 multiplication drift.
 */
export function toScaledBigInt(value: number, decimals: number): bigint {
  if (!Number.isFinite(value)) {
    return 0n
  }
  const fixed = value.toFixed(decimals)
  const normalized = fixed.replace('.', '')
  return BigInt(normalized)
}

/**
 * Commercial half-away-from-zero integer division:
 * rounds `numerator / denominator` to the nearest integer, with exact halves
 * rounding away from zero (matching .NET MidpointRounding.AwayFromZero).
 */
export function roundHalfAwayFromZero(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) {
    throw new RangeError('Denominator cannot be zero')
  }
  const sign = numerator < 0n !== denominator < 0n ? -1n : 1n
  const absNum = numerator < 0n ? -numerator : numerator
  const absDen = denominator < 0n ? -denominator : denominator

  const quotient = absNum / absDen
  const remainder = absNum % absDen

  const rounded = remainder * 2n >= absDen ? quotient + 1n : quotient
  return sign * rounded
}

export function centsToRands(cents: bigint): number {
  return Number(cents) / 100
}

/**
 * Calculates a single invoice line's exclusive total and VAT in cents using BigInt:
 * - price in cents (2 decimals)
 * - quantity in thousandths (3 decimals)
 * - VAT rate in basis points / ten-thousandths (4 decimals)
 */
export function calculateLinePreview(
  quantity: number,
  unitPrice: number,
  vatRate: number,
): LineMoneyPreview {
  const safeQty = Number.isFinite(quantity) && quantity > 0 ? quantity : 0
  const safePrice = Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice : 0
  const safeRate = Number.isFinite(vatRate) && vatRate > 0 ? vatRate : 0

  const priceCents = toScaledBigInt(safePrice, 2)
  const qtyMilli = toScaledBigInt(safeQty, 3)
  const rateBp = toScaledBigInt(safeRate, 4)

  const lineTotalCents = roundHalfAwayFromZero(priceCents * qtyMilli, 1000n)
  const vatAmountCents = roundHalfAwayFromZero(lineTotalCents * rateBp, 10000n)

  return {
    lineTotal: centsToRands(lineTotalCents),
    vatAmount: centsToRands(vatAmountCents),
    lineTotalCents,
    vatAmountCents,
  }
}

/**
 * Calculates the full invoice subtotal, per-line VAT sum, and inclusive total.
 * VAT is rounded per line and summed, matching the server's domain model.
 */
export function calculateInvoicePreview(lines: ReadonlyArray<LineMoneyInput>): InvoiceMoneyPreview {
  let subtotalCents = 0n
  let vatTotalCents = 0n
  const linePreviews: LineMoneyPreview[] = []

  for (const line of lines) {
    const preview = calculateLinePreview(line.quantity, line.unitPrice, line.vatRate)
    linePreviews.push(preview)
    subtotalCents += preview.lineTotalCents
    vatTotalCents += preview.vatAmountCents
  }

  const totalCents = subtotalCents + vatTotalCents

  return {
    subtotal: centsToRands(subtotalCents),
    vatTotal: centsToRands(vatTotalCents),
    total: centsToRands(totalCents),
    lines: linePreviews,
  }
}

export function formatZar(amount: number): string {
  return zarFormatter.format(Number.isFinite(amount) ? amount : 0)
}

/**
 * Formats an ISO date (`yyyy-MM-dd` or ISO timestamp) as "1 Nov 2026" (`en-ZA`).
 */
export function formatInvoiceDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '—'
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim())
  const date = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(isoDate)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }
  return invoiceDateFormatter.format(date).replace(/^0(\d\s)/, '$1')
}
