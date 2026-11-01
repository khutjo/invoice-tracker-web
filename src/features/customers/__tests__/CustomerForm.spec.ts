import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from 'src/shared/api/problem'
import { customersApi, type CustomerDetails } from '../api'
import CustomerForm from '../components/CustomerForm.vue'

const sampleCustomer: CustomerDetails = {
  customerId: 'c-100',
  name: 'Highveld Logistics (Pty) Ltd',
  email: 'accounts@highveld.co.za',
  contactNumber: {
    number: '+27821234567',
    type: 'Mobile',
  },
  billingAddress: {
    line1: '14 Bree Street',
    line2: null,
    suburb: 'City Centre',
    city: 'Cape Town',
    postalCode: '8001',
  },
  vatNumber: '4123456789',
  customerReference: 'ACC-100',
  isArchived: false,
  version: 'v-loaded-1',
}

const quasarStubs = {
  'q-dialog': defineComponent({
    name: 'QDialog',
    props: ['modelValue'],
    template: '<div v-if="modelValue" class="q-dialog"><slot /></div>',
  }),
  'q-card': defineComponent({
    name: 'QCard',
    template: '<div class="q-card"><slot /></div>',
  }),
  'q-icon': defineComponent({
    name: 'QIcon',
    props: ['name'],
    template: '<span class="q-icon">{{ name }}</span>',
  }),
  'q-btn': defineComponent({
    name: 'QBtn',
    props: ['label', 'type', 'disable', 'loading'],
    emits: ['click'],
    template:
      '<button :type="type || \'button\'" :disabled="disable || loading" @click="$emit(\'click\', $event)">{{ label }}</button>',
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
    },
    emits: ['update:modelValue'],
    template: `
      <div class="q-input-stub">
        <input
          :id="id"
          :value="modelValue"
          :disabled="disable"
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

const qMock = {
  screen: { xs: false },
  notify: vi.fn(),
}

function mountCustomerForm(customer: CustomerDetails | null = null) {
  const pinia = createPinia()
  setActivePinia(pinia)

  return mount(CustomerForm, {
    props: {
      modelValue: true,
      customer,
    },
    global: {
      plugins: [pinia],
      stubs: quasarStubs,
      provide: { _q_: qMock },
      mocks: { $q: qMock },
    },
  })
}

describe('CustomerForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('blocks submit with missing email, bad phone number, or half-filled address, and accepts only name and email', async () => {
    const createSpy = vi
      .spyOn(customersApi, 'createCustomer')
      .mockResolvedValue({ ...sampleCustomer, contactNumber: null, billingAddress: null })

    const wrapper = mountCustomerForm(null)

    await wrapper.find('input#cust-name').setValue('Karoo Roasters')

    // Missing email -> blocked
    await wrapper.find('[data-testid="customer-form"]').trigger('submit')
    expect(createSpy).not.toHaveBeenCalled()

    await wrapper.find('input#cust-email').setValue('billing@karooroasters.co.za')

    // Bad phone number -> blocked
    await wrapper.find('[data-testid="add-contact-number-btn"]').trigger('click')
    await wrapper.find('input#cust-phone-number').setValue('082123')
    await wrapper.find('[data-testid="customer-form"]').trigger('submit')
    expect(createSpy).not.toHaveBeenCalled()

    // Remove bad phone, add half-filled address -> blocked
    await wrapper.find('[data-testid="remove-contact-number-btn"]').trigger('click')
    await wrapper.find('[data-testid="add-billing-address-btn"]').trigger('click')
    await wrapper.find('input#cust-addr-line1').setValue('10 Main Road')
    await wrapper.find('[data-testid="customer-form"]').trigger('submit')
    expect(createSpy).not.toHaveBeenCalled()

    // Remove half-filled address -> only name and email remain -> accepted!
    await wrapper.find('[data-testid="remove-billing-address-btn"]').trigger('click')
    await wrapper.find('[data-testid="customer-form"]').trigger('submit')
    await flushPromises()

    expect(createSpy).toHaveBeenCalledWith({
      name: 'Karoo Roasters',
      email: 'billing@karooroasters.co.za',
      customerReference: null,
      vatNumber: null,
      contactNumber: null,
      billingAddress: null,
    })
  })

  it('sends contactNumber: null after clicking Remove in Edit mode along with the loaded version', async () => {
    const updateSpy = vi
      .spyOn(customersApi, 'updateCustomer')
      .mockResolvedValue({ ...sampleCustomer, contactNumber: null, version: 'v-loaded-2' })

    const wrapper = mountCustomerForm(sampleCustomer)

    await wrapper.find('[data-testid="remove-contact-number-btn"]').trigger('click')
    await wrapper.find('[data-testid="customer-form"]').trigger('submit')
    await flushPromises()

    expect(updateSpy).toHaveBeenCalledWith('c-100', {
      name: 'Highveld Logistics (Pty) Ltd',
      email: 'accounts@highveld.co.za',
      customerReference: 'ACC-100',
      vatNumber: '4123456789',
      contactNumber: null,
      billingAddress: {
        line1: '14 Bree Street',
        line2: null,
        suburb: 'City Centre',
        city: 'Cape Town',
        postalCode: '8001',
      },
      version: 'v-loaded-1',
    })
  })

  it('displays a 400 billingAddress.postalCode error under the postal code field', async () => {
    vi.spyOn(customersApi, 'updateCustomer').mockRejectedValueOnce(
      new ApiError('Validation failed', 400, {
        title: 'One or more validation errors occurred.',
        status: 400,
        errors: {
          'BillingAddress.PostalCode': ['Postal code 8001 does not match suburb.'],
        },
      }),
    )

    const wrapper = mountCustomerForm(sampleCustomer)
    await wrapper.find('[data-testid="customer-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Postal code 8001 does not match suburb.')
  })

  it('shows the reload banner on a 409 stale-version response and closes the form on a 409 archived response', async () => {
    vi.spyOn(customersApi, 'updateCustomer')
      .mockRejectedValueOnce(
        new ApiError('Conflict', 409, {
          title: 'The customer was changed by someone else.',
          status: 409,
        }),
      )
      .mockRejectedValueOnce(
        new ApiError('Conflict', 409, {
          title: 'Archived customers cannot be edited.',
          status: 409,
        }),
      )

    const wrapper = mountCustomerForm(sampleCustomer)

    // 1. Stale version 409 -> shows reload banner
    await wrapper.find('[data-testid="customer-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="customer-conflict-banner"]').exists()).toBe(true)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    // 2. Archived 409 -> closes form and emits archivedElsewhere
    await wrapper.find('[data-testid="customer-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('archivedElsewhere')?.[0]).toEqual(['c-100'])
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })
})
