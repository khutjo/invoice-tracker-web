<template>
  <q-page class="invoices-page">
    <!-- Top Bar Header -->
    <div class="invoices-page__header">
      <div>
        <h1 class="text-heading-lg">Invoices</h1>
        <p class="invoices-page__subtitle">Track draft, sent, overdue and paid ZAR tax invoices.</p>
      </div>

      <q-btn
        color="primary"
        icon="add"
        label="New invoice"
        to="/invoices/new"
        data-testid="new-invoice-btn"
      />
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="attio-card invoices-toolbar">
      <!-- Status Chips Row -->
      <div class="invoices-toolbar__chips" role="group" aria-label="Filter by status">
        <button
          v-for="chip in statusChips"
          :key="chip.value || 'all'"
          type="button"
          class="status-chip-btn"
          :class="{ 'status-chip-btn--active': activeStatus === chip.value }"
          :data-testid="`status-chip-${chip.value || 'All'}`"
          @click="onStatusChipClick(chip.value)"
        >
          {{ chip.label }}
        </button>
      </div>

      <!-- Secondary Filters Row -->
      <div class="invoices-toolbar__filters">
        <!-- Search Invoice Number -->
        <div class="invoices-toolbar__search">
          <q-input
            :model-value="searchInput"
            type="search"
            placeholder="Search invoice number"
            clearable
            data-testid="invoices-search-input"
            @update:model-value="onSearchInputChange(String($event ?? ''))"
            @clear="clearSearchInput"
          >
            <template #prepend>
              <q-icon name="search" size="18px" />
            </template>
          </q-input>
        </div>

        <!-- Customer Picker -->
        <div class="invoices-toolbar__customer">
          <div class="customer-filter-box">
            <input
              :value="customerSearchText"
              type="search"
              placeholder="Filter by customer…"
              aria-label="Filter by customer"
              class="toolbar-native-input"
              data-testid="invoices-customer-search-input"
              @focus="onCustomerFilterFocus"
              @input="onCustomerSearchInput(($event.target as HTMLInputElement).value)"
            />
            <button
              v-if="activeCustomerId"
              type="button"
              class="customer-filter-box__clear"
              aria-label="Clear customer filter"
              data-testid="invoices-customer-clear-btn"
              @click="selectCustomerFilter('')"
            >
              ×
            </button>

            <div
              v-if="customerDropdownOpen"
              class="customer-filter-dropdown"
              data-testid="invoices-customer-dropdown"
            >
              <button
                type="button"
                class="customer-filter-dropdown__item"
                @click="selectCustomerFilter('')"
              >
                All customers
              </button>
              <button
                v-for="cust in customerOptions"
                :key="cust.customerId"
                type="button"
                class="customer-filter-dropdown__item"
                :data-testid="`customer-filter-option-${cust.customerId}`"
                @click="selectCustomerFilter(cust.customerId, cust.name)"
              >
                <span>{{ cust.name }}</span>
                <span class="customer-filter-dropdown__sub">{{ cust.email }}</span>
              </button>
              <div
                v-if="!customerSearchLoading && customerOptions.length === 0"
                class="customer-filter-dropdown__empty"
              >
                No matching customers
              </div>
            </div>
          </div>
        </div>

        <!-- Issue Date Range -->
        <div class="invoices-toolbar__dates">
          <label class="date-filter-field">
            <span class="date-filter-field__label">Issued from</span>
            <input
              :value="activeIssuedFrom"
              type="date"
              class="toolbar-native-input tabular-nums"
              data-testid="invoices-issued-from"
              @change="onIssuedFromChange(($event.target as HTMLInputElement).value)"
            />
          </label>

          <label class="date-filter-field">
            <span class="date-filter-field__label">Issued to</span>
            <input
              :value="activeIssuedTo"
              type="date"
              class="toolbar-native-input tabular-nums"
              data-testid="invoices-issued-to"
              @change="onIssuedToChange(($event.target as HTMLInputElement).value)"
            />
          </label>
        </div>

        <!-- Overdue Only Toggle -->
        <label class="invoices-toolbar__toggle">
          <input
            type="checkbox"
            :checked="activeOverdueOnly"
            data-testid="invoices-overdue-toggle"
            @change="onOverdueToggle(($event.target as HTMLInputElement).checked)"
          />
          <span>Overdue only</span>
        </label>
      </div>
    </div>

    <!-- Loading Skeleton State -->
    <div
      v-if="invoicesStore.loading"
      class="attio-card invoices-skeleton"
      data-testid="invoices-loading-skeleton"
    >
      <div v-for="n in 5" :key="n" class="invoices-skeleton__row">
        <q-skeleton type="text" width="16%" />
        <q-skeleton type="text" width="24%" />
        <q-skeleton type="text" width="14%" />
        <q-skeleton type="text" width="14%" />
        <q-skeleton type="text" width="14%" />
        <q-skeleton type="text" width="12%" />
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="invoicesStore.error"
      class="attio-card invoices-state-card"
      data-testid="invoices-error-state"
    >
      <q-icon name="error_outline" size="24px" class="invoices-state-card__icon" />
      <h2 class="text-heading-md">Couldn't load invoices</h2>
      <p class="invoices-state-card__copy">{{ invoicesStore.error }}</p>
      <q-btn
        outline
        color="primary"
        label="Try again"
        data-testid="invoices-retry-btn"
        @click="reloadCurrentQuery"
      />
    </div>

    <!-- Empty State (With Active Filters) -->
    <div
      v-else-if="items.length === 0 && hasActiveFilters"
      class="attio-card invoices-state-card"
      data-testid="invoices-empty-filters"
    >
      <q-icon name="filter_alt_off" size="24px" class="invoices-state-card__icon" />
      <h2 class="text-heading-md">No invoices match these filters</h2>
      <p class="invoices-state-card__copy">
        Try adjusting the status, customer, date range or search query.
      </p>
      <button
        type="button"
        class="invoices-state-card__link"
        data-testid="invoices-clear-filters-link"
        @click="clearAllFilters"
      >
        Clear filters
      </button>
    </div>

    <!-- Empty State (No Invoices At All) -->
    <div
      v-else-if="items.length === 0"
      class="attio-card invoices-state-card"
      data-testid="invoices-empty-all"
    >
      <q-icon name="receipt_long" size="24px" class="invoices-state-card__icon" />
      <h2 class="text-heading-md">No invoices yet</h2>
      <p class="invoices-state-card__copy">
        Create your first draft invoice to bill a customer in South African Rand (ZAR).
      </p>
      <q-btn
        color="primary"
        icon="add"
        label="New invoice"
        to="/invoices/new"
        data-testid="empty-new-invoice-btn"
      />
    </div>

    <!-- Mobile Stacked Cards (xs < 600px) -->
    <div v-else-if="isMobile" class="invoices-mobile-list" data-testid="invoices-mobile-list">
      <div
        v-for="inv in items"
        :key="inv.invoiceId"
        class="attio-card invoice-mobile-card"
        :class="{ 'invoice-mobile-card--overdue': inv.status === 'Overdue' }"
        data-testid="invoice-row"
        @click="openInvoiceDetail(inv.invoiceId)"
      >
        <div class="invoice-mobile-card__top">
          <span
            class="tabular-nums"
            :class="inv.invoiceNumber ? 'invoice-number' : 'invoice-number--draft'"
          >
            {{ inv.invoiceNumber ?? 'Draft' }}
          </span>
          <div class="invoice-status-group">
            <span :class="statusPillClass(inv.status)">
              {{ inv.status }}
            </span>
            <span
              v-if="isPartiallyPaid(inv)"
              class="status-pill status-pill--partially-paid"
              data-testid="partially-paid-badge"
            >
              Partially paid
            </span>
            <span
              v-if="isOverpaid(inv)"
              class="status-pill status-pill--paid"
              data-testid="credit-badge"
            >
              Credit
            </span>
          </div>
        </div>

        <div class="invoice-mobile-card__customer">
          <span v-if="inv.customerName">{{ inv.customerName }}</span>
          <q-skeleton v-else-if="isCustomerLoading(inv.customerId)" type="text" width="130px" />
          <span v-else>{{ getCustomerName(inv.customerId) }}</span>
        </div>

        <div class="invoice-mobile-card__bottom">
          <span class="text-secondary tabular-nums">
            Due {{ formatInvoiceDate(inv.dueDate) }}
          </span>
          <strong class="tabular-nums">{{ formatZar(inv.total) }}</strong>
        </div>

        <div
          v-if="inv.status !== 'Draft' && inv.balance !== inv.total"
          class="invoice-mobile-card__balance tabular-nums"
          :class="{ 'invoice-balance--credit': isOverpaid(inv) }"
          data-testid="invoice-balance"
        >
          {{ isOverpaid(inv) ? 'Credit' : 'Balance' }} {{ formatBalance(inv.balance) }}
        </div>
      </div>

      <!-- Mobile Pagination Footer -->
      <div class="attio-card invoices-pagination">
        <span class="invoices-pagination__summary tabular-nums">
          {{ paginationRangeText }}
        </span>
        <div class="invoices-pagination__actions">
          <q-btn
            flat
            dense
            icon="chevron_left"
            aria-label="Previous page"
            :disable="currentPage <= 1"
            @click="changePage(currentPage - 1)"
          />
          <q-btn
            flat
            dense
            icon="chevron_right"
            aria-label="Next page"
            :disable="currentPage >= totalPages"
            @click="changePage(currentPage + 1)"
          />
        </div>
      </div>
    </div>

    <!-- Desktop Table (sm and up) -->
    <div v-else class="attio-card invoices-table-card" data-testid="invoices-table-card">
      <div class="table-scroll">
        <table class="attio-table invoices-table">
          <thead>
            <tr>
              <th class="text-left">Number</th>
              <th class="text-left">Customer</th>
              <th class="text-left">Issued</th>
              <th class="text-left">Due</th>
              <th class="text-right">Total</th>
              <th class="text-right">Balance</th>
              <th class="text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="inv in items"
              :key="inv.invoiceId"
              :class="{ 'invoice-row--overdue': inv.status === 'Overdue' }"
              data-testid="invoice-row"
              @click="openInvoiceDetail(inv.invoiceId)"
            >
              <td class="tabular-nums">
                <span :class="inv.invoiceNumber ? 'invoice-number' : 'invoice-number--draft'">
                  {{ inv.invoiceNumber ?? 'Draft' }}
                </span>
              </td>
              <td>
                <span v-if="inv.customerName">{{ inv.customerName }}</span>
                <q-skeleton
                  v-else-if="isCustomerLoading(inv.customerId)"
                  type="text"
                  width="140px"
                  data-testid="customer-name-skeleton"
                />
                <span v-else>{{ getCustomerName(inv.customerId) }}</span>
              </td>
              <td class="tabular-nums text-secondary">
                {{ formatInvoiceDate(inv.issueDate) }}
              </td>
              <td class="tabular-nums text-secondary">
                {{ formatInvoiceDate(inv.dueDate) }}
              </td>
              <td class="text-money">{{ formatZar(inv.total) }}</td>
              <td
                class="text-money"
                :class="{ 'invoice-balance--credit': isOverpaid(inv) }"
                data-testid="invoice-balance"
              >
                {{ formatBalance(inv.balance) }}
              </td>
              <td class="text-right">
                <div class="invoice-status-group invoice-status-group--right">
                  <span :class="statusPillClass(inv.status)" data-testid="invoice-status-pill">
                    {{ inv.status }}
                  </span>
                  <span
                    v-if="isPartiallyPaid(inv)"
                    class="status-pill status-pill--partially-paid"
                    data-testid="partially-paid-badge"
                  >
                    Partially paid
                  </span>
                  <span
                    v-if="isOverpaid(inv)"
                    class="status-pill status-pill--paid"
                    data-testid="credit-badge"
                  >
                    Credit
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Quiet Pagination Footer -->
      <div class="invoices-pagination">
        <div class="invoices-pagination__left">
          <span class="invoices-pagination__summary tabular-nums">
            {{ paginationRangeText }}
          </span>
        </div>

        <div class="invoices-pagination__right">
          <label class="invoices-pagination__size-label">
            <span>Rows per page</span>
            <select
              :value="currentPageSize"
              class="invoices-pagination__size-select"
              data-testid="invoices-page-size-select"
              @change="changePageSize(Number(($event.target as HTMLSelectElement).value))"
            >
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
            </select>
          </label>

          <div class="invoices-pagination__actions">
            <q-btn
              flat
              dense
              icon="chevron_left"
              aria-label="Previous page"
              :disable="currentPage <= 1"
              data-testid="invoices-prev-page"
              @click="changePage(currentPage - 1)"
            />
            <span class="invoices-pagination__page-indicator tabular-nums">
              Page {{ currentPage }} of {{ totalPages }}
            </span>
            <q-btn
              flat
              dense
              icon="chevron_right"
              aria-label="Next page"
              :disable="currentPage >= totalPages"
              data-testid="invoices-next-page"
              @click="changePage(currentPage + 1)"
            />
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'
import { useQuasar } from 'quasar'
import { searchCustomers, type CustomerSummary } from 'src/features/customers/api'
import type { InvoiceStatus } from '../api'
import { useCustomerNames } from '../composables/useCustomerNames'
import { isOverpaid, isPartiallyPaid, statusPillClass } from '../status'
import { useInvoicesStore } from '../store'
import { formatInvoiceDate, formatZar } from 'src/shared/money'

