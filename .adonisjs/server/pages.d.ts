import '@adonisjs/inertia/types'

import type { VNodeProps, AllowedComponentProps, ComponentInstance } from 'vue'

type ExtractProps<T> = Omit<
  ComponentInstance<T>['$props'],
  keyof VNodeProps | keyof AllowedComponentProps
>

declare module '@adonisjs/inertia/types' {
  export interface InertiaPages {
    'account/index': ExtractProps<(typeof import('../../inertia/pages/account/index.vue'))['default']>
    'account/logout': ExtractProps<(typeof import('../../inertia/pages/account/logout.vue'))['default']>
    'account/orders/[id]': ExtractProps<(typeof import('../../inertia/pages/account/orders/[id].vue'))['default']>
    'account/orders/index': ExtractProps<(typeof import('../../inertia/pages/account/orders/index.vue'))['default']>
    'auth/login': ExtractProps<(typeof import('../../inertia/pages/auth/login.vue'))['default']>
    'auth/signup': ExtractProps<(typeof import('../../inertia/pages/auth/signup.vue'))['default']>
    'blog/[handle]/[article]': ExtractProps<(typeof import('../../inertia/pages/blog/[handle]/[article].vue'))['default']>
    'blog/[handle]/index': ExtractProps<(typeof import('../../inertia/pages/blog/[handle]/index.vue'))['default']>
    'checkout/index': ExtractProps<(typeof import('../../inertia/pages/checkout/index.vue'))['default']>
    'checkout/order': ExtractProps<(typeof import('../../inertia/pages/checkout/order.vue'))['default']>
    'collection/[handle]': ExtractProps<(typeof import('../../inertia/pages/collection/[handle].vue'))['default']>
    'collections/index': ExtractProps<(typeof import('../../inertia/pages/collections/index.vue'))['default']>
    'dashboard': ExtractProps<(typeof import('../../inertia/pages/dashboard.vue'))['default']>
    'errors/not_found': ExtractProps<(typeof import('../../inertia/pages/errors/not_found.vue'))['default']>
    'errors/server_error': ExtractProps<(typeof import('../../inertia/pages/errors/server_error.vue'))['default']>
    'home': ExtractProps<(typeof import('../../inertia/pages/home.vue'))['default']>
    'inbox': ExtractProps<(typeof import('../../inertia/pages/inbox.vue'))['default']>
    'index': ExtractProps<(typeof import('../../inertia/pages/index.vue'))['default']>
    'pages/[handle]': ExtractProps<(typeof import('../../inertia/pages/pages/[handle].vue'))['default']>
    'payments/simulation': ExtractProps<(typeof import('../../inertia/pages/payments/simulation.vue'))['default']>
    'policies/[handle]': ExtractProps<(typeof import('../../inertia/pages/policies/[handle].vue'))['default']>
    'policies/index': ExtractProps<(typeof import('../../inertia/pages/policies/index.vue'))['default']>
    'product/[handle]': ExtractProps<(typeof import('../../inertia/pages/product/[handle].vue'))['default']>
    'seller/collections': ExtractProps<(typeof import('../../inertia/pages/seller/collections.vue'))['default']>
    'seller/discounts': ExtractProps<(typeof import('../../inertia/pages/seller/discounts.vue'))['default']>
    'seller/emails': ExtractProps<(typeof import('../../inertia/pages/seller/emails.vue'))['default']>
    'seller/order': ExtractProps<(typeof import('../../inertia/pages/seller/order.vue'))['default']>
    'seller/orders': ExtractProps<(typeof import('../../inertia/pages/seller/orders.vue'))['default']>
    'seller/products': ExtractProps<(typeof import('../../inertia/pages/seller/products.vue'))['default']>
    'seller/stock': ExtractProps<(typeof import('../../inertia/pages/seller/stock.vue'))['default']>
    'seller/users': ExtractProps<(typeof import('../../inertia/pages/seller/users.vue'))['default']>
    'seller/variants': ExtractProps<(typeof import('../../inertia/pages/seller/variants.vue'))['default']>
    'settings/index': ExtractProps<(typeof import('../../inertia/pages/settings/index.vue'))['default']>
    'settings/notifications': ExtractProps<(typeof import('../../inertia/pages/settings/notifications.vue'))['default']>
    'settings/security': ExtractProps<(typeof import('../../inertia/pages/settings/security.vue'))['default']>
  }
}
