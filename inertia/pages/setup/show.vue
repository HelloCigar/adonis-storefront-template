<script setup lang="ts">
import type { JSONContent } from '@tiptap/vue-3'
import { computed } from 'vue'
import { Head } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import { urlFor } from '~/client'
import SetupProgress from '~/components/setup/SetupProgress.vue'
import IdentityStep from '~/components/setup/IdentityStep.vue'
import ShippingStep from '~/components/setup/ShippingStep.vue'
import PoliciesStep from '~/components/setup/PoliciesStep.vue'

const props = defineProps<{
  step: 'identity' | 'shipping' | 'policies'
  settings: Data.Settings.StoreSetting.Variants['forSetup']
  editablePolicies?: {
    handle: string
    title: string
    content: JSONContent | null
    html: string | null
  }[]
}>()

const previousStep = { identity: null, shipping: 'identity', policies: 'shipping' } as const
const previous = computed(() => previousStep[props.step])
</script>

<template>
  <Head title="Set up your store" />
  <UDashboardPanel id="setup">
    <template #header>
      <UDashboardNavbar title="Set up your store">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="flex flex-col gap-6 w-full lg:max-w-2xl mx-auto">
        <SetupProgress :step="step" :progress="settings.progress" />
        <IdentityStep v-if="step === 'identity'" :settings="settings" />
        <ShippingStep v-else-if="step === 'shipping'" :settings="settings" />
        <PoliciesStep v-else-if="editablePolicies" :policies="editablePolicies" />
        <div class="flex items-center justify-between gap-4">
          <ULink
            v-if="previous"
            :to="urlFor('setup.show', { step: previous })"
            class="text-sm text-muted hover:text-default"
          >
            Back
          </ULink>
          <span v-else />
          <ULink :to="urlFor('dashboard')" class="text-sm text-muted hover:text-default">
            Skip for now
          </ULink>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