// A negative balance is an overpayment credit: show it as "R 90,00 CR", never with a minus sign
function formatBalance(balance: number): string {
  return balance < 0 ? `${formatZar(Math.abs(balance))} CR` : formatZar(balance)
}

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const invoicesStore = useInvoicesStore()
const { resolveCustomerIds, setCustomerName, isCustomerLoading, getCustomerName } =
  useCustomerNames()

const VALID_STATUSES: readonly InvoiceStatus[] = ['Draft', 'Sent', 'Overdue', 'Paid', 'Cancelled']

const statusChips: ReadonlyArray<{ label: string; value: InvoiceStatus | '' }> = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'Draft' },
  { label: 'Sent', value: 'Sent' },
  { label: 'Overdue', value: 'Overdue' },
  { label: 'Paid', value: 'Paid' },
  { label: 'Cancelled', value: 'Cancelled' },
]

const searchInput = ref('')
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

const customerSearchText = ref('')
const customerOptions = ref<CustomerSummary[]>([])
const customerSearchLoading = ref(false)
const customerDropdownOpen = ref(false)
let customerDebounceTimer: ReturnType<typeof setTimeout> | null = null

onBeforeUnmount(() => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  if (customerDebounceTimer) {
    clearTimeout(customerDebounceTimer)
  }
})

