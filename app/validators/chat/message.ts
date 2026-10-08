import vine from '@vinejs/vine'
import { maxImagesPerMessage, maxMessageLength } from '#services/chat/order_chat_service'

/** Photos sent over HTTP, with an optional caption. Text-only messages use the socket. */
export const imageMessageValidator = vine.create({
  body: vine.string().trim().maxLength(maxMessageLength).optional(),
  images: vine
    .array(vine.file({ size: '5mb', extnames: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }))
    .minLength(1)
    .maxLength(maxImagesPerMessage),
})
