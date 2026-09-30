import { urlFor } from '~/client'
import { computed } from 'vue'
import { usePage } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import type { NavigationMenuItem } from '@nuxt/ui'

export const useMenu = (name: 'main-menu' | 'footer') => {
  const page = usePage<{ policies?: Data.Content[] }>()
  return {
    data: computed<NavigationMenuItem[]>(() =>
      name === 'main-menu'
        ? [
            { label: 'Home', to: urlFor('home') },
            { label: 'Collections', to: urlFor('collections.index') },
          ]
        : (page.props.policies ?? []).map((policy) => ({
            label: policy.title,
            to: urlFor('policies.show', { handle: policy.handle }),
          }))
    ),
  }
}
