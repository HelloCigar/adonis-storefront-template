import { computed, inject, provide, ref, type InjectionKey } from 'vue'
import { useForm, usePage } from '@inertiajs/vue3'
import { urlFor } from '~/client'

const cartKey: InjectionKey<ReturnType<typeof createCart>> = Symbol('store-cart')

const createCart = () => {
  const page = usePage()
  const cart = computed(() => page.props.cart)
  const open = ref(false)
  const form = useForm({})
  const toast = useToast()
  let queue: Promise<unknown> = Promise.resolve()

  const submit = (
    method: 'post' | 'patch' | 'delete',
    url: string,
    body: { variantId?: number; quantity?: number } = {}
  ) => {
    const task = queue.then(
      () =>
        new Promise<boolean>((resolve) => {
          let saved = false
          form
            .transform(() => body)
            .submit(method, url, {
              only: ['cart', 'errors'],
              preserveState: true,
              preserveScroll: true,
              onSuccess: () => {
                saved = true
              },
              onError: (errors) =>
                toast.add({
                  title: 'Unable to update cart',
                  description: Object.values(errors).flat().join(' '),
                  color: 'error',
                }),
              onFinish: () => resolve(saved),
            })
        })
    )
    queue = task
    return task
  }

  const add = async (variantId: number, quantity = 1) => {
    const saved = await submit('post', urlFor('cart.add'), { variantId, quantity })
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
    loading: computed(() => form.processing),
    lines: computed(() => cart.value?.lines ?? []),
    quantity: computed(() => cart.value?.totalQuantity ?? 0),
    total: computed(() => cart.value?.cost?.totalAmount),
    add,
    update: (id: number, quantity: number) =>
      submit('patch', urlFor('cart.update', { id }), { quantity }),
    remove: (id: number) => submit('delete', urlFor('cart.remove', { id })),
  }
}

export const provideCart = () => provide(cartKey, createCart())

export const useCart = () => {
  const cart = inject(cartKey)
  if (!cart) throw new Error('Cart components require the storefront layout.')
  return cart
}
