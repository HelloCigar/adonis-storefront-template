import vine from '@vinejs/vine'
import { copilotLimits } from '#values/assistant'

export const storeCopilotMessageValidator = vine.create({
  text: vine.string().trim().minLength(1).maxLength(copilotLimits.messageChars),
  page: vine
    .object({
      type: vine.enum([
        'order',
        'product',
        'customer',
        'discount',
        'collection',
        'review',
        'post',
      ] as const),
      id: vine.string().ulid(),
    })
    .nullable(),
})
