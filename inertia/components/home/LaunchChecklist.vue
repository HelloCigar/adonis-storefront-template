<script setup lang="ts">
import type { Data } from '@generated/data'
import { useRouter } from '@adonisjs/inertia/vue'
import { urlFor } from '~/client'

type Item = NonNullable<Data.Settings.StoreSetup['checklist']>['items'][number]

defineProps<{ items: Item[] }>()

const router = useRouter()
const dismiss = () => router.delete({ route: 'launch_checklist.destroy' }, { preserveScroll: true })

/** Where each launch task is done. */
const destinations: Record<Item['key'], string> = {
  product: urlFor('seller.products.index', {}, { qs: { new: 1 } }),
  staff: urlFor('seller.users.index'),
  policies: urlFor('settings.store_policies.edit'),
}
</script>

<template>
  <section aria-labelledby="launch-checklist-title" class="flex flex-col gap-3">
    <div class="flex items-center justify-between gap-4">
      <h2 id="launch-checklist-title" class="text-base font-semibold text-highlighted">
        Launch checklist
      </h2>
      <UButton label="Dismiss" color="neutral" variant="ghost" size="sm" @click="dismiss" />
    </div>
    <UPageCard variant="subtle">
      <ul class="flex flex-col divide-y divide-default">
        <li
          v-for="item in items"
          :key="item.key"
          class="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
        >
          <ULink
            :to="destinations[item.key]"
            class="flex items-center gap-3 text-sm font-medium"
            :class="item.ticked ? 'text-muted line-through' : 'text-highlighted'"
          >
            <UIcon
              :name="item.ticked ? 'i-lucide-circle-check' : 'i-lucide-circle'"
              class="size-5 shrink-0"
              :class="item.ticked ? 'text-success' : 'text-dimmed'"
            />
            {{ item.label }}
          </ULink>
          <UBadge
            :label="item.ticked ? 'Done' : 'To do'"
            :color="item.ticked ? 'success' : 'neutral'"
            variant="subtle"
          />
        </li>
      </ul>
    </UPageCard>
  </section>
</template>
