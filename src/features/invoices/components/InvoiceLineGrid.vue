<template>
  <div class="invoice-line-grid" data-testid="invoice-line-grid">
    <!-- Top-level lines error -->
    <div v-if="errors?.lines" role="alert" class="line-grid-banner">
      {{ errors?.lines }}
    </div>

    <!-- Empty lines state -->
    <div v-if="modelValue.length === 0" class="line-grid-empty" data-testid="line-grid-empty">
      <p class="line-grid-empty__text">
        No line items yet. Add a line item to calculate invoice totals.
      </p>
      <q-btn
        outline
        color="primary"
        icon="add"
        label="Add line"
        :disable="disable"
        data-testid="add-line-empty-btn"
        @click="addLine"
      />
    </div>

    <!-- Mobile Stacked Cards (xs < 600px) -->
    <div v-else-if="isMobile" class="line-cards-mobile" data-testid="line-cards-mobile">
      <div
        v-for="(line, index) in modelValue"
        :key="line.localId"
        class="attio-card line-mobile-card"
        :data-testid="`line-row-${index}`"
      >
        <div class="line-mobile-card__header">
          <span class="line-mobile-card__index tabular-nums">Line #{{ index + 1 }}</span>
          <div class="line-mobile-card__actions">
            <q-btn
              flat
              dense
              round
              icon="arrow_upward"
              size="sm"
              aria-label="Move line up"
              :disable="disable || index === 0"
              :data-testid="`line-move-up-${index}`"
              @click="moveLine(index, -1)"
            />
            <q-btn
              flat
              dense
              round
              icon="arrow_downward"
              size="sm"
              aria-label="Move line down"
              :disable="disable || index === modelValue.length - 1"
              :data-testid="`line-move-down-${index}`"
              @click="moveLine(index, 1)"
            />
            <q-btn
              flat
              dense
              round
              color="negative"
              icon="delete_outline"
              size="sm"
              aria-label="Remove line"
              :disable="disable"
              :data-testid="`line-remove-${index}`"
              @click="removeLine(index)"
            />
          </div>
        </div>

        <div class="line-cell">
          <label class="field-label" :for="`line-desc-m-${index}`">Description</label>
          <input
            :id="`line-desc-m-${index}`"
            :value="line.description"
            type="text"
            maxlength="500"
            placeholder="e.g. Call-out fee or consulting"
            class="line-input"
            :class="{ 'line-input--error': Boolean(cellError(index, 'description')) }"
            :disabled="disable"
            :data-testid="`line-description-${index}`"
            @input="
              updateLine(index, {
                description: ($event.target as HTMLInputElement).value,
              })
            "
          />
          <div
            v-if="cellError(index, 'description')"
            class="line-cell__error"
            :data-testid="`line-error-${index}-description`"
          >
            {{ cellError(index, 'description') }}
          </div>
        </div>

        <div class="line-mobile-card__nums">
          <div class="line-cell">
            <label class="field-label" :for="`line-qty-m-${index}`">Qty</label>
            <input
              :id="`line-qty-m-${index}`"
              :value="line.quantity"
              type="number"
              step="0.001"
              min="0.001"
              max="1000000"
              class="line-input line-input--num tabular-nums"
              :class="{ 'line-input--error': Boolean(cellError(index, 'quantity')) }"
              :disabled="disable"
              :data-testid="`line-quantity-${index}`"
              @input="onNumericFieldInput(index, 'quantity', $event)"
              @blur="onNumericFieldBlur(index, 'quantity', 1, $event)"
            />
            <div
              v-if="cellError(index, 'quantity')"
              class="line-cell__error"
              :data-testid="`line-error-${index}-quantity`"
            >
              {{ cellError(index, 'quantity') }}
            </div>
          </div>

          <div class="line-cell">
            <label class="field-label" :for="`line-price-m-${index}`">
              Unit price (excl. VAT)
            </label>
            <input
              :id="`line-price-m-${index}`"
              :value="line.unitPrice"
              type="number"
              step="0.01"
              min="0"
              max="100000000"
              class="line-input line-input--num tabular-nums"
              :class="{ 'line-input--error': Boolean(cellError(index, 'unitPrice')) }"
              :disabled="disable"
              :data-testid="`line-unit-price-${index}`"
              @input="onNumericFieldInput(index, 'unitPrice', $event)"
              @blur="onNumericFieldBlur(index, 'unitPrice', 0, $event)"
            />
            <div
              v-if="cellError(index, 'unitPrice')"
              class="line-cell__error"
              :data-testid="`line-error-${index}-unitPrice`"
            >
              {{ cellError(index, 'unitPrice') }}
            </div>
          </div>

          <div class="line-cell">
            <label class="field-label" :for="`line-vat-m-${index}`">VAT</label>
            <select
              :id="`line-vat-m-${index}`"
              :value="String(line.vatRate)"
              class="line-select tabular-nums"
              :class="{ 'line-input--error': Boolean(cellError(index, 'vatRate')) }"
              :disabled="disable"
              :data-testid="`line-vat-rate-${index}`"
              @change="
                updateLine(index, {
                  vatRate: Number(($event.target as HTMLSelectElement).value),
                })
              "
              @keydown.enter.prevent="onLastCellEnter(index)"
            >
              <option value="0.15">15%</option>
              <option value="0">0%</option>
            </select>
            <div
              v-if="cellError(index, 'vatRate')"
              class="line-cell__error"
              :data-testid="`line-error-${index}-vatRate`"
            >
              {{ cellError(index, 'vatRate') }}
            </div>
          </div>
        </div>

        <div class="line-mobile-card__footer">
          <span class="text-secondary">Line total (excl. VAT)</span>
          <strong class="tabular-nums" :data-testid="`line-total-${index}`">
            {{ formatZar(lineTotalFor(line)) }}
          </strong>
        </div>
      </div>
    </div>

    <!-- Desktop Table (sm+) -->
    <div v-else class="line-table-wrapper" data-testid="line-table-desktop">
      <table class="attio-table line-table">
        <thead>
          <tr>
            <th class="text-left line-table__col-desc">Description</th>
            <th class="text-right line-table__col-qty">Qty</th>
            <th class="text-right line-table__col-price">Unit price (excl. VAT)</th>
            <th class="text-right line-table__col-vat">VAT</th>
            <th class="text-right line-table__col-total">Line total</th>
            <th class="text-right line-table__col-actions" aria-label="Row actions" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(line, index) in modelValue"
            :key="line.localId"
            class="line-table__row"
            :data-testid="`line-row-${index}`"
          >
            <td class="line-table__cell">
              <input
                :id="`line-desc-${index}`"
                :value="line.description"
                type="text"
                maxlength="500"
                placeholder="Description of goods or services"
                aria-label="Description"
                class="line-input"
                :class="{ 'line-input--error': Boolean(cellError(index, 'description')) }"
                :disabled="disable"
                :data-testid="`line-description-${index}`"
                @input="
                  updateLine(index, {
                    description: ($event.target as HTMLInputElement).value,
                  })
                "
              />
              <div
                v-if="cellError(index, 'description')"
                class="line-cell__error"
                :data-testid="`line-error-${index}-description`"
              >
                {{ cellError(index, 'description') }}
              </div>
            </td>

            <td class="line-table__cell">
              <input
                :id="`line-qty-${index}`"
                :value="line.quantity"
                type="number"
                step="0.001"
                min="0.001"
                max="1000000"
                aria-label="Quantity"
                class="line-input line-input--num tabular-nums"
                :class="{ 'line-input--error': Boolean(cellError(index, 'quantity')) }"
                :disabled="disable"
                :data-testid="`line-quantity-${index}`"
                @input="onNumericFieldInput(index, 'quantity', $event)"
                @blur="onNumericFieldBlur(index, 'quantity', 1, $event)"
              />
              <div
                v-if="cellError(index, 'quantity')"
                class="line-cell__error"
                :data-testid="`line-error-${index}-quantity`"
              >
                {{ cellError(index, 'quantity') }}
              </div>
            </td>

            <td class="line-table__cell">
              <input
                :id="`line-price-${index}`"
                :value="line.unitPrice"
                type="number"
                step="0.01"
                min="0"
                max="100000000"
                aria-label="Unit price excluding VAT"
                class="line-input line-input--num tabular-nums"
                :class="{ 'line-input--error': Boolean(cellError(index, 'unitPrice')) }"
                :disabled="disable"
                :data-testid="`line-unit-price-${index}`"
                @input="onNumericFieldInput(index, 'unitPrice', $event)"
                @blur="onNumericFieldBlur(index, 'unitPrice', 0, $event)"
              />
              <div
                v-if="cellError(index, 'unitPrice')"
                class="line-cell__error"
                :data-testid="`line-error-${index}-unitPrice`"
              >
                {{ cellError(index, 'unitPrice') }}
              </div>
            </td>

            <td class="line-table__cell">
              <select
                :id="`line-vat-${index}`"
                :value="String(line.vatRate)"
                aria-label="VAT rate"
                class="line-select tabular-nums"
                :class="{ 'line-input--error': Boolean(cellError(index, 'vatRate')) }"
                :disabled="disable"
                :data-testid="`line-vat-rate-${index}`"
                @change="
                  updateLine(index, {
                    vatRate: Number(($event.target as HTMLSelectElement).value),
                  })
                "
                @keydown.enter.prevent="onLastCellEnter(index)"
              >
                <option value="0.15">15%</option>
                <option value="0">0%</option>
              </select>
              <div
                v-if="cellError(index, 'vatRate')"
                class="line-cell__error"
                :data-testid="`line-error-${index}-vatRate`"
              >
                {{ cellError(index, 'vatRate') }}
              </div>
            </td>

            <td class="line-table__cell line-table__cell--total tabular-nums">
              <span :data-testid="`line-total-${index}`">
                {{ formatZar(lineTotalFor(line)) }}
              </span>
            </td>

            <td class="line-table__cell line-table__cell--actions">
              <div class="line-row-actions">
                <q-btn
                  flat
                  dense
                  round
                  icon="arrow_upward"
                  size="sm"
                  aria-label="Move line up"
                  :disable="disable || index === 0"
                  :data-testid="`line-move-up-${index}`"
                  @click="moveLine(index, -1)"
                />
                <q-btn
                  flat
                  dense
                  round
                  icon="arrow_downward"
                  size="sm"
                  aria-label="Move line down"
                  :disable="disable || index === modelValue.length - 1"
                  :data-testid="`line-move-down-${index}`"
                  @click="moveLine(index, 1)"
                />
                <q-btn
                  flat
                  dense
                  round
                  color="negative"
                  icon="delete_outline"
                  size="sm"
                  aria-label="Remove line"
                  :disable="disable"
                  :data-testid="`line-remove-${index}`"
                  @click="removeLine(index)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Footer Add Line Button -->
    <div v-if="modelValue.length > 0" class="line-grid-footer">
      <q-btn
        outline
        dense
        color="primary"
        icon="add"
        label="Add line"
        :disable="disable || modelValue.length >= 100"
        data-testid="add-line-btn"
        @click="addLine"
      />
      <span class="line-grid-footer__hint">
        Press Enter on the last VAT cell to quickly add another line.
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick } from 'vue'
import { useQuasar } from 'quasar'
import type { InvoiceLineDraft } from '../validation'
import { calculateLinePreview, formatZar } from 'src/shared/money'

