import { computed, inject, nextTick, provide, ref, type InjectionKey } from 'vue'
import type { FormComponentProps } from '@inertiajs/core'

function createInteraction() {
  const busy = ref(false)
  const error = ref('')
  const uncertain = ref(false)
  /** Read by the page's polite live region: validation results and workflow transitions. */
  const announcement = ref('')
  const locked = computed(() => busy.value || uncertain.value)
  let submittedForm: HTMLFormElement | null = null
  let invalidField: string | null = null
  const announce = (message: string) => {
    // Clearing first makes a repeated message audible again.
    announcement.value = ''
    void nextTick(() => {
      announcement.value = message
    })
  }
  const callbacks = {
    onBefore: () => {
      if (locked.value) return false
      error.value = ''
      submittedForm =
        document.activeElement instanceof HTMLElement
          ? document.activeElement.closest('form')
          : null
    },
    onStart: () => {
      busy.value = true
    },
    onFinish: () => {
      busy.value = false
      // Fields stay disabled until processing ends, so focus the first invalid one afterwards.
      const name = invalidField
      invalidField = null
      if (name)
        void nextTick(() => {
          submittedForm?.querySelector<HTMLElement>(`[name="${CSS.escape(name)}"]`)?.focus()
        })
    },
    onError: (errors) => {
      const fields = Object.keys(errors)
      const first = fields[0]
      announce(
        first
          ? `${fields.length === 1 ? 'One field needs' : `${fields.length} fields need`} attention. ${errors[first]}`
          : 'Check the form and submit again.'
      )
      invalidField = first ?? null
    },
    onFlash: (flash) => {
      if (flash.error) error.value = flash.error
    },
    onHttpException: (response) => {
      uncertain.value = true
      error.value =
        response.status === 403
          ? 'You no longer have permission to change this order.'
          : response.status === 401
            ? 'Your session has expired. Sign in again before continuing.'
            : response.status === 404
              ? 'This order is no longer available. Return to the order list.'
              : response.status === 429
                ? 'Too many requests. Wait a moment, then refresh status.'
                : 'The server could not confirm the result. Refresh status before trying the action again.'
      return false
    },
    onNetworkError: () => {
      uncertain.value = true
      error.value =
        'The connection was interrupted. Your action may have completed. Refresh status before trying again.'
      return false
    },
  } satisfies Pick<
    FormComponentProps,
    | 'onBefore'
    | 'onStart'
    | 'onFinish'
    | 'onError'
    | 'onFlash'
    | 'onHttpException'
    | 'onNetworkError'
  >
  const requestOptions = {
    preserveScroll: true,
    onFlash: callbacks.onFlash,
    onHttpException: callbacks.onHttpException,
    onNetworkError: callbacks.onNetworkError,
  }
  const formCallbacks = {
    onBefore: callbacks.onBefore,
    onStart: callbacks.onStart,
    onFinish: callbacks.onFinish,
    onError: callbacks.onError,
  }
  return {
    busy,
    locked,
    error,
    uncertain,
    announcement,
    announce,
    callbacks: formCallbacks,
    requestOptions,
  }
}
const key: InjectionKey<ReturnType<typeof createInteraction>> = Symbol('order-interaction')

export function provideOrderInteraction() {
  const interaction = createInteraction()
  provide(key, interaction)
  return interaction
}

export function useOrderInteraction() {
  const interaction = inject(key)
  if (!interaction) throw new Error('Order interaction must be provided by the order page')
  return interaction
}
