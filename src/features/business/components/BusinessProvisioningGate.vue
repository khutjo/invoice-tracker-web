<template>
  <div v-if="showProvisioning" class="provisioning-gate" data-testid="business-provisioning-state">
    <div class="attio-card provisioning-card">
      <q-spinner color="primary" size="28px" />
      <h1 class="text-heading-lg">Setting up your business…</h1>
      <p class="provisioning-card__copy">
        Preparing your workspace and South African tax settings. This only takes a moment.
      </p>
    </div>
  </div>

  <div
    v-else-if="showUnavailable"
    class="provisioning-gate"
    data-testid="business-unavailable-state"
  >
    <div class="attio-card provisioning-card">
      <div class="provisioning-card__badge" aria-hidden="true">
        <q-icon name="cloud_off" size="22px" />
      </div>
      <h1 class="text-heading-lg">We couldn't load your business yet</h1>
      <p class="provisioning-card__copy">
        Your business profile is taking longer than usual to finish provisioning, or the server
        could not be reached.
      </p>
      <div class="provisioning-card__actions">
        <q-btn
          color="primary"
          label="Try again"
          :loading="retrying"
          data-testid="provisioning-retry-btn"
          @click="handleRetry"
        />
        <button
          type="button"
          class="provisioning-card__signout-link"
          data-testid="provisioning-signout-link"
          @click="handleSignOut"
        >
          Sign out
        </button>
      </div>
    </div>
  </div>

  <slot v-else />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from 'src/features/auth/store'
import { useBusinessStore } from 'src/features/business/store'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const businessStore = useBusinessStore()
const retrying = ref(false)

const isProtectedRoute = computed(() => {
  const isPublic = route.matched.some((record) => Boolean(record.meta.public))
  return sessionStore.isAuthenticated && !isPublic
})

const showProvisioning = computed(
  () => isProtectedRoute.value && businessStore.status === 'provisioning',
)

const showUnavailable = computed(
  () => isProtectedRoute.value && businessStore.status === 'unavailable',
)

async function handleRetry() {
  retrying.value = true
  try {
    const nextStatus = await businessStore.loadProfile()
    if (nextStatus === 'ready' && sessionStore.isOwner && !businessStore.isProfileComplete) {
      await router.replace('/setup')
    }
  } finally {
    retrying.value = false
  }
}

async function handleSignOut() {
  await sessionStore.signOut()
  await router.replace('/login')
}
</script>

<style scoped lang="scss">
.provisioning-gate {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: var(--bg-canvas);
}

.provisioning-card {
  width: 100%;
  max-width: 420px;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;

  &__badge {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: var(--pill-overdue-bg);
    color: var(--pill-overdue-text);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__copy {
    margin: 0;
    font-size: 13.5px;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  &__actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    width: 100%;
    margin-top: 6px;
  }

  &__signout-link {
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    padding: 4px 8px;

    &:hover {
      color: var(--text-primary);
      text-decoration: underline;
    }
  }
}
</style>