const props = withDefaults(
  defineProps<{
    modelValue: InvoiceLineDraft[]
    errors?: Record<string, string>
    disable?: boolean
  }>(),
  {
    errors: () => ({}),
    disable: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [lines: InvoiceLineDraft[]]
}>()

const $q = useQuasar()
const isMobile = computed(() => Boolean($q.screen?.lt?.sm))

let nextLineSeq = 1
function createEmptyLine(): InvoiceLineDraft {
  return {
    localId: `line-${Date.now()}-${nextLineSeq++}`,
    description: '',
    quantity: 1,
    unitPrice: 0,
    vatRate: 0.15,
  }
}

function cellError(
  index: number,
  field: 'description' | 'quantity' | 'unitPrice' | 'vatRate',
): string | undefined {
  return props.errors[`lines[${index}].${field}`]
}

function lineTotalFor(line: InvoiceLineDraft): number {
  return calculateLinePreview(line.quantity, line.unitPrice, line.vatRate).lineTotal
}

function updateLine(index: number, patch: Partial<InvoiceLineDraft>) {
  const updated = props.modelValue.map((item, idx) =>
    idx === index ? { ...item, ...patch } : item,
  )
  emit('update:modelValue', updated)
}

function onNumericFieldInput(index: number, field: 'quantity' | 'unitPrice', event: Event) {
  const raw = (event.target as HTMLInputElement).value
  if (raw === '') {
    return
  }
  const parsed = Number(raw)
  if (Number.isFinite(parsed)) {
    updateLine(index, { [field]: parsed })
  }
}

function onNumericFieldBlur(
  index: number,
  field: 'quantity' | 'unitPrice',
  fallback: number,
  event: Event,
) {
  const target = event.target as HTMLInputElement
  const raw = target.value.trim()
  if (raw === '' || !Number.isFinite(Number(raw))) {
    updateLine(index, { [field]: fallback })
    target.value = String(fallback)
  }
}

async function addLine() {
  if (props.disable || props.modelValue.length >= 100) return
  const newIndex = props.modelValue.length
  const next = [...props.modelValue, createEmptyLine()]
  emit('update:modelValue', next)
  await nextTick()
  const descEl =
    document.getElementById(`line-desc-${newIndex}`) ??
    document.getElementById(`line-desc-m-${newIndex}`)
  descEl?.focus()
}

function removeLine(index: number) {
  if (props.disable) return
  const next = props.modelValue.filter((_, idx) => idx !== index)
  emit('update:modelValue', next)
}

function moveLine(index: number, delta: -1 | 1) {
  if (props.disable) return
  const target = index + delta
  if (target < 0 || target >= props.modelValue.length) return
  const next = [...props.modelValue]
  const current = next[index]
  const swapped = next[target]
  if (!current || !swapped) return
  next[index] = swapped
  next[target] = current
  emit('update:modelValue', next)
}

function onLastCellEnter(index: number) {
  if (index === props.modelValue.length - 1) {
    void addLine()
  }
}
</script>

<style scoped lang="scss">
.invoice-line-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.line-grid-banner {
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--pill-overdue-bg);
  color: var(--pill-overdue-text);
  border: 1px solid var(--pill-overdue-border);
  font-size: 12.5px;
}

