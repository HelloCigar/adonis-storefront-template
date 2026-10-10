<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  toRef,
  useTemplateRef,
  watch,
} from 'vue'
import { format, isSameDay, isThisYear, isToday, isYesterday } from 'date-fns'
import type { AvatarProps } from '@nuxt/ui'
import type { Data } from '@generated/data'
import { useOrderChat } from '~/composables/useOrderChat'
import { useMessageCopy } from '~/composables/useMessageCopy'
import MessageGroup from '~/components/chat/MessageGroup.vue'

const { copyMessage, isSupported: canCopy } = useMessageCopy()

const props = defineProps<{
  conversation: Data.Chat.Conversation
  side: Data.Chat.Message['senderRole']
  /** Shown to staff when the customer is typing. */
  customerName?: string
}>()

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

const gapMs = 5 * 60 * 1000

interface Group {
  key: string
  mine: boolean
  messages: Data.Chat.Message[]
}

/**
 * Messages by day, then runs from one sender. A run breaks after five quiet minutes so
 * every group's time stays close to each of its messages.
 */
const days = computed(() => {
  const result: { key: string; label: string; groups: Group[] }[] = []
  let previous: Data.Chat.Message | undefined
  for (const message of messages.value) {
    const at = new Date(message.createdAt)
    let day = result[result.length - 1]
    if (!day || !previous || !isSameDay(new Date(previous.createdAt), at)) {
      day = { key: format(at, 'yyyy-MM-dd'), label: dayLabel(at), groups: [] }
      result.push(day)
    }
    const group = day.groups[day.groups.length - 1]
    const continues =
      group &&
      previous &&
      previous.senderRole === message.senderRole &&
      previous.senderName === message.senderName &&
      previous.automated === message.automated &&
      at.getTime() - new Date(previous.createdAt).getTime() < gapMs
    if (continues) group.messages.push(message)
    else
      day.groups.push({
        key: message.id,
        mine: message.senderRole === props.side,
        messages: [message],
      })
    previous = message
  }
  return result
})

function dayLabel(date: Date) {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, isThisYear(date) ? 'EEEE, MMMM d' : 'MMMM d, yyyy')
}

// Customers see the store team as one sender. Staff share their side, so their own
// messages are labelled with who wrote them.
const otherName = computed(() =>
  props.side === 'customer' ? 'Store team' : (props.customerName ?? 'Customer')
)
const otherAvatar = computed<AvatarProps>(() =>
  props.side === 'customer'
    ? { icon: 'i-lucide-store', alt: 'Store team' }
    : { alt: props.customerName ?? 'Customer' }
)

function groupName(group: Group) {
  const first = group.messages[0]!
  if (!group.mine) return props.side === 'customer' ? otherName.value : first.senderName
  if (props.side === 'customer') return undefined
  return first.automated ? `${first.senderName} · Automatic` : first.senderName
}

// Only the viewer's latest message says whether the other side has seen it.
const latestMineId = computed(
  () => messages.value.findLast((message) => message.senderRole === props.side)?.id
)
function receipt(group: Group) {
  const last = group.messages[group.messages.length - 1]!
  if (!group.mine || last.id !== latestMineId.value || last.automated) return undefined
  return last.read ? 'Seen' : 'Sent'
}

const viewing = ref<Data.Chat.Message['images'][number] | null>(null)

// A short drop, such as the first connect, does not need a notice.
const showConnection = ref(false)
let connectionTimer: ReturnType<typeof setTimeout> | undefined
watch(
  connection,
  (state) => {
    clearTimeout(connectionTimer)
    if (state === 'live') showConnection.value = false
    else connectionTimer = setTimeout(() => (showConnection.value = true), 1500)
  },
  { immediate: true }
)
onBeforeUnmount(() => clearTimeout(connectionTimer))

function scrollToBottom(smooth: boolean) {
  const el = scroller.value
  if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
}

// Follow new messages unless the reader has scrolled back through the thread; then offer
// a jump back down instead of moving the page under them.
const nearBottom = ref(true)
const unseen = ref(0)

function onScroll() {
  const el = scroller.value
  nearBottom.value = !el || el.scrollHeight - el.scrollTop - el.clientHeight < 120
  if (nearBottom.value) unseen.value = 0
}

function jumpToLatest() {
  unseen.value = 0
  scrollToBottom(true)
}

