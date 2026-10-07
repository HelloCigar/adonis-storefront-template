import vine from '@vinejs/vine'

const optionalText = () => vine.string().trim().maxLength(255).optional()
export const addressValidator = vine.create({
  firstName: optionalText(),
  lastName: optionalText(),
  company: optionalText(),
  address1: vine.string().trim().maxLength(255),
  address2: optionalText(),
  city: vine.string().trim().maxLength(255),
  zip: vine.string().trim().maxLength(30),
  territoryCode: vine.string().trim().toUpperCase().fixedLength(2),
  zoneCode: optionalText(),
  phoneNumber: optionalText(),
  defaultAddress: vine.boolean().optional(),
})
