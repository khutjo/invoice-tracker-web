import type { ContactNumberType } from 'src/features/business/api'
import { isAddressDraftStarted, type AddressDraft } from 'src/features/business/validation'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VAT_REGEX = /^4\d{9}$/
const E164_PHONE_REGEX = /^\+[1-9]\d{7,14}$/
const POSTAL_CODE_REGEX = /^\d{4}$/

export interface CustomerFormDraft {
  name: string
  email: string
  customerReference: string
  vatNumber: string
  hasContactNumber: boolean
  contactNumber: string
  contactType: ContactNumberType
  hasBillingAddress: boolean
  billingAddress: AddressDraft
}

export function validateCustomerDraft(draft: CustomerFormDraft): Record<string, string> {
  const errors: Record<string, string> = {}

  const name = draft.name.trim()
  const email = draft.email.trim()
  const ref = draft.customerReference.trim()
  const vat = draft.vatNumber.trim()
  const phone = draft.contactNumber.trim()

  if (!name) {
    errors.name = 'Customer name is required.'
  } else if (name.length > 200) {
    errors.name = 'Customer name cannot exceed 200 characters.'
  }

  if (!email) {
    errors.email = 'Email address is required.'
  } else if (email.length > 256 || !EMAIL_REGEX.test(email)) {
    errors.email = 'Enter a valid email address.'
  }

  if (ref.length > 50) {
    errors.customerReference = 'Customer reference cannot exceed 50 characters.'
  }

  if (vat && !VAT_REGEX.test(vat)) {
    errors.vatNumber = 'VAT number must be 10 digits starting with 4.'
  }

  if (draft.hasContactNumber || phone.length > 0) {
    if (!phone) {
      errors['contactNumber.number'] = 'Contact number is required (e.g. +27821234567).'
    } else if (!E164_PHONE_REGEX.test(phone)) {
      errors['contactNumber.number'] = 'Use international format, e.g. +27821234567.'
    }

    if (!draft.contactType) {
      errors['contactNumber.type'] = 'Select a contact number type.'
    }
  }

  const addr = draft.billingAddress
  const addressStarted = draft.hasBillingAddress || isAddressDraftStarted(addr)
  if (addressStarted) {
    const line1 = addr.line1.trim()
    const line2 = addr.line2.trim()
    const suburb = addr.suburb.trim()
    const city = addr.city.trim()
    const postalCode = addr.postalCode.trim()

    if (!line1) {
      errors['billingAddress.line1'] = 'Street address line 1 is required.'
    } else if (line1.length > 200) {
      errors['billingAddress.line1'] = 'Address line 1 cannot exceed 200 characters.'
    }

    if (line2.length > 200) {
      errors['billingAddress.line2'] = 'Address line 2 cannot exceed 200 characters.'
    }

    if (!postalCode) {
      errors['billingAddress.postalCode'] = 'Postal code is required.'
    } else if (!POSTAL_CODE_REGEX.test(postalCode)) {
      errors['billingAddress.postalCode'] = 'Postal code must be 4 digits.'
    }

    if (!suburb) {
      errors['billingAddress.suburb'] = 'Suburb is required.'
    } else if (suburb.length > 100) {
      errors['billingAddress.suburb'] = 'Suburb cannot exceed 100 characters.'
    }

    if (!city) {
      errors['billingAddress.city'] = 'City or town is required.'
    } else if (city.length > 100) {
      errors['billingAddress.city'] = 'City cannot exceed 100 characters.'
    }
  }

  return errors
}
