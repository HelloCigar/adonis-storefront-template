import { computed, inject, provide, ref, type InjectionKey } from 'vue'
import { useRouter } from '@adonisjs/inertia/vue'
import type { CollectionCatalogue, CollectionQuery } from '~/types/collection'

const collectionKey: InjectionKey<ReturnType<typeof createCollection>> = Symbol('collection')

const createCollection = (handle: () => string, catalogue: () => CollectionCatalogue) => {
  const router = useRouter()
  const loading = ref(false)
  const query = computed(() => catalogue().query)
  const visit = (params: CollectionQuery, filter = false) =>
    router.visit(
      { route: 'collections.show', routeParams: { handle: handle() }, qs: params },
      {
        viewTransition: !filter,
        only: ['catalogue'],
        preserveState: true,
        preserveScroll: filter,
        replace: filter,
        onStart: () => {
          loading.value = true
        },
        onFinish: () => {
          loading.value = false
        },
      }
    )

  return {
    query,
    loading,
    setFilters: (values: Partial<Omit<CollectionQuery, 'page'>>) =>
      visit({ ...query.value, ...values, page: 1 }, true),
    clearFilters: () => visit({ page: 1, vendor: [] }, true),
    goToPage: (page: number) => visit({ ...query.value, page }),
  }
}

export const provideCollection = (handle: () => string, catalogue: () => CollectionCatalogue) => {
  const collection = createCollection(handle, catalogue)
  provide(collectionKey, collection)
  return collection
}

export const useCollection = () => {
  const collection = inject(collectionKey)
  if (!collection) throw new Error('Collection controls require a collection provider.')
  return collection
}
