<template>
  <q-layout view="lHh Lpr lFf" class="app-shell">
    <!-- Left Sidebar / Responsive Drawer -->
    <q-drawer
      v-model="drawerOpen"
      :breakpoint="1023"
      :width="232"
      bordered
      class="app-sidebar"
    >
      <div class="app-sidebar__inner">
        <!-- Business Header -->
        <div class="app-sidebar__brand">
          <div class="app-sidebar__logo" aria-hidden="true">
            <img
              v-if="businessLogoUrl"
              :src="businessLogoUrl"
              alt="Business logo"
              class="app-sidebar__logo-img"
            />
            <span v-else class="app-sidebar__logo-monogram">{{ businessInitials }}</span>
          </div>
          <div class="app-sidebar__brand-meta">
            <div class="app-sidebar__business-name">{{ businessName }}</div>
            <div class="app-sidebar__role-badge">{{ userRole }}</div>
          </div>
        </div>

        <!-- Quick Command Palette Trigger (Desktop Sidebar) -->
        <div class="app-sidebar__search-wrap">
          <button
            type="button"
            class="app-sidebar__search-btn"
            @click="commandPaletteOpen = true"
          >
            <q-icon name="search" size="16px" />
            <span>Quick jump...</span>
            <kbd class="app-sidebar__kbd">Ctrl K</kbd>
          </button>
        </div>

        <!-- Primary Navigation -->
        <nav class="app-sidebar__nav" aria-label="Main navigation">
          <router-link
            v-for="item in primaryNavItems"
            :key="item.to"
            :to="item.to"
            class="app-sidebar__link"
            :class="{ 'app-sidebar__link--active': isRouteActive(item.to) }"
          >
            <q-icon :name="item.icon" size="18px" class="app-sidebar__link-icon" />
            <span class="app-sidebar__link-label">{{ item.label }}</span>
            <span
              v-if="item.to === '/notifications' && showConnectionHint"
              class="app-sidebar__status-dot"
              title="Live updates paused, reconnecting…"
              aria-label="Live updates paused, reconnecting…"
              data-testid="notifications-connection-dot"
            />
            <span
              v-if="item.to === '/notifications' && unreadBadgeLabel"
              class="app-sidebar__nav-badge tabular-nums"
              data-testid="notifications-unread-badge"
            >
              {{ unreadBadgeLabel }}
            </span>
          </router-link>
        </nav>

        <!-- Bottom Section: Settings & Theme -->
        <div class="app-sidebar__footer">
          <router-link
            to="/settings"
            class="app-sidebar__link"
            :class="{ 'app-sidebar__link--active': isRouteActive('/settings') }"
          >
            <q-icon name="settings" size="18px" class="app-sidebar__link-icon" />
            <span class="app-sidebar__link-label">Settings</span>
          </router-link>

          <button
            type="button"
            class="app-sidebar__link app-sidebar__link--button"
            @click="toggleDarkMode"
          >
            <q-icon
              :name="isDark ? 'light_mode' : 'dark_mode'"
              size="18px"
              class="app-sidebar__link-icon"
            />
            <span class="app-sidebar__link-label">
              {{ isDark ? 'Light theme' : 'Dark theme' }}
            </span>
          </button>

          <button
            type="button"
            class="app-sidebar__link app-sidebar__link--button"
            data-testid="sidebar-signout-btn"
            @click="handleSignOut"
          >
            <q-icon name="logout" size="18px" class="app-sidebar__link-icon" />
            <span class="app-sidebar__link-label">Sign out</span>
          </button>
        </div>
      </div>
    </q-drawer>

    <!-- Thin Top Bar -->
    <q-header class="app-topbar">
      <div class="app-topbar__inner">
        <div class="app-topbar__left">
          <q-btn
            v-if="$q.screen.lt.md"
            flat
            dense
            round
            icon="menu"
            aria-label="Toggle navigation drawer"
            class="app-topbar__menu-btn touch-target"
            @click="drawerOpen = !drawerOpen"
          />

          <nav class="app-topbar__breadcrumbs" aria-label="Breadcrumb">
            <span class="app-topbar__crumb-root">{{ businessName }}</span>
            <span class="app-topbar__crumb-sep" aria-hidden="true">/</span>
            <h1 class="app-topbar__title">{{ currentPageTitle }}</h1>
          </nav>
        </div>

        <div class="app-topbar__actions">
          <q-btn
            v-if="$q.screen.lt.md"
            flat
            dense
            round
            icon="search"
            aria-label="Open command palette"
            class="app-topbar__icon-btn touch-target"
            @click="commandPaletteOpen = true"
          />

          <q-btn
            color="primary"
            icon="add"
            label="New invoice"
            to="/invoices/new"
            class="app-topbar__primary-btn"
          />
        </div>
      </div>
    </q-header>

    <!-- Main Page Container -->
    <q-page-container class="app-main">
      <router-view />
    </q-page-container>

    <!-- Mobile Bottom Tab Bar (xs < 600px) -->
    <q-footer v-if="$q.screen.xs" class="app-bottom-nav">
      <div class="app-bottom-nav__grid" role="navigation" aria-label="Mobile navigation">
        <router-link
          v-for="tab in mobileTabItems"
          :key="tab.to"
          :to="tab.to"
          class="app-bottom-nav__tab mobile-tab-btn"
          :class="{ 'app-bottom-nav__tab--active': isRouteActive(tab.to) }"
        >
          <q-icon :name="tab.icon" size="20px" />
          <span>{{ tab.label }}</span>
        </router-link>

        <button
          type="button"
          class="app-bottom-nav__tab mobile-tab-btn"
          @click="drawerOpen = true"
        >
          <q-icon name="more_horiz" size="20px" />
          <span>More</span>
        </button>
      </div>
    </q-footer>

    <!-- Ctrl/Cmd + K Command Palette -->
    <CommandPaletteDialog v-model="commandPaletteOpen" />
  </q-layout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useSessionStore } from 'src/features/auth/store'
