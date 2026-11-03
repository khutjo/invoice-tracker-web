<template>
  <q-page class="invoice-editor-page">
    <!-- Loading State -->
    <div
      v-if="loadingInitial"
      class="attio-card editor-skeleton"
      data-testid="invoice-editor-loading"
    >
      <q-skeleton type="text" width="220px" height="28px" />
      <q-skeleton type="rect" width="100%" height="260px" />
    </div>

    <!-- 404 Not Found State -->
    <div
      v-else-if="notFound"
      class="attio-card editor-not-found"
      data-testid="invoice-editor-not-found"
    >
      <div class="editor-not-found__code tabular-nums">404</div>
      <h1 class="text-heading-lg">Invoice not found</h1>
      <p class="editor-not-found__copy">
        This draft invoice could not be found or belongs to another business workspace.
      </p>
      <q-btn
        color="primary"
        label="Back to invoices"
        :to="backToListLocation"
        data-testid="editor-back-to-list-btn"
      />
    </div>

    <!-- Main Editor Content -->
    <div v-else class="editor-shell">
      <!-- Top Header Bar -->
      <div class="editor-header">
        <div class="editor-header__left">
          <router-link :to="backLinkTarget" class="editor-header__back">
            <q-icon name="arrow_back" size="16px" />
            <span>{{ isEditMode ? 'Back to invoice' : 'Invoices' }}</span>
          </router-link>

          <div class="editor-header__title-row">
            <h1 class="text-heading-lg" data-testid="invoice-editor-title">
              {{ isEditMode ? 'Edit draft invoice' : 'New draft invoice' }}
            </h1>
            <span class="status-pill status-pill--draft">Draft</span>
            <span
              v-if="savedFeedbackMessage"
              class="status-pill status-pill--paid"
              data-testid="draft-saved-pill"
            >
              {{ savedFeedbackMessage }}
            </span>
          </div>
        </div>

        <div class="editor-header__actions">
          <q-btn
            outline
            label="Save draft"
            :loading="savingDraft"
            :disable="isBusy"
            data-testid="save-draft-btn"
            @click="handleSaveDraft"
          />

          <div
            class="send-btn-wrapper"
            :title="sendDisabledReason ?? undefined"
            data-testid="save-and-send-wrapper"
          >
            <q-btn
              color="primary"
              icon="send"
              label="Save and send"
              :loading="savingAndSending"
              :disable="isBusy || Boolean(sendDisabledReason)"
              data-testid="save-and-send-btn"
              @click="handleSaveAndSend"
            >
              <q-tooltip v-if="sendDisabledReason">
                {{ sendDisabledReason }}
              </q-tooltip>
            </q-btn>
          </div>
        </div>
      </div>

      <!-- 409 Stale Version Reload Banner -->
      <div
        v-if="hasStaleConflict"
        role="alert"
        class="editor-conflict-banner"
        data-testid="invoice-conflict-banner"
      >
        <div class="editor-conflict-banner__text">
          <q-icon name="sync_problem" size="18px" />
          <span>This invoice was changed elsewhere. Reload to see the latest.</span>
        </div>
        <q-btn
          outline
          dense
          label="Reload"
          :loading="reloadingInvoice"
          data-testid="invoice-conflict-reload-btn"
          @click="reloadLatestInvoice"
        />
      </div>

      <!-- Top-level Error Banner -->
      <div
        v-if="bannerError"
        role="alert"
        class="editor-error-banner"
        data-testid="invoice-editor-error-banner"
      >
        <q-icon name="error_outline" size="16px" />
        <span>{{ bannerError }}</span>
      </div>

      <!-- Two-Column Layout: Form & Line Grid + Sticky Totals Panel -->
      <div class="editor-layout">
        <div class="editor-main">
          <!-- Customer & Terms Card -->
          <section class="attio-card editor-card">
            <h2 class="text-heading-md editor-card__title">Customer & terms</h2>

            <div class="editor-card__grid">
              <!-- Searchable Customer Picker -->
              <div class="auth-field customer-picker-field">
                <label class="field-label" for="editor-customer-search">
                  Customer
                  <span
                    v-if="draft.customerId"
                    class="status-pill status-pill--paid"
                    style="margin-left: 6px; padding: 0 6px; font-size: 11px"
                  >
                    Selected
                  </span>
                </label>
                <div class="customer-picker">
                  <input
                    id="editor-customer-search"
                    :value="customerSearchInput"
                    type="text"
                    placeholder="Search active customers…"
                    autocomplete="off"
                    class="customer-picker__input"
                    :class="{
                      'customer-picker__input--error': Boolean(mergedErrors.customerId),
                    }"
                    :disabled="isBusy"
                    data-testid="editor-customer-input"
                    @focus="openCustomerPicker"
                    @blur="onCustomerInputBlur"
                    @keydown.enter.prevent="onCustomerInputEnter"
                    @input="onCustomerPickerInput(($event.target as HTMLInputElement).value)"
                  />

                  <div
                    v-if="customerPickerOpen"
                    class="customer-picker__dropdown"
                    data-testid="editor-customer-dropdown"
                  >
                    <button
                      v-for="cust in customerPickerOptions"
                      :key="cust.customerId"
                      type="button"
                      class="customer-picker__option"
                      :data-testid="`editor-customer-option-${cust.customerId}`"
                      @mousedown.prevent="selectCustomer(cust.customerId, cust.name)"
                      @click="selectCustomer(cust.customerId, cust.name)"
                    >
                      <span class="customer-picker__option-name">{{ cust.name }}</span>
                      <span class="customer-picker__option-sub">{{ cust.email }}</span>
                    </button>

                    <div
                      v-if="!customerPickerLoading && customerPickerOptions.length === 0"
                      class="customer-picker__empty"
                    >
                      No active customers found
                    </div>

                    <div class="customer-picker__footer">
                      <button
                        type="button"
                        class="customer-picker__new-btn"
                        data-testid="editor-new-customer-link"
                        @mousedown.prevent="openNewCustomerDrawer"
                        @click="openNewCustomerDrawer"
                      >
                        + New customer
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  v-if="mergedErrors.customerId"
                  class="field-error-text"
                  data-testid="editor-customer-error"
                >
                  {{ mergedErrors.customerId }}
                </div>

                <div class="customer-picker__quick-row">
                  <button
                    type="button"
                    class="customer-picker__inline-new"
                    data-testid="editor-inline-new-customer-btn"
                    @click="openNewCustomerDrawer"
                  >
                    + New customer
                  </button>
                </div>
              </div>

              <!-- Payment Terms Days -->
              <div class="auth-field">
                <label class="field-label" for="editor-payment-terms"> Payment terms (days) </label>
                <input
                  id="editor-payment-terms"
                  :value="draft.paymentTermsDays"
                  type="number"
                  min="0"
                  max="365"
                  step="1"
                  class="customer-picker__input tabular-nums"
                  :class="{
                    'customer-picker__input--error': Boolean(mergedErrors.paymentTermsDays),
                  }"
                  :disabled="isBusy"
                  data-testid="editor-payment-terms"
                  @input="onPaymentTermsInput(Number(($event.target as HTMLInputElement).value))"
                />
                <div
                  v-if="mergedErrors.paymentTermsDays"
                  class="field-error-text"
                  data-testid="editor-payment-terms-error"
                >
                  {{ mergedErrors.paymentTermsDays }}
                </div>
                <span class="field-helper" data-testid="editor-payment-terms-hint">
                  Due {{ draft.paymentTermsDays }} days after sending
                </span>
              </div>
            </div>
          </section>

          <!-- Line Items Section -->
          <section class="attio-card editor-card">
            <div class="editor-card__header">
              <h2 class="text-heading-md editor-card__title">Line items</h2>
              <span class="editor-card__count tabular-nums">
                {{ draft.lines.length }}
                {{ draft.lines.length === 1 ? 'line' : 'lines' }}
              </span>
            </div>

            <InvoiceLineGrid
              v-model="draft.lines"
              :errors="mergedErrors"
              :disable="isBusy"
              @update:model-value="clearLineServerErrors"
            />
          </section>
        </div>

        <!-- Sticky Totals Preview Panel -->
        <aside class="editor-sidebar">
          <div class="attio-card totals-panel" data-testid="editor-totals-panel">
            <h2 class="text-heading-md totals-panel__title">Summary</h2>

            <dl class="totals-list">
              <div class="totals-list__row">
                <dt>Subtotal (excl. VAT)</dt>
                <dd class="tabular-nums" data-testid="preview-subtotal">
                  {{ formatZar(previewTotals.subtotal) }}
                </dd>
              </div>

              <div class="totals-list__row">
                <dt>VAT</dt>
                <dd class="tabular-nums" data-testid="preview-vat">
                  {{ formatZar(previewTotals.vatTotal) }}
                </dd>
              </div>

              <div class="totals-list__divider" />

              <div class="totals-list__row totals-list__row--total">
                <dt>Total (ZAR)</dt>
                <dd class="tabular-nums" data-testid="preview-total">
                  {{ formatZar(previewTotals.total) }}
                </dd>
              </div>
            </dl>

            <p class="totals-panel__note" data-testid="preview-totals-note">
              Preview: final totals are worked out when you save
            </p>
          </div>
        </aside>
      </div>
    </div>

    <!-- New Customer Drawer -->
    <CustomerForm
      v-model="newCustomerDrawerOpen"
      :customer="null"
      @created="onNewCustomerCreated"
    />
  </q-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { businessApi } from 'src/features/business/api'
