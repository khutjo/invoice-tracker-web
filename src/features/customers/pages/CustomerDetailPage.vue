<template>
  <q-page class="customer-detail-page">
    <!-- Loading State -->
    <div v-if="loading" class="attio-card detail-skeleton" data-testid="customer-detail-loading">
      <q-skeleton type="text" width="240px" height="28px" />
      <q-skeleton type="rect" width="100%" height="180px" />
    </div>

    <!-- 404 Not Found State -->
    <div
      v-else-if="notFound"
      class="attio-card detail-not-found"
      data-testid="customer-not-found"
    >
      <div class="detail-not-found__code tabular-nums">404</div>
      <h1 class="text-heading-lg">Customer not found</h1>
      <p class="detail-not-found__copy">
        This customer could not be found or belongs to another business workspace.
      </p>
      <q-btn
        color="primary"
        label="Back to customers"
        :to="backToListLocation"
        data-testid="customer-back-link"
      />
    </div>

    <!-- Loaded Customer Record -->
    <template v-else-if="customer">
      <!-- Breadcrumb & Record Header -->
      <div class="detail-header">
        <div class="detail-header__left">
          <router-link :to="backToListLocation" class="detail-header__back">
            <q-icon name="arrow_back" size="16px" />
            <span>Customers</span>
          </router-link>

          <div class="detail-header__title-row">
            <h1 class="text-heading-lg" data-testid="customer-detail-name">
              {{ customer.name }}
            </h1>
            <span
              v-if="customer.isArchived"
              class="status-pill status-pill--draft"
              data-testid="customer-archived-pill"
            >
              Archived
            </span>
          </div>
        </div>

        <!-- Actions (Hidden when archived) -->
        <div v-if="!customer.isArchived" class="detail-header__actions">
          <q-btn
            outline
            icon="edit"
            label="Edit"
            data-testid="customer-edit-btn"
            @click="editDrawerOpen = true"
          />
          <q-btn
            outline
            color="negative"
            icon="archive"
            label="Archive"
            data-testid="customer-archive-btn"
            @click="archiveDialogOpen = true"
          />
        </div>
      </div>

      <!-- Attributes Panel -->
      <section class="attio-card attributes-panel" aria-label="Customer attributes">
        <div class="attributes-panel__header">
          <h2 class="text-heading-md">Customer details</h2>
        </div>

        <dl class="attributes-grid">
          <div class="attributes-grid__item">
            <dt class="attributes-grid__label">Email</dt>
            <dd class="attributes-grid__value">
              <a
                :href="`mailto:${customer.email}`"
                class="attributes-grid__link"
                data-testid="customer-detail-email"
              >
                {{ customer.email }}
              </a>
            </dd>
          </div>

          <div class="attributes-grid__item">
            <dt class="attributes-grid__label">Phone</dt>
            <dd class="attributes-grid__value">
              <template v-if="customer.contactNumber">
                <a
                  :href="`tel:${customer.contactNumber.number}`"
                  class="attributes-grid__link tabular-nums"
                  data-testid="customer-detail-phone"
                >
                  {{ customer.contactNumber.number }}
                </a>
                <span class="attributes-grid__sub-pill">
                  {{ customer.contactNumber.type }}
                </span>
              </template>
              <span v-else class="text-muted">—</span>
            </dd>
          </div>

          <div class="attributes-grid__item">
            <dt class="attributes-grid__label">Customer reference</dt>
            <dd class="attributes-grid__value tabular-nums">
              {{ customer.customerReference || '—' }}
            </dd>
          </div>

          <div class="attributes-grid__item">
            <dt class="attributes-grid__label">VAT number</dt>
            <dd class="attributes-grid__value tabular-nums">
              {{ customer.vatNumber || '—' }}
            </dd>
          </div>

          <div class="attributes-grid__item attributes-grid__item--full">
            <dt class="attributes-grid__label">Billing address</dt>
            <dd class="attributes-grid__value">
              <div
                v-if="customer.billingAddress"
                class="attributes-grid__address"
                data-testid="customer-detail-address"
              >
                <div>{{ customer.billingAddress.line1 }}</div>
                <div v-if="customer.billingAddress.line2">
                  {{ customer.billingAddress.line2 }}
                </div>
                <div>{{ customer.billingAddress.suburb }}</div>
                <div>{{ customer.billingAddress.city }}</div>
                <div class="tabular-nums">{{ customer.billingAddress.postalCode }}</div>
              </div>
              <span v-else class="text-muted">—</span>
            </dd>
          </div>
        </dl>
      </section>

      <!-- Edit Customer Form Drawer -->
      <CustomerForm
        v-model="editDrawerOpen"
        :customer="customer"
        @updated="onCustomerUpdated"
        @archived-elsewhere="onCustomerArchivedElsewhere"
      />

      <!-- Archive Confirmation Dialog -->
      <q-dialog v-model="archiveDialogOpen">
        <q-card class="archive-confirm-card" data-testid="archive-confirm-dialog">
          <div class="archive-confirm-card__body">
            <h2 class="text-heading-md">Archive {{ customer.name }}?</h2>
            <p class="archive-confirm-card__copy">
              Archive {{ customer.name }}? They'll keep their invoices but won't appear in
              customer lists or the invoice customer picker. This can't be undone from the
              app.
            </p>
          </div>

          <div class="archive-confirm-card__actions">
            <q-btn
              flat
              label="Cancel"
              :disable="archiving"
              data-testid="cancel-archive-btn"
              @click="archiveDialogOpen = false"
            />
            <q-btn
              color="negative"
              label="Archive customer"
              :loading="archiving"
              :disable="archiving"
              data-testid="confirm-archive-btn"
              @click="confirmArchiveCustomer"
            />
          </div>
        </q-card>
      </q-dialog>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { customersApi, type CustomerDetails } from 'src/features/customers/api'
