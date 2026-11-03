<template>
  <q-page class="setup-page">
    <div class="setup-page__container">
      <!-- Top Brand & Finish Later Header -->
      <div class="setup-page__top">
        <div class="setup-brand">
          <div class="setup-brand__mark" aria-hidden="true">
            <span class="setup-brand__monogram">{{ businessStore.businessInitials }}</span>
          </div>
          <span class="setup-brand__name">Invoice Tracker</span>
        </div>

        <button
          type="button"
          class="setup-page__finish-later"
          data-testid="setup-finish-later-top"
          @click="finishLater"
        >
          Finish later
        </button>
      </div>

      <!-- Main Wizard Card (640px wide on desktop, full width on mobile) -->
      <div class="attio-card setup-card">
        <div class="setup-card__header">
          <h1 class="text-heading-lg" data-testid="setup-title">
            Set up {{ businessDisplayName }}
          </h1>
          <p class="setup-card__subtitle">
            Complete your business details so tax invoices include your SARS registration, contact
            address and banking information.
          </p>
        </div>

        <ConflictReloadBanner
          :visible="businessStore.hasConflict"
          :reloading="reloadingConflict"
          class="setup-card__banner"
          @reload="handleReloadConflict"
        />

        <div
          v-if="stepBannerError"
          role="alert"
          class="setup-error-banner"
          data-testid="setup-error-banner"
        >
          <q-icon name="error_outline" size="16px" />
          <span>{{ stepBannerError }}</span>
        </div>

        <q-stepper
          v-model="currentStep"
          flat
          :vertical="$q.screen.xs"
          color="primary"
          animated
          class="setup-stepper"
        >
          <!-- Step 1: Business details -->
          <q-step :name="1" title="Business details" icon="business" :done="currentStep > 1">
            <div class="setup-step-body" data-testid="setup-step-1">
              <div class="auth-field">
                <label class="field-label" for="setup-name">Business name</label>
                <q-input
                  id="setup-name"
                  v-model="identityDraft.name"
                  type="text"
                  maxlength="200"
                  :disable="savingStep"
                  :error="Boolean(fieldErrors.name)"
                  :error-message="fieldErrors.name"
                  data-testid="setup-name"
                />
              </div>

              <div class="setup-step-body__row">
                <div class="auth-field">
                  <label class="field-label" for="setup-reg-number">
                    Registration number <span class="field-optional">(optional)</span>
                  </label>
                  <q-input
                    id="setup-reg-number"
                    v-model="identityDraft.registrationNumber"
                    type="text"
                    placeholder="2019/123456/07"
                    :disable="savingStep"
                    :error="Boolean(fieldErrors.registrationNumber)"
                    :error-message="fieldErrors.registrationNumber"
                    data-testid="setup-registration-number"
                  />
                  <span class="field-helper">CIPC format, e.g. 2019/123456/07</span>
                </div>

                <div class="auth-field">
                  <label class="field-label" for="setup-vat-number">
                    VAT number <span class="field-optional">(optional)</span>
                  </label>
                  <q-input
                    id="setup-vat-number"
                    v-model="identityDraft.vatNumber"
                    type="text"
                    inputmode="numeric"
                    maxlength="10"
                    placeholder="4123456789"
                    :disable="savingStep"
                    :error="Boolean(fieldErrors.vatNumber)"
                    :error-message="fieldErrors.vatNumber"
                    data-testid="setup-vat-number"
                  />
                  <span class="field-helper">10 digits starting with 4</span>
                </div>
              </div>

              <div class="setup-step-actions">
                <button type="button" class="setup-step-actions__skip" @click="finishLater">
                  Finish later
                </button>
                <q-btn
                  color="primary"
                  label="Continue"
                  :loading="savingStep"
                  :disable="savingStep"
                  data-testid="setup-step-1-continue"
                  @click="saveStep1"
                />
              </div>
            </div>
          </q-step>

          <!-- Step 2: Contact & address -->
          <q-step :name="2" title="Contact & address" icon="place" :done="currentStep > 2">
            <div class="setup-step-body" data-testid="setup-step-2">
              <div class="setup-step-body__row">
                <div class="auth-field">
                  <label class="field-label" for="setup-support-email"> Support email </label>
                  <q-input
                    id="setup-support-email"
                    v-model="contactDraft.supportEmail"
                    type="email"
                    maxlength="256"
                    placeholder="accounts@company.co.za"
                    :disable="savingStep"
                    :error="Boolean(fieldErrors.supportEmail)"
                    :error-message="fieldErrors.supportEmail"
                    data-testid="setup-support-email"
                  />
                </div>

                <div class="setup-step-body__phone-grid">
                  <div class="auth-field">
                    <label class="field-label" for="setup-contact-type">Type</label>
                    <q-select
                      for="setup-contact-type"
                      v-model="contactDraft.contactType"
                      :options="contactNumberTypeOptions"
                      emit-value
                      map-options
                      :disable="savingStep"
                      :error="Boolean(fieldErrors['contactNumber.type'])"
                      :error-message="fieldErrors['contactNumber.type']"
                      data-testid="setup-contact-type"
                    />
                  </div>

                  <div class="auth-field">
                    <label class="field-label" for="setup-contact-number"> Contact number </label>
                    <q-input
                      id="setup-contact-number"
                      v-model="contactDraft.contactNumber"
                      type="tel"
                      placeholder="+27821234567"
                      :disable="savingStep"
                      :error="Boolean(fieldErrors['contactNumber.number'])"
                      :error-message="fieldErrors['contactNumber.number']"
                      data-testid="setup-contact-number"
                    />
                  </div>
                </div>
              </div>

              <div class="setup-step-body__divider" />

              <PostalAddressFields
                v-model="addressDraft"
                :errors="fieldErrors"
                :disable="savingStep"
                id-prefix="setup-addr"
              />

              <div class="setup-step-actions">
                <div class="setup-step-actions__left">
                  <q-btn flat label="Back" :disable="savingStep" @click="currentStep = 1" />
                  <button type="button" class="setup-step-actions__skip" @click="finishLater">
                    Finish later
                  </button>
                </div>
                <q-btn
                  color="primary"
                  label="Continue"
                  :loading="savingStep"
                  :disable="savingStep"
                  data-testid="setup-step-2-continue"
                  @click="saveStep2"
                />
              </div>
            </div>
          </q-step>

          <!-- Step 3: Banking -->
          <q-step :name="3" title="Banking" icon="account_balance" :done="currentStep > 3">
            <div class="setup-step-body" data-testid="setup-step-3">
              <BankDetailsFields
                v-model="bankDraft"
                :banks="bankOptions"
                :account-types="bankAccountTypeOptions"
                :errors="fieldErrors"
                :disable="savingStep"
                id-prefix="setup-bank"
              />

              <div class="setup-step-actions">
                <div class="setup-step-actions__left">
                  <q-btn flat label="Back" :disable="savingStep" @click="currentStep = 2" />
                  <button type="button" class="setup-step-actions__skip" @click="finishLater">
                    Finish later
                  </button>
                </div>
                <q-btn
                  color="primary"
                  label="Continue"
                  :loading="savingStep"
                  :disable="savingStep"
                  data-testid="setup-step-3-continue"
                  @click="saveStep3"
                />
              </div>
            </div>
          </q-step>

          <!-- Step 4: Invoice defaults & logo -->
          <q-step :name="4" title="Invoice defaults & logo" icon="tune">
            <div class="setup-step-body" data-testid="setup-step-4">
              <div class="setup-step-body__row">
                <div class="auth-field">
                  <label class="field-label" for="setup-payment-terms">
                    Default payment terms
                  </label>
                  <q-select
                    for="setup-payment-terms"
                    v-model="settingsDraft.defaultPaymentTermsDays"
                    :options="paymentTermsSelectOptions"
                    emit-value
                    map-options
                    :disable="savingStep"
                    :error="Boolean(fieldErrors.defaultPaymentTermsDays)"
                    :error-message="fieldErrors.defaultPaymentTermsDays"
                    data-testid="setup-payment-terms"
                  />
                </div>

                <div class="auth-field">
                  <label class="field-label" for="setup-timezone">Time zone</label>
                  <q-select
                    for="setup-timezone"
                    v-model="settingsDraft.timeZone"
                    :options="timeZoneOptions"
                    emit-value
                    map-options
                    :disable="savingStep"
                    :error="Boolean(fieldErrors.timeZone)"
                    :error-message="fieldErrors.timeZone"
                    data-testid="setup-timezone"
                  />
                </div>
              </div>

              <div class="setup-step-body__divider" />

              <div class="logo-upload-block">
                <div class="logo-upload-block__preview">
                  <img
                    v-if="logoPreviewUrl || businessStore.logoUrl"
                    :src="logoPreviewUrl || businessStore.logoUrl || ''"
                    alt="Business logo preview"
                    class="logo-upload-block__img"
                  />
                  <span v-else class="logo-upload-block__initials">
                    {{ businessStore.businessInitials }}
                  </span>
                </div>

                <div class="logo-upload-block__controls">
                  <label class="field-label" for="setup-logo-input">
                    Business logo <span class="field-optional">(optional)</span>
                  </label>
                  <input
                    id="setup-logo-input"
                    type="file"
                    accept="image/png,image/jpeg"
                    :disabled="savingStep"
                    class="logo-upload-block__file-input"
                    data-testid="setup-logo-input"
                    @change="onLogoFileSelected"
                  />
                  <span class="field-helper">PNG or JPEG up to 1 MB.</span>
                  <span v-if="logoFileError" class="logo-upload-block__error">
                    {{ logoFileError }}
                  </span>
                </div>
              </div>

              <div class="setup-step-actions">
                <div class="setup-step-actions__left">
                  <q-btn flat label="Back" :disable="savingStep" @click="currentStep = 3" />
                  <button type="button" class="setup-step-actions__skip" @click="finishLater">
                    Finish later
                  </button>
                </div>
                <q-btn
                  color="primary"
                  label="Finish"
                  :loading="savingStep"
                  :disable="savingStep || Boolean(logoFileError)"
                  data-testid="setup-finish-btn"
                  @click="saveStep4AndFinish"
                />
              </div>
            </div>
          </q-step>
        </q-stepper>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useSessionStore } from 'src/features/auth/store'
