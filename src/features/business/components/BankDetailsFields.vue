<template>
  <div class="bank-details-fields">
    <div class="bank-details-fields__row">
      <div class="auth-field">
        <label class="field-label" :for="`${idPrefix}-bank-name`">Bank</label>
        <q-select
          :for="`${idPrefix}-bank-name`"
          :model-value="modelValue.bankName"
          :options="bankSelectOptions"
          emit-value
          map-options
          placeholder="Select bank"
          :disable="Boolean(disable)"
          :error="Boolean(errors['bankDetails.bankName'])"
          :error-message="errors['bankDetails.bankName']"
          data-testid="bank-name-select"
          @update:model-value="onBankChange(String($event ?? ''))"
        />
      </div>

      <div class="auth-field">
        <div class="bank-details-fields__label-row">
          <label class="field-label" :for="`${idPrefix}-branch-code`">Branch code</label>
          <button
            v-if="!disable && !branchCodeEditable"
            type="button"
            class="bank-details-fields__edit-btn"
            data-testid="branch-code-edit-btn"
            @click="branchCodeEditable = true"
          >
            Edit
          </button>
        </div>
        <q-input
          :id="`${idPrefix}-branch-code`"
          :model-value="modelValue.branchCode"
          type="text"
          inputmode="numeric"
          maxlength="6"
          placeholder="6 digits"
          :readonly="!branchCodeEditable"
          :disable="Boolean(disable)"
          :error="Boolean(errors['bankDetails.branchCode'])"
          :error-message="errors['bankDetails.branchCode']"
          data-testid="bank-branch-code"
          @update:model-value="updateField('branchCode', String($event ?? ''))"
        />
      </div>
    </div>

    <div class="bank-details-fields__row">
      <div class="auth-field">
        <label class="field-label" :for="`${idPrefix}-account-holder`"> Account holder </label>
        <q-input
          :id="`${idPrefix}-account-holder`"
          :model-value="modelValue.accountHolder"
          type="text"
          maxlength="200"
          placeholder="Registered business or account name"
          :disable="Boolean(disable)"
          :error="Boolean(errors['bankDetails.accountHolder'])"
          :error-message="errors['bankDetails.accountHolder']"
          data-testid="bank-account-holder"
          @update:model-value="updateField('accountHolder', String($event ?? ''))"
        />
      </div>

      <div class="auth-field">
        <label class="field-label" :for="`${idPrefix}-account-type`">Account type</label>
        <q-select
          :for="`${idPrefix}-account-type`"
          :model-value="modelValue.accountType"
          :options="accountTypes"
          emit-value
          map-options
          placeholder="Select account type"
          :disable="Boolean(disable)"
          :error="Boolean(errors['bankDetails.accountType'])"
          :error-message="errors['bankDetails.accountType']"
          data-testid="bank-account-type"
          @update:model-value="
            updateField('accountType', String($event ?? 'Cheque') as BankAccountType)
          "
        />
      </div>
    </div>

    <div class="bank-details-fields__row">
      <div class="auth-field">
        <label class="field-label" :for="`${idPrefix}-account-number`"> Account number </label>
        <q-input
          :id="`${idPrefix}-account-number`"
          :model-value="modelValue.accountNumber"
          type="text"
          inputmode="numeric"
          maxlength="16"
          placeholder="6 to 16 digits"
          :disable="Boolean(disable)"
          :error="Boolean(errors['bankDetails.accountNumber'])"
          :error-message="errors['bankDetails.accountNumber']"
          data-testid="bank-account-number"
          @update:model-value="updateField('accountNumber', String($event ?? ''))"
        />
      </div>

      <div class="auth-field">
        <label class="field-label" :for="`${idPrefix}-branch-name`">
          Branch name <span class="field-optional">(optional)</span>
        </label>
        <q-input
          :id="`${idPrefix}-branch-name`"
          :model-value="modelValue.branchName"
          type="text"
          maxlength="100"
          placeholder="e.g. Universal Branch"
          :disable="Boolean(disable)"
          :error="Boolean(errors['bankDetails.branchName'])"
          :error-message="errors['bankDetails.branchName']"
          data-testid="bank-branch-name"
          @update:model-value="updateField('branchName', String($event ?? ''))"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { BankAccountType, BankLookupOption, LookupOption } from 'src/features/business/api'
import type { BankDraft } from 'src/features/business/validation'

const props = withDefaults(
  defineProps<{
    modelValue: BankDraft
    banks: BankLookupOption[]
    accountTypes: LookupOption[]
    errors: Record<string, string>
    disable?: boolean
    idPrefix?: string
  }>(),
  {
    disable: false,
    idPrefix: 'bank',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: BankDraft]
}>()

const branchCodeEditable = ref(false)

const bankSelectOptions = computed(() =>
  props.banks.map((b) => ({
    value: b.value,
    label: b.label,
  })),
)

function updateField<K extends keyof BankDraft>(key: K, value: BankDraft[K]) {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value,
  })
}

function onBankChange(selectedBankValue: string) {
  const matchedBank = props.banks.find(
    (b) => b.value === selectedBankValue || b.label === selectedBankValue,
  )
  branchCodeEditable.value = false
  emit('update:modelValue', {
    ...props.modelValue,
    bankName: selectedBankValue,
    branchCode: matchedBank ? matchedBank.branchCode : props.modelValue.branchCode,
  })
}
</script>

<style scoped lang="scss">
.bank-details-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;

  &__row {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;

    @media (min-width: 600px) {
      grid-template-columns: 1fr 1fr;
    }
  }

  &__label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;

    .field-label {
      margin-bottom: 0;
    }
  }

  &__edit-btn {
    border: none;
    background: transparent;
    padding: 0 4px;
    font-size: 12px;
    font-weight: 500;
    color: var(--accent-primary);
    cursor: pointer;
    font-family: inherit;

    &:hover {
      text-decoration: underline;
    }
  }
}

.field-optional {
  font-weight: 400;
  color: var(--text-muted);
}
</style>
