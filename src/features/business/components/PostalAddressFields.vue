<template>
  <AddressFields
    :model-value="modelValue"
    :errors="errors"
    :disable="Boolean(disable)"
    :id-prefix="idPrefix ?? 'addr'"
    field-prefix="address"
    @update:model-value="emit('update:modelValue', $event)"
    @postal-error="emit('postalError', $event)"
  />
</template>

<script setup lang="ts">
import type { AddressDraft } from 'src/features/business/validation'
import AddressFields from 'src/shared/components/AddressFields.vue'

withDefaults(
  defineProps<{
    modelValue: AddressDraft
    errors: Record<string, string>
    disable?: boolean
    idPrefix?: string
  }>(),
  {
    disable: false,
    idPrefix: 'addr',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: AddressDraft]
  postalError: [message: string | undefined]
}>()
</script>
