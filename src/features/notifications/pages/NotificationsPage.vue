<template>
  <q-page class="notifications-page">
    <!-- Top Header -->
    <div class="notifications-page__header">
      <div>
        <h1 class="text-heading-lg">Notifications</h1>
        <p class="notifications-page__subtitle">
          Messages sent to your customers. Delivery is simulated.
        </p>
      </div>
    </div>

    <!-- Filter Toolbar -->
    <div class="attio-card notifications-toolbar">
      <div class="notifications-toolbar__search">
        <q-input
          :model-value="searchInput"
          type="search"
          placeholder="Search invoice, customer, or recipient…"
          clearable
          data-testid="notifications-search-input"
          @update:model-value="onSearchInputChange(String($event ?? ''))"
          @clear="clearSearchInput"
        >
          <template #prepend>
            <q-icon name="search" size="18px" />
          </template>
        </q-input>
      </div>

      <label class="notifications-toolbar__select-field">
        <span class="notifications-toolbar__label">Type</span>
        <select
          :value="activeType"
          class="notifications-toolbar__select"
          aria-label="Filter by notification type"
          data-testid="notifications-type-select"
          @change="
            onTypeChange(($event.target as HTMLSelectElement).value as NotificationType | '')
          "
        >
          <option value="">All</option>
          <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </label>

      <label class="notifications-toolbar__select-field">
        <span class="notifications-toolbar__label">Status</span>
        <select
          :value="activeStatus"
          class="notifications-toolbar__select"
          aria-label="Filter by delivery status"
          data-testid="notifications-status-select"
          @change="
            onStatusChange(($event.target as HTMLSelectElement).value as NotificationStatus | '')
          "
        >
          <option value="">All</option>
          <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </label>

      <button
        v-if="hasActiveFilters"
        type="button"
        class="notifications-toolbar__clear-link"
        data-testid="notifications-clear-filters-btn"
        @click="clearAllFilters"
      >
        Clear filters
      </button>
    </div>

    <!-- Inline Error Banner (keeps existing rows visible) -->
    <div
      v-if="errorMessage"
      role="alert"
      class="attio-card notifications-error-banner"
      data-testid="notifications-error-banner"
    >
      <div class="notifications-error-banner__text">
        <q-icon name="error_outline" size="18px" />
        <span>{{ errorMessage }}</span>
      </div>
      <q-btn
        outline
        dense
        color="primary"
        label="Retry"
        data-testid="notifications-retry-btn"
        @click="retryFetch"
      />
    </div>

    <!-- Initial Loading Skeletons -->
    <div
      v-if="loading && items.length === 0"
      class="attio-card notifications-skeleton"
      data-testid="notifications-loading-skeleton"
    >
      <div v-for="n in 5" :key="n" class="notifications-skeleton__row">
        <q-skeleton type="text" width="16%" />
        <q-skeleton type="text" width="18%" />
        <q-skeleton type="text" width="14%" />
        <q-skeleton type="text" width="20%" />
        <q-skeleton type="text" width="18%" />
        <q-skeleton type="text" width="10%" />
      </div>
    </div>

    <!-- Empty State (With Active Filters) -->
    <div
      v-else-if="!loading && items.length === 0 && hasActiveFilters"
      class="attio-card notifications-state-card"
      data-testid="notifications-empty-filters"
    >
      <q-icon name="filter_alt_off" size="24px" class="notifications-state-card__icon" />
      <p class="notifications-state-card__copy">No notifications match these filters.</p>
      <button
        type="button"
        class="notifications-state-card__link"
        data-testid="notifications-empty-clear-filters"
        @click="clearAllFilters"
      >
        Clear filters
      </button>
    </div>

    <!-- Empty State (No Notifications At All) -->
    <div
      v-else-if="!loading && items.length === 0 && !errorMessage"
      class="attio-card notifications-state-card"
      data-testid="notifications-empty-all"
    >
      <q-icon name="notifications_none" size="24px" class="notifications-state-card__icon" />
      <p class="notifications-state-card__copy">
        No messages yet. Sending an invoice emails your customer and the message appears here.
      </p>
    </div>

    <!-- Mobile / Tablet Cards (< md) -->
    <div
      v-else-if="isCompactScreen && items.length > 0"
      class="notifications-mobile-list"
      data-testid="notifications-mobile-list"
    >
      <NotificationLogRow
        v-for="item in items"
        :key="item.notificationId"
        :item="item"
        mode="card"
        :expanded="expandedId === item.notificationId"
        :highlighted="highlightedIds.has(item.notificationId)"
        @toggle="toggleRowExpand(item.notificationId)"
      />

      <div class="attio-card notifications-pagination">
        <span class="notifications-pagination__summary tabular-nums">
          {{ paginationRangeText }}
        </span>
        <div class="notifications-pagination__actions">
          <q-btn
            flat
            dense
            icon="chevron_left"
            aria-label="Previous page"
            :disable="currentPage <= 1"
            @click="changePage(currentPage - 1)"
          />
          <span class="notifications-pagination__page tabular-nums">
            Page {{ currentPage }} of {{ totalPages }}
          </span>
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

    <!-- Desktop Table (md and up) -->
    <div
      v-else-if="items.length > 0"
      class="attio-card notifications-table-card"
      data-testid="notifications-table-card"
    >
      <div class="table-scroll">
        <table class="attio-table notifications-table">
          <thead>
            <tr>
              <th class="text-left">When</th>
              <th class="text-left">Type</th>
              <th class="text-left">Invoice</th>
              <th class="text-left">Customer</th>
              <th class="text-left">Channel and recipient</th>
              <th class="text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            <NotificationLogRow
              v-for="item in items"
              :key="item.notificationId"
              :item="item"
              mode="table"
              :expanded="expandedId === item.notificationId"
              :highlighted="highlightedIds.has(item.notificationId)"
              @toggle="toggleRowExpand(item.notificationId)"
            />
          </tbody>
        </table>
      </div>

      <div class="notifications-pagination">
        <span class="notifications-pagination__summary tabular-nums">
          {{ paginationRangeText }}
        </span>
        <div class="notifications-pagination__actions">
          <q-btn
            flat
            dense
            icon="chevron_left"
            aria-label="Previous page"
            :disable="currentPage <= 1"
            data-testid="notifications-prev-page"
            @click="changePage(currentPage - 1)"
          />
          <span class="notifications-pagination__page tabular-nums">
            Page {{ currentPage }} of {{ totalPages }}
          </span>
          <q-btn
            flat
            dense
            icon="chevron_right"
            aria-label="Next page"
            :disable="currentPage >= totalPages"
            data-testid="notifications-next-page"
            @click="changePage(currentPage + 1)"
          />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'
