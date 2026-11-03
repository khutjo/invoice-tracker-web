import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { Notify } from 'quasar'
import { useSessionStore } from 'src/features/auth/store'
import { setAppRouter } from 'src/router/instance'
import AppShellLayout from 'src/shared/layout/AppShellLayout.vue'
import { useNotificationFeedStore } from '../store'
import {
  describeNotification,
  type NotificationChannel,
  type NotificationSentMessage,
  type NotificationType,
} from '../types'

interface FakeConnectionRecord {
  url: string
  accessTokenFactory?: () => string | Promise<string>
  handlers: Map<string, Array<(payload: NotificationSentMessage) => void>>
  reconnectingHandlers: Array<() => void>
  reconnectedHandlers: Array<() => void>
  closeHandlers: Array<() => void>
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
  triggerNotificationSent: (payload: NotificationSentMessage) => void
  triggerReconnected: () => void
  triggerReconnecting: () => void
}

const createdConnections: FakeConnectionRecord[] = []
let nextStartImpl: () => Promise<void> = () => Promise.resolve()

vi.mock('@microsoft/signalr', () => {
  class FakeHubConnectionBuilder {
    private url = ''
    private accessTokenFactory?: () => string | Promise<string>

    withUrl(url: string, options?: { accessTokenFactory?: () => string | Promise<string> }) {
      this.url = url
      if (options?.accessTokenFactory) {
        this.accessTokenFactory = options.accessTokenFactory
      }
      return this
    }

    withAutomaticReconnect() {
      return this
    }

    configureLogging() {
      return this
    }

    build() {
      const handlers = new Map<string, Array<(payload: NotificationSentMessage) => void>>()
      const reconnectingHandlers: Array<() => void> = []
      const reconnectedHandlers: Array<() => void> = []
      const closeHandlers: Array<() => void> = []

      const record: FakeConnectionRecord = {
        url: this.url,
        ...(this.accessTokenFactory ? { accessTokenFactory: this.accessTokenFactory } : {}),
        handlers,
        reconnectingHandlers,
        reconnectedHandlers,
        closeHandlers,
        start: vi.fn(() => nextStartImpl()),
        stop: vi.fn(() => Promise.resolve()),
        triggerNotificationSent(payload: NotificationSentMessage) {
          for (const fn of handlers.get('notificationSent') ?? []) {
            fn(payload)
          }
        },
        triggerReconnected() {
          for (const fn of reconnectedHandlers) {
            fn()
          }
        },
        triggerReconnecting() {
          for (const fn of reconnectingHandlers) {
            fn()
          }
        },
      }

      createdConnections.push(record)

      return {
        on(eventName: string, callback: (payload: NotificationSentMessage) => void) {
          const list = handlers.get(eventName) ?? []
          list.push(callback)
          handlers.set(eventName, list)
        },
        onreconnecting(callback: () => void) {
          reconnectingHandlers.push(callback)
        },
        onreconnected(callback: () => void) {
          reconnectedHandlers.push(callback)
        },
        onclose(callback: () => void) {
          closeHandlers.push(callback)
        },
        start: record.start,
        stop: record.stop,
      }
    }
  }

  return {
    HubConnectionBuilder: FakeHubConnectionBuilder,
    LogLevel: {
      Warning: 3,
    },
  }
})

function makeMessage(overrides: Partial<NotificationSentMessage> = {}): NotificationSentMessage {
  return {
    notificationId: 'notif-1',
    invoiceId: 'inv-42',
    invoiceNumber: 'INV-2026-0042',
    customerName: 'Acme (Pty) Ltd',
    notificationType: 'InvoiceSent',
    channel: 'Email',
    recipient: 'billing@acme.co.za',
    sentAt: '2026-11-02T10:00:00Z',
    ...overrides,
  }
}

