<template>
  <!-- Desktop Table Row Mode -->
  <template v-if="mode === 'table'">
    <tr
      tabindex="0"
      :aria-expanded="expanded"
      class="notification-row"
      :class="{
        'notification-row--expanded': expanded,
        'notification-row--highlighted': highlighted,
      }"
      data-testid="notification-log-row"
      @click="emit('toggle')"
      @keydown.enter.prevent="emit('toggle')"
      @keydown.space.prevent="emit('toggle')"
    >
      <td class="tabular-nums text-secondary" :title="rawTimestamp">
        <span>{{ formattedTime }}</span>
        <q-tooltip>{{ rawTimestamp }}</q-tooltip>
      </td>

      <td>
        <div class="notification-row__type">
          <q-icon
            :name="notificationTypeIcon(item.notificationType)"
            size="16px"
            class="notification-row__icon"
          />
          <span>{{ notificationTypeLabel(item.notificationType) }}</span>
        </div>
      </td>

      <td class="tabular-nums">
        <router-link
          :to="`/invoices/${encodeURIComponent(item.invoiceId)}`"
          class="notification-row__invoice-link"
          data-testid="notification-invoice-link"
          @click.stop
        >
          {{ item.invoiceNumber }}
        </router-link>
      </td>

      <td>{{ item.customerName }}</td>

      <td>
        <div class="notification-row__recipient">
          <q-icon
            :name="channelIcon(item.channel)"
            size="15px"
            class="notification-row__icon"
          />
          <span class="tabular-nums">{{ item.recipient }}</span>
        </div>
      </td>

      <td class="text-right">
        <div class="notification-row__status-cell">
          <NotificationStatusPill
            :status="item.status"
            :attempts="item.attempts"
          />
          <button
            type="button"
            class="notification-row__chevron-btn"
            :aria-label="expanded ? 'Collapse message' : 'Expand message'"
            :aria-expanded="expanded"
            data-testid="notification-expand-btn"
            @click.stop="emit('toggle')"
          >
            <q-icon
              :name="expanded ? 'expand_less' : 'expand_more'"
              size="18px"
            />
          </button>
        </div>
      </td>
    </tr>

    <tr
      v-if="expanded"
      class="notification-row__body-row"
      data-testid="notification-log-body-row"
    >
      <td colspan="6">
        <div class="notification-row__body" data-testid="notification-log-body">
          {{ item.body }}
        </div>
      </td>
    </tr>
  </template>

  <!-- Mobile Card Mode (NotificationsPage on < md) -->
  <div
    v-else-if="mode === 'card'"
    tabindex="0"
    role="button"
    :aria-expanded="expanded"
    class="attio-card notification-card"
    :class="{
      'notification-card--expanded': expanded,
      'notification-row--highlighted': highlighted,
    }"
    data-testid="notification-log-row"
    @click="emit('toggle')"
    @keydown.enter.prevent="emit('toggle')"
    @keydown.space.prevent="emit('toggle')"
  >
    <div class="notification-card__top">
      <div class="notification-row__type">
        <q-icon
          :name="notificationTypeIcon(item.notificationType)"
          size="16px"
          class="notification-row__icon"
        />
        <span class="font-medium">
          {{ notificationTypeLabel(item.notificationType) }}
        </span>
      </div>
      <div class="notification-row__status-cell">
        <NotificationStatusPill
          :status="item.status"
          :attempts="item.attempts"
        />
        <q-icon :name="expanded ? 'expand_less' : 'expand_more'" size="18px" />
      </div>
    </div>

    <div class="notification-card__meta">
      <router-link
        :to="`/invoices/${encodeURIComponent(item.invoiceId)}`"
        class="notification-row__invoice-link tabular-nums"
        data-testid="notification-invoice-link"
        @click.stop
      >
        {{ item.invoiceNumber }}
      </router-link>
      <span>·</span>
      <span>{{ item.customerName }}</span>
    </div>

    <div class="notification-card__bottom">
      <div class="notification-row__recipient">
        <q-icon
          :name="channelIcon(item.channel)"
          size="15px"
          class="notification-row__icon"
        />
        <span class="tabular-nums">{{ item.recipient }}</span>
      </div>
      <span class="tabular-nums text-secondary" :title="rawTimestamp">
        {{ formattedTime }}
      </span>
    </div>

    <div
      v-if="expanded"
      class="notification-row__body notification-card__body"
      data-testid="notification-log-body"
    >
      {{ item.body }}
    </div>
  </div>

  <!-- Compact Mode (InvoiceDetailPage Notifications card) -->
  <div
    v-else
    tabindex="0"
    role="button"
    :aria-expanded="expanded"
    class="notification-compact-row"
    :class="{ 'notification-compact-row--expanded': expanded }"
    data-testid="notification-log-row"
    @click="emit('toggle')"
    @keydown.enter.prevent="emit('toggle')"
    @keydown.space.prevent="emit('toggle')"
  >
    <div class="notification-compact-row__summary">
      <div class="notification-row__type">
        <q-icon
          :name="notificationTypeIcon(item.notificationType)"
          size="16px"
          class="notification-row__icon"
        />
        <span class="font-medium">
          {{ notificationTypeLabel(item.notificationType) }}
        </span>
      </div>

      <div class="notification-row__recipient">
        <q-icon
          :name="channelIcon(item.channel)"
          size="15px"
          class="notification-row__icon"
        />
        <span class="tabular-nums">{{ item.recipient }}</span>
      </div>

      <div class="notification-compact-row__right">
        <NotificationStatusPill
          :status="item.status"
          :attempts="item.attempts"
        />
        <span class="tabular-nums text-secondary" :title="rawTimestamp">
          {{ formattedTime }}
        </span>
        <button
          type="button"
          class="notification-row__chevron-btn"
          :aria-label="expanded ? 'Collapse message' : 'Expand message'"
          :aria-expanded="expanded"
          data-testid="notification-expand-btn"
          @click.stop="emit('toggle')"
        >
          <q-icon
            :name="expanded ? 'expand_less' : 'expand_more'"
            size="18px"
          />
        </button>
      </div>
    </div>

    <div
      v-if="expanded"
      class="notification-row__body notification-compact-row__body"
      data-testid="notification-log-body"
    >
      {{ item.body }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  channelIcon,
  formatNotificationTimestamp,
  notificationTypeIcon,
  notificationTypeLabel,
} from '../labels'
import type { NotificationLogItem } from '../types'
import NotificationStatusPill from './NotificationStatusPill.vue'

