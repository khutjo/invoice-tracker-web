import { onActivated, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { dashboardApi, type DashboardSummary } from '../api'
import { invoicesApi, type InvoiceSummary } from 'src/features/invoices/api'
import { useCustomerNames } from 'src/features/invoices/composables/useCustomerNames'
import { useNotificationFeedStore } from 'src/features/notifications/store'
import { ApiError } from 'src/shared/api/problem'

const LIVE_RELOAD_DEBOUNCE_MS = 500

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

  const notificationFeedStore = useNotificationFeedStore()

  const {
    resolveCustomerIds,
    setCustomerName,
    isCustomerLoading,
    getCustomerName,
  } = useCustomerNames()

  let activeController: AbortController | null = null
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  function clearDebounceTimer() {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }

  function abortInFlight() {
    if (activeController) {
      activeController.abort()
      activeController = null
    }
  }

  async function reload(options?: { background?: boolean }): Promise<void> {
    clearDebounceTimer()
    abortInFlight()
    const controller = new AbortController()
    activeController = controller
    const { signal } = controller

    const isBackground = Boolean(options?.background)

    if (!isBackground || summary.value === null) {
      loadingSummary.value = true
    }
    if (!isBackground) {
      loadingRecentInvoices.value = true
    }
    summaryError.value = null
    recentInvoicesError.value = null

    const summaryTask = (async () => {
      try {
        const res = await dashboardApi.getDashboardSummary(signal)
        if (signal.aborted) return
        summary.value = res
      } catch (err) {
        if (isAbortedError(err, signal)) return
        if (!isBackground || summary.value === null) {
          summaryError.value =
            err instanceof ApiError && err.message
              ? err.message
              : "Couldn't load the summary."
        }
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
        if (!isBackground) {
          recentInvoicesError.value =
            err instanceof ApiError && err.message
              ? err.message
              : "Couldn't load recent invoices."
        }
      } finally {
        if (!signal.aborted) {
          loadingRecentInvoices.value = false
        }
      }
    })()

    await Promise.all([summaryTask, recentTask])
  }

  watch(
    () => notificationFeedStore.changeVersion,
    () => {
      clearDebounceTimer()
      debounceTimer = setTimeout(() => {
        debounceTimer = null
        void reload({ background: true })
      }, LIVE_RELOAD_DEBOUNCE_MS)
    },
  )

  onMounted(() => {
    void reload()
  })

  onActivated(() => {
    void reload()
  })

  onBeforeUnmount(() => {
    clearDebounceTimer()
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
