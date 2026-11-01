<template>
  <div
    v-if="visible"
    role="alert"
    class="conflict-banner"
    data-testid="conflict-reload-banner"
  >
    <div class="conflict-banner__content">
      <q-icon name="sync_problem" size="18px" class="conflict-banner__icon" />
      <span>This business profile was changed elsewhere. Reload to see the latest.</span>
    </div>
    <q-btn
      outline
      dense
      label="Reload"
      :loading="Boolean(reloading)"
      class="conflict-banner__btn"
      data-testid="conflict-reload-btn"
      @click="emit('reload')"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
  reloading?: boolean
}>()

const emit = defineEmits<{
  reload: []
}>()
</script>

<style scoped lang="scss">
.conflict-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 6px;
  background: var(--pill-partial-bg);
  color: var(--pill-partial-text);
  border: 1px solid var(--pill-partial-border);
  font-size: 13px;

  &__content {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__icon {
    flex-shrink: 0;
  }

  &__btn {
    flex-shrink: 0;
    font-size: 12px;
    padding: 2px 10px;
  }
}
</style>
