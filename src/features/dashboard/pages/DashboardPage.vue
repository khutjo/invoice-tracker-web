<template>
  <q-page class="dashboard-page">
    <!-- Incomplete Business Profile Banner -->
    <div
      v-if="showIncompleteBanner"
      role="status"
      class="dashboard-setup-banner"
      data-testid="dashboard-incomplete-banner"
    >
      <div class="dashboard-setup-banner__text">
        <q-icon name="info_outline" size="18px" />
        <span>
          Finish setting up your business so invoices include your banking and contact
          details.
        </span>
      </div>
      <q-btn
        v-if="sessionStore.isOwner"
        color="primary"
        dense
        label="Complete setup"
        to="/setup"
        class="dashboard-setup-banner__btn"
        data-testid="dashboard-complete-setup-btn"
      />
    </div>

    <!-- Figures as-of caption -->
    <div
      v-if="summary && !loadingSummary && !summaryError"
      class="dashboard-page__as-of"
      data-testid="dashboard-as-of"
    >
      Figures as of {{ formatInvoiceDate(summary.asOf) }}
    </div>

    <!-- KPI Summary Error Card -->
    <div
      v-if="summaryError && !loadingSummary"
      class="attio-card dashboard-state-card"
      data-testid="dashboard-summary-error"
    >
      <q-icon name="error_outline" size="22px" class="dashboard-state-card__icon" />
      <p class="dashboard-state-card__title">Couldn't load the summary.</p>
      <q-btn
        outline
        dense
        color="primary"
        label="Try again"
        data-testid="dashboard-summary-retry-btn"
        @click="reload()"
      />
    </div>

    <!-- KPI Tiles Row -->
    <section
      v-else
      class="dashboard-page__kpis"
      aria-label="Financial summary"
      data-testid="dashboard-kpis"
    >
      <!-- Tile 1: Total Outstanding -->
      <router-link
        to="/invoices?status=Sent"
        class="attio-card kpi-tile"
        :aria-label="totalOutstandingAriaLabel"
        data-testid="kpi-tile-outstanding"
      >
        <div class="kpi-tile__header">
          <span class="kpi-tile__label">Total Outstanding</span>
          <span class="status-pill status-pill--sent">Sent &amp; Overdue</span>
        </div>
        <div class="kpi-tile__value tabular-nums">
          <q-skeleton
            v-if="loadingSummary || !summary"
            type="text"
            width="120px"
            data-testid="kpi-skeleton-value"
          />
          <template v-else>
            {{ formatZar(summary.totalOutstanding.balance) }}
          </template>
        </div>
        <div class="kpi-tile__meta">
          <q-skeleton
            v-if="loadingSummary || !summary"
            type="text"
            width="140px"
            data-testid="kpi-skeleton-meta"
          />
          <template v-else>
            Across
            {{ pluralize(summary.totalOutstanding.openInvoiceCount, 'open invoice') }}
          </template>
        </div>
      </router-link>

      <!-- Tile 2: Overdue Balance -->
      <router-link
        to="/invoices?overdue=1"
        class="attio-card kpi-tile"
        :aria-label="overdueAriaLabel"
        data-testid="kpi-tile-overdue"
      >
        <div class="kpi-tile__header">
          <span class="kpi-tile__label">Overdue Balance</span>
          <span class="status-pill status-pill--overdue">
            {{ summary ? `${summary.overdue.overdueInvoiceCount} overdue` : '0 overdue' }}
          </span>
        </div>
        <div
          class="kpi-tile__value tabular-nums"
          :class="{
            'kpi-tile__value--overdue': Boolean(
              summary && summary.overdue.balance > 0,
            ),
          }"
          data-testid="kpi-overdue-value"
        >
          <q-skeleton
            v-if="loadingSummary || !summary"
            type="text"
            width="120px"
            data-testid="kpi-skeleton-value"
          />
          <template v-else>
            {{ formatZar(summary.overdue.balance) }}
          </template>
        </div>
        <div class="kpi-tile__meta" data-testid="kpi-overdue-meta">
          <q-skeleton
            v-if="loadingSummary || !summary"
            type="text"
            width="150px"
            data-testid="kpi-skeleton-meta"
          />
          <template v-else-if="summary.overdue.oldestDaysPastDue !== null">
            Oldest
            {{ pluralize(summary.overdue.oldestDaysPastDue, 'day') }} past due date
          </template>
          <template v-else>Nothing overdue</template>
        </div>
      </router-link>

      <!-- Tile 3: Paid This Month -->
      <router-link
        to="/invoices?status=Paid"
        class="attio-card kpi-tile"
        :aria-label="paidThisMonthAriaLabel"
        data-testid="kpi-tile-paid"
      >
        <div class="kpi-tile__header">
          <span class="kpi-tile__label">Paid This Month</span>
          <span class="status-pill status-pill--paid">Settled</span>
        </div>
        <div class="kpi-tile__value tabular-nums">
          <q-skeleton
            v-if="loadingSummary || !summary"
            type="text"
            width="120px"
            data-testid="kpi-skeleton-value"
          />
          <template v-else>
            {{ formatZar(summary.paidThisMonth.amountReceived) }}
          </template>
        </div>
        <div class="kpi-tile__meta">
          <q-skeleton
            v-if="loadingSummary || !summary"
            type="text"
            width="140px"
            data-testid="kpi-skeleton-meta"
          />
          <template v-else>
            {{ pluralize(summary.paidThisMonth.paidInvoiceCount, 'invoice') }} paid in full
          </template>
        </div>
      </router-link>

      <!-- Tile 4: Draft Pipeline -->
      <router-link
        to="/invoices?status=Draft"
        class="attio-card kpi-tile"
        :aria-label="draftsAriaLabel"
        data-testid="kpi-tile-drafts"
      >
        <div class="kpi-tile__header">
          <span class="kpi-tile__label">Draft Pipeline</span>
          <span class="status-pill status-pill--draft">
            <template v-if="summary">
              {{ pluralize(summary.drafts.draftCount, 'draft') }}
            </template>
            <template v-else>0 drafts</template>
          </span>
        </div>
        <div class="kpi-tile__value tabular-nums">
          <q-skeleton
            v-if="loadingSummary || !summary"
            type="text"
            width="120px"
            data-testid="kpi-skeleton-value"
          />
          <template v-else>
            {{ formatZar(summary.drafts.total) }}
          </template>
        </div>
        <div class="kpi-tile__meta" data-testid="kpi-drafts-meta">
          <q-skeleton
            v-if="loadingSummary || !summary"
            type="text"
            width="140px"
            data-testid="kpi-skeleton-meta"
          />
          <template v-else-if="summary.drafts.draftCount > 0">
            Ready to review and send
          </template>
          <template v-else>No drafts</template>
        </div>
      </router-link>
    </section>

    <!-- Recent Invoices Panel -->
    <section class="dashboard-page__grid">
      <div class="attio-card dashboard-panel">
        <div class="dashboard-panel__header">
          <h2 class="text-heading-md">Recent Invoices</h2>
          <q-btn
            flat
            dense
            label="View all"
            icon-right="arrow_forward"
            to="/invoices"
            class="dashboard-panel__link"
            data-testid="dashboard-view-all-btn"
          />
        </div>

        <!-- Recent Invoices Error State -->
        <div
          v-if="recentInvoicesError && !loadingRecentInvoices"
          class="dashboard-state-card"
          data-testid="dashboard-recent-error"
        >
          <q-icon name="error_outline" size="22px" class="dashboard-state-card__icon" />
          <p class="dashboard-state-card__title">Couldn't load recent invoices.</p>
          <q-btn
            outline
            dense
            color="primary"
            label="Try again"
            data-testid="dashboard-recent-retry-btn"
            @click="reload()"
          />
        </div>

        <!-- Recent Invoices Empty State -->
        <div
          v-else-if="!loadingRecentInvoices && recentInvoices.length === 0"
          class="dashboard-state-card"
          data-testid="dashboard-recent-empty"
        >
          <q-icon name="receipt_long" size="22px" class="dashboard-state-card__icon" />
          <p class="dashboard-state-card__title">No invoices yet</p>
          <q-btn
            color="primary"
            dense
            icon="add"
            label="New invoice"
            to="/invoices/new"
            data-testid="dashboard-empty-new-invoice-btn"
          />
        </div>

        <!-- Mobile Stacked Cards (xs < 600px) -->
        <div
          v-else-if="isMobile"
          class="dashboard-mobile-list"
          data-testid="dashboard-mobile-list"
        >
          <template v-if="loadingRecentInvoices">
            <div
              v-for="n in 5"
              :key="`mobile-skeleton-${n}`"
              class="dashboard-mobile-card"
              data-testid="recent-invoice-skeleton-row"
            >
              <div class="dashboard-mobile-card__top">
                <q-skeleton type="text" width="90px" />
                <q-skeleton type="text" width="70px" />
              </div>
              <q-skeleton type="text" width="140px" />
              <div class="dashboard-mobile-card__bottom">
                <q-skeleton type="text" width="100px" />
                <q-skeleton type="text" width="80px" />
              </div>
            </div>
          </template>
          <template v-else>
            <div
              v-for="inv in recentInvoices"
              :key="inv.invoiceId"
              tabindex="0"
              role="link"
              class="dashboard-mobile-card"
              :class="{ 'row--overdue': isInvoiceRowOverdue(inv, summary?.asOf) }"
              data-testid="recent-invoice-row"
              @click="openInvoiceDetail(inv.invoiceId)"
              @keydown.enter.prevent="openInvoiceDetail(inv.invoiceId)"
            >
              <div class="dashboard-mobile-card__top">
                <span
                  class="tabular-nums font-medium"
                  :class="{ 'invoice-number--draft': !inv.invoiceNumber }"
                >
                  {{ inv.invoiceNumber ?? 'Draft' }}
                </span>
                <div class="invoice-status-group">
                  <span :class="statusPillClass(inv.status)">{{ inv.status }}</span>
                  <span
                    v-if="isPartiallyPaid(inv)"
                    class="status-pill status-pill--partially-paid"
                    data-testid="partially-paid-badge"
                  >
                    Partially paid
                  </span>
                </div>
              </div>

              <div class="dashboard-mobile-card__customer">
                <span v-if="inv.customerName">{{ inv.customerName }}</span>
                <q-skeleton
                  v-else-if="isCustomerLoading(inv.customerId)"
                  type="text"
                  width="120px"
                  data-testid="customer-name-skeleton"
                />
                <span v-else>{{ getCustomerName(inv.customerId) }}</span>
              </div>

              <div class="dashboard-mobile-card__bottom">
                <span class="tabular-nums text-secondary">
                  {{ inv.dueDate ? formatDateZa(inv.dueDate) : '—' }}
                </span>
                <span class="text-money font-medium">{{ formatZar(inv.balance) }}</span>
              </div>
            </div>
          </template>
        </div>

        <!-- Desktop Table (sm and up) -->
        <div v-else class="table-scroll">
          <table class="attio-table dashboard-table">
            <thead>
              <tr>
                <th class="text-left">Invoice</th>
                <th class="text-left">Customer</th>
                <th class="text-left">Status</th>
                <th class="text-left">Due date</th>
                <th class="text-right">Total (incl. 15% VAT)</th>
                <th class="text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              <template v-if="loadingRecentInvoices">
                <tr
                  v-for="n in 5"
                  :key="`skeleton-${n}`"
                  data-testid="recent-invoice-skeleton-row"
                >
                  <td><q-skeleton type="text" width="90px" /></td>
                  <td><q-skeleton type="text" width="140px" /></td>
                  <td><q-skeleton type="text" width="70px" /></td>
                  <td><q-skeleton type="text" width="90px" /></td>
                  <td><q-skeleton type="text" width="90px" class="q-ml-auto" /></td>
                  <td><q-skeleton type="text" width="90px" class="q-ml-auto" /></td>
                </tr>
              </template>
              <template v-else>
                <tr
                  v-for="inv in recentInvoices"
                  :key="inv.invoiceId"
                  tabindex="0"
                  role="link"
                  class="dashboard-table__row"
                  :class="{ 'row--overdue': isInvoiceRowOverdue(inv, summary?.asOf) }"
                  data-testid="recent-invoice-row"
                  @click="openInvoiceDetail(inv.invoiceId)"
                  @keydown.enter.prevent="openInvoiceDetail(inv.invoiceId)"
                >
                  <td class="tabular-nums font-medium">
                    <span :class="{ 'invoice-number--draft': !inv.invoiceNumber }">
                      {{ inv.invoiceNumber ?? 'Draft' }}
                    </span>
                  </td>
                  <td>
                    <span v-if="inv.customerName">{{ inv.customerName }}</span>
                    <q-skeleton
                      v-else-if="isCustomerLoading(inv.customerId)"
                      type="text"
                      width="130px"
                      data-testid="customer-name-skeleton"
                    />
                    <span v-else>{{ getCustomerName(inv.customerId) }}</span>
                  </td>
                  <td>
                    <div class="invoice-status-group">
                      <span :class="statusPillClass(inv.status)">{{ inv.status }}</span>
                      <span
                        v-if="isPartiallyPaid(inv)"
                        class="status-pill status-pill--partially-paid"
                        data-testid="partially-paid-badge"
                      >
                        Partially paid
                      </span>
                    </div>
                  </td>
                  <td class="tabular-nums text-secondary">
                    {{ inv.dueDate ? formatDateZa(inv.dueDate) : '—' }}
                  </td>
                  <td class="text-money">{{ formatZar(inv.total) }}</td>
                  <td class="text-money font-medium">{{ formatZar(inv.balance) }}</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useSessionStore } from 'src/features/auth/store'
