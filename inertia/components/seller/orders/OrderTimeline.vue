<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Data } from '@generated/data'
import { orderLabel, operationMessage } from './presentation'
import EmailRetryForm from './EmailRetryForm.vue'
import ViaCopilot from '~/components/copilot/ViaCopilot.vue'

const props = defineProps<{ order: Data.Seller.Order }>()
const showAll = ref(false)
const visible = computed(() =>
  showAll.value ? props.order.timeline : props.order.timeline.slice(0, 8)
)
const emailStates: Record<string, { label: string; color: 'warning' | 'success' | 'neutral' }> = {
  pending: { label: 'Queued', color: 'neutral' },
  sent: { label: 'Sent', color: 'success' },
  failed: { label: 'Failed', color: 'warning' },
}
const detailValue = (value: unknown) =>
  value && typeof value === 'object'
    ? Object.entries(value)
        .map(([key, entry]) => `${orderLabel(key)} ${entry}`)
        .join(', ')
    : String(value ?? '—')
</script>

<template>
  <section aria-labelledby="order-activity-title" class="border-t border-default pt-6">
    <h2 id="order-activity-title" class="text-lg font-semibold text-highlighted">Order activity</h2>
    <p class="text-sm text-muted mt-2">
      Workflow events and customer emails, latest first. Email failures do not reverse payment or
      fulfillment.
    </p>
    <p v-if="!order.timeline.length" class="text-sm text-muted mt-4">
      No workflow events have been recorded yet.
    </p>
    <ol v-else class="mt-5 space-y-5">
      <li
        v-for="entry in visible"
        :key="entry.id"
        class="relative border-l border-default pl-5 pb-1"
      >
        <span
          class="absolute -left-1 top-1.5 size-2 rounded-full"
          :class="entry.email?.state === 'failed' ? 'bg-warning' : 'bg-accented'"
          aria-hidden="true"
        />
        <div class="flex flex-wrap items-center gap-2">
          <p data-timeline-title class="text-sm font-medium text-highlighted">{{ entry.title }}</p>
          <UBadge
            v-if="entry.email"
            class="text-default"
            :label="emailStates[entry.email.state]?.label ?? orderLabel(entry.email.state)"
            :color="emailStates[entry.email.state]?.color ?? 'neutral'"
            variant="subtle"
            size="sm"
          />
          <ViaCopilot v-if="entry.viaCopilot" :conversation-id="entry.copilotConversationId" />
        </div>
        <p class="text-sm text-muted mt-1">
          {{ entry.at.formatted
          }}<span v-if="entry.actor">
            · <bdi>{{ entry.actor }}</bdi></span
          >
        </p>
        <template v-if="entry.email?.state === 'failed'">
          <p v-if="entry.email.lastError" class="text-sm text-default mt-2 break-words">
            {{ operationMessage(entry.email.lastError, 'notification') }}
          </p>
          <EmailRetryForm
            :order-id="order.id"
            :notification-id="entry.email.notificationId"
            :kind="entry.email.kind"
            class="mt-3"
          />
        </template>
        <details v-if="entry.details && Object.keys(entry.details).length" class="mt-2">
          <summary
            class="text-sm text-muted cursor-pointer w-fit focus-visible:outline-2 focus-visible:outline-primary"
          >
            Event details
          </summary>
          <dl class="mt-2 space-y-1 text-sm">
            <div v-for="(value, key) in entry.details" :key="key" class="[overflow-wrap:anywhere]">
              <dt class="inline text-muted">{{ orderLabel(String(key)) }}:</dt>
              <dd class="inline">{{ detailValue(value) }}</dd>
            </div>
          </dl>
        </details>
      </li>
    </ol>
    <UButton
      v-if="order.timeline.length > 8"
      :label="showAll ? 'Show fewer events' : `Show all ${order.timeline.length} events`"
      color="neutral"
      variant="outline"
      class="mt-4"
      :aria-expanded="showAll"
      @click="showAll = !showAll"
    />
  </section>
</template>
