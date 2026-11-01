import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useBusinessStore } from 'src/features/business/store'
import { authApi, type LoginRequest, type LoginResponse, type UserRole } from './api'

/**
 * Security trade-off note:
 * The Identity API currently returns `refreshToken` in the JSON response body
 * rather than setting an `httpOnly; Secure; SameSite` cookie. To preserve the
 * user's session across browser reloads, we store ONLY the refresh token in
 * `localStorage` under a single key while keeping the short-lived RS256 access
 * token strictly in memory (Pinia). An `httpOnly` cookie handled by the gateway
 * would be safer against XSS token exfiltration.
 */
export const REFRESH_TOKEN_STORAGE_KEY = 'invoice_tracker.refresh_token'

interface JwtClaims {
  sub?: string
  email?: string
  business_id?: string
  role?: UserRole
}

function readStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStoredRefreshToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token)
    } else {
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
    }
  } catch {
    // Ignore storage quota or private-mode restrictions
  }
}

function decodeJwtClaims(jwtToken: string): JwtClaims {
  try {
    const parts = jwtToken.split('.')
    const payloadPart = parts[1]
    if (!payloadPart) return {}
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const json = atob(padded)
    return JSON.parse(json) as JwtClaims
  } catch {
    return {}
  }
}

export const useSessionStore = defineStore('session', () => {
  const accessToken = ref<string | null>(null)
  const expiresAt = ref<number | null>(null)
  const userId = ref<string | null>(null)
  const businessId = ref<string | null>(null)
  const role = ref<UserRole | null>(null)
  const email = ref<string | null>(null)
  const isRestored = ref(false)

  let inFlightRestoreOrRefresh: Promise<string | null> | null = null

  const isAuthenticated = computed(() => Boolean(accessToken.value))
  const isOwner = computed(() => role.value === 'Owner')

  function applyTokens(
    jwtToken: string,
    newRefreshToken: string,
    expiresInSeconds: number,
    explicitMeta?: { userId?: string; businessId?: string; role?: UserRole; email?: string },
  ) {
    accessToken.value = jwtToken
    expiresAt.value = Date.now() + expiresInSeconds * 1000
    writeStoredRefreshToken(newRefreshToken)

    const claims = decodeJwtClaims(jwtToken)
    userId.value = explicitMeta?.userId ?? claims.sub ?? userId.value
    businessId.value = explicitMeta?.businessId ?? claims.business_id ?? businessId.value
    role.value = explicitMeta?.role ?? claims.role ?? role.value
    email.value = explicitMeta?.email ?? claims.email ?? email.value
  }

  function clearSessionState() {
    accessToken.value = null
    expiresAt.value = null
    userId.value = null
    businessId.value = null
    role.value = null
    email.value = null
    writeStoredRefreshToken(null)
    try {
      const businessStore = useBusinessStore()
      businessStore.resetBusinessState()
    } catch {
      // Pinia instance might not be active outside store context
    }
  }

  function setSessionFromLogin(response: LoginResponse, loginEmail?: string) {
    applyTokens(response.jwtToken, response.refreshToken, response.expiresIn, {
      userId: response.userId,
      businessId: response.businessId,
      role: response.role,
      ...(loginEmail ? { email: loginEmail } : {}),
    })
    isRestored.value = true
  }

  async function signIn(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await authApi.login(credentials)
    setSessionFromLogin(response, credentials.email)
    return response
  }

  async function refreshSession(): Promise<string | null> {
    if (inFlightRestoreOrRefresh) {
      return inFlightRestoreOrRefresh
    }

    const storedRefresh = readStoredRefreshToken()
    if (!storedRefresh) {
      clearSessionState()
      return null
    }

    inFlightRestoreOrRefresh = (async () => {
      try {
        const refreshed = await authApi.refresh({ refreshToken: storedRefresh })
        applyTokens(refreshed.jwtToken, refreshed.refreshToken, refreshed.expiresIn)
        return refreshed.jwtToken
      } catch {
        clearSessionState()
        return null
      } finally {
        inFlightRestoreOrRefresh = null
      }
    })()

    return inFlightRestoreOrRefresh
  }

  async function restore(): Promise<boolean> {
    if (isRestored.value) {
      return isAuthenticated.value
    }

    const storedRefresh = readStoredRefreshToken()
    if (!storedRefresh) {
      isRestored.value = true
      return false
    }

    const token = await refreshSession()
    isRestored.value = true
    return Boolean(token)
  }

  async function signOut(): Promise<void> {
    const storedRefresh = readStoredRefreshToken()
    try {
      if (storedRefresh) {
        await authApi.logout({ refreshToken: storedRefresh })
      }
    } catch {
      // Clear local state even if the network/server logout call fails
    } finally {
      clearSessionState()
    }
  }

  return {
    accessToken,
    expiresAt,
    userId,
    businessId,
    role,
    email,
    isRestored,
    isAuthenticated,
    isOwner,
    signIn,
    setSessionFromLogin,
    refreshSession,
    restore,
    signOut,
    clearSessionState,
  }
})
