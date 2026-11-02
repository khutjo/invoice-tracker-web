import { defineRouter } from '#q-app/wrappers'
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router'
import { useSessionStore } from 'src/features/auth/store'
import { useBusinessStore } from 'src/features/business/store'
import { configureApiClientAuth } from 'src/shared/api/client'
import { createAuthNavigationGuard } from './guards'
import { setAppRouter } from './instance'
import routes from './routes'

export { getAppRouter, setAppRouter } from './instance'

export default defineRouter(function ({ store }) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const RouterInstance = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  })

  setAppRouter(RouterInstance)

  const sessionStore = useSessionStore(store)
  const businessStore = useBusinessStore(store)

  configureApiClientAuth({
    getAccessToken: () => sessionStore.accessToken,
    refreshSession: () => sessionStore.refreshSession(),
    onUnauthorized: async () => {
      sessionStore.clearSessionState()
      const currentPath = RouterInstance.currentRoute.value.fullPath
      if (!currentPath.startsWith('/login') && !currentPath.startsWith('/register')) {
        await RouterInstance.replace({
          path: '/login',
          query: { redirect: currentPath },
        })
      }
    },
  })

  RouterInstance.beforeEach(createAuthNavigationGuard(sessionStore, businessStore))

  return RouterInstance
})