import { useQuasar } from 'quasar'
import { ApiError } from 'src/shared/api/problem'
import { notificationsApi } from '../api'
import NotificationLogRow from '../components/NotificationLogRow.vue'
import { useNotificationFeedStore } from '../store'
import type { NotificationLogItem, NotificationStatus, NotificationType } from '../types'

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300
const LIVE_DEBOUNCE_MS = 500
const HIGHLIGHT_DURATION_MS = 2000

const VALID_TYPES: readonly NotificationType[] = [
  'InvoiceSent',
  'PaymentReceived',
  'OverdueReminder1',
  'OverdueReminder2',
  'OverdueFinal',
  'InvoiceCancelled',
]

const VALID_STATUSES: readonly NotificationStatus[] = ['Sent', 'Pending', 'Failed']

const typeOptions: ReadonlyArray<{ label: string; value: NotificationType }> = [
  { label: 'Invoice sent', value: 'InvoiceSent' },
  { label: 'Payment receipt', value: 'PaymentReceived' },
  { label: 'Overdue reminder', value: 'OverdueReminder1' },
  { label: 'Second reminder', value: 'OverdueReminder2' },
  { label: 'Final notice', value: 'OverdueFinal' },
  { label: 'Cancellation', value: 'InvoiceCancelled' },
]

