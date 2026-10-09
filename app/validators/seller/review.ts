import vine from '@vinejs/vine'

export const reviewModerationValidator = vine.create({
  status: vine.enum(['approved', 'hidden']),
})

export const reviewIndexQueryValidator = vine.create({
  status: vine.enum(['pending', 'approved', 'hidden', 'all']).optional(),
  page: vine.number().withoutDecimals().min(1).optional(),
})
