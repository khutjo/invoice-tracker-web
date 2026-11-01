import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { businessApi } from 'src/features/business/api'
import * as customersApiModule from 'src/features/customers/api'
import { invoicesApi, type InvoiceDetails } from '../api'
import { resetCustomerNamesCache } from '../composables/useCustomerNames'
import InvoiceEditorPage from '../pages/InvoiceEditorPage.vue'
import { ApiError } from 'src/shared/api/problem'
import { formatZar } from 'src/shared/money'

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
  'q-input': defineComponent({
    name: 'QInput',
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<input :value="modelValue" />',
  }),
  'q-select': defineComponent({
    name: 'QSelect',
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<select :value="modelValue" />',
  }),
}

const qMock = {
  screen: { xs: false, lt: { sm: false, md: false }, gt: { xs: true, sm: true } },
  notify: vi.fn(),
}

const sampleDraftDetails: InvoiceDetails = {
  invoiceId: 'inv-100',
  invoiceNumber: null,
  customerId: 'cust-1',
  status: 'Draft',
  paymentTermsDays: 30,
  issueDate: null,
  dueDate: null,
  subtotal: 1400,
  vatTotal: 210,
  total: 1610,
  amountPaid: 0,
  balance: 1610,
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
    {
      invoiceLineId: 'l-2',
      lineNumber: 2,
      description: 'Labour',
      quantity: 2.5,
      unitPrice: 380,
      vatRate: 0.15,
      lineTotal: 950,
      vatAmount: 142.5,
    },
  ],
  payments: [],
  timeline: [],
  createdAt: '2026-11-01T10:00:00Z',
  modifiedAt: null,
  version: 'row-ver-1',
}

async function mountEditorPage(initialPath = '/invoices/new') {
  const pinia = createPinia()
  setActivePinia(pinia)

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/invoices', component: { template: '<div>List</div>' } },
      { path: '/invoices/new', component: InvoiceEditorPage },
      { path: '/invoices/:invoiceId/edit', component: InvoiceEditorPage },
      {
        path: '/invoices/:invoiceId',
        component: { template: '<div>Invoice Detail View</div>' },
      },
    ],
  })

  await router.push(initialPath)
  await router.isReady()

  const wrapper = mount(InvoiceEditorPage, {
    global: {
      plugins: [pinia, router],
      stubs: quasarStubs,
      provide: { _q_: qMock },
      mocks: { $q: qMock },
    },
  })

  return { wrapper, router }
}