const statusOptions: ReadonlyArray<{
  label: string
  value: NotificationStatus
}> = [
  { label: 'Sent', value: 'Sent' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Failed', value: 'Failed' },
]

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const feedStore = useNotificationFeedStore()

const items = ref<NotificationLogItem[]>([])
const totalCount = ref(0)
const loading = ref(true)
const errorMessage = ref<string | null>(null)
const expandedId = ref<string | null>(null)
const highlightedIds = ref<Set<string>>(new Set())

const searchInput = ref('')
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
let liveDebounceTimer: ReturnType<typeof setTimeout> | null = null
let highlightTimer: ReturnType<typeof setTimeout> | null = null
let activeAbortController: AbortController | null = null

const isCompactScreen = computed(() => Boolean($q.screen?.lt?.md))

const activeType = computed<NotificationType | ''>(() => {
  const raw = typeof route.query.type === 'string' ? route.query.type.trim() : ''
  return (VALID_TYPES as readonly string[]).includes(raw) ? (raw as NotificationType) : ''
})

const activeStatus = computed<NotificationStatus | ''>(() => {
  const raw = typeof route.query.status === 'string' ? route.query.status.trim() : ''
  return (VALID_STATUSES as readonly string[]).includes(raw) ? (raw as NotificationStatus) : ''
})

const activeSearch = computed(() =>
  typeof route.query.search === 'string' ? route.query.search.trim() : '',
)

const currentPage = computed(() => {
  const raw = Number(route.query.page)
  return Number.isInteger(raw) && raw >= 1 ? raw : 1
})

const hasActiveFilters = computed(() =>
  Boolean(activeType.value || activeStatus.value || activeSearch.value),
)

const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / PAGE_SIZE)))

const paginationRangeText = computed(() => {
  if (totalCount.value === 0) {
    return '0 of 0'
  }
  const start = (currentPage.value - 1) * PAGE_SIZE + 1
  const end = Math.min(totalCount.value, start + items.value.length - 1)
  return `${start}–${end} of ${totalCount.value}`
})

function buildRouteQuery(overrides: {
  type?: NotificationType | ''
  status?: NotificationStatus | ''
  search?: string
  page?: number
}): LocationQueryRaw {
  const nextType = overrides.type !== undefined ? overrides.type : activeType.value
  const nextStatus = overrides.status !== undefined ? overrides.status : activeStatus.value
  const nextSearch = overrides.search !== undefined ? overrides.search.trim() : activeSearch.value
  const nextPage = overrides.page !== undefined ? overrides.page : currentPage.value

  const q: LocationQueryRaw = {}
  if (nextType) {
    q.type = nextType
  }
  if (nextStatus) {
    q.status = nextStatus
  }
  if (nextSearch) {
    q.search = nextSearch
  }
  if (nextPage > 1) {
    q.page = String(nextPage)
  }
  return q
}

function abortInFlight() {
  if (activeAbortController) {
    activeAbortController.abort()
    activeAbortController = null
  }
}

function isAbortedError(err: unknown, signal: AbortSignal): boolean {
  if (signal.aborted) {
    return true
  }
  if (err instanceof DOMException && err.name === 'AbortError') {
    return true
  }
  if (err instanceof ApiError && err.message.toLowerCase().includes('abort')) {
    return true
  }
  return false
}

async function fetchPage(options?: { background?: boolean }) {
  abortInFlight()
  const controller = new AbortController()
  activeAbortController = controller
  const { signal } = controller

  const isBackground = Boolean(options?.background)
  const previousIds = new Set(items.value.map((i) => i.notificationId))

  if (!isBackground) {
    loading.value = true
  }
  errorMessage.value = null

  try {
    const res = await notificationsApi.searchNotifications(
      {
        page: currentPage.value,
        pageSize: PAGE_SIZE,
        type: activeType.value,
        status: activeStatus.value,
        search: activeSearch.value,
      },
      signal,
    )
    if (signal.aborted) return

    items.value = res.items
    totalCount.value = res.totalCount

    if (
      isBackground &&
      previousIds.size > 0 &&
      currentPage.value === 1 &&
      !hasActiveFilters.value
    ) {
      const newlyArrived = new Set<string>()
      for (const row of res.items) {
        if (!previousIds.has(row.notificationId)) {
          newlyArrived.add(row.notificationId)
        }
      }
      if (newlyArrived.size > 0) {
        highlightedIds.value = newlyArrived
        if (highlightTimer) {
          clearTimeout(highlightTimer)
        }
        highlightTimer = setTimeout(() => {
          highlightedIds.value = new Set()
          highlightTimer = null
        }, HIGHLIGHT_DURATION_MS)
      }
    }
  } catch (err) {
    if (isAbortedError(err, signal)) return
    errorMessage.value =
      err instanceof ApiError && err.message ? err.message : "Couldn't load notifications."
  } finally {
    if (!signal.aborted) {
      loading.value = false
    }
  }
}

