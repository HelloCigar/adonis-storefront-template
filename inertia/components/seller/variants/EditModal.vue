<script setup lang="ts">
import { watch } from 'vue'
import { useForm } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import { urlFor } from '~/client'
const props = defineProps<{
  variant?: Data.Seller.Variant
  product: Data.Seller.Product
  images: Data.Shared.Media[]
}>()
const open = defineModel<boolean>('open', { required: true })
const form = useForm({
  title: 'Default',
  sku: '',
  priceAmount: 0,
  compareAtPriceAmount: null as number | null,
  currencyCode: 'PHP',
  inventoryQuantity: null as number | null,
  availableForSale: true,
  featuredMediaId: null as string | null,
  options: [] as { name: string; value: string }[],
})
let generatedTitle = 'Default'
watch(
  open,
  (isOpen) => {
    if (!isOpen) return
    const variant = props.variant
    form.reset()
    form.clearErrors()
    form.currencyCode = props.product.variants?.[0]?.currencyCode || 'PHP'
    form.options = props.product.optionDefinitions.map((definition) => ({
      name: definition.name,
      value: definition.values[0] ?? '',
    }))
    generatedTitle = form.options.map((option) => option.value).join(' / ') || 'Default'
    form.title = generatedTitle
    if (variant)
      Object.assign(form, {
        title: variant.title,
        sku: variant.sku || '',
        priceAmount: variant.priceAmount,
        compareAtPriceAmount: variant.compareAtPriceAmount,
        currencyCode: variant.currencyCode,
        inventoryQuantity: variant.inventoryQuantity,
        availableForSale: variant.availableForSale,
        featuredMediaId: variant.featuredMediaId,
        options: props.product.optionDefinitions
          .filter(
            (definition) =>
              props.product.optionDefinitions.length <= 3 ||
              Object.hasOwn(variant.options ?? {}, definition.name)
          )
          .map((definition) => ({
            name: definition.name,
            value: definition.values.includes(variant.options?.[definition.name] ?? '')
              ? variant.options![definition.name]
              : (definition.values[0] ?? ''),
          })),
      })
  },
  { immediate: true }
)
watch(
  () => form.options.map((option) => option.value),
  () => {
    if (props.variant) return
    const next = form.options.map((option) => option.value).join(' / ') || 'Default'
    if (form.title === generatedTitle) form.title = next
    generatedTitle = next
  },
  { deep: true }
)
function includeOption(name: string, included: boolean) {
  if (included) {
    const definition = props.product.optionDefinitions.find((option) => option.name === name)
    if (definition) form.options.push({ name, value: definition.values[0] ?? '' })
  } else form.options = form.options.filter((option) => option.name !== name)
}
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
          description="Choose one value from each shared product option."
          :error="form.errors.options"
        >
          <p v-if="!product.optionDefinitions.length" class="text-sm text-default">
            Default combination. Define product options on the page to offer more choices.
          </p>
          <div v-else class="space-y-3">
            <div v-if="product.optionDefinitions.length > 3" class="space-y-2">
              <p class="text-sm text-default">
                This legacy product has more than three options. Keep up to three on this variant,
                then remove unused product options.
              </p>
              <UCheckbox
                v-for="definition in product.optionDefinitions"
                :key="definition.name"
                :label="`Include ${definition.name}`"
                :model-value="form.options.some((option) => option.name === definition.name)"
                @update:model-value="
                  (included) => includeOption(definition.name, included === true)
                "
              />
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <UFormField
                v-for="(option, index) in form.options"
                :key="option.name"
                :name="`options.${index}.value`"
                :label="option.name"
                :error="form.errors[`options.${index}.value` as keyof typeof form.errors]"
              >
                <USelect
                  v-model="option.value"
                  :items="
                    product.optionDefinitions.find((definition) => definition.name === option.name)
                      ?.values ?? []
                  "
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>
        </UFormField>
        <fieldset aria-describedby="variant-image-help">
          <legend class="text-sm font-medium text-highlighted">Variant image</legend>
          <p id="variant-image-help" class="mt-1 text-sm text-muted">
            Choose from this product's images. The same image can be used by several variants.
          </p>
          <div class="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            <label class="cursor-pointer">
              <input
                v-model="form.featuredMediaId"
                type="radio"
                name="variantImage"
                :value="null"
                class="peer sr-only"
              />
              <span
                class="flex aspect-square flex-col items-center justify-center gap-2 rounded-md border border-default bg-default text-sm text-default peer-checked:border-primary peer-checked:bg-primary/10 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
                ><UIcon name="i-lucide-image-off" class="size-5" />No image</span
              >
            </label>
            <label
              v-for="(image, index) in images.filter((item) => item.isImage)"
              :key="image.id"
              class="cursor-pointer min-w-0"
            >
              <input
                v-model="form.featuredMediaId"
                type="radio"
                name="variantImage"
                :value="image.id"
                :aria-label="`Image ${index + 1}: ${image.altText}`"
                class="peer sr-only"
              />
              <span
                class="block rounded-md border border-default p-1 peer-checked:border-primary peer-checked:bg-primary/10 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
                ><img
                  :src="image.url"
                  alt=""
                  class="aspect-square w-full rounded-sm object-cover"
                /><span class="block truncate px-1 py-1 text-xs text-default"
                  >Image {{ index + 1 }}</span
                ></span
              >
            </label>
          </div>
          <p v-if="form.errors.featuredMediaId" class="mt-2 text-sm text-error" role="alert">
            {{ form.errors.featuredMediaId }}
          </p>
          <p v-if="!images.length" class="mt-2 text-sm text-muted">
            Add product images in the Images section, then assign one here.
          </p>
        </fieldset>
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
            class="text-highlighted dark:text-inverted"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
