<template>
  <q-dialog
    :model-value="modelValue"
    position="top"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <q-card class="command-palette">
      <div class="command-palette__header">
        <q-icon name="search" size="18px" class="command-palette__search-icon" />
        <input
          ref="inputRef"
          v-model="query"
          type="text"
          class="command-palette__input"
          placeholder="Type a command or jump to an invoice, customer, or page..."
          @keydown.down.prevent="moveSelection(1)"
          @keydown.up.prevent="moveSelection(-1)"
          @keydown.enter.prevent="executeSelected"
        />
        <kbd class="command-palette__kbd">ESC</kbd>
      </div>

      <div class="command-palette__list" role="listbox" aria-label="Commands">
        <template v-if="filteredItems.length > 0">
          <button
            v-for="(item, index) in filteredItems"
            :key="item.id"
            type="button"
            class="command-palette__item"
            :class="{ 'command-palette__item--active': index === selectedIndex }"
            @mouseenter="selectedIndex = index"
            @click="runItem(item)"
          >
            <q-icon :name="item.icon" size="18px" class="command-palette__item-icon" />
            <div class="command-palette__item-body">
              <span class="command-palette__item-label">{{ item.label }}</span>
              <span v-if="item.subtitle" class="command-palette__item-sub">
                {{ item.subtitle }}
              </span>
            </div>
            <span class="command-palette__item-group">{{ item.group }}</span>
          </button>
        </template>
        <div v-else class="command-palette__empty">
          No matching commands, invoices or customers for "{{ query }}"
        </div>
      </div>

      <div class="command-palette__footer">
        <span><kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
        <span><kbd>↵</kbd> to open</span>
        <span><kbd>ESC</kbd> to close</span>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

export interface CommandItem {
  id: string
  label: string
  subtitle?: string
  group: 'Actions' | 'Navigation' | 'Invoices' | 'Customers'
  icon: string
  to: string
}

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const router = useRouter()
const query = ref('')
const selectedIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

const defaultItems: CommandItem[] = [
  {
    id: 'action-new-invoice',
    label: 'New invoice',
    subtitle: 'Create a new draft tax invoice',
    group: 'Actions',
    icon: 'add_circle_outline',
    to: '/invoices/new',
  },
  {
    id: 'nav-dashboard',
    label: 'Go to Dashboard',
    subtitle: 'KPIs, overdue summary & recent notifications',
    group: 'Navigation',
    icon: 'space_dashboard',
    to: '/dashboard',
  },
  {
    id: 'nav-invoices',
    label: 'Go to Invoices',
    subtitle: 'View and filter all invoices',
    group: 'Navigation',
    icon: 'receipt_long',
    to: '/invoices',
  },
  {
    id: 'nav-customers',
    label: 'Go to Customers',
    subtitle: 'Manage customer directory and billing addresses',
    group: 'Navigation',
    icon: 'people_outline',
    to: '/customers',
  },
  {
    id: 'nav-notifications',
    label: 'Go to Notifications',
    subtitle: 'Simulated email and SMS log',
    group: 'Navigation',
    icon: 'notifications_none',
    to: '/notifications',
  },
  {
    id: 'nav-settings',
    label: 'Go to Settings',
    subtitle: 'Business profile, banking details & payment terms',
    group: 'Navigation',
    icon: 'settings',
    to: '/settings',
  },
]

const filteredItems = computed(() => {
  const term = query.value.trim().toLowerCase()
  if (!term) {
    return defaultItems
  }
  return defaultItems.filter(
    (item) =>
      item.label.toLowerCase().includes(term) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(term)) ||
      item.group.toLowerCase().includes(term),
  )
})

watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      query.value = ''
      selectedIndex.value = 0
      await nextTick()
      inputRef.value?.focus()
    }
  },
)

watch(query, () => {
  selectedIndex.value = 0
})

function moveSelection(delta: number) {
  const count = filteredItems.value.length
  if (count === 0) return
  selectedIndex.value = (selectedIndex.value + delta + count) % count
}

function executeSelected() {
  const item = filteredItems.value[selectedIndex.value]
  if (item) {
    runItem(item)
  }
}

function runItem(item: CommandItem) {
  emit('update:modelValue', false)
  void router.push(item.to)
}
</script>

<style scoped lang="scss">
.command-palette {
  width: 100%;
  max-width: 560px;
  margin-top: 64px;
  background: var(--bg-surface);
  border: 1px solid var(--border-hairline);
  border-radius: 8px;
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border-hairline);
  }

  &__search-icon {
    color: var(--text-secondary);
  }

  &__input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    color: var(--text-primary);
    font-size: 13.5px;
    font-family: inherit;

    &::placeholder {
      color: var(--text-muted);
    }
  }

  &__kbd {
    font-size: 11px;
    font-family: inherit;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--bg-surface-subtle);
    border: 1px solid var(--border-hairline);
    color: var(--text-secondary);
  }

  &__list {
    max-height: 320px;
    overflow-y: auto;
    padding: 6px;
  }

  &__item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-primary);
    text-align: left;
    cursor: pointer;
    font-family: inherit;

    &--active {
      background: var(--bg-surface-hover);
    }
  }

  &__item-icon {
    color: var(--text-secondary);
  }

  &__item-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__item-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
  }

  &__item-sub {
    font-size: 12px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__item-group {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-muted);
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--bg-surface-subtle);
  }

  &__empty {
    padding: 24px 16px;
    text-align: center;
    font-size: 13px;
    color: var(--text-secondary);
  }

  &__footer {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 8px 14px;
    border-top: 1px solid var(--border-hairline);
    background: var(--bg-surface-subtle);
    font-size: 11.5px;
    color: var(--text-secondary);

    kbd {
      font-family: inherit;
      font-size: 11px;
      padding: 1px 5px;
      border-radius: 3px;
      background: var(--bg-surface);
      border: 1px solid var(--border-hairline);
    }
  }
}
</style>
