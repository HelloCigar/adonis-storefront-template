<script setup lang="ts">
import { ref } from 'vue'
import { startAuthentication } from '@simplewebauthn/browser'
import { useHttp, useRouter } from '@adonisjs/inertia/vue'

const toast = useToast()
const router = useRouter()
const processing = ref(false)
const challenge = useHttp({ route: 'passkey_login_challenges.store' })

async function signIn() {
  processing.value = true

  try {
    const optionsJSON = await challenge.submit()
    const response = await startAuthentication({ optionsJSON })

    router.post(
      { route: 'passkey_session.store' },
      { response },
      { preserveScroll: true, onFinish: () => (processing.value = false) }
    )
  } catch (caught) {
    processing.value = false

    if (caught instanceof Error && caught.name === 'NotAllowedError') {
      return
    }

    // Device-side failure: no request reached the server, so there is no flash to show.
    toast.add({
      title: 'Unable to sign in with this passkey',
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
  }
}
</script>

<template>
  <UButton
    type="button"
    icon="i-lucide-key-round"
    color="neutral"
    variant="outline"
    block
    size="lg"
    class="min-h-11"
    :label="processing ? 'Waiting for your device…' : 'Sign in with a passkey'"
    :loading="processing"
    :disabled="processing"
    @click="signIn"
  />
</template>
