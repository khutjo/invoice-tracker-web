<template>
  <q-page class="customers-page">
    <!-- Top Bar Header -->
    <div class="customers-page__header">
      <div>
        <h1 class="text-heading-lg">Customers</h1>
        <p class="customers-page__subtitle">
          Manage your customer directory, VAT numbers and billing addresses.
        </p>
      </div>

      <q-btn
        color="primary"
        icon="add"
        label="New customer"
        data-testid="new-customer-btn"
        @click="openCreateForm"
      />
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="attio-card customers-toolbar">
      <div class="customers-toolbar__search">
        <q-input
          :model-value="searchInput"
          type="search"
          placeholder="Search name, email or reference"
          clearable
          data-testid="customers-search-input"
          @update:model-value="onSearchInputChange(String($event ?? ''))"
          @clear="clearSearch"
        >
          <template #prepend>
            <q-icon name="search" size="18px" />
          </template>
        </q-input>
      </div>

      <div class="customers-toolbar__controls">
        <label class="customers-toolbar__toggle">
          <input
            type="checkbox"
            :checked="includeArchived"
            data-testid="customers-archived-toggle"
            @change="onArchivedToggle(($event.target as HTMLInputElement).checked)"
          />
          <span>Show archived</span>
        </label>
      </div>
    </div>

    <!-- Loading Skeleton State -->
    <div
      v-if="customersStore.loading"
      class="attio-card customers-skeleton"
      data-testid="customers-loading-skeleton"
    >
      <div v-for="n in 5" :key="n" class="customers-skeleton__row">
        <q-skeleton type="text" width="28%" />
        <q-skeleton type="text" width="26%" />
        <q-skeleton type="text" width="18%" />
        <q-skeleton type="text" width="16%" />
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="customersStore.error"
      class="attio-card customers-state-card"
      data-testid="customers-error-state"
    >
      <q-icon name="error_outline" size="24px" class="customers-state-card__icon" />
      <h2 class="text-heading-md">Couldn't load customers</h2>
      <p class="customers-state-card__copy">{{ customersStore.error }}</p>
      <q-btn
        outline
        color="primary"
        label="Try again"
        data-testid="customers-retry-btn"
        @click="reloadCurrentQuery"
      />
    </div>

    <!-- Empty State (With Search) -->
    <div
      v-else-if="items.length === 0 && activeSearchTerm"
      class="attio-card customers-state-card"
      data-testid="customers-empty-search"
    >
      <q-icon name="search_off" size="24px" class="customers-state-card__icon" />
      <h2 class="text-heading-md">No customers match "{{ activeSearchTerm }}"</h2>
      <p class="customers-state-card__copy">
        Try searching by another name, email address or customer reference.
      </p>
      <button
        type="button"
        class="customers-state-card__link"
        data-testid="customers-clear-search-link"
        @click="clearSearch"
      >
        Clear search
      </button>
    </div>

    <!-- Empty State (No Customers At All) -->
    <div
      v-else-if="items.length === 0"
      class="attio-card customers-state-card"
      data-testid="customers-empty-all"
    >
      <q-icon name="people_outline" size="24px" class="customers-state-card__icon" />
      <h2 class="text-heading-md">No customers yet</h2>
      <p class="customers-state-card__copy">
        Add your first customer to start creating and sending ZAR tax invoices.
      </p>
      <q-btn
        color="primary"
        icon="add"
        label="New customer"
        data-testid="empty-new-customer-btn"
        @click="openCreateForm"
      />
    </div>

    <!-- Mobile Stacked Cards (xs < 600px) -->
    <div v-else-if="isMobile" class="customers-mobile-list" data-testid="customers-mobile-list">
      <div
        v-for="cust in items"
        :key="cust.customerId"
        class="attio-card customer-mobile-card"
        data-testid="customer-row"
        @click="openCustomerDetail(cust.customerId)"
      >
        <div class="customer-mobile-card__top">
          <div>
            <div class="customer-mobile-card__name">{{ cust.name }}</div>
            <div v-if="cust.customerReference" class="customer-mobile-card__ref tabular-nums">
              {{ cust.customerReference }}
            </div>
          </div>
          <span v-if="cust.isArchived" class="status-pill status-pill--draft"> Archived </span>
          <span v-else class="status-pill status-pill--paid"> Active </span>
        </div>
        <div class="customer-mobile-card__meta">
          <span>{{ cust.email }}</span>
          <span v-if="cust.phoneNumber" class="tabular-nums">{{ cust.phoneNumber }}</span>
        </div>
      </div>

      <!-- Pagination Footer -->
      <div class="attio-card customers-pagination">
        <span class="customers-pagination__summary tabular-nums">
          {{ paginationRangeText }}
        </span>
        <div class="customers-pagination__actions">
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
    <div v-else class="attio-card customers-table-card" data-testid="customers-table-card">
      <div class="table-scroll">
        <table class="attio-table customers-table">
          <thead>
            <tr>
              <th class="text-left">Name</th>
              <th class="text-left">Email</th>
              <th class="text-left">Phone</th>
              <th class="text-left">City</th>
              <th class="text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="cust in items"
              :key="cust.customerId"
              data-testid="customer-row"
              @click="openCustomerDetail(cust.customerId)"
            >
              <td>
                <div class="customers-table__name">{{ cust.name }}</div>
                <div v-if="cust.customerReference" class="customers-table__ref tabular-nums">
                  {{ cust.customerReference }}
                </div>
              </td>
              <td class="text-secondary">{{ cust.email }}</td>
              <td class="tabular-nums text-secondary">{{ cust.phoneNumber || '—' }}</td>
              <td class="text-secondary">{{ cust.city || '—' }}</td>
              <td class="text-right">
                <span
                  v-if="cust.isArchived"
                  class="status-pill status-pill--draft"
                  data-testid="customer-row-archived-pill"
                >
                  Archived
                </span>
                <span
                  v-else
                  class="status-pill status-pill--paid"
                  data-testid="customer-row-active-pill"
                >
                  Active
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Quiet Pagination Footer -->
      <div class="customers-pagination">
        <div class="customers-pagination__left">
          <span class="customers-pagination__summary tabular-nums">
            {{ paginationRangeText }}
          </span>
        </div>

        <div class="customers-pagination__right">
          <label class="customers-pagination__size-label">
            <span>Rows per page</span>
            <select
              :value="currentPageSize"
              class="customers-pagination__size-select"
              data-testid="customers-page-size-select"
              @change="changePageSize(Number(($event.target as HTMLSelectElement).value))"
            >
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
            </select>
          </label>

          <div class="customers-pagination__actions">
            <q-btn
              flat
              dense
              icon="chevron_left"
              aria-label="Previous page"
              :disable="currentPage <= 1"
              data-testid="customers-prev-page"
              @click="changePage(currentPage - 1)"
            />
            <q-btn
              flat
              dense
              icon="chevron_right"
              aria-label="Next page"
              :disable="currentPage >= totalPages"
              data-testid="customers-next-page"
              @click="changePage(currentPage + 1)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Create Customer Drawer / Dialog -->
    <CustomerForm v-model="createDrawerOpen" :customer="null" @created="onCustomerCreated" />
  </q-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'
