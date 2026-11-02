import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { apiClient } from 'src/shared/api/client'
import { notificationsApi, searchNotifications } from '../api'
import NotificationLogRow from '../components/NotificationLogRow.vue'
import NotificationsPage from '../pages/NotificationsPage.vue'
import { useNotificationFeedStore } from '../store'
import type { NotificationLogItem } from '../types'

const quasarStubs = {
  'q-page': defineComponent({
    name: 'QPage',
    template: '<div class="q-page"><slot /></div>',
  }),
  'q-btn': defineComponent({
    name: 'QBtn',
    props: ['label', 'disable', 'loading', 'to'],
    emits: ['click'],
    template:
      '<button type="button" :disabled="disable || loading" @click="$emit(\'click\')">{{ label }}<slot /></button>',
  }),
  'q-input': defineComponent({
    name: 'QInput',
    props: ['modelValue', 'placeholder', 'type'],
    emits: ['update:modelValue', 'clear'],
    template:
      '<input :value="modelValue" :placeholder="placeholder" :type="type || \'text\'" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  }),
  'q-icon': defineComponent({
    name: 'QIcon',
    props: ['name'],
    template: '<span class="q-icon">{{ name }}</span>',
  }),
  'q-tooltip': defineComponent({
    name: 'QTooltip',
    template: '<span class="q-tooltip"><slot /></span>',
  }),
  'q-skeleton': defineComponent({
    name: 'QSkeleton',
    template: '<div class="q-skeleton" />',
  }),
}

const qMock = {
  screen: { xs: false, lt: { sm: false, md: false }, gt: { xs: true, sm: true } },
  notify: vi.fn(),
}

function makeLogItem(
  overrides: Partial<NotificationLogItem> = {},
): NotificationLogItem {
  return {
    notificationId: 'log-1',
    invoiceId: 'inv-42',
    invoiceNumber: 'INV-2026-0042',
    customerName: 'Highveld Logistics (Pty) Ltd',
    notificationType: 'InvoiceSent',
    channel: 'Email',
    recipient: 'accounts@highveld.co.za',
    status: 'Sent',
    attempts: 1,
    body: 'Dear Highveld,\nPlease find attached <b>INV-2026-0042</b>.',
    createdAt: '2026-11-02T09:00:00Z',
    sentAt: '2026-11-02T09:00:03Z',
    ...overrides,
  }
}

async function mountNotificationsPage(initialPath = '/notifications') {
  const pinia = createPinia()
  setActivePinia(pinia)

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/notifications', component: NotificationsPage },
      {
        path: '/invoices/:invoiceId',
        component: { template: '<div>Invoice Detail</div>' },
      },
    ],
  })

  await router.push(initialPath)
  await router.isReady()

  const feedStore = useNotificationFeedStore()
  feedStore.unreadCount = 5

  const wrapper = mount(NotificationsPage, {
    global: {
      plugins: [pinia, router],
      stubs: quasarStubs,
      provide: { _q_: qMock },
      mocks: { $q: qMock },
    },
  })

  return { wrapper, router, feedStore }
}

