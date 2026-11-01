<template>
  <q-dialog
    :model-value="modelValue"
    :position="isMobile ? 'standard' : 'right'"
    :maximized="isMobile"
    full-height
    @update:model-value="onDialogModelUpdate"
  >
    <q-card class="customer-drawer-card" data-testid="customer-form-card">
      <!-- Form Header -->
      <div class="customer-drawer-card__header">
        <div>
          <h2 class="text-heading-md" data-testid="customer-form-title">
            {{ isEditMode ? 'Edit customer' : 'New customer' }}
          </h2>
          <p class="customer-drawer-card__subtitle">
            {{
              isEditMode
                ? 'Update customer billing and contact information.'
                : 'Add a customer to issue ZAR tax invoices.'
            }}
          </p>
        </div>

        <q-btn
          flat
          dense
          round
          icon="close"
          aria-label="Close customer form"
          data-testid="customer-form-close"
          @click="requestClose"
        />
      </div>

      <!-- 409 Stale Version Reload Banner -->
      <div
        v-if="hasStaleConflict"
        role="alert"
        class="customer-conflict-banner"
        data-testid="customer-conflict-banner"
      >
        <div class="customer-conflict-banner__text">
          <q-icon name="sync_problem" size="18px" />
          <span>This customer was changed elsewhere. Reload to see the latest.</span>
        </div>
        <q-btn
          outline
          dense
          label="Reload"
          :loading="reloadingCustomer"
          data-testid="customer-conflict-reload-btn"
          @click="reloadLatestCustomer"
        />
      </div>

      <!-- Top-level Error Banner -->
      <div
        v-if="bannerError"
        role="alert"
        class="customer-error-banner"
        data-testid="customer-error-banner"
      >
        <q-icon name="error_outline" size="16px" />
        <span>{{ bannerError }}</span>
      </div>

      <!-- Scrollable Form Body -->
      <form
        class="customer-drawer-card__form"
        novalidate
        data-testid="customer-form"
        @submit.prevent="handleSubmit"
      >
        <div class="customer-drawer-card__body">
          <!-- Section 1: Details -->
          <section class="customer-section">
            <h3 class="text-heading-sm customer-section__title">Details</h3>

            <div class="auth-field">
              <label class="field-label" for="cust-name">Customer name</label>
              <q-input
                id="cust-name"
                v-model="draft.name"
                type="text"
                maxlength="200"
                placeholder="e.g. Highveld Logistics (Pty) Ltd"
                :disable="submitting"
                :error="Boolean(mergedErrors.name)"
                :error-message="mergedErrors.name"
                data-testid="customer-name"
              />
            </div>

            <div class="auth-field">
              <label class="field-label" for="cust-email">Billing email</label>
              <q-input
                id="cust-email"
                v-model="draft.email"
                type="email"
                maxlength="256"
                placeholder="accounts@highveldlogistics.co.za"
                :disable="submitting"
                :error="Boolean(mergedErrors.email)"
                :error-message="mergedErrors.email"
                data-testid="customer-email"
              />
            </div>

            <div class="customer-section__row">
              <div class="auth-field">
                <label class="field-label" for="cust-reference">
                  Customer reference <span class="field-optional">(optional)</span>
                </label>
                <q-input
                  id="cust-reference"
                  v-model="draft.customerReference"
                  type="text"
                  maxlength="50"
                  placeholder="e.g. ACC-0042"
                  :disable="submitting"
                  :error="Boolean(mergedErrors.customerReference)"
                  :error-message="mergedErrors.customerReference"
                  data-testid="customer-reference"
                />
              </div>

              <div class="auth-field">
                <label class="field-label" for="cust-vat">
                  VAT number <span class="field-optional">(optional)</span>
                </label>
                <q-input
                  id="cust-vat"
                  v-model="draft.vatNumber"
                  type="text"
                  inputmode="numeric"
                  maxlength="10"
                  placeholder="4123456789"
                  :disable="submitting"
                  :error="Boolean(mergedErrors.vatNumber)"
                  :error-message="mergedErrors.vatNumber"
                  data-testid="customer-vat"
                />
              </div>
            </div>
          </section>

          <div class="customer-section-divider" />

          <!-- Section 2: Contact number (optional) -->
          <section class="customer-section">
            <div class="customer-section__header-row">
              <h3 class="text-heading-sm customer-section__title">Contact number</h3>
              <button
                v-if="!draft.hasContactNumber"
                type="button"
                class="customer-section__toggle-link"
                data-testid="add-contact-number-btn"
                @click="addContactNumberSection"
              >
                + Add contact number
              </button>
              <button
                v-else
                type="button"
                class="customer-section__toggle-link customer-section__toggle-link--remove"
                data-testid="remove-contact-number-btn"
                @click="removeContactNumberSection"
              >
                Remove
              </button>
            </div>

            <div v-if="draft.hasContactNumber" class="customer-section__phone-grid">
              <div class="auth-field">
                <label class="field-label" for="cust-phone-type">Type</label>
                <q-select
                  for="cust-phone-type"
                  v-model="draft.contactType"
                  :options="contactNumberTypeOptions"
                  emit-value
                  map-options
                  :disable="submitting"
                  :error="Boolean(mergedErrors['contactNumber.type'])"
                  :error-message="mergedErrors['contactNumber.type']"
                  data-testid="customer-contact-type"
                />
              </div>

              <div class="auth-field">
                <label class="field-label" for="cust-phone-number">Number</label>
                <q-input
                  id="cust-phone-number"
                  v-model="draft.contactNumber"
                  type="tel"
                  placeholder="+27821234567"
                  :disable="submitting"
                  :error="Boolean(mergedErrors['contactNumber.number'])"
                  :error-message="mergedErrors['contactNumber.number']"
                  data-testid="customer-contact-number"
                />
                <span class="field-helper">International format, e.g. +27821234567</span>
              </div>
            </div>
            <p v-else class="customer-section__empty-hint">
              No contact number added.
            </p>
          </section>

          <div class="customer-section-divider" />

          <!-- Section 3: Billing address (optional) -->
          <section class="customer-section">
            <div class="customer-section__header-row">
              <h3 class="text-heading-sm customer-section__title">Billing address</h3>
              <button
                v-if="!draft.hasBillingAddress"
                type="button"
                class="customer-section__toggle-link"
                data-testid="add-billing-address-btn"
                @click="addBillingAddressSection"
              >
                + Add billing address
              </button>
              <button
                v-else
                type="button"
                class="customer-section__toggle-link customer-section__toggle-link--remove"
                data-testid="remove-billing-address-btn"
                @click="removeBillingAddressSection"
              >
                Remove
              </button>
            </div>

            <div v-if="draft.hasBillingAddress">
              <AddressFields
                v-model="draft.billingAddress"
                :errors="mergedErrors"
                :disable="submitting"
                id-prefix="cust-addr"
                field-prefix="billingAddress"
                @postal-error="postalLookupError = $event"
              />
            </div>
            <p v-else class="customer-section__empty-hint">
              No billing address added.
            </p>
          </section>
        </div>

        <!-- Sticky Footer -->
        <div class="customer-drawer-card__footer">
          <q-btn
            flat
            label="Cancel"
            :disable="submitting"
            data-testid="customer-form-cancel"
            @click="requestClose"
          />
          <q-btn
            type="submit"
            color="primary"
            :label="isEditMode ? 'Save changes' : 'Create customer'"
            :loading="submitting"
            :disable="submitting || !isFormValid"
            data-testid="customer-form-submit"
          />
        </div>
      </form>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useBusinessStore } from 'src/features/business/store'
