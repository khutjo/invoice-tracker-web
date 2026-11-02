import type { InvoiceStatus, InvoiceSummary } from './api'

export function statusPillClass(status: InvoiceStatus): string {
  switch (status) {
    case 'Draft':
      return 'status-pill status-pill--draft'
    case 'Sent':
      return 'status-pill status-pill--sent'
    case 'Overdue':
      return 'status-pill status-pill--overdue'
    case 'Paid':
      return 'status-pill status-pill--paid'
    case 'Cancelled':
      return 'status-pill status-pill--cancelled'
  }
}

export function isPartiallyPaid(
  inv: Pick<InvoiceSummary, 'amountPaid' | 'total'>,
): boolean {
  return inv.amountPaid > 0 && inv.amountPaid < inv.total
}

export function isInvoiceRowOverdue(
  inv: Pick<InvoiceSummary, 'status' | 'dueDate'>,
  asOfIso?: string | null,
): boolean {
  if (inv.status === 'Overdue') {
    return true
  }
  if (inv.status === 'Sent' && inv.dueDate && asOfIso) {
    return inv.dueDate < asOfIso
  }
  return false
}