import { useBusinessStore } from 'src/features/business/store'
import { useDashboard } from '../composables/useDashboard'
import {
  isInvoiceRowOverdue,
  isPartiallyPaid,
  statusPillClass,
} from 'src/features/invoices/status'
import { formatDateZa, formatZar, pluralize } from 'src/shared/formatting/formatters'
import { formatInvoiceDate } from 'src/shared/money'

const $q = useQuasar()
const router = useRouter()
const sessionStore = useSessionStore()
const businessStore = useBusinessStore()

const {
  summary,
  recentInvoices,
  loadingSummary,
  loadingRecentInvoices,
  summaryError,
  recentInvoicesError,
  reload,
  isCustomerLoading,
  getCustomerName,
} = useDashboard()

const isMobile = computed(() => Boolean($q.screen?.lt?.sm))

const showIncompleteBanner = computed(
  () => businessStore.status === 'ready' && !businessStore.isProfileComplete,
)

const totalOutstandingAriaLabel = computed(() => {
  if (!summary.value) {
    return 'Total outstanding'
  }
  const count = summary.value.totalOutstanding.openInvoiceCount
  return `Total outstanding ${formatZar(summary.value.totalOutstanding.balance)}, Across ${pluralize(count, 'open invoice')}`
})

const overdueAriaLabel = computed(() => {
  if (!summary.value) {
    return 'Overdue balance'
  }
  const count = summary.value.overdue.overdueInvoiceCount
  return `Overdue balance ${formatZar(summary.value.overdue.balance)}, ${pluralize(count, 'overdue invoice')}`
})