describe('InvoiceEditorPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    resetCustomerNamesCache()
    vi.restoreAllMocks()
    qMock.notify.mockReset()

    vi.spyOn(businessApi, 'getSettings').mockResolvedValue({
      defaultPaymentTermsDays: 14,
      timeZone: 'Africa/Johannesburg',
      version: 'b-v1',
    })
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
    vi.spyOn(customersApiModule, 'searchCustomers').mockResolvedValue({
      items: [
        {
          customerId: 'cust-1',
          name: 'Highveld Logistics (Pty) Ltd',
          email: 'accounts@highveld.co.za',
          phoneNumber: null,
          city: 'Johannesburg',
          customerReference: null,
          isArchived: false,
        },
      ],
      page: 1,
      pageSize: 10,
      totalCount: 1,
    })
  })

  it('previews 450.00 + 2.5 x 380.00 at 15% as subtotal 1 400.00, VAT 210.00, total 1 610.00', async () => {
    vi.spyOn(invoicesApi, 'getInvoice').mockResolvedValueOnce(sampleDraftDetails)

    const { wrapper } = await mountEditorPage('/invoices/inv-100/edit')
    await flushPromises()

    expect(wrapper.find('[data-testid="preview-subtotal"]').text()).toBe(
      formatZar(1400),
    )
    expect(wrapper.find('[data-testid="preview-vat"]').text()).toBe(formatZar(210))
    expect(wrapper.find('[data-testid="preview-total"]').text()).toBe(formatZar(1610))
  })

  it('sends lines in grid order and includes the loaded version on edit save', async () => {
    vi.spyOn(invoicesApi, 'getInvoice').mockResolvedValueOnce(sampleDraftDetails)
    const updateSpy = vi
      .spyOn(invoicesApi, 'updateInvoice')
      .mockResolvedValueOnce({ ...sampleDraftDetails, version: 'row-ver-2' })

    const { wrapper } = await mountEditorPage('/invoices/inv-100/edit')
    await flushPromises()

    // Move second row (Labour) up to first position
    await wrapper.find('[data-testid="line-move-up-1"]').trigger('click')
    await wrapper.find('[data-testid="save-draft-btn"]').trigger('click')
    await flushPromises()

    expect(updateSpy).toHaveBeenCalledWith('inv-100', {
      customerId: 'cust-1',
      paymentTermsDays: 30,
      version: 'row-ver-1',
      lines: [
        {
          description: 'Labour',
          quantity: 2.5,
          unitPrice: 380,
          vatRate: 0.15,
        },
        {
          description: 'Call-out fee',
          quantity: 1,
          unitPrice: 450,
          vatRate: 0.15,
        },
      ],
    })
  })

  it('shows a 400 error for lines[1].unitPrice in the second row price cell', async () => {
    vi.spyOn(invoicesApi, 'getInvoice').mockResolvedValueOnce(sampleDraftDetails)
    vi.spyOn(invoicesApi, 'updateInvoice').mockRejectedValueOnce(
      new ApiError('Validation failed', 400, {
        title: 'One or more validation errors occurred.',
        status: 400,
        errors: {
          'Lines[1].UnitPrice': ['Unit price exceeds maximum allowed limit.'],
        },
      }),
    )

    const { wrapper } = await mountEditorPage('/invoices/inv-100/edit')
    await flushPromises()

    await wrapper.find('[data-testid="save-draft-btn"]').trigger('click')
    await flushPromises()

    const priceError = wrapper.find('[data-testid="line-error-1-unitPrice"]')
    expect(priceError.exists()).toBe(true)
    expect(priceError.text()).toContain('Unit price exceeds maximum allowed limit.')
  })

  it('shows reload banner on 409 stale-version, and leaves edit mode on 409 "Only a draft invoice can be…"', async () => {
    vi.spyOn(invoicesApi, 'getInvoice').mockResolvedValueOnce(sampleDraftDetails)
    const updateSpy = vi
      .spyOn(invoicesApi, 'updateInvoice')
      .mockRejectedValueOnce(
        new ApiError('Conflict', 409, {
          title: 'The invoice was changed by someone else.',
          status: 409,
        }),
      )
      .mockRejectedValueOnce(
        new ApiError('Conflict', 409, {
          title: 'Only a draft invoice can be edited.',
          status: 409,
        }),
      )

    const { wrapper, router } = await mountEditorPage('/invoices/inv-100/edit')
    await flushPromises()

    // 1. Stale version 409 -> shows reload banner
    await wrapper.find('[data-testid="save-draft-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="invoice-conflict-banner"]').exists()).toBe(true)

    // 2. "Only a draft invoice can be..." 409 -> leaves edit mode to /invoices/inv-100
    await wrapper.find('[data-testid="save-draft-btn"]').trigger('click')
    await flushPromises()

    expect(updateSpy).toHaveBeenCalledTimes(2)
    expect(router.currentRoute.value.path).toBe('/invoices/inv-100')
    expect(qMock.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Only a draft invoice can be edited.',
      }),
    )
  })

  it('disables Save and send when there are no lines or when total is zero', async () => {
    const { wrapper } = await mountEditorPage('/invoices/new?customerId=cust-1')
    await flushPromises()

    // Initial line has unitPrice 0 -> total is 0 -> Save and send is disabled
    const sendBtn = wrapper.find('[data-testid="save-and-send-btn"]')
    expect(sendBtn.attributes('disabled')).toBeDefined()

    // Remove the only line -> 0 lines -> Save and send remains disabled
    await wrapper.find('[data-testid="line-remove-0"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="save-and-send-btn"]').attributes('disabled')).toBeDefined()
  })
})
