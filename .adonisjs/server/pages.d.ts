import '@adonisjs/inertia/types'

import type { VNodeProps, AllowedComponentProps, ComponentInstance } from 'vue'

type ExtractProps<T> = Omit<
  ComponentInstance<T>['$props'],
  keyof VNodeProps | keyof AllowedComponentProps
>

declare module '@adonisjs/inertia/types' {
  export interface InertiaPages {
    'auth/login': ExtractProps<(typeof import('../../inertia/pages/auth/login.vue'))['default']>
    'auth/signup': ExtractProps<(typeof import('../../inertia/pages/auth/signup.vue'))['default']>
    'customers': ExtractProps<(typeof import('../../inertia/pages/customers.vue'))['default']>
    'dashboard': ExtractProps<(typeof import('../../inertia/pages/dashboard.vue'))['default']>
    'errors/not_found': ExtractProps<(typeof import('../../inertia/pages/errors/not_found.vue'))['default']>
    'errors/server_error': ExtractProps<(typeof import('../../inertia/pages/errors/server_error.vue'))['default']>
    'home': ExtractProps<(typeof import('../../inertia/pages/home.vue'))['default']>
    'inbox': ExtractProps<(typeof import('../../inertia/pages/inbox.vue'))['default']>
    'index': ExtractProps<(typeof import('../../inertia/pages/index.vue'))['default']>
    'settings/index': ExtractProps<(typeof import('../../inertia/pages/settings/index.vue'))['default']>
    'settings/members': ExtractProps<(typeof import('../../inertia/pages/settings/members.vue'))['default']>
    'settings/notifications': ExtractProps<(typeof import('../../inertia/pages/settings/notifications.vue'))['default']>
    'settings/security': ExtractProps<(typeof import('../../inertia/pages/settings/security.vue'))['default']>
  }
}
