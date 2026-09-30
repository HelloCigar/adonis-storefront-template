<script setup lang="ts">
import { urlFor } from '~/client'
import { reactive } from 'vue'
import type { Data } from '@generated/data'
import { computed, watch } from 'vue'
import { t } from '~/utils/store'
import { useCart } from '~/composables/cart'
import ProductPrice from '~/components/product/Price.vue'
import { z } from 'zod'

const props = defineProps<{
  line: Data.CartLine
}>()

const { update, remove, loading } = useCart()

const variant = computed(() => props.line.merchandise!)
const to = computed(() => urlFor('products.show', { handle: variant.value.product!.handle }))

const schema = z.object({
  quantity: z.number().min(1).max(10),
})

const state = reactive<z.infer<typeof schema>>({
  quantity: props.line.quantity,
})

watch(
  () => state.quantity,
  async (quantity) => {
    if (quantity === props.line.quantity) return
    if (!(await update(props.line.id, quantity))) state.quantity = props.line.quantity
  }
)
watch(
  () => props.line.quantity,
  (quantity) => {
    state.quantity = quantity
  }
)
</script>
<template>
  <UCard :ui="{ body: 'relative flex justify-between gap-8' }">
    <ULink :to="to" :aria-label="`${t('product.view')}: '${variant.product?.title}'`">
      <img
        :src="line.image?.url"
        :alt="line.image?.altText ?? variant.product?.title"
        width="160"
        height="160"
        class="size-24 lg:size-28"
      />
    </ULink>

    <div class="h-24 flex flex-col justify-between grow lg:h-28">
      <ULink :to="to" class="pt-2.5 font-medium">
        {{ variant.product?.title }} - {{ variant.title }}
      </ULink>

      <div class="flex justify-between gap-4">
        <UForm :state="state" :schema="schema" :validate-on="['change']">
          <UFormField name="quantity">
            <UInputNumber
              v-model="state.quantity"
              :min="1"
              :max="10"
              :disabled="loading"
              class="w-24"
            />
          </UFormField>
        </UForm>

        <ProductPrice :price="variant.price" class="font-semibold leading-8" />
      </div>
    </div>

    <UButton
      variant="ghost"
      color="neutral"
      icon="i-lucide-x"
      size="sm"
      class="absolute top-0 right-0 p-2 rounded-none rounded-bl-md"
      @click="
        () => {
          remove(props.line.id)
        }
      "
    />
  </UCard>
</template>