const isMobile = computed(() => Boolean($q.screen?.lt?.sm))

const activeStatus = computed<InvoiceStatus | ''>(() => {
  const raw = typeof route.query.status === 'string' ? route.query.status.trim() : ''
  return (VALID_STATUSES as readonly string[]).includes(raw) ? (raw as InvoiceStatus) : ''
})

const activeCustomerId = computed(() =>
  typeof route.query.customerId === 'string' ? route.query.customerId.trim() : '',
)

const activeIssuedFrom = computed(() =>
  typeof route.query.issuedFrom === 'string' ? route.query.issuedFrom.trim() : '',
)

const activeIssuedTo = computed(() =>
  typeof route.query.issuedTo === 'string' ? route.query.issuedTo.trim() : '',
)

const activeOverdueOnly = computed(
  () => route.query.overdue === '1' || route.query.overdue === 'true',
)

const activeSearchTerm = computed(() =>
  typeof route.query.search === 'string' ? route.query.search.trim() : '',
)

const currentPage = computed(() => {
  const raw = Number(route.query.page)
  return Number.isInteger(raw) && raw >= 1 ? raw : 1
})

const currentPageSize = computed(() => {
  const raw = Number(route.query.pageSize)
  return raw === 10 || raw === 20 || raw === 50 ? raw : 20
})

