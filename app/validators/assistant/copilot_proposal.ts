import vine from '@vinejs/vine'

export const updateCopilotProposalValidator = vine.create({
  decision: vine.enum(['apply', 'dismiss'] as const),
})
