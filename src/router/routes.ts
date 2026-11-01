import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('src/shared/layout/AuthLayout.vue'),
    children: [
      {
        path: '',
        name: 'login',
        component: () => import('src/features/auth/pages/AuthPage.vue'),
        meta: { title: 'Sign in', guestOnly: true, public: true },
      },
    ],
  },
  {
    path: '/register',
    component: () => import('src/shared/layout/AuthLayout.vue'),
    children: [
      {
        path: '',
        name: 'register',
        component: () => import('src/features/auth/pages/AuthPage.vue'),
        meta: { title: 'Create account', guestOnly: true, public: true },
      },
    ],
  },
  {
    path: '/verify-email',
    component: () => import('src/shared/layout/AuthLayout.vue'),
    children: [
      {
        path: '',
        name: 'verify-email',
        component: () => import('src/features/auth/pages/VerifyEmailPage.vue'),
        meta: { title: 'Verify email', public: true },
      },
    ],
  },
  {
    path: '/setup',
    component: () => import('src/shared/layout/AuthLayout.vue'),
    meta: { requiresAuth: true, ownerOnly: true },
    children: [
      {
        path: '',
        name: 'business-setup',
        component: () => import('src/features/business/pages/SetupWizardPage.vue'),
        meta: { title: 'Set up your business', requiresAuth: true, ownerOnly: true },
      },
    ],
  },
  {
    path: '/',
    component: () => import('src/shared/layout/AppShellLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard',
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('src/features/dashboard/pages/DashboardPage.vue'),
        meta: { title: 'Dashboard', requiresAuth: true },
      },
      {
        path: 'invoices',
        name: 'invoices',
        component: () => import('src/features/dashboard/pages/DashboardPage.vue'),
        meta: { title: 'Invoices', requiresAuth: true },
      },
      {
        path: 'invoices/new',
        name: 'invoice-new',
        component: () => import('src/features/dashboard/pages/DashboardPage.vue'),
        meta: { title: 'New Invoice', requiresAuth: true },
      },
      {
        path: 'customers',
        name: 'customers',
        component: () => import('src/features/customers/pages/CustomersPage.vue'),
        meta: { title: 'Customers', requiresAuth: true },
      },
      {
        path: 'customers/:customerId',
        name: 'customer-detail',
        component: () => import('src/features/customers/pages/CustomerDetailPage.vue'),
        meta: { title: 'Customer', requiresAuth: true },
      },
      {
        path: 'notifications',
        name: 'notifications',
        component: () => import('src/features/dashboard/pages/DashboardPage.vue'),
        meta: { title: 'Notifications', requiresAuth: true },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('src/features/business/pages/SettingsPage.vue'),
        meta: { title: 'Settings', requiresAuth: true },
      },
    ],
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('src/shared/components/ErrorNotFoundPage.vue'),
    meta: { requiresAuth: true },
  },
]

export default routes
