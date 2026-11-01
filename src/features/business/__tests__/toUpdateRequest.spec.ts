import { describe, expect, it } from 'vitest'
import { toUpdateRequest, type BusinessDetails } from '../api'

const fullProfile: BusinessDetails = {
  businessId: 'b-100',
  name: 'Karoo Studio (Pty) Ltd',
  registrationNumber: '2019/123456/07',
  vatNumber: '4123456789',
  supportEmail: 'accounts@karoostudio.co.za',
  contactNumber: {
    number: '+27821234567',
    type: 'Mobile',
  },
  address: {
    line1: '14 Bree Street',
    line2: 'Floor 3',
    suburb: 'City Centre',
    city: 'Cape Town',
    postalCode: '8001',
  },
  bankDetails: {
    bankName: 'FNB',
    accountHolder: 'Karoo Studio (Pty) Ltd',
    accountNumber: '62012345678',
    accountType: 'Cheque',
    branchCode: '250655',
    branchName: 'Universal',
  },
  hasLogo: false,
  version: 'v1-base64',
}

describe('toUpdateRequest', () => {
  it('keeps untouched sections intact and only replaces patched fields', () => {
    const req = toUpdateRequest(
      fullProfile,
      {
        name: 'Karoo Digital (Pty) Ltd',
      },
      'v2-base64',
    )

    expect(req).toEqual({
      name: 'Karoo Digital (Pty) Ltd',
      registrationNumber: '2019/123456/07',
      vatNumber: '4123456789',
      supportEmail: 'accounts@karoostudio.co.za',
      contactNumber: {
        number: '+27821234567',
        type: 'Mobile',
      },
      address: {
        line1: '14 Bree Street',
        line2: 'Floor 3',
        suburb: 'City Centre',
        city: 'Cape Town',
        postalCode: '8001',
      },
      bankDetails: {
        bankName: 'FNB',
        accountHolder: 'Karoo Studio (Pty) Ltd',
        accountNumber: '62012345678',
        accountType: 'Cheque',
        branchCode: '250655',
        branchName: 'Universal',
      },
      version: 'v2-base64',
    })
  })

  it('removes a section when null is explicitly passed in the patch', () => {
    const req = toUpdateRequest(fullProfile, {
      address: null,
      bankDetails: null,
    })

    expect(req.address).toBeNull()
    expect(req.bankDetails).toBeNull()
    expect(req.contactNumber).toEqual(fullProfile.contactNumber)
    expect(req.supportEmail).toBe('accounts@karoostudio.co.za')
  })
})
