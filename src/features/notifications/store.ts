import { ref } from 'vue'
import { defineStore } from 'pinia'
import { HubConnectionBuilder, LogLevel, type HubConnection } from '@microsoft/signalr'
import { Notify } from 'quasar'
import { useSessionStore } from 'src/features/auth/store'
import { getAppRouter } from 'src/router/instance'
import { describeNotification, type NotificationSentMessage } from './types'

export type NotificationConnectionStatus =
  'disconnected' | 'connecting' | 'connected' | 'reconnecting'

const INITIAL_RETRY_DELAYS_MS = [2000, 5000, 10000, 30000] as const
const MAX_LATEST_MESSAGES = 20
const TOKEN_EXPIRY_BUFFER_MS = 30_000

export const useNotificationFeedStore = defineStore('notificationFeed', () => {
  const status = ref<NotificationConnectionStatus>('disconnected')
  const unreadCount = ref(0)
  const latest = ref<NotificationSentMessage[]>([])
  const changeVersion = ref(0)
  const lastInvoiceId = ref<string | null>(null)
  const hasFailedStart = ref(false)

  let connection: HubConnection | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let retryAttempt = 0
  let manuallyDisconnected = false

  function clearRetryTimer() {
    if (retryTimer !== null) {
      clearTimeout(retryTimer)
      retryTimer = null
    }
  }

  async function resolveAccessToken(): Promise<string> {
    const sessionStore = useSessionStore()
    const now = Date.now()
    const tokenMissing = !sessionStore.accessToken
    const expiringSoon =
      !sessionStore.expiresAt || sessionStore.expiresAt - now <= TOKEN_EXPIRY_BUFFER_MS

    if (tokenMissing || expiringSoon) {
      const refreshed = await sessionStore.refreshSession()
      return refreshed ?? ''
    }

    return sessionStore.accessToken ?? ''
  }

  function handleNotificationSent(message: NotificationSentMessage) {
    latest.value = [message, ...latest.value].slice(0, MAX_LATEST_MESSAGES)
    unreadCount.value += 1
    lastInvoiceId.value = message.invoiceId
    changeVersion.value += 1

    Notify.create?.({
      message: describeNotification(message),
      icon: 'notifications_active',
      actions: [
        {
          label: 'View',
          color: 'white',
          noCaps: true,
          handler: () => {
            const router = getAppRouter()
            if (router) {
              void router.push(`/invoices/${encodeURIComponent(message.invoiceId)}`)
            }
          },
        },
      ],
    })
  }

  function ensureConnection(): HubConnection {
    if (connection) {
      return connection
    }

    const built = new HubConnectionBuilder()
      .withUrl('/hubs/notifications', {
        accessTokenFactory: resolveAccessToken,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    built.on('notificationSent', handleNotificationSent)

    built.onreconnecting(() => {
      status.value = 'reconnecting'
    })

    built.onreconnected(() => {
      status.value = 'connected'
      hasFailedStart.value = false
      changeVersion.value += 1
    })

    built.onclose(() => {
      if (!manuallyDisconnected) {
        status.value = 'disconnected'
      }
    })

    connection = built
    return built
  }

  function scheduleStartRetry() {
    clearRetryTimer()
    const sessionStore = useSessionStore()
    if (manuallyDisconnected || !sessionStore.isAuthenticated) {
      return
    }

    const delayIndex = Math.min(retryAttempt, INITIAL_RETRY_DELAYS_MS.length - 1)
    const delayMs = INITIAL_RETRY_DELAYS_MS[delayIndex] ?? 30000
    retryAttempt += 1

    retryTimer = setTimeout(() => {
      retryTimer = null
      const currentSession = useSessionStore()
      if (!manuallyDisconnected && currentSession.isAuthenticated) {
        void connect()
      }
    }, delayMs)
  }

  async function connect(): Promise<void> {
    const sessionStore = useSessionStore()
    if (!sessionStore.isAuthenticated) {
      return
    }
    if (status.value === 'connected' || status.value === 'connecting') {
      return
    }

    manuallyDisconnected = false
    clearRetryTimer()
    status.value = 'connecting'

    const conn = ensureConnection()

    try {
      await conn.start()
      if (manuallyDisconnected) {
        await conn.stop()
        return
      }
      status.value = 'connected'
      hasFailedStart.value = false
      retryAttempt = 0
    } catch {
      status.value = 'disconnected'
      hasFailedStart.value = true
      scheduleStartRetry()
    }
  }

  async function disconnect(): Promise<void> {
    manuallyDisconnected = true
    clearRetryTimer()
    retryAttempt = 0
    hasFailedStart.value = false

    const activeConn = connection
    connection = null

    status.value = 'disconnected'
    unreadCount.value = 0
    latest.value = []
    lastInvoiceId.value = null

    if (activeConn) {
      try {
        await activeConn.stop()
      } catch {
        // Ignore errors while stopping connection
      }
    }
  }

  function markAllRead(): void {
    unreadCount.value = 0
  }

  return {
    status,
    unreadCount,
    latest,
    changeVersion,
    lastInvoiceId,
    hasFailedStart,
    connect,
    disconnect,
    markAllRead,
  }
})
