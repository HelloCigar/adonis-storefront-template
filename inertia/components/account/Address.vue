<script setup lang="ts">
import type { Data } from '@generated/data'
import { ref } from 'vue'
import { t } from '~/utils/store'
import { useAccount } from '~/composables/account'
import AccountAddressForm from '~/components/account/AddressForm.vue'
const props = defineProps<{
  address: Data.CustomerAddress
  isDefault?: boolean
}>()

const emit = defineEmits<{
  changed: []
}>()

const { setDefaultAddress, deleteAddress, loading } = useAccount()

const editing = ref(false)
const confirming = ref(false)

const onSetDefault = async () => {
  if (await setDefaultAddress(props.address.id)) emit('changed')
}

const onDelete = async () => {
  if (!(await deleteAddress({ addressId: props.address.id }))) return

  confirming.value = false

  emit('changed')
}
</script>
<template>
  <UCard :ui="{ body: 'flex flex-col gap-4 h-full' }">
    <div class="flex items-start justify-between gap-3">
      <p class="font-medium">
        {{
          [address.firstName, address.lastName].filter(Boolean).join(' ') ||
          t('account.addresses.title')
        }}
      </p>

      <UBadge
        v-if="isDefault"
        color="neutral"
        variant="subtle"
        :label="t('account.addresses.default')"
      />
    </div>

    <address class="not-italic text-sm text-muted grow">
      <span v-for="line in address.formatted" :key="line" class="block">
        {{ line }}
      </span>
    </address>

    <div class="flex flex-wrap gap-2">
      <UButton
        variant="soft"
        color="neutral"
        size="sm"
        icon="i-lucide-pencil"
        :label="t('account.addresses.edit')"
        @click="editing = true"
      />

      <UButton
        v-if="!isDefault"
        variant="ghost"
        color="neutral"
        size="sm"
        icon="i-lucide-star"
        :loading="loading"
        :label="t('account.addresses.setDefault')"
        @click="onSetDefault"
      />

      <UButton
        variant="ghost"
        color="error"
        size="sm"
        icon="i-lucide-trash-2"
        :label="t('account.addresses.delete')"
        @click="confirming = true"
      />
    </div>

    <AccountAddressForm
      v-model:open="editing"
      :address="address"
      :is-default="isDefault"
      @saved="emit('changed')"
    />

    <UModal
      v-model:open="confirming"
      :title="t('account.addresses.confirm.title')"
      :description="t('account.addresses.confirm.description')"
    >
      <template #footer>
        <div class="flex w-full flex-wrap justify-end gap-3">
          <UButton
            variant="ghost"
            color="neutral"
            :disabled="loading"
            :label="t('account.cancel')"
            @click="confirming = false"
          />

          <UButton
            color="error"
            :loading="loading"
            :label="t('account.addresses.delete')"
            icon="i-lucide-trash-2"
            @click="onDelete"
          />
        </div>
      </template>
    </UModal>
  </UCard>
</template>
