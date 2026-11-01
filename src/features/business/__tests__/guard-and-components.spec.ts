import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from 'src/features/auth/store'
import { createAuthNavigationGuard } from 'src/router/guards'
import routes from 'src/router/routes'
import { ApiError } from 'src/shared/api/problem'
import { businessApi, type BusinessDetails } from '../api'
import BankDetailsFields from '../components/BankDetailsFields.vue'
import PostalAddressFields from '../components/PostalAddressFields.vue'
import SettingsPage from '../pages/SettingsPage.vue'
import { useBusinessStore } from '../store'
import type { AddressDraft, BankDraft } from '../validation'

const incompleteProfile: BusinessDetails = {
  businessId: 'b-1',
  name: 'Karoo Studio (Pty) Ltd',
  registrationNumber: null,
  vatNumber: null,
  supportEmail: null,
  contactNumber: null,
  address: null,
  bankDetails: null,
  hasLogo: false,
  version: 'v1',
}

const quasarStubs = {
  'q-page': defineComponent({
    name: 'QPage',
    template: '<div class="q-page"><slot /></div>',
  }),
  'q-tabs': defineComponent({
    name: 'QTabs',
    template: '<div class="q-tabs"><slot /></div>',
  }),
  'q-tab': defineComponent({
    name: 'QTab',
    template: '<button type="button" />',
  }),
  'q-icon': defineComponent({
    name: 'QIcon',
    props: ['name'],
    template: '<span class="q-icon">{{ name }}</span>',
  }),
  'q-btn': defineComponent({
    name: 'QBtn',
    props: ['label', 'disable', 'loading'],
    emits: ['click'],
    template:
      '<button type="button" :disabled="disable || loading" @click="$emit(\'click\')">{{ label }}</button>',
  }),
  'q-input': defineComponent({
    name: 'QInput',
    inheritAttrs: false,
    props: {
      modelValue: { type: [String, Number], default: '' },
      id: { type: String, default: undefined },
      error: { type: Boolean, default: false },
      errorMessage: { type: String, default: undefined },
      disable: { type: Boolean, default: false },
      readonly: { type: Boolean, default: false },
    },
    emits: ['update:modelValue'],
    template: `
      <div class="q-input-stub">
        <input
          :id="id"
          :value="modelValue"
          :disabled="disable"
          :readonly="readonly"
          v-bind="$attrs"
          @input="$emit('update:modelValue', $event.target.value)"
        />
        <span v-if="error && errorMessage" class="q-field-error">{{ errorMessage }}</span>
      </div>
    `,
  }),
  'q-select': defineComponent({
    name: 'QSelect',
    inheritAttrs: false,
    props: {
      modelValue: { type: [String, Number], default: '' },
      options: { type: Array, default: () => [] },
      disable: { type: Boolean, default: false },
    },
    emits: ['update:modelValue'],
    template: `
      <select
        :value="modelValue"
        :disabled="disable"
        v-bind="$attrs"
        @change="$emit('update:modelValue', $event.target.value)"
      >
        <option
          v-for="opt in options"
          :key="opt.value ?? opt"
          :value="opt.value ?? opt"
        >
          {{ opt.label ?? opt }}
        </option>
      </select>
    `,
  }),
}

