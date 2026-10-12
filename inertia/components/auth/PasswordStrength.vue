<script setup lang="ts">
import { computed, ref } from 'vue'
import { checkPassword } from '@adonisplus/persona/password_policy'
import type { PasswordPolicy } from '@adonisplus/persona/password_policy/types'
import PasswordMeter from '~/components/auth/PasswordMeter.vue'
import PasswordRequirements from '~/components/auth/PasswordRequirements.vue'

// The policy is absent for the instant first render of an Inertia link visit.
const props = defineProps<{ policy?: PasswordPolicy }>()

const password = ref('')
const result = computed(() => (props.policy ? checkPassword(password.value, props.policy) : null))

function handleInput(event: Event) {
  password.value = (event.target as HTMLInputElement).value
}
</script>

<template>
  <div @input="handleInput">
    <slot />
    <template v-if="result">
      <PasswordMeter :score="result.score" :valid="result.valid" />
      <PasswordRequirements :requirements="result.requirements" />
    </template>
  </div>
</template>