describe('Notifications API, NotificationLogRow & NotificationsPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('searchNotifications builds the URL correctly and drops empty filters', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      totalCount: 0,
    })

    await searchNotifications({
      page: 2,
      pageSize: 20,
      type: 'InvoiceSent',
      status: '',
      invoiceId: '   ',
      search: 'Highveld',
    })

    expect(getSpy).toHaveBeenCalledWith(
      '/notifications?page=2&pageSize=20&type=InvoiceSent&search=Highveld',
      undefined,
    )
  })

  it('NotificationLogRow renders "Failed after N attempts" for Failed and "Sending…" for Pending', () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/invoices/:invoiceId', component: { template: '<div />' } }],
    })

    const failedWrapper = mount(NotificationLogRow, {
      props: {
        item: makeLogItem({ status: 'Failed', attempts: 3 }),
        mode: 'compact',
      },
      global: {
        plugins: [router],
        stubs: quasarStubs,
      },
    })
    expect(
      failedWrapper.get('[data-testid="notification-status-pill"]').text(),
    ).toBe('Failed after 3 attempts')

    const pendingWrapper = mount(NotificationLogRow, {
      props: {
        item: makeLogItem({ status: 'Pending', attempts: 1, sentAt: null }),
        mode: 'compact',
      },
      global: {
        plugins: [router],
        stubs: quasarStubs,
      },
    })
    expect(
      pendingWrapper.get('[data-testid="notification-status-pill"]').text(),
    ).toBe('Sending…')
  })

  it('renders rows on NotificationsPage, calls markAllRead on mount, expands body as literal text, and updates URL query on filter change resetting to page 1', async () => {
    const searchSpy = vi
      .spyOn(notificationsApi, 'searchNotifications')
      .mockResolvedValue({
        items: [
          makeLogItem({
            notificationId: 'log-1',
            body: 'Hello <b>World</b> & Co.',
          }),
          makeLogItem({
            notificationId: 'log-2',
            invoiceNumber: 'INV-2026-0043',
            notificationType: 'PaymentReceived',
          }),
        ],
        page: 1,
        pageSize: 20,
        totalCount: 2,
      })

    const { wrapper, router, feedStore } = await mountNotificationsPage(
      '/notifications?page=2',
    )
    await flushPromises()

    // markAllRead called on mount
    expect(feedStore.unreadCount).toBe(0)
    expect(searchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, pageSize: 20 }),
      expect.any(AbortSignal),
    )

    const rows = wrapper.findAll('[data-testid="notification-log-row"]')
    expect(rows).toHaveLength(2)

    // Clicking row 1 expands body literally (shows <b>World</b> as text, not HTML)
    await rows[0]!.trigger('click')
    const bodyEl = wrapper.get('[data-testid="notification-log-body"]')
    expect(bodyEl.text()).toBe('Hello <b>World</b> & Co.')
    expect(bodyEl.find('b').exists()).toBe(false)

    // Clicking row 2 collapses row 1 and expands row 2 (only one expanded at a time)
    await rows[1]!.trigger('click')
    const openBodies = wrapper.findAll('[data-testid="notification-log-body"]')
    expect(openBodies).toHaveLength(1)

    // Changing Type filter updates URL query and resets page to 1
    const typeSelect = wrapper.get('[data-testid="notifications-type-select"]')
    await typeSelect.setValue('PaymentReceived')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({
      type: 'PaymentReceived',
    })
  })

  it('renders empty state, filtered-empty state, and inline error banner while keeping existing rows visible', async () => {
    // 1. Empty state (no filters)
    const searchSpy = vi
      .spyOn(notificationsApi, 'searchNotifications')
      .mockResolvedValueOnce({
        items: [],
        page: 1,
        pageSize: 20,
        totalCount: 0,
      })

    const { wrapper, router } = await mountNotificationsPage('/notifications')
    await flushPromises()

    expect(wrapper.find('[data-testid="notifications-empty-all"]').exists()).toBe(
      true,
    )
    expect(wrapper.get('[data-testid="notifications-empty-all"]').text()).toContain(
      'No messages yet. Sending an invoice emails your customer and the message appears here.',
    )

    // 2. Filtered empty state
    searchSpy.mockResolvedValueOnce({
      items: [],
      page: 1,
      pageSize: 20,
      totalCount: 0,
    })
    await router.replace({ path: '/notifications', query: { status: 'Failed' } })
    await flushPromises()

    expect(
      wrapper.find('[data-testid="notifications-empty-filters"]').exists(),
    ).toBe(true)

    // 3. Loaded rows followed by a failed refetch -> inline error banner + old rows remain visible
    searchSpy.mockResolvedValueOnce({
      items: [makeLogItem()],
      page: 1,
      pageSize: 20,
      totalCount: 1,
    })
    await wrapper
      .get('[data-testid="notifications-empty-clear-filters"]')
      .trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[data-testid="notification-log-row"]')).toHaveLength(1)

    searchSpy.mockRejectedValueOnce(new Error('Network glitch'))
    await wrapper
      .get('[data-testid="notifications-status-select"]')
      .setValue('Sent')
    await flushPromises()

    expect(
      wrapper.find('[data-testid="notifications-error-banner"]').exists(),
    ).toBe(true)
    expect(wrapper.findAll('[data-testid="notification-log-row"]')).toHaveLength(1)
  })

  it('refetches quietly without showing skeletons when feedStore.changeVersion bumps', async () => {
    vi.useFakeTimers()
    const searchSpy = vi
      .spyOn(notificationsApi, 'searchNotifications')
      .mockResolvedValueOnce({
        items: [makeLogItem({ notificationId: 'log-1' })],
        page: 1,
        pageSize: 20,
        totalCount: 1,
      })

    const { wrapper, feedStore } = await mountNotificationsPage('/notifications')
    await flushPromises()

    expect(wrapper.findAll('[data-testid="notification-log-row"]')).toHaveLength(1)

    // Prepare a slow response for the background refetch
    let resolveRefetch!: (val: {
      items: NotificationLogItem[]
      page: number
      pageSize: number
      totalCount: number
    }) => void
    searchSpy.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRefetch = resolve
      }),
    )

    feedStore.changeVersion += 1
    await vi.advanceTimersByTimeAsync(500)

    // While background refetch is in flight, no skeleton is shown and old row stays visible
    expect(
      wrapper.find('[data-testid="notifications-loading-skeleton"]').exists(),
    ).toBe(false)
    expect(wrapper.findAll('[data-testid="notification-log-row"]')).toHaveLength(1)

    resolveRefetch({
      items: [
        makeLogItem({ notificationId: 'log-new' }),
        makeLogItem({ notificationId: 'log-1' }),
      ],
      page: 1,
      pageSize: 20,
      totalCount: 2,
    })
    await flushPromises()

    const rowsAfter = wrapper.findAll('[data-testid="notification-log-row"]')
    expect(rowsAfter).toHaveLength(2)
    expect(rowsAfter[0]!.classes()).toContain('notification-row--highlighted')
  })
})
