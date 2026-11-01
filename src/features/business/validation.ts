import type { BankAccountType, ContactNumberType } from './api'

const CIPC_REGEX = /^\d{4}\/\d{6}\/\d{2}$/
const VAT_REGEX = /^4\d{9}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const E164_PHONE_REGEX = /^\+[1-9]\d{7,14}$/
const POSTAL_CODE_REGEX = /^\d{4}$/
const ACCOUNT_NUMBER_REGEX = /^\d{6,16}$/
const BRANCH_CODE_REGEX = /^\d{6}$/

export const MAX_LOGO_SIZE_BYTES = 1024 * 1024 // 1 MB
export const ALLOWED_LOGO_MIME_TYPES = ['image/png', 'image/jpeg'] as const

export interface BusinessIdentityDraft {
  name: string
  registrationNumber: string
  vatNumber: string
}

export interface ContactDraft {
  supportEmail: string
  contactNumber: string
  contactType: ContactNumberType
}

export interface AddressDraft {
  line1: string
  line2: string
  suburb: string
  city: string
  postalCode: string
}

export interface BankDraft {
  bankName: string
  accountHolder: string
  accountNumber: string
  accountType: BankAccountType
  branchCode: string
  branchName: string
}

export function validateBusinessIdentity(
  draft: BusinessIdentityDraft,
): Record<string, string> {
  const errors: Record<string, string> = {}
  const name = draft.name.trim()
  const reg = draft.registrationNumber.trim()
  const vat = draft.vatNumber.trim()

  if (!name) {
    errors.name = 'Business name is required.'
  } else if (name.length > 200) {
    errors.name = 'Business name cannot exceed 200 characters.'
  }

  if (reg && !CIPC_REGEX.test(reg)) {
    errors.registrationNumber = 'Use CIPC format, e.g. 2019/123456/07.'
  }

  if (vat && !VAT_REGEX.test(vat)) {
    errors.vatNumber = 'VAT number must be 10 digits starting with 4.'
  }

  return errors
}

export function isContactDraftStarted(draft: ContactDraft): boolean {
  return Boolean(draft.supportEmail.trim() || draft.contactNumber.trim())
}

export function validateContactDraft(
  draft: ContactDraft,
  requireAll = false,
): Record<string, string> {
  const errors: Record<string, string> = {}
  const email = draft.supportEmail.trim()
  const phone = draft.contactNumber.trim()

  if (requireAll && !email) {
    errors.supportEmail = 'Support email is required.'
  } else if (email) {
    if (email.length > 256 || !EMAIL_REGEX.test(email)) {
      errors.supportEmail = 'Enter a valid support email address.'
    }
  }

  if (requireAll && !phone) {
    errors['contactNumber.number'] = 'Contact number is required (e.g. +27821234567).'
  } else if (phone) {
    if (!E164_PHONE_REGEX.test(phone)) {
      errors['contactNumber.number'] = 'Use international format, e.g. +27821234567.'
    }
    if (!draft.contactType) {
      errors['contactNumber.type'] = 'Select a contact number type.'
    }
  }

  return errors
}

export function isAddressDraftStarted(draft: AddressDraft): boolean {
  return Boolean(
    draft.line1.trim() ||
      draft.line2.trim() ||
      draft.suburb.trim() ||
      draft.city.trim() ||
      draft.postalCode.trim(),
  )
}