import BankDetailsFields from 'src/features/business/components/BankDetailsFields.vue'
import ConflictReloadBanner from 'src/features/business/components/ConflictReloadBanner.vue'
import PostalAddressFields from 'src/features/business/components/PostalAddressFields.vue'
import { markSetupSeenThisSession, useBusinessStore } from 'src/features/business/store'
import {
  validateAddressDraft,
  validateBankDraft,
  validateBusinessIdentity,
  validateContactDraft,
  validateLogoFile,
  validateSettingsDraft,
  type AddressDraft,
  type BankDraft,
  type BusinessIdentityDraft,
  type ContactDraft,
} from 'src/features/business/validation'
import { mapProblemDetails } from 'src/shared/api/problem'

const STEP_1_DONE_SESSION_KEY = 'invoice_tracker.setup_step1_done'

const $q = useQuasar()
const router = useRouter()
const sessionStore = useSessionStore()
const businessStore = useBusinessStore()

const currentStep = ref(1)
const savingStep = ref(false)
const reloadingConflict = ref(false)
const stepBannerError = ref('')
const fieldErrors = reactive<Record<string, string>>({})

const selectedLogoFile = ref<File | null>(null)
const logoPreviewUrl = ref<string | null>(null)
const logoFileError = ref<string | null>(null)

