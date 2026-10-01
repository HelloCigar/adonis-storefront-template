import type { Data } from '@generated/data'

export type Money = Data.ProductVariant['price']
export type Variant = NonNullable<Data.Product['variants']>[number] & {
  image?: Data.Media | null
  featuredMedia?: Data.Media | null
}
export type ProductOption = Omit<Data.Product['options'][number], 'optionValues'> & {
  optionValues: Array<{
    name: string
    disabled?: boolean
    swatch?: { color?: string; image?: { previewImage?: { url: string } } }
  }>
}