import {
  getCustomer,
  searchCustomers,
  type CustomerDetails,
  type CustomerSummary,
} from 'src/features/customers/api'
import CustomerForm from 'src/features/customers/components/CustomerForm.vue'
import { invoicesApi, type InvoiceDetails, type InvoiceInput } from '../api'
import InvoiceLineGrid from '../components/InvoiceLineGrid.vue'
import { useCustomerNames } from '../composables/useCustomerNames'
import { useInvoicesStore } from '../store'
import {
  getSendDisabledReason,
  validateInvoiceDraft,
  type InvoiceDraft,
  type InvoiceLineDraft,
} from '../validation'
import { ApiError, mapProblemDetails } from 'src/shared/api/problem'
import { calculateInvoicePreview, formatZar } from 'src/shared/money'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const invoicesStore = useInvoicesStore()
const { setCustomerName, getCustomerName, resolveCustomerIds } = useCustomerNames()

const loadingInitial = ref(false)
const notFound = ref(false)
const savingDraft = ref(false)
const savingAndSending = ref(false)
const reloadingInvoice = ref(false)
const hasStaleConflict = ref(false)
const bannerError = ref('')
const savedFeedbackMessage = ref('')
const serverErrors = ref<Record<string, string>>({})
const showValidationErrors = ref(false)

