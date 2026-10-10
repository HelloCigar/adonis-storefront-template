import { useClipboard } from '@vueuse/core'
import { useToast } from '@nuxt/ui/composables'

/** Copies a chat message's text and confirms the result with a toast. */
export function useMessageCopy() {
  // Falls back to a hidden-textarea copy where the Clipboard API is unavailable or denied.
  const { copy, copied, isSupported } = useClipboard({ legacy: true })
  const toast = useToast()

  async function copyMessage(text: string) {
    if (!text) return

    try {
      await copy(text)
      if (!copied.value) throw new Error('Clipboard unavailable')
      toast.add({ id: 'message-copied', title: 'Message copied', color: 'success' })
    } catch {
      toast.add({
        id: 'message-copied',
        title: 'Copy was blocked by the browser. Select the message to copy it.',
        color: 'warning',
      })
    }
  }

  return { copyMessage, isSupported }
}
