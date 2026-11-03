import { apiClient } from 'src/shared/api/client'

export type ContactNumberType = 'Mobile' | 'Landline' | 'Work'
export type BankAccountType = 'Cheque' | 'Savings' | 'Transmission'

export interface ContactNumber {
  number: string
  type: ContactNumberType
}

export interface Address {
  line1: string
  line2?: string | null
  suburb: string
  city: string
  postalCode: string
}

export interface BankDetails {
  bankName: string
  accountHolder: string
  accountNumber: string
  accountType: BankAccountType
  branchCode: string
  branchName?: string | null
}

export interface BusinessDetails {
  businessId: string
  name: string
  registrationNumber: string | null
  vatNumber: string | null
  supportEmail: string | null
  contactNumber: ContactNumber | null
  address: Address | null
  bankDetails: BankDetails | null
  hasLogo: boolean
  version: string
}

export interface UpdateBusinessDetailsRequest {
  name: string
  registrationNumber?: string | null
  vatNumber?: string | null
  supportEmail?: string | null
  contactNumber?: ContactNumber | null
  address?: Address | null
  bankDetails?: BankDetails | null
  version: string
}

export interface BusinessDetailsPatch {
  name?: string
  registrationNumber?: string | null
  vatNumber?: string | null
  supportEmail?: string | null
  contactNumber?: ContactNumber | null
  address?: Address | null
  bankDetails?: BankDetails | null
}

export interface BusinessSettings {
  defaultPaymentTermsDays: number
  timeZone: string
  version: string
}

export interface SaveBusinessSettingsRequest {
  defaultPaymentTermsDays: number
  timeZone: string
  version: string
}

export interface UploadLogoResponse {
  contentType: string
  sizeBytes: number
  version: string
}

export interface LookupOption {
  value: string
  label: string
}

export interface BankLookupOption {
  value: string
  label: string
  branchCode: string
}

export interface PaymentTermOption {
  days: number
  label: string
}

export interface Lookups {
  contactNumberTypes: LookupOption[]
  bankAccountTypes: LookupOption[]
  banks: BankLookupOption[]
  timeZones: LookupOption[]
  defaultTimeZone: string
  paymentTerms: PaymentTermOption[]
  defaultPaymentTermsDays: number
}

export interface PostalCodeOption {
  code: string
  suburb: string
  town: string
  kind: string
}

/**
 * Builds a full-replace `PUT /business` request from the current stored profile
 * and a partial patch so untouched sections are preserved and never accidentally
 * wiped on the server. Passing `null` for a section explicitly removes it.
 */
export function toUpdateRequest(
  profile: BusinessDetails,
  patch: BusinessDetailsPatch,
  versionOverride?: string,
): UpdateBusinessDetailsRequest {
  return {
    name: 'name' in patch && patch.name !== undefined ? patch.name : profile.name,
    registrationNumber:
      'registrationNumber' in patch
        ? (patch.registrationNumber ?? null)
        : profile.registrationNumber,
    vatNumber: 'vatNumber' in patch ? (patch.vatNumber ?? null) : profile.vatNumber,
    supportEmail: 'supportEmail' in patch ? (patch.supportEmail ?? null) : profile.supportEmail,
    contactNumber:
      'contactNumber' in patch
        ? (patch.contactNumber ?? null)
        : profile.contactNumber
          ? { ...profile.contactNumber }
          : null,
    address:
      'address' in patch
        ? (patch.address ?? null)
        : profile.address
          ? { ...profile.address }
          : null,
    bankDetails:
      'bankDetails' in patch
        ? (patch.bankDetails ?? null)
        : profile.bankDetails
          ? { ...profile.bankDetails }
          : null,
    version: versionOverride ?? profile.version,
  }
}

export const businessApi = {
  getDetails(): Promise<BusinessDetails> {
    return apiClient.get<BusinessDetails>('/business')
  },

  updateDetails(payload: UpdateBusinessDetailsRequest): Promise<BusinessDetails> {
    return apiClient.put<BusinessDetails>('/business', payload)
  },

  getSettings(): Promise<BusinessSettings> {
    return apiClient.get<BusinessSettings>('/business/settings')
  },

  saveSettings(payload: SaveBusinessSettingsRequest): Promise<BusinessSettings> {
    return apiClient.put<BusinessSettings>('/business/settings', payload)
  },

  uploadLogo(file: File): Promise<UploadLogoResponse> {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.put<UploadLogoResponse>('/business/logo', formData)
  },

  getLogoBlob(): Promise<Blob> {
    return apiClient.getBlob('/business/logo')
  },

  getLookups(): Promise<Lookups> {
    return apiClient.get<Lookups>('/business/lookups')
  },

  lookupPostalCode(code: string): Promise<PostalCodeOption[]> {
    return apiClient.get<PostalCodeOption[]>(
      `/business/lookups/postal-codes/${encodeURIComponent(code)}`,
    )
  },
}
