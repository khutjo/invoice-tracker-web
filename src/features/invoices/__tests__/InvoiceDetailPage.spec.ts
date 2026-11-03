import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import * as customersApiModule from 'src/features/customers/api'
import { notificationsApi } from 'src/features/notifications/api'
import { useNotificationFeedStore } from 'src/features/notifications/store'
import { invoicesApi, type InvoiceDetails } from '../api'
import { resetCustomerNamesCache } from '../composables/useCustomerNames'
import InvoiceDetailPage from '../pages/InvoiceDetailPage.vue'

const quasarStubs = {
  'q-page': defineComponent({
    name: 'QPage',
    template: '<div class="q-page"><slot /></div>',
  }),
  'q-card': defineComponent({
    name: 'QCard',
    template: '<div class="q-card"><slot /></div>',
  }),
  'q-dialog': defineComponent({
    name: 'QDialog',
    props: ['modelValue'],
    template: '<div v-if="modelValue" class="q-dialog"><slot /></div>',
  }),
  'q-btn': defineComponent({
    name: 'QBtn',
    props: ['label', 'disable', 'loading', 'to'],
    emits: ['click'],
    template:
      '<button type="button" :disabled="disable || loading" @click="$emit(\'click\')">{{ label }}<slot /></button>',
  }),
  'q-tooltip': defineComponent({
    name: 'QTooltip',
    template: '<span class="q-tooltip"><slot /></span>',
  }),
  'q-icon': defineComponent({
    name: 'QIcon',
    props: ['name'],
    template: '<span class="q-icon">{{ name }}</span>',
  }),
  'q-skeleton': defineComponent({
    name: 'QSkeleton',
    template: '<div class="q-skeleton" />',
  }),
}

const qMock = {
  screen: { xs: false },
  notify: vi.fn(),
}

const draftInvoice: InvoiceDetails = {
  invoiceId: 'inv-200',
  invoiceNumber: null,
  customerId: 'cust-1',
  status: 'Draft',
  paymentTermsDays: 14,
  issueDate: null,
  dueDate: null,
  subtotal: 450,
  vatTotal: 67.5,
  total: 517.5,
  amountPaid: 0,
  balance: 517.5,
  lines: [
    {
      invoiceLineId: 'l-1',
      lineNumber: 1,
      description: 'Call-out fee',
      quantity: 1,
      unitPrice: 450,
      vatRate: 0.15,
      lineTotal: 450,
      vatAmount: 67.5,
    },
  ],
  payments: [],
  timeline: [
    {
      eventType: 'Created',
      occurredAt: '2026-11-01T12:00:00Z',
      userId: 'u-1',
      detail: 'Draft created',
    },
  ],
  createdAt: '2026-11-01T12:00:00Z',
  modifiedAt: null,
  version: 'v1',
}

async function mountDetailPage(invoiceId = 'inv-200') {
  const pinia = createPinia()
  setActivePinia(pinia)

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/invoices', component: { template: '<div>Invoices List</div>' } },
      { path: '/invoices/:invoiceId', component: InvoiceDetailPage },
      { path: '/customers/:customerId', component: { template: '<div>Customer</div>' } },
    ],
  })

  await router.push(`/invoices/${invoiceId}`)
  await router.isReady()

  return mount(InvoiceDetailPage, {
    global: {
      plugins: [pinia, router],
      stubs: quasarStubs,
      provide: { _q_: qMock },
      mocks: { $q: qMock },
    },
  })
}

