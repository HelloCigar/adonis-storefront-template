import vine from '@vinejs/vine'

export const updateAssistantProposalValidator = vine.create({
  decision: vine.enum(['add', 'dismiss'] as const),
})
