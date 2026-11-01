import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { LocationQueryRaw } from 'vue-router'
import {
  invoicesApi,
  type InvoiceStatus,
  type InvoiceSummary,
  type SearchInvoicesParams,
} from './api'
import { mapProblemDetails } from 'src/shared/api/problem'
import type { Paged } from 'src/shared/api/types'

export interface InvoicesListQueryState {
  status: InvoiceStatus | ''
  customerId: string
  issuedFrom: string
  issuedTo: string
  overdueOnly: boolean
  search: string
  page: number
  pageSize: number
}

export const useInvoicesStore = defineStore('invoices', () => {
  const query = ref<InvoicesListQueryState>({
    status: '',
    customerId: '',
    issuedFrom: '',
    issuedTo: '',
    overdueOnly: false,
    search: '',
    page: 1,
    pageSize: 20,
  })

  const pageResult = ref<Paged<InvoiceSummary> | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const hasConflict = ref(false)
  const lastListRouteQuery = ref<LocationQueryRaw>({})

  let activeAbortController: AbortController | null = null
  let activeRequestId = 0

  function setLastListRouteQuery(routeQuery: LocationQueryRaw) {
    lastListRouteQuery.value = { ...routeQuery }
  }

  function clearConflict() {
    hasConflict.value = false
  }

  function markConflict() {
    hasConflict.value = true
  }

  async function fetchInvoicesPage(
    overrides?: Partial<InvoicesListQueryState>,
  ): Promise<Paged<InvoiceSummary> | null> {
    if (overrides) {
      query.value = {
        ...query.value,
        ...overrides,
      }
    }

    if (activeAbortController) {
      activeAbortController.abort()
    }

    const controller = new AbortController()
    activeAbortController = controller
    const requestId = ++activeRequestId

    loading.value = true
    error.value = null

    const params: SearchInvoicesParams = {
      page: query.value.page,
      pageSize: query.value.pageSize,
      status: query.value.status,
      customerId: query.value.customerId,
      issuedFrom: query.value.issuedFrom,
      issuedTo: query.value.issuedTo,
      overdueOnly: query.value.overdueOnly,
      search: query.value.search,
    }

    try {
      const result = await invoicesApi.searchInvoices(params, controller.signal)
      if (requestId !== activeRequestId) {
        return null
      }
      pageResult.value = result
      return result
    } catch (err) {
      if (
        controller.signal.aborted ||
        (err instanceof DOMException && err.name === 'AbortError') ||
        (err instanceof Error && err.name === 'AbortError')
      ) {
        return null
      }

      if (requestId === activeRequestId) {
        const mapped = mapProblemDetails(err)
        error.value = mapped.title || "Couldn't load invoices."
      }
      return null
    } finally {
      if (requestId === activeRequestId) {
        loading.value = false
        activeAbortController = null
      }
    }
  }

  return {
    query,
    pageResult,
    loading,
    error,
    hasConflict,
    lastListRouteQuery,
    setLastListRouteQuery,
    clearConflict,
    markConflict,
    fetchInvoicesPage,
  }
})