import {
  customersApi,
  type CustomerDetails,
  type CustomerInput,
} from 'src/features/customers/api'
import { useCustomersStore } from 'src/features/customers/store'
import {
  validateCustomerDraft,
  type CustomerFormDraft,
} from 'src/features/customers/validation'
import { ApiError, mapProblemDetails } from 'src/shared/api/problem'
import AddressFields from 'src/shared/components/AddressFields.vue'

const KNOWN_CUSTOMER_FIELDS = [
  'name',
  'email',
  'customerReference',
  'vatNumber',
  'contactNumber.number',
  'contactNumber.type',
  'billingAddress.line1',
  'billingAddress.line2',
  'billingAddress.suburb',
  'billingAddress.city',
  'billingAddress.postalCode',
] as const

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    customer?: CustomerDetails | null
  }>(),
  {
    customer: null,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  created: [customer: CustomerDetails]
  updated: [customer: CustomerDetails]
  archivedElsewhere: [customerId: string]
}>()

const $q = useQuasar()
const businessStore = useBusinessStore()
const customersStore = useCustomersStore()

const isMobile = computed(() => Boolean($q.screen?.xs))
const isEditMode = computed(() => Boolean(props.customer))

const submitting = ref(false)
const reloadingCustomer = ref(false)
const hasStaleConflict = ref(false)
const bannerError = ref('')
const postalLookupError = ref<string | undefined>(undefined)
const currentVersion = ref('')
const attemptedSubmit = ref(false)

