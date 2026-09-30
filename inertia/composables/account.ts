import { computed } from 'vue'
import { useForm } from '@inertiajs/vue3'
import type { registry } from '@generated/registry'
import { urlFor } from '~/client'

type AddressInput = (typeof registry.routes)['account.addresses.create']['types']['body']
type ProfileInput = (typeof registry.routes)['account.profile.update']['types']['body']

export const useAccount = () => {
  const form = useForm({})
  const toast = useToast()
  const submit = (
    method: 'post' | 'patch' | 'delete',
    url: string,
    body: AddressInput | ProfileInput = {}
  ) =>
    new Promise<boolean>((resolve) => {
      let saved = false
      form
        .transform(() => body)
        .submit(method, url, {
          only: ['customer', 'errors'],
          preserveScroll: true,
          preserveState: true,
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
          onFinish: () => resolve(saved),
        })
    })

  return {
    loading: computed(() => form.processing),
    updateProfile: (body: ProfileInput) => submit('patch', urlFor('account.profile.update'), body),
    createAddress: ({
      address,
      defaultAddress,
    }: {
      address: AddressInput
      defaultAddress?: boolean
    }) => submit('post', urlFor('account.addresses.create'), { ...address, defaultAddress }),
    updateAddress: ({
      addressId,
      address,
      defaultAddress,
    }: {
      addressId: number
      address: AddressInput
      defaultAddress?: boolean
    }) =>
      submit('patch', urlFor('account.addresses.update', { id: addressId }), {
        ...address,
        defaultAddress,
      }),
    setDefaultAddress: (id: number) => submit('post', urlFor('account.addresses.default', { id })),
    deleteAddress: ({ addressId }: { addressId: number }) =>
      submit('delete', urlFor('account.addresses.delete', { id: addressId })),
  }
}
