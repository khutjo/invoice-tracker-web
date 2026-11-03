import type { NavigationGuardWithThis } from 'vue-router'
import { safeRedirect } from 'src/features/auth/redirect'
import type { useSessionStore } from 'src/features/auth/store'
import {
  hasSeenSetupThisSession,
  markSetupSeenThisSession,
  type useBusinessStore,
} from 'src/features/business/store'

export function createAuthNavigationGuard(
  sessionStore: ReturnType<typeof useSessionStore>,
  businessStore?: ReturnType<typeof useBusinessStore>,
): NavigationGuardWithThis<undefined> {
  return async (to) => {
    if (!sessionStore.isRestored) {
      await sessionStore.restore()
    }

    const isPublic = to.matched.some((record) => Boolean(record.meta.public))
    const requiresAuth = to.matched.some((record) => Boolean(record.meta.requiresAuth)) || !isPublic
    const guestOnly = to.matched.some((record) => Boolean(record.meta.guestOnly))
    const ownerOnly = to.matched.some((record) => Boolean(record.meta.ownerOnly))

    if (requiresAuth && !sessionStore.isAuthenticated) {
      return {
        path: '/login',
        query: { redirect: to.fullPath },
      }
    }

    if (guestOnly && sessionStore.isAuthenticated) {
      return safeRedirect(to.query.redirect)
    }

    if (sessionStore.isAuthenticated && !isPublic) {
      if (ownerOnly && !sessionStore.isOwner) {
        return { path: '/dashboard' }
      }

      if (businessStore) {
        if (businessStore.status === 'idle') {
          await businessStore.loadProfile()
        }

        if (
          businessStore.status === 'ready' &&
          sessionStore.isOwner &&
          !businessStore.isProfileComplete &&
          !hasSeenSetupThisSession()
        ) {
          markSetupSeenThisSession()
          if (to.path !== '/setup') {
            return { path: '/setup' }
          }
        }
      }
    }

    return true
  }
}
