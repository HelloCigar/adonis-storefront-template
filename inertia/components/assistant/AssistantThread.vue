<script setup lang="ts">
import { ref } from 'vue'
import { Link } from '@adonisjs/inertia/vue'
import { useShoppingAssistant } from '~/composables/shoppingAssistant'
import AssistantProductCards from '~/components/assistant/AssistantProductCards.vue'
import AssistantSuggestions from '~/components/assistant/AssistantSuggestions.vue'
import AssistantOrderLinks from '~/components/assistant/AssistantOrderLinks.vue'
import AssistantProposal from '~/components/assistant/AssistantProposal.vue'

const { messages, status, busy, send, notice, blocked } = useShoppingAssistant()
const input = ref('')
/** Matches the server's limit on one message. */
const messageChars = 1000

const submit = async () => {
  const text = input.value
  input.value = ''
  await send(text)
}
</script>

<template>
  <div class="flex h-full flex-col gap-4">
    <div
      data-assistant-thread
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
            <AssistantProductCards
              v-else-if="part.type === 'tool-searchProducts' && part.state === 'output-available'"
              :products="part.output"
            />
            <Link
              v-else-if="part.type === 'data-checkout'"
              route="checkout.create"
              class="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Checkout
              <UIcon name="i-lucide-arrow-right" class="size-4" />
            </Link>
            <AssistantProposal
              v-else-if="
                part.type === 'tool-proposeAddToCart' &&
                part.state === 'output-available' &&
                'id' in part.output
              "
              :proposal="part.output"
            />
            <AssistantOrderLinks
              v-else-if="
                part.type === 'tool-getMyOrder' &&
                part.state === 'output-available' &&
                'order' in part.output
              "
              :orders="[part.output.order]"
            />
            <AssistantOrderLinks
              v-else-if="
                part.type === 'tool-listMyOrders' &&
                part.state === 'output-available' &&
                'orders' in part.output
              "
              :orders="part.output.orders"
            />
          </template>
          <!-- A declined request offers the page's questions again, under the reply. -->
          <AssistantSuggestions
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
      placeholder="Ask about products, shipping or your orders"
      :autofocus="false"
      @submit="submit"
    >
      <template #footer>
        <UChatPromptSubmit aria-label="Send" :disabled="busy" class="ms-auto" />
      </template>
    </UChatPrompt>
  </div>
</template>
