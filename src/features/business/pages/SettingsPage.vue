<template>
  <q-page class="settings-page">
    <!-- Top Header & Banners -->
    <div class="settings-page__header">
      <div>
        <h1 class="text-heading-lg">Settings</h1>
        <p class="settings-page__subtitle">
          Manage your business profile, South African VAT registration, banking details and invoice
          defaults.
        </p>
      </div>
    </div>

    <!-- Staff Read-Only Note -->
    <div
      v-if="!isOwner"
      role="status"
      class="settings-readonly-note"
      data-testid="settings-readonly-note"
    >
      <q-icon name="lock_outline" size="16px" />
      <span>Only the business owner can change these settings.</span>
    </div>

    <!-- 409 Conflict Banner -->
    <ConflictReloadBanner
      :visible="businessStore.hasConflict"
      :reloading="reloadingConflict"
      @reload="handleReloadConflict"
    />

    <!-- Mobile Section Tabs (< md) -->
    <q-tabs
      v-if="$q.screen.lt.md"
      v-model="activeSection"
      dense
      no-caps
      align="left"
      active-color="primary"
      indicator-color="primary"
      class="settings-mobile-tabs"
      @update:model-value="scrollToSection(String($event))"
    >
      <q-tab v-for="sec in sections" :key="sec.id" :name="sec.id" :label="sec.label" />
    </q-tabs>

    <div class="settings-page__layout">
      <!-- Desktop Left Section Nav (md+) -->
      <aside v-if="$q.screen.gt.sm" class="settings-nav" aria-label="Settings sections">
        <button
          v-for="sec in sections"
          :key="sec.id"
          type="button"
          class="settings-nav__item"
          :class="{ 'settings-nav__item--active': activeSection === sec.id }"
          @click="scrollToSection(sec.id)"
        >
          <q-icon :name="sec.icon" size="17px" />
          <span>{{ sec.label }}</span>
        </button>
      </aside>

      <!-- Cards Column -->
      <div class="settings-page__cards">
        <!-- 1. Business Card -->
        <section id="section-business" class="attio-card settings-card">
          <div class="settings-card__header">
            <div>
              <h2 class="text-heading-md">Business</h2>
              <p class="settings-card__helper">
                Legal trading name, CIPC registration number and SARS VAT number.
              </p>
            </div>
          </div>

          <div v-if="cardBanners.business" role="alert" class="settings-card__banner">
            {{ cardBanners.business }}
          </div>

          <div class="settings-card__body">
            <div class="auth-field">
              <label class="field-label" for="settings-name">Business name</label>
              <q-input
                id="settings-name"
                v-model="businessDraft.name"
                type="text"
                maxlength="200"
                :disable="!isOwner || savingCard.business"
                :error="Boolean(businessErrors.name)"
                :error-message="businessErrors.name"
                data-testid="settings-name"
              />
            </div>

            <div class="settings-card__row">
              <div class="auth-field">
                <label class="field-label" for="settings-reg">
                  Registration number <span class="field-optional">(optional)</span>
                </label>
                <q-input
                  id="settings-reg"
                  v-model="businessDraft.registrationNumber"
                  type="text"
                  placeholder="2019/123456/07"
                  :disable="!isOwner || savingCard.business"
                  :error="Boolean(businessErrors.registrationNumber)"
                  :error-message="businessErrors.registrationNumber"
                  data-testid="settings-registration-number"
                />
              </div>

              <div class="auth-field">
                <label class="field-label" for="settings-vat">
                  VAT number <span class="field-optional">(optional)</span>
                </label>
                <q-input
                  id="settings-vat"
                  v-model="businessDraft.vatNumber"
                  type="text"
                  inputmode="numeric"
                  maxlength="10"
                  placeholder="4123456789"
                  :disable="!isOwner || savingCard.business"
                  :error="Boolean(businessErrors.vatNumber)"
                  :error-message="businessErrors.vatNumber"
                  data-testid="settings-vat-number"
                />
              </div>
            </div>
          </div>

          <div v-if="isOwner" class="settings-card__footer">
            <q-btn
              flat
              label="Cancel"
              :disable="!isBusinessDirty || savingCard.business"
              data-testid="settings-business-cancel"
              @click="resetBusinessCard"
            />
            <q-btn
              color="primary"
              label="Save"
              :loading="savingCard.business"
              :disable="!isBusinessDirty || !isBusinessValid || savingCard.business"
              data-testid="settings-business-save"
              @click="saveBusinessCard"
            />
          </div>
        </section>

        <!-- 2. Contact Card -->
        <section id="section-contact" class="attio-card settings-card">
          <div class="settings-card__header">
            <div>
              <h2 class="text-heading-md">Contact</h2>
              <p class="settings-card__helper">
                Support email and primary telephone number printed on invoices.
              </p>
            </div>
          </div>

          <div v-if="cardBanners.contact" role="alert" class="settings-card__banner">
            {{ cardBanners.contact }}
          </div>

          <div class="settings-card__body">
            <div class="settings-card__row">
              <div class="auth-field">
                <label class="field-label" for="settings-support-email"> Support email </label>
                <q-input
                  id="settings-support-email"
                  v-model="contactDraft.supportEmail"
                  type="email"
                  maxlength="256"
                  placeholder="accounts@company.co.za"
                  :disable="!isOwner || savingCard.contact"
                  :error="Boolean(contactErrors.supportEmail)"
                  :error-message="contactErrors.supportEmail"
                  data-testid="settings-support-email"
                />
              </div>

              <div class="settings-card__phone-grid">
                <div class="auth-field">
                  <label class="field-label" for="settings-contact-type">Type</label>
                  <q-select
                    for="settings-contact-type"
                    v-model="contactDraft.contactType"
                    :options="contactNumberTypeOptions"
                    emit-value
                    map-options
                    :disable="!isOwner || savingCard.contact"
                    :error="Boolean(contactErrors['contactNumber.type'])"
                    :error-message="contactErrors['contactNumber.type']"
                    data-testid="settings-contact-type"
                  />
                </div>

                <div class="auth-field">
                  <label class="field-label" for="settings-contact-number"> Contact number </label>
                  <q-input
                    id="settings-contact-number"
                    v-model="contactDraft.contactNumber"
                    type="tel"
                    placeholder="+27821234567"
                    :disable="!isOwner || savingCard.contact"
                    :error="Boolean(contactErrors['contactNumber.number'])"
                    :error-message="contactErrors['contactNumber.number']"
                    data-testid="settings-contact-number"
                  />
                </div>
              </div>
            </div>
          </div>

          <div v-if="isOwner" class="settings-card__footer">
            <q-btn
              flat
              label="Cancel"
              :disable="!isContactDirty || savingCard.contact"
              data-testid="settings-contact-cancel"
              @click="resetContactCard"
            />
            <q-btn
              color="primary"
              label="Save"
              :loading="savingCard.contact"
              :disable="!isContactDirty || !isContactValid || savingCard.contact"
              data-testid="settings-contact-save"
              @click="saveContactCard"
            />
          </div>
        </section>

        <!-- 3. Address Card -->
        <section id="section-address" class="attio-card settings-card">
          <div class="settings-card__header">
            <div>
              <h2 class="text-heading-md">Address</h2>
              <p class="settings-card__helper">
                Physical or postal business address shown on tax invoices.
              </p>
            </div>
            <q-btn
              v-if="isOwner && businessStore.profile?.address"
              flat
              dense
              color="negative"
              label="Remove address"
              :disable="savingCard.address"
              data-testid="settings-remove-address"
              @click="confirmRemoveAddress"
            />
          </div>

          <div v-if="cardBanners.address" role="alert" class="settings-card__banner">
            {{ cardBanners.address }}
          </div>

          <div class="settings-card__body">
            <PostalAddressFields
              v-model="addressDraft"
              :errors="addressErrors"
              :disable="!isOwner || savingCard.address"
              id-prefix="settings-addr"
              @postal-error="postalLookupError = $event"
            />
          </div>

          <div v-if="isOwner" class="settings-card__footer">
            <q-btn
              flat
              label="Cancel"
              :disable="!isAddressDirty || savingCard.address"
              data-testid="settings-address-cancel"
              @click="resetAddressCard"
            />
            <q-btn
              color="primary"
              label="Save"
              :loading="savingCard.address"
              :disable="!isAddressDirty || !isAddressValid || savingCard.address"
              data-testid="settings-address-save"
              @click="saveAddressCard"
            />
          </div>
        </section>

        <!-- 4. Banking Card -->
        <section id="section-banking" class="attio-card settings-card">
          <div class="settings-card__header">
            <div>
              <h2 class="text-heading-md">Banking</h2>
              <p class="settings-card__helper">
                South African bank account details for customer EFT payments.
              </p>
            </div>
            <q-btn
              v-if="isOwner && businessStore.profile?.bankDetails"
              flat
              dense
              color="negative"
              label="Remove bank details"
              :disable="savingCard.banking"
              data-testid="settings-remove-banking"
              @click="confirmRemoveBankDetails"
            />
          </div>

          <div v-if="cardBanners.banking" role="alert" class="settings-card__banner">
            {{ cardBanners.banking }}
          </div>

          <div class="settings-card__body">
            <BankDetailsFields
              v-model="bankDraft"
              :banks="bankOptions"
              :account-types="bankAccountTypeOptions"
              :errors="bankingErrors"
              :disable="!isOwner || savingCard.banking"
              id-prefix="settings-bank"
            />
          </div>

          <div v-if="isOwner" class="settings-card__footer">
            <q-btn
              flat
              label="Cancel"
              :disable="!isBankingDirty || savingCard.banking"
              data-testid="settings-banking-cancel"
              @click="resetBankingCard"
            />
            <q-btn
              color="primary"
              label="Save"
              :loading="savingCard.banking"
              :disable="!isBankingDirty || !isBankingValid || savingCard.banking"
              data-testid="settings-banking-save"
              @click="saveBankingCard"
            />
          </div>
        </section>

        <!-- 5. Invoice Defaults Card -->
        <section id="section-defaults" class="attio-card settings-card">
          <div class="settings-card__header">
            <div>
              <h2 class="text-heading-md">Invoice defaults</h2>
              <p class="settings-card__helper">
                Default payment terms and business time zone used for due-date and overdue
                calculations.
              </p>
            </div>
          </div>

          <div v-if="cardBanners.defaults" role="alert" class="settings-card__banner">
            {{ cardBanners.defaults }}
          </div>

          <div class="settings-card__body">
            <div class="settings-card__row">
              <div class="auth-field">
                <label class="field-label" for="settings-payment-terms">
                  Default payment terms
                </label>
                <q-select
                  for="settings-payment-terms"
                  v-model="defaultsDraft.defaultPaymentTermsDays"
                  :options="paymentTermsSelectOptions"
                  emit-value
                  map-options
                  :disable="!isOwner || savingCard.defaults"
                  :error="Boolean(defaultsErrors.defaultPaymentTermsDays)"
                  :error-message="defaultsErrors.defaultPaymentTermsDays"
                  data-testid="settings-payment-terms"
                />
              </div>

              <div class="auth-field">
                <label class="field-label" for="settings-timezone">Time zone</label>
                <q-select
                  for="settings-timezone"
                  v-model="defaultsDraft.timeZone"
                  :options="timeZoneOptions"
                  emit-value
                  map-options
                  :disable="!isOwner || savingCard.defaults"
                  :error="Boolean(defaultsErrors.timeZone)"
                  :error-message="defaultsErrors.timeZone"
                  data-testid="settings-timezone"
                />
              </div>
            </div>
          </div>

          <div v-if="isOwner" class="settings-card__footer">
            <q-btn
              flat
              label="Cancel"
              :disable="!isDefaultsDirty || savingCard.defaults"
              data-testid="settings-defaults-cancel"
              @click="resetDefaultsCard"
            />
            <q-btn
              color="primary"
              label="Save"
              :loading="savingCard.defaults"
              :disable="!isDefaultsDirty || !isDefaultsValid || savingCard.defaults"
              data-testid="settings-defaults-save"
              @click="saveDefaultsCard"
            />
          </div>
        </section>

        <!-- 6. Logo Card -->
        <section id="section-logo" class="attio-card settings-card">
          <div class="settings-card__header">
            <div>
              <h2 class="text-heading-md">Logo</h2>
              <p class="settings-card__helper">
                Displayed in the workspace sidebar and on PDF tax invoices.
              </p>
            </div>
          </div>

          <div v-if="cardBanners.logo" role="alert" class="settings-card__banner">
            {{ cardBanners.logo }}
          </div>

          <div class="settings-card__body">
            <div class="logo-card-body">
              <div class="logo-card-body__preview">
                <img
                  v-if="pendingLogoPreviewUrl || businessStore.logoUrl"
                  :src="pendingLogoPreviewUrl || businessStore.logoUrl || ''"
                  alt="Business logo"
                  class="logo-card-body__img"
                />
                <span v-else class="logo-card-body__initials">
                  {{ businessStore.businessInitials }}
                </span>
              </div>

              <div v-if="isOwner" class="logo-card-body__controls">
                <label class="field-label" for="settings-logo-file"> Upload or replace logo </label>
                <input
                  id="settings-logo-file"
                  ref="logoFileInputRef"
                  type="file"
                  accept="image/png,image/jpeg"
                  :disabled="savingCard.logo"
                  data-testid="settings-logo-input"
                  @change="onLogoFilePicked"
                />
                <span class="field-helper">PNG or JPEG, maximum 1 MB.</span>
                <span v-if="logoValidationError" class="logo-card-body__error">
                  {{ logoValidationError }}
                </span>
              </div>
            </div>
          </div>

          <div v-if="isOwner" class="settings-card__footer">
            <q-btn
              flat
              label="Cancel"
              :disable="!pendingLogoFile || savingCard.logo"
              data-testid="settings-logo-cancel"
              @click="resetLogoCard"
            />
            <q-btn
              color="primary"
              label="Save"
              :loading="savingCard.logo"
              :disable="!pendingLogoFile || Boolean(logoValidationError) || savingCard.logo"
              data-testid="settings-logo-save"
              @click="saveLogoCard"
            />
          </div>
        </section>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useQuasar } from 'quasar'
