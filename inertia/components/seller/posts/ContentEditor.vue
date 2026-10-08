<script setup lang="ts">
import type { EditorSuggestionMenuItem, EditorToolbarItem } from '@nuxt/ui'
import type { JSONContent } from '@tiptap/vue-3'
defineProps<{ invalid?: boolean }>()
const content = defineModel<JSONContent>({ required: true })

/** Only nodes and marks the server renders; see app/services/content/rich_text_service.ts. */
const toolbar: EditorToolbarItem[][] = [
  [
    { kind: 'undo', icon: 'i-lucide-undo-2', tooltip: { text: 'Undo' } },
    { kind: 'redo', icon: 'i-lucide-redo-2', tooltip: { text: 'Redo' } },
  ],
  [
    {
      icon: 'i-lucide-heading',
      tooltip: { text: 'Text style' },
      content: { align: 'start' },
      items: [
        { kind: 'paragraph', label: 'Paragraph', icon: 'i-lucide-pilcrow' },
        { kind: 'heading', level: 2, label: 'Heading', icon: 'i-lucide-heading-2' },
        { kind: 'heading', level: 3, label: 'Subheading', icon: 'i-lucide-heading-3' },
        { kind: 'heading', level: 4, label: 'Small heading', icon: 'i-lucide-heading-4' },
      ],
    },
  ],
  [
    { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold', tooltip: { text: 'Bold' } },
    { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic', tooltip: { text: 'Italic' } },
    {
      kind: 'mark',
      mark: 'underline',
      icon: 'i-lucide-underline',
      tooltip: { text: 'Underline' },
    },
    {
      kind: 'mark',
      mark: 'strike',
      icon: 'i-lucide-strikethrough',
      tooltip: { text: 'Strikethrough' },
    },
    { kind: 'mark', mark: 'code', icon: 'i-lucide-code', tooltip: { text: 'Inline code' } },
    { kind: 'link', icon: 'i-lucide-link', tooltip: { text: 'Link' } },
  ],
  [
    { kind: 'bulletList', icon: 'i-lucide-list', tooltip: { text: 'Bulleted list' } },
    { kind: 'orderedList', icon: 'i-lucide-list-ordered', tooltip: { text: 'Numbered list' } },
    { kind: 'blockquote', icon: 'i-lucide-text-quote', tooltip: { text: 'Quote' } },
    { kind: 'codeBlock', icon: 'i-lucide-square-code', tooltip: { text: 'Code block' } },
    {
      kind: 'horizontalRule',
      icon: 'i-lucide-separator-horizontal',
      tooltip: { text: 'Divider' },
    },
    { kind: 'image', icon: 'i-lucide-image', tooltip: { text: 'Image from URL' } },
  ],
]

const bubble: EditorToolbarItem[][] = [
  [
    { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold' },
    { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic' },
    { kind: 'mark', mark: 'underline', icon: 'i-lucide-underline' },
    { kind: 'mark', mark: 'strike', icon: 'i-lucide-strikethrough' },
    { kind: 'mark', mark: 'code', icon: 'i-lucide-code' },
    { kind: 'link', icon: 'i-lucide-link' },
  ],
]

const commands: EditorSuggestionMenuItem[][] = [
  [
    { type: 'label', label: 'Text' },
    { kind: 'paragraph', label: 'Paragraph', icon: 'i-lucide-pilcrow' },
    { kind: 'heading', level: 2, label: 'Heading', icon: 'i-lucide-heading-2' },
    { kind: 'heading', level: 3, label: 'Subheading', icon: 'i-lucide-heading-3' },
    { kind: 'bulletList', label: 'Bulleted list', icon: 'i-lucide-list' },
    { kind: 'orderedList', label: 'Numbered list', icon: 'i-lucide-list-ordered' },
    { kind: 'blockquote', label: 'Quote', icon: 'i-lucide-text-quote' },
    { kind: 'codeBlock', label: 'Code block', icon: 'i-lucide-square-code' },
  ],
  [
    { type: 'label', label: 'Insert' },
    { kind: 'horizontalRule', label: 'Divider', icon: 'i-lucide-separator-horizontal' },
    { kind: 'image', label: 'Image from URL', icon: 'i-lucide-image' },
  ],
]
</script>

<template>
  <div
    class="rounded-lg border bg-default"
    :class="invalid ? 'border-error' : 'border-default focus-within:border-primary'"
  >
    <UEditor
      v-slot="{ editor }"
      v-model="content"
      content-type="json"
      :mention="false"
      placeholder="Write your post, or type / for blocks…"
      class="w-full"
      :ui="{ base: 'min-h-96 px-4 py-6 sm:px-10' }"
    >
      <UEditorToolbar
        :editor="editor"
        :items="toolbar"
        class="sticky top-0 z-10 overflow-x-auto rounded-t-lg border-b border-default bg-default/95 px-2 py-1.5 backdrop-blur"
      />
      <UEditorToolbar :editor="editor" :items="bubble" layout="bubble" />
      <UEditorSuggestionMenu :editor="editor" :items="commands" />
      <UEditorDragHandle :editor="editor" />
    </UEditor>
  </div>
</template>