const props = withDefaults(
  defineProps<{
    item: NotificationLogItem
    expanded?: boolean
    highlighted?: boolean
    mode?: 'table' | 'card' | 'compact'
  }>(),
  {
    expanded: false,
    highlighted: false,
    mode: 'table',
  },
)

const emit = defineEmits<{
  toggle: []
}>()

const rawTimestamp = computed(() => props.item.sentAt ?? props.item.createdAt)
const formattedTime = computed(() =>
  formatNotificationTimestamp(rawTimestamp.value),
)
</script>

<style scoped lang="scss">
.notification-row {
  cursor: pointer;
  transition: background-color 0.25s ease;

  &--highlighted {
    background-color: var(--pill-sent-bg) !important;
  }

  &__type {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  &__recipient {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--text-secondary);
  }

  &__icon {
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  &__invoice-link {
    color: var(--accent-primary, #1976d2);
    font-weight: 500;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  &__status-cell {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
  }

  &__chevron-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;

    &:hover {
      background: var(--bg-surface-hover);
      color: var(--text-primary);
    }
  }

  &__body-row td {
    background: var(--bg-surface-subtle);
    padding: 12px 16px !important;
    border-bottom: 1px solid var(--border-hairline);
  }

  &__body {
    white-space: pre-wrap;
    word-break: break-word;
    font-family: inherit;
    font-size: 13px;
    line-height: 1.55;
    color: var(--text-primary);
    background: var(--bg-surface);
    border: 1px solid var(--border-hairline);
    border-radius: 6px;
    padding: 12px 14px;
  }
}

.notification-card {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;

  &__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }

  &__bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 12.5px;
  }

  &__body {
    margin-top: 4px;
  }
}

.notification-compact-row {
  padding: 10px 0;
  border-bottom: 1px solid var(--border-hairline);
  cursor: pointer;

  &:last-child {
    border-bottom: none;
  }

  &__summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    font-size: 13px;
  }

  &__right {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }

  &__body {
    margin-top: 10px;
  }
}
</style>