const hasActiveFilters = computed(() =>
  Boolean(
    activeStatus.value ||
    activeCustomerId.value ||
    activeIssuedFrom.value ||
    activeIssuedTo.value ||
    activeOverdueOnly.value ||
    activeSearchTerm.value,
  ),
)

const items = computed(() => invoicesStore.pageResult?.items ?? [])
const totalCount = computed(() => invoicesStore.pageResult?.totalCount ?? 0)
const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / currentPageSize.value)))

const paginationRangeText = computed(() => {
  if (totalCount.value === 0) {
    return '0 of 0'
  }
  const start = (currentPage.value - 1) * currentPageSize.value + 1
  const end = Math.min(totalCount.value, start + items.value.length - 1)
  return `${start}–${end} of ${totalCount.value}`
})

function buildRouteQuery(overrides: {
  status?: InvoiceStatus | ''
  customerId?: string
  issuedFrom?: string
  issuedTo?: string
  overdueOnly?: boolean
  search?: string
  page?: number
  pageSize?: number
}): LocationQueryRaw {
  const nextStatus = overrides.status !== undefined ? overrides.status : activeStatus.value
  const nextCustomerId =
    overrides.customerId !== undefined ? overrides.customerId : activeCustomerId.value
  const nextIssuedFrom =
    overrides.issuedFrom !== undefined ? overrides.issuedFrom : activeIssuedFrom.value
  const nextIssuedTo = overrides.issuedTo !== undefined ? overrides.issuedTo : activeIssuedTo.value
  const nextOverdue =
    overrides.overdueOnly !== undefined ? overrides.overdueOnly : activeOverdueOnly.value
  const nextSearch =
    overrides.search !== undefined ? overrides.search.trim() : activeSearchTerm.value
  const nextPage = overrides.page !== undefined ? overrides.page : currentPage.value
  const nextPageSize = overrides.pageSize !== undefined ? overrides.pageSize : currentPageSize.value

  const q: LocationQueryRaw = {}
  if (nextStatus) {
    q.status = nextStatus
  }
  if (nextCustomerId) {
    q.customerId = nextCustomerId
  }
  if (nextIssuedFrom) {
    q.issuedFrom = nextIssuedFrom
  }
  if (nextIssuedTo) {
    q.issuedTo = nextIssuedTo
  }
  if (nextOverdue) {
    q.overdue = '1'
  }
  if (nextSearch) {
    q.search = nextSearch
  }
  if (nextPage > 1) {
    q.page = String(nextPage)
  }
  if (nextPageSize !== 20) {
    q.pageSize = String(nextPageSize)
  }
  return q
}