const paidThisMonthAriaLabel = computed(() => {
  if (!summary.value) {
    return 'Paid this month'
  }
  const count = summary.value.paidThisMonth.paidInvoiceCount
  return `Paid this month ${formatZar(summary.value.paidThisMonth.amountReceived)}, ${pluralize(count, 'invoice')} paid in full`
})

const draftsAriaLabel = computed(() => {
  if (!summary.value) {
    return 'Draft pipeline'
  }
  const count = summary.value.drafts.draftCount
  return `Draft pipeline ${formatZar(summary.value.drafts.total)}, ${pluralize(count, 'draft')}`
})

function openInvoiceDetail(invoiceId: string) {
  void router.push(`/invoices/${encodeURIComponent(invoiceId)}`)
}
</script>

<style scoped lang="scss">
.dashboard-setup-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--pill-sent-bg);
  color: var(--pill-sent-text);
  border: 1px solid var(--pill-sent-border);
  font-size: 13px;

  @media (max-width: 599px) {
    flex-direction: column;
    align-items: flex-start;
  }

  &__text {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__btn {
    flex-shrink: 0;
    padding: 4px 12px;
    font-size: 12.5px;
  }
}

.dashboard-page {
  padding: 20px;
  max-width: 1440px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;

  @media (max-width: 599px) {
    padding: 12px;
    gap: 12px;
  }

  &__as-of {
    font-size: 12px;
    color: var(--text-muted);
    text-align: right;
    margin-bottom: -12px;
  }

  &__kpis {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;

    @media (max-width: 1023px) {
      grid-template-columns: repeat(2, 1fr);
    }

    @media (max-width: 599px) {
      grid-template-columns: 1fr;
    }
  }
}

