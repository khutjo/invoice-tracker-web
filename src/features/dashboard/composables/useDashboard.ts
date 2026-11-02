import { onActivated, onBeforeUnmount, onMounted, ref } from 'vue'
import { dashboardApi, type DashboardSummary } from '../api'
import { invoicesApi, type InvoiceSummary } from 'src/features/invoices/api'
import { useCustomerNames } from 'src/features/invoices/composables/useCustomerNames'
import { ApiError } from 'src/shared/api/problem'

function isAbortedError(err: unknown, signal: AbortSignal): boolean {
  if (signal.aborted) {
    return true
  }
  if (err instanceof DOMException && err.name === 'AbortError') {
    return true
  }
  if (err instanceof ApiError && err.message.toLowerCase().includes('abort')) {
    return true
  }
  return false
}

export function useDashboard() {
  const summary = ref<DashboardSummary | null>(null)
  const recentInvoices = ref<InvoiceSummary[]>([])
  const loadingSummary = ref(true)
  const loadingRecentInvoices = ref(true)
  const summaryError = ref<string | null>(null)
  const recentInvoicesError = ref<string | null>(null)

  const {
    resolveCustomerIds,
    setCustomerName,
    isCustomerLoading,
    getCustomerName,
  } = useCustomerNames()

  let activeController: AbortController | null = null

  function abortInFlight() {
    if (activeController) {
      activeController.abort()
      activeController = null
    }
  }

  async function reload(): Promise<void> {
    abortInFlight()
    const controller = new AbortController()
    activeController = controller
    const { signal } = controller

    loadingSummary.value = true
    loadingRecentInvoices.value = true
    summaryError.value = null
    recentInvoicesError.value = null

    const summaryTask = (async () => {
      try {
        const res = await dashboardApi.getDashboardSummary(signal)
        if (signal.aborted) return
        summary.value = res
      } catch (err) {
        if (isAbortedError(err, signal)) return
        summaryError.value =
          err instanceof ApiError && err.message
            ? err.message
            : "Couldn't load the summary."
      } finally {
        if (!signal.aborted) {
          loadingSummary.value = false
        }
      }
    })()

    const recentTask = (async () => {
      try {
        const page = await invoicesApi.searchInvoices(
          { page: 1, pageSize: 5 },
          signal,
        )
        if (signal.aborted) return
        recentInvoices.value = page.items

        const missingCustomerIds: string[] = []
        for (const inv of page.items) {
          if (inv.customerName) {
            setCustomerName(inv.customerId, inv.customerName)
          } else if (inv.customerId) {
            missingCustomerIds.push(inv.customerId)
          }
        }
        if (missingCustomerIds.length > 0) {
          await resolveCustomerIds(missingCustomerIds)
        }
      } catch (err) {
        if (isAbortedError(err, signal)) return
        recentInvoicesError.value =
          err instanceof ApiError && err.message
            ? err.message
            : "Couldn't load recent invoices."
      } finally {
        if (!signal.aborted) {
          loadingRecentInvoices.value = false
        }
      }
    })()

    await Promise.all([summaryTask, recentTask])
  }

  onMounted(() => {
    void reload()
  })

  onActivated(() => {
    void reload()
  })

  onBeforeUnmount(() => {
    abortInFlight()
  })

  return {
    summary,
    recentInvoices,
    loadingSummary,
    loadingRecentInvoices,
    summaryError,
    recentInvoicesError,
    reload,
    isCustomerLoading,
    getCustomerName,
  }
}
