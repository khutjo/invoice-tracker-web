import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { customersApi, type CustomerDetails } from '../api'
import CustomerDetailPage from '../pages/CustomerDetailPage.vue'

const activeCustomer: CustomerDetails = {
  customerId: 'c-200',
  name: 'Cape Winelands Roasters CC',
  email: 'info@winelands.co.za',
  contactNumber: { number: '+27215551234', type: 'Landline' },
  billingAddress: {
    line1: '50 Church Street',
    line2: null,
    suburb: 'Central',
    city: 'Stellenbosch',
    postalCode: '7600',
  },
  vatNumber: '4987654321',
  customerReference: 'WIN-01',
  isArchived: false,
  version: 'v1',
}

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
  'q-skeleton': defineComponent({
    name: 'QSkeleton',
    template: '<div class="q-skeleton" />',
  }),
  'q-icon': defineComponent({
    name: 'QIcon',
    props: ['name'],
    template: '<span class="q-icon">{{ name }}</span>',
  }),
  'q-btn': defineComponent({
    name: 'QBtn',
    props: ['label', 'disable', 'loading'],
    emits: ['click'],
    template:
      '<button type="button" :disabled="disable || loading" @click="$emit(\'click\')">{{ label }}</button>',
  }),
  'q-input': defineComponent({
    name: 'QInput',
    template: '<input />',
  }),
  'q-select': defineComponent({
    name: 'QSelect',
    template: '<select />',
  }),
}

const qMock = {
  screen: { xs: false },
  notify: vi.fn(),
}

async function mountDetailPage(customerId = 'c-200') {
  const pinia = createPinia()
  setActivePinia(pinia)

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/customers', component: { template: '<div>Customers List</div>' } },
      { path: '/customers/:customerId', component: CustomerDetailPage },
    ],
  })
  await router.push(`/customers/${customerId}`)
  await router.isReady()

  return mount(CustomerDetailPage, {
    global: {
      plugins: [pinia, router],
      stubs: quasarStubs,
      provide: { _q_: qMock },
      mocks: { $q: qMock },
    },
  })
}

describe('CustomerDetailPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('hides Edit and Archive buttons when the customer is archived', async () => {
    vi.spyOn(customersApi, 'getCustomer').mockResolvedValueOnce({
      ...activeCustomer,
      isArchived: true,
    })

    const wrapper = await mountDetailPage('c-200')
    await flushPromises()

    expect(wrapper.find('[data-testid="customer-archived-pill"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="customer-edit-btn"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="customer-archive-btn"]').exists()).toBe(false)
  })

  it('calls archiveCustomer only after confirming in the archive dialog', async () => {
    vi.spyOn(customersApi, 'getCustomer').mockResolvedValueOnce(activeCustomer)
    const archiveSpy = vi
      .spyOn(customersApi, 'archiveCustomer')
      .mockResolvedValueOnce(undefined)
    vi.spyOn(customersApi, 'searchCustomers').mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      totalCount: 0,
    })

    const wrapper = await mountDetailPage('c-200')
    await flushPromises()

    // Clicking Archive opens dialog without calling API yet
    await wrapper.find('[data-testid="customer-archive-btn"]').trigger('click')
    expect(archiveSpy).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="archive-confirm-dialog"]').exists()).toBe(true)

    // Confirming calls archiveCustomer
    await wrapper.find('[data-testid="confirm-archive-btn"]').trigger('click')
    await flushPromises()

    expect(archiveSpy).toHaveBeenCalledWith('c-200')
  })
})
