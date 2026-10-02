<script setup lang="ts">
import { watch } from 'vue'
import { useForm } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import { urlFor } from '~/client'
const props = defineProps<{ variant?: Data.Seller.Variant; product: Data.Seller.Product }>()
const open = defineModel<boolean>('open', { required: true })
const form = useForm({
  title: 'Default',
  sku: '',
  priceAmount: 0,
  compareAtPriceAmount: null as number | null,
  currencyCode: 'PHP',
  inventoryQuantity: null as number | null,
  availableForSale: true,
  options: [] as { name: string; value: string }[],
})
watch(
  open,
  (isOpen) => {
    if (!isOpen) return
    const variant = props.variant
    form.reset()
    form.clearErrors()
    form.currencyCode = props.product.variants?.[0]?.currencyCode || 'PHP'
    if (variant)
      Object.assign(form, {
        title: variant.title,
        sku: variant.sku || '',
        priceAmount: variant.priceAmount,
        compareAtPriceAmount: variant.compareAtPriceAmount,
        currencyCode: variant.currencyCode,
        inventoryQuantity: variant.inventoryQuantity,
        availableForSale: variant.availableForSale,
        options: Object.entries(variant.options || {}).map(([name, value]) => ({ name, value })),
      })
  },
  { immediate: true }
)
function save() {
  form.transform((data) => ({
    ...data,
    sku: data.sku || null,
    compareAtPriceAmount:
      data.compareAtPriceAmount === null || String(data.compareAtPriceAmount).trim() === ''
        ? null
        : Number(data.compareAtPriceAmount),
    inventoryQuantity:
      data.inventoryQuantity === null || String(data.inventoryQuantity).trim() === ''
        ? null
        : Number(data.inventoryQuantity),
  }))
  const options = {
    preserveScroll: true,
    onSuccess: () => {
      open.value = false
    },
  }
  if (props.variant)
    form.patch(
      urlFor('seller.variants.update', { productId: props.product.id, id: props.variant.id }),
      options
    )
  else form.post(urlFor('seller.variants.store', { productId: props.product.id }), options)
}
</script>
<template>
  <UModal
    v-model:open="open"
    :title="variant ? 'Edit variant' : 'Add variant'"
    description="Leave stock empty for untracked inventory. Zero means sold out."
    :dismissible="!form.processing"
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <form class="space-y-4" @submit.prevent="save">
        <div class="grid sm:grid-cols-2 gap-4">
          <UFormField name="title" label="Title" :error="form.errors.title" required
            ><UInput v-model="form.title" class="w-full" required
          /></UFormField>
          <UFormField name="sku" label="SKU" :error="form.errors.sku"
            ><UInput v-model="form.sku" class="w-full"
          /></UFormField>
          <UFormField name="priceAmount" label="Price" :error="form.errors.priceAmount" required
            ><UInput
              v-model="form.priceAmount"
              type="number"
              min="0"
              step="0.01"
              class="w-full"
              required
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
            ><USelect v-model="form.currencyCode" :items="['PHP', 'USD']" class="w-full"
          /></UFormField>
          <UFormField
            name="inventoryQuantity"
            label="Stock quantity"
            :error="form.errors.inventoryQuantity"
            ><UInput
              v-model="form.inventoryQuantity"
              type="number"
              min="0"
              step="1"
              class="w-full"
              placeholder="Untracked"
          /></UFormField>
        </div>
        <UFormField
          name="options"
          label="Options"
          description="For example Color: Blue or Size: Small."
          :error="form.errors.options"
        >
          <div class="space-y-3">
            <div
              v-for="(option, index) in form.options"
              :key="index"
              class="flex items-start gap-2"
            >
              <UFormField
                :name="`options.${index}.name`"
                :error="form.errors[`options.${index}.name` as keyof typeof form.errors]"
                class="flex-1"
                ><UInput
                  v-model="option.name"
                  :aria-label="`Option ${index + 1} name`"
                  placeholder="Name"
                  class="w-full"
                  required
              /></UFormField>
              <UFormField
                :name="`options.${index}.value`"
                :error="form.errors[`options.${index}.value` as keyof typeof form.errors]"
                class="flex-1"
                ><UInput
                  v-model="option.value"
                  :aria-label="`Option ${index + 1} value`"
                  placeholder="Value"
                  class="w-full"
                  required
              /></UFormField>
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                :aria-label="`Remove option ${index + 1}`"
                @click="form.options.splice(index, 1)"
              />
            </div>
            <UButton
              v-if="form.options.length < 3"
              label="Add option"
              icon="i-lucide-plus"
              color="neutral"
              variant="outline"
              @click="form.options.push({ name: '', value: '' })"
            />
          </div>
        </UFormField>
        <UFormField name="availableForSale" :error="form.errors.availableForSale"
          ><USwitch v-model="form.availableForSale" label="Available for sale"
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
