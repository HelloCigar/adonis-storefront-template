<script setup lang="ts">
import { nextTick, ref, useTemplateRef, watch } from 'vue'
import type { Data } from '@generated/data'
defineProps<{ preview: Data.Seller.EmailPreview.Variants['forPreview'] }>()
const format = ref<'html' | 'text'>('html')
const width = ref<'desktop' | 'mobile'>('desktop')
const formats = [
  { label: 'HTML', value: 'html', icon: 'i-lucide-mail' },
  { label: 'Plain text', value: 'text', icon: 'i-lucide-file-text' },
]
const widths = [
  { label: 'Desktop', value: 'desktop', icon: 'i-lucide-monitor' },
  { label: 'Mobile', value: 'mobile', icon: 'i-lucide-smartphone' },
]

// The sandbox allows same-origin reads (scripts stay disabled) so the frame can grow to fit.
const frame = useTemplateRef('frame')
const height = ref(720)
function fit() {
  const root = frame.value?.contentDocument?.documentElement
  if (root) height.value = root.scrollHeight
}
watch(width, () => nextTick(() => requestAnimationFrame(fit)))
</script>
<template>
  <section aria-labelledby="email-subject" class="min-w-0 flex flex-col gap-4">
    <dl class="rounded-lg bg-elevated/50 p-4 sm:p-5 grid gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr]">
      <dt class="text-sm text-muted">Subject</dt>
      <dd id="email-subject" class="font-semibold text-highlighted [overflow-wrap:anywhere]">
        {{ preview.subject }}
      </dd>
      <dt class="text-sm text-muted">From</dt>
      <dd class="text-sm text-default [overflow-wrap:anywhere]">{{ preview.from }}</dd>
      <dt class="text-sm text-muted">To</dt>
      <dd class="text-sm text-default [overflow-wrap:anywhere]">{{ preview.to }}</dd>
    </dl>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <UTabs v-model="format" :items="formats" :content="false" size="sm" aria-label="Format" />
      <UTabs
        v-if="format === 'html'"
        v-model="width"
        :items="widths"
        :content="false"
        size="sm"
        aria-label="Width"
        class="max-sm:hidden"
      />
    </div>
    <div v-show="format === 'html'" class="rounded-lg border border-default overflow-hidden">
      <iframe
        ref="frame"
        :srcdoc="preview.html"
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        :title="`${preview.name} email preview`"
        :style="{ height: `${height}px` }"
        class="block mx-auto w-full"
        :class="width === 'mobile' ? 'max-w-[375px] border-x border-default' : 'max-w-full'"
        @load="fit"
      />
    </div>
    <pre
      v-show="format === 'text'"
      class="rounded-lg border border-default bg-default p-4 sm:p-5 text-sm text-default whitespace-pre-wrap [overflow-wrap:anywhere] font-mono"
      >{{ preview.text }}</pre>
  </section>
</template>
