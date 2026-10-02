import vine from '@vinejs/vine'

export const searchValidator = vine.create({
  search: vine.string().trim().maxLength(100).optional(),
})