const loadedVersion = ref('')
const cleanSnapshotJson = ref('')
const allowLeaveWithoutPrompt = ref(false)
let skipNextRouteFetchId = ''

const newCustomerDrawerOpen = ref(false)
const customerPickerOpen = ref(false)
const customerSearchInput = ref('')
const customerPickerOptions = ref<CustomerSummary[]>([])
const customerPickerLoading = ref(false)
let customerPickerTimer: ReturnType<typeof setTimeout> | null = null

let lineIdCounter = 1
function nextLocalLineId(): string {
  return `editor-line-${Date.now()}-${lineIdCounter++}`
}

const draft = reactive<InvoiceDraft>({
  customerId: '',
  paymentTermsDays: 30,
  lines: [
    {
      localId: nextLocalLineId(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      vatRate: 0.15,
    },
  ],
})

const currentInvoiceId = computed(() =>
  typeof route.params.invoiceId === 'string' ? route.params.invoiceId.trim() : '',
)

const isEditMode = computed(() => currentInvoiceId.value.length > 0)

const isBusy = computed(() => savingDraft.value || savingAndSending.value || reloadingInvoice.value)

const backToListLocation = computed(() => ({
  path: '/invoices',
  query: invoicesStore.lastListRouteQuery,
}))

const backLinkTarget = computed(() =>
  isEditMode.value
    ? `/invoices/${encodeURIComponent(currentInvoiceId.value)}`
    : backToListLocation.value,
)

const previewTotals = computed(() => calculateInvoicePreview(draft.lines))

const clientErrors = computed(() => validateInvoiceDraft(draft))
const hasValidationErrors = computed(() => Object.keys(clientErrors.value).length > 0)

const mergedErrors = computed<Record<string, string>>(() => {
  if (showValidationErrors.value) {
    return {
      ...clientErrors.value,
      ...serverErrors.value,
    }
  }
  return { ...serverErrors.value }
})

const sendDisabledReason = computed(() =>
  getSendDisabledReason(draft.lines.length, previewTotals.value.total),
)

function serializeDraftState(): string {
  return JSON.stringify({
    customerId: draft.customerId,
    paymentTermsDays: Number(draft.paymentTermsDays),
    lines: draft.lines.map((l) => ({
      description: l.description,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      vatRate: Number(l.vatRate),
    })),
  })
}

const isDirty = computed(
  () => cleanSnapshotJson.value.length > 0 && serializeDraftState() !== cleanSnapshotJson.value,
)

function markClean() {
  cleanSnapshotJson.value = serializeDraftState()
}

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (isDirty.value && !allowLeaveWithoutPrompt.value) {
    event.preventDefault()
    event.returnValue = ''
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  if (customerPickerTimer) {
    clearTimeout(customerPickerTimer)
  }
})

