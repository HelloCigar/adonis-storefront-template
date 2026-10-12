import vine from '@vinejs/vine'

export const storeIdentityValidator = vine.create({
  storeName: vine.string().trim().minLength(2).maxLength(60),
  contactEmail: vine.string().trim().email().maxLength(254),
})

export const storeShippingValidator = vine.create({
  shippingFee: vine.number().min(0).max(100_000).decimal([0, 2]),
})

export const storeSettingsValidator = vine.create({
  storeName: vine.string().trim().minLength(2).maxLength(60),
  contactEmail: vine.string().trim().email().maxLength(254),
  shippingFee: vine.number().min(0).max(100_000).decimal([0, 2]),
})
