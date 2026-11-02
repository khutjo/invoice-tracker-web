import { apiClient } from 'src/shared/api/client'
import type { Paged } from 'src/shared/api/types'
import type {
  NotificationLogItem,
  NotificationStatus,
  NotificationType,
} from './types'

export interface NotificationQuery {
  page?: number
  pageSize?: number
  type?: NotificationType | ''
  status?: NotificationStatus | ''
  invoiceId?: string
  search?: string
}

export async function searchNotifications(
  query: NotificationQuery = {},
  signal?: AbortSignal,
): Promise<Paged<NotificationLogItem>> {
  const params = new URLSearchParams()

  if (query.page !== undefined) {
    params.set('page', String(query.page))
  }
  if (query.pageSize !== undefined) {
    params.set('pageSize', String(query.pageSize))
  }
  if (query.type && query.type.trim().length > 0) {
    params.set('type', query.type.trim())
  }
  if (query.status && query.status.trim().length > 0) {
    params.set('status', query.status.trim())
  }
  if (query.invoiceId && query.invoiceId.trim().length > 0) {
    params.set('invoiceId', query.invoiceId.trim())
  }
  if (query.search && query.search.trim().length > 0) {
    params.set('search', query.search.trim())
  }

  const qs = params.toString()
  const path = qs ? `/notifications?${qs}` : '/notifications'

  return apiClient.get<Paged<NotificationLogItem>>(
    path,
    signal !== undefined ? { signal } : undefined,
  )
}

export const notificationsApi = {
  searchNotifications,
}