import { useSessionStore } from 'src/features/auth/store'
import BankDetailsFields from 'src/features/business/components/BankDetailsFields.vue'
import ConflictReloadBanner from 'src/features/business/components/ConflictReloadBanner.vue'
import PostalAddressFields from 'src/features/business/components/PostalAddressFields.vue'
import { useBusinessStore } from 'src/features/business/store'
import {
  isAddressDraftStarted,
  isBankDraftStarted,
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

const $q = useQuasar()
const sessionStore = useSessionStore()
const businessStore = useBusinessStore()

const isOwner = computed(() => sessionStore.isOwner)
const activeSection = ref('business')
const reloadingConflict = ref(false)

const sections = [
  { id: 'business', label: 'Business', icon: 'business' },
  { id: 'contact', label: 'Contact', icon: 'mail_outline' },
  { id: 'address', label: 'Address', icon: 'place' },
  { id: 'banking', label: 'Banking', icon: 'account_balance' },
  { id: 'defaults', label: 'Invoice defaults', icon: 'tune' },
  { id: 'logo', label: 'Logo', icon: 'image' },
]

const savingCard = reactive({
  business: false,
  contact: false,
  address: false,
  banking: false,
  defaults: false,
  logo: false,
})

const cardBanners = reactive({
  business: '',
  contact: '',
  address: '',
  banking: '',
  defaults: '',
  logo: '',
})

const businessDraft = reactive<BusinessIdentityDraft>({
  name: '',
  registrationNumber: '',
  vatNumber: '',
})
const businessServerErrors = reactive<Record<string, string>>({})

const contactDraft = reactive<ContactDraft>({
  supportEmail: '',
  contactNumber: '',
  contactType: 'Mobile',
})
const contactServerErrors = reactive<Record<string, string>>({})

const addressDraft = ref<AddressDraft>({
  line1: '',
  line2: '',
  suburb: '',
  city: '',
  postalCode: '',
})
const addressServerErrors = reactive<Record<string, string>>({})
const postalLookupError = ref<string | undefined>(undefined)

const bankDraft = ref<BankDraft>({
  bankName: '',
  accountHolder: '',
  accountNumber: '',
  accountType: 'Cheque',
  branchCode: '',
  branchName: '',
})
const bankingServerErrors = reactive<Record<string, string>>({})

const defaultsDraft = reactive({
  defaultPaymentTermsDays: 30,
  timeZone: 'Africa/Johannesburg',
})
const defaultsServerErrors = reactive<Record<string, string>>({})

const logoFileInputRef = ref<HTMLInputElement | null>(null)
const pendingLogoFile = ref<File | null>(null)
const pendingLogoPreviewUrl = ref<string | null>(null)
const logoValidationError = ref<string | null>(null)

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
  ).map((t) => ({
    value: t.days,
    label: t.label,
  }))

  const storedOrCurrentDays = defaultsDraft.defaultPaymentTermsDays
  if (!base.some((opt) => opt.value === storedOrCurrentDays)) {
    base.push({
      value: storedOrCurrentDays,
      label: `${storedOrCurrentDays} days`,
    })
  }
  return base
})

