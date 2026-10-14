<script setup lang="ts">
import { reactive } from 'vue'
import { computed, ref, watch } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { useRouter } from '@adonisjs/inertia/vue'
import { urlFor } from '~/client'
import { t } from '~/utils/store'
import type { FormSubmitEvent } from '@nuxt/ui'
import { z } from 'zod'
const page = usePage()
const router = useRouter()
const isLoggedIn = computed(() => !!page.props.user)
const schema = z.object({
  email: z.email().optional(),
  subscribeNewsletter: z.boolean().optional(),
})
type Schema = z.output<typeof schema>
const state = reactive<Partial<Schema>>({ email: undefined, subscribeNewsletter: false })
const open = ref(false)
const onSubmit = (event: FormSubmitEvent<Schema>) =>
  router.visit({
    route: 'session.create',
    qs: {
      email: event.data.email,
      returnTo: event.submitter?.hasAttribute('data-return-to-orders')
        ? urlFor('orders.index')
        : urlFor('account.show'),
    },
  })
watch(
  () => page.url,
  () => {
    open.value = false
  }
)
</script>
<template>
  <UPopover
    v-model:open="open"
    :ui="{
      content: 'mt-1 mr-2 lg:mr-4 max-w-[calc(100vw-1rem)]',
    }"
  >
    <UButton
      :icon="isLoggedIn ? 'i-lucide-user-round-check' : 'i-lucide-user-round'"
      variant="ghost"
      color="neutral"
      :label="t('account.label')"
      :ui="{
        label: 'sr-only',
        base: 'px-1.5 lg:px-2',
      }"
    />

    <template #content>
      <div class="p-5">
        <div class="flex justify-between">
          <p class="text-lg lg:text-xl text-highlighted font-semibold pe-10 mb-6">
            <span v-if="!isLoggedIn">
              {{ t('account.signIn.title') }}
            </span>

            <span v-else>
              {{ t('account.menu.title') }}
            </span>
          </p>

          <UButton
            variant="soft"
            color="neutral"
            size="sm"
            :icon="'i-lucide-x'"
            :ui="{
              base: 'p-1.5 size-7',
              label: 'sr-only',
            }"
            :label="t('account.menu.close')"
            @click="open = false"
          />
        </div>

        <template v-if="!isLoggedIn">
          <UForm :schema="schema" :state="state" class="flex flex-col space-y-2" @submit="onSubmit">
            <UInput
              v-model="state.email"
              size="xl"
              trailing-icon="i-lucide-arrow-right"
              :placeholder="t('account.profile.email')"
              :ui="{
                trailingIcon: 'size-4',
              }"
            />

            <UCheckbox
              v-model="state.subscribeNewsletter"
              :label="t('account.subscribeNewsletter')"
              :ui="{
                label: 'text-sm',
              }"
            />

            <div class="mt-4 flex justify-between gap-6">
              <UButton
                type="submit"
                variant="soft"
                size="xl"
                trailing-icon="i-lucide-log-in"
                :ui="{
                  trailingIcon: 'size-4',
                }"
                class="order-2 grow justify-center"
              >
                {{ t('account.signIn.action') }}
              </UButton>

              <UButton
                type="submit"
                variant="outline"
                size="xl"
                :label="t('account.menu.orders')"
                trailing-icon="i-lucide-map-pin-house"
                :ui="{
                  trailingIcon: 'size-4',
                }"
                class="order-1 grow justify-center"
                data-return-to-orders
              />
            </div>
          </UForm>
        </template>

        <template v-else>
          <UButton
            :to="urlFor('account.show')"
            size="xl"
            class="w-full justify-center mb-4"
            :label="t('account.menu.overview')"
            icon="i-lucide-house"
          />

          <UButton
            :to="urlFor('orders.index')"
            variant="soft"
            size="xl"
            class="w-full justify-center text-center mb-4"
            :label="t('account.menu.orders')"
            icon="i-lucide-map-pin-house"
          />

          <UButton
            :to="urlFor('account.profile.show')"
            variant="soft"
            size="xl"
            class="w-full justify-center text-center mb-4"
            :label="t('account.menu.profile')"
            icon="i-lucide-user-round"
          />

          <UButton
            :to="urlFor('account.security.show')"
            variant="soft"
            size="xl"
            class="w-full justify-center text-center mb-4"
            :label="t('account.menu.security')"
            icon="i-lucide-shield"
          />

          <UButton
            :to="urlFor('account.logout')"
            variant="outline"
            size="xl"
            class="w-full justify-center text-center"
            :label="t('account.logout')"
            icon="i-lucide-log-out"
          />
        </template>
      </div>
    </template>
  </UPopover>
</template>
