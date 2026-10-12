import { readonly, ref } from 'vue'
import { useRouter } from '@adonisjs/inertia/vue'
import type { VisitOptions } from '@inertiajs/core'
import type { registry } from '@generated/registry'

type AddressInput = (typeof registry.routes)['account.addresses.create']['types']['body']
type ProfileInput = (typeof registry.routes)['account.profile.update']['types']['body']

export const useAccount = () => {
  const router = useRouter()
  const loading = ref(false)
  const toast = useToast()

  /** Shared visit behavior; each call resolves whether the change was saved. */
  const save = (visit: (options: VisitOptions) => void) =>
    new Promise<boolean>((resolve) => {
      let saved = false
      visit({
        only: ['customer', 'errors'],
        preserveScroll: true,
        preserveState: true,
        onStart: () => {
          loading.value = true
        },
        onSuccess: () => {
          saved = true
          toast.add({ title: 'Changes saved', color: 'success' })
        },
        onError: (errors) =>
          toast.add({
            title: 'Unable to save changes',
            description: Object.values(errors).flat().join(' '),
            color: 'error',
          }),
        onFinish: () => {
          loading.value = false
          resolve(saved)
        },
      })
    })

  return {
    loading: readonly(loading),
    updateProfile: (body: ProfileInput) =>
      save((options) => router.patch({ route: 'account.profile.update' }, body, options)),
    createAddress: ({
      address,
      defaultAddress,
    }: {
      address: AddressInput
      defaultAddress?: boolean
    }) =>
      save((options) =>
        router.post({ route: 'account.addresses.create' }, { ...address, defaultAddress }, options)
      ),
    updateAddress: ({
      addressId,
      address,
      defaultAddress,
    }: {
      addressId: string
      address: AddressInput
      defaultAddress?: boolean
    }) =>
      save((options) =>
        router.patch(
          { route: 'account.addresses.update', routeParams: { id: addressId } },
          { ...address, defaultAddress },
          options
        )
      ),
    setDefaultAddress: (id: string) =>
      save((options) =>
        router.post({ route: 'account.addresses.default', routeParams: { id } }, {}, options)
      ),
    deleteAddress: ({ addressId }: { addressId: string }) =>
      save((options) =>
        router.delete(
          { route: 'account.addresses.delete', routeParams: { id: addressId } },
          options
        )
      ),
  }
}
