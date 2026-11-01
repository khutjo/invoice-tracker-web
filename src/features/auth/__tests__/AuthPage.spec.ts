import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import AuthPage from '../pages/AuthPage.vue'
import { authApi } from '../api'
import { ApiError } from 'src/shared/api/problem'

const QPageStub = defineComponent({
  name: 'QPage',
  template: '<div class="q-page"><slot /></div>',
})

const QTabsStub = defineComponent({
  name: 'QTabs',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<div class="q-tabs"><slot /></div>',
})

const QTabStub = defineComponent({
  name: 'QTab',
  props: ['name', 'label'],
  template: '<button type="button" :data-tab="name">{{ label }}</button>',
})

const QIconStub = defineComponent({
  name: 'QIcon',
  props: ['name'],
  template: '<span class="q-icon">{{ name }}</span>',
})

const QBtnStub = defineComponent({
  name: 'QBtn',
  props: ['label', 'type', 'loading', 'disable', 'icon'],
  emits: ['click'],
  template:
    '<button :type="type || \'button\'" :disabled="disable || loading" @click="$emit(\'click\', $event)">{{ label }}<slot /></button>',
})

const QInputStub = defineComponent({
  name: 'QInput',
  inheritAttrs: false,
  props: {
    modelValue: { type: [String, Number], default: '' },
    id: { type: String, default: undefined },
    type: { type: String, default: 'text' },
    error: { type: Boolean, default: false },
    errorMessage: { type: String, default: undefined },
    disable: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  template: `
    <div class="q-input-stub">
      <input
        :id="id"
        :type="type"
        :value="modelValue"
        :disabled="disable"
        v-bind="$attrs"
        @input="$emit('update:modelValue', $event.target.value)"
      />
      <span v-if="error && errorMessage" class="q-field-error">{{ errorMessage }}</span>
      <slot name="append" />
    </div>
  `,
})

const quasarStubs = {
  'q-page': QPageStub,
  'q-tabs': QTabsStub,
  'q-tab': QTabStub,
  'q-icon': QIconStub,
  'q-btn': QBtnStub,
  'q-input': QInputStub,
}

async function createTestRouter(initialPath = '/login') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>Home</div>' } },
      { path: '/login', component: AuthPage },
      { path: '/register', component: AuthPage },
    ],
  })
  await router.push(initialPath)
  await router.isReady()
  return router
}

describe('AuthPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('binds the active tab to the current route (/login vs /register)', async () => {
    const router = await createTestRouter('/register')

    const wrapper = mount(AuthPage, {
      global: {
        plugins: [createPinia(), router],
        stubs: quasarStubs,
      },
    })

    expect(wrapper.find('[data-testid="register-form"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="login-form"]').exists()).toBe(false)

    await router.replace('/login')
    await flushPromises()

    expect(wrapper.find('[data-testid="login-form"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="register-form"]').exists()).toBe(false)
  })

  it('shows incorrect-credentials banner on 401, keeps email, and clears password', async () => {
    vi.spyOn(authApi, 'login').mockRejectedValueOnce(
      new ApiError('Unauthorized', 401, { title: 'Unauthorized', status: 401 }),
    )

    const router = await createTestRouter('/login')

    const wrapper = mount(AuthPage, {
      global: {
        plugins: [createPinia(), router],
        stubs: quasarStubs,
      },
    })

    const emailInput = wrapper.find('input#login-email')
    const passwordInput = wrapper.find('input#login-password')

    await emailInput.setValue('owner@karoo.co.za')
    await passwordInput.setValue('WrongPass!123')
    await wrapper.find('[data-testid="login-form"]').trigger('submit')
    await flushPromises()

    const banner = wrapper.find('[data-testid="login-banner"]')
    expect(banner.exists()).toBe(true)
    expect(banner.text()).toContain('Email or password is incorrect.')
    expect((emailInput.element as HTMLInputElement).value).toBe('owner@karoo.co.za')
    expect((passwordInput.element as HTMLInputElement).value).toBe('')
  })

  it('shows the verify-first info banner on 403 without any resend button', async () => {
    vi.spyOn(authApi, 'login').mockRejectedValueOnce(
      new ApiError('Forbidden', 403, { title: 'Email not verified', status: 403 }),
    )

    const router = await createTestRouter('/login')

    const wrapper = mount(AuthPage, {
      global: {
        plugins: [createPinia(), router],
        stubs: quasarStubs,
      },
    })

    await wrapper.find('input#login-email').setValue('unverified@karoo.co.za')
    await wrapper.find('input#login-password').setValue('ValidPass!123')
    await wrapper.find('[data-testid="login-form"]').trigger('submit')
    await flushPromises()

    const banner = wrapper.find('[data-testid="login-banner"]')
    expect(banner.exists()).toBe(true)
    expect(banner.classes()).toContain('auth-banner--info')
    expect(banner.text()).toContain(
      'Please verify your email first. We sent a link to unverified@karoo.co.za.',
    )
    expect(wrapper.text().toLowerCase()).not.toContain('resend')
  })

  it('replaces the registration form with the Check your inbox state on 201', async () => {
    vi.spyOn(authApi, 'register').mockResolvedValueOnce({
      userId: '11111111-1111-1111-1111-111111111111',
      businessId: '22222222-2222-2222-2222-222222222222',
      email: 'thabo@karoostudio.co.za',
      role: 'Owner',
      emailVerified: false,
    })

    const router = await createTestRouter('/register')

    const wrapper = mount(AuthPage, {
      global: {
        plugins: [createPinia(), router],
        stubs: quasarStubs,
      },
    })

    await wrapper.find('input#register-business-name').setValue('Karoo Studio (Pty) Ltd')
    await wrapper.find('input#register-first-name').setValue('Thabo')
    await wrapper.find('input#register-last-name').setValue('Mokoena')
    await wrapper.find('input#register-email').setValue('thabo@karoostudio.co.za')
    await wrapper.find('input#register-password').setValue('StrongPass!2026')
    await wrapper.find('input#register-confirm-password').setValue('StrongPass!2026')

    await wrapper.find('[data-testid="register-form"]').trigger('submit')
    await flushPromises()

    const inboxState = wrapper.find('[data-testid="check-inbox-state"]')
    expect(inboxState.exists()).toBe(true)
    expect(inboxState.text()).toContain('thabo@karoostudio.co.za')
  })
})
