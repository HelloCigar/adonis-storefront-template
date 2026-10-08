import { OrderMessageSchema } from '#database/schema'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { attachments, type AttachmentCollectionRelation } from '@jrmc/adonis-attachment/lucid'
import User from '#models/account/user'
import Order from '#models/checkout/order'

export const chatSides = ['customer', 'staff'] as const
export type ChatSide = (typeof chatSides)[number]

export default class OrderMessage extends OrderMessageSchema {
  @column() declare senderRole: ChatSide

  @belongsTo(() => Order, { foreignKey: 'orderId' }) declare order: BelongsTo<typeof Order>
  @belongsTo(() => User, { foreignKey: 'senderId' }) declare sender: BelongsTo<typeof User>

  /** Private to the order's chat; served only through `chat.images.show`. */
  @attachments<OrderMessage>({ folder: ({ model }) => `chat/orders/${model?.orderId}` })
  declare images: AttachmentCollectionRelation
}