onBeforeRouteLeave(() => {
  if (!isDirty.value || allowLeaveWithoutPrompt.value) {
    return true
  }
  if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
    return window.confirm('You have unsaved changes on this draft invoice. Leave without saving?')
  }
  return true
})

function applyServerInvoice(details: InvoiceDetails) {
  draft.customerId = details.customerId
  draft.paymentTermsDays = details.paymentTermsDays
  draft.lines = details.lines.map((line): InvoiceLineDraft => ({
    localId: line.invoiceLineId || nextLocalLineId(),
    description: line.description,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    vatRate: line.vatRate,
  }))
  loadedVersion.value = details.version
  hasStaleConflict.value = false
  bannerError.value = ''
  serverErrors.value = {}
  showValidationErrors.value = false
  markClean()
}

async function initNewInvoice() {
  loadingInitial.value = true
  notFound.value = false
  hasStaleConflict.value = false
  bannerError.value = ''
  savedFeedbackMessage.value = ''
  serverErrors.value = {}

  const preselectedCustomerId =
    typeof route.query.customerId === 'string' ? route.query.customerId.trim() : ''

  draft.customerId = preselectedCustomerId
  draft.paymentTermsDays = 30
  draft.lines = [
    {
      localId: nextLocalLineId(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      vatRate: 0.15,
    },
  ]

  try {
    const tasks: Promise<void>[] = [
      (async () => {
        try {
          const settings = await businessApi.getSettings()
          if (Number.isInteger(settings.defaultPaymentTermsDays)) {
            draft.paymentTermsDays = settings.defaultPaymentTermsDays
          }
        } catch {
          // Keep 30-day default if settings endpoint fails
        }
      })(),
      runCustomerPickerSearch(''),
    ]

    if (preselectedCustomerId) {
      tasks.push(
        (async () => {
          try {
            const cust = await getCustomer(preselectedCustomerId)
            if (!cust.isArchived) {
              setCustomerName(cust.customerId, cust.name)
              customerSearchInput.value = cust.name
            } else {
              draft.customerId = ''
              customerSearchInput.value = ''
            }
          } catch {
            draft.customerId = ''
            customerSearchInput.value = ''
          }
        })(),
      )
    } else {
      customerSearchInput.value = ''
    }

    await Promise.all(tasks)
  } finally {
    markClean()
    loadingInitial.value = false
  }
}

async function initEditInvoice(invoiceId: string) {
  loadingInitial.value = true
  notFound.value = false
  hasStaleConflict.value = false
  bannerError.value = ''
  savedFeedbackMessage.value = ''
  serverErrors.value = {}

  try {
    const details = await invoicesApi.getInvoice(invoiceId)
    if (details.status !== 'Draft') {
      allowLeaveWithoutPrompt.value = true
      await router.replace(`/invoices/${encodeURIComponent(invoiceId)}`)
      return
    }
    applyServerInvoice(details)
    if (details.customerId) {
      await resolveCustomerIds([details.customerId])
      customerSearchInput.value = getCustomerName(details.customerId)
    }
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound.value = true
    } else {
      const mapped = mapProblemDetails(err)
      bannerError.value = mapped.title || "Couldn't load invoice."
    }
  } finally {
    loadingInitial.value = false
  }
}

