import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import VerifyEmailPage from '../pages/VerifyEmailPage.vue'
import { authApi } from '../api'
import { ApiError } from 'src/shared/api/problem'

const quasarStubs = {
  'q-page': defineComponent({
    name: 'QPage',
    template: '<div class="q-page"><slot /></div>',
  }),
  'q-skeleton': defineComponent({
    name: 'QSkeleton',
    template: '<div class="q-skeleton" />',
  }),
  'q-icon': defineComponent({
    name: 'QIcon',
    props: ['name'],
    template: '<span class="q-icon">{{ name }}</span>',
  }),
  'q-btn': defineComponent({
    name: 'QBtn',
    props: ['label', 'to'],
    template: '<a :href="to" class="q-btn">{{ label }}</a>',
  }),
}

async function mountAtVerifyUrl(fullUrl: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/verify-email', component: VerifyEmailPage },
      { path: '/login', component: { template: '<div>Login</div>' } },
    ],
  })
  await router.push(fullUrl)
  await router.isReady()

  return mount(VerifyEmailPage, {
    global: {
      plugins: [router],
      stubs: quasarStubs,
    },
  })
}

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('posts userId and token from query params and shows verified state + login button on 204', async () => {
    const verifySpy = vi.spyOn(authApi, 'verifyEmail').mockResolvedValueOnce(undefined)

    const wrapper = await mountAtVerifyUrl(
      '/verify-email?userId=fe2de4e9-9529-4a10-8111-123456789abc&token=Q2ZESjhNdHNUK123',
    )
    await flushPromises()

    expect(verifySpy).toHaveBeenCalledWith({
      userId: 'fe2de4e9-9529-4a10-8111-123456789abc',
      token: 'Q2ZESjhNdHNUK123',
    })

    expect(wrapper.find('[data-testid="verify-success-heading"]').text()).toBe(
      'Your email is verified.',
    )
    const signInBtn = wrapper.find('[data-testid="verify-signin-btn"]')
    expect(signInBtn.exists()).toBe(true)
    expect(signInBtn.attributes('href')).toBe('/login')
  })

  it('displays ProblemDetails title and login button when backend returns 400', async () => {
    vi.spyOn(authApi, 'verifyEmail').mockRejectedValueOnce(
      new ApiError('The verification link is invalid or has expired.', 400, {
        type: 'https://tools.ietf.org/html/rfc9110#section-15.5.1',
        title: 'The verification link is invalid or has expired.',
        status: 400,
      }),
    )

    const wrapper = await mountAtVerifyUrl(
      '/verify-email?userId=fe2de4e9-9529-4a10-8111-123456789abc&token=expiredToken',
    )
    await flushPromises()

    expect(wrapper.find('[data-testid="verify-error-heading"]').text()).toBe(
      'The verification link is invalid or has expired.',
    )
    const backBtn = wrapper.find('[data-testid="verify-back-link"]')
    expect(backBtn.exists()).toBe(true)
    expect(backBtn.attributes('href')).toBe('/login')
  })

  it('shows invalid link message and login button without calling API when query params are missing', async () => {
    const verifySpy = vi.spyOn(authApi, 'verifyEmail')

    const wrapper = await mountAtVerifyUrl('/verify-email?userId=fe2de4e9-9529')
    await flushPromises()

    expect(verifySpy).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="verify-error-heading"]').text()).toBe(
      'The verification link is invalid or has expired.',
    )
    expect(wrapper.find('[data-testid="verify-back-link"]').attributes('href')).toBe('/login')
  })
})
