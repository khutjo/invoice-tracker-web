<template>
  <q-page class="auth-page">
    <!-- Left Column: Centred 400px Form Column -->
    <div class="auth-page__form-pane">
      <div class="auth-page__form-container">
        <!-- Product Header -->
        <div class="auth-brand">
          <div class="auth-brand__mark" aria-hidden="true">
            <span class="auth-brand__monogram">IT</span>
          </div>
          <span class="auth-brand__name">Invoice Tracker</span>
        </div>

        <!-- Check Your Inbox State (shown after 201 on Create Account) -->
        <div
          v-if="registeredEmail && activeTab === 'register'"
          class="attio-card inbox-state"
          data-testid="check-inbox-state"
        >
          <div class="inbox-state__icon-wrap" aria-hidden="true">
            <q-icon name="mail_outline" size="22px" />
          </div>
          <h1 class="text-heading-lg">Check your inbox</h1>
          <p class="inbox-state__body">
            We sent a verification link to <strong>{{ registeredEmail }}</strong
            >. Open it to activate your account.
          </p>
          <q-btn
            color="primary"
            label="Back to sign in"
            class="full-width auth-submit-btn"
            data-testid="back-to-signin-btn"
            @click="switchToSignInWithEmail(registeredEmail)"
          />
        </div>

        <div v-else class="auth-page__tabs-and-form">
          <!-- Slim Attio-style Tabs -->
          <q-tabs
            :model-value="activeTab"
            align="left"
            no-caps
            dense
            active-color="primary"
            indicator-color="primary"
            class="auth-tabs"
            @update:model-value="onTabChange"
          >
            <q-tab name="login" label="Sign in" data-testid="tab-login" />
            <q-tab name="register" label="Create account" data-testid="tab-register" />
          </q-tabs>

          <!-- Sign In Tab Panel -->
          <form
            v-if="activeTab === 'login'"
            class="auth-form"
            novalidate
            data-testid="login-form"
            @submit.prevent="submitLogin"
          >
            <div class="auth-form__heading">
              <h1 class="text-heading-lg">Sign in to your account</h1>
              <p class="auth-form__subtitle">
                Enter your workspace email and password to continue.
              </p>
            </div>

            <!-- Subtle Banner (Error or Info) -->
            <div
              v-if="loginBanner.message"
              role="alert"
              class="auth-banner"
              :class="loginBanner.variant === 'info' ? 'auth-banner--info' : 'auth-banner--error'"
              data-testid="login-banner"
            >
              <q-icon
                :name="loginBanner.variant === 'info' ? 'info_outline' : 'error_outline'"
                size="16px"
                class="auth-banner__icon"
              />
              <span>{{ loginBanner.message }}</span>
            </div>

            <div class="auth-field">
              <label class="field-label" for="login-email">Email address</label>
              <q-input
                id="login-email"
                v-model="loginForm.email"
                type="email"
                autocomplete="email"
                placeholder="you@company.co.za"
                :error="Boolean(loginFieldErrors.email)"
                :error-message="loginFieldErrors.email"
                :disable="loginSubmitting"
                data-testid="login-email"
              />
            </div>

            <div class="auth-field">
              <label class="field-label" for="login-password">Password</label>
              <q-input
                id="login-password"
                v-model="loginForm.password"
                :type="showLoginPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="Enter your password"
                :error="Boolean(loginFieldErrors.password)"
                :error-message="loginFieldErrors.password"
                :disable="loginSubmitting"
                data-testid="login-password"
              >
                <template #append>
                  <q-btn
                    flat
                    dense
                    round
                    size="sm"
                    :icon="showLoginPassword ? 'visibility_off' : 'visibility'"
                    :aria-label="showLoginPassword ? 'Hide password' : 'Show password'"
                    @click="showLoginPassword = !showLoginPassword"
                  />
                </template>
              </q-input>
            </div>

            <q-btn
              type="submit"
              color="primary"
              label="Sign in"
              :loading="loginSubmitting"
              :disable="loginSubmitting"
              class="full-width auth-submit-btn"
              data-testid="login-submit"
            />
          </form>

          <form
            v-else
            class="auth-form"
            novalidate
            data-testid="register-form"
            @submit.prevent="submitRegister"
          >
            <!-- Create Account Tab Panel -->
            <div class="auth-form__heading">
              <h1 class="text-heading-lg">Create your business account</h1>
              <p class="auth-form__subtitle">
                Set up your South African business workspace in seconds.
              </p>
            </div>

            <div
              v-if="registerBanner"
              role="alert"
              class="auth-banner auth-banner--error"
              data-testid="register-banner"
            >
              <q-icon name="error_outline" size="16px" class="auth-banner__icon" />
              <span>{{ registerBanner }}</span>
            </div>

            <div class="auth-field">
              <label class="field-label" for="register-business-name">Business name</label>
              <q-input
                id="register-business-name"
                v-model="registerForm.businessName"
                type="text"
                autocomplete="organization"
                maxlength="200"
                placeholder="e.g. Karoo Studio (Pty) Ltd"
                :error="Boolean(registerFieldErrors.businessName)"
                :error-message="registerFieldErrors.businessName"
                :disable="registerSubmitting"
                data-testid="register-business-name"
              />
            </div>

            <div class="auth-row">
              <div class="auth-field">
                <label class="field-label" for="register-first-name">First name</label>
                <q-input
                  id="register-first-name"
                  v-model="registerForm.firstName"
                  type="text"
                  autocomplete="given-name"
                  maxlength="100"
                  placeholder="Thabo"
                  :error="Boolean(registerFieldErrors.firstName)"
                  :error-message="registerFieldErrors.firstName"
                  :disable="registerSubmitting"
                  data-testid="register-first-name"
                />
              </div>

              <div class="auth-field">
                <label class="field-label" for="register-last-name">Last name</label>
                <q-input
                  id="register-last-name"
                  v-model="registerForm.lastName"
                  type="text"
                  autocomplete="family-name"
                  maxlength="100"
                  placeholder="Mokoena"
                  :error="Boolean(registerFieldErrors.lastName)"
                  :error-message="registerFieldErrors.lastName"
                  :disable="registerSubmitting"
                  data-testid="register-last-name"
                />
              </div>
            </div>

            <div class="auth-field">
              <label class="field-label" for="register-email">Work email</label>
              <q-input
                id="register-email"
                v-model="registerForm.email"
                type="email"
                autocomplete="email"
                maxlength="256"
                placeholder="thabo@karoostudio.co.za"
                :error="Boolean(registerFieldErrors.email)"
                :error-message="registerFieldErrors.email"
                :disable="registerSubmitting"
                data-testid="register-email"
              />
            </div>

            <div class="auth-field">
              <label class="field-label" for="register-password">Password</label>
              <q-input
                id="register-password"
                v-model="registerForm.password"
                :type="showRegisterPassword ? 'text' : 'password'"
                autocomplete="new-password"
                maxlength="128"
                placeholder="Create a strong password"
                :error="Boolean(registerFieldErrors.password)"
                :error-message="registerFieldErrors.password"
                :disable="registerSubmitting"
                data-testid="register-password"
              >
                <template #append>
                  <q-btn
                    flat
                    dense
                    round
                    size="sm"
                    :icon="showRegisterPassword ? 'visibility_off' : 'visibility'"
                    :aria-label="showRegisterPassword ? 'Hide password' : 'Show password'"
                    @click="showRegisterPassword = !showRegisterPassword"
                  />
                </template>
              </q-input>

              <!-- ASP.NET Core Identity Password Checklist -->
              <ul class="password-checklist" aria-label="Password requirements">
                <li
                  v-for="rule in passwordRules"
                  :key="rule.key"
                  class="password-checklist__item"
                  :class="{ 'password-checklist__item--met': rule.met }"
                >
                  <q-icon
                    :name="rule.met ? 'check_circle' : 'radio_button_unchecked'"
                    size="14px"
                  />
                  <span>{{ rule.label }}</span>
                </li>
              </ul>
            </div>

            <div class="auth-field">
              <label class="field-label" for="register-confirm-password"> Confirm password </label>
              <q-input
                id="register-confirm-password"
                v-model="registerForm.confirmPassword"
                :type="showRegisterPassword ? 'text' : 'password'"
                autocomplete="new-password"
                maxlength="128"
                placeholder="Re-enter your password"
                :error="Boolean(registerFieldErrors.confirmPassword)"
                :error-message="registerFieldErrors.confirmPassword"
                :disable="registerSubmitting"
                data-testid="register-confirm-password"
              />
            </div>

            <q-btn
              type="submit"
              color="primary"
              label="Create account"
              :loading="registerSubmitting"
              :disable="registerSubmitting"
              class="full-width auth-submit-btn"
              data-testid="register-submit"
            />
          </form>
        </div>
      </div>
    </div>

    <!-- Right Column (Desktop md+): Quiet Canvas Panel with Real Invoice Preview -->
    <aside class="auth-page__preview-pane" aria-label="Product preview">
      <div class="preview-stage">
        <div class="preview-stage__copy">
          <div class="preview-stage__eyebrow">South African VAT Invoicing</div>
          <h2 class="preview-stage__headline">
            Invoices, payments and reminders for your business
          </h2>
          <p class="preview-stage__subtext">
            Create and send VAT invoices, track partial payments, and send automatic overdue
            reminders in one calm workspace.
          </p>
        </div>

        <div class="attio-card preview-table-card">
          <div class="preview-table-card__header">
            <span class="preview-table-card__title">Invoices</span>
            <span class="preview-table-card__count tabular-nums">4 records</span>
          </div>

          <table class="attio-table preview-table">
            <thead>
              <tr>
                <th class="text-left">Invoice</th>
                <th class="text-left">Customer</th>
                <th class="text-left">Status</th>
                <th class="text-left">Due</th>
                <th class="text-right">Balance (ZAR)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in previewRows" :key="row.number">
                <td class="tabular-nums font-medium">{{ row.number }}</td>
                <td class="text-secondary">{{ row.customer }}</td>
                <td>
                  <span class="status-pill" :class="row.pillClass">{{ row.status }}</span>
                </td>
                <td class="tabular-nums text-secondary">{{ row.due }}</td>
                <td class="text-money font-medium">{{ formatZar(row.balance) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </aside>
  </q-page>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authApi } from 'src/features/auth/api'
import { safeRedirect } from 'src/features/auth/redirect'
import { useSessionStore } from 'src/features/auth/store'
import { ApiError, mapProblemDetails } from 'src/shared/api/problem'
import { formatZar } from 'src/shared/formatting/formatters'

type AuthTab = 'login' | 'register'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()

const activeTab = computed<AuthTab>(() =>
  route.path.startsWith('/register') ? 'register' : 'login',
)

const showLoginPassword = ref(false)
const showRegisterPassword = ref(false)
const loginSubmitting = ref(false)
const registerSubmitting = ref(false)
const registeredEmail = ref<string | null>(null)

const loginForm = reactive({
  email: '',
  password: '',
})

const loginBanner = reactive<{
  message: string
  variant: 'error' | 'info'
}>({
  message: '',
  variant: 'error',
})

const loginFieldErrors = reactive<{
  email?: string
  password?: string
}>({})

const registerForm = reactive({
  businessName: '',
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const registerBanner = ref('')
const registerFieldErrors = reactive<{
  businessName?: string
  firstName?: string
  lastName?: string
  email?: string
  password?: string
  confirmPassword?: string
}>({})

const passwordRules = computed(() => {
  const pwd = registerForm.password
  return [
    { key: 'length', label: 'At least 6 characters', met: pwd.length >= 6 },
    { key: 'upper', label: 'One uppercase letter (A–Z)', met: /[A-Z]/.test(pwd) },
    { key: 'lower', label: 'One lowercase letter (a–z)', met: /[a-z]/.test(pwd) },
    { key: 'digit', label: 'One digit (0–9)', met: /\d/.test(pwd) },
    { key: 'symbol', label: 'One symbol (e.g. !@#$%)', met: /[^A-Za-z0-9]/.test(pwd) },
  ]
})

const previewRows = [
  {
    number: 'INV-2026-0042',
    customer: 'Highveld Logistics (Pty) Ltd',
    status: 'Overdue',
    pillClass: 'status-pill--overdue',
    due: '17 Oct 2026',
    balance: 42550.0,
  },
  {
    number: 'INV-2026-0043',
    customer: 'Cape Winelands Roasters CC',
    status: 'Partially paid',
    pillClass: 'status-pill--partially-paid',
    due: '10 Nov 2026',
    balance: 29000.0,
  },
  {
    number: 'INV-2026-0044',
    customer: 'eThekwini Marine Supplies',
    status: 'Sent',
    pillClass: 'status-pill--sent',
    due: '15 Nov 2026',
    balance: 76700.0,
  },
  {
    number: 'INV-2026-0041',
    customer: 'Stellenbosch Agri Holdings',
    status: 'Paid',
    pillClass: 'status-pill--paid',
    due: '25 Oct 2026',
    balance: 0,
  },
]

watch(
  () => route.path,
  () => {
    clearLoginErrors()
    clearRegisterErrors()
  },
)

function clearLoginErrors() {
  loginBanner.message = ''
  loginBanner.variant = 'error'
  delete loginFieldErrors.email
  delete loginFieldErrors.password
}

function clearRegisterErrors() {
  registerBanner.value = ''
  delete registerFieldErrors.businessName
  delete registerFieldErrors.firstName
  delete registerFieldErrors.lastName
  delete registerFieldErrors.email
  delete registerFieldErrors.password
  delete registerFieldErrors.confirmPassword
}

function onTabChange(nextTab: string | number) {
  const targetPath = nextTab === 'register' ? '/register' : '/login'
  if (nextTab === 'register') {
    registeredEmail.value = null
  }
  if (route.path !== targetPath) {
    void router.replace({ path: targetPath, query: route.query })
  }
}

function switchToSignInWithEmail(emailToPrefill: string) {
  loginForm.email = emailToPrefill
  loginForm.password = ''
  registeredEmail.value = null
  void router.replace({ path: '/login', query: route.query })
}

function validateLoginClient(): boolean {
  clearLoginErrors()
  const email = loginForm.email.trim()
  if (!email) {
    loginFieldErrors.email = 'Email address is required.'
  } else if (email.length > 256 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    loginFieldErrors.email = 'Enter a valid email address.'
  }

  if (!loginForm.password) {
    loginFieldErrors.password = 'Password is required.'
  }

  return !loginFieldErrors.email && !loginFieldErrors.password
}

async function submitLogin() {
  if (!validateLoginClient()) return

  loginSubmitting.value = true
  clearLoginErrors()
  const submittedEmail = loginForm.email.trim()

  try {
    await sessionStore.signIn({
      email: submittedEmail,
      password: loginForm.password,
    })

    const destination = safeRedirect(route.query.redirect)
    await router.replace(destination)
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) {
        loginForm.password = ''
        loginBanner.variant = 'error'
        loginBanner.message = 'Email or password is incorrect.'
        return
      } else if (err.status === 403) {
        loginBanner.variant = 'info'
        loginBanner.message = `Please verify your email first. We sent a link to ${submittedEmail}.`
        return
      } else if (err.status === 429) {
        loginBanner.variant = 'error'
        loginBanner.message = 'Too many attempts. Try again in a minute.'
        return
      }
    }

    const mapped = mapProblemDetails(err, {
      knownFields: ['email', 'password'],
    })

    if (mapped.fieldErrors.email?.[0]) {
      loginFieldErrors.email = mapped.fieldErrors.email[0]
    }
    if (mapped.fieldErrors.password?.[0]) {
      loginFieldErrors.password = mapped.fieldErrors.password[0]
    }
    if (mapped.title) {
      loginBanner.variant = 'error'
      loginBanner.message = mapped.title
    }
  } finally {
    loginSubmitting.value = false
  }
}

function validateRegisterClient(): boolean {
  clearRegisterErrors()

  const businessName = registerForm.businessName.trim()
  const firstName = registerForm.firstName.trim()
  const lastName = registerForm.lastName.trim()
  const email = registerForm.email.trim()

  if (!businessName) {
    registerFieldErrors.businessName = 'Business name is required.'
  } else if (businessName.length > 200) {
    registerFieldErrors.businessName = 'Business name cannot exceed 200 characters.'
  }

  if (!firstName) {
    registerFieldErrors.firstName = 'First name is required.'
  } else if (firstName.length > 100) {
    registerFieldErrors.firstName = 'First name cannot exceed 100 characters.'
  }

  if (!lastName) {
    registerFieldErrors.lastName = 'Last name is required.'
  } else if (lastName.length > 100) {
    registerFieldErrors.lastName = 'Last name cannot exceed 100 characters.'
  }

  if (!email) {
    registerFieldErrors.email = 'Email address is required.'
  } else if (email.length > 256 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    registerFieldErrors.email = 'Enter a valid email address.'
  }

  const allPasswordRulesMet = passwordRules.value.every((r) => r.met)
  if (!registerForm.password) {
    registerFieldErrors.password = 'Password is required.'
  } else if (registerForm.password.length > 128) {
    registerFieldErrors.password = 'Password cannot exceed 128 characters.'
  } else if (!allPasswordRulesMet) {
    registerFieldErrors.password = 'Password must meet all requirements below.'
  }

  if (registerForm.confirmPassword !== registerForm.password) {
    registerFieldErrors.confirmPassword = 'Passwords do not match.'
  }

  return Object.keys(registerFieldErrors).length === 0
}

async function submitRegister() {
  if (!validateRegisterClient()) return

  registerSubmitting.value = true
  clearRegisterErrors()
  const submittedEmail = registerForm.email.trim()

  try {
    const response = await authApi.register({
      businessName: registerForm.businessName.trim(),
      firstName: registerForm.firstName.trim(),
      lastName: registerForm.lastName.trim(),
      email: submittedEmail,
      password: registerForm.password,
    })

    registeredEmail.value = response?.email || submittedEmail
    registerForm.password = ''
    registerForm.confirmPassword = ''
  } catch (err) {
    const mapped = mapProblemDetails(err, {
      knownFields: ['businessName', 'firstName', 'lastName', 'email', 'password'],
      routeEmailMentionsToField: true,
    })

    if (mapped.fieldErrors.businessName?.[0]) {
      registerFieldErrors.businessName = mapped.fieldErrors.businessName[0]
    }
    if (mapped.fieldErrors.firstName?.[0]) {
      registerFieldErrors.firstName = mapped.fieldErrors.firstName[0]
    }
    if (mapped.fieldErrors.lastName?.[0]) {
      registerFieldErrors.lastName = mapped.fieldErrors.lastName[0]
    }
    if (mapped.fieldErrors.email?.[0]) {
      registerFieldErrors.email = mapped.fieldErrors.email[0]
    }
    if (mapped.fieldErrors.password?.[0]) {
      registerFieldErrors.password = mapped.fieldErrors.password.join(' ')
    }
    if (mapped.title) {
      registerBanner.value = mapped.title
    }
  } finally {
    registerSubmitting.value = false
  }
}
</script>

<style scoped lang="scss">
.auth-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr;
  background: var(--bg-surface);

  @media (min-width: 1024px) {
    grid-template-columns: minmax(480px, 1fr) 1.1fr;
  }

  &__form-pane {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 16px;
  }

  &__form-container {
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  &__tabs-and-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  &__preview-pane {
    display: none;
    background: var(--bg-canvas);
    border-left: 1px solid var(--border-hairline);
    padding: 48px;
    align-items: center;
    justify-content: center;

    @media (min-width: 1024px) {
      display: flex;
    }
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
    letter-spacing: -0.02em;
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }
}

.auth-tabs {
  border-bottom: 1px solid var(--border-hairline);

  :deep(.q-tab) {
    padding: 0 12px 0 0;
    margin-right: 16px;
    min-height: 38px;
    font-size: 13.5px;
    font-weight: 500;
    background: transparent !important;
  }

  :deep(.q-tab__indicator) {
    height: 2px;
  }
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 14px;

  &__heading {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__subtitle {
    margin: 0;
    font-size: 13px;
    color: var(--text-secondary);
  }
}

.auth-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;

  @media (min-width: 600px) {
    grid-template-columns: 1fr 1fr;
  }
}

.auth-field {
  display: flex;
  flex-direction: column;
}

.auth-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 12.5px;
  line-height: 1.4;
  border: 1px solid transparent;

  &__icon {
    margin-top: 1px;
    flex-shrink: 0;
  }

  &--error {
    background: var(--pill-overdue-bg);
    color: var(--pill-overdue-text);
    border-color: var(--pill-overdue-border);
  }

  &--info {
    background: var(--pill-sent-bg);
    color: var(--pill-sent-text);
    border-color: var(--pill-sent-border);
  }
}