watch(
  () => route.query,
  () => {
    searchInput.value = activeSearch.value
    expandedId.value = null
    void fetchPage()
  },
  { immediate: true },
)

watch(
  () => feedStore.changeVersion,
  () => {
    feedStore.markAllRead()
    if (liveDebounceTimer) {
      clearTimeout(liveDebounceTimer)
    }
    liveDebounceTimer = setTimeout(() => {
      liveDebounceTimer = null
      void fetchPage({ background: true })
    }, LIVE_DEBOUNCE_MS)
  },
)

onMounted(() => {
  feedStore.markAllRead()
})

onBeforeUnmount(() => {
  abortInFlight()
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  if (liveDebounceTimer) {
    clearTimeout(liveDebounceTimer)
  }
  if (highlightTimer) {
    clearTimeout(highlightTimer)
  }
})

function toggleRowExpand(notificationId: string) {
  expandedId.value = expandedId.value === notificationId ? null : notificationId
}

function onSearchInputChange(value: string) {
  searchInput.value = value
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  searchDebounceTimer = setTimeout(() => {
    void router.replace({
      path: '/notifications',
      query: buildRouteQuery({ search: value, page: 1 }),
    })
  }, SEARCH_DEBOUNCE_MS)
}

function clearSearchInput() {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
  searchInput.value = ''
  void router.replace({
    path: '/notifications',
    query: buildRouteQuery({ search: '', page: 1 }),
  })
}

function onTypeChange(type: NotificationType | '') {
  void router.replace({
    path: '/notifications',
    query: buildRouteQuery({ type, page: 1 }),
  })
}

function onStatusChange(status: NotificationStatus | '') {
  void router.replace({
    path: '/notifications',
    query: buildRouteQuery({ status, page: 1 }),
  })
}

function clearAllFilters() {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
  searchInput.value = ''
  void router.replace({
    path: '/notifications',
    query: buildRouteQuery({
      type: '',
      status: '',
      search: '',
      page: 1,
    }),
  })
}

function changePage(page: number) {
  if (page < 1 || page > totalPages.value) return
  void router.replace({
    path: '/notifications',
    query: buildRouteQuery({ page }),
  })
}

function retryFetch() {
  void fetchPage()
}
</script>

<style scoped lang="scss">
.notifications-page {
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
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  &__subtitle {
    margin: 4px 0 0;
    font-size: 13px;
    color: var(--text-secondary);
  }
}

.notifications-toolbar {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  &__search {
    flex: 1 1 260px;
    max-width: 420px;
  }

  &__select-field {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  &__label {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  &__select {
    height: 34px;
    padding: 0 10px;
    border-radius: 6px;
    border: 1px solid var(--border-hairline);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 13px;
    font-family: inherit;
  }

  &__clear-link {
    border: none;
    background: transparent;
    color: var(--accent-primary, #1976d2);
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    padding: 4px 8px;

    &:hover {
      text-decoration: underline;
    }
  }
}

.notifications-error-banner {
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-color: var(--pill-overdue-border);
  background: var(--pill-overdue-bg);
  color: var(--pill-overdue-text);
  font-size: 13px;

  &__text {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.notifications-skeleton {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
}

.notifications-state-card {
  padding: 36px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;

  &__icon {
    color: var(--text-muted);
  }

  &__copy {
    margin: 0;
    font-size: 13.5px;
    color: var(--text-secondary);
    max-width: 460px;
  }

  &__link {
    border: none;
    background: transparent;
    color: var(--accent-primary, #1976d2);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }
}

.notifications-mobile-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notifications-table-card {
  overflow: hidden;
}

.notifications-table {
  min-width: 780px;
}

.notifications-pagination {
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--border-hairline);
  font-size: 12.5px;
  color: var(--text-secondary);

  &__actions {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
}
</style>
