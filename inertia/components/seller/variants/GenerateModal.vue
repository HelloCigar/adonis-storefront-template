<script setup lang="ts">
import { computed, watch } from 'vue'
import { useForm } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import { urlFor } from '~/client'

const props = defineProps<{ product: Data.Seller.Product }>()
const open = defineModel<boolean>('open', { required: true })
const total = computed(() =>
  props.product.optionDefinitions.reduce((count, option) => count * option.values.length, 1)
)
const missing = computed(() => {
  if (total.value > props.product.generatedLimit) return []
  const combinations = props.product.optionDefinitions.reduce<Record<string, string>[]>(
    (rows, option) =>
      rows.flatMap((row) => option.values.map((value) => ({ ...row, [option.name]: value }))),
    [{}]
  )
  return combinations.filter(
    (combination) =>
      !(props.product.variants ?? []).some((variant) => {
        const entries = Object.entries(variant.options ?? {})
        return (
          entries.length === Object.keys(combination).length &&
          entries.every(([name, value]) => combination[name] === value)
        )
      })
  )
})
const blocked = computed(
  () =>
    total.value > props.product.generatedLimit ||
    !!props.product.optionIssues.length ||
    !missing.value.length
)
const form = useForm({
  priceAmount: 0,
  compareAtPriceAmount: null as number | null,
  currencyCode: 'PHP',
  inventoryQuantity: null as number | null,
  availableForSale: true,
})
watch(open, (isOpen) => {
  if (!isOpen) return
  form.reset()
  form.clearErrors()
  form.currencyCode = props.product.variants?.[0]?.currencyCode ?? 'PHP'
})
function generate() {
  form
    .transform((data) => ({
      ...data,
      compareAtPriceAmount:
        data.compareAtPriceAmount === null || String(data.compareAtPriceAmount).trim() === ''
          ? null
          : Number(data.compareAtPriceAmount),
      inventoryQuantity:
        data.inventoryQuantity === null || String(data.inventoryQuantity).trim() === ''
          ? null
          : Number(data.inventoryQuantity),
    }))
    .post(urlFor('seller.variant_generation.store', { productId: props.product.id }), {
      preserveScroll: true,
      onSuccess: () => {
        open.value = false
      },
    })
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Generate variants"
    description="Create only the missing option combinations. Existing variants keep their details."
    :dismissible="!form.processing"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <form class="space-y-5" @submit.prevent="generate">
        <UAlert
          v-if="product.optionIssues.length"
          color="warning"
          title="Repair existing variants first"
          description="Resolve the option warnings in the variant table before generating more combinations."
        />
        <UAlert
          v-else-if="total > product.generatedLimit"
          color="warning"
          :title="`${total} combinations exceed the ${product.generatedLimit}-combination limit`"
          description="Reduce the number of option values, or add individual variants."
        />
        <UAlert
          v-else-if="!missing.length"
          color="neutral"
          title="Every combination already exists"
          description="Add another option value to create more variants."
        />
        <div v-else>
          <h3 class="font-semibold text-highlighted">
            {{ missing.length }} new {{ missing.length === 1 ? 'variant' : 'variants' }}
          </h3>
          <p class="mt-1 text-sm text-muted">
            {{ product.variants?.length ?? 0 }} existing
            {{ product.variants?.length === 1 ? 'variant stays' : 'variants stay' }} unchanged.
          </p>
          <ul
            class="mt-3 flex max-h-36 flex-wrap gap-2 overflow-y-auto"
            aria-label="New combinations"
          >
            <li
              v-for="(combination, index) in missing"
              :key="index"
              class="rounded-md bg-elevated px-2.5 py-1 text-sm text-default"
            >
              {{ Object.values(combination).join(' / ') || 'Default' }}
            </li>
          </ul>
        </div>
        <UAlert
          v-if="Object.values(form.errors).length"
          color="error"
          :title="Object.values(form.errors).join(' ')"
        />
        <fieldset :disabled="blocked || form.processing" class="space-y-4">
          <legend class="mb-3 text-sm font-semibold text-highlighted">
            Starting details for new variants
          </legend>
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField name="priceAmount" label="Price" :error="form.errors.priceAmount" required
              ><UInput
                v-model="form.priceAmount"
                type="number"
                min="0"
                step="0.01"
                required
                class="w-full"
            /></UFormField>
            <UFormField
              name="compareAtPriceAmount"
              label="Compare-at price"
              :error="form.errors.compareAtPriceAmount"
              ><UInput
                v-model="form.compareAtPriceAmount"
                type="number"
                min="0"
                step="0.01"
                class="w-full"
            /></UFormField>
            <UFormField name="currencyCode" label="Currency" :error="form.errors.currencyCode"
              ><USelect
                v-model="form.currencyCode"
                :items="['PHP', 'USD']"
                :disabled="!!product.variants?.length"
                class="w-full"
            /></UFormField>
            <UFormField
              name="inventoryQuantity"
              label="Stock per variant"
              description="Leave empty for untracked stock. Zero means sold out."
              :error="form.errors.inventoryQuantity"
              ><UInput
                v-model="form.inventoryQuantity"
                type="number"
                min="0"
                step="1"
                placeholder="Untracked"
                class="w-full"
            /></UFormField>
          </div>
          <USwitch v-model="form.availableForSale" label="Available for sale" />
          <p class="text-sm text-muted">
            SKUs and images start empty. Assign them to each variant after creation.
          </p>
        </fieldset>
        <div class="flex flex-wrap justify-end gap-2">
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
            :label="`Create ${missing.length} ${missing.length === 1 ? 'variant' : 'variants'}`"
            :loading="form.processing"
            :disabled="blocked || form.processing"
            class="text-highlighted dark:text-inverted"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
