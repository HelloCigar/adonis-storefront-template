import vine from '@vinejs/vine'

export const storefrontProfileValidator = vine.create({
  firstName: vine.string().trim().maxLength(100).optional(),
  lastName: vine.string().trim().maxLength(100).optional(),
})