watch(
  () => currentInvoiceId.value,
  (invoiceId) => {
    if (invoiceId && invoiceId === skipNextRouteFetchId) {
      skipNextRouteFetchId = ''
      return
    }
    if (invoiceId) {
      void initEditInvoice(invoiceId)
    } else {
      void initNewInvoice()
    }
  },
  { immediate: true },
)

async function runCustomerPickerSearch(term: string) {
  customerPickerLoading.value = true
  try {
    const res = await searchCustomers({
      search: term,
      page: 1,
      pageSize: 10,
      includeArchived: false,
    })
    customerPickerOptions.value = (res?.items ?? []).filter((c) => !c.isArchived)
    for (const c of customerPickerOptions.value) {
      setCustomerName(c.customerId, c.name)
    }
    tryAutoMatchCustomerInput()
  } catch {
    customerPickerOptions.value = []
  } finally {
    customerPickerLoading.value = false
  }
}

function tryAutoMatchCustomerInput() {
  const typed = customerSearchInput.value.trim().toLowerCase()
  if (!typed) return
  const exact = customerPickerOptions.value.find(
    (c) => c.name.trim().toLowerCase() === typed || c.email.trim().toLowerCase() === typed,
  )
  if (exact) {
    draft.customerId = exact.customerId
    setCustomerName(exact.customerId, exact.name)
    delete serverErrors.value.customerId
  }
}

function openCustomerPicker() {
  customerPickerOpen.value = true
  void runCustomerPickerSearch(customerSearchInput.value)
}

function onCustomerInputBlur() {
  tryAutoMatchCustomerInput()
  if (
    !draft.customerId &&
    customerSearchInput.value.trim().length > 0 &&
    customerPickerOptions.value.length === 1
  ) {
    const only = customerPickerOptions.value[0]!
    selectCustomer(only.customerId, only.name)
  }
  customerPickerOpen.value = false
}

function onCustomerInputEnter() {
  tryAutoMatchCustomerInput()
  if (!draft.customerId && customerPickerOptions.value.length > 0) {
    const first = customerPickerOptions.value[0]!
    selectCustomer(first.customerId, first.name)
    return
  }
  customerPickerOpen.value = false
}

function onCustomerPickerInput(value: string) {
  customerSearchInput.value = value
  customerPickerOpen.value = true
  savedFeedbackMessage.value = ''
  if (!value.trim()) {
    draft.customerId = ''
  } else {
    tryAutoMatchCustomerInput()
  }
  delete serverErrors.value.customerId
  if (customerPickerTimer) {
    clearTimeout(customerPickerTimer)
  }
  customerPickerTimer = setTimeout(() => {
    void runCustomerPickerSearch(value)
  }, 300)
}

function selectCustomer(customerId: string, name: string) {
  draft.customerId = customerId
  customerSearchInput.value = name
  customerPickerOpen.value = false
  savedFeedbackMessage.value = ''
  setCustomerName(customerId, name)
  delete serverErrors.value.customerId
}

function openNewCustomerDrawer() {
  customerPickerOpen.value = false
  newCustomerDrawerOpen.value = true
}

function onNewCustomerCreated(created: CustomerDetails) {
  setCustomerName(created.customerId, created.name)
  selectCustomer(created.customerId, created.name)
}

function onPaymentTermsInput(value: number) {
  draft.paymentTermsDays = Number.isFinite(value) ? Math.trunc(value) : 0
  savedFeedbackMessage.value = ''
  delete serverErrors.value.paymentTermsDays
}

function clearLineServerErrors() {
  savedFeedbackMessage.value = ''
  const next: Record<string, string> = {}
  for (const [k, v] of Object.entries(serverErrors.value)) {
    if (!k.startsWith('lines')) {
      next[k] = v
    }
  }
  serverErrors.value = next
}

function toInvoiceInput(): InvoiceInput {
  return {
    customerId: draft.customerId.trim(),
    paymentTermsDays: Number(draft.paymentTermsDays),
    lines: draft.lines.map((line) => ({
      description: line.description.trim(),
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
      vatRate: Number(line.vatRate),
    })),
  }
}

