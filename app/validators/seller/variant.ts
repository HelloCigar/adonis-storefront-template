import vine from '@vinejs/vine'

export const variantCreateValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(255),
  sku: vine
    .string()
    .trim()
    .maxLength(255)
    .unique(async (db, value, field) => {
      const query = db.from('product_variants').where('sku', value)
      if (field.meta.id) query.whereNot('id', field.meta.id)
      return !(await query.first())
    })
    .nullable(),
  priceAmount: vine.number().decimal([0, 2]).min(0).max(100000000),
  compareAtPriceAmount: vine.number().decimal([0, 2]).min(0).max(100000000).nullable(),
  currencyCode: vine.enum(['PHP', 'USD']),
  inventoryQuantity: vine.number().withoutDecimals().min(0).max(100000000).nullable(),
  availableForSale: vine.boolean(),
  options: vine
    .array(
      vine.object({
        name: vine.string().trim().minLength(1).maxLength(100),
        value: vine.string().trim().minLength(1).maxLength(100),
      })
    )
    .maxLength(3),
})
export const variantUpdateValidator = vine.create(variantCreateValidator.schema.clone())