// Dirty checks per card
const isBusinessDirty = computed(() => {
  const p = businessStore.profile
  if (!p) return false
  return (
    businessDraft.name.trim() !== (p.name ?? '') ||
    businessDraft.registrationNumber.trim() !== (p.registrationNumber ?? '') ||
    businessDraft.vatNumber.trim() !== (p.vatNumber ?? '')
  )
})

const isContactDirty = computed(() => {
  const p = businessStore.profile
  if (!p) return false
  return (
    contactDraft.supportEmail.trim() !== (p.supportEmail ?? '') ||
    contactDraft.contactNumber.trim() !== (p.contactNumber?.number ?? '') ||
    (contactDraft.contactNumber.trim() !== '' &&
      contactDraft.contactType !== (p.contactNumber?.type ?? 'Mobile'))
  )
})

const isAddressDirty = computed(() => {
  const p = businessStore.profile
  if (!p) return false
  const a = addressDraft.value
  return (
    a.line1.trim() !== (p.address?.line1 ?? '') ||
    a.line2.trim() !== (p.address?.line2 ?? '') ||
    a.suburb.trim() !== (p.address?.suburb ?? '') ||
    a.city.trim() !== (p.address?.city ?? '') ||
    a.postalCode.trim() !== (p.address?.postalCode ?? '')
  )
})

