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

    <!-- KPI Tiles Row -->
    <section class="dashboard-page__kpis" aria-label="Financial summary">
      <div class="attio-card kpi-tile">
        <div class="kpi-tile__header">
          <span class="kpi-tile__label">Total Outstanding</span>
          <span class="status-pill status-pill--sent">Sent &amp; Overdue</span>
        </div>
        <div class="kpi-tile__value tabular-nums">{{ formatZar(148250.0) }}</div>
        <div class="kpi-tile__meta">Across 6 open invoices</div>
      </div>

      <div class="attio-card kpi-tile">
        <div class="kpi-tile__header">
          <span class="kpi-tile__label">Overdue Balance</span>
          <span class="status-pill status-pill--overdue">2 overdue</span>
        </div>
        <div class="kpi-tile__value kpi-tile__value--overdue tabular-nums">
          {{ formatZar(42550.0) }}
        </div>
        <div class="kpi-tile__meta">Oldest 14 days past due date</div>
      </div>

      <div class="attio-card kpi-tile">
        <div class="kpi-tile__header">
          <span class="kpi-tile__label">Paid This Month</span>
          <span class="status-pill status-pill--paid">Settled</span>
        </div>
        <div class="kpi-tile__value tabular-nums">{{ formatZar(219650.0) }}</div>
        <div class="kpi-tile__meta">8 invoices paid in full</div>
      </div>

      <div class="attio-card kpi-tile">
        <div class="kpi-tile__header">
          <span class="kpi-tile__label">Draft Pipeline</span>
          <span class="status-pill status-pill--draft">3 drafts</span>
        </div>
        <div class="kpi-tile__value tabular-nums">{{ formatZar(31050.0) }}</div>
        <div class="kpi-tile__meta">Ready to review and send</div>
      </div>
    </section>

    <!-- Status Pill Showcase & Quick Actions -->
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
          />
        </div>

        <div class="table-scroll">
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
              <tr
                v-for="inv in sampleInvoices"
                :key="inv.invoiceNumber"
                :class="{ 'row--overdue': inv.status === 'Overdue' }"
              >
                <td class="tabular-nums font-medium">{{ inv.invoiceNumber }}</td>
                <td>{{ inv.customer }}</td>
                <td>
                  <span class="status-pill" :class="inv.pillClass">{{ inv.badgeLabel }}</span>
                </td>
                <td class="tabular-nums text-secondary">{{ formatDateZa(inv.dueDate) }}</td>
                <td class="text-money">{{ formatZar(inv.total) }}</td>
                <td class="text-money font-medium">{{ formatZar(inv.balance) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSessionStore } from 'src/features/auth/store'
import { useBusinessStore } from 'src/features/business/store'
import { formatDateZa, formatZar } from 'src/shared/formatting/formatters'

const sessionStore = useSessionStore()
const businessStore = useBusinessStore()

const showIncompleteBanner = computed(
  () => businessStore.status === 'ready' && !businessStore.isProfileComplete,
)

interface SampleInvoiceRow {
  invoiceNumber: string
  customer: string
  status: string
  badgeLabel: string
  pillClass: string
  dueDate: string
  total: number
  balance: number
}

const sampleInvoices: SampleInvoiceRow[] = [
  {
    invoiceNumber: 'INV-2026-0042',
    customer: 'Highveld Logistics (Pty) Ltd',
    status: 'Overdue',
    badgeLabel: 'Overdue',
    pillClass: 'status-pill--overdue',
    dueDate: '2026-10-17',
    total: 42550.0,
    balance: 42550.0,
  },
  {
    invoiceNumber: 'INV-2026-0043',
    customer: 'Cape Winelands Roasters CC',
    status: 'Sent',
    badgeLabel: 'Partially paid',
    pillClass: 'status-pill--partially-paid',
    dueDate: '2026-11-10',
    total: 69000.0,
    balance: 29000.0,
  },
  {
    invoiceNumber: 'INV-2026-0044',
    customer: 'eThekwini Marine Supplies',
    status: 'Sent',
    badgeLabel: 'Sent',
    pillClass: 'status-pill--sent',
    dueDate: '2026-11-15',
    total: 76700.0,
    balance: 76700.0,
  },
  {
    invoiceNumber: 'INV-2026-0041',
    customer: 'Stellenbosch Agri Holdings',
    status: 'Paid',
    badgeLabel: 'Paid',
    pillClass: 'status-pill--paid',
    dueDate: '2026-10-25',
    total: 94300.0,
    balance: 0,
  },
  {
    invoiceNumber: 'DRAFT-0019',
    customer: 'Nguni Digital Advisory',
    status: 'Draft',
    badgeLabel: 'Draft',
    pillClass: 'status-pill--draft',
    dueDate: '2026-11-30',
    total: 31050.0,
    balance: 31050.0,
  },
]
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

.table-scroll {
  width: 100%;
  overflow-x: auto;
}

.dashboard-table {
  width: 100%;
  border-collapse: collapse;

  .row--overdue {
    background-color: var(--row-overdue-bg);
  }
}

.font-medium {
  font-weight: 500;
}

.text-secondary {
  color: var(--text-secondary);
}
</style>
