import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { LocationQueryRaw } from 'vue-router'
import { customersApi, type CustomerDetails, type CustomerSummary, type Paged } from './api'

export interface CustomersListQueryState {
  search: string
  page: number
  pageSize: number
  includeArchived: boolean
}

export const useCustomersStore = defineStore('customers', () => {
  const query = ref<CustomersListQueryState>({
    search: '',
    page: 1,
    pageSize: 20,
    includeArchived: false,
  })

  const pageData = ref<Paged<CustomerSummary>>({
    items: [],
    page: 1,
    pageSize: 20,
    totalCount: 0,
  })

  const loading = ref(false)
  const error = ref<string | null>(null)
  const conflict = ref(false)
  const lastListRouteQuery = ref<LocationQueryRaw>({})

  let activeAbortController: AbortController | null = null
  let latestRequestId = 0

  async function fetchCustomersPage(
    params?: Partial<CustomersListQueryState>,
  ): Promise<Paged<CustomerSummary> | null> {
    if (params) {
      query.value = {
        ...query.value,
        ...params,
      }
    }

    if (activeAbortController) {
      activeAbortController.abort()
    }

    const controller = new AbortController()
    activeAbortController = controller
    const requestId = ++latestRequestId

    loading.value = true
    error.value = null

    try {
      const response = await customersApi.searchCustomers({
        search: query.value.search,
        page: query.value.page,
        pageSize: query.value.pageSize,
        includeArchived: query.value.includeArchived,
        signal: controller.signal,
      })

      if (requestId !== latestRequestId) {
        return null
      }

      pageData.value = response
      return response
    } catch (err) {
      if (
        requestId !== latestRequestId ||
        (err instanceof DOMException && err.name === 'AbortError')
      ) {
        return null
      }
      error.value =
        err instanceof Error && err.message
          ? err.message
          : "We couldn't load your customers. Please try again."
      return null
    } finally {
      if (requestId === latestRequestId) {
        loading.value = false
      }
    }
  }

  function updateSummaryRowFromDetails(details: CustomerDetails) {
    const idx = pageData.value.items.findIndex((item) => item.customerId === details.customerId)
    if (idx === -1) return

    const updatedSummary: CustomerSummary = {
      customerId: details.customerId,
      name: details.name,
      email: details.email,
      phoneNumber: details.contactNumber?.number ?? null,
      city: details.billingAddress?.city ?? null,
      customerReference: details.customerReference,
      isArchived: details.isArchived,
    }

    const nextItems = [...pageData.value.items]
    nextItems[idx] = updatedSummary
    pageData.value = {
      ...pageData.value,
      items: nextItems,
    }
  }

  function setLastListRouteQuery(routeQuery: LocationQueryRaw) {
    lastListRouteQuery.value = { ...routeQuery }
  }

  return {
    query,
    pageData,
    loading,
    error,
    conflict,
    lastListRouteQuery,
    fetchCustomersPage,
    updateSummaryRowFromDetails,
    setLastListRouteQuery,
  }
})
