/* eslint-disable @typescript-eslint/naming-convention */
import { createSharedComposable } from '@vueuse/core'
import { useRouter } from '@adonisjs/inertia/vue'
import { usePage } from '@inertiajs/vue3'

const _useDashboard = () => {
  const router = useRouter()
  const page = usePage()

  defineShortcuts({
    'g-h': () => router.visit({ route: 'dashboard' }),
    'g-i': () => router.visit({ route: 'inbox' }),
    'g-u': () => {
      if (page.props.permissions.manageUsers) router.visit({ route: 'seller.users.index' })
    },
    'g-s': () => router.visit({ route: 'settings' }),
  })
}

export const useDashboard = createSharedComposable(_useDashboard)