export function validateAddressDraft(
  draft: AddressDraft,
  requireAll = false,
): Record<string, string> {
  const errors: Record<string, string> = {}
  const started = isAddressDraftStarted(draft)
  if (!requireAll && !started) {
    return errors
  }

  const line1 = draft.line1.trim()
  const line2 = draft.line2.trim()
  const suburb = draft.suburb.trim()
  const city = draft.city.trim()
  const postalCode = draft.postalCode.trim()

  if (!line1) {
    errors['address.line1'] = 'Street address line 1 is required.'
  } else if (line1.length > 200) {
    errors['address.line1'] = 'Address line 1 cannot exceed 200 characters.'
  }

  if (line2.length > 200) {
    errors['address.line2'] = 'Address line 2 cannot exceed 200 characters.'
  }

  if (!postalCode) {
    errors['address.postalCode'] = 'Postal code is required.'
  } else if (!POSTAL_CODE_REGEX.test(postalCode)) {
    errors['address.postalCode'] = 'Postal code must be 4 digits.'
  }

  if (!suburb) {
    errors['address.suburb'] = 'Suburb is required.'
  } else if (suburb.length > 100) {
    errors['address.suburb'] = 'Suburb cannot exceed 100 characters.'
  }

  if (!city) {
    errors['address.city'] = 'City or town is required.'
  } else if (city.length > 100) {
    errors['address.city'] = 'City cannot exceed 100 characters.'
  }

  return errors
}

export function isBankDraftStarted(draft: BankDraft): boolean {
  return Boolean(
    draft.bankName.trim() ||
      draft.accountHolder.trim() ||
      draft.accountNumber.trim() ||
      draft.branchCode.trim() ||
      draft.branchName.trim(),
  )
}

export function validateBankDraft(
  draft: BankDraft,
  requireAll = false,
): Record<string, string> {
  const errors: Record<string, string> = {}
  const started = isBankDraftStarted(draft)
  if (!requireAll && !started) {
    return errors
  }

  const bankName = draft.bankName.trim()
  const accountHolder = draft.accountHolder.trim()
  const accountNumber = draft.accountNumber.trim()
  const branchCode = draft.branchCode.trim()
  const branchName = draft.branchName.trim()

  if (!bankName) {
    errors['bankDetails.bankName'] = 'Select a bank.'
  }

  if (!accountHolder) {
    errors['bankDetails.accountHolder'] = 'Account holder is required.'
  } else if (accountHolder.length > 200) {
    errors['bankDetails.accountHolder'] = 'Account holder cannot exceed 200 characters.'
  }

  if (!accountNumber) {
    errors['bankDetails.accountNumber'] = 'Account number is required.'
  } else if (!ACCOUNT_NUMBER_REGEX.test(accountNumber)) {
    errors['bankDetails.accountNumber'] = 'Account number must be 6 to 16 digits.'
  }

  if (!draft.accountType) {
    errors['bankDetails.accountType'] = 'Select an account type.'
  }

  if (!branchCode) {
    errors['bankDetails.branchCode'] = 'Branch code is required.'
  } else if (!BRANCH_CODE_REGEX.test(branchCode)) {
    errors['bankDetails.branchCode'] = 'Branch code must be 6 digits.'
  }

  if (branchName.length > 100) {
    errors['bankDetails.branchName'] = 'Branch name cannot exceed 100 characters.'
  }

  return errors
}

export function validateSettingsDraft(
  defaultPaymentTermsDays: number,
  timeZone: string,
  allowedTimeZones: readonly string[] = [],
): Record<string, string> {
  const errors: Record<string, string> = {}

  if (
    !Number.isInteger(defaultPaymentTermsDays) ||
    defaultPaymentTermsDays < 0 ||
    defaultPaymentTermsDays > 365
  ) {
    errors.defaultPaymentTermsDays = 'Payment terms must be between 0 and 365 days.'
  }

  if (!timeZone.trim()) {
    errors.timeZone = 'Select a time zone.'
  } else if (allowedTimeZones.length > 0 && !allowedTimeZones.includes(timeZone)) {
    errors.timeZone = 'Select a valid time zone from the list.'
  }

  return errors
}

export function validateLogoFile(file: File): string | null {
  if (
    !ALLOWED_LOGO_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_LOGO_MIME_TYPES)[number],
    )
  ) {
    return 'Logo must be a PNG or JPEG image.'
  }

  if (file.size > MAX_LOGO_SIZE_BYTES) {
    return 'Logo file size must not exceed 1 MB.'
  }

  return null
}