describe('notifications: describeNotification & useNotificationFeedStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    createdConnections.length = 0
    nextStartImpl = () => Promise.resolve()
    vi.restoreAllMocks()
    Notify.create = vi.fn(() => () => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    setAppRouter(null)
  })

  it('describes every notification type with and without an invoice number for both Email and Sms channels', () => {
    const cases: Array<{
      type: NotificationType
      withNumber: string
      withoutNumber: string
    }> = [
      {
        type: 'InvoiceSent',
        withNumber: 'Invoice INV-2026-0042 sent to Acme (Pty) Ltd',
        withoutNumber: 'Invoice an invoice sent to Acme (Pty) Ltd',
      },
      {
        type: 'PaymentReceived',
        withNumber: 'Payment received for INV-2026-0042 from Acme (Pty) Ltd',
        withoutNumber: 'Payment received for an invoice from Acme (Pty) Ltd',
      },
      {
        type: 'OverdueReminder1',
        withNumber: 'Overdue reminder sent to Acme (Pty) Ltd for INV-2026-0042',
        withoutNumber: 'Overdue reminder sent to Acme (Pty) Ltd for an invoice',
      },
      {
        type: 'OverdueReminder2',
        withNumber: 'Second overdue reminder sent to Acme (Pty) Ltd for INV-2026-0042',
        withoutNumber: 'Second overdue reminder sent to Acme (Pty) Ltd for an invoice',
      },
      {
        type: 'OverdueFinal',
        withNumber: 'Final overdue notice sent to Acme (Pty) Ltd for INV-2026-0042',
        withoutNumber: 'Final overdue notice sent to Acme (Pty) Ltd for an invoice',
      },
      {
        type: 'InvoiceCancelled',
        withNumber: 'Cancellation notice sent to Acme (Pty) Ltd for INV-2026-0042',
        withoutNumber: 'Cancellation notice sent to Acme (Pty) Ltd for an invoice',
      },
    ]

    const channels: Array<{ channel: NotificationChannel; suffix: string }> = [
      { channel: 'Email', suffix: ' by email' },
      { channel: 'Sms', suffix: ' by SMS' },
    ]

    for (const c of cases) {
      for (const ch of channels) {
        expect(
          describeNotification(
            makeMessage({
              notificationType: c.type,
              invoiceNumber: 'INV-2026-0042',
              channel: ch.channel,
            }),
          ),
        ).toBe(`${c.withNumber}${ch.suffix}`)

        expect(
          describeNotification(
            makeMessage({
              notificationType: c.type,
              invoiceNumber: null,
              channel: ch.channel,
            }),
          ),
        ).toBe(`${c.withoutNumber}${ch.suffix}`)
      }
    }
  })

  it('increments unreadCount and changeVersion on notificationSent, prepends and caps latest at 20, and calls Notify.create with a View action', async () => {
    const sessionStore = useSessionStore()
    sessionStore.accessToken = 'jwt-token'
    sessionStore.expiresAt = Date.now() + 600_000

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/dashboard', component: { template: '<div>Dash</div>' } },
        {
          path: '/invoices/:invoiceId',
          component: { template: '<div>Invoice</div>' },
        },
      ],
    })
    await router.push('/dashboard')
    await router.isReady()
    setAppRouter(router)

    const notifySpy = vi.spyOn(Notify, 'create')
    const store = useNotificationFeedStore()
    await store.connect()

    expect(createdConnections).toHaveLength(1)
    const conn = createdConnections[0]!

    for (let i = 1; i <= 25; i++) {
      conn.triggerNotificationSent(
        makeMessage({
          notificationId: `n-${i}`,
          invoiceId: `inv-${i}`,
          invoiceNumber: `INV-2026-00${i}`,
        }),
      )
    }

    expect(store.unreadCount).toBe(25)
    expect(store.changeVersion).toBe(25)
    expect(store.lastInvoiceId).toBe('inv-25')
    expect(store.latest).toHaveLength(20)
    expect(store.latest[0]!.notificationId).toBe('n-25')
    expect(store.latest[19]!.notificationId).toBe('n-6')

    expect(notifySpy).toHaveBeenCalledTimes(25)
    const lastCallArg = notifySpy.mock.calls[24]?.[0] as {
      message: string
      icon: string
      actions: Array<{ label: string; handler: () => void }>
    }
    expect(lastCallArg.icon).toBe('notifications_active')
    expect(lastCallArg.message).toBe('Invoice INV-2026-0025 sent to Acme (Pty) Ltd by email')
    expect(lastCallArg.actions[0]?.label).toBe('View')

    lastCallArg.actions[0]?.handler()
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/invoices/inv-25')
  })

  it('onreconnected increments changeVersion but not unreadCount', async () => {
    const sessionStore = useSessionStore()
    sessionStore.accessToken = 'jwt-token'
    sessionStore.expiresAt = Date.now() + 600_000

    const store = useNotificationFeedStore()
    await store.connect()

    const conn = createdConnections[0]!
    conn.triggerReconnecting()
    expect(store.status).toBe('reconnecting')

    conn.triggerReconnected()
    expect(store.status).toBe('connected')
    expect(store.changeVersion).toBe(1)
    expect(store.unreadCount).toBe(0)
  })

  it('connect() twice creates one connection, and disconnect() stops it and resets state', async () => {
    const sessionStore = useSessionStore()
    sessionStore.accessToken = 'jwt-token'
    sessionStore.expiresAt = Date.now() + 600_000

    const store = useNotificationFeedStore()
    await store.connect()
    await store.connect()

    expect(createdConnections).toHaveLength(1)
    const conn = createdConnections[0]!
    expect(conn.start).toHaveBeenCalledTimes(1)

    conn.triggerNotificationSent(makeMessage())
    expect(store.unreadCount).toBe(1)

    await store.disconnect()
    expect(conn.stop).toHaveBeenCalledTimes(1)
    expect(store.status).toBe('disconnected')
    expect(store.unreadCount).toBe(0)
    expect(store.latest).toEqual([])
    expect(store.lastInvoiceId).toBeNull()
  })

  it('schedules a retry with backoff on failed first start(), shows no toast, and disconnect() cancels the retry', async () => {
    vi.useFakeTimers()
    const notifySpy = vi.spyOn(Notify, 'create')

    const sessionStore = useSessionStore()
    sessionStore.accessToken = 'jwt-token'
    sessionStore.expiresAt = Date.now() + 600_000

    nextStartImpl = () => Promise.reject(new Error('Service unavailable'))

    const store = useNotificationFeedStore()
    await store.connect()

    expect(store.status).toBe('disconnected')
    expect(notifySpy).not.toHaveBeenCalled()
    expect(createdConnections).toHaveLength(1)
    expect(createdConnections[0]!.start).toHaveBeenCalledTimes(1)

    // First retry at 2000ms
    await vi.advanceTimersByTimeAsync(2000)
    expect(createdConnections[0]!.start).toHaveBeenCalledTimes(2)

    // disconnect() cancels the pending 5000ms retry
    await store.disconnect()
    await vi.advanceTimersByTimeAsync(10000)
    expect(createdConnections[0]!.start).toHaveBeenCalledTimes(2)
  })

  it('accessTokenFactory calls refreshSession() when the token expires within 30s and returns stored token otherwise', async () => {
    const sessionStore = useSessionStore()
    sessionStore.accessToken = 'fresh-token'
    sessionStore.expiresAt = Date.now() + 120_000 // 2 minutes remaining

    const refreshSpy = vi.spyOn(sessionStore, 'refreshSession').mockResolvedValue('refreshed-token')

    const store = useNotificationFeedStore()
    await store.connect()

    const factory = createdConnections[0]!.accessTokenFactory!
    expect(await factory()).toBe('fresh-token')
    expect(refreshSpy).not.toHaveBeenCalled()

    // Token expiring within 30s (e.g. 15s left)
    sessionStore.expiresAt = Date.now() + 15_000
    expect(await factory()).toBe('refreshed-token')
    expect(refreshSpy).toHaveBeenCalledTimes(1)
  })

  it('renders the nav badge in AppShellLayout as hidden at 0, exact count up to 9, and 9+ above 9', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const sessionStore = useSessionStore()
    sessionStore.accessToken = 'jwt-token'
    sessionStore.expiresAt = Date.now() + 600_000

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/',
          component: AppShellLayout,
          children: [
            { path: 'dashboard', component: { template: '<div>Dash</div>' } },
            {
              path: 'notifications',
              component: { template: '<div>Notifications</div>' },
            },
          ],
        },
      ],
    })
    await router.push('/dashboard')
    await router.isReady()

    const qMock = {
      screen: { xs: false, lt: { md: false }, gt: { sm: true } },
      dark: { isActive: false, toggle: vi.fn() },
    }

    const wrapper = mount(AppShellLayout, {
      global: {
        plugins: [pinia, router],
        stubs: {
          'q-layout': defineComponent({
            template: '<div class="q-layout"><slot /></div>',
          }),
          'q-drawer': defineComponent({
            template: '<aside class="q-drawer"><slot /></aside>',
          }),
          'q-header': defineComponent({
            template: '<header class="q-header"><slot /></header>',
          }),
          'q-footer': defineComponent({
            template: '<footer class="q-footer"><slot /></footer>',
          }),
          'q-page-container': defineComponent({
            template: '<main class="q-page-container"><slot /></main>',
          }),
          'q-btn': defineComponent({
            template: '<button type="button"><slot /></button>',
          }),
          'q-icon': defineComponent({
            props: ['name'],
            template: '<span class="q-icon">{{ name }}</span>',
          }),
          CommandPaletteDialog: defineComponent({
            template: '<div class="command-palette-stub" />',
          }),
        },
        provide: { _q_: qMock },
        mocks: { $q: qMock },
      },
    })

    const feedStore = useNotificationFeedStore()

    // Hidden at 0
    expect(wrapper.find('[data-testid="notifications-unread-badge"]').exists()).toBe(false)

    // Shows exact count when <= 9
    feedStore.unreadCount = 4
    await flushPromises()
    expect(wrapper.get('[data-testid="notifications-unread-badge"]').text()).toBe('4')

    // Shows 9+ when > 9
    feedStore.unreadCount = 12
    await flushPromises()
    expect(wrapper.get('[data-testid="notifications-unread-badge"]').text()).toBe('9+')

    // Navigating to /notifications calls markAllRead() and hides the badge
    await router.push('/notifications')
    await flushPromises()
    expect(feedStore.unreadCount).toBe(0)
    expect(wrapper.find('[data-testid="notifications-unread-badge"]').exists()).toBe(false)
  })
})
