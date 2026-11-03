import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { ApiError } from 'src/shared/api/problem'
import {
  businessApi,
  toUpdateRequest,
  type BusinessDetails,
  type BusinessDetailsPatch,
  type BusinessSettings,
  type Lookups,
} from './api'

export type BusinessStoreStatus = 'idle' | 'loading' | 'provisioning' | 'ready' | 'unavailable'

export const SETUP_SHOWN_SESSION_KEY = 'invoice_tracker.setup_shown'

const DEFAULT_BACKOFF_DELAYS_MS = [500, 1000, 2000, 4000, 8000]

export function hasSeenSetupThisSession(): boolean {
  try {
    return sessionStorage.getItem(SETUP_SHOWN_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function markSetupSeenThisSession(): void {
  try {
    sessionStorage.setItem(SETUP_SHOWN_SESSION_KEY, '1')
  } catch {
    // Ignore storage restrictions
  }
}

export function clearSetupSeenThisSession(): void {
  try {
    sessionStorage.removeItem(SETUP_SHOWN_SESSION_KEY)
  } catch {
    // Ignore storage restrictions
  }
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve()
  }
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function safeCreateObjectUrl(blob: Blob): string | null {
  try {
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      return URL.createObjectURL(blob)
    }
    return null
  } catch {
    return null
  }
}

function safeRevokeObjectUrl(url: string | null): void {
  if (!url) return
  try {
    if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(url)
    }
  } catch {
    // Ignore revoke errors
  }
}

export const useBusinessStore = defineStore('business', () => {
  const profile = ref<BusinessDetails | null>(null)
  const settings = ref<BusinessSettings | null>(null)
  const lookups = ref<Lookups | null>(null)
  const version = ref<string | null>(null)
  const logoUrl = ref<string | null>(null)
  const status = ref<BusinessStoreStatus>('idle')
  const hasConflict = ref(false)

  let inFlightLoad: Promise<BusinessStoreStatus> | null = null

  const isProfileComplete = computed(() => {
    const p = profile.value
    if (!p) return false
    return Boolean(p.supportEmail && p.contactNumber && p.address && p.bankDetails)
  })

  const businessName = computed(() => profile.value?.name?.trim() || 'Invoice Tracker')

  const businessInitials = computed(() => {
    const words = businessName.value.split(/\s+/).filter(Boolean)
    if (words.length >= 2) {
      return `${words[0]?.[0] ?? ''}${words[1]?.[0] ?? ''}`.toUpperCase()
    }
    return businessName.value.slice(0, 2).toUpperCase()
  })

  function setLogoObjectUrl(nextUrl: string | null) {
    if (logoUrl.value && logoUrl.value !== nextUrl) {
      safeRevokeObjectUrl(logoUrl.value)
    }
    logoUrl.value = nextUrl
  }

  async function fetchLogoIfPresent(hasLogo: boolean): Promise<void> {
    if (!hasLogo) {
      setLogoObjectUrl(null)
      return
    }
    try {
      const blob = await businessApi.getLogoBlob()
      setLogoObjectUrl(safeCreateObjectUrl(blob))
    } catch {
      // Non-fatal if logo 404s or fails to load
    }
  }

  async function loadProfile(options?: {
    backoffDelaysMs?: readonly number[]
  }): Promise<BusinessStoreStatus> {
    if (inFlightLoad) {
      return inFlightLoad
    }

    const delays = options?.backoffDelaysMs ?? DEFAULT_BACKOFF_DELAYS_MS

    inFlightLoad = (async () => {
      if (status.value === 'idle' || status.value === 'unavailable') {
        status.value = 'loading'
      }

      let loadedDetails: BusinessDetails | null = null

      for (let attempt = 0; attempt <= delays.length; attempt++) {
        try {
          loadedDetails = await businessApi.getDetails()
          break
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) {
            if (attempt < delays.length) {
              status.value = 'provisioning'
              await sleep(delays[attempt] ?? 0)
              continue
            } else {
              status.value = 'unavailable'
              return 'unavailable'
            }
          }
          status.value = 'unavailable'
          return 'unavailable'
        }
      }

      if (!loadedDetails) {
        status.value = 'unavailable'
        return 'unavailable'
      }

      profile.value = loadedDetails
      version.value = loadedDetails.version

      const [loadedSettings, loadedLookups] = await Promise.all([
        businessApi.getSettings().catch(() => null),
        lookups.value ? Promise.resolve(lookups.value) : businessApi.getLookups().catch(() => null),
        fetchLogoIfPresent(loadedDetails.hasLogo),
      ])

      if (loadedLookups) {
        lookups.value = loadedLookups
      }

      if (loadedSettings) {
        settings.value = loadedSettings
        version.value = loadedSettings.version || loadedDetails.version
      } else if (loadedLookups) {
        settings.value = {
          defaultPaymentTermsDays: loadedLookups.defaultPaymentTermsDays,
          timeZone: loadedLookups.defaultTimeZone,
          version: loadedDetails.version,
        }
      }

      hasConflict.value = false
      status.value = 'ready'
      return 'ready'
    })().finally(() => {
      inFlightLoad = null
    })

    return inFlightLoad
  }

  async function reloadProfileAndSettings(): Promise<void> {
    const [freshDetails, freshSettings] = await Promise.all([
      businessApi.getDetails(),
      businessApi.getSettings().catch(() => null),
    ])

    profile.value = freshDetails
    version.value = freshDetails.version

    if (freshSettings) {
      settings.value = freshSettings
      version.value = freshSettings.version || freshDetails.version
    }

    await fetchLogoIfPresent(freshDetails.hasLogo)
    hasConflict.value = false
    status.value = 'ready'
  }

  async function saveDetails(patch: BusinessDetailsPatch): Promise<BusinessDetails> {
    if (!profile.value) {
      throw new Error('Business profile is not loaded.')
    }

    const currentVersion = version.value ?? profile.value.version
    const requestPayload = toUpdateRequest(profile.value, patch, currentVersion)

    try {
      const updated = await businessApi.updateDetails(requestPayload)
      profile.value = updated
      version.value = updated.version
      hasConflict.value = false
      return updated
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        hasConflict.value = true
      }
      throw err
    }
  }

  async function saveSettings(input: {
    defaultPaymentTermsDays: number
    timeZone: string
  }): Promise<BusinessSettings> {
    const currentVersion = version.value ?? settings.value?.version ?? profile.value?.version ?? ''

    try {
      const updated = await businessApi.saveSettings({
        defaultPaymentTermsDays: input.defaultPaymentTermsDays,
        timeZone: input.timeZone,
        version: currentVersion,
      })
      settings.value = updated
      version.value = updated.version
      if (profile.value) {
        profile.value = { ...profile.value, version: updated.version }
      }
      hasConflict.value = false
      return updated
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        hasConflict.value = true
      }
      throw err
    }
  }

  async function uploadLogo(file: File): Promise<void> {
    try {
      const response = await businessApi.uploadLogo(file)
      version.value = response.version
      if (profile.value) {
        profile.value = {
          ...profile.value,
          hasLogo: true,
          version: response.version,
        }
      }
      if (settings.value) {
        settings.value = {
          ...settings.value,
          version: response.version,
        }
      }
      const nextUrl = safeCreateObjectUrl(file)
      if (nextUrl) {
        setLogoObjectUrl(nextUrl)
      } else {
        await fetchLogoIfPresent(true)
      }
      hasConflict.value = false
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        hasConflict.value = true
      }
      throw err
    }
  }

  function resetBusinessState(): void {
    setLogoObjectUrl(null)
    profile.value = null
    settings.value = null
    lookups.value = null
    version.value = null
    status.value = 'idle'
    hasConflict.value = false
    clearSetupSeenThisSession()
  }

  return {
    profile,
    settings,
    lookups,
    version,
    logoUrl,
    status,
    hasConflict,
    isProfileComplete,
    businessName,
    businessInitials,
    loadProfile,
    reloadProfileAndSettings,
    saveDetails,
    saveSettings,
    uploadLogo,
    resetBusinessState,
  }
})
