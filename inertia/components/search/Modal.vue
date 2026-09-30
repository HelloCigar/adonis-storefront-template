<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { router, usePage } from '@inertiajs/vue3'
import { t, storePath as localePath } from '~/utils/store'
import { debounce } from '~/utils/debounce'
const page = usePage()
const query = ref('')
const open = ref(false)
const data = computed(() =>
  query.value.trim()
    ? (page.props.searchResults ?? { products: [], collections: [] })
    : { products: [], collections: [] }
)
const status = ref('success')
let cancelSearch: (() => void) | undefined
let active = true
const loadResults = debounce((value: string) => {
  if (!active || value !== query.value || !value.trim()) return
  router.reload({
    only: ['searchResults'],
    data: { search: value },
    preserveUrl: true,
    onCancelToken: (token) => {
      cancelSearch = () => token.cancel()
    },
    onFinish: () => {
      status.value = 'success'
      cancelSearch = undefined
    },
  })
}, 300)
const updateQuery = (value: string) => {
  cancelSearch?.()
  query.value = value.slice(0, 100)
  status.value = query.value.trim() ? 'pending' : 'success'
  loadResults(query.value)
}
onBeforeUnmount(() => {
  active = false
  cancelSearch?.()
})
const groups = computed(() => [
  {
    id: 'products',
    label: t('search.products'),
    items: data.value.products.map((product) => ({
      label: product.title,
      suffix: product.description ?? undefined,
      to: localePath('/product/' + product.handle),
      avatar: product.featuredImage
        ? { src: product.featuredImage.url, alt: product.featuredImage.altText ?? undefined }
        : undefined,
      onSelect: () => {
        open.value = false
      },
    })),
  },
  {
    id: 'collections',
    label: t('search.collections'),
    items: data.value.collections.map((collection) => ({
      label: collection.title,
      suffix: collection.description ?? undefined,
      to: localePath('/collection/' + collection.handle),
      avatar: collection.image
        ? { src: collection.image.url, alt: collection.image.altText ?? undefined }
        : undefined,
      onSelect: () => {
        open.value = false
      },
    })),
  },
])
</script>
<template>
  <UModal
    v-model:open="open"
    :title="t('search.label')"
    :description="t('search.description')"
    :ui="{
      content: 'max-w-2xl',
    }"
  >
    <UButton
      icon="i-lucide-search"
      variant="ghost"
      color="neutral"
      :label="t('search.label')"
      :ui="{
        label: 'hidden min-[420px]:block',
      }"
    />

    <template #content>
      <UCommandPalette
        :loading="status === 'pending'"
        :placeholder="t('search.placeholder')"
        :groups="groups"
        :close="true"
        :ui="{
          label: 'w-full text-lg px-2 pb-1',
          group: 'flex flex-wrap p-2',
          item: 'sm:w-1/2 p-3',
          itemLeadingAvatar: 'size-24 rounded-md me-2',
          itemLabel: 'whitespace-normal flex flex-col',
          itemLabelBase: 'py-1',
          itemLabelSuffix: 'line-clamp-3',
          itemWrapper: '[[data-slot=itemLeadingAvatar]+&]:py-0.5',
          itemTrailingIcon: 'hidden',
        }"
        @update:search-term="updateQuery"
        @update:open="open = false"
      />
    </template>
  </UModal>
</template>