import CustomerForm from 'src/features/customers/components/CustomerForm.vue'
import { useCustomersStore } from 'src/features/customers/store'
import { ApiError } from 'src/shared/api/problem'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const customersStore = useCustomersStore()

const customer = ref<CustomerDetails | null>(null)
const loading = ref(true)
const notFound = ref(false)
const editDrawerOpen = ref(false)
const archiveDialogOpen = ref(false)
const archiving = ref(false)

const backToListLocation = computed(() => ({
  path: '/customers',
  query: customersStore.lastListRouteQuery,
}))

async function loadCustomerDetail() {
  const customerId =
    typeof route.params.customerId === 'string' ? route.params.customerId : ''
  if (!customerId) {
    notFound.value = true
    loading.value = false
    return
  }

  loading.value = true
  notFound.value = false
  try {
    customer.value = await customersApi.getCustomer(customerId)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound.value = true
    } else {
      notFound.value = true
    }
  } finally {
    loading.value = false
  }
}

watch(
  () => route.params.customerId,
  () => {
    void loadCustomerDetail()
  },
  { immediate: true },
)

function onCustomerUpdated(updated: CustomerDetails) {
  customer.value = updated
}

async function onCustomerArchivedElsewhere() {
  await loadCustomerDetail()
  void customersStore.fetchCustomersPage()
}

async function confirmArchiveCustomer() {
  if (!customer.value) return
  archiving.value = true
  try {
    await customersApi.archiveCustomer(customer.value.customerId)
    archiveDialogOpen.value = false
    $q.notify?.({
      type: 'positive',
      message: 'Customer archived',
    })
    await router.push(backToListLocation.value)
    void customersStore.fetchCustomersPage()
  } finally {
    archiving.value = false
  }
}
</script>

<style scoped lang="scss">
.customer-detail-page {
  padding: 20px;
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;

  @media (max-width: 599px) {
    padding: 12px;
  }
}

.detail-skeleton {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-not-found {
  max-width: 420px;
  margin: 32px auto;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
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

  &__copy {
    margin: 0 0 8px;
    font-size: 13px;
    color: var(--text-secondary);
  }
}

.detail-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;

  &__left {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    font-weight: 500;
    color: var(--text-secondary);
    text-decoration: none;

    &:hover {
      color: var(--text-primary);
    }
  }

  &__title-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.attributes-panel {
  overflow: hidden;

  &__header {
    padding: 12px 18px;
    border-bottom: 1px solid var(--border-hairline);
    background: var(--bg-surface-subtle);
  }
}

.attributes-grid {
  margin: 0;
  padding: 16px 18px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 600px) {
    grid-template-columns: 1fr 1fr;
  }

  &__item {
    display: flex;
    flex-direction: column;
    gap: 4px;

    &--full {
      @media (min-width: 600px) {
        grid-column: 1 / -1;
      }
    }
  }

  &__label {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  &__value {
    margin: 0;
    font-size: 13.5px;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__link {
    color: var(--accent-primary);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  &__sub-pill {
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 4px;
    background: var(--bg-surface-subtle);
    border: 1px solid var(--border-hairline);
    color: var(--text-secondary);
  }

  &__address {
    display: flex;
    flex-direction: column;
    gap: 2px;
    line-height: 1.45;
  }
}

.archive-confirm-card {
  width: 100%;
  max-width: 420px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  &__body {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__copy {
    margin: 0;
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  &__actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
  }
}

.text-muted {
  color: var(--text-muted);
}
</style>
