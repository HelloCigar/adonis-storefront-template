import { computed } from 'vue'
import { usePage } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import type { NavigationMenuItem } from '@nuxt/ui'
import { storePath } from '~/utils/store'

export const useMenu = (name: 'main-menu' | 'footer') => {
  const page = usePage<{ policies?: Data.Content[] }>()
  return {
    data: computed<NavigationMenuItem[]>(() =>
      name === 'main-menu'
        ? [
            { label: 'Home', to: storePath('/') },
            { label: 'Collections', to: storePath('/collections') },
          ]
        : (page.props.policies ?? []).map((policy) => ({
            label: policy.title,
            to: storePath('/policies/' + policy.handle),
          }))
    ),
  }
}