.line-grid-empty {
  padding: 24px 16px;
  border: 1px dashed var(--border-strong);
  border-radius: 8px;
  background: var(--bg-surface-subtle);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;

  &__text {
    margin: 0;
    color: var(--text-secondary);
    font-size: 13px;
  }
}

.line-table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--border-hairline);
  border-radius: 8px;
  background: var(--bg-surface);
}

.line-table {
  width: 100%;
  border-collapse: collapse;

  &__col-desc {
    min-width: 220px;
  }

  &__col-qty {
    width: 110px;
  }

  &__col-price {
    width: 150px;
  }

  &__col-vat {
    width: 105px;
  }

  &__col-total {
    width: 130px;
  }

  &__col-actions {
    width: 104px;
  }

  &__row {
    cursor: default !important;

    &:hover {
      background-color: transparent !important;
    }
  }

  &__cell {
    vertical-align: top;
    padding: 8px 10px !important;

    &--total {
      padding-top: 14px !important;
      text-align: right;
      font-weight: 600;
      white-space: nowrap;
    }

    &--actions {
      padding-top: 8px !important;
      text-align: right;
      white-space: nowrap;
    }
  }
}

.line-input,
.line-select {
  width: 100%;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--border-hairline);
  border-radius: 6px;
  background: var(--bg-surface);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13px;
  outline: none;
  transition:
    border-color 0.12s ease,
    box-shadow 0.12s ease;

  &:focus {
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px var(--focus-ring);
  }

  &:disabled {
    background: var(--bg-surface-subtle);
    color: var(--text-muted);
  }

  &--num {
    text-align: right;
  }

  &--error {
    border-color: var(--pill-overdue-text);
  }
}

.line-cell__error {
  margin-top: 4px;
  font-size: 11.5px;
  color: var(--pill-overdue-text);
  line-height: 1.3;
  text-align: left;
}

.line-row-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.line-cards-mobile {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.line-mobile-card {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__index {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  &__nums {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 8px;
    border-top: 1px solid var(--border-hairline);
    font-size: 13px;
  }
}

.line-grid-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;

  &__hint {
    font-size: 12px;
    color: var(--text-muted);
  }
}
</style>