import { useQuasar } from 'quasar'
import type { CustomerDetails } from 'src/features/customers/api'
import CustomerForm from 'src/features/customers/components/CustomerForm.vue'
import { useCustomersStore } from 'src/features/customers/store'

const ALLOWED_PAGE_SIZES = [10, 20, 50] as const

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const customersStore = useCustomersStore()

const isMobile = computed(() => Boolean($q.screen?.xs))

const searchInput = ref('')
const createDrawerOpen = ref(false)
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

function parseQueryFromRoute() {
  const rawSearch = typeof route.query.search === 'string' ? route.query.search : ''
  const rawPage = Number(route.query.page)
  const rawPageSize = Number(route.query.pageSize)
  const rawArchived = route.query.archived

  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1
  const pageSize = ALLOWED_PAGE_SIZES.includes(rawPageSize as (typeof ALLOWED_PAGE_SIZES)[number])
    ? rawPageSize
    : 20
  const includeArchived = rawArchived === '1' || rawArchived === 'true'

  return {
    search: rawSearch,
    page,
    pageSize,
    includeArchived,
  }
}

const activeSearchTerm = computed(() => parseQueryFromRoute().search.trim())
const includeArchived = computed(() => parseQueryFromRoute().includeArchived)
const currentPage = computed(() => parseQueryFromRoute().page)
const currentPageSize = computed(() => parseQueryFromRoute().pageSize)

const items = computed(() => customersStore.pageData.items)
const totalCount = computed(() => customersStore.pageData.totalCount)

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
  search?: string
  page?: number
  pageSize?: number
  includeArchived?: boolean
}): LocationQueryRaw {
  const current = parseQueryFromRoute()
  const next = {
    ...current,
    ...overrides,
  }

  const query: LocationQueryRaw = {}
  if (next.search.trim()) {
    query.search = next.search.trim()
  }
  if (next.page > 1) {
    query.page = String(next.page)
  }
  if (next.pageSize !== 20) {
    query.pageSize = String(next.pageSize)
  }
  if (next.includeArchived) {
    query.archived = '1'
  }
  return query
}

