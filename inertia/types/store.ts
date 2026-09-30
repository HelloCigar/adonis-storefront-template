import type { Data } from '@generated/data'

export type Money = Data.ProductVariant['price']
export type Variant = NonNullable<Data.Product['variants']>[number] & {
  image?: Data.Media | null
  featuredMedia?: Data.Media | null
}
export type ProductOption = Omit<Data.Product['options'][number], 'optionValues'> & {
  optionValues: Array<{
    name: string
    swatch?: { color?: string; image?: { previewImage?: { url: string } } }
  }>
}
export type ProductFilter = {
  available?: boolean
  vendor?: string
  productType?: string
  price?: { min?: number; max?: number }
}
export type Filter = {
  id: string
  label: string
  type: 'PRICE_RANGE' | 'LIST' | 'BOOLEAN'
  values: Array<{ id: string; label: string; input: string }>
}
