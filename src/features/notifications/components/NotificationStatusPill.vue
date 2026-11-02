<template>
  <span :class="pillClass" data-testid="notification-status-pill">
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NotificationStatus } from '../types'

const props = defineProps<{
  status: NotificationStatus
  attempts?: number
}>()

const pillClass = computed(() => {
  switch (props.status) {
    case 'Pending':
      return 'status-pill status-pill--draft'
    case 'Failed':
      return 'status-pill status-pill--overdue'
    case 'Sent':
    default:
      return 'status-pill status-pill--paid'
  }
})

const label = computed(() => {
  switch (props.status) {
    case 'Pending':
      return 'Sending…'
    case 'Failed': {
      const count = props.attempts ?? 1
      return `Failed after ${count} ${count === 1 ? 'attempt' : 'attempts'}`
    }
    case 'Sent':
    default:
      return 'Sent'
  }
})
</script>