async function syncFromRouteAndFetch() {
  const parsed = parseQueryFromRoute()
  searchInput.value = parsed.search
  customersStore.setLastListRouteQuery(
    buildRouteQuery({
      search: parsed.search,
      page: parsed.page,
      pageSize: parsed.pageSize,
      includeArchived: parsed.includeArchived,
    }),
  )
  await customersStore.fetchCustomersPage(parsed)
}

watch(
  () => route.query,
  () => {
    void syncFromRouteAndFetch()
  },
  { immediate: true },
)

function onSearchInputChange(value: string) {
  searchInput.value = value
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }

  searchDebounceTimer = setTimeout(() => {
    const nextQuery = buildRouteQuery({
      search: value,
      page: 1,
    })
    void router.replace({ path: '/customers', query: nextQuery })
  }, 300)
}

function clearSearch() {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
  searchInput.value = ''
  const nextQuery = buildRouteQuery({
    search: '',
    page: 1,
  })
  void router.replace({ path: '/customers', query: nextQuery })
}

function onArchivedToggle(checked: boolean) {
  const nextQuery = buildRouteQuery({
    includeArchived: checked,
    page: 1,
  })
  void router.replace({ path: '/customers', query: nextQuery })
}

function changePage(nextPage: number) {
  if (nextPage < 1 || nextPage > totalPages.value) return
  const nextQuery = buildRouteQuery({ page: nextPage })
  void router.push({ path: '/customers', query: nextQuery })
}

function changePageSize(nextSize: number) {
  const nextQuery = buildRouteQuery({ pageSize: nextSize, page: 1 })
  void router.replace({ path: '/customers', query: nextQuery })
}

function reloadCurrentQuery() {
  void syncFromRouteAndFetch()
}

function openCreateForm() {
  createDrawerOpen.value = true
}

function openCustomerDetail(customerId: string) {
  void router.push(`/customers/${encodeURIComponent(customerId)}`)
}

function onCustomerCreated(created: CustomerDetails) {
  void router.push(`/customers/${encodeURIComponent(created.customerId)}`)
}

onBeforeUnmount(() => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
})
</script>

<style scoped lang="scss">
.customers-page {
  padding: 20px;
  max-width: 1440px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;

  @media (max-width: 599px) {
    padding: 12px;
    gap: 12px;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  &__subtitle {
    margin: 2px 0 0;
    font-size: 13px;
    color: var(--text-secondary);
  }
}

.customers-toolbar {
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;

  &__search {
    flex: 1;
    min-width: 240px;
    max-width: 420px;
  }

  &__controls {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-secondary);
    cursor: pointer;
    user-select: none;

    input {
      cursor: pointer;
    }
  }
}

.customers-skeleton {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    height: 36px;
    border-bottom: 1px solid var(--border-hairline);

    &:last-child {
      border-bottom: none;
    }
  }
}

.customers-state-card {
  padding: 36px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;

  &__icon {
    color: var(--text-muted);
  }

  &__copy {
    margin: 0;
    max-width: 380px;
    font-size: 13px;
    color: var(--text-secondary);
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

.customers-table-card {
  overflow: hidden;
}

.table-scroll {
  width: 100%;
  overflow-x: auto;
}

.customers-table {
  width: 100%;
  border-collapse: collapse;

  &__name {
    font-weight: 500;
    color: var(--text-primary);
  }

  &__ref {
    font-size: 11.5px;
    color: var(--text-muted);
  }
}

.customers-mobile-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.customer-mobile-card {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;

  &__top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  &__name {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text-primary);
  }

  &__ref {
    font-size: 11.5px;
    color: var(--text-muted);
  }

  &__meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 12.5px;
    color: var(--text-secondary);
  }
}

.customers-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 14px;
  background: var(--bg-surface-subtle);
  border-top: 1px solid var(--border-hairline);
  font-size: 12.5px;
  color: var(--text-secondary);

  &__right {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  &__size-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  &__size-select {
    border: 1px solid var(--border-hairline);
    border-radius: 4px;
    background: var(--bg-surface);
    color: var(--text-primary);
    padding: 2px 6px;
    font-size: 12px;
    font-family: inherit;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.text-secondary {
  color: var(--text-secondary);
}
</style>
