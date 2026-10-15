import vine from '@vinejs/vine'
import { assistantLimits } from '#values/assistant'

export const storeAssistantMessageValidator = vine.create(
  vine
    .object({
      kind: vine.enum(['message', 'follow_up'] as const),
      page: vine
        .object({
          type: vine.enum(['product', 'collection'] as const),
          handle: vine.string().trim().maxLength(255),
        })
        .nullable(),
    })
    .merge(
      vine.group([
        vine.group.if((data) => data.kind === 'message', {
          text: vine.string().trim().minLength(1).maxLength(assistantLimits.messageChars),
        }),
        vine.group.else({
          proposalId: vine.string().ulid(),
        }),
      ])
    )
)
