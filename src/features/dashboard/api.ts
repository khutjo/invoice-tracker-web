import { apiClient } from 'src/shared/api/client'

export interface DashboardSummary {
  asOf: string // yyyy-MM-dd (South Africa local date)
  totalOutstanding: {
    balance: number // ZAR (decimal)
    openInvoiceCount: number
  }
  overdue: {
    balance: number
    overdueInvoiceCount: number
    oldestDaysPastDue: number | null
  }
  paidThisMonth: {
    amountReceived: number
    paidInvoiceCount: number
  }
  drafts: {
    total: number
    draftCount: number
  }
}

export async function getDashboardSummary(signal?: AbortSignal): Promise<DashboardSummary> {
  return apiClient.get<DashboardSummary>(
    '/dashboard',
    signal !== undefined ? { signal } : undefined,
  )
}

export const dashboardApi = {
  getDashboardSummary,
}