const serverFieldErrors = reactive<Record<string, string>>({})

const draft = reactive<CustomerFormDraft>({
  name: '',
  email: '',
  customerReference: '',
  vatNumber: '',
  hasContactNumber: false,
  contactNumber: '',
  contactType: 'Mobile',
  hasBillingAddress: false,
  billingAddress: {
    line1: '',
    line2: '',
    suburb: '',
    city: '',
    postalCode: '',
  },
})

const initialSnapshot = ref('')

const contactNumberTypeOptions = computed(
  () =>
    businessStore.lookups?.contactNumberTypes ?? [
      { value: 'Mobile', label: 'Mobile' },
      { value: 'Landline', label: 'Landline' },
      { value: 'Work', label: 'Work' },
    ],
)

function serializeDraft(): string {
  return JSON.stringify({
    name: draft.name.trim(),
    email: draft.email.trim(),
    customerReference: draft.customerReference.trim(),
    vatNumber: draft.vatNumber.trim(),
    hasContactNumber: draft.hasContactNumber,
    contactNumber: draft.contactNumber.trim(),
    contactType: draft.contactType,
    hasBillingAddress: draft.hasBillingAddress,
    billingAddress: {
      line1: draft.billingAddress.line1.trim(),
      line2: draft.billingAddress.line2.trim(),
      suburb: draft.billingAddress.suburb.trim(),
      city: draft.billingAddress.city.trim(),
      postalCode: draft.billingAddress.postalCode.trim(),
    },
  })
}

const isDirty = computed(() => serializeDraft() !== initialSnapshot.value)

const clientValidationErrors = computed(() => validateCustomerDraft(draft))

const isFormValid = computed(
  () =>
    !postalLookupError.value &&
    Object.keys(clientValidationErrors.value).length === 0,
)

const mergedErrors = computed<Record<string, string>>(() => {
  if (!attemptedSubmit.value && !isDirty.value) {
    return { ...serverFieldErrors }
  }
  return {
    ...clientValidationErrors.value,
    ...serverFieldErrors,
  }
})

function clearServerErrors() {
  bannerError.value = ''
  for (const key of Object.keys(serverFieldErrors)) {
    delete serverFieldErrors[key]
  }
}

