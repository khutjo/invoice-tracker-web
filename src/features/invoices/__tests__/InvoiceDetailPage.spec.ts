import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import * as customersApiModule from 'src/features/customers/api'
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

    expect(wrapper.find('[data-testid="invoice-detail-number"]').text()).toBe(
      'INV-2026-0001',
    )
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
    const deleteSpy = vi
      .spyOn(invoicesApi, 'deleteInvoice')
      .mockResolvedValueOnce(undefined)

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
})
