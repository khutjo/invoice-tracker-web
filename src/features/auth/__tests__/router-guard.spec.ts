import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createAuthNavigationGuard } from 'src/router/guards'
import routes from 'src/router/routes'
import { useSessionStore } from '../store'

function buildTestRouter(sessionStore: ReturnType<typeof useSessionStore>) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  })
  router.beforeEach(createAuthNavigationGuard(sessionStore))
  return router
}

describe('auth navigation guard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('redirects unauthenticated users visiting / to /login?redirect=/dashboard', async () => {
    const sessionStore = useSessionStore()
    const router = buildTestRouter(sessionStore)

    await router.push('/')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/dashboard')
  })

  it('redirects unauthenticated users visiting a deep link to /login with redirect query', async () => {
    const sessionStore = useSessionStore()
    const router = buildTestRouter(sessionStore)

    await router.push('/invoices?status=Sent')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/invoices?status=Sent')
  })

  it('allows authenticated users to go directly to their destination', async () => {
    const sessionStore = useSessionStore()
    sessionStore.setSessionFromLogin({
      jwtToken: 'valid-jwt',
      refreshToken: 'valid-refresh',
      expiresIn: 900,
      userId: 'u-1',
      businessId: 'b-1',
      role: 'Owner',
    })

    const router = buildTestRouter(sessionStore)

    await router.push('/invoices?status=Sent')
    await router.isReady()

    expect(router.currentRoute.value.fullPath).toBe('/invoices?status=Sent')
  })

  it('sends authenticated users away from /login to their redirect target or /dashboard', async () => {
    const sessionStore = useSessionStore()
    sessionStore.setSessionFromLogin({
      jwtToken: 'valid-jwt',
      refreshToken: 'valid-refresh',
      expiresIn: 900,
      userId: 'u-1',
      businessId: 'b-1',
      role: 'Owner',
    })

    const router = buildTestRouter(sessionStore)

    await router.push('/login?redirect=%2Fcustomers')
    await router.isReady()

    expect(router.currentRoute.value.fullPath).toBe('/customers')

    await router.push('/login')
    expect(router.currentRoute.value.fullPath).toBe('/dashboard')
  })
})
