import { watch } from 'vue'
import { useStorage } from '@vueuse/core'
import { useAppConfig } from '@nuxt/ui/runtime/vue/composables/useAppConfig.js'

export const primaryColors = [
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
]
export const neutralColors = [
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'taupe',
  'mauve',
  'mist',
  'olive',
]

const appConfig = useAppConfig() as { ui: { colors: { primary: string; neutral: string } } }
const defaults = { ...appConfig.ui.colors }

/**
 * The visitor's chosen primary and neutral colours, remembered in this browser only.
 * Each visitor sees their own choice; nothing is saved on the server.
 */
const stored = useStorage('theme-colors', { primary: defaults.primary, neutral: defaults.neutral })

watch(
  stored,
  (colors) => {
    appConfig.ui.colors.primary = primaryColors.includes(colors.primary)
      ? colors.primary
      : defaults.primary
    appConfig.ui.colors.neutral = neutralColors.includes(colors.neutral)
      ? colors.neutral
      : defaults.neutral
  },
  { immediate: true, deep: true }
)

export function useThemeColors() {
  return {
    colors: stored,
    isDefault: () =>
      stored.value.primary === defaults.primary && stored.value.neutral === defaults.neutral,
    reset: () => (stored.value = { primary: defaults.primary, neutral: defaults.neutral }),
  }
}
