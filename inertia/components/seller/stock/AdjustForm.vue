<script setup lang="ts">
import { computed } from 'vue'
import { useForm } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import { urlFor } from '~/client'
import { stockReasonLabel } from './reasons'
const props = defineProps<{
  productId: number
  variant: Data.Seller.Variant
  reasons: string[]
}>()
const modes = [
  { label: 'Add', value: 'add', description: 'Stock received or returned' },
  { label: 'Remove', value: 'remove', description: 'Damaged, lost, or written off' },
  { label: 'Set count', value: 'set', description: 'Replace on hand with a counted total' },
] as const
const form = useForm({
  mode: 'add' as (typeof modes)[number]['value'],
  quantity: null as number | null,
  reason: 'received',
  note: '',
})
const onHand = computed(() => props.variant.inventoryQuantity ?? 0)
const held = computed(() => props.variant.inventoryReservedQuantity)
const amount = computed(() => {
  const value = Number(form.quantity)
  return form.quantity === null || String(form.quantity).trim() === '' || !Number.isInteger(value)
    ? null
    : value
})
const projected = computed(() => {
  if (amount.value === null) return null
  if (form.mode === 'set') return amount.value
  return form.mode === 'add' ? onHand.value + amount.value : onHand.value - amount.value
})
const defaultReasons = { add: 'received', remove: 'damaged', set: 'count' } as const
function selectMode(mode: (typeof modes)[number]['value']) {
  form.mode = mode
  form.reason = defaultReasons[mode]
  form.clearErrors()
}
function save() {
  form
    .transform((data) => ({ ...data, quantity: amount.value, note: data.note.trim() || null }))
    .post(
      urlFor('seller.stock_adjustments.store', {
        productId: props.productId,
        variantId: props.variant.id,
      }),
      {
        preserveScroll: true,
        onSuccess: () => form.reset('quantity', 'note'),
      }
    )
}
</script>

<template>
  <form class="space-y-4" aria-labelledby="adjust-stock-title" @submit.prevent="save">
    <h2 id="adjust-stock-title" class="text-lg font-semibold text-highlighted">Adjust stock</h2>
    <fieldset>
      <legend class="sr-only">Adjustment type</legend>
      <div class="grid gap-2 sm:grid-cols-3">
        <label v-for="mode in modes" :key="mode.value" class="cursor-pointer">
          <input
            type="radio"
            name="mode"
            :value="mode.value"
            :checked="form.mode === mode.value"
            class="peer sr-only"
            @change="selectMode(mode.value)"
          />
          <span
            class="block h-full rounded-md border border-default p-3 peer-checked:border-primary peer-checked:bg-primary/10 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
          >
            <span class="block text-sm font-medium text-highlighted">{{ mode.label }}</span>
            <span class="mt-1 block text-xs text-muted">{{ mode.description }}</span>
          </span>
        </label>
      </div>
    </fieldset>
    <div class="grid gap-4 sm:grid-cols-2">
      <UFormField
        name="quantity"
        :label="form.mode === 'set' ? 'Counted on hand' : 'Units'"
        :error="form.errors.quantity"
        required
      >
        <UInput
          v-model="form.quantity"
          type="number"
          min="0"
          step="1"
          inputmode="numeric"
          class="w-full"
          required
        />
      </UFormField>
      <UFormField name="reason" label="Reason" :error="form.errors.reason" required>
        <USelect
          v-model="form.reason"
          :items="reasons.map((reason) => ({ label: stockReasonLabel(reason), value: reason }))"
          class="w-full"
        />
      </UFormField>
    </div>
    <UFormField
      name="note"
      label="Note"
      description="Optional. A supplier invoice, count sheet, or what happened."
      :error="form.errors.note"
    >
      <UTextarea v-model="form.note" :rows="2" :maxlength="500" class="w-full" />
    </UFormField>
    <p class="text-sm text-default" role="status" aria-live="polite">
      <template v-if="projected === null">On hand stays at {{ onHand }}.</template>
      <template v-else-if="projected < 0"
        >That removes more than the {{ onHand }} on hand.</template
      >
      <template v-else-if="projected < held"
        >{{ held }} {{ held === 1 ? 'unit is' : 'units are' }} held by pending orders, so on hand
        cannot go below {{ held }}.</template
      >
      <template v-else
        >On hand goes from {{ onHand }} to
        <strong class="text-highlighted tabular-nums">{{ projected }}</strong
        >.</template
      >
    </p>
    <div class="flex justify-end">
      <UButton
        type="submit"
        label="Save adjustment"
        :loading="form.processing"
        :disabled="form.processing"
        class="text-highlighted dark:text-inverted"
      />
    </div>
  </form>
</template>
