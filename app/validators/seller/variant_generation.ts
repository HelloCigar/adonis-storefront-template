import vine from '@vinejs/vine'

export const variantGenerationValidator = vine.create({
  priceAmount: vine.number().decimal([0, 2]).min(0).max(100000000),
  compareAtPriceAmount: vine.number().decimal([0, 2]).min(0).max(100000000).nullable(),
  currencyCode: vine.enum(['PHP', 'USD']),
  inventoryQuantity: vine.number().withoutDecimals().min(0).max(100000000).nullable(),
  availableForSale: vine.boolean(),
})
