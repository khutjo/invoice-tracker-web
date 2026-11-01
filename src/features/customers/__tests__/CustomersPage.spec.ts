import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { customersApi, type CustomerSummary, type Paged } from '../api'
import CustomersPage from '../pages/CustomersPage.vue'
import { useCustomersStore } from '../store'

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
    inheritAttrs: false,
    props: {
      modelValue: { type: [String, Number], default: '' },
    },
    emits: ['update:modelValue', 'clear'],
    template: `
      <input
        :value="modelValue"
        v-bind="$attrs"
        @input="$emit('update:modelValue', $event.target.value)"
      />
    `,
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

describe('CustomersPage and store race-condition protection', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('reads search, page, pageSize and archived from the URL and resets page to 1 when search changes', async () => {
    vi.useFakeTimers()

    const searchSpy = vi.spyOn(customersApi, 'searchCustomers').mockResolvedValue({
      items: [],
      page: 2,
      pageSize: 50,
      totalCount: 0,
    })

    const pinia = createPinia()
    setActivePinia(pinia)

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/customers', component: CustomersPage }],
    })
    await router.push('/customers?search=highveld&page=2&pageSize=50&archived=1')
    await router.isReady()

    const wrapper = mount(CustomersPage, {
      global: {
        plugins: [pinia, router],
        stubs: quasarStubs,
        provide: { _q_: qMock },
        mocks: { $q: qMock },
      },
    })

    await flushPromises()

    expect(searchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'highveld',
        page: 2,
        pageSize: 50,
        includeArchived: true,
      }),
    )

    const searchInput = wrapper.find('[data-testid="customers-search-input"]')
    await searchInput.setValue('winelands')
    vi.advanceTimersByTime(300)
    await flushPromises()

    expect(router.currentRoute.value.query.search).toBe('winelands')
    expect(router.currentRoute.value.query.page).toBeUndefined()
    expect(searchSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        search: 'winelands',
        page: 1,
        pageSize: 50,
        includeArchived: true,
      }),
    )
  })

  it('prevents a slow earlier search response from overwriting a newer one', async () => {
    const store = useCustomersStore()

    let resolveSlow!: (value: Paged<CustomerSummary>) => void
    let resolveFast!: (value: Paged<CustomerSummary>) => void

    vi.spyOn(customersApi, 'searchCustomers')
      .mockImplementationOnce(
        () =>
          new Promise<Paged<CustomerSummary>>((resolve) => {
            resolveSlow = resolve
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<Paged<CustomerSummary>>((resolve) => {
            resolveFast = resolve
          }),
      )

    const slowPromise = store.fetchCustomersPage({ search: 'old-query', page: 1 })
    const fastPromise = store.fetchCustomersPage({ search: 'new-query', page: 1 })

    resolveFast({
      items: [
        {
          customerId: 'c-new',
          name: 'New Match (Pty) Ltd',
          email: 'new@match.co.za',
          phoneNumber: null,
          city: 'Cape Town',
          customerReference: null,
          isArchived: false,
        },
      ],
      page: 1,
      pageSize: 20,
      totalCount: 1,
    })
    await fastPromise

    expect(store.pageData.items[0]?.name).toBe('New Match (Pty) Ltd')

    // Now the earlier slow request resolves later
    resolveSlow({
      items: [
        {
          customerId: 'c-old',
          name: 'Stale Old Result',
          email: 'old@match.co.za',
          phoneNumber: null,
          city: 'Johannesburg',
          customerReference: null,
          isArchived: false,
        },
      ],
      page: 1,
      pageSize: 20,
      totalCount: 1,
    })
    await slowPromise

    expect(store.pageData.items).toHaveLength(1)
    expect(store.pageData.items[0]?.name).toBe('New Match (Pty) Ltd')
  })
})