describe('InvoiceDetailPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    resetCustomerNamesCache()
    vi.restoreAllMocks()
    qMock.notify.mockReset()
    vi.spyOn(customersApiModule, 'getCustomer').mockResolvedValue({
      customerId: 'cust-1',
      name: 'Highveld Logistics (Pty) Ltd',
      email: 'accounts@highveld.co.za',
      contactNumber: null,
      billingAddress: null,
      vatNumber: null,
      customerReference: null,
      isArchived: false,
      version: 'c-v1',
    })
    vi.spyOn(notificationsApi, 'searchNotifications').mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 50,
      totalCount: 0,
    })
  })

  it('hides Edit, Send, and Delete buttons on a Sent invoice', async () => {
    vi.spyOn(invoicesApi, 'getInvoice').mockResolvedValueOnce({
      ...draftInvoice,
      invoiceNumber: 'INV-2026-0001',
      status: 'Sent',
      issueDate: '2026-11-01',
      dueDate: '2026-11-15',
    })

    const wrapper = await mountDetailPage('inv-200')
    await flushPromises()

    expect(wrapper.find('[data-testid="invoice-detail-number"]').text()).toBe('INV-2026-0001')
    expect(wrapper.find('[data-testid="invoice-edit-btn"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="invoice-send-btn"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="invoice-delete-btn"]').exists()).toBe(false)
  })

  it('calls sendInvoice and deleteInvoice only after confirming in their respective dialogs', async () => {
    vi.spyOn(invoicesApi, 'getInvoice').mockResolvedValue(draftInvoice)
    const sendSpy = vi.spyOn(invoicesApi, 'sendInvoice').mockResolvedValueOnce({
      ...draftInvoice,
      invoiceNumber: 'INV-2026-0001',
      status: 'Sent',
      issueDate: '2026-11-01',
      dueDate: '2026-11-15',
    })
    const deleteSpy = vi.spyOn(invoicesApi, 'deleteInvoice').mockResolvedValueOnce(undefined)

    const wrapper = await mountDetailPage('inv-200')
    await flushPromises()

    // Clicking Delete opens confirm dialog without calling deleteInvoice yet
    await wrapper.find('[data-testid="invoice-delete-btn"]').trigger('click')
    expect(deleteSpy).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="delete-confirm-dialog"]').exists()).toBe(true)

    // Cancel delete dialog
    await wrapper.find('[data-testid="cancel-delete-btn"]').trigger('click')
    expect(deleteSpy).not.toHaveBeenCalled()

    // Clicking Send opens confirm dialog without calling sendInvoice yet
    await wrapper.find('[data-testid="invoice-send-btn"]').trigger('click')
    expect(sendSpy).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="send-confirm-dialog"]').exists()).toBe(true)

    // Confirm Send -> calls sendInvoice
    await wrapper.find('[data-testid="confirm-send-btn"]').trigger('click')
    await flushPromises()

    expect(sendSpy).toHaveBeenCalledWith('inv-200')
    expect(qMock.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Sent as INV-2026-0001',
      }),
    )
  })

  it('hides the Notifications card for drafts, renders notifications oldest-first for non-drafts, and refetches only when lastInvoiceId matches', async () => {
    // 1. Draft invoice -> Notifications card is hidden
    const getInvoiceSpy = vi.spyOn(invoicesApi, 'getInvoice').mockResolvedValueOnce(draftInvoice)
    const searchNotifSpy = vi.spyOn(notificationsApi, 'searchNotifications')

    const draftWrapper = await mountDetailPage('inv-200')
    await flushPromises()
    expect(draftWrapper.find('[data-testid="invoice-notifications-section"]').exists()).toBe(false)
    expect(searchNotifSpy).not.toHaveBeenCalled()

    // 2. Sent invoice -> Notifications card renders rows oldest-first
    getInvoiceSpy.mockResolvedValue({
      ...draftInvoice,
      invoiceNumber: 'INV-2026-0001',
      status: 'Sent',
      issueDate: '2026-11-01',
      dueDate: '2026-11-15',
    })
    searchNotifSpy.mockResolvedValue({
      items: [
        {
          notificationId: 'n-newest',
          invoiceId: 'inv-200',
          invoiceNumber: 'INV-2026-0001',
          customerName: 'Highveld Logistics (Pty) Ltd',
          notificationType: 'OverdueReminder1',
          channel: 'Sms',
          recipient: '+27821234567',
          status: 'Sent',
          attempts: 1,
          body: 'Overdue reminder body',
          createdAt: '2026-11-16T09:00:00Z',
          sentAt: '2026-11-16T09:00:05Z',
        },
        {
          notificationId: 'n-oldest',
          invoiceId: 'inv-200',
          invoiceNumber: 'INV-2026-0001',
          customerName: 'Highveld Logistics (Pty) Ltd',
          notificationType: 'InvoiceSent',
          channel: 'Email',
          recipient: 'accounts@highveld.co.za',
          status: 'Sent',
          attempts: 1,
          body: 'Initial invoice sent body',
          createdAt: '2026-11-01T12:00:00Z',
          sentAt: '2026-11-01T12:00:02Z',
        },
      ],
      page: 1,
      pageSize: 50,
      totalCount: 2,
    })

    const sentWrapper = await mountDetailPage('inv-200')
    await flushPromises()

    expect(sentWrapper.find('[data-testid="invoice-notifications-section"]').exists()).toBe(true)
    const rows = sentWrapper.findAll('[data-testid="notification-log-row"]')
    expect(rows).toHaveLength(2)
    // Oldest ('Invoice sent') is first, newest ('Overdue reminder') is second
    expect(rows[0]!.text()).toContain('Invoice sent')
    expect(rows[1]!.text()).toContain('Overdue reminder')

    const callsBeforeBump = searchNotifSpy.mock.calls.length
    const feedStore = useNotificationFeedStore()

    // Bump changeVersion for a DIFFERENT invoice -> no refetch
    feedStore.lastInvoiceId = 'inv-other'
    feedStore.changeVersion += 1
    await flushPromises()
    expect(searchNotifSpy).toHaveBeenCalledTimes(callsBeforeBump)

    // Bump changeVersion for THIS invoice ('inv-200') -> quiet refetch
    feedStore.lastInvoiceId = 'inv-200'
    feedStore.changeVersion += 1
    await flushPromises()
    expect(searchNotifSpy).toHaveBeenCalledTimes(callsBeforeBump + 1)
  })

  describe('payments, credit and reminders', () => {
    const sentInvoice: InvoiceDetails = {
      ...draftInvoice,
      invoiceNumber: 'INV-2026-0001',
      status: 'Sent',
      issueDate: '2026-11-01',
      dueDate: '2026-11-15',
    }

    it('shows an overpayment as a credit with a note', async () => {
      vi.spyOn(invoicesApi, 'getInvoice').mockResolvedValue({
        ...sentInvoice,
        status: 'Paid',
        total: 517.5,
        amountPaid: 600,
        balance: -82.5,
      })

      const wrapper = await mountDetailPage('inv-200')
      await flushPromises()

      expect(wrapper.find('[data-testid="detail-balance-label"]').text()).toBe('Credit')
      expect(wrapper.find('[data-testid="detail-balance"]').text()).not.toContain('-')
      expect(wrapper.find('[data-testid="detail-overpaid-note"]').text()).toContain('Overpaid by')
      expect(wrapper.find('[data-testid="invoice-detail-credit-pill"]').exists()).toBe(true)
    })

    it('shows "Paid in full" and no credit when the balance is exactly zero', async () => {
      vi.spyOn(invoicesApi, 'getInvoice').mockResolvedValue({
        ...sentInvoice,
        status: 'Paid',
        amountPaid: 517.5,
        balance: 0,
      })

      const wrapper = await mountDetailPage('inv-200')
      await flushPromises()

      expect(wrapper.find('[data-testid="detail-balance-label"]').text()).toBe('Balance')
      expect(wrapper.find('[data-testid="detail-balance"]').text()).toBe('Paid in full')
      expect(wrapper.find('[data-testid="detail-overpaid-note"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="invoice-detail-credit-pill"]').exists()).toBe(false)
    })

    it('counts the reminders sent on an overdue invoice', async () => {
      vi.spyOn(invoicesApi, 'getInvoice').mockResolvedValue({
        ...sentInvoice,
        status: 'Overdue',
        timeline: [
          ...sentInvoice.timeline,
          {
            eventType: 'MarkedOverdue',
            occurredAt: '2026-11-16T06:00:00Z',
            userId: null,
            detail: null,
          },
          {
            eventType: 'ReminderRaised',
            occurredAt: '2026-11-16T06:00:00Z',
            userId: null,
            detail: 'First reminder at 1 days overdue.',
          },
          {
            eventType: 'ReminderRaised',
            occurredAt: '2026-11-22T06:00:00Z',
            userId: null,
            detail: 'Second reminder at 7 days overdue.',
          },
        ],
      })

      const wrapper = await mountDetailPage('inv-200')
      await flushPromises()

      const summary = wrapper.find('[data-testid="invoice-detail-reminders-summary"]')
      expect(summary.exists()).toBe(true)
      expect(summary.text()).toContain('Reminders sent:')
      expect(summary.text()).toContain('2')
    })

    it('reloads the invoice once, after the debounce, when a notification for it arrives', async () => {
      const getInvoiceSpy = vi.spyOn(invoicesApi, 'getInvoice').mockResolvedValue(sentInvoice)

      const wrapper = await mountDetailPage('inv-200')
      await flushPromises()
      expect(wrapper.find('[data-testid="invoice-detail-number"]').exists()).toBe(true)
      const callsAfterLoad = getInvoiceSpy.mock.calls.length

      vi.useFakeTimers()
      try {
        const feedStore = useNotificationFeedStore()

        // Another invoice's notification: no reload
        feedStore.lastInvoiceId = 'inv-other'
        feedStore.changeVersion += 1
        await flushPromises()
        vi.advanceTimersByTime(500)
        await flushPromises()
        expect(getInvoiceSpy).toHaveBeenCalledTimes(callsAfterLoad)

        // Two quick notifications for this invoice: one reload after the debounce
        feedStore.lastInvoiceId = 'inv-200'
        feedStore.changeVersion += 1
        await flushPromises()
        feedStore.changeVersion += 1
        await flushPromises()
        expect(getInvoiceSpy).toHaveBeenCalledTimes(callsAfterLoad)

        vi.advanceTimersByTime(500)
        await flushPromises()
        expect(getInvoiceSpy).toHaveBeenCalledTimes(callsAfterLoad + 1)
      } finally {
        vi.useRealTimers()
      }
    })
  })
})
