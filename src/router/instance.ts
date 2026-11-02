import type { Router } from 'vue-router'

let activeRouter: Router | null = null

export function getAppRouter(): Router | null {
  return activeRouter
}

export function setAppRouter(router: Router | null): void {
  activeRouter = router
}
