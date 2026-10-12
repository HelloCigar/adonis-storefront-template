<script setup lang="ts">
import type { PasswordRequirement } from '@adonisplus/persona/password_policy/types'

defineProps<{ requirements: PasswordRequirement[] }>()

function describe(requirement: PasswordRequirement) {
  switch (requirement.rule) {
    case 'minLength':
      return `At least ${requirement.min} characters`
    case 'maxLength':
      return `At most ${requirement.max} characters`
    case 'letters':
      return 'At least one letter'
    case 'mixedCase':
      return 'Uppercase and lowercase letters'
    case 'numbers':
      return 'At least one number'
    case 'symbols':
      return 'At least one symbol'
    case 'minScore':
      return 'Hard to guess'
  }
}
</script>

<template>
  <ul aria-label="Password requirements" class="mt-2 flex flex-col gap-1 text-xs">
    <li
      v-for="requirement in requirements"
      :key="requirement.rule"
      :data-met="requirement.met"
      class="flex items-center gap-2"
      :class="requirement.met ? 'text-success' : 'text-muted'"
    >
      <UIcon
        :name="requirement.met ? 'i-lucide-check' : 'i-lucide-circle'"
        class="size-3.5 shrink-0"
        aria-hidden="true"
      />
      {{ describe(requirement) }}
    </li>
  </ul>
</template>
