<script setup lang="ts">
import { ref } from 'vue'
import { useDashboardCopilot } from '~/composables/dashboardCopilot'
import CopilotRecordLinks from '~/components/copilot/CopilotRecordLinks.vue'
import CopilotSuggestions from '~/components/copilot/CopilotSuggestions.vue'
import CopilotProposal from '~/components/copilot/CopilotProposal.vue'

const { messages, status, busy, send, notice, blocked, proposals } = useDashboardCopilot()
const input = ref('')
/** Matches the server's limit on one message. */
const messageChars = 2000

const submit = async () => {
  const text = input.value
  input.value = ''
  await send(text)
}
</script>

<template>
  <div class="flex h-full flex-col gap-4">
    <div
      data-copilot-thread
      :data-status="status"
      :data-message-count="messages.length"
      :data-blocked="blocked"
      class="flex-1 overflow-y-auto"
    >
      <slot v-if="!messages.length" name="empty" />
      <UChatMessages v-else :messages="messages" :status="status" should-auto-scroll>
        <template #content="{ message }">
          <template v-for="(part, index) in message.parts" :key="`${message.id}-${index}`">
            <p v-if="part.type === 'text'" class="whitespace-pre-wrap">{{ part.text }}</p>
            <CopilotRecordLinks
              v-else-if="
                part.type === 'tool-getOrder' &&
                part.state === 'output-available' &&
                part.output.found
              "
              :orders="[part.output.order]"
            />
            <CopilotRecordLinks
              v-else-if="part.type === 'tool-searchOrders' && part.state === 'output-available'"
              :orders="part.output"
            />
            <CopilotProposal
              v-else-if="
                part.type === 'tool-proposeChange' &&
                part.state === 'output-available' &&
                'proposalId' in part.output &&
                proposals.has(part.output.proposalId)
              "
              :proposal="proposals.get(part.output.proposalId)!"
            />
          </template>
          <!-- A declined request offers the page's questions again, under the reply. -->
          <CopilotSuggestions
            v-if="
              message.parts.some(
                (part) => part.type === 'tool-offerSuggestions' && part.state === 'output-available'
              )
            "
            class="mt-2"
          />
        </template>
      </UChatMessages>
      <UAlert
        v-if="notice"
        :title="notice"
        color="warning"
        variant="subtle"
        icon="i-lucide-circle-alert"
        class="mt-3"
      />
    </div>

    <UChatPrompt
      v-model="input"
      aria-label="Message"
      :maxlength="messageChars"
      placeholder="Ask about orders, products, customers or sales"
      :autofocus="false"
      @submit="submit"
    >
      <template #footer>
        <UChatPromptSubmit aria-label="Send" :disabled="busy" class="ms-auto" />
      </template>
    </UChatPrompt>
  </div>
</template>
