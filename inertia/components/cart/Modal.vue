<script setup lang="ts">
import { watch } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { t } from '~/utils/store'
import { useCart } from '~/composables/cart'
import CartLineItem from '~/components/cart/LineItem.vue'
import ProductPrice from '~/components/product/Price.vue'
const { open, loading, quantity, lines, total } = useCart()
const page = usePage()
const toast = useToast()
const checkout = () =>
  toast.add({
    title: 'Checkout is not configured',
    description: 'Connect your own checkout flow to this action.',
  })
watch(
  () => page.url,
  () => {
    open.value = false
  }
)
</script>
<template>
  <USlideover
    v-model:open="open"
    :title="t('cart.title')"
    :description="t('cart.description')"
    :ui="{ description: 'sr-only', body: 'flex flex-col gap-y-6' }"
  >
    <div class="relative">
      <UButton
        icon="i-lucide-shopping-cart"
        variant="ghost"
        color="neutral"
        :label="t('cart.open')"
        :ui="{
          label: 'sr-only',
          base: 'px-1.5 lg:px-2',
        }"
      />

      <UBadge
        v-if="quantity"
        class="absolute font-bold rounded-full -top-1.5 -right-2 px-1.5 font-mono lg:text-xs lg:-right-3 lg:-top-2"
        size="xs"
      >
        {{ quantity }}
      </UBadge>
    </div>

    <template #body>
      <TransitionGroup
        enter-to-class="opacity-100"
        leave-to-class="opacity-0"
        leave-from-class="opacity-100"
        enter-from-class="opacity-0"
      >
        <CartLineItem
          v-for="line in lines"
          :key="line.id"
          :line="line"
          class="shrink-0 duration-300"
        />
      </TransitionGroup>

      <p v-if="lines.length === 0" class="my-auto text-center">
        {{ t('cart.empty') }}
      </p>
    </template>

    <template #footer>
      <div
        v-if="total"
        class="flex justify-between items-center w-full"
        :class="{
          'animate-pulse': loading,
        }"
      >
        <div class="flex items-center gap-2">
          <p class="font-medium inline-block">
            {{ t('cart.subtotal') }}:
            <ProductPrice :price="total" />
          </p>

          <UIcon v-if="loading" name="i-lucide-loader-circle" class="animate-spin" />
        </div>

        <UButton
          variant="ghost"
          color="neutral"
          :label="t('cart.checkout')"
          size="xl"
          trailing-icon="i-lucide-arrow-right"
          :ui="{
            trailingIcon: 'size-4',
          }"
          :disabled="loading || lines.length === 0"
          @click="checkout"
        />
      </div>
    </template>
  </USlideover>
</template>