async function handleConflictError(err: ApiError): Promise<void> {
  const problemTitle =
    (typeof err.problem?.title === 'string' && err.problem.title.trim()) ||
    (typeof err.problem?.detail === 'string' && err.problem.detail.trim()) ||
    err.message ||
    'Conflict'

  if (problemTitle.startsWith('Only a draft invoice can be')) {
    $q.notify?.({
      type: 'warning',
      message: problemTitle,
    })
    if (currentInvoiceId.value) {
      allowLeaveWithoutPrompt.value = true
      await router.replace(`/invoices/${encodeURIComponent(currentInvoiceId.value)}`)
    }
    return
  }

  if (
    problemTitle.startsWith('An invoice needs at least one line') ||
    problemTitle.startsWith('An invoice with a zero total cannot be sent')
  ) {
    bannerError.value = problemTitle
    $q.notify?.({
      type: 'negative',
      message: problemTitle,
    })
    return
  }

  hasStaleConflict.value = true
  invoicesStore.markConflict()
}

function applyValidationError(err: unknown) {
  const mapped = mapProblemDetails(err)
  const flattened: Record<string, string> = {}
  for (const [key, msgs] of Object.entries(mapped.fieldErrors)) {
    if (msgs[0]) {
      flattened[key] = msgs[0]
    }
  }
  serverErrors.value = flattened
  if (Object.keys(flattened).length === 0) {
    bannerError.value = mapped.title || 'Check the highlighted fields and try again.'
  } else {
    bannerError.value = Object.values(flattened)[0] || 'Check the highlighted fields and try again.'
  }
}

async function persistDraft(): Promise<InvoiceDetails | null> {
  tryAutoMatchCustomerInput()
  showValidationErrors.value = true
  bannerError.value = ''
  savedFeedbackMessage.value = ''
  serverErrors.value = {}

  if (hasValidationErrors.value) {
    bannerError.value =
      Object.values(clientErrors.value)[0] || 'Please fix the highlighted fields before saving.'
    return null
  }

  const input = toInvoiceInput()
  if (isEditMode.value) {
    return invoicesApi.updateInvoice(currentInvoiceId.value, {
      ...input,
      version: loadedVersion.value,
    })
  }
  return invoicesApi.createInvoice(input)
}

async function handleSaveDraft() {
  if (isBusy.value) return
  savingDraft.value = true
  try {
    const saved = await persistDraft()
    if (!saved) return

    const wasNew = !isEditMode.value
    applyServerInvoice(saved)
    savedFeedbackMessage.value = 'Draft saved'

    $q.notify?.({
      type: 'positive',
      message: 'Draft saved',
    })

    if (wasNew) {
      skipNextRouteFetchId = saved.invoiceId
      allowLeaveWithoutPrompt.value = true
      await router.replace(`/invoices/${encodeURIComponent(saved.invoiceId)}/edit`)
      allowLeaveWithoutPrompt.value = false
    }
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      await handleConflictError(err)
      return
    }
    applyValidationError(err)
  } finally {
    savingDraft.value = false
  }
}

async function handleSaveAndSend() {
  if (isBusy.value || sendDisabledReason.value) return
  savingAndSending.value = true
  let createdNewInvoiceId = ''
  try {
    const saved = await persistDraft()
    if (!saved) return

    const wasNew = !isEditMode.value
    if (wasNew) {
      createdNewInvoiceId = saved.invoiceId
    }
    applyServerInvoice(saved)

    const sent = await invoicesApi.sendInvoice(saved.invoiceId)
    $q.notify?.({
      type: 'positive',
      message: `Sent as ${sent.invoiceNumber ?? ''}`.trim(),
    })

    allowLeaveWithoutPrompt.value = true
    await router.push(`/invoices/${encodeURIComponent(sent.invoiceId)}`)
  } catch (err) {
    if (createdNewInvoiceId) {
      skipNextRouteFetchId = createdNewInvoiceId
      allowLeaveWithoutPrompt.value = true
      await router.replace(`/invoices/${encodeURIComponent(createdNewInvoiceId)}/edit`)
      allowLeaveWithoutPrompt.value = false
    }
    if (err instanceof ApiError && err.status === 409) {
      await handleConflictError(err)
      return
    }
    applyValidationError(err)
  } finally {
    savingAndSending.value = false
  }
}

