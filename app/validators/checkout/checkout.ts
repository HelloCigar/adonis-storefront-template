import vine from '@vinejs/vine'
import { emailAddress } from '#validators/shared/email'

const address = vine.object({
  firstName: vine.string().trim().minLength(1).maxLength(100),
  lastName: vine.string().trim().minLength(1).maxLength(100),
  phoneNumber: vine.string().trim().minLength(7).maxLength(30),
  address1: vine.string().trim().minLength(3).maxLength(255),
  address2: vine.string().trim().maxLength(255).optional(),
  city: vine.string().trim().minLength(2).maxLength(100),
  zoneCode: vine.string().trim().minLength(2).maxLength(100),
  postalCode: vine.string().trim().minLength(3).maxLength(20),
  countryCode: vine.literal('PH'),
})

export const checkoutValidator = vine.create({
  submissionKey: vine.string().uuid(),
  cartVersion: vine.number().withoutDecimals().min(0),
  quoteFingerprint: vine.string().regex(/^[a-f0-9]{64}$/),
  email: emailAddress(),
  shipping: address,
  billing: address.clone().optional(),
  note: vine.string().trim().maxLength(1000).optional(),
})