async function syncFromRouteAndFetch() {
  searchInput.value = activeSearchTerm.value
  const currentQuery = buildRouteQuery({})
  invoicesStore.setLastListRouteQuery(currentQuery)

  const page = await invoicesStore.fetchInvoicesPage({
    status: activeStatus.value,
    customerId: activeCustomerId.value,
    issuedFrom: activeIssuedFrom.value,
    issuedTo: activeIssuedTo.value,
    overdueOnly: activeOverdueOnly.value,
    search: activeSearchTerm.value,
    page: currentPage.value,
    pageSize: currentPageSize.value,
  })

  const idsToResolve = new Set<string>()
  if (activeCustomerId.value) {
    idsToResolve.add(activeCustomerId.value)
  }
  for (const inv of page?.items ?? []) {
    if (inv.customerName) {
      setCustomerName(inv.customerId, inv.customerName)
    } else if (inv.customerId) {
      idsToResolve.add(inv.customerId)
    }
  }
  if (idsToResolve.size > 0) {
    await resolveCustomerIds(Array.from(idsToResolve))
    if (activeCustomerId.value && !customerDropdownOpen.value) {
      customerSearchText.value = getCustomerName(activeCustomerId.value)
    }
  } else if (!activeCustomerId.value && !customerDropdownOpen.value) {
    customerSearchText.value = ''
  }
}

