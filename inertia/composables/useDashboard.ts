/* eslint-disable @typescript-eslint/naming-convention */
import { ref, watch } from 'vue'
import { createSharedComposable } from '@vueuse/core'
import { useRouter } from '@adonisjs/inertia/vue'
import { usePage } from '@inertiajs/vue3'

const _useDashboard = () => {
  const router = useRouter()
  const page = usePage()
  const isNotificationsSlideoverOpen = ref(false)

  defineShortcuts({
    'g-h': () => router.visit({ route: 'dashboard' }, { viewTransition: true }),
    'g-i': () => router.visit({ route: 'inbox' }, { viewTransition: true }),
    'g-u': () => {
      if (page.props.permissions.manageUsers)
        router.visit({ route: 'seller.users.index' }, { viewTransition: true })
    },
    'g-s': () => router.visit({ route: 'settings' }, { viewTransition: true }),
    'n': () => (isNotificationsSlideoverOpen.value = !isNotificationsSlideoverOpen.value),
  })

  watch(
    () => page.url,
    () => {
      isNotificationsSlideoverOpen.value = false
    }
  )

  return {
    isNotificationsSlideoverOpen,
  }
}

export const useDashboard = createSharedComposable(_useDashboard)
