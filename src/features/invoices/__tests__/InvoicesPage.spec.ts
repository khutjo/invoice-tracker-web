import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import * as customersApiModule from 'src/features/customers/api'
import { invoicesApi } from '../api'
import { resetCustomerNamesCache } from '../composables/useCustomerNames'
import InvoicesPage from '../pages/InvoicesPage.vue'

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
  'q-skeleton': defineComponent({
    name: 'QSkeleton',
    template: '<div class="q-skeleton" />',
  }),
}

const qMock = {
  screen: { xs: false, lt: { sm: false, md: false }, gt: { xs: true, sm: true } },
  notify: vi.fn(),
}

async function mountInvoicesPage(initialPath = '/invoices') {
  const pinia = createPinia()
  setActivePinia(pinia)

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/invoices', component: InvoicesPage },
      { path: '/invoices/new', component: { template: '<div>New Invoice</div>' } },
      {
        path: '/invoices/:invoiceId',
        component: { template: '<div>Invoice Detail</div>' },
      },
    ],
  })

  await router.push(initialPath)
  await router.isReady()

  const wrapper = mount(InvoicesPage, {
    global: {
      plugins: [pinia, router],
      stubs: quasarStubs,
      provide: { _q_: qMock },
      mocks: { $q: qMock },
    },
  })

  return { wrapper, router }
}

describe('InvoicesPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    resetCustomerNamesCache()
    vi.restoreAllMocks()
    vi.spyOn(customersApiModule, 'getCustomer').mockResolvedValue({
      customerId: 'cust-1',
      name: 'Highveld Logistics (Pty) Ltd',
      email: 'accounts@highveld.co.za',
      contactNumber: null,
      billingAddress: null,
      vatNumber: null,
      customerReference: null,
      isArchived: false,
      version: 'v1',
    })
  })

  it('reads every filter from the URL and calls searchInvoices with them', async () => {
    const searchSpy = vi.spyOn(invoicesApi, 'searchInvoices').mockResolvedValue({
      items: [],
      page: 2,
      pageSize: 50,
      totalCount: 0,
    })

    await mountInvoicesPage(
      '/invoices?status=Sent&customerId=cust-1&issuedFrom=2026-01-01&issuedTo=2026-11-01&overdue=1&search=INV-2026&page=2&pageSize=50',
    )
    await flushPromises()

    expect(searchSpy).toHaveBeenCalledWith(
      {
        status: 'Sent',
        customerId: 'cust-1',
        issuedFrom: '2026-01-01',
        issuedTo: '2026-11-01',
        overdueOnly: true,
        search: 'INV-2026',
        page: 2,
        pageSize: 50,
      },
      expect.any(AbortSignal),
    )
  })

  it('updates the URL and resets the page to 1 when a filter changes', async () => {
    const searchSpy = vi.spyOn(invoicesApi, 'searchInvoices').mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      totalCount: 0,
    })

    const { wrapper, router } = await mountInvoicesPage(
      '/invoices?status=Draft&page=3',
    )
    await flushPromises()

    await wrapper.find('[data-testid="status-chip-Sent"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query.status).toBe('Sent')
    expect(router.currentRoute.value.query.page).toBeUndefined()
    expect(searchSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: 'Sent',
        page: 1,
      }),
      expect.any(AbortSignal),
    )
  })
})