const identityDraft = reactive<BusinessIdentityDraft>({
  name: '',
  registrationNumber: '',
  vatNumber: '',
})

const contactDraft = reactive<ContactDraft>({
  supportEmail: '',
  contactNumber: '',
  contactType: 'Mobile',
})

const addressDraft = ref<AddressDraft>({
  line1: '',
  line2: '',
  suburb: '',
  city: '',
  postalCode: '',
})

const bankDraft = ref<BankDraft>({
  bankName: '',
  accountHolder: '',
  accountNumber: '',
  accountType: 'Cheque',
  branchCode: '',
  branchName: '',
})

const settingsDraft = reactive({
  defaultPaymentTermsDays: 30,
  timeZone: 'Africa/Johannesburg',
})

const businessDisplayName = computed(
  () => identityDraft.name.trim() || businessStore.profile?.name || 'your business',
)

const contactNumberTypeOptions = computed(
  () =>
    businessStore.lookups?.contactNumberTypes ?? [
      { value: 'Mobile', label: 'Mobile' },
      { value: 'Landline', label: 'Landline' },
      { value: 'Work', label: 'Work' },
    ],
)

const bankOptions = computed(() => businessStore.lookups?.banks ?? [])

const bankAccountTypeOptions = computed(
  () =>
    businessStore.lookups?.bankAccountTypes ?? [
      { value: 'Cheque', label: 'Cheque' },
      { value: 'Savings', label: 'Savings' },
      { value: 'Transmission', label: 'Transmission' },
    ],
)

