<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Head, router, useForm } from '@inertiajs/vue3'
import BackButton from '~/components/seller/BackButton.vue'
import type { Data } from '@generated/data'
import type { JSONContent } from '@tiptap/vue-3'
import { urlFor } from '~/client'
import ContentEditor from '~/components/seller/posts/ContentEditor.vue'
const props = defineProps<{ post: Data.Seller.Post.Variants['forEditor'] | null }>()

const statuses = [
  { label: 'Draft', value: 'draft', description: 'Only staff can see it.' },
  { label: 'Published', value: 'published', description: 'Shown on the blog from the date.' },
]
const pad = (value: number) => String(value).padStart(2, '0')
function toLocalInput(iso: string | null | undefined) {
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
/** Lowercase words joined by dashes, matching the server's handle rule. */
function toHandle(title: string) {
  return title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 255)
}

const form = useForm({
  title: props.post?.title ?? '',
  handle: props.post?.handle ?? '',
  excerpt: props.post?.excerpt ?? '',
  badge: props.post?.badge ?? '',
  content: (props.post?.content ?? { type: 'doc', content: [] }) as JSONContent,
  status: (props.post?.status === 'published' ? 'published' : 'draft') as 'draft' | 'published',
  publishedAt: toLocalInput(props.post?.publishedAt),
})

// New posts take their handle from the title until staff edit the handle themselves.
const handleEdited = ref(!!props.post)
watch(
  () => form.title,
  (title) => {
    if (!handleEdited.value) form.handle = toHandle(title)
  }
)

const scheduled = computed(
  () =>
    form.status === 'published' &&
    !!form.publishedAt &&
    new Date(form.publishedAt).getTime() > Date.now()
)
const statusBadge = computed(() => {
  if (!props.post) return null
  if (props.post.status === 'draft') return { label: 'Draft', color: 'neutral' as const }
  if (props.post.publishedAt && new Date(props.post.publishedAt).getTime() > Date.now())
    return { label: 'Scheduled', color: 'warning' as const }
  return { label: 'Published', color: 'success' as const }
})
const lastSaved = computed(() => {
  const at = props.post?.updatedAt ?? props.post?.createdAt
  return at ? new Date(at).toLocaleString('en-PH') : null
})
const saveLabel = computed(() => {
  if (form.status === 'draft') return 'Save draft'
  if (scheduled.value) return 'Schedule'
  return props.post?.status === 'published' ? 'Update' : 'Publish'
})

function save() {
  form.transform((data) => ({
    title: data.title,
    handle: data.handle,
    excerpt: data.excerpt.trim() || null,
    badge: data.badge.trim() || null,
    // A string, so the body parser's whitespace trimming cannot reach the text nodes.
    content: JSON.stringify(data.content),
    status: data.status,
    publishedAt: toIso(data.publishedAt),
  }))
  const options = {
    preserveScroll: true,
    onSuccess: () => {
      handleEdited.value = true
      form.defaults()
    },
  }
  if (props.post) form.put(urlFor('seller.posts.update', { id: props.post.id }), options)
  else form.post(urlFor('seller.posts.store'), options)
}

// Leaving with unsaved edits asks first, for in-app visits and for closing the tab.
const leaveMessage = 'You have unsaved changes. Leave without saving?'
const removeVisitGuard = router.on('before', (event) => {
  const visit = event.detail.visit
  if (visit.method !== 'get' || !form.isDirty || form.processing) return
  if (!window.confirm(leaveMessage)) event.preventDefault()
})
function onBeforeUnload(event: BeforeUnloadEvent) {
  if (form.isDirty) event.preventDefault()
}
function onKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    if (!form.processing) save()
  }
}
onMounted(() => {
  window.addEventListener('beforeunload', onBeforeUnload)
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  removeVisitGuard()
  window.removeEventListener('beforeunload', onBeforeUnload)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Head :title="post ? post.title : 'New post'" />
  <UDashboardPanel id="post">
    <template #header>
      <UDashboardNavbar :title="post ? 'Edit post' : 'New post'">
        <template #leading>
          <UDashboardSidebarCollapse />
          <BackButton :to="urlFor('seller.posts.index')" label="Blog" />
        </template>
        <template #right>
          <UBadge
            v-if="statusBadge"
            :label="statusBadge.label"
            :color="statusBadge.color"
            variant="subtle"
          />
          <span v-if="form.isDirty" class="hidden text-sm text-muted sm:inline">Unsaved</span>
          <UButton
            :label="saveLabel"
            icon="i-lucide-save"
            :loading="form.processing"
            @click="save"
          />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <form
        class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"
        @submit.prevent="save"
      >
        <div class="space-y-4 min-w-0">
          <UFormField name="title" :error="form.errors.title">
            <UInput
              v-model="form.title"
              placeholder="Post title"
              aria-label="Title"
              variant="none"
              size="xl"
              maxlength="255"
              class="w-full"
              :ui="{ base: 'px-0 text-2xl sm:text-3xl font-semibold text-highlighted' }"
              required
            />
          </UFormField>
          <UFormField name="content" :error="form.errors.content">
            <ContentEditor v-model="form.content" :invalid="!!form.errors.content" />
          </UFormField>
        </div>

        <aside class="space-y-4 lg:sticky lg:top-4">
          <UCard :ui="{ body: 'space-y-4' }">
            <UFormField name="status" label="Status" :error="form.errors.status">
              <URadioGroup v-model="form.status" :items="statuses" />
            </UFormField>
            <UFormField
              name="publishedAt"
              label="Publish date"
              :description="
                form.status === 'published'
                  ? 'Leave blank to publish now. A future date schedules the post.'
                  : 'Optional. Used when you publish.'
              "
              :error="form.errors.publishedAt"
            >
              <UInput v-model="form.publishedAt" type="datetime-local" class="w-full" />
            </UFormField>
          </UCard>
          <UCard :ui="{ body: 'space-y-4' }">
            <UFormField
              name="handle"
              label="URL handle"
              description="Lowercase letters, numbers, and dashes."
              :error="form.errors.handle"
              required
            >
              <UInput
                v-model="form.handle"
                class="w-full"
                :ui="{ base: 'font-mono' }"
                maxlength="255"
                required
                @input="handleEdited = true"
              />
            </UFormField>
            <UFormField
              name="excerpt"
              label="Excerpt"
              description="Optional. A short summary for blog listings."
              :error="form.errors.excerpt"
            >
              <UTextarea
                v-model="form.excerpt"
                :rows="3"
                autoresize
                maxlength="500"
                class="w-full"
              />
            </UFormField>
            <UFormField
              name="badge"
              label="Badge"
              description="Optional. A short label on the blog timeline, like Release or Guide."
              :error="form.errors.badge"
            >
              <UInput v-model="form.badge" class="w-full" maxlength="40" />
            </UFormField>
          </UCard>
          <p v-if="post" class="text-xs text-muted px-1">
            <template v-if="post.authorName">Written by {{ post.authorName }}. </template
            ><template v-if="lastSaved">Last saved {{ lastSaved }}.</template>
          </p>
        </aside>
      </form>
    </template>
  </UDashboardPanel>
</template>
