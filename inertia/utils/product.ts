import type { Data } from '@generated/data'
import type { Money, Variant } from '~/types/store'
export const isDiscounted = (price?: Money | null, compareAtPrice?: Money | null) =>
  !!price && !!compareAtPrice && Number(compareAtPrice.amount) > Number(price.amount)
export const discountPercentage = (price?: Money | null, compareAtPrice?: Money | null) =>
  isDiscounted(price, compareAtPrice)
    ? Math.round((1 - Number(price!.amount) / Number(compareAtPrice!.amount)) * 100)
    : 0
export const hasPriceRange = (product: Data.Catalog.Product) =>
  !!product.priceRange &&
  product.priceRange.minVariantPrice.amount !== product.priceRange.maxVariantPrice.amount
export const displayPrice = (product: Data.Catalog.Product, variant?: Variant) =>
  !hasPriceRange(product) && variant ? variant.price : product.priceRange?.minVariantPrice
export const displayCompareAtPrice = (product: Data.Catalog.Product, variant?: Variant) =>
  !hasPriceRange(product) && variant
    ? variant.compareAtPrice
    : product.compareAtPriceRange?.minVariantPrice
export const isSoldOut = (product: Data.Catalog.Product) => !product.availableForSale
export const isLowStock = (variant?: Variant) =>
  !!variant?.availableForSale &&
  variant.quantityAvailable !== null &&
  variant.quantityAvailable > 0 &&
  variant.quantityAvailable <= 5
