<template>
  <div class="postal-address-fields">
    <div class="auth-field postal-address-fields__field">
      <label class="field-label" :for="`${idPrefix}-line1`">Street address line 1</label>
      <q-input
        :id="`${idPrefix}-line1`"
        :model-value="modelValue.line1"
        type="text"
        maxlength="200"
        placeholder="e.g. 14 Bree Street"
        :disable="Boolean(disable)"
        :error="Boolean(fieldError('line1'))"
        :error-message="fieldError('line1')"
        data-testid="address-line1"
        @update:model-value="updateField('line1', String($event ?? ''))"
      />
    </div>

    <div class="auth-field postal-address-fields__field">
      <label class="field-label" :for="`${idPrefix}-line2`">
        Address line 2 <span class="field-optional">(optional)</span>
      </label>
      <q-input
        :id="`${idPrefix}-line2`"
        :model-value="modelValue.line2"
        type="text"
        maxlength="200"
        placeholder="Suite, floor or building"
        :disable="Boolean(disable)"
        :error="Boolean(fieldError('line2'))"
        :error-message="fieldError('line2')"
        data-testid="address-line2"
        @update:model-value="updateField('line2', String($event ?? ''))"
      />
    </div>

    <div class="auth-field postal-address-fields__field">
      <label class="field-label" :for="`${idPrefix}-suburb`">Suburb</label>
      <q-select
        v-if="suburbMatches.length > 1 && !disable"
        :for="`${idPrefix}-suburb`"
        :model-value="modelValue.suburb"
        :options="suburbSelectOptions"
        emit-value
        map-options
        placeholder="Select suburb"
        :error="Boolean(fieldError('suburb'))"
        :error-message="fieldError('suburb')"
        data-testid="address-suburb-select"
        @update:model-value="onSuburbSelect(String($event ?? ''))"
      />
      <q-input
        v-else
        :id="`${idPrefix}-suburb`"
        :model-value="modelValue.suburb"
        type="text"
        maxlength="100"
        placeholder="Suburb"
        :disable="Boolean(disable)"
        :error="Boolean(fieldError('suburb'))"
        :error-message="fieldError('suburb')"
        data-testid="address-suburb"
        @update:model-value="updateField('suburb', String($event ?? ''))"
      />
    </div>

    <div class="auth-field postal-address-fields__field">
      <label class="field-label" :for="`${idPrefix}-city`">City / Town</label>
      <q-input
        :id="`${idPrefix}-city`"
        :model-value="modelValue.city"
        type="text"
        maxlength="100"
        placeholder="City or town"
        :disable="Boolean(disable)"
        :error="Boolean(fieldError('city'))"
        :error-message="fieldError('city')"
        data-testid="address-city"
        @update:model-value="updateField('city', String($event ?? ''))"
      />
    </div>

    <div class="auth-field postal-address-fields__field postal-address-fields__field--postal">
      <label class="field-label" :for="`${idPrefix}-postal-code`">Postal code</label>
      <q-input
        :id="`${idPrefix}-postal-code`"
        :model-value="modelValue.postalCode"
        type="text"
        inputmode="numeric"
        maxlength="4"
        placeholder="e.g. 8001"
        :loading="lookingUp"
        :disable="Boolean(disable)"
        :error="Boolean(postalCodeError)"
        :error-message="postalCodeError"
        data-testid="address-postal-code"
        @update:model-value="onPostalCodeInput(String($event ?? ''))"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { businessApi, type PostalCodeOption } from 'src/features/business/api'
import type { AddressDraft } from 'src/features/business/validation'
import { ApiError } from 'src/shared/api/problem'

const props = withDefaults(
  defineProps<{
    modelValue: AddressDraft
    errors: Record<string, string>
    disable?: boolean
    idPrefix?: string
    fieldPrefix?: string
  }>(),
  {
    disable: false,
    idPrefix: 'addr',
    fieldPrefix: 'address',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: AddressDraft]
  postalError: [message: string | undefined]
}>()

const lookingUp = ref(false)
const lookupError = ref<string | undefined>(undefined)
const suburbMatches = ref<PostalCodeOption[]>([])

function fieldError(field: keyof AddressDraft): string | undefined {
  return props.errors[`${props.fieldPrefix}.${field}`] || props.errors[field]
}

const postalCodeError = computed(() => lookupError.value || fieldError('postalCode'))

const suburbSelectOptions = computed(() =>
  suburbMatches.value.map((m) => ({
    value: m.suburb,
    label: `${m.suburb} (${m.town})`,
  })),
)

function updateField<K extends keyof AddressDraft>(key: K, value: AddressDraft[K]) {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value,
  })
}

async function onPostalCodeInput(rawCode: string) {
  const code = rawCode.trim()
  lookupError.value = undefined
  emit('postalError', undefined)

  const updated: AddressDraft = {
    ...props.modelValue,
    postalCode: rawCode,
  }
  emit('update:modelValue', updated)

  if (!/^\d{4}$/.test(code)) {
    suburbMatches.value = []
    return
  }

  lookingUp.value = true
  try {
    const matches = await businessApi.lookupPostalCode(code)
    if (!matches || matches.length === 0) {
      suburbMatches.value = []
      lookupError.value = 'Unknown postal code'
      emit('postalError', 'Unknown postal code')
      return
    }

    if (matches.length === 1) {
      const single = matches[0]!
      suburbMatches.value = []
      emit('update:modelValue', {
        ...updated,
        postalCode: code,
        suburb: single.suburb,
        city: single.town,
      })
    } else {
      suburbMatches.value = matches
      const first = matches[0]!
      emit('update:modelValue', {
        ...updated,
        postalCode: code,
        suburb: '',
        city: first.town,
      })
    }
  } catch (err) {
    suburbMatches.value = []
    if (err instanceof ApiError && err.status === 404) {
      lookupError.value = 'Unknown postal code'
      emit('postalError', 'Unknown postal code')
    }
  } finally {
    lookingUp.value = false
  }
}

function onSuburbSelect(selectedSuburb: string) {
  const matched = suburbMatches.value.find((m) => m.suburb === selectedSuburb)
  emit('update:modelValue', {
    ...props.modelValue,
    suburb: selectedSuburb,
    city: matched ? matched.town : props.modelValue.city,
  })
}
</script>

<style scoped lang="scss">
.postal-address-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 100%;

  &__field {
    width: 100%;
    max-width: 480px;
    min-width: 0;

    &--postal {
      max-width: 180px;
    }
  }

  :deep(.q-field) {
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }

  :deep(.q-field__native) {
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.field-optional {
  font-weight: 400;
  color: var(--text-muted);
}
</style>
