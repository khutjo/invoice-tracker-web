import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { apiClient, configureApiClientAuth } from 'src/shared/api/client'
import { REFRESH_TOKEN_STORAGE_KEY, useSessionStore } from '../store'

describe('session store and API client single-flight 401 refresh', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('triggers exactly one POST /auth/refresh when concurrent requests receive 401', async () => {
    const sessionStore = useSessionStore()
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, 'initial-refresh-token')
    sessionStore.accessToken = 'expired-access-token'

    configureApiClientAuth({
      getAccessToken: () => sessionStore.accessToken,
      refreshSession: () => sessionStore.refreshSession(),
      onUnauthorized: () => {
        sessionStore.clearSessionState()
      },
    })

    let refreshCallCount = 0

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const authHeader = new Headers(init?.headers).get('Authorization')

      if (url.endsWith('/auth/refresh')) {
        refreshCallCount += 1
        await new Promise((resolve) => setTimeout(resolve, 25))
        return new Response(
          JSON.stringify({
            jwtToken: 'fresh-access-token',
            refreshToken: 'rotated-refresh-token',
            expiresIn: 900,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      if (authHeader === 'Bearer expired-access-token') {
        return new Response(JSON.stringify({ title: 'Token expired', status: 401 }), {
          status: 401,
          headers: { 'Content-Type': 'application/problem+json' },
        })
      }

      if (authHeader === 'Bearer fresh-access-token') {
        return new Response(JSON.stringify({ ok: true, url }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response(null, { status: 500 })
    })

    vi.stubGlobal('fetch', fetchMock)

    const [res1, res2, res3] = await Promise.all([
      apiClient.get<{ ok: boolean }>('/business'),
      apiClient.get<{ ok: boolean }>('/business/settings'),
      apiClient.get<{ ok: boolean }>('/business/lookups'),
    ])

    expect(refreshCallCount).toBe(1)
    expect(res1.ok).toBe(true)
    expect(res2.ok).toBe(true)
    expect(res3.ok).toBe(true)
    expect(sessionStore.accessToken).toBe('fresh-access-token')
    expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBe('rotated-refresh-token')
  })
})