const isBankingDirty = computed(() => {
  const p = businessStore.profile
  if (!p) return false
  const b = bankDraft.value
  return (
    b.bankName.trim() !== (p.bankDetails?.bankName ?? '') ||
    b.accountHolder.trim() !== (p.bankDetails?.accountHolder ?? '') ||
    b.accountNumber.trim() !== (p.bankDetails?.accountNumber ?? '') ||
    b.accountType !== (p.bankDetails?.accountType ?? 'Cheque') ||
    b.branchCode.trim() !== (p.bankDetails?.branchCode ?? '') ||
    b.branchName.trim() !== (p.bankDetails?.branchName ?? '')
  )
})

const isDefaultsDirty = computed(() => {
  const s = businessStore.settings
  if (!s) return false
  return (
    defaultsDraft.defaultPaymentTermsDays !== s.defaultPaymentTermsDays ||
    defaultsDraft.timeZone !== s.timeZone
  )
})

const hasAnyUnsavedChanges = computed(
  () =>
    isBusinessDirty.value ||
    isContactDirty.value ||
    isAddressDirty.value ||
    isBankingDirty.value ||
    isDefaultsDirty.value ||
    Boolean(pendingLogoFile.value),
)

// Validation per card
const businessClientErrors = computed(() =>
  isBusinessDirty.value ? validateBusinessIdentity(businessDraft) : {},
)
const businessErrors = computed(() => ({
  ...businessClientErrors.value,
  ...businessServerErrors,
}))
const isBusinessValid = computed(
  () => Object.keys(validateBusinessIdentity(businessDraft)).length === 0,
)

