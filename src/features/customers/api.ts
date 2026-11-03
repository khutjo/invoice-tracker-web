import type {
  Address,
  ContactNumber,
  ContactNumberType,
  LookupOption,
} from 'src/features/business/api'
import { apiClient } from 'src/shared/api/client'
import type { Paged } from 'src/shared/api/types'

export type { Address, ContactNumber, ContactNumberType, LookupOption, Paged }

export interface CustomerSummary {
  customerId: string
  name: string
  email: string
  phoneNumber: string | null
  city: string | null
  customerReference: string | null
  isArchived: boolean
}

export interface CustomerDetails {
  customerId: string
  name: string
  email: string
  contactNumber: ContactNumber | null
  billingAddress: Address | null
  vatNumber: string | null
  customerReference: string | null
  isArchived: boolean
  version: string
}

export interface CustomerInput {
  name: string
  email: string
  contactNumber?: ContactNumber | null
  billingAddress?: Address | null
  vatNumber?: string | null
  customerReference?: string | null
}

export type UpdateCustomerRequest = CustomerInput & { version: string }

export interface SearchCustomersParams {
  search?: string
  page?: number
  pageSize?: number
  includeArchived?: boolean
  signal?: AbortSignal
}

export function searchCustomers(
  params: SearchCustomersParams = {},
): Promise<Paged<CustomerSummary>> {
  const query = new URLSearchParams()
  const search = params.search?.trim() ?? ''
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 20
  const includeArchived = Boolean(params.includeArchived)

  if (search) {
    query.set('search', search)
  }
  query.set('page', String(page))
  query.set('pageSize', String(pageSize))
  query.set('includeArchived', String(includeArchived))

  const qs = query.toString()
  return apiClient.get<Paged<CustomerSummary>>(
    `/customers${qs ? `?${qs}` : ''}`,
    params.signal ? { signal: params.signal } : undefined,
  )
}

export function getCustomer(customerId: string, signal?: AbortSignal): Promise<CustomerDetails> {
  return apiClient.get<CustomerDetails>(
    `/customers/${encodeURIComponent(customerId)}`,
    signal ? { signal } : undefined,
  )
}

export function createCustomer(input: CustomerInput): Promise<CustomerDetails> {
  return apiClient.post<CustomerDetails>('/customers', input)
}

export function updateCustomer(
  customerId: string,
  request: UpdateCustomerRequest,
): Promise<CustomerDetails> {
  return apiClient.put<CustomerDetails>(`/customers/${encodeURIComponent(customerId)}`, request)
}

export function archiveCustomer(customerId: string): Promise<void> {
  return apiClient.delete<void>(`/customers/${encodeURIComponent(customerId)}`)
}

export const customersApi = {
  searchCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  archiveCustomer,
}