function loadFromCustomer(source: CustomerDetails | null | undefined) {
  clearServerErrors()
  hasStaleConflict.value = false
  postalLookupError.value = undefined
  attemptedSubmit.value = false

  if (source) {
    currentVersion.value = source.version
    draft.name = source.name ?? ''
    draft.email = source.email ?? ''
    draft.customerReference = source.customerReference ?? ''
    draft.vatNumber = source.vatNumber ?? ''

    if (source.contactNumber) {
      draft.hasContactNumber = true
      draft.contactNumber = source.contactNumber.number ?? ''
      draft.contactType = source.contactNumber.type ?? 'Mobile'
    } else {
      draft.hasContactNumber = false
      draft.contactNumber = ''
      draft.contactType = 'Mobile'
    }

    if (source.billingAddress) {
      draft.hasBillingAddress = true
      draft.billingAddress = {
        line1: source.billingAddress.line1 ?? '',
        line2: source.billingAddress.line2 ?? '',
        suburb: source.billingAddress.suburb ?? '',
        city: source.billingAddress.city ?? '',
        postalCode: source.billingAddress.postalCode ?? '',
      }
    } else {
      draft.hasBillingAddress = false
      draft.billingAddress = {
        line1: '',
        line2: '',
        suburb: '',
        city: '',
        postalCode: '',
      }
    }
  } else {
    currentVersion.value = ''
    draft.name = ''
    draft.email = ''
    draft.customerReference = ''
    draft.vatNumber = ''
    draft.hasContactNumber = false
    draft.contactNumber = ''
    draft.contactType = 'Mobile'
    draft.hasBillingAddress = false
    draft.billingAddress = {
      line1: '',
      line2: '',
      suburb: '',
      city: '',
      postalCode: '',
    }
  }

  initialSnapshot.value = serializeDraft()
}

watch(
  () => [props.modelValue, props.customer] as const,
  ([open, cust]) => {
    if (open) {
      loadFromCustomer(cust)
    }
  },
  { immediate: true },
)

function addContactNumberSection() {
  draft.hasContactNumber = true
}

function removeContactNumberSection() {
  draft.hasContactNumber = false
  draft.contactNumber = ''
  draft.contactType = 'Mobile'
  delete serverFieldErrors['contactNumber.number']
  delete serverFieldErrors['contactNumber.type']
}

function addBillingAddressSection() {
  draft.hasBillingAddress = true
}

function removeBillingAddressSection() {
  draft.hasBillingAddress = false
  draft.billingAddress = {
    line1: '',
    line2: '',
    suburb: '',
    city: '',
    postalCode: '',
  }
  postalLookupError.value = undefined
  delete serverFieldErrors['billingAddress.line1']
  delete serverFieldErrors['billingAddress.line2']
  delete serverFieldErrors['billingAddress.suburb']
  delete serverFieldErrors['billingAddress.city']
  delete serverFieldErrors['billingAddress.postalCode']
}

function buildCustomerInput(): CustomerInput {
  const phone = draft.contactNumber.trim()
  const addr = draft.billingAddress

  return {
    name: draft.name.trim(),
    email: draft.email.trim(),
    customerReference: draft.customerReference.trim() || null,
    vatNumber: draft.vatNumber.trim() || null,
    contactNumber:
      draft.hasContactNumber && phone
        ? {
            number: phone,
            type: draft.contactType,
          }
        : null,
    billingAddress: draft.hasBillingAddress
      ? {
          line1: addr.line1.trim(),
          line2: addr.line2.trim() || null,
          suburb: addr.suburb.trim(),
          city: addr.city.trim(),
          postalCode: addr.postalCode.trim(),
        }
      : null,
  }
}

