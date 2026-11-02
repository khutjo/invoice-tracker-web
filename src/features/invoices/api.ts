import { apiClient } from 'src/shared/api/client'
import type { Paged } from 'src/shared/api/types'

export type InvoiceStatus = 'Draft' | 'Sent' | 'Overdue' | 'Paid' | 'Cancelled'

export type InvoiceEventType =
  | 'Created'
  | 'Edited'
  | 'Sent'
  | 'PaymentRecorded'
  | 'MarkedOverdue'
  | 'ReminderRaised'
  | 'Paid'
  | 'Cancelled'

export type PaymentMethod = 'Eft' | 'Card' | 'Cash' | 'Other'

export interface InvoiceSummary {
  invoiceId: string
  invoiceNumber: string | null
  customerId: string
  customerName?: string | null
  status: InvoiceStatus
  issueDate: string | null
  dueDate: string | null
  total: number
  amountPaid: number
  balance: number
  createdAt: string
}

export interface InvoiceLine {
  invoiceLineId: string
  lineNumber: number
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
  lineTotal: number
  vatAmount: number
}

export interface Payment {
  paymentId: string
  amount: number
  paidOn: string
  method: PaymentMethod
  reference: string | null
  recordedAt: string
}

export interface InvoiceEvent {
  eventType: InvoiceEventType
  occurredAt: string
  userId: string | null
  detail: string | null
}

export interface InvoiceDetails {
  invoiceId: string
  invoiceNumber: string | null
  customerId: string
  status: InvoiceStatus
  paymentTermsDays: number
  issueDate: string | null
  dueDate: string | null
  subtotal: number
  vatTotal: number
  total: number
  amountPaid: number
  balance: number
  lines: InvoiceLine[]
  payments: Payment[]
  timeline: InvoiceEvent[]
  createdAt: string
  modifiedAt: string | null
  version: string
}

export interface InvoiceLineInput {
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
}

export interface InvoiceInput {
  customerId: string
  paymentTermsDays: number
  lines: InvoiceLineInput[]
}

export type UpdateInvoiceRequest = InvoiceInput & { version: string }

export interface SearchInvoicesParams {
  page?: number
  pageSize?: number
  status?: InvoiceStatus | ''
  customerId?: string
  issuedFrom?: string
  issuedTo?: string
  overdueOnly?: boolean
  search?: string
}

export async function searchInvoices(
  params: SearchInvoicesParams = {},
  signal?: AbortSignal,
): Promise<Paged<InvoiceSummary>> {
  const query = new URLSearchParams()
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 20
  query.set('page', String(page))
  query.set('pageSize', String(pageSize))

  if (params.status) {
    query.set('status', params.status)
  }
  if (params.customerId && params.customerId.trim().length > 0) {
    query.set('customerId', params.customerId.trim())
  }
  if (params.issuedFrom && params.issuedFrom.trim().length > 0) {
    query.set('issuedFrom', params.issuedFrom.trim())
  }
  if (params.issuedTo && params.issuedTo.trim().length > 0) {
    query.set('issuedTo', params.issuedTo.trim())
  }
  if (params.overdueOnly) {
    query.set('overdueOnly', 'true')
  }
  if (params.search && params.search.trim().length > 0) {
    query.set('search', params.search.trim())
  }

  return apiClient.get<Paged<InvoiceSummary>>(
    `/invoices?${query.toString()}`,
    signal !== undefined ? { signal } : undefined,
  )
}

export async function getInvoice(invoiceId: string): Promise<InvoiceDetails> {
  return apiClient.get<InvoiceDetails>(`/invoices/${encodeURIComponent(invoiceId)}`)
}

export async function createInvoice(input: InvoiceInput): Promise<InvoiceDetails> {
  return apiClient.post<InvoiceDetails>('/invoices', input)
}

export async function updateInvoice(
  invoiceId: string,
  request: UpdateInvoiceRequest,
): Promise<InvoiceDetails> {
  return apiClient.put<InvoiceDetails>(
    `/invoices/${encodeURIComponent(invoiceId)}`,
    request,
  )
}

export async function deleteInvoice(invoiceId: string): Promise<void> {
  await apiClient.delete<void>(`/invoices/${encodeURIComponent(invoiceId)}`)
}

export async function sendInvoice(invoiceId: string): Promise<InvoiceDetails> {
  return apiClient.post<InvoiceDetails>(`/invoices/${encodeURIComponent(invoiceId)}/send`)
}

export const invoicesApi = {
  searchInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  sendInvoice,
}
