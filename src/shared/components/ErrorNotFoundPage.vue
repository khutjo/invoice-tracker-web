<template>
  <q-page class="not-found-page">
    <div class="attio-card not-found-card">
      <div class="not-found-card__code tabular-nums">404</div>
      <h1 class="text-heading-lg">Page not found</h1>
      <p class="not-found-card__text">
        The record or page you requested could not be found or belongs to another workspace.
      </p>
      <q-btn color="primary" label="Back to Dashboard" to="/dashboard" />
    </div>
  </q-page>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
.not-found-page {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.not-found-card {
  max-width: 400px;
  width: 100%;
  padding: 28px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;

  &__code {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    padding: 2px 8px;
    border-radius: 4px;
    background: var(--bg-surface-subtle);
    border: 1px solid var(--border-hairline);
  }

  &__text {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0 0 8px;
  }
}
</style>