watch(
  () => route.query,
  () => {
    void syncFromRouteAndFetch()
  },
  { immediate: true },
)

function reloadCurrentQuery() {
  void syncFromRouteAndFetch()
}

function onStatusChipClick(status: InvoiceStatus | '') {
  void router.replace({
    path: '/invoices',
    query: buildRouteQuery({ status, page: 1 }),
  })
}

function onSearchInputChange(value: string) {
  searchInput.value = value
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  searchDebounceTimer = setTimeout(() => {
    void router.replace({
      path: '/invoices',
      query: buildRouteQuery({ search: value, page: 1 }),
    })
  }, 300)
}

function clearSearchInput() {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
  searchInput.value = ''
  void router.replace({
    path: '/invoices',
    query: buildRouteQuery({ search: '', page: 1 }),
  })
}

async function runCustomerFilterSearch(term: string) {
  customerSearchLoading.value = true
  try {
    const res = await searchCustomers({
      search: term,
      page: 1,
      pageSize: 10,
      includeArchived: false,
    })
    customerOptions.value = res.items
    for (const c of res.items) {
      setCustomerName(c.customerId, c.name)
    }
  } catch {
    customerOptions.value = []
  } finally {
    customerSearchLoading.value = false
  }
}

function onCustomerFilterFocus() {
  customerDropdownOpen.value = true
  void runCustomerFilterSearch(customerSearchText.value)
}

function onCustomerSearchInput(value: string) {
  customerSearchText.value = value
  customerDropdownOpen.value = true
  if (customerDebounceTimer) {
    clearTimeout(customerDebounceTimer)
  }
  customerDebounceTimer = setTimeout(() => {
    void runCustomerFilterSearch(value)
  }, 300)
}

function selectCustomerFilter(customerId: string, customerName?: string) {
  customerDropdownOpen.value = false
  if (customerId && customerName) {
    setCustomerName(customerId, customerName)
    customerSearchText.value = customerName
  } else if (!customerId) {
    customerSearchText.value = ''
  }
  void router.replace({
    path: '/invoices',
    query: buildRouteQuery({ customerId, page: 1 }),
  })
}

function onIssuedFromChange(issuedFrom: string) {
  void router.replace({
    path: '/invoices',
    query: buildRouteQuery({ issuedFrom, page: 1 }),
  })
}

function onIssuedToChange(issuedTo: string) {
  void router.replace({
    path: '/invoices',
    query: buildRouteQuery({ issuedTo, page: 1 }),
  })
}

function onOverdueToggle(checked: boolean) {
  void router.replace({
    path: '/invoices',
    query: buildRouteQuery({ overdueOnly: checked, page: 1 }),
  })
}

function clearAllFilters() {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
  searchInput.value = ''
  customerSearchText.value = ''
  customerDropdownOpen.value = false
  void router.replace({
    path: '/invoices',
    query: buildRouteQuery({
      status: '',
      customerId: '',
      issuedFrom: '',
      issuedTo: '',
      overdueOnly: false,
      search: '',
      page: 1,
    }),
  })
}

function changePage(page: number) {
  if (page < 1 || page > totalPages.value) return
  void router.replace({
    path: '/invoices',
    query: buildRouteQuery({ page }),
  })
}

function changePageSize(pageSize: number) {
  void router.replace({
    path: '/invoices',
    query: buildRouteQuery({ pageSize, page: 1 }),
  })
}

function openInvoiceDetail(invoiceId: string) {
  void router.push(`/invoices/${encodeURIComponent(invoiceId)}`)
}
</script>

<style scoped lang="scss">
.invoices-page {
  padding: 20px;
  max-width: 1180px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__subtitle {
    margin: 2px 0 0;
    color: var(--text-secondary);
    font-size: 13px;
  }
}

.invoices-toolbar {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &__chips {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--border-hairline);
    padding-bottom: 10px;
  }

  &__filters {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__search {
    flex: 1 1 220px;
    max-width: 300px;
  }

  &__customer {
    flex: 1 1 200px;
    max-width: 260px;
  }

  &__dates {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-secondary);
    cursor: pointer;
    user-select: none;
  }
}

