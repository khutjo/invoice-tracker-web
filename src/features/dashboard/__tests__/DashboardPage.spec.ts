import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import * as customersApiModule from 'src/features/customers/api'
import { useSessionStore } from 'src/features/auth/store'
import { useBusinessStore } from 'src/features/business/store'
import { invoicesApi, type InvoiceSummary } from 'src/features/invoices/api'
import { resetCustomerNamesCache } from 'src/features/invoices/composables/useCustomerNames'
import { dashboardApi, type DashboardSummary } from '../api'
import DashboardPage from '../pages/DashboardPage.vue'
import { formatZar } from 'src/shared/formatting/formatters'

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
      '<button type="button" :disabled="disable || loading" :data-to="to" @click="$emit(\'click\')">{{ label }}<slot /></button>',
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

function makeSummary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    asOf: '2026-11-02',
    totalOutstanding: {
      balance: 148250.0,
      openInvoiceCount: 6,
    },
    overdue: {
      balance: 42550.0,
      overdueInvoiceCount: 2,
      oldestDaysPastDue: 14,
    },
    paidThisMonth: {
      amountReceived: 219650.0,
      paidInvoiceCount: 8,
    },
    drafts: {
      total: 31050.0,
      draftCount: 3,
    },
    ...overrides,
  }
}

const sampleRecentInvoices: InvoiceSummary[] = [
  {
    invoiceId: 'inv-1',
    invoiceNumber: 'INV-2026-0042',
    customerId: 'cust-1',
    customerName: 'Highveld Logistics (Pty) Ltd',
    status: 'Overdue',
    issueDate: '2026-10-03',
    dueDate: '2026-10-17',
    total: 42550.0,
    amountPaid: 0,
    balance: 42550.0,
    createdAt: '2026-10-03T10:00:00Z',
  },
  {
    invoiceId: 'inv-2',
    invoiceNumber: 'INV-2026-0043',
    customerId: 'cust-2',
    customerName: 'Cape Winelands Roasters CC',
    status: 'Sent',
    issueDate: '2026-10-15',
    dueDate: '2026-10-28', // Sent and dueDate < asOf (2026-11-02) -> overdue row
    total: 69000.0,
    amountPaid: 40000.0, // Partially paid
    balance: 29000.0,
    createdAt: '2026-10-15T10:00:00Z',
  },
  {
    invoiceId: 'inv-3',
    invoiceNumber: 'INV-2026-0044',
    customerId: 'cust-3',
    customerName: 'eThekwini Marine Supplies',
    status: 'Sent',
    issueDate: '2026-10-20',
    dueDate: '2026-11-15',
    total: 76700.0,
    amountPaid: 0,
    balance: 76700.0,
    createdAt: '2026-10-20T10:00:00Z',
  },
  {
    invoiceId: 'inv-4',
    invoiceNumber: 'INV-2026-0041',
    customerId: 'cust-4',
    customerName: 'Stellenbosch Agri Holdings',
    status: 'Paid',
    issueDate: '2026-10-10',
    dueDate: '2026-10-25',
    total: 94300.0,
    amountPaid: 94300.0,
    balance: 0,
    createdAt: '2026-10-10T10:00:00Z',
  },
  {
    invoiceId: 'inv-5',
    invoiceNumber: null,
    customerId: 'cust-draft',
    customerName: null, // Draft has null customerName -> resolved via useCustomerNames
    status: 'Draft',
    issueDate: null,
    dueDate: null,
    total: 31050.0,
    amountPaid: 0,
    balance: 31050.0,
    createdAt: '2026-11-01T10:00:00Z',
  },
]

async function mountDashboardPage(
  setupStores?: (stores: {
    sessionStore: ReturnType<typeof useSessionStore>
    businessStore: ReturnType<typeof useBusinessStore>
  }) => void,
) {
  const pinia = createPinia()
  setActivePinia(pinia)

  const sessionStore = useSessionStore()
  const businessStore = useBusinessStore()
  setupStores?.({ sessionStore, businessStore })

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/dashboard', component: DashboardPage },
      { path: '/setup', component: { template: '<div>Setup</div>' } },
      { path: '/invoices', component: { template: '<div>Invoices List</div>' } },
      { path: '/invoices/new', component: { template: '<div>New Invoice</div>' } },
      {
        path: '/invoices/:invoiceId',
        component: { template: '<div>Invoice Detail</div>' },
      },
    ],
  })

  await router.push('/dashboard')
  await router.isReady()

  const wrapper = mount(DashboardPage, {
    global: {
      plugins: [pinia, router],
      stubs: quasarStubs,
      provide: { _q_: qMock },
      mocks: { $q: qMock },
    },
  })

  return { wrapper, router, sessionStore, businessStore }
}