const contactClientErrors = computed(() =>
  isContactDirty.value ? validateContactDraft(contactDraft, false) : {},
)
const contactErrors = computed(() => ({
  ...contactClientErrors.value,
  ...contactServerErrors,
}))
const isContactValid = computed(
  () => Object.keys(validateContactDraft(contactDraft, false)).length === 0,
)

const addressClientErrors = computed(() =>
  isAddressDirty.value ? validateAddressDraft(addressDraft.value, true) : {},
)
const addressErrors = computed(() => ({
  ...addressClientErrors.value,
  ...addressServerErrors,
}))
const isAddressValid = computed(
  () =>
    !postalLookupError.value &&
    isAddressDraftStarted(addressDraft.value) &&
    Object.keys(validateAddressDraft(addressDraft.value, true)).length === 0,
)

const bankingClientErrors = computed(() =>
  isBankingDirty.value ? validateBankDraft(bankDraft.value, true) : {},
)
const bankingErrors = computed(() => ({
  ...bankingClientErrors.value,
  ...bankingServerErrors,
}))
const isBankingValid = computed(
  () =>
    isBankDraftStarted(bankDraft.value) &&
    Object.keys(validateBankDraft(bankDraft.value, true)).length === 0,
)

const defaultsClientErrors = computed(() => {
  if (!isDefaultsDirty.value) return {}
  return validateSettingsDraft(
    defaultsDraft.defaultPaymentTermsDays,
    defaultsDraft.timeZone,
    timeZoneOptions.value.map((t) => t.value),
  )
})
const defaultsErrors = computed(() => ({
  ...defaultsClientErrors.value,
  ...defaultsServerErrors,
}))
const isDefaultsValid = computed(
  () =>
    Object.keys(
      validateSettingsDraft(
        defaultsDraft.defaultPaymentTermsDays,
        defaultsDraft.timeZone,
        timeZoneOptions.value.map((t) => t.value),
      ),
    ).length === 0,
)

