<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  name: string
  autocomplete: 'current-password' | 'new-password'
  label?: string
}>()

const visible = ref(false)
const password = ref('')
</script>

<template>
  <UInput
    v-model="password"
    :name="name"
    :type="visible ? 'text' : 'password'"
    :autocomplete="autocomplete"
    placeholder="Enter your password"
    required
    size="lg"
    class="w-full"
    :ui="{ base: 'min-h-11 pe-12 placeholder:text-muted', trailing: 'pe-1' }"
  >
    <template #trailing>
      <UButton
        type="button"
        :icon="visible ? 'i-lucide-eye-off' : 'i-lucide-eye'"
        :aria-label="`${visible ? 'Hide' : 'Show'} ${label || 'password'}`"
        :aria-pressed="visible"
        color="neutral"
        variant="ghost"
        class="min-h-10 min-w-10 justify-center"
        @click="visible = !visible"
      />
    </template>
  </UInput>
</template>
