import vine from '@vinejs/vine'

export const cartAddValidator = vine.create({
  variantId: vine.string().ulid(),
  quantity: vine.number().withoutDecimals().min(1).max(10),
})
export const cartUpdateValidator = vine.create({
  quantity: vine.number().withoutDecimals().min(1).max(10),
})
export const discountCodeValidator = vine.create({
  code: vine.string().trim().minLength(1).maxLength(40),
})