.password-checklist {
  list-style: none;
  margin: 8px 0 0;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-hairline);
  display: grid;
  grid-template-columns: 1fr;
  gap: 4px;

  &__item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-secondary);

    &--met {
      color: var(--pill-paid-text);
      font-weight: 500;
    }
  }
}

.auth-submit-btn {
  min-height: 40px;
  font-weight: 500;
  margin-top: 4px;

  @media (max-width: 1023px) {
    min-height: 44px;
  }
}

.inbox-state {
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;

  &__icon-wrap {
    width: 36px;
    height: 36px;
    border-radius: 6px;
    background: var(--accent-subtle);
    color: var(--accent-primary);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__body {
    margin: 0;
    font-size: 13.5px;
    color: var(--text-secondary);
    line-height: 1.5;

    strong {
      color: var(--text-primary);
      font-weight: 600;
    }
  }
}

.preview-stage {
  max-width: 560px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;

  &__copy {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__eyebrow {
    font-size: 11.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--accent-primary);
  }

  &__headline {
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    margin: 0;
  }

  &__subtext {
    margin: 0;
    font-size: 13.5px;
    color: var(--text-secondary);
    line-height: 1.5;
  }
}

.preview-table-card {
  overflow: hidden;
  opacity: 0.94;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border-hairline);
    background: var(--bg-surface);
  }

  &__title {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-primary);
  }

  &__count {
    font-size: 11.5px;
    color: var(--text-muted);
  }
}

.preview-table {
  width: 100%;
  border-collapse: collapse;

  tbody tr {
    cursor: default;
  }
}

.font-medium {
  font-weight: 500;
}

.text-secondary {
  color: var(--text-secondary);
}
</style>
