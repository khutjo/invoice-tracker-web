export interface InvoiceLineDraft {
  localId: string
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
}

export interface InvoiceDraft {
  customerId: string
  paymentTermsDays: number
  lines: InvoiceLineDraft[]
}

function hasValidPrecision(value: number, maxDecimals: number): boolean {
  if (!Number.isFinite(value)) return false
  const text = String(value)
  if (text.includes('e') || text.includes('E')) {
    return false
  }
  const dotIndex = text.indexOf('.')
  if (dotIndex === -1) return true
  return text.length - dotIndex - 1 <= maxDecimals
}

export function validateInvoiceDraft(draft: InvoiceDraft): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!draft.customerId || draft.customerId.trim().length === 0) {
    errors.customerId = 'Select a customer for this invoice.'
  }

  const terms = Number(draft.paymentTermsDays)
  if (!Number.isInteger(terms) || terms < 0 || terms > 365) {
    errors.paymentTermsDays = 'Payment terms must be between 0 and 365 days.'
  }

  if (draft.lines.length > 100) {
    errors.lines = 'An invoice can have at most 100 line items.'
  }

  draft.lines.forEach((line, index) => {
    const desc = line.description.trim()
    if (!desc) {
      errors[`lines[${index}].description`] = 'Description is required.'
    } else if (desc.length > 500) {
      errors[`lines[${index}].description`] = 'Description must be 500 characters or fewer.'
    }

    const qty = Number(line.quantity)
    if (!Number.isFinite(qty) || qty < 0.001 || qty > 1_000_000) {
      errors[`lines[${index}].quantity`] = 'Qty must be between 0.001 and 1,000,000.'
    } else if (!hasValidPrecision(qty, 3)) {
      errors[`lines[${index}].quantity`] = 'Qty can have at most 3 decimal places.'
    }

    const price = Number(line.unitPrice)
    if (!Number.isFinite(price) || price < 0 || price > 100_000_000) {
      errors[`lines[${index}].unitPrice`] = 'Unit price must be between 0 and 100,000,000.'
    } else if (!hasValidPrecision(price, 2)) {
      errors[`lines[${index}].unitPrice`] = 'Unit price can have at most 2 decimal places.'
    }

    const rate = Number(line.vatRate)
    if (!Number.isFinite(rate) || rate < 0 || rate > 0.9999) {
      errors[`lines[${index}].vatRate`] = 'VAT rate must be between 0% and 99.99%.'
    } else if (!hasValidPrecision(rate, 4)) {
      errors[`lines[${index}].vatRate`] = 'VAT rate can have at most 4 decimal places.'
    }
  })

  return errors
}

export function getSendDisabledReason(
  lineCount: number,
  total: number,
): string | null {
  if (lineCount === 0) {
    return 'Add at least one line item before sending.'
  }
  if (!(total > 0)) {
    return 'An invoice with a zero total cannot be sent.'
  }
  return null
}

/**
 * Returns today's date in `Africa/Johannesburg` formatted as `yyyy-MM-dd`.
 */
export function getJohannesburgTodayIso(referenceDate: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(referenceDate)
}

/**
 * Adds `days` to a `yyyy-MM-dd` date string and returns `yyyy-MM-dd`.
 */
export function addDaysToIsoDate(isoDate: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim())
  if (!match) return isoDate
  const utc = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]) + Math.trunc(days),
  )
  const d = new Date(utc)
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Computes the relative due badge text against today in Africa/Johannesburg:
 * e.g. "Due in 5 days", "Due today", or "12 days overdue".
 */
export function getRelativeDueBadge(
  dueDateIso: string | null | undefined,
  referenceDate: Date = new Date(),
): { text: string; isOverdue: boolean } | null {
  if (!dueDateIso) return null
  const dueMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDateIso.trim())
  const todayIso = getJohannesburgTodayIso(referenceDate)
  const todayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(todayIso)
  if (!dueMatch || !todayMatch) return null

  const dueUtc = Date.UTC(Number(dueMatch[1]), Number(dueMatch[2]) - 1, Number(dueMatch[3]))
  const todayUtc = Date.UTC(
    Number(todayMatch[1]),
    Number(todayMatch[2]) - 1,
    Number(todayMatch[3]),
  )

  const diffDays = Math.round((dueUtc - todayUtc) / 86_400_000)

  if (diffDays === 0) {
    return { text: 'Due today', isOverdue: false }
  }
  if (diffDays > 0) {
    return {
      text: diffDays === 1 ? 'Due in 1 day' : `Due in ${diffDays} days`,
      isOverdue: false,
    }
  }
  const overdueDays = Math.abs(diffDays)
  return {
    text: overdueDays === 1 ? '1 day overdue' : `${overdueDays} days overdue`,
    isOverdue: true,
  }
}