function clearMap(target: Record<string, string>) {
  for (const key of Object.keys(target)) {
    delete target[key]
  }
}

function resetBusinessCard() {
  const p = businessStore.profile
  businessDraft.name = p?.name ?? ''
  businessDraft.registrationNumber = p?.registrationNumber ?? ''
  businessDraft.vatNumber = p?.vatNumber ?? ''
  clearMap(businessServerErrors)
  cardBanners.business = ''
}

function resetContactCard() {
  const p = businessStore.profile
  contactDraft.supportEmail = p?.supportEmail ?? ''
  contactDraft.contactNumber = p?.contactNumber?.number ?? ''
  contactDraft.contactType = p?.contactNumber?.type ?? 'Mobile'
  clearMap(contactServerErrors)
  cardBanners.contact = ''
}

function resetAddressCard() {
  const p = businessStore.profile
  addressDraft.value = {
    line1: p?.address?.line1 ?? '',
    line2: p?.address?.line2 ?? '',
    suburb: p?.address?.suburb ?? '',
    city: p?.address?.city ?? '',
    postalCode: p?.address?.postalCode ?? '',
  }
  postalLookupError.value = undefined
  clearMap(addressServerErrors)
  cardBanners.address = ''
}

function resetBankingCard() {
  const p = businessStore.profile
  bankDraft.value = {
    bankName: p?.bankDetails?.bankName ?? '',
    accountHolder: p?.bankDetails?.accountHolder ?? '',
    accountNumber: p?.bankDetails?.accountNumber ?? '',
    accountType: p?.bankDetails?.accountType ?? 'Cheque',
    branchCode: p?.bankDetails?.branchCode ?? '',
    branchName: p?.bankDetails?.branchName ?? '',
  }
  clearMap(bankingServerErrors)
  cardBanners.banking = ''
}

function resetDefaultsCard() {
  const s = businessStore.settings
  defaultsDraft.defaultPaymentTermsDays = s?.defaultPaymentTermsDays ?? 30
  defaultsDraft.timeZone = s?.timeZone ?? 'Africa/Johannesburg'
  clearMap(defaultsServerErrors)
  cardBanners.defaults = ''
}

function resetLogoCard() {
  if (pendingLogoPreviewUrl.value) {
    try {
      URL.revokeObjectURL(pendingLogoPreviewUrl.value)
    } catch {
      // Ignore
    }
    pendingLogoPreviewUrl.value = null
  }
  pendingLogoFile.value = null
  logoValidationError.value = null
  cardBanners.logo = ''
  if (logoFileInputRef.value) {
    logoFileInputRef.value.value = ''
  }
}

function resetAllCards() {
  resetBusinessCard()
  resetContactCard()
  resetAddressCard()
  resetBankingCard()
  resetDefaultsCard()
  resetLogoCard()
}

function populateCardErrors(
  err: unknown,
  knownFields: readonly string[],
  targetErrors: Record<string, string>,
  bannerKey: keyof typeof cardBanners,
) {
  const mapped = mapProblemDetails(err, { knownFields })
  for (const [k, msgs] of Object.entries(mapped.fieldErrors)) {
    if (msgs[0]) {
      targetErrors[k] = msgs[0]
    }
  }
  if (mapped.title && !businessStore.hasConflict) {
    cardBanners[bannerKey] = mapped.title
  }
}

async function saveBusinessCard() {
  clearMap(businessServerErrors)
  cardBanners.business = ''
  if (!isBusinessValid.value) return

  savingCard.business = true
  try {
    await businessStore.saveDetails({
      name: businessDraft.name.trim(),
      registrationNumber: businessDraft.registrationNumber.trim() || null,
      vatNumber: businessDraft.vatNumber.trim() || null,
    })
    resetBusinessCard()
    $q.notify({ type: 'positive', message: 'Business details saved.' })
  } catch (err) {
    populateCardErrors(
      err,
      ['name', 'registrationNumber', 'vatNumber'],
      businessServerErrors,
      'business',
    )
  } finally {
    savingCard.business = false
  }
}