const timeZoneOptions = computed(
  () =>
    businessStore.lookups?.timeZones ?? [
      { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg (SAST)' },
    ],
)

const paymentTermsSelectOptions = computed(() => {
  const base = (
    businessStore.lookups?.paymentTerms ?? [
      { days: 0, label: 'Due on receipt' },
      { days: 7, label: '7 days' },
      { days: 14, label: '14 days' },
      { days: 30, label: '30 days' },
      { days: 60, label: '60 days' },
      { days: 90, label: '90 days' },
    ]
  ).map((item) => ({
    value: item.days,
    label: item.label,
  }))

  const currentDays = settingsDraft.defaultPaymentTermsDays
  if (!base.some((opt) => opt.value === currentDays)) {
    base.push({ value: currentDays, label: `${currentDays} days` })
  }
  return base
})

function populateFromStore() {
  const p = businessStore.profile
  if (p) {
    identityDraft.name = p.name ?? ''
    identityDraft.registrationNumber = p.registrationNumber ?? ''
    identityDraft.vatNumber = p.vatNumber ?? ''

    contactDraft.supportEmail = p.supportEmail || sessionStore.email || ''
    contactDraft.contactNumber = p.contactNumber?.number ?? ''
    contactDraft.contactType = p.contactNumber?.type ?? 'Mobile'

    addressDraft.value = {
      line1: p.address?.line1 ?? '',
      line2: p.address?.line2 ?? '',
      suburb: p.address?.suburb ?? '',
      city: p.address?.city ?? '',
      postalCode: p.address?.postalCode ?? '',
    }

    bankDraft.value = {
      bankName: p.bankDetails?.bankName ?? '',
      accountHolder: p.bankDetails?.accountHolder || p.name || '',
      accountNumber: p.bankDetails?.accountNumber ?? '',
      accountType: p.bankDetails?.accountType ?? 'Cheque',
      branchCode: p.bankDetails?.branchCode ?? '',
      branchName: p.bankDetails?.branchName ?? '',
    }
  }

  const s = businessStore.settings
  if (s) {
    settingsDraft.defaultPaymentTermsDays = s.defaultPaymentTermsDays
    settingsDraft.timeZone = s.timeZone
  } else if (businessStore.lookups) {
    settingsDraft.defaultPaymentTermsDays = businessStore.lookups.defaultPaymentTermsDays
    settingsDraft.timeZone = businessStore.lookups.defaultTimeZone
  }
}

function determineResumeStep(): number {
  const p = businessStore.profile
  if (!p) return 1

  const hasContactAndAddress = Boolean(p.supportEmail && p.contactNumber && p.address)
  const hasBank = Boolean(p.bankDetails)

  let step1Saved = Boolean(p.registrationNumber || p.vatNumber)
  try {
    if (sessionStorage.getItem(STEP_1_DONE_SESSION_KEY) === '1') {
      step1Saved = true
    }
  } catch {
    // Ignore storage error
  }

  if (!hasContactAndAddress) {
    return step1Saved ? 2 : 1
  }
  if (!hasBank) {
    return 3
  }
  return 4
}

function clearErrors() {
  stepBannerError.value = ''
  for (const key of Object.keys(fieldErrors)) {
    delete fieldErrors[key]
  }
}

function applyServerErrors(err: unknown, knownFields: readonly string[]) {
  const mapped = mapProblemDetails(err, { knownFields })
  for (const [field, messages] of Object.entries(mapped.fieldErrors)) {
    if (messages[0]) {
      fieldErrors[field] = messages[0]
    }
  }
  if (mapped.title && !businessStore.hasConflict) {
    stepBannerError.value = mapped.title
  }
}

async function saveStep1() {
  clearErrors()
  const errors = validateBusinessIdentity(identityDraft)
  if (Object.keys(errors).length > 0) {
    Object.assign(fieldErrors, errors)
    return
  }

  savingStep.value = true
  try {
    await businessStore.saveDetails({
      name: identityDraft.name.trim(),
      registrationNumber: identityDraft.registrationNumber.trim() || null,
      vatNumber: identityDraft.vatNumber.trim() || null,
    })
    try {
      sessionStorage.setItem(STEP_1_DONE_SESSION_KEY, '1')
    } catch {
      // Ignore
    }
    if (!bankDraft.value.accountHolder.trim()) {
      bankDraft.value.accountHolder = identityDraft.name.trim()
    }
    currentStep.value = 2
  } catch (err) {
    applyServerErrors(err, ['name', 'registrationNumber', 'vatNumber'])
  } finally {
    savingStep.value = false
  }
}

async function saveStep2() {
  clearErrors()
  const contactErrors = validateContactDraft(contactDraft, true)
  const addrErrors = validateAddressDraft(addressDraft.value, true)
  const combined = { ...contactErrors, ...addrErrors }

  if (Object.keys(combined).length > 0) {
    Object.assign(fieldErrors, combined)
    return
  }

  savingStep.value = true
  try {
    const a = addressDraft.value
    await businessStore.saveDetails({
      supportEmail: contactDraft.supportEmail.trim(),
      contactNumber: {
        number: contactDraft.contactNumber.trim(),
        type: contactDraft.contactType,
      },
      address: {
        line1: a.line1.trim(),
        line2: a.line2.trim() || null,
        suburb: a.suburb.trim(),
        city: a.city.trim(),
        postalCode: a.postalCode.trim(),
      },
    })
    currentStep.value = 3
  } catch (err) {
    applyServerErrors(err, [
      'supportEmail',
      'contactNumber.number',
      'contactNumber.type',
      'address.line1',
      'address.line2',
      'address.suburb',
      'address.city',
      'address.postalCode',
    ])
  } finally {
    savingStep.value = false
  }
}

async function saveStep3() {
  clearErrors()
  const bankErrors = validateBankDraft(bankDraft.value, true)
  if (Object.keys(bankErrors).length > 0) {
    Object.assign(fieldErrors, bankErrors)
    return
  }

  savingStep.value = true
  try {
    const b = bankDraft.value
    await businessStore.saveDetails({
      bankDetails: {
        bankName: b.bankName.trim(),
        accountHolder: b.accountHolder.trim(),
        accountNumber: b.accountNumber.trim(),
        accountType: b.accountType,
        branchCode: b.branchCode.trim(),
        branchName: b.branchName.trim() || null,
      },
    })
    currentStep.value = 4
  } catch (err) {
    applyServerErrors(err, [
      'bankDetails.bankName',
      'bankDetails.accountHolder',
      'bankDetails.accountNumber',
      'bankDetails.accountType',
      'bankDetails.branchCode',
      'bankDetails.branchName',
    ])
  } finally {
    savingStep.value = false
  }
}

function onLogoFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  logoFileError.value = null

  if (logoPreviewUrl.value) {
    try {
      URL.revokeObjectURL(logoPreviewUrl.value)
    } catch {
      // Ignore
    }
    logoPreviewUrl.value = null
  }

  if (!file) {
    selectedLogoFile.value = null
    return
  }

  const validationError = validateLogoFile(file)
  if (validationError) {
    logoFileError.value = validationError
    selectedLogoFile.value = null
    return
  }

  selectedLogoFile.value = file
  try {
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      logoPreviewUrl.value = URL.createObjectURL(file)
    }
  } catch {
    // Ignore
  }
}

