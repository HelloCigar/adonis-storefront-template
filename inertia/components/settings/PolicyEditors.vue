<script setup lang="ts">
import { reactive } from 'vue'
import type { JSONContent } from '@tiptap/vue-3'
import ContentEditor from '~/components/seller/posts/ContentEditor.vue'

type EditablePolicy = {
  handle: string
  title: string
  content: JSONContent | null
  html: string | null
}

const props = defineProps<{
  policies: EditablePolicy[]
  errors: Record<string, string | undefined>
}>()

/** Each editor starts from the saved document, else the deployed HTML, else an empty page. */
const documents = reactive(
  Object.fromEntries(
    props.policies.map((policy) => [
      policy.handle,
      policy.content ?? policy.html ?? { type: 'doc', content: [] },
    ])
  ) as Record<string, JSONContent | string>
)

/** Submitted as a JSON string, like blog post content, so spaces at text edges survive. */
const serialized = (value: JSONContent | string) =>
  typeof value === 'string' ? '' : JSON.stringify(value)
</script>

<template>
  <div class="flex flex-col gap-6">
    <UFormField
      v-for="policy in policies"
      :key="policy.handle"
      :label="policy.title"
      :error="errors[`policies.${policy.handle}`]"
    >
      <ContentEditor
        v-model="documents[policy.handle]"
        :label="policy.title"
        :placeholder="`Write your ${policy.title.toLowerCase()}, or leave it empty to hide it.`"
        :invalid="!!errors[`policies.${policy.handle}`]"
        compact
      />
      <input
        type="hidden"
        :name="`policies[${policy.handle}]`"
        :value="serialized(documents[policy.handle])"
      />
    </UFormField>
  </div>
</template>
