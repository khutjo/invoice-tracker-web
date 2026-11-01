import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from 'src/shared/api/problem'
import { businessApi, type BusinessDetails, type BusinessSettings } from '../api'
import { useBusinessStore } from '../store'

const sampleDetails: BusinessDetails = {
  businessId: 'b-1',
  name: 'Karoo Studio (Pty) Ltd',
  registrationNumber: null,
  vatNumber: null,
  supportEmail: null,
  contactNumber: null,
  address: null,
  bankDetails: null,
  hasLogo: false,
  version: 'v1',
}

const sampleSettings: BusinessSettings = {
  defaultPaymentTermsDays: 30,
  timeZone: 'Africa/Johannesburg',
  version: 'v1',
}

describe('useBusinessStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('transitions through provisioning to ready when GET /business returns 404 then 200', async () => {
    const getDetailsSpy = vi
      .spyOn(businessApi, 'getDetails')
      .mockRejectedValueOnce(new ApiError('Not Found', 404))
      .mockResolvedValueOnce(sampleDetails)

    vi.spyOn(businessApi, 'getSettings').mockResolvedValueOnce(sampleSettings)
    vi.spyOn(businessApi, 'getLookups').mockResolvedValueOnce({
      contactNumberTypes: [],
      bankAccountTypes: [],
      banks: [],
      timeZones: [{ value: 'Africa/Johannesburg', label: 'Africa/Johannesburg' }],
      defaultTimeZone: 'Africa/Johannesburg',
      paymentTerms: [{ days: 30, label: '30 days' }],
      defaultPaymentTermsDays: 30,
    })

    const store = useBusinessStore()
    const result = await store.loadProfile({ backoffDelaysMs: [1, 1] })

    expect(getDetailsSpy).toHaveBeenCalledTimes(2)
    expect(result).toBe('ready')
    expect(store.status).toBe('ready')
    expect(store.profile?.name).toBe('Karoo Studio (Pty) Ltd')
  })

  it('ends in unavailable when GET /business repeatedly returns 404', async () => {
    const getDetailsSpy = vi
      .spyOn(businessApi, 'getDetails')
      .mockRejectedValue(new ApiError('Not Found', 404))

    const store = useBusinessStore()
    const result = await store.loadProfile({ backoffDelaysMs: [1, 1] })

    expect(getDetailsSpy).toHaveBeenCalledTimes(3)
    expect(result).toBe('unavailable')
    expect(store.status).toBe('unavailable')
  })

  it('sends the new version returned by saveDetails on the subsequent saveSettings call', async () => {
    const store = useBusinessStore()
    store.profile = { ...sampleDetails, version: 'v-initial' }
    store.settings = { ...sampleSettings, version: 'v-initial' }
    store.version = 'v-initial'
    store.status = 'ready'

    const updateDetailsSpy = vi
      .spyOn(businessApi, 'updateDetails')
      .mockResolvedValueOnce({
        ...sampleDetails,
        name: 'Updated Name',
        version: 'v-after-details',
      })

    const saveSettingsSpy = vi
      .spyOn(businessApi, 'saveSettings')
      .mockResolvedValueOnce({
        defaultPaymentTermsDays: 14,
        timeZone: 'Africa/Johannesburg',
        version: 'v-after-settings',
      })

    await store.saveDetails({ name: 'Updated Name' })
    expect(updateDetailsSpy).toHaveBeenCalledWith(
      expect.objectContaining({ version: 'v-initial' }),
    )
    expect(store.version).toBe('v-after-details')

    await store.saveSettings({
      defaultPaymentTermsDays: 14,
      timeZone: 'Africa/Johannesburg',
    })

    expect(saveSettingsSpy).toHaveBeenCalledWith({
      defaultPaymentTermsDays: 14,
      timeZone: 'Africa/Johannesburg',
      version: 'v-after-details',
    })
    expect(store.version).toBe('v-after-settings')
  })

  it('sets hasConflict on 409 and clears it on reloadProfileAndSettings', async () => {
    const store = useBusinessStore()
    store.profile = { ...sampleDetails, version: 'v-stale' }
    store.version = 'v-stale'
    store.status = 'ready'

    vi.spyOn(businessApi, 'updateDetails').mockRejectedValueOnce(
      new ApiError('Conflict', 409, { title: 'Version conflict', status: 409 }),
    )

    await expect(store.saveDetails({ name: 'Conflicting Save' })).rejects.toThrow()
    expect(store.hasConflict).toBe(true)

    vi.spyOn(businessApi, 'getDetails').mockResolvedValueOnce({
      ...sampleDetails,
      name: 'Latest Server Name',
      version: 'v-fresh',
    })
    vi.spyOn(businessApi, 'getSettings').mockResolvedValueOnce({
      ...sampleSettings,
      version: 'v-fresh',
    })

    await store.reloadProfileAndSettings()
    expect(store.hasConflict).toBe(false)
    expect(store.version).toBe('v-fresh')
    expect(store.profile?.name).toBe('Latest Server Name')
  })
})
