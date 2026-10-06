<script setup lang="ts">
import { computed, nextTick, ref, toRef, useTemplateRef, watch } from 'vue'
import { usePage } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import { useOrderChat } from '~/composables/useOrderChat'
import { type ChatMessagesProps } from '@nuxt/ui'

const props = defineProps<{
  conversation: Data.Chat.Conversation
  side: Data.Chat.Message['senderRole']
  /** Shown to staff when the customer is typing. */
  customerName?: string
}>()

const page = usePage()
const chat = useOrderChat(toRef(props, 'conversation'), {
  side: props.side,
  viewerId: computed(() => page.props.user?.id),
})
const { messages, connection, typingUserId, sending } = chat

const input = ref('')
const scroller = useTemplateRef('scroller')

// The viewer's own messages take the "user" side; the other party's take the other.
const uiMessages = computed<NonNullable<ChatMessagesProps['messages']>>(() =>
  messages.value.map((message) => ({
    id: message.id,
    role: message.senderRole === props.side ? 'user' : 'assistant',
    parts: [{ type: 'text', text: message.body }],
  }))
)

// The viewer's own messages carry their avatar; side and variant stay at the defaults.
const userConfig = computed<ChatMessagesProps['user']>(() => {
  const user = page.props.user
  return user
    ? {
        avatar: {
          src: user.avatarUrl ?? undefined,
          alt: user.fullName ?? user.email,
          text: user.initials,
        },
        variant: 'subtle',
      }
    : undefined
})

function scrollToBottom(smooth: boolean) {
  const el = scroller.value
  if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
}

// Follow new messages unless the reader has scrolled back through the thread.
watch(
  () => messages.value.length,
  (count, previous) => {
    const el = scroller.value
    const last = messages.value[count - 1]
    const nearBottom = !el || el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (count > previous && (nearBottom || last?.senderRole === props.side)) {
      nextTick(() => scrollToBottom(true))
    }
  }
)
watch(
  () => props.conversation.roomKey,
  () => nextTick(() => scrollToBottom(false))
)

async function onSubmit() {
  if (await chat.send(input.value)) input.value = ''
}
</script>

<template>
  <div class="flex flex-col flex-1 min-h-0">
    <div ref="scroller" class="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
      <UChatMessages
        v-if="uiMessages.length"
        :messages="uiMessages"
        :user="userConfig"
        :assistant="{
          variant: 'outline',
        }"
        :status="typingUserId ? 'submitted' : undefined"
      />
      <UEmpty
        v-else
        icon="i-lucide-messages-square"
        title="No messages yet"
        :description="
          side === 'customer'
            ? 'Questions about this order? Send the store team a message.'
            : `Messages you send here go to ${customerName ?? 'the customer'} on their order page.`
        "
        variant="naked"
        class="h-full"
      />
    </div>

    <div class="shrink-0 px-4 pb-4 sm:px-6">
      <p v-if="!conversation.canSend" class="text-sm text-muted py-3 border-t border-default">
        Messages are closed for this order.
      </p>
      <UChatPrompt
        v-else
        v-model="input"
        variant="subtle"
        :placeholder="side === 'customer' ? 'Message the store team…' : 'Reply to the customer…'"
        :maxrows="6"
        autoresize
        maxlength="2000"
        @submit="onSubmit"
        @update:model-value="chat.notifyTyping()"
        @blur="chat.stopTyping()"
      >
        <template #footer>
          <UChatPromptSubmit
            :loading="sending"
            :disabled="!input.trim() || connection !== 'live' || sending"
            class="ms-auto"
          />
        </template>
      </UChatPrompt>
    </div>
  </div>
</template>