async function saveStep4AndFinish() {
  clearErrors()
  const allowedTz = timeZoneOptions.value.map((t) => t.value)
  const settingsErrors = validateSettingsDraft(
    settingsDraft.defaultPaymentTermsDays,
    settingsDraft.timeZone,
    allowedTz,
  )
  if (Object.keys(settingsErrors).length > 0) {
    Object.assign(fieldErrors, settingsErrors)
    return
  }

  if (selectedLogoFile.value) {
    const fileErr = validateLogoFile(selectedLogoFile.value)
    if (fileErr) {
      logoFileError.value = fileErr
      return
    }
  }

  savingStep.value = true
  try {
    await businessStore.saveSettings({
      defaultPaymentTermsDays: settingsDraft.defaultPaymentTermsDays,
      timeZone: settingsDraft.timeZone,
    })

    if (selectedLogoFile.value) {
      await businessStore.uploadLogo(selectedLogoFile.value)
    }

    markSetupSeenThisSession()
    $q.notify({
      type: 'positive',
      message: 'Business profile setup complete.',
    })
    await router.replace('/dashboard')
  } catch (err) {
    applyServerErrors(err, ['defaultPaymentTermsDays', 'timeZone'])
  } finally {
    savingStep.value = false
  }
}

async function handleReloadConflict() {
  reloadingConflict.value = true
  try {
    await businessStore.reloadProfileAndSettings()
    populateFromStore()
    clearErrors()
  } finally {
    reloadingConflict.value = false
  }
}

