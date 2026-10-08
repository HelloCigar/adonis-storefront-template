<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, toRef, useTemplateRef, watch } from 'vue'
import { usePage } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import { useOrderChat } from '~/composables/useOrderChat'
import { useMessageCopy } from '~/composables/useMessageCopy'
import { type ChatMessagesProps } from '@nuxt/ui'

const { copyMessage, isSupported: canCopy } = useMessageCopy()

const props = defineProps<{
  conversation: Data.Chat.Conversation
  side: Data.Chat.Message['senderRole']
  /** Shown to staff when the customer is typing. */
  customerName?: string
}>()

const page = usePage()
const chat = useOrderChat(toRef(props, 'conversation'), { side: props.side })
const { messages, connection, typing, sending, error } = chat

const input = ref('')
const scroller = useTemplateRef('scroller')
const picker = useTemplateRef('picker')

// Mirrors the server's limits so a bad pick is caught before uploading.
const maxImages = 4
const maxImageBytes = 5 * 1024 * 1024
const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const pending = ref<{ file: File; preview: string }[]>([])
const pickError = ref<string | null>(null)

function pickImages(event: Event) {
  const target = event.target as HTMLInputElement
  const files = [...(target.files ?? [])]
  target.value = ''
  pickError.value = null
  for (const file of files) {
    if (pending.value.length >= maxImages) {
      pickError.value = `You can send up to ${maxImages} photos at a time.`
      break
    }
    if (!imageTypes.includes(file.type)) {
      pickError.value = 'Photos must be JPG, PNG, WebP, or GIF.'
      continue
    }
    if (file.size > maxImageBytes) {
      pickError.value = 'Each photo must be 5 MB or smaller.'
      continue
    }
    pending.value.push({ file, preview: URL.createObjectURL(file) })
  }
}

function removeImage(index: number) {
  const [removed] = pending.value.splice(index, 1)
  if (removed) URL.revokeObjectURL(removed.preview)
  pickError.value = null
}

function clearImages() {
  for (const image of pending.value) URL.revokeObjectURL(image.preview)
  pending.value = []
}

onBeforeUnmount(clearImages)

// Text-only messages need the live socket; photos upload over HTTP.
const canSubmit = computed(() =>
  pending.value.length ? !sending.value : !!input.value.trim() && connection.value === 'live'
)

// The viewer's own messages take the "user" side; the other party's take the other.
const uiMessages = computed<NonNullable<ChatMessagesProps['messages']>>(() =>
  messages.value.map((message) => ({
    id: message.id,
    role: message.senderRole === props.side ? 'user' : 'assistant',
    parts: [
      ...message.images.map((image) => ({
        type: 'file' as const,
        mediaType: image.mimeType,
        url: image.url,
        filename: image.name,
      })),
      ...(message.body ? [{ type: 'text' as const, text: message.body }] : []),
    ],
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

// The other party's messages can be copied, e.g. an address or tracking number.
const assistantConfig = computed<ChatMessagesProps['assistant']>(() => ({
  variant: 'outline',
  actions: canCopy.value
    ? [
        {
          label: 'Copy to clipboard',
          icon: 'i-lucide-copy',
          onClick: (_event, message) => void copyMessage(message),
        },
      ]
    : undefined,
}))

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
  if (!canSubmit.value) return
  const sent = pending.value.length
    ? await chat.sendImages(
        pending.value.map((image) => image.file),
        input.value
      )
    : await chat.send(input.value)
  if (!sent) return
  input.value = ''
  pickError.value = null
  clearImages()
}
</script>

<template>
  <div class="flex flex-col flex-1 min-h-0">
    <div ref="scroller" class="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
      <UChatMessages
        v-if="uiMessages.length"
        :messages="uiMessages"
        :user="userConfig"
        :assistant="assistantConfig"
        :status="typing ? 'submitted' : undefined"
      >
        <template #files="{ parts }">
          <a
            v-for="part in parts"
            :key="part.url"
            :href="part.url"
            target="_blank"
            rel="noopener"
            class="block overflow-hidden rounded-md ring ring-default"
          >
            <img
              :src="part.url"
              :alt="part.filename ?? 'Photo'"
              loading="lazy"
              class="size-32 sm:size-40 object-cover"
            />
          </a>
        </template>
      </UChatMessages>
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
      <template v-else>
        <p v-if="pickError || error" role="alert" class="text-sm text-error pb-2">
          {{ pickError ?? error }}
        </p>
        <UChatPrompt
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
          <template v-if="pending.length" #header>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="(image, index) in pending"
                :key="image.preview"
                class="relative size-16 overflow-hidden rounded-md ring ring-default"
              >
                <img :src="image.preview" :alt="image.file.name" class="size-full object-cover" />
                <UButton
                  icon="i-lucide-x"
                  size="xs"
                  color="neutral"
                  variant="solid"
                  :aria-label="`Remove ${image.file.name}`"
                  class="absolute top-1 end-1 rounded-full p-0.5"
                  @click="removeImage(index)"
                />
              </div>
            </div>
          </template>
          <template #footer>
            <input
              ref="picker"
              type="file"
              :accept="imageTypes.join(',')"
              multiple
              class="hidden"
              @change="pickImages"
            />
            <UTooltip text="Add photos">
              <UButton
                icon="i-lucide-image-plus"
                color="neutral"
                variant="ghost"
                aria-label="Add photos"
                :disabled="sending || pending.length >= maxImages"
                @click="picker?.click()"
              />
            </UTooltip>
            <UChatPromptSubmit :loading="sending" :disabled="!canSubmit" class="ms-auto" />
          </template>
        </UChatPrompt>
      </template>
    </div>
  </div>
</template>
