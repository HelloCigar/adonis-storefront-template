<script setup lang="ts">
import { useColorMode } from '@vueuse/core'
import { neutralColors, primaryColors, useThemeColors } from '~/composables/theme'

const { store: mode } = useColorMode()
const { colors, isDefault, reset } = useThemeColors()
const modes = [
  { value: 'light', label: 'Light', icon: 'i-lucide-sun' },
  { value: 'dark', label: 'Dark', icon: 'i-lucide-moon' },
  { value: 'auto', label: 'System', icon: 'i-lucide-monitor' },
] as const
// Tailwind's own "neutral" palette is exposed as old-neutral, since Nuxt UI owns the name.
const swatch = (color: string) => (color === 'neutral' ? 'old-neutral' : color)
</script>

<template>
  <div class="space-y-5">
    <fieldset>
      <legend class="text-sm font-medium text-highlighted mb-2">Mode</legend>
      <div class="grid grid-cols-3 gap-2">
        <UButton
          v-for="option in modes"
          :key="option.value"
          :label="option.label"
          :icon="option.icon"
          :aria-pressed="mode === option.value"
          :variant="mode === option.value ? 'soft' : 'outline'"
          :color="mode === option.value ? 'primary' : 'neutral'"
          size="sm"
          class="justify-center"
          @click="mode = option.value"
        />
      </div>
    </fieldset>

    <fieldset v-for="group in ['primary', 'neutral'] as const" :key="group">
      <legend class="text-sm font-medium text-highlighted mb-2">
        {{ group === 'primary' ? 'Accent colour' : 'Neutral colour' }}
      </legend>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="color in group === 'primary' ? primaryColors : neutralColors"
          :key="color"
          type="button"
          :title="color"
          :aria-label="color"
          :aria-pressed="colors[group] === color"
          class="size-7 rounded-full ring-2 ring-offset-2 ring-offset-(--ui-bg) transition-shadow focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          :class="[
            `bg-${swatch(color)}-500`,
            colors[group] === color ? 'ring-(--ui-border-inverted)' : 'ring-transparent',
          ]"
          @click="colors[group] = color"
        />
      </div>
    </fieldset>

    <UButton
      v-if="!isDefault()"
      label="Reset colours"
      icon="i-lucide-rotate-ccw"
      variant="link"
      color="neutral"
      size="sm"
      class="px-0"
      @click="reset"
    />
  </div>
</template>