async function reloadLatestInvoice() {
  if (!currentInvoiceId.value) return
  reloadingInvoice.value = true
  try {
    const latest = await invoicesApi.getInvoice(currentInvoiceId.value)
    if (latest.status !== 'Draft') {
      allowLeaveWithoutPrompt.value = true
      await router.replace(`/invoices/${encodeURIComponent(latest.invoiceId)}`)
      return
    }
    applyServerInvoice(latest)
    invoicesStore.clearConflict()
    if (latest.customerId) {
      await resolveCustomerIds([latest.customerId])
      customerSearchInput.value = getCustomerName(latest.customerId)
    }
  } catch (err) {
    const mapped = mapProblemDetails(err)
    bannerError.value = mapped.title || "Couldn't reload the latest invoice."
  } finally {
    reloadingInvoice.value = false
  }
}
</script>

<style scoped lang="scss">
.invoice-editor-page {
  padding: 20px;
  max-width: 1180px;
  margin: 0 auto;
}

.editor-skeleton {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.editor-not-found {
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
    max-width: 380px;
    color: var(--text-secondary);
    font-size: 13px;
  }
}

.editor-shell {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.editor-header {
  display: flex;
  align-items: flex-end;
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
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.editor-conflict-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 6px;
  background: var(--pill-partial-bg);
  color: var(--pill-partial-text);
  border: 1px solid var(--pill-partial-border);
  font-size: 13px;

  &__text {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.editor-error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 6px;
  background: var(--pill-overdue-bg);
  color: var(--pill-overdue-text);
  border: 1px solid var(--pill-overdue-border);
  font-size: 13px;
}

.editor-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  align-items: start;

  @media (min-width: 960px) {
    grid-template-columns: 1fr 300px;
  }
}

.editor-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.editor-card {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  &__title {
    margin: 0;
  }

  &__count {
    font-size: 12px;
    color: var(--text-secondary);
  }

  &__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;

    @media (min-width: 640px) {
      grid-template-columns: 1.4fr 1fr;
    }
  }
}

.customer-picker {
  position: relative;

  &__input {
    width: 100%;
    height: 36px;
    padding: 0 10px;
    border: 1px solid var(--border-hairline);
    border-radius: 6px;
    background: var(--bg-surface);
    color: var(--text-primary);
    font-family: inherit;
    font-size: 13px;

    &:focus {
      outline: none;
      border-color: var(--accent-primary);
      box-shadow: 0 0 0 3px var(--focus-ring);
    }

    &--error {
      border-color: var(--pill-overdue-text);
    }
  }

  &__dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 30;
    background: var(--bg-surface);
    border: 1px solid var(--border-hairline);
    border-radius: 8px;
    box-shadow: var(--popover-shadow);
    max-height: 240px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  &__option {
    border: none;
    background: transparent;
    text-align: left;
    padding: 8px 12px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 2px;

    &:hover {
      background: var(--bg-surface-hover);
    }
  }

  &__option-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
  }

  &__option-sub {
    font-size: 11.5px;
    color: var(--text-secondary);
  }

  &__empty {
    padding: 10px 12px;
    font-size: 12.5px;
    color: var(--text-muted);
  }

  &__footer {
    border-top: 1px solid var(--border-hairline);
    padding: 6px 10px;
    background: var(--bg-surface-subtle);
  }

  &__new-btn,
  &__inline-new {
    border: none;
    background: transparent;
    padding: 2px 0;
    font-size: 12.5px;
    font-weight: 500;
    color: var(--accent-primary);
    cursor: pointer;
    font-family: inherit;

    &:hover {
      text-decoration: underline;
    }
  }

  &__quick-row {
    margin-top: 4px;
  }
}

.field-error-text {
  margin-top: 4px;
  font-size: 12px;
  color: var(--pill-overdue-text);
}

.editor-sidebar {
  @media (min-width: 960px) {
    position: sticky;
    top: 20px;
  }
}

.totals-panel {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;

  &__title {
    margin: 0;
  }

  &__note {
    margin: 0;
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.4;
  }
}

.totals-list {
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

    &--total {
      font-size: 14.5px;
      font-weight: 600;
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
</style>