async function saveContactCard() {
  clearMap(contactServerErrors)
  cardBanners.contact = ''
  if (!isContactValid.value) return

  savingCard.contact = true
  try {
    const email = contactDraft.supportEmail.trim()
    const phone = contactDraft.contactNumber.trim()
    await businessStore.saveDetails({
      supportEmail: email || null,
      contactNumber: phone ? { number: phone, type: contactDraft.contactType } : null,
    })
    resetContactCard()
    $q.notify({ type: 'positive', message: 'Contact details saved.' })
  } catch (err) {
    populateCardErrors(
      err,
      ['supportEmail', 'contactNumber.number', 'contactNumber.type'],
      contactServerErrors,
      'contact',
    )
  } finally {
    savingCard.contact = false
  }
}

async function saveAddressCard() {
  clearMap(addressServerErrors)
  cardBanners.address = ''
  if (!isAddressValid.value) return

  savingCard.address = true
  try {
    const a = addressDraft.value
    await businessStore.saveDetails({
      address: {
        line1: a.line1.trim(),
        line2: a.line2.trim() || null,
        suburb: a.suburb.trim(),
        city: a.city.trim(),
        postalCode: a.postalCode.trim(),
      },
    })
    resetAddressCard()
    $q.notify({ type: 'positive', message: 'Address saved.' })
  } catch (err) {
    populateCardErrors(
      err,
      ['address.line1', 'address.line2', 'address.suburb', 'address.city', 'address.postalCode'],
      addressServerErrors,
      'address',
    )
  } finally {
    savingCard.address = false
  }
}

async function confirmRemoveAddress() {
  if (!window.confirm('Remove the business address from your profile?')) {
    return
  }

  savingCard.address = true
  clearMap(addressServerErrors)
  cardBanners.address = ''
  try {
    await businessStore.saveDetails({ address: null })
    resetAddressCard()
    $q.notify({ type: 'positive', message: 'Address removed.' })
  } catch (err) {
    populateCardErrors(err, [], addressServerErrors, 'address')
  } finally {
    savingCard.address = false
  }
}

async function saveBankingCard() {
  clearMap(bankingServerErrors)
  cardBanners.banking = ''
  if (!isBankingValid.value) return

  savingCard.banking = true
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
    resetBankingCard()
    $q.notify({ type: 'positive', message: 'Banking details saved.' })
  } catch (err) {
    populateCardErrors(
      err,
      [
        'bankDetails.bankName',
        'bankDetails.accountHolder',
        'bankDetails.accountNumber',
        'bankDetails.accountType',
        'bankDetails.branchCode',
        'bankDetails.branchName',
      ],
      bankingServerErrors,
      'banking',
    )
  } finally {
    savingCard.banking = false
  }
}

async function confirmRemoveBankDetails() {
  if (!window.confirm('Remove the banking details from your profile?')) {
    return
  }

  savingCard.banking = true
  clearMap(bankingServerErrors)
  cardBanners.banking = ''
  try {
    await businessStore.saveDetails({ bankDetails: null })
    resetBankingCard()
    $q.notify({ type: 'positive', message: 'Banking details removed.' })
  } catch (err) {
    populateCardErrors(err, [], bankingServerErrors, 'banking')
  } finally {
    savingCard.banking = false
  }
}

async function saveDefaultsCard() {
  clearMap(defaultsServerErrors)
  cardBanners.defaults = ''
  if (!isDefaultsValid.value) return

  savingCard.defaults = true
  try {
    await businessStore.saveSettings({
      defaultPaymentTermsDays: defaultsDraft.defaultPaymentTermsDays,
      timeZone: defaultsDraft.timeZone,
    })
    resetDefaultsCard()
    $q.notify({ type: 'positive', message: 'Invoice defaults saved.' })
  } catch (err) {
    populateCardErrors(
      err,
      ['defaultPaymentTermsDays', 'timeZone'],
      defaultsServerErrors,
      'defaults',
    )
  } finally {
    savingCard.defaults = false
  }
}

function onLogoFilePicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  logoValidationError.value = null
  cardBanners.logo = ''

  if (pendingLogoPreviewUrl.value) {
    try {
      URL.revokeObjectURL(pendingLogoPreviewUrl.value)
    } catch {
      // Ignore
    }
    pendingLogoPreviewUrl.value = null
  }

  if (!file) {
    pendingLogoFile.value = null
    return
  }

  const err = validateLogoFile(file)
  if (err) {
    logoValidationError.value = err
    pendingLogoFile.value = null
    return
  }

  pendingLogoFile.value = file
  try {
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      pendingLogoPreviewUrl.value = URL.createObjectURL(file)
    }
  } catch {
    // Ignore
  }
}

async function saveLogoCard() {
  if (!pendingLogoFile.value || logoValidationError.value) return

  savingCard.logo = true
  cardBanners.logo = ''
  try {
    await businessStore.uploadLogo(pendingLogoFile.value)
    resetLogoCard()
    $q.notify({ type: 'positive', message: 'Business logo updated.' })
  } catch (err) {
    populateCardErrors(err, [], {}, 'logo')
  } finally {
    savingCard.logo = false
  }
}

async function handleReloadConflict() {
  reloadingConflict.value = true
  try {
    await businessStore.reloadProfileAndSettings()
    resetAllCards()
  } finally {
    reloadingConflict.value = false
  }
}

function scrollToSection(sectionId: string) {
  activeSection.value = sectionId
  const el = document.getElementById(`section-${sectionId}`)
  if (el && typeof el.scrollIntoView === 'function') {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

watch(
  () => businessStore.profile,
  (nextProfile, prevProfile) => {
    if (nextProfile && !prevProfile) {
      resetAllCards()
    }
  },
)

onBeforeRouteLeave(() => {
  if (hasAnyUnsavedChanges.value) {
    return window.confirm('You have unsaved changes. Leave this page and discard them?')
  }
  return true
})

onMounted(async () => {
  if (businessStore.status === 'idle') {
    await businessStore.loadProfile()
  }
  resetAllCards()
})

onBeforeUnmount(() => {
  if (pendingLogoPreviewUrl.value) {
    try {
      URL.revokeObjectURL(pendingLogoPreviewUrl.value)
    } catch {
      // Ignore
    }
  }
})
</script>

<style scoped lang="scss">
.settings-page {
  padding: 20px;
  max-width: 1120px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;

  @media (max-width: 599px) {
    padding: 12px;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__subtitle {
    margin: 4px 0 0;
    font-size: 13px;
    color: var(--text-secondary);
  }

  &__layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
    align-items: start;

    @media (min-width: 1024px) {
      grid-template-columns: 200px 1fr;
    }
  }

  &__cards {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
}

.settings-readonly-note {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 6px;
  background: var(--pill-sent-bg);
  color: var(--pill-sent-text);
  border: 1px solid var(--pill-sent-border);
  font-size: 13px;
}

.settings-mobile-tabs {
  border-bottom: 1px solid var(--border-hairline);
}

.settings-nav {
  position: sticky;
  top: 64px;
  display: flex;
  flex-direction: column;
  gap: 2px;

  &__item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    text-align: left;
    cursor: pointer;

    &:hover {
      background: var(--bg-surface-hover);
      color: var(--text-primary);
    }

    &--active {
      background: var(--bg-surface);
      border: 1px solid var(--border-hairline);
      color: var(--text-primary);
      font-weight: 600;
    }
  }
}

.settings-card {
  overflow: hidden;

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 20px 12px;
    border-bottom: 1px solid var(--border-hairline);
  }

  &__helper {
    margin: 2px 0 0;
    font-size: 12.5px;
    color: var(--text-secondary);
  }

  &__banner {
    margin: 12px 20px 0;
    padding: 8px 12px;
    border-radius: 6px;
    background: var(--pill-overdue-bg);
    color: var(--pill-overdue-text);
    border: 1px solid var(--pill-overdue-border);
    font-size: 12.5px;
  }

  &__body {
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
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

  &__footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 10px 20px;
    background: var(--bg-surface-subtle);
    border-top: 1px solid var(--border-hairline);
  }
}

.logo-card-body {
  display: flex;
  align-items: center;
  gap: 16px;

  &__preview {
    width: 64px;
    height: 64px;
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
    font-size: 18px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  &__controls {
    display: flex;
    flex-direction: column;
    gap: 4px;
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
