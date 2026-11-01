import { reactive } from 'vue'
import { getCustomer } from 'src/features/customers/api'

const cachedCustomerNames = reactive<Record<string, string>>({})
const loadingCustomerIds = reactive<Record<string, boolean>>({})
const inFlightRequests = new Map<string, Promise<void>>()

export function resetCustomerNamesCache(): void {
  for (const key of Object.keys(cachedCustomerNames)) {
    delete cachedCustomerNames[key]
  }
  for (const key of Object.keys(loadingCustomerIds)) {
    delete loadingCustomerIds[key]
  }
  inFlightRequests.clear()
}

export function useCustomerNames() {
  async function resolveCustomerIds(ids: ReadonlyArray<string>): Promise<void> {
    const distinctIds = Array.from(
      new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0)),
    )

    const tasks: Promise<void>[] = []

    for (const customerId of distinctIds) {
      if (customerId in cachedCustomerNames) {
        continue
      }
      const existingTask = inFlightRequests.get(customerId)
      if (existingTask) {
        tasks.push(existingTask)
        continue
      }

      loadingCustomerIds[customerId] = true
      const task = (async () => {
        try {
          const customer = await getCustomer(customerId)
          cachedCustomerNames[customerId] = customer.name || 'Unknown customer'
        } catch {
          cachedCustomerNames[customerId] = 'Unknown customer'
        } finally {
          loadingCustomerIds[customerId] = false
          inFlightRequests.delete(customerId)
        }
      })()

      inFlightRequests.set(customerId, task)
      tasks.push(task)
    }

    if (tasks.length > 0) {
      await Promise.all(tasks)
    }
  }

  function setCustomerName(customerId: string, name: string): void {
    if (!customerId) return
    cachedCustomerNames[customerId] = name
    loadingCustomerIds[customerId] = false
  }

  function isCustomerLoading(customerId: string): boolean {
    if (!customerId) return false
    return Boolean(loadingCustomerIds[customerId]) && !(customerId in cachedCustomerNames)
  }

  function getCustomerName(customerId: string): string {
    if (!customerId) return 'Unknown customer'
    return cachedCustomerNames[customerId] ?? 'Unknown customer'
  }

  return {
    names: cachedCustomerNames,
    loadingIds: loadingCustomerIds,
    resolveCustomerIds,
    setCustomerName,
    isCustomerLoading,
    getCustomerName,
  }
}
