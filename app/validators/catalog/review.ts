import vine from '@vinejs/vine'

export const reviewValidator = vine.create({
  rating: vine.number().withoutDecimals().range([1, 5]),
  title: vine.string().trim().maxLength(120).nullable().optional(),
  body: vine.string().trim().maxLength(2000).nullable().optional(),
})
