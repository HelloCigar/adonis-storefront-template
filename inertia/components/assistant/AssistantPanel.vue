<script setup lang="ts">
import AssistantIntro from '~/components/assistant/AssistantIntro.vue'
import AssistantThread from '~/components/assistant/AssistantThread.vue'
import AssistantHistory from '~/components/assistant/AssistantHistory.vue'
import { computed } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { useShoppingAssistant } from '~/composables/shoppingAssistant'

defineEmits<{ close: [] }>()

const { busy, startNew, history, showingHistory } = useShoppingAssistant()
const page = usePage()
// Only signed-in shoppers keep a history; visitors have just their current conversation.
const signedIn = computed(() => Boolean(page.props.user))
</script>

<template>
  <div class="flex h-full flex-col">
    <header class="flex items-center gap-2 border-b border-default px-4 py-3">
      <p class="font-semibold text-highlighted">Shopping assistant</p>
      <UBadge label="AI" variant="subtle" size="sm" />
      <div class="ms-auto flex items-center gap-1">
        <UButton
          v-if="signedIn"
          icon="i-lucide-history"
          color="neutral"
          variant="ghost"
          aria-label="Past conversations"
          @click="history"
        />
        <UButton
          icon="i-lucide-square-pen"
          color="neutral"
          variant="ghost"
          aria-label="New conversation"
          :disabled="busy"
          @click="startNew"
        />
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          aria-label="Close"
          @click="$emit('close')"
        />
      </div>
    </header>

    <div class="min-h-0 flex-1 p-4">
      <AssistantHistory v-if="showingHistory" />
      <AssistantThread v-else>
        <template #empty>
          <AssistantIntro />
        </template>
      </AssistantThread>
    </div>
  </div>
</template>
