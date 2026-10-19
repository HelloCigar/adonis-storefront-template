import vine from '@vinejs/vine'

export const conversationIndexQueryValidator = vine.create({
  assistant: vine.enum(['shopping', 'copilot'] as const).optional(),
  userId: vine.string().ulid().optional(),
  from: vine.date().optional(),
  to: vine.date().afterOrSameAs('from').optional(),
  changesApplied: vine.boolean().optional(),
  unanswered: vine.boolean().optional(),
  page: vine.number().withoutDecimals().min(1).optional(),
})
