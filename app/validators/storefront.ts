import vine from '@vinejs/vine'

export const cartAddValidator = vine.create({
  variantId: vine.number().withoutDecimals().positive(),
  quantity: vine.number().withoutDecimals().min(1).max(10),
})
export const cartUpdateValidator = vine.create({
  quantity: vine.number().withoutDecimals().min(1).max(10),
})
export const storefrontProfileValidator = vine.create({
  firstName: vine.string().trim().maxLength(100).optional(),
  lastName: vine.string().trim().maxLength(100).optional(),
})
const optionalText = () => vine.string().trim().maxLength(255).optional()
export const addressValidator = vine.create({
  firstName: optionalText(),
  lastName: optionalText(),
  company: optionalText(),
  address1: vine.string().trim().maxLength(255),
  address2: optionalText(),
  city: vine.string().trim().maxLength(255),
  zip: vine.string().trim().maxLength(30),
  territoryCode: vine.string().trim().fixedLength(2),
  zoneCode: optionalText(),
  phoneNumber: optionalText(),
  defaultAddress: vine.boolean().optional(),
})
export const searchValidator = vine.create({
  search: vine.string().trim().maxLength(100).optional(),
})
