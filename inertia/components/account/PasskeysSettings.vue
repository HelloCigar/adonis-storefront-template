<script setup lang="ts">
import { ref } from 'vue'
import type { Data } from '@generated/data'
import { Form, useHttp, useRouter } from '@adonisjs/inertia/vue'
import { startRegistration, WebAuthnError } from '@simplewebauthn/browser'

defineProps<{ passkeys: Data.Account.Passkey[] }>()

const toast = useToast()
const router = useRouter()
const processing = ref(false)
const renamingId = ref<string | null>(null)
const challenge = useHttp({ route: 'passkey_registration_challenges.store' })

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const formatDate = (value: string | null) => (value ? dateFormat.format(new Date(value)) : null)

/**
 * Device-side failures never reach the server, so there is no flash
 * message for them; server-side failures arrive through FlashToasts.
 */
function showError(title: string) {
  toast.add({ title, color: 'error', icon: 'i-lucide-circle-alert' })
}

async function addPasskey() {
  processing.value = true

  try {
    const optionsJSON = await challenge.submit()
    const response = await startRegistration({ optionsJSON })

    router.post(
      { route: 'passkeys.store' },
      { response },
      { preserveScroll: true, onFinish: () => (processing.value = false) }
    )
  } catch (caught) {
    processing.value = false

    if (
      caught instanceof WebAuthnError &&
      caught.code === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED'
    ) {
      showError('This device already has a passkey for your account')
      return
    }

    if (caught instanceof Error && caught.name === 'NotAllowedError') {
      return
    }

    showError('Unable to add the passkey. Please try again')
  }
}
</script>

<template>
  <UPageCard
    title="Passkeys"
    description="Sign in with your fingerprint, face, or screen lock instead of a password. Passkeys are stored by your device or password manager and cannot be phished."
    variant="subtle"
  >
    <ul
      v-if="passkeys.length > 0"
      aria-label="Passkeys"
      class="flex flex-col divide-y divide-default"
    >
      <li v-for="passkey in passkeys" :key="passkey.id" class="py-3 first:pt-0 last:pb-0">
        <Form
          v-if="renamingId === passkey.id"
          v-slot="{ errors, processing: saving }"
          :options="{ preserveScroll: true }"
          route="passkeys.update"
          :params="{ id: passkey.id }"
          class="flex flex-col sm:flex-row sm:items-start gap-3"
          @success="renamingId = null"
        >
          <UFormField label="Passkey name" name="name" :error="errors.name" class="flex-1">
            <UInput name="name" :default-value="passkey.name" autofocus class="w-full" />
          </UFormField>
          <div class="flex gap-2 sm:mt-6">
            <UButton
              type="submit"
              :label="saving ? 'Saving…' : 'Save'"
              :loading="saving"
              :disabled="saving"
            />
            <UButton
              type="button"
              label="Cancel"
              color="neutral"
              variant="ghost"
              @click="renamingId = null"
            />
          </div>
        </Form>

        <div v-else class="flex max-sm:flex-col justify-between sm:items-center gap-3">
          <div class="flex items-start gap-3 min-w-0">
            <UIcon name="i-lucide-key-round" class="size-5 mt-0.5 text-muted shrink-0" />
            <div class="min-w-0">
              <p class="flex items-center gap-2 text-sm font-medium text-highlighted">
                <span class="truncate">{{ passkey.name }}</span>
                <UBadge
                  v-if="passkey.backedUp"
                  label="Synced"
                  color="neutral"
                  variant="soft"
                  size="sm"
                />
              </p>
              <p class="text-sm text-muted">
                Added {{ formatDate(passkey.createdAt) }} ·
                {{
                  passkey.lastUsedAt ? `Last used ${formatDate(passkey.lastUsedAt)}` : 'Never used'
                }}
              </p>
            </div>
          </div>

          <div class="flex gap-2 shrink-0">
            <UButton
              type="button"
              label="Rename"
              color="neutral"
              variant="outline"
              @click="renamingId = passkey.id"
            />
            <Form
              v-slot="{ processing: removing }"
              :options="{ preserveScroll: true }"
              route="passkeys.destroy"
              :params="{ id: passkey.id }"
            >
              <UButton
                type="submit"
                :label="removing ? 'Removing…' : 'Remove'"
                color="error"
                variant="soft"
                :disabled="removing"
              />
            </Form>
          </div>
        </div>
      </li>
    </ul>
    <p v-else class="text-sm text-muted">You have not added any passkeys yet.</p>

    <UButton
      type="button"
      icon="i-lucide-plus"
      class="w-fit"
      :label="processing ? 'Waiting for your device…' : 'Add a passkey'"
      :loading="processing"
      :disabled="processing"
      @click="addPasskey"
    />
  </UPageCard>
</template>
