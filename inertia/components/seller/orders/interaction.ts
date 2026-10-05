import { computed, inject, provide, ref, type InjectionKey } from 'vue'
import type { FormComponentProps } from '@inertiajs/core'

function createInteraction() {
  const busy = ref(false)
  const error = ref('')
  const uncertain = ref(false)
  const locked = computed(() => busy.value || uncertain.value)
  const callbacks = {
    onBefore: () => {
      if (locked.value) return false
      error.value = ''
    },
    onStart: () => {
      busy.value = true
    },
    onFinish: () => {
      busy.value = false
    },
    onError: () => {
      error.value = 'Check the highlighted fields and submit again. Your input has been kept.'
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
  return { busy, locked, error, uncertain, callbacks: formCallbacks, requestOptions }
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
