<script setup lang="ts">
import { computed, ref } from 'vue'
import { useForm } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import { urlFor } from '~/client'

const props = defineProps<{ product: Data.Seller.Product }>()
const editing = ref(false)
const form = useForm({ optionDefinitions: [] as Data.Seller.Product['optionDefinitions'] })
const usedNames = computed(
  () =>
    new Set((props.product.variants ?? []).flatMap((variant) => Object.keys(variant.options ?? {})))
)
const addsDimension = computed(() =>
  form.optionDefinitions.some(
    (definition) =>
      !props.product.optionDefinitions.some((existing) => existing.name === definition.name)
  )
)
const removedNames = computed(() =>
  props.product.optionDefinitions
    .filter((definition) => !form.optionDefinitions.some((next) => next.name === definition.name))
    .map((definition) => definition.name)
)
const needsOptionRepair = computed(() =>
  props.product.optionIssues.some(
    (issue) => issue.kind === 'invalid' || issue.kind === 'configuration'
  )
)
function edit() {
  form.clearErrors()
  form.optionDefinitions = props.product.optionDefinitions.map((definition) => ({
    name: definition.name,
    values: [...definition.values],
  }))
  editing.value = true
}
function save() {
  form.patch(urlFor('seller.options.update', { productId: props.product.id }), {
    preserveScroll: true,
    onSuccess: () => {
      editing.value = false
    },
  })
}
</script>

<template>
  <UCard as="section" aria-labelledby="product-options-title">
    <template #header>
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="product-options-title" class="font-semibold text-highlighted">Product options</h2>
          <p class="mt-1 text-sm text-muted">Define the choices shared by every variant.</p>
        </div>
        <UButton
          v-if="!editing"
          :label="product.optionDefinitions.length ? 'Edit options' : 'Define options'"
          icon="i-lucide-sliders-horizontal"
          color="neutral"
          variant="outline"
          class="min-h-10"
          @click="edit"
        />
      </div>
    </template>

    <div v-if="!editing" class="space-y-3">
      <div
        v-for="definition in product.optionDefinitions"
        :key="definition.name"
        class="flex flex-wrap items-baseline gap-x-4 gap-y-2"
      >
        <span class="w-24 shrink-0 text-sm font-medium text-highlighted">{{
          definition.name
        }}</span>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="value in definition.values"
            :key="value"
            class="rounded-md bg-elevated px-2.5 py-1 text-sm text-default"
            >{{ value }}</span
          >
        </div>
      </div>
      <p v-if="!product.optionDefinitions.length" class="text-sm text-default">
        This product has one default combination. Define options such as Color or Size to offer more
        choices.
      </p>
    </div>

    <form v-else class="space-y-4" @submit.prevent="save">
      <UAlert
        v-if="form.errors.optionDefinitions"
        color="error"
        :title="form.errors.optionDefinitions"
        :ui="{ title: 'text-highlighted' }"
      />
      <p v-if="product.variants?.length" class="max-w-prose text-sm text-muted">
        Names and values already in use cannot be renamed. You can remove an option when the
        remaining variant combinations are unique.
      </p>
      <div
        v-for="(definition, index) in form.optionDefinitions"
        :key="index"
        class="grid items-start gap-3 sm:grid-cols-[10rem_1fr_auto]"
      >
        <UFormField
          :name="`optionDefinitions.${index}.name`"
          :label="`Option ${index + 1} name`"
          :error="form.errors[`optionDefinitions.${index}.name` as keyof typeof form.errors]"
          required
        >
          <UInput
            v-model="definition.name"
            :readonly="usedNames.has(definition.name)"
            :disabled="form.processing"
            class="w-full"
            placeholder="Color"
            required
          />
        </UFormField>
        <UFormField
          :name="`optionDefinitions.${index}.values`"
          :label="`Option ${index + 1} values`"
          description="Type a value and press Enter."
          :error="form.errors[`optionDefinitions.${index}.values` as keyof typeof form.errors]"
          required
        >
          <UInputTags
            v-model="definition.values"
            add-on-blur
            :disabled="form.processing"
            class="w-full"
            placeholder="Add a value"
            :max="100"
          />
        </UFormField>
        <UButton
          type="button"
          icon="i-lucide-trash"
          color="neutral"
          variant="ghost"
          :aria-label="`Remove option ${index + 1}`"
          :disabled="form.processing"
          class="min-h-10 min-w-10 sm:mt-6"
          @click="form.optionDefinitions.splice(index, 1)"
        />
      </div>
      <UButton
        v-if="form.optionDefinitions.length < 3"
        type="button"
        label="Add option"
        icon="i-lucide-plus"
        color="neutral"
        variant="outline"
        :disabled="form.processing"
        @click="form.optionDefinitions.push({ name: '', values: [] })"
      />
      <p
        v-if="removedNames.length && product.variants?.length"
        class="text-sm text-default"
        role="status"
      >
        Removing {{ removedNames.join(', ') }} clears those selections from existing variants. Their
        prices, SKUs, stock, and images stay intact. Saving is blocked if variants would share the
        remaining combination.
      </p>
      <p
        v-if="addsDimension && product.variants?.length"
        class="text-sm text-default"
        role="status"
      >
        <template v-if="needsOptionRepair">
          Existing selections are preserved. If legacy selections remain invalid, repair the flagged
          variants after saving the options.
        </template>
        <template v-else>
          Existing variants will start with the first value of each new option. Their prices, stock,
          and images stay intact.
        </template>
      </p>
      <div class="flex flex-wrap justify-end gap-2">
        <UButton
          type="button"
          label="Cancel"
          color="neutral"
          variant="outline"
          :disabled="form.processing"
          @click="editing = false"
        />
        <UButton
          type="submit"
          label="Save options"
          :loading="form.processing"
          :disabled="form.processing || form.optionDefinitions.length > 3"
          class="text-highlighted dark:text-inverted"
        />
      </div>
    </form>
  </UCard>
</template>