import { useBusinessStore } from 'src/features/business/store'
import { useNotificationFeedStore } from 'src/features/notifications/store'
import CommandPaletteDialog from 'src/shared/layout/CommandPaletteDialog.vue'

interface NavItem {
  label: string
  icon: string
  to: string
}

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const businessStore = useBusinessStore()
const notificationFeedStore = useNotificationFeedStore()

const drawerOpen = ref($q.screen.gt.sm)
const commandPaletteOpen = ref(false)

const businessName = computed(() => businessStore.businessName)
const userRole = computed(() => sessionStore.role ?? 'Owner')
const businessLogoUrl = computed(() => businessStore.logoUrl)
const businessInitials = computed(() => businessStore.businessInitials)

const unreadBadgeLabel = computed(() => {
  const count = notificationFeedStore.unreadCount
  if (count <= 0) {
    return ''
  }
  return count > 9 ? '9+' : String(count)
})

const showConnectionHint = computed(
  () =>
    notificationFeedStore.status === 'reconnecting' ||
    (notificationFeedStore.status === 'disconnected' &&
      notificationFeedStore.hasFailedStart),
)

const primaryNavItems: NavItem[] = [
  { label: 'Dashboard', icon: 'space_dashboard', to: '/dashboard' },
  { label: 'Invoices', icon: 'receipt_long', to: '/invoices' },
  { label: 'Customers', icon: 'people_outline', to: '/customers' },
  { label: 'Notifications', icon: 'notifications_none', to: '/notifications' },
]

const mobileTabItems: NavItem[] = [
  { label: 'Dashboard', icon: 'space_dashboard', to: '/dashboard' },
  { label: 'Invoices', icon: 'receipt_long', to: '/invoices' },
  { label: 'Customers', icon: 'people_outline', to: '/customers' },
]

const currentPageTitle = computed(() => {
  const metaTitle = route.meta?.title
  return typeof metaTitle === 'string' ? metaTitle : 'Dashboard'
})

const isDark = computed(() => $q.dark.isActive)

function isRouteActive(targetPath: string): boolean {
  return route.path === targetPath || route.path.startsWith(`${targetPath}/`)
}

function toggleDarkMode() {
  $q.dark.toggle()
}

async function handleSignOut() {
  await sessionStore.signOut()
  await router.replace('/login')
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    commandPaletteOpen.value = !commandPaletteOpen.value
  }
}