.status-chip-btn {
  border: 1px solid var(--border-hairline);
  background: var(--bg-surface);
  color: var(--text-secondary);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.12s ease;

  &:hover {
    background: var(--bg-surface-hover);
    color: var(--text-primary);
  }

  &--active {
    background: var(--accent-subtle);
    color: var(--accent-primary);
    border-color: var(--accent-primary);
  }
}

.toolbar-native-input {
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--border-hairline);
  border-radius: 6px;
  background: var(--bg-surface);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13px;
  width: 100%;

  &:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px var(--focus-ring);
  }
}

.customer-filter-box {
  position: relative;
  display: flex;
  align-items: center;

  &__clear {
    position: absolute;
    right: 6px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-size: 16px;
    cursor: pointer;
    padding: 2px 6px;
  }
}

.customer-filter-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 30;
  background: var(--bg-surface);
  border: 1px solid var(--border-hairline);
  border-radius: 8px;
  box-shadow: var(--popover-shadow);
  max-height: 220px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;

  &__item {
    border: none;
    background: transparent;
    text-align: left;
    padding: 8px 10px;
    font-size: 12.5px;
    color: var(--text-primary);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 2px;

    &:hover {
      background: var(--bg-surface-hover);
    }
  }

  &__sub {
    font-size: 11.5px;
    color: var(--text-muted);
  }

  &__empty {
    padding: 10px;
    font-size: 12px;
    color: var(--text-muted);
    text-align: center;
  }
}

.date-filter-field {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  &__label {
    font-size: 12px;
    color: var(--text-secondary);
    white-space: nowrap;
  }
}

.invoices-skeleton {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 0;
    border-bottom: 1px solid var(--border-hairline);

    &:last-child {
      border-bottom: none;
    }
  }
}

.invoices-state-card {
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;

  &__icon {
    color: var(--text-muted);
    margin-bottom: 4px;
  }

  &__copy {
    margin: 0 0 8px;
    max-width: 380px;
    color: var(--text-secondary);
    font-size: 13px;
  }

  &__link {
    border: none;
    background: transparent;
    color: var(--accent-primary);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;

    &:hover {
      text-decoration: underline;
    }
  }
}

.invoices-table-card {
  overflow: hidden;
}

.table-scroll {
  overflow-x: auto;
}

.invoices-table {
  width: 100%;
  border-collapse: collapse;
}

.invoice-row--overdue {
  background-color: var(--row-overdue-bg);

  td:first-child {
    box-shadow: inset 3px 0 0 var(--pill-overdue-text);
  }
}

.invoice-number {
  font-weight: 600;
  color: var(--text-primary);

  &--draft {
    color: var(--text-muted);
    font-style: italic;
  }
}

.invoice-status-group {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;

  &--right {
    justify-content: flex-end;
  }
}

.invoices-mobile-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.invoice-mobile-card {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;

  &--overdue {
    border-left: 3px solid var(--pill-overdue-text);
    background-color: var(--row-overdue-bg);
  }

  &__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  &__customer {
    font-weight: 500;
    color: var(--text-primary);
  }

  &__bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 12.5px;
  }

  &__balance {
    margin-top: 4px;
    font-size: 12.5px;
    text-align: right;
    color: var(--text-secondary);
  }
}

.invoices-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-top: 1px solid var(--border-hairline);
  background: var(--bg-surface-subtle);
  flex-wrap: wrap;

  &__summary {
    font-size: 12.5px;
    color: var(--text-secondary);
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  &__size-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    color: var(--text-secondary);
  }

  &__size-select {
    padding: 3px 6px;
    border-radius: 4px;
    border: 1px solid var(--border-hairline);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 12.5px;
  }

  &__actions {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  &__page-indicator {
    font-size: 12.5px;
    color: var(--text-secondary);
  }
}

.text-secondary {
  color: var(--text-secondary);
}

// Overpayment credit, shown as "R 90,00 CR"
.invoice-balance--credit {
  color: var(--pill-paid-text);
  font-weight: 600;
}
</style>
