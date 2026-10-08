<script setup lang="ts">
import { watch } from 'vue'
import { useForm } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import { urlFor } from '~/client'
const props = defineProps<{ discount?: Data.Seller.Discount }>()
const open = defineModel<boolean>('open', { required: true })
const kinds = [
  { label: 'Percentage', value: 'percentage' },
  { label: 'Fixed amount', value: 'fixed' },
]
const form = useForm({
  code: '',
  description: '',
  kind: 'percentage' as 'percentage' | 'fixed',
  percentOff: '',
  amountOff: '',
  minimumSubtotal: '',
  usageLimit: '',
  oncePerCustomer: false,
  active: true,
  startsAt: '',
  endsAt: '',
})
const pad = (value: number) => String(value).padStart(2, '0')
function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
function toIso(value: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
function toNumber(value: unknown) {
  const text = String(value ?? '').trim()
  return text === '' ? null : Number(text)
}
watch(
  open,
  (isOpen) => {
    if (!isOpen) return
    const discount = props.discount
    form.reset()
    form.clearErrors()
    if (discount)
      Object.assign(form, {
        code: discount.code,
        description: discount.description || '',
        kind: discount.kind === 'fixed' ? 'fixed' : 'percentage',
        percentOff: discount.percentOff === null ? '' : String(discount.percentOff),
        amountOff: discount.amountOffMinor === null ? '' : String(discount.amountOffMinor / 100),
        minimumSubtotal: discount.minimumSubtotalMinor
          ? String(discount.minimumSubtotalMinor / 100)
          : '',
        usageLimit: discount.usageLimit === null ? '' : String(discount.usageLimit),
        oncePerCustomer: discount.oncePerCustomer,
        active: discount.active,
        startsAt: toLocalInput(discount.startsAt),
        endsAt: toLocalInput(discount.endsAt),
      })
  },
  { immediate: true }
)
function save() {
  form.transform((data) => ({
    code: data.code,
    description: data.description.trim() || null,
    kind: data.kind,
    percentOff: data.kind === 'percentage' ? toNumber(data.percentOff) : null,
    amountOff: data.kind === 'fixed' ? toNumber(data.amountOff) : null,
    minimumSubtotal: toNumber(data.minimumSubtotal) ?? 0,
    usageLimit: toNumber(data.usageLimit),
    oncePerCustomer: data.oncePerCustomer,
    active: data.active,
    startsAt: toIso(data.startsAt),
    endsAt: toIso(data.endsAt),
  }))
  const options = {
    preserveScroll: true,
    onSuccess: () => {
      open.value = false
    },
  }
  if (props.discount)
    form.patch(urlFor('seller.discounts.update', { id: props.discount.id }), options)
  else form.post(urlFor('seller.discounts.store'), options)
}
</script>
<template>
  <UModal
    v-model:open="open"
    :title="discount ? 'Edit discount' : 'Add discount'"
    description="Set the code customers enter at checkout, what it takes off, and when it applies."
    :dismissible="!form.processing"
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <form class="space-y-4" @submit.prevent="save">
        <UFormField
          name="code"
          label="Code"
          description="Letters, numbers, dashes and underscores. Saved in capitals."
          :error="form.errors.code"
          required
          ><UInput
            v-model="form.code"
            class="w-full"
            :ui="{ base: 'font-mono uppercase' }"
            maxlength="40"
            required
        /></UFormField>
        <UFormField
          name="description"
          label="Description"
          description="Optional. Only shown to staff."
          :error="form.errors.description"
          ><UInput v-model="form.description" class="w-full" maxlength="255"
        /></UFormField>
        <UFormField name="kind" label="Type" :error="form.errors.kind" required
          ><URadioGroup v-model="form.kind" :items="kinds" orientation="horizontal"
        /></UFormField>
        <UFormField
          v-if="form.kind === 'percentage'"
          name="percentOff"
          label="Percent off"
          :error="form.errors.percentOff"
          required
          ><UInput
            v-model="form.percentOff"
            type="number"
            min="1"
            max="100"
            step="1"
            inputmode="numeric"
            class="w-full"
            required
            ><template #trailing><span class="text-sm text-muted">%</span></template></UInput
          ></UFormField
        >
        <UFormField
          v-else
          name="amountOff"
          label="Amount off"
          :error="form.errors.amountOff"
          required
          ><UInput
            v-model="form.amountOff"
            type="number"
            min="0.01"
            step="0.01"
            inputmode="decimal"
            class="w-full"
            required
            ><template #leading><span class="text-sm text-muted">₱</span></template></UInput
          ></UFormField
        >
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            name="minimumSubtotal"
            label="Minimum spend"
            description="Optional. Leave blank for no minimum."
            :error="form.errors.minimumSubtotal"
            ><UInput
              v-model="form.minimumSubtotal"
              type="number"
              min="0"
              step="0.01"
              inputmode="decimal"
              class="w-full"
              ><template #leading><span class="text-sm text-muted">₱</span></template></UInput
            ></UFormField
          >
          <UFormField
            name="usageLimit"
            label="Usage limit"
            description="Optional. Blank means unlimited."
            :error="form.errors.usageLimit"
            ><UInput
              v-model="form.usageLimit"
              type="number"
              min="1"
              step="1"
              inputmode="numeric"
              class="w-full"
          /></UFormField>
        </div>
        <UFormField name="oncePerCustomer" :error="form.errors.oncePerCustomer"
          ><USwitch v-model="form.oncePerCustomer" label="Limit to one use per customer email"
        /></UFormField>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            name="startsAt"
            label="Starts"
            description="Optional."
            :error="form.errors.startsAt"
            ><UInput v-model="form.startsAt" type="datetime-local" class="w-full"
          /></UFormField>
          <UFormField name="endsAt" label="Ends" description="Optional." :error="form.errors.endsAt"
            ><UInput v-model="form.endsAt" type="datetime-local" class="w-full"
          /></UFormField>
        </div>
        <UFormField name="active" :error="form.errors.active"
          ><USwitch v-model="form.active" label="Active"
        /></UFormField>

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            type="button"
            label="Cancel"
            color="neutral"
            variant="outline"
            :disabled="form.processing"
            @click="open = false"
          />
          <UButton
            type="submit"
            label="Save"
            :loading="form.processing"
            :disabled="form.processing"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