watch(
  () => sessionStore.isAuthenticated,
  (isAuth) => {
    if (isAuth) {
      void notificationFeedStore.connect()
    } else {
      void notificationFeedStore.disconnect()
    }
  },
  { immediate: true },
)

watch(
  () => route.path,
  (path) => {
    if (path === '/notifications' || path.startsWith('/notifications/')) {
      notificationFeedStore.markAllRead()
    }
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  void notificationFeedStore.disconnect()
})
</script>

<style scoped lang="scss">
.app-shell {
  background: var(--bg-canvas);
}

:deep(.app-sidebar) {
  background: var(--bg-surface) !important;
  border-right: 1px solid var(--border-hairline) !important;
}

.app-sidebar {
  &__inner {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 12px 10px;
  }

  &__brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 6px 12px;
    border-bottom: 1px solid var(--border-hairline);
  }

  &__logo {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: var(--text-primary);
    color: var(--bg-surface);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11.5px;
    font-weight: 600;
    flex-shrink: 0;
    overflow: hidden;
  }

  &__logo-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__brand-meta {
    min-width: 0;
    flex: 1;
  }

  &__business-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__role-badge {
    font-size: 11px;
    color: var(--text-secondary);
  }

  &__search-wrap {
    padding: 10px 0 8px;
  }

  &__search-btn {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid var(--border-hairline);
    background: var(--bg-surface-subtle);
    color: var(--text-secondary);
    font-size: 12.5px;
    font-family: inherit;
    cursor: pointer;
    transition: border-color 0.12s ease;

    &:hover {
      border-color: var(--border-strong);
      color: var(--text-primary);
    }

    span {
      flex: 1;
      text-align: left;
    }
  }

  &__kbd {
    font-size: 10.5px;
    font-family: inherit;
    padding: 1px 5px;
    border-radius: 4px;
    background: var(--bg-surface);
    border: 1px solid var(--border-hairline);
    color: var(--text-secondary);
  }

  &__nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: 4px;
    flex: 1;
  }

  &__footer {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-top: 8px;
    border-top: 1px solid var(--border-hairline);
  }

  &__link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 10px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    text-decoration: none;
    transition:
      background-color 0.1s ease,
      color 0.1s ease;

    &:hover {
      background: var(--bg-surface-hover);
      color: var(--text-primary);
    }

    &--active {
      background: var(--bg-surface-subtle);
      color: var(--text-primary);
      font-weight: 600;

      .app-sidebar__link-icon {
        color: var(--accent-primary);
      }
    }

    &--button {
      width: 100%;
      border: none;
      background: transparent;
      font-family: inherit;
      cursor: pointer;
      text-align: left;
    }
  }

  &__link-icon {
    color: var(--text-secondary);
  }

  &__link-label {
    flex: 1;
    min-width: 0;
  }

  &__status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--pill-partial-text, #b45309);
    flex-shrink: 0;
  }

  &__nav-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
    background: var(--pill-sent-bg);
    color: var(--pill-sent-text);
    border: 1px solid var(--pill-sent-border);
    flex-shrink: 0;
  }
}

.app-topbar {
  background: var(--bg-surface) !important;
  color: var(--text-primary) !important;
  border-bottom: 1px solid var(--border-hairline);
  box-shadow: none !important;

  &__inner {
    height: 48px;
    padding: 0 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  &__left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  &__breadcrumbs {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  &__crumb-root {
    font-size: 13px;
    color: var(--text-secondary);
    display: none;

    @media (min-width: 600px) {
      display: inline;
    }
  }

  &__crumb-sep {
    color: var(--text-muted);
    display: none;

    @media (min-width: 600px) {
      display: inline;
    }
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__primary-btn {
    font-size: 12.5px;
    font-weight: 500;
    padding: 4px 12px;
  }
}

.app-bottom-nav {
  background: var(--bg-surface) !important;
  border-top: 1px solid var(--border-hairline);
  color: var(--text-secondary) !important;

  &__grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    height: 54px;
  }

  &__tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-size: 11px;
    font-weight: 500;
    color: var(--text-secondary);
    text-decoration: none;
    border: none;
    background: transparent;
    font-family: inherit;
    cursor: pointer;

    &--active {
      color: var(--accent-primary);
      font-weight: 600;
    }
  }
}
</style>
