<script setup lang="ts">
import { format } from 'date-fns'
import type { AvatarProps } from '@nuxt/ui'
import type { Data } from '@generated/data'

type Photo = Data.Chat.Message['images'][number]

/**
 * Consecutive messages from one sender. The viewer's own messages sit on the right without
 * an avatar; the other party's sit on the left with one. The group ends with its time and,
 * on the viewer's latest message, whether the other side has seen it.
 */
const props = defineProps<{
  messages: Data.Chat.Message[]
  mine: boolean
  /** Omitted for the viewer's own messages when only one person writes on their side. */
  name?: string
  avatar?: AvatarProps
  receipt?: 'Sent' | 'Seen'
  canCopy: boolean
}>()

const emits = defineEmits<{ copy: [text: string]; open: [photo: Photo] }>()

const last = () => props.messages[props.messages.length - 1]!

/** A lone photo keeps its shape; several share a grid of squares. */
function photoStyle(photo: Photo, count: number) {
  return count === 1 && photo.width && photo.height
    ? { aspectRatio: `${photo.width} / ${photo.height}` }
    : undefined
}
</script>

<template>
  <div
    class="flex items-end gap-2.5"
    :class="mine ? 'flex-row-reverse' : 'flex-row'"
    :data-from="mine ? 'mine' : 'theirs'"
  >
    <UAvatar v-if="!mine" v-bind="avatar" size="md" class="shrink-0 mb-5" />

    <div
      class="flex flex-col gap-1 min-w-0 max-w-[85%] sm:max-w-[75%]"
      :class="mine ? 'items-end' : 'items-start'"
    >
      <p v-if="name" class="px-1 text-xs font-medium text-muted">{{ name }}</p>

      <template v-for="message in messages" :key="message.id">
        <div
          v-if="message.images.length"
          class="grid gap-1"
          :class="message.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'"
        >
          <button
            v-for="photo in message.images"
            :key="photo.id"
            type="button"
            class="block overflow-hidden rounded-md ring ring-default bg-elevated cursor-zoom-in focus-visible:outline-2 focus-visible:outline-primary"
            :class="
              message.images.length > 1
                ? 'size-28 sm:size-36'
                : photoStyle(photo, 1)
                  ? 'w-56 sm:w-64 max-h-80'
                  : 'size-48 sm:size-56'
            "
            :style="photoStyle(photo, message.images.length)"
            :aria-label="`View ${photo.name}`"
            @click="emits('open', photo)"
          >
            <img :src="photo.url" :alt="photo.name" loading="lazy" class="size-full object-cover" />
          </button>
        </div>

        <div
          v-if="message.body"
          class="group/bubble relative flex items-center gap-1"
          :class="mine ? 'flex-row-reverse' : 'flex-row'"
        >
          <p
            class="rounded-lg px-3.5 py-2 text-sm whitespace-pre-wrap break-words ring"
            :class="
              mine
                ? 'bg-primary/10 ring-primary/20 text-highlighted'
                : 'bg-default ring-default text-default'
            "
            :title="format(new Date(message.createdAt), 'PPpp')"
          >
            {{ message.body }}
          </p>
          <UButton
            v-if="!mine && canCopy"
            icon="i-lucide-copy"
            size="xs"
            color="neutral"
            variant="ghost"
            aria-label="Copy message"
            class="shrink-0 opacity-0 group-hover/bubble:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100 transition-opacity"
            @click="emits('copy', message.body)"
          />
        </div>
      </template>

      <p class="px-1 text-xs text-dimmed">
        <time :datetime="last().createdAt" :title="format(new Date(last().createdAt), 'PPpp')">
          {{ format(new Date(last().createdAt), 'p') }}
        </time>
        <template v-if="receipt"> · {{ receipt }}</template>
      </p>
    </div>
  </div>
</template>
