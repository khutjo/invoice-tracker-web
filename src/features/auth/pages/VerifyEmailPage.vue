<template>
  <q-page class="verify-email-page">
    <div class="verify-email-page__container">
      <div class="auth-brand">
        <div class="auth-brand__mark" aria-hidden="true">
          <span class="auth-brand__monogram">IT</span>
        </div>
        <span class="auth-brand__name">Invoice Tracker</span>
      </div>

      <div class="attio-card verify-card">
        <!-- Verifying State -->
        <div v-if="status === 'verifying'" class="verify-card__state" data-testid="verify-loading">
          <q-skeleton type="rect" width="36px" height="36px" class="verify-card__skeleton-icon" />
          <h1 class="text-heading-lg">Verifying your email…</h1>
          <p class="verify-card__text">
            Please wait a moment while we confirm your verification link.
          </p>
          <q-skeleton type="QBtn" width="100%" height="40px" />
        </div>

        <!-- Verified (204 No Content) State -->
        <div
          v-else-if="status === 'verified'"
          class="verify-card__state"
          data-testid="verify-success"
        >
          <div class="verify-card__badge verify-card__badge--success" aria-hidden="true">
            <q-icon name="check_circle" size="22px" />
          </div>
          <h1 class="text-heading-lg" data-testid="verify-success-heading">
            Your email is verified.
          </h1>
          <p class="verify-card__text">
            Your account is now active. You can proceed to the sign-in screen to access your
            workspace.
          </p>
          <q-btn
            color="primary"
            label="Go to sign in"
            to="/login"
            class="full-width verify-card__btn"
            data-testid="verify-signin-btn"
          />
        </div>

        <!-- Invalid or Expired State (400 ProblemDetails or missing query params) -->
        <div v-else class="verify-card__state" data-testid="verify-error">
          <div class="verify-card__badge verify-card__badge--error" aria-hidden="true">
            <q-icon name="error_outline" size="22px" />
          </div>
          <h1 class="text-heading-lg" data-testid="verify-error-heading">
            {{ errorMessage }}
          </h1>
          <p class="verify-card__text">
            Please check that you opened the complete verification link from your email, or return
            to the sign-in screen.
          </p>
          <q-btn
            color="primary"
            label="Go to sign in"
            to="/login"
            class="full-width verify-card__btn"
            data-testid="verify-back-link"
          />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { authApi } from 'src/features/auth/api'
import { ApiError } from 'src/shared/api/problem'

type VerifyStatus = 'verifying' | 'verified' | 'invalid'

const DEFAULT_INVALID_MESSAGE = 'The verification link is invalid or has expired.'

const route = useRoute()
const status = ref<VerifyStatus>('verifying')
const errorMessage = ref(DEFAULT_INVALID_MESSAGE)

onMounted(async () => {
  const rawUserId = route.query.userId
  const rawToken = route.query.token

  const userId = typeof rawUserId === 'string' ? rawUserId.trim() : ''
  // Send token exactly as received in the query string
  const token = typeof rawToken === 'string' ? rawToken.trim() : ''

  if (!userId || !token) {
    errorMessage.value = DEFAULT_INVALID_MESSAGE
    status.value = 'invalid'
    return
  }

  try {
    await authApi.verifyEmail({ userId, token })
    status.value = 'verified'
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.isNetworkError || err.status >= 500) {
        errorMessage.value = "We couldn't reach the server. Check your connection and try again."
      } else if (err.problem?.title) {
        errorMessage.value = err.problem.title
      } else {
        errorMessage.value = DEFAULT_INVALID_MESSAGE
      }
    } else {
      errorMessage.value = DEFAULT_INVALID_MESSAGE
    }
    status.value = 'invalid'
  }
})
</script>

<style scoped lang="scss">
.verify-email-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: var(--bg-canvas);

  &__container {
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
}

.auth-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;

  &__mark {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: var(--text-primary);
    color: var(--bg-surface);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__monogram {
    font-size: 12px;
    font-weight: 700;
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.verify-card {
  padding: 24px 20px;

  &__state {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  &__skeleton-icon {
    border-radius: 6px;
  }

  &__badge {
    width: 36px;
    height: 36px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;

    &--success {
      background: var(--pill-paid-bg);
      color: var(--pill-paid-text);
    }

    &--error {
      background: var(--pill-overdue-bg);
      color: var(--pill-overdue-text);
    }
  }

  &__text {
    margin: 0;
    font-size: 13.5px;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  &__btn {
    min-height: 40px;
    margin-top: 4px;

    @media (max-width: 1023px) {
      min-height: 44px;
    }
  }
}
</style>