watch(
  () => messages.value.length,
  (count, previous) => {
    if (count <= previous) return
    const last = messages.value[count - 1]
    if (nearBottom.value || last?.senderRole === props.side) nextTick(() => scrollToBottom(true))
    else unseen.value += count - previous
  }
)
watch(typing, (isTyping) => {
  if (isTyping && nearBottom.value) nextTick(() => scrollToBottom(true))
})
watch(
  () => props.conversation.roomKey,
  () => {
    unseen.value = 0
    nextTick(() => scrollToBottom(false))
  }
)
onMounted(() => scrollToBottom(false))

// The prompt ignores Enter on an empty text box, so a photo-only message sends here.
function onEnter(event: KeyboardEvent) {
  if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return
  if (!pending.value.length || input.value.trim()) return
  event.preventDefault()
  void onSubmit()
}

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
    <div class="relative flex flex-col flex-1 min-h-0">
      <div
        ref="scroller"
        class="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6"
        role="log"
        aria-live="polite"
        :aria-label="`Messages about order ${conversation.orderNumber}`"
        @scroll.passive="onScroll"
      >
        <div v-if="messages.length" class="flex flex-col gap-6">
          <section v-for="day in days" :key="day.key" class="flex flex-col gap-4">
            <USeparator :label="day.label" :ui="{ label: 'text-xs text-muted font-normal' }" />
            <MessageGroup
              v-for="group in day.groups"
              :key="group.key"
              :messages="group.messages"
              :mine="group.mine"
              :name="groupName(group)"
              :avatar="otherAvatar"
              :receipt="receipt(group)"
              :can-copy="canCopy"
              @copy="copyMessage"
              @open="viewing = $event"
            />
          </section>

          <div v-if="typing" class="flex items-end gap-2.5">
            <UAvatar v-bind="otherAvatar" size="md" class="shrink-0" />
            <div
              class="flex items-center gap-1 rounded-lg px-3.5 py-3 bg-default ring ring-default"
              aria-hidden="true"
            >
              <span
                v-for="dot in 3"
                :key="dot"
                class="size-1.5 rounded-full bg-current text-dimmed motion-safe:animate-bounce"
                :style="{ animationDelay: `${(dot - 1) * 150}ms` }"
              />
            </div>
            <span class="sr-only">{{ otherName }} is typing</span>
          </div>
        </div>
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

      <UButton
        v-if="unseen"
        :label="unseen === 1 ? '1 new message' : `${unseen} new messages`"
        trailing-icon="i-lucide-arrow-down"
        size="sm"
        class="absolute left-1/2 -translate-x-1/2 bottom-3 rounded-full"
        @click="jumpToLatest"
      />
    </div>

    <UModal
      :open="!!viewing"
      :title="viewing?.name ?? 'Photo'"
      :ui="{ content: 'sm:max-w-3xl', body: 'flex justify-center p-2 sm:p-4' }"
      @update:open="(open) => !open && (viewing = null)"
    >
      <template #body>
        <img
          v-if="viewing"
          :src="viewing.url"
          :alt="viewing.name"
          class="max-h-[75vh] w-auto rounded-md object-contain"
        />
      </template>
      <template #footer>
        <UButton
          v-if="viewing"
          :href="viewing.url"
          target="_blank"
          rel="noopener"
          external
          label="Open original"
          icon="i-lucide-external-link"
          color="neutral"
          variant="outline"
        />
      </template>
    </UModal>

    <div class="shrink-0 px-4 pb-4 sm:px-6">
      <p v-if="!conversation.canSend" class="text-sm text-muted py-3 border-t border-default">
        Messages are closed for this order.
      </p>
      <template v-else>
        <p
          v-if="showConnection && !error"
          role="status"
          class="flex items-center gap-1.5 text-sm text-muted pb-2"
        >
          <UIcon name="i-lucide-loader-circle" class="size-4 motion-safe:animate-spin" />
          {{
            connection === 'offline'
              ? 'Chat is offline. Photos still send; text sends once you reconnect.'
              : 'Reconnecting to chat…'
          }}
        </p>
        <p v-if="pickError || error" role="alert" class="text-sm text-error pb-2">
          {{ pickError ?? error }}
        </p>
        <UChatPrompt
          v-model="input"
          variant="subtle"
          :placeholder="side === 'customer' ? 'Message the store team…' : 'Reply to the customer…'"
          :maxrows="6"
          :autofocus="side === 'staff'"
          autoresize
          maxlength="2000"
          @submit="onSubmit"
          @keydown.enter="onEnter"
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
            <!-- A plain button: the prompt's own submit skips an empty text box. -->
            <UChatPromptSubmit
              type="button"
              :loading="sending"
              :disabled="!canSubmit"
              class="ms-auto"
              @click="onSubmit"
            />
          </template>
        </UChatPrompt>
      </template>
    </div>
  </div>
</template>
