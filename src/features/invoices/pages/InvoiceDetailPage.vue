<template>
  <q-page class="invoice-detail-page">
    <!-- Loading State -->
    <div
      v-if="loading"
      class="attio-card detail-skeleton"
      data-testid="invoice-detail-loading"
    >
      <q-skeleton type="text" width="240px" height="28px" />
      <q-skeleton type="rect" width="100%" height="220px" />
    </div>

    <!-- 404 Not Found State -->
    <div
      v-else-if="notFound"
      class="attio-card detail-not-found"
      data-testid="invoice-not-found"
    >
      <div class="detail-not-found__code tabular-nums">404</div>
      <h1 class="text-heading-lg">Invoice not found</h1>
      <p class="detail-not-found__copy">
        This invoice could not be found or belongs to another business workspace.
      </p>
      <q-btn
        color="primary"
        label="Back to invoices"
        :to="backToListLocation"
        data-testid="invoice-back-link"
      />
    </div>

    <!-- Loaded Invoice Record -->
    <div v-else-if="invoice" class="detail-shell">
      <!-- Header Bar -->
      <div class="detail-header">
        <div class="detail-header__left">
          <router-link :to="backToListLocation" class="detail-header__back">
            <q-icon name="arrow_back" size="16px" />
            <span>Invoices</span>
          </router-link>

          <div class="detail-header__title-row">
            <h1
              class="text-heading-lg tabular-nums"
              :class="{ 'detail-header__draft-title': !invoice.invoiceNumber }"
              data-testid="invoice-detail-number"
            >
              {{ invoice.invoiceNumber ?? 'Draft' }}
            </h1>

            <span
              :class="statusPillClass(invoice.status)"
              data-testid="invoice-detail-status"
            >
              {{ invoice.status }}
            </span>

            <span
              v-if="isPartiallyPaid"
              class="status-pill status-pill--partially-paid"
              data-testid="invoice-detail-partially-paid"
            >
              Partially paid
            </span>
          </div>

          <div class="detail-header__meta">
            <span class="detail-header__meta-item">
              <span class="text-secondary">Customer:</span>
              <q-skeleton
                v-if="isCustomerLoading(invoice.customerId)"
                type="text"
                width="120px"
              />
              <router-link
                v-else
                :to="`/customers/${encodeURIComponent(invoice.customerId)}`"
                class="detail-header__customer-link"
                data-testid="invoice-detail-customer-link"
              >
                {{ getCustomerName(invoice.customerId) }}
              </router-link>
            </span>

            <span class="detail-header__meta-sep">·</span>

            <span class="detail-header__meta-item tabular-nums">
              <span class="text-secondary">Issued:</span>
              <span data-testid="invoice-detail-issue-date">
                {{ formatInvoiceDate(invoice.issueDate) }}
              </span>
            </span>

            <span class="detail-header__meta-sep">·</span>

            <span class="detail-header__meta-item tabular-nums">
              <span class="text-secondary">Due:</span>
              <span data-testid="invoice-detail-due-date">
                {{ formatInvoiceDate(invoice.dueDate) }}
              </span>
              <span
                v-if="relativeDueBadge"
                class="due-relative-pill"
                :class="{ 'due-relative-pill--overdue': relativeDueBadge.isOverdue }"
                data-testid="invoice-detail-due-relative"
              >
                {{ relativeDueBadge.text }}
              </span>
            </span>
          </div>
        </div>

        <!-- Draft Actions (Only when status === 'Draft') -->
        <div
          v-if="invoice.status === 'Draft'"
          class="detail-header__actions"
          data-testid="invoice-draft-actions"
        >
          <q-btn
            outline
            icon="edit"
            label="Edit"
            :to="`/invoices/${encodeURIComponent(invoice.invoiceId)}/edit`"
            data-testid="invoice-edit-btn"
          />

          <div
            class="send-btn-wrapper"
            :title="sendDisabledReason ?? undefined"
            data-testid="invoice-send-wrapper"
          >
            <q-btn
              color="primary"
              icon="send"
              label="Send"
              :disable="Boolean(sendDisabledReason)"
              data-testid="invoice-send-btn"
              @click="sendDialogOpen = true"
            >
              <q-tooltip v-if="sendDisabledReason">
                {{ sendDisabledReason }}
              </q-tooltip>
            </q-btn>
          </div>

          <q-btn
            outline
            color="negative"
            icon="delete_outline"
            label="Delete"
            data-testid="invoice-delete-btn"
            @click="deleteDialogOpen = true"
          />
        </div>
      </div>

      <!-- Main Grid: Lines + Totals + Payments + Timeline -->
      <div class="detail-layout">
        <div class="detail-main">
          <!-- Read-only Line Items Card -->
          <section class="attio-card detail-card">
            <h2 class="text-heading-md detail-card__title">Line items</h2>

            <div
              v-if="invoice.lines.length === 0"
              class="detail-empty-lines"
              data-testid="invoice-detail-empty-lines"
            >
              No line items on this draft yet.
            </div>

            <div v-else class="table-scroll">
              <table class="attio-table detail-lines-table" data-testid="invoice-lines-table">
                <thead>
                  <tr>
                    <th class="text-left">Description</th>
                    <th class="text-right">Qty</th>
                    <th class="text-right">Unit price (excl. VAT)</th>
                    <th class="text-right">VAT</th>
                    <th class="text-right">Line total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="line in invoice.lines" :key="line.invoiceLineId">
                    <td>{{ line.description }}</td>
                    <td class="text-right tabular-nums">{{ line.quantity }}</td>
                    <td class="text-money">{{ formatZar(line.unitPrice) }}</td>
                    <td class="text-right tabular-nums">
                      {{ formatVatPercent(line.vatRate) }}
                    </td>
                    <td class="text-money">{{ formatZar(line.lineTotal) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- Payments Section (Only rendered when payments has rows) -->
          <section
            v-if="invoice.payments.length > 0"
            class="attio-card detail-card"
            data-testid="invoice-payments-section"
          >
            <h2 class="text-heading-md detail-card__title">Payments</h2>
            <div class="table-scroll">
              <table class="attio-table detail-lines-table">
                <thead>
                  <tr>
                    <th class="text-left">Paid on</th>
                    <th class="text-left">Method</th>
                    <th class="text-left">Reference</th>
                    <th class="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="payment in invoice.payments" :key="payment.paymentId">
                    <td class="tabular-nums">{{ formatInvoiceDate(payment.paidOn) }}</td>
                    <td>{{ payment.method }}</td>
                    <td class="text-secondary">{{ payment.reference || '—' }}</td>
                    <td class="text-money">{{ formatZar(payment.amount) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- Timeline Card -->
          <section
            class="attio-card detail-card"
            aria-label="Invoice timeline"
            data-testid="invoice-timeline-section"
          >
            <h2 class="text-heading-md detail-card__title">Timeline</h2>

            <ol v-if="invoice.timeline.length > 0" class="timeline-list">
              <li
                v-for="(event, idx) in invoice.timeline"
                :key="`${event.eventType}-${event.occurredAt}-${idx}`"
                class="timeline-item"
                data-testid="invoice-timeline-item"
              >
                <div class="timeline-item__icon">
                  <q-icon :name="timelineIcon(event.eventType)" size="16px" />
                </div>
                <div class="timeline-item__content">
                  <div class="timeline-item__top">
                    <span class="timeline-item__label">
                      {{ timelineLabel(event.eventType) }}
                    </span>
                    <time class="timeline-item__time tabular-nums">
                      {{ formatTimelineTimestamp(event.occurredAt) }}
                    </time>
                  </div>
                  <p v-if="event.detail" class="timeline-item__detail">
                    {{ event.detail }}
                  </p>
                </div>
              </li>
            </ol>
            <p v-else class="text-secondary">No activity recorded yet.</p>
          </section>

          <!-- Notifications Card (hidden for Draft invoices) -->
          <section
            v-if="invoice.status !== 'Draft'"
            class="attio-card detail-card"
            aria-label="Invoice notifications"
            data-testid="invoice-notifications-section"
          >
            <h2 class="text-heading-md detail-card__title">Notifications</h2>

            <div
              v-if="notificationsLoading && invoiceNotifications.length === 0"
              class="notifications-card-skeleton"
              data-testid="invoice-notifications-skeleton"
            >
              <q-skeleton type="text" width="60%" />
              <q-skeleton type="text" width="45%" />
            </div>

            <div
              v-else-if="invoiceNotifications.length > 0"
              class="invoice-notifications-list"
              data-testid="invoice-notifications-list"
            >
              <NotificationLogRow
                v-for="item in invoiceNotifications"
                :key="item.notificationId"
                :item="item"
                mode="compact"
                :expanded="expandedNotificationId === item.notificationId"
                @toggle="toggleNotificationExpand(item.notificationId)"
              />
            </div>

            <p
              v-else
              class="text-secondary"
              data-testid="invoice-notifications-empty"
            >
              No messages sent for this invoice yet.
            </p>
          </section>
        </div>

        <!-- Totals Summary Card -->
        <aside class="detail-sidebar">
          <section class="attio-card totals-card" data-testid="invoice-totals-card">
            <h2 class="text-heading-md totals-card__title">Totals</h2>

            <dl class="totals-dl">
              <div class="totals-dl__row">
                <dt>Subtotal</dt>
                <dd class="tabular-nums" data-testid="detail-subtotal">
                  {{ formatZar(invoice.subtotal) }}
                </dd>
              </div>

              <div class="totals-dl__row">
                <dt>VAT</dt>
                <dd class="tabular-nums" data-testid="detail-vat">
                  {{ formatZar(invoice.vatTotal) }}
                </dd>
              </div>

              <div class="totals-dl__divider" />

              <div class="totals-dl__row totals-dl__row--strong">
                <dt>Total</dt>
                <dd class="tabular-nums" data-testid="detail-total">
                  {{ formatZar(invoice.total) }}
                </dd>
              </div>

              <div class="totals-dl__row">
                <dt>Amount paid</dt>
                <dd class="tabular-nums" data-testid="detail-amount-paid">
                  {{ formatZar(invoice.amountPaid) }}
                </dd>
              </div>

              <div class="totals-dl__divider" />

              <div class="totals-dl__row totals-dl__row--balance">
                <dt>Balance</dt>
                <dd class="tabular-nums" data-testid="detail-balance">
                  {{ formatZar(invoice.balance) }}
                </dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>

      <!-- Send Confirmation Dialog -->
      <q-dialog v-model="sendDialogOpen">
        <q-card class="confirm-dialog-card" data-testid="send-confirm-dialog">
          <div class="confirm-dialog-card__body">
            <h2 class="text-heading-md">Send this invoice?</h2>
            <p class="confirm-dialog-card__copy">
              Send this invoice? It gets the next invoice number and can't be edited
              afterwards. Due date: {{ projectedDueDateLabel }}.
            </p>
          </div>
          <div class="confirm-dialog-card__actions">
            <q-btn
              flat
              label="Cancel"
              :disable="sending"
              data-testid="cancel-send-btn"
              @click="sendDialogOpen = false"
            />
            <q-btn
              color="primary"
              label="Send invoice"
              :loading="sending"
              :disable="sending"
              data-testid="confirm-send-btn"
              @click="confirmSendInvoice"
            />
          </div>
        </q-card>
      </q-dialog>

      <!-- Delete Confirmation Dialog -->
      <q-dialog v-model="deleteDialogOpen">
        <q-card class="confirm-dialog-card" data-testid="delete-confirm-dialog">
          <div class="confirm-dialog-card__body">
            <h2 class="text-heading-md">Delete this draft?</h2>
            <p class="confirm-dialog-card__copy">
              Delete this draft? This can't be undone.
            </p>
          </div>
          <div class="confirm-dialog-card__actions">
            <q-btn
              flat
              label="Cancel"
              :disable="deleting"
              data-testid="cancel-delete-btn"
              @click="deleteDialogOpen = false"
            />
            <q-btn
              color="negative"
              label="Delete draft"
              :loading="deleting"
              :disable="deleting"
              data-testid="confirm-delete-btn"
              @click="confirmDeleteInvoice"
            />
          </div>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import {
  invoicesApi,
  type InvoiceDetails,
  type InvoiceEventType,
  type InvoiceStatus,
} from '../api'
import { useCustomerNames } from '../composables/useCustomerNames'
import { useInvoicesStore } from '../store'
import {
  addDaysToIsoDate,
  getJohannesburgTodayIso,
  getRelativeDueBadge,
  getSendDisabledReason,
} from '../validation'
import { notificationsApi } from 'src/features/notifications/api'
import NotificationLogRow from 'src/features/notifications/components/NotificationLogRow.vue'
import { useNotificationFeedStore } from 'src/features/notifications/store'
import type { NotificationLogItem } from 'src/features/notifications/types'
import { ApiError, mapProblemDetails } from 'src/shared/api/problem'
import { formatInvoiceDate, formatZar } from 'src/shared/money'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const invoicesStore = useInvoicesStore()
const notificationFeedStore = useNotificationFeedStore()
const { resolveCustomerIds, isCustomerLoading, getCustomerName } = useCustomerNames()

const invoice = ref<InvoiceDetails | null>(null)
const loading = ref(true)
const notFound = ref(false)
const sendDialogOpen = ref(false)
const deleteDialogOpen = ref(false)
const sending = ref(false)
const deleting = ref(false)
const invoiceNotifications = ref<NotificationLogItem[]>([])
const notificationsLoading = ref(false)
const expandedNotificationId = ref<string | null>(null)

const backToListLocation = computed(() => ({
  path: '/invoices',
  query: invoicesStore.lastListRouteQuery,
}))

const isPartiallyPaid = computed(() => {
  if (!invoice.value) return false
  return invoice.value.amountPaid > 0 && invoice.value.amountPaid < invoice.value.total
})

const relativeDueBadge = computed(() => {
  if (!invoice.value || !invoice.value.dueDate) return null
  if (invoice.value.status === 'Paid' || invoice.value.status === 'Cancelled') {
    return null
  }
  return getRelativeDueBadge(invoice.value.dueDate)
})

const sendDisabledReason = computed(() => {
  if (!invoice.value) return null
  return getSendDisabledReason(invoice.value.lines.length, invoice.value.total)
})

const projectedDueDateLabel = computed(() => {
  const terms = invoice.value?.paymentTermsDays ?? 0
  const todayIso = getJohannesburgTodayIso()
  const dueIso = addDaysToIsoDate(todayIso, terms)
  return formatInvoiceDate(dueIso)
})

function toggleNotificationExpand(notificationId: string) {
  expandedNotificationId.value =
    expandedNotificationId.value === notificationId ? null : notificationId
}

async function loadInvoiceNotifications(
  invoiceId: string,
  options?: { silent?: boolean },
) {
  const isSilent = Boolean(options?.silent)
  if (!isSilent) {
    notificationsLoading.value = true
  }
  try {
    const res = await notificationsApi.searchNotifications({
      invoiceId,
      pageSize: 50,
    })
    invoiceNotifications.value = [...res.items].reverse()
  } catch {
    if (!isSilent) {
      invoiceNotifications.value = []
    }
  } finally {
    if (!isSilent) {
      notificationsLoading.value = false
    }
  }
}

async function loadInvoiceDetail(options?: { silent?: boolean }) {
  const invoiceId =
    typeof route.params.invoiceId === 'string' ? route.params.invoiceId.trim() : ''
  if (!invoiceId) {
    notFound.value = true
    loading.value = false
    return
  }

  const isSilent = Boolean(options?.silent && invoice.value !== null)
  if (!isSilent) {
    loading.value = true
    notFound.value = false
    invoiceNotifications.value = []
    expandedNotificationId.value = null
  }

  try {
    const details = await invoicesApi.getInvoice(invoiceId)
    invoice.value = details
    if (details.customerId) {
      await resolveCustomerIds([details.customerId])
    }
    if (details.status !== 'Draft') {
      await loadInvoiceNotifications(details.invoiceId, { silent: isSilent })
    }
  } catch (err) {
    if (!isSilent) {
      if (err instanceof ApiError && err.status === 404) {
        notFound.value = true
      } else {
        notFound.value = true
      }
    }
  } finally {
    if (!isSilent) {
      loading.value = false
    }
  }
}

watch(
  () => route.params.invoiceId,
  () => {
    void loadInvoiceDetail()
  },
  { immediate: true },
)

watch(
  () => notificationFeedStore.changeVersion,
  () => {
    const currentId =
      invoice.value?.invoiceId ??
      (typeof route.params.invoiceId === 'string'
        ? route.params.invoiceId.trim()
        : '')
    if (
      currentId &&
      notificationFeedStore.lastInvoiceId === currentId
    ) {
      void loadInvoiceDetail({ silent: true })
    }
  },
)

async function confirmSendInvoice() {
  if (!invoice.value) return
  sending.value = true
  try {
    const updated = await invoicesApi.sendInvoice(invoice.value.invoiceId)
    invoice.value = updated
    sendDialogOpen.value = false
    $q.notify?.({
      type: 'positive',
      message: `Sent as ${updated.invoiceNumber ?? ''}`.trim(),
    })
    if (updated.status !== 'Draft') {
      await loadInvoiceNotifications(updated.invoiceId)
    }
  } catch (err) {
    sendDialogOpen.value = false
    const mapped = mapProblemDetails(err)
    $q.notify?.({
      type: 'negative',
      message: mapped.title || "Couldn't send invoice.",
    })
    await loadInvoiceDetail()
  } finally {
    sending.value = false
  }
}

async function confirmDeleteInvoice() {
  if (!invoice.value) return
  deleting.value = true
  try {
    await invoicesApi.deleteInvoice(invoice.value.invoiceId)
    deleteDialogOpen.value = false
    $q.notify?.({
      type: 'positive',
      message: 'Draft deleted',
    })
    await router.push(backToListLocation.value)
  } catch (err) {
    deleteDialogOpen.value = false
    const mapped = mapProblemDetails(err)
    $q.notify?.({
      type: 'negative',
      message: mapped.title || "Couldn't delete draft.",
    })
    await loadInvoiceDetail()
  } finally {
    deleting.value = false
  }
}

function statusPillClass(status: InvoiceStatus): string {
  switch (status) {
    case 'Draft':
      return 'status-pill status-pill--draft'
    case 'Sent':
      return 'status-pill status-pill--sent'
    case 'Overdue':
      return 'status-pill status-pill--overdue'
    case 'Paid':
      return 'status-pill status-pill--paid'
    case 'Cancelled':
      return 'status-pill status-pill--cancelled'
  }
}

function formatVatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

function timelineIcon(eventType: InvoiceEventType): string {
  switch (eventType) {
    case 'Created':
      return 'note_add'
    case 'Edited':
      return 'edit'
    case 'Sent':
      return 'send'
    case 'PaymentRecorded':
      return 'payments'
    case 'MarkedOverdue':
      return 'warning_amber'
    case 'ReminderRaised':
      return 'notifications_active'
    case 'Paid':
      return 'check_circle'
    case 'Cancelled':
      return 'cancel'
  }
}

function timelineLabel(eventType: InvoiceEventType): string {
  switch (eventType) {
    case 'Created':
      return 'Created'
    case 'Edited':
      return 'Edited'
    case 'Sent':
      return 'Sent'
    case 'PaymentRecorded':
      return 'Payment recorded'
    case 'MarkedOverdue':
      return 'Marked overdue'
    case 'ReminderRaised':
      return 'Reminder raised'
    case 'Paid':
      return 'Paid'
    case 'Cancelled':
      return 'Cancelled'
  }
}

const localDateTimeFormatter = new Intl.DateTimeFormat('en-ZA', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function formatTimelineTimestamp(isoTimestamp: string): string {
  const d = new Date(isoTimestamp)
  if (Number.isNaN(d.getTime())) return isoTimestamp
  return localDateTimeFormatter.format(d)
}
</script>

<style scoped lang="scss">
.invoice-detail-page {
  padding: 20px;
  max-width: 1120px;
  margin: 0 auto;
}

.detail-skeleton {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-not-found {
  padding: 48px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;

  &__code {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted);
    padding: 2px 8px;
    border-radius: 4px;
    background: var(--bg-surface-subtle);
    border: 1px solid var(--border-hairline);
  }

  &__copy {
    margin: 0 0 8px;
    max-width: 360px;
    color: var(--text-secondary);
    font-size: 13px;
  }
}

.detail-shell {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;

  &__left {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 12.5px;
    font-weight: 500;

    &:hover {
      color: var(--text-primary);
    }
  }

  &__title-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  &__draft-title {
    color: var(--text-secondary);
    font-style: italic;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 13px;
  }

  &__meta-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  &__meta-sep {
    color: var(--text-muted);
  }

  &__customer-link {
    color: var(--accent-primary);
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.due-relative-pill {
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border-radius: 4px;
  font-size: 11.5px;
  font-weight: 500;
  background: var(--bg-surface-subtle);
  color: var(--text-secondary);
  border: 1px solid var(--border-hairline);

  &--overdue {
    background: var(--pill-overdue-bg);
    color: var(--pill-overdue-text);
    border-color: var(--pill-overdue-border);
  }
}

.detail-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  align-items: start;

  @media (min-width: 960px) {
    grid-template-columns: 1fr 300px;
  }
}

.detail-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.detail-card {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;

  &__title {
    margin: 0;
  }
}

.detail-empty-lines {
  padding: 18px;
  border-radius: 6px;
  background: var(--bg-surface-subtle);
  color: var(--text-secondary);
  font-size: 13px;
  text-align: center;
}

.table-scroll {
  overflow-x: auto;
}

.detail-lines-table {
  width: 100%;
  border-collapse: collapse;

  tbody tr {
    cursor: default;
  }
}

.totals-card {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;

  &__title {
    margin: 0;
  }
}

.totals-dl {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
    color: var(--text-secondary);

    dd {
      margin: 0;
      font-weight: 500;
      color: var(--text-primary);
    }

    &--strong {
      font-weight: 600;
      color: var(--text-primary);
    }

    &--balance {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-primary);

      dd {
        font-weight: 700;
      }
    }
  }

  &__divider {
    height: 1px;
    background: var(--border-hairline);
    margin: 4px 0;
  }
}

.timeline-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.timeline-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;

  &__icon {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--bg-surface-subtle);
    border: 1px solid var(--border-hairline);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
  }

  &__time {
    font-size: 12px;
    color: var(--text-secondary);
  }

  &__detail {
    margin: 0;
    font-size: 12.5px;
    color: var(--text-secondary);
  }
}

.confirm-dialog-card {
  width: 100%;
  max-width: 420px;

  &__body {
    padding: 20px 20px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__copy {
    margin: 0;
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.5;
  }

  &__actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 20px;
    border-top: 1px solid var(--border-hairline);
    background: var(--bg-surface-subtle);
  }
}

.text-secondary {
  color: var(--text-secondary);
}
</style>
