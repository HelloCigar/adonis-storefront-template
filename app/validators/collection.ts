import vine from '@vinejs/vine'
import type { Infer } from '@vinejs/vine/types'

const validPriceRange = vine.createRule((value, _options, field) => {
  if (typeof value === 'number' && value < Number(field.parent.minPrice)) {
    field.report('The maximum price must be at least the minimum price.', 'priceRange', field)
  }
})

export const collectionQueryValidator = vine.create({
  page: vine.number().withoutDecimals().min(1).max(1_000_000).optional(),
  available: vine.boolean().optional(),
  vendor: vine
    .array(vine.string().trim().minLength(1).maxLength(255))
    .maxLength(50)
    .distinct()
    .optional(),
  minPrice: vine.number().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
  maxPrice: vine.number().min(0).max(Number.MAX_SAFE_INTEGER).use(validPriceRange()).optional(),
})

export type CollectionQuery = Infer<typeof collectionQueryValidator>