.kpi-tile {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-decoration: none;
  color: inherit;
  transition:
    background-color 120ms ease,
    border-color 120ms ease;

  &:hover {
    background-color: var(--bg-hover, rgba(0, 0, 0, 0.02));
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #1976d2);
    outline-offset: 2px;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  &__label {
    font-size: 12.5px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  &__value {
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--text-primary);

    &--overdue {
      color: var(--pill-overdue-text);
    }
  }

  &__meta {
    font-size: 12px;
    color: var(--text-muted);
  }
}

.dashboard-panel {
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-hairline);
  }

  &__link {
    font-size: 12.5px;
    color: var(--text-secondary);
  }
}

.dashboard-state-card {
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;

  &__icon {
    color: var(--text-muted);
  }

  &__title {
    margin: 0;
    font-size: 13.5px;
    font-weight: 500;
    color: var(--text-secondary);
  }
}

.table-scroll {
  width: 100%;
  overflow-x: auto;
}

.dashboard-table {
  width: 100%;
  min-width: 680px;
  border-collapse: collapse;

  th:nth-child(1),
  td:nth-child(1) {
    width: 16%;
  }

  th:nth-child(2),
  td:nth-child(2) {
    width: 28%;
  }

  th:nth-child(3),
  td:nth-child(3) {
    width: 16%;
  }

  th:nth-child(4),
  td:nth-child(4) {
    width: 14%;
  }

  th:nth-child(5),
  td:nth-child(5) {
    width: 13%;
  }

  th:nth-child(6),
  td:nth-child(6) {
    width: 13%;
  }

  &__row {
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid var(--accent-primary, #1976d2);
      outline-offset: -2px;
    }
  }
}

.invoice-number--draft {
  color: var(--text-muted);
  font-style: italic;
}

.invoice-status-group {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.row--overdue {
  position: relative;

  td:first-child {
    box-shadow: inset 3px 0 0 var(--pill-overdue-text);
  }
}

.dashboard-mobile-list {
  display: flex;
  flex-direction: column;
  divide-y: 1px solid var(--border-hairline);
}

.dashboard-mobile-card {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-bottom: 1px solid var(--border-hairline);
  cursor: pointer;

  &:last-child {
    border-bottom: none;
  }

  &.row--overdue {
    box-shadow: inset 3px 0 0 var(--pill-overdue-text);
  }

  &__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  &__customer {
    font-size: 13px;
    color: var(--text-primary);
  }

  &__bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 12.5px;
  }
}
</style>
