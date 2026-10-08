import { computed, inject, provide, readonly, ref, type InjectionKey } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { useRouter } from '@adonisjs/inertia/vue'
import type { VisitOptions } from '@inertiajs/core'

const cartKey: InjectionKey<ReturnType<typeof createCart>> = Symbol('store-cart')

const createCart = () => {
  const page = usePage()
  const cart = computed(() => page.props.cart)
  const open = ref(false)
  const router = useRouter()
  const loading = ref(false)
  const toast = useToast()
  let queue: Promise<unknown> = Promise.resolve()

  /** Cart changes run one at a time; each resolves whether it was saved. */
  const submit = (visit: (options: VisitOptions) => void) => {
    const task = queue.then(
      () =>
        new Promise<boolean>((resolve) => {
          let saved = false
          visit({
            only: ['cart', 'errors'],
            preserveState: true,
            preserveScroll: true,
            onStart: () => {
              loading.value = true
            },
            onSuccess: () => {
              saved = true
            },
            onError: (errors) =>
              toast.add({
                title: 'Unable to update cart',
                description: Object.values(errors).flat().join(' '),
                color: 'error',
              }),
            onFinish: () => {
              loading.value = false
              resolve(saved)
            },
          })
        })
    )
    queue = task
    return task
  }

  const add = async (variantId: number, quantity = 1) => {
    const saved = await submit((options) =>
      router.post({ route: 'cart.add' }, { variantId, quantity }, options)
    )
    if (saved && !open.value)
      toast.add({
        title: 'Added to your cart',
        color: 'success',
        actions: [
          {
            label: 'View cart',
            onClick: () => {
              open.value = true
            },
          },
        ],
      })
    return saved
  }

  return {
    open,
    loading: readonly(loading),
    lines: computed(() => cart.value?.lines ?? []),
    quantity: computed(() => cart.value?.totalQuantity ?? 0),
    total: computed(() => cart.value?.cost?.totalAmount),
    add,
    update: (id: number, quantity: number) =>
      submit((options) =>
        router.patch({ route: 'cart.update', routeParams: { id } }, { quantity }, options)
      ),
    remove: (id: number) =>
      submit((options) => router.delete({ route: 'cart.remove', routeParams: { id } }, options)),
  }
}

export const provideCart = () => provide(cartKey, createCart())

export const useCart = () => {
  const cart = inject(cartKey)
  if (!cart) throw new Error('Cart components require the storefront layout.')
  return cart
}