describe('DashboardPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    resetCustomerNamesCache()
    vi.restoreAllMocks()

    vi.spyOn(customersApiModule, 'getCustomer').mockImplementation(async (id) => ({
      customerId: id,
      name: id === 'cust-draft' ? 'Nguni Digital Advisory' : `Customer ${id}`,
      email: 'info@nguni.co.za',
      contactNumber: null,
      billingAddress: null,
      vatNumber: null,
      customerReference: null,
      isArchived: false,
      version: 'v1',
    }))
  })

  it('renders loading skeletons for the 4 KPI tiles and 5 recent invoice rows while requests are in flight', async () => {
    vi.spyOn(dashboardApi, 'getDashboardSummary').mockReturnValue(new Promise(() => {}))
    vi.spyOn(invoicesApi, 'searchInvoices').mockReturnValue(new Promise(() => {}))

    const { wrapper } = await mountDashboardPage()

    expect(wrapper.findAll('[data-testid="kpi-skeleton-value"]')).toHaveLength(4)
    expect(wrapper.findAll('[data-testid="kpi-skeleton-meta"]')).toHaveLength(4)
    expect(wrapper.findAll('[data-testid="recent-invoice-skeleton-row"]')).toHaveLength(5)
  })

  it('formats all 4 KPI values in ZAR, pluralises meta copy, and links each KPI tile to its filtered /invoices route', async () => {
    vi.spyOn(dashboardApi, 'getDashboardSummary').mockResolvedValue(makeSummary())
    vi.spyOn(invoicesApi, 'searchInvoices').mockResolvedValue({
      items: sampleRecentInvoices,
      page: 1,
      pageSize: 5,
      totalCount: 5,
    })

    const { wrapper } = await mountDashboardPage()
    await flushPromises()

    expect(wrapper.get('[data-testid="dashboard-as-of"]').text()).toBe('Figures as of 2 Nov 2026')

    const tileOutstanding = wrapper.get('[data-testid="kpi-tile-outstanding"]')
    expect(tileOutstanding.attributes('href')).toBe('/invoices?status=Sent')
    expect(tileOutstanding.text()).toContain(formatZar(148250.0))
    expect(tileOutstanding.text()).toContain('Across 6 open invoices')

    const tileOverdue = wrapper.get('[data-testid="kpi-tile-overdue"]')
    expect(tileOverdue.attributes('href')).toBe('/invoices?overdue=1')
    expect(tileOverdue.text()).toContain(formatZar(42550.0))
    expect(tileOverdue.text()).toContain('2 overdue')
    expect(tileOverdue.text()).toContain('Oldest 14 days past due date')
    expect(wrapper.get('[data-testid="kpi-overdue-value"]').classes()).toContain(
      'kpi-tile__value--overdue',
    )

    const tilePaid = wrapper.get('[data-testid="kpi-tile-paid"]')
    expect(tilePaid.attributes('href')).toBe('/invoices?status=Paid')
    expect(tilePaid.text()).toContain(formatZar(219650.0))
    expect(tilePaid.text()).toContain('8 invoices paid in full')

    const tileDrafts = wrapper.get('[data-testid="kpi-tile-drafts"]')
    expect(tileDrafts.attributes('href')).toBe('/invoices?status=Draft')
    expect(tileDrafts.text()).toContain(formatZar(31050.0))
    expect(tileDrafts.text()).toContain('3 drafts')
    expect(tileDrafts.text()).toContain('Ready to review and send')
  })

  it('handles singular/zero KPI meta states and omits .kpi-tile__value--overdue when overdue.balance is 0', async () => {
    vi.spyOn(dashboardApi, 'getDashboardSummary').mockResolvedValue(
      makeSummary({
        totalOutstanding: { balance: 1500, openInvoiceCount: 1 },
        overdue: {
          balance: 0,
          overdueInvoiceCount: 0,
          oldestDaysPastDue: null,
        },
        paidThisMonth: { amountReceived: 2300, paidInvoiceCount: 1 },
        drafts: { total: 0, draftCount: 0 },
      }),
    )
    vi.spyOn(invoicesApi, 'searchInvoices').mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 5,
      totalCount: 0,
    })

    const { wrapper } = await mountDashboardPage()
    await flushPromises()

    expect(wrapper.get('[data-testid="kpi-tile-outstanding"]').text()).toContain(
      'Across 1 open invoice',
    )
    expect(wrapper.get('[data-testid="kpi-overdue-value"]').classes()).not.toContain(
      'kpi-tile__value--overdue',
    )
    expect(wrapper.get('[data-testid="kpi-overdue-meta"]').text()).toBe('Nothing overdue')
    expect(wrapper.get('[data-testid="kpi-tile-paid"]').text()).toContain('1 invoice paid in full')
    expect(wrapper.get('[data-testid="kpi-drafts-meta"]').text()).toBe('No drafts')
  })

  it('renders 5 recent invoice rows using customerName when present and falling back to useCustomerNames for null customerName', async () => {
    vi.spyOn(dashboardApi, 'getDashboardSummary').mockResolvedValue(makeSummary())
    vi.spyOn(invoicesApi, 'searchInvoices').mockResolvedValue({
      items: sampleRecentInvoices,
      page: 1,
      pageSize: 5,
      totalCount: 5,
    })
    const getCustomerSpy = vi.spyOn(customersApiModule, 'getCustomer')

    const { wrapper, router } = await mountDashboardPage()
    await flushPromises()

    const rows = wrapper.findAll('[data-testid="recent-invoice-row"]')
    expect(rows).toHaveLength(5)

    // Only cust-draft (where customerName is null) should trigger getCustomer
    expect(getCustomerSpy).toHaveBeenCalledTimes(1)
    expect(getCustomerSpy).toHaveBeenCalledWith('cust-draft')

    expect(rows[0]!.text()).toContain('Highveld Logistics (Pty) Ltd')
    expect(rows[4]!.text()).toContain('Draft')
    expect(rows[4]!.text()).toContain('Nguni Digital Advisory')

    // Secondary Partially paid badge on inv-2
    expect(rows[1]!.find('[data-testid="partially-paid-badge"]').exists()).toBe(true)
    expect(rows[0]!.find('[data-testid="partially-paid-badge"]').exists()).toBe(false)

    // Overdue row highlight on inv-1 (status === 'Overdue') and inv-2 (status === 'Sent' && dueDate < asOf)
    expect(rows[0]!.classes()).toContain('row--overdue')
    expect(rows[1]!.classes()).toContain('row--overdue')
    expect(rows[2]!.classes()).not.toContain('row--overdue')

    // Clicking a row navigates to /invoices/{invoiceId}
    await rows[0]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/invoices/inv-1')
  })

  it('shows the empty state with a New invoice CTA to /invoices/new when recentInvoices is empty', async () => {
    vi.spyOn(dashboardApi, 'getDashboardSummary').mockResolvedValue(makeSummary())
    vi.spyOn(invoicesApi, 'searchInvoices').mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 5,
      totalCount: 0,
    })

    const { wrapper } = await mountDashboardPage()
    await flushPromises()

    const emptyCard = wrapper.get('[data-testid="dashboard-recent-empty"]')
    expect(emptyCard.text()).toContain('No invoices yet')
    const newBtn = wrapper.get('[data-testid="dashboard-empty-new-invoice-btn"]')
    expect(newBtn.attributes('data-to')).toBe('/invoices/new')
  })

  it('isolates summary error from recent invoices and retries when Try again is clicked', async () => {
    const summarySpy = vi
      .spyOn(dashboardApi, 'getDashboardSummary')
      .mockRejectedValueOnce(new Error('Summary failed'))
      .mockResolvedValueOnce(makeSummary())
    const recentSpy = vi.spyOn(invoicesApi, 'searchInvoices').mockResolvedValue({
      items: sampleRecentInvoices,
      page: 1,
      pageSize: 5,
      totalCount: 5,
    })

    const { wrapper } = await mountDashboardPage()
    await flushPromises()

    // Summary error is shown, but recent invoices table still renders
    expect(wrapper.find('[data-testid="dashboard-summary-error"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="recent-invoice-row"]')).toHaveLength(5)

    await wrapper.get('[data-testid="dashboard-summary-retry-btn"]').trigger('click')
    await flushPromises()

    expect(summarySpy).toHaveBeenCalledTimes(2)
    expect(recentSpy).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-testid="dashboard-summary-error"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="dashboard-kpis"]').exists()).toBe(true)
  })

  it('keeps the incomplete business profile banner behaviour intact', async () => {
    vi.spyOn(dashboardApi, 'getDashboardSummary').mockResolvedValue(makeSummary())
    vi.spyOn(invoicesApi, 'searchInvoices').mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 5,
      totalCount: 0,
    })

    const { wrapper, sessionStore } = await mountDashboardPage(({ businessStore }) => {
      businessStore.status = 'ready'
      businessStore.profile = null
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="dashboard-incomplete-banner"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="dashboard-complete-setup-btn"]').exists()).toBe(false)

    sessionStore.role = 'Owner'
    await flushPromises()

    expect(wrapper.find('[data-testid="dashboard-complete-setup-btn"]').exists()).toBe(true)
  })
})
