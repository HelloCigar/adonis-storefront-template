import type { Data } from '@generated/data'

export type Money = Data.Catalog.ProductVariant['price']
export type Variant = NonNullable<Data.Catalog.Product['variants']>[number] & {
  image?: Data.Shared.Media | null
  featuredMedia?: Data.Shared.Media | null
}
export type ProductOption = Omit<Data.Catalog.Product['options'][number], 'optionValues'> & {
  optionValues: Array<{
    name: string
    disabled?: boolean
    swatch?: { color?: string; image?: { previewImage?: { url: string } } }
  }>
}
