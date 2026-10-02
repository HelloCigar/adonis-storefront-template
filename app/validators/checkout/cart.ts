import vine from '@vinejs/vine'

export const cartAddValidator = vine.create({
  variantId: vine.number().withoutDecimals().positive(),
  quantity: vine.number().withoutDecimals().min(1).max(10),
})
export const cartUpdateValidator = vine.create({
  quantity: vine.number().withoutDecimals().min(1).max(10),
})