async function handleSubmit() {
  attemptedSubmit.value = true
  clearServerErrors()

  const errors = validateCustomerDraft(draft)
  if (postalLookupError.value || Object.keys(errors).length > 0) {
    return
  }

  submitting.value = true
  const inputPayload = buildCustomerInput()

  try {
    if (isEditMode.value && props.customer) {
      const updated = await customersApi.updateCustomer(props.customer.customerId, {
        ...inputPayload,
        version: currentVersion.value,
      })
      currentVersion.value = updated.version
      customersStore.updateSummaryRowFromDetails(updated)
      $q.notify?.({
        type: 'positive',
        message: 'Customer saved.',
      })
      emit('updated', updated)
      emit('update:modelValue', false)
    } else {
      const created = await customersApi.createCustomer(inputPayload)
      $q.notify?.({
        type: 'positive',
        message: 'Customer added.',
      })
      emit('created', created)
      emit('update:modelValue', false)
    }
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      const problemTitle = err.problem?.title ?? err.message ?? ''
      if (/archived/i.test(problemTitle)) {
        $q.notify?.({
          type: 'warning',
          message: 'Archived customers cannot be edited.',
        })
        if (props.customer) {
          emit('archivedElsewhere', props.customer.customerId)
        }
        emit('update:modelValue', false)
        return
      }
      hasStaleConflict.value = true
      customersStore.conflict = true
      return
    }

    const mapped = mapProblemDetails(err, {
      knownFields: KNOWN_CUSTOMER_FIELDS,
    })

    for (const [key, messages] of Object.entries(mapped.fieldErrors)) {
      if (messages[0]) {
        serverFieldErrors[key] = messages[0]
        if (key.startsWith('contactNumber.')) {
          draft.hasContactNumber = true
        } else if (key.startsWith('billingAddress.')) {
          draft.hasBillingAddress = true
        }
      }
    }

    if (mapped.title) {
      bannerError.value = mapped.title
    }
  } finally {
    submitting.value = false
  }
}

async function reloadLatestCustomer() {
  if (!props.customer) return
  reloadingCustomer.value = true
  try {
    const fresh = await customersApi.getCustomer(props.customer.customerId)
    hasStaleConflict.value = false
    customersStore.conflict = false
    if (fresh.isArchived) {
      $q.notify?.({
        type: 'warning',
        message: 'Archived customers cannot be edited.',
      })
      emit('archivedElsewhere', fresh.customerId)
      emit('update:modelValue', false)
      return
    }
    loadFromCustomer(fresh)
    emit('updated', fresh)
  } finally {
    reloadingCustomer.value = false
  }
}

function requestClose() {
  if (isDirty.value) {
    if (!window.confirm('You have unsaved changes. Discard them and close?')) {
      return
    }
  }
  emit('update:modelValue', false)
}

function onDialogModelUpdate(nextOpen: boolean) {
  if (!nextOpen) {
    requestClose()
  } else {
    emit('update:modelValue', true)
  }
}
</script>

<style scoped lang="scss">
.customer-drawer-card {
  width: 100%;
  max-width: 520px;
  min-width: 320px;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 0 !important;
  background: var(--bg-surface);

  @media (min-width: 600px) {
    width: 480px;
  }

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-hairline);
  }

  &__subtitle {
    margin: 2px 0 0;
    font-size: 12.5px;
    color: var(--text-secondary);
  }

  &__form {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  &__body {
    flex: 1;
    overflow-y: auto;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 20px;
    border-top: 1px solid var(--border-hairline);
    background: var(--bg-surface-subtle);
  }
}

.customer-conflict-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 12px 20px 0;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--pill-partial-bg);
  color: var(--pill-partial-text);
  border: 1px solid var(--pill-partial-border);
  font-size: 12.5px;

  &__text {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.customer-error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 20px 0;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--pill-overdue-bg);
  color: var(--pill-overdue-text);
  border: 1px solid var(--pill-overdue-border);
  font-size: 12.5px;
}

.customer-section {
  display: flex;
  flex-direction: column;
  gap: 12px;

  &__header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  &__title {
    margin: 0;
  }

  &__toggle-link {
    border: none;
    background: transparent;
    padding: 0;
    font-size: 12.5px;
    font-weight: 500;
    color: var(--accent-primary);
    cursor: pointer;
    font-family: inherit;

    &:hover {
      text-decoration: underline;
    }

    &--remove {
      color: var(--pill-overdue-text);
    }
  }

  &__row {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;

    @media (min-width: 600px) {
      grid-template-columns: 1fr 1fr;
    }
  }

  &__phone-grid {
    display: grid;
    grid-template-columns: 110px 1fr;
    gap: 8px;
  }

  &__empty-hint {
    margin: 0;
    font-size: 12.5px;
    color: var(--text-muted);
  }
}

.customer-section-divider {
  height: 1px;
  background: var(--border-hairline);
}

.field-optional {
  font-weight: 400;
  color: var(--text-muted);
}
</style>
