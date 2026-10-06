import vine from '@vinejs/vine'
import type { Infer } from '@vinejs/vine/types'
import { inboxFilters } from '#services/chat/order_chat_service'

export const inboxQueryValidator = vine.create({
  filter: vine.enum(inboxFilters).optional(),
  order: vine.number().withoutDecimals().positive().optional(),
})

export type InboxQuery = Infer<typeof inboxQueryValidator>