describe('business setup guard, banking, postal code, and staff settings', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('redirects an Owner with an incomplete profile to /setup once per session, and does not redirect staff', async () => {
    const sessionStore = useSessionStore()
    const businessStore = useBusinessStore()

    businessStore.profile = { ...incompleteProfile }
    businessStore.status = 'ready'

    sessionStore.setSessionFromLogin({
      jwtToken: 'owner-jwt',
      refreshToken: 'owner-refresh',
      expiresIn: 900,
      userId: 'u-owner',
      businessId: 'b-1',
      role: 'Owner',
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes,
    })
    router.beforeEach(createAuthNavigationGuard(sessionStore, businessStore))

    // First navigation for Owner with incomplete profile goes to /setup
    await router.push('/dashboard')
    await router.isReady()
    expect(router.currentRoute.value.path).toBe('/setup')

    // Second navigation in the same session stays on /dashboard
    await router.push('/dashboard')
    expect(router.currentRoute.value.path).toBe('/dashboard')

    // Staff (Accountant) with incomplete profile is NOT redirected to /setup, and is bounced from /setup to /dashboard
    sessionStorage.clear()
    sessionStore.setSessionFromLogin({
      jwtToken: 'staff-jwt',
      refreshToken: 'staff-refresh',
      expiresIn: 900,
      userId: 'u-staff',
      businessId: 'b-1',
      role: 'Accountant',
    })

    await router.push('/invoices')
    expect(router.currentRoute.value.path).toBe('/invoices')

    await router.push('/setup')
    expect(router.currentRoute.value.path).toBe('/dashboard')
  })

  it('fills the branch code automatically when a bank is selected', async () => {
    const draft = ref<BankDraft>({
      bankName: '',
      accountHolder: 'Karoo Studio (Pty) Ltd',
      accountNumber: '',
      accountType: 'Cheque',
      branchCode: '',
      branchName: '',
    })

    const wrapper = mount(BankDetailsFields, {
      props: {
        modelValue: draft.value,
        banks: [
          { value: 'FNB', label: 'First National Bank', branchCode: '250655' },
          { value: 'Standard Bank', label: 'Standard Bank', branchCode: '051001' },
        ],
        accountTypes: [{ value: 'Cheque', label: 'Cheque' }],
        errors: {},
        'onUpdate:modelValue': (val: BankDraft) => {
          draft.value = val
          void wrapper.setProps({ modelValue: val })
        },
      },
      global: {
        stubs: quasarStubs,
      },
    })

    const selectEl = wrapper.find('[data-testid="bank-name-select"]')
    await selectEl.setValue('FNB')
    await flushPromises()

    expect(draft.value.bankName).toBe('FNB')
    expect(draft.value.branchCode).toBe('250655')
  })

  it('fills suburb and city on a single postal code match and shows Unknown postal code on 404', async () => {
    vi.spyOn(businessApi, 'lookupPostalCode')
      .mockResolvedValueOnce([
        { code: '8001', suburb: 'City Centre', town: 'Cape Town', kind: 'Street' },
      ])
      .mockRejectedValueOnce(new ApiError('Not Found', 404))

    const draft = ref<AddressDraft>({
      line1: '14 Bree Street',
      line2: '',
      suburb: '',
      city: '',
      postalCode: '',
    })

    const wrapper = mount(PostalAddressFields, {
      props: {
        modelValue: draft.value,
        errors: {},
        'onUpdate:modelValue': (val: AddressDraft) => {
          draft.value = val
          void wrapper.setProps({ modelValue: val })
        },
      },
      global: {
        stubs: quasarStubs,
      },
    })

    const postalInput = wrapper.find('[data-testid="address-postal-code"]')
    await postalInput.setValue('8001')
    await flushPromises()

    expect(draft.value.suburb).toBe('City Centre')
    expect(draft.value.city).toBe('Cape Town')

    await postalInput.setValue('9999')
    await flushPromises()

    expect(wrapper.find('.q-field-error').text()).toBe('Unknown postal code')
  })

  it('shows SettingsPage as read-only for staff with disabled inputs and no Save buttons', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const sessionStore = useSessionStore()
    sessionStore.setSessionFromLogin({
      jwtToken: 'staff-jwt',
      refreshToken: 'staff-refresh',
      expiresIn: 900,
      userId: 'u-staff',
      businessId: 'b-1',
      role: 'Accountant',
    })

    const businessStore = useBusinessStore()
    businessStore.profile = { ...incompleteProfile }
    businessStore.settings = {
      defaultPaymentTermsDays: 30,
      timeZone: 'Africa/Johannesburg',
      version: 'v1',
    }
    businessStore.status = 'ready'

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/settings', component: SettingsPage }],
    })
    await router.push('/settings')
    await router.isReady()

    const qMock = {
      screen: { lt: { md: false }, gt: { sm: true }, xs: false },
      notify: vi.fn(),
    }

    const RootWrapper = defineComponent({
      template: '<router-view />',
    })

    const wrapper = mount(RootWrapper, {
      global: {
        plugins: [pinia, router],
        stubs: quasarStubs,
        provide: {
          _q_: qMock,
        },
        mocks: {
          $q: qMock,
        },
      },
    })

    await flushPromises()

    expect(wrapper.find('[data-testid="settings-readonly-note"]').text()).toContain(
      'Only the business owner can change these settings.',
    )
    expect(wrapper.find('[data-testid="settings-business-save"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="settings-defaults-save"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="settings-logo-save"]').exists()).toBe(false)

    const nameInput = wrapper.find('input#settings-name')
    expect((nameInput.element as HTMLInputElement).disabled).toBe(true)
  })
})