async function finishLater() {
  markSetupSeenThisSession()
  await router.push('/dashboard')
}

onMounted(async () => {
  markSetupSeenThisSession()
  if (businessStore.status === 'idle') {
    await businessStore.loadProfile()
  }
  populateFromStore()
  currentStep.value = determineResumeStep()
})

onBeforeUnmount(() => {
  if (logoPreviewUrl.value) {
    try {
      URL.revokeObjectURL(logoPreviewUrl.value)
    } catch {
      // Ignore
    }
  }
})
</script>

<style scoped lang="scss">
.setup-page {
  min-height: 100vh;
  background: var(--bg-canvas);
  padding: 24px 16px 48px;
  display: flex;
  justify-content: center;

  &__container {
    width: 100%;
    max-width: 640px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__finish-later {
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    padding: 4px 8px;

    &:hover {
      color: var(--text-primary);
      text-decoration: underline;
    }
  }
}

.setup-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;

  &__mark {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: var(--text-primary);
    color: var(--bg-surface);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__monogram {
    font-size: 11.5px;
    font-weight: 700;
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.setup-card {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  @media (max-width: 599px) {
    padding: 16px;
  }

  &__header {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__subtitle {
    margin: 0;
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.45;
  }
}

.setup-error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--pill-overdue-bg);
  color: var(--pill-overdue-text);
  border: 1px solid var(--pill-overdue-border);
  font-size: 12.5px;
}

.setup-stepper {
  background: transparent !important;

  :deep(.q-stepper__header) {
    border-bottom: 1px solid var(--border-hairline);
  }

  :deep(.q-stepper__step-inner) {
    padding: 16px 0 0;
  }
}

.setup-step-body {
  display: flex;
  flex-direction: column;
  gap: 14px;

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

  &__divider {
    height: 1px;
    background: var(--border-hairline);
    margin: 4px 0;
  }
}

.setup-step-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid var(--border-hairline);
  margin-top: 4px;

  &__left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__skip {
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;

    &:hover {
      color: var(--text-primary);
      text-decoration: underline;
    }
  }
}

.logo-upload-block {
  display: flex;
  align-items: center;
  gap: 16px;

  &__preview {
    width: 56px;
    height: 56px;
    border-radius: 8px;
    border: 1px solid var(--border-hairline);
    background: var(--bg-surface-subtle);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex-shrink: 0;
  }

  &__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__initials {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  &__controls {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__file-input {
    font-size: 12.5px;
    color: var(--text-primary);
  }

  &__error {
    font-size: 12px;
    color: var(--pill-overdue-text);
  }
}

.field-optional {
  font-weight: 400;
  color: var(--text-muted);
}
</style>
