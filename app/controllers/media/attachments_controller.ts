import app from '@adonisjs/core/services/app'
import type { HttpContext } from '@adonisjs/core/http'
import { AttachmentLinkModel, AttachmentModel } from '@jrmc/adonis-attachment/lucid'
import OrderMessage from '#models/chat/order_message'

/**
 * Public files such as product media and avatars. This replaces the attachment package's
 * own route, which serves any stored file by id, so chat photos stay behind
 * `chat.images.show`.
 */
export default class AttachmentsController {
  async show({ params, response }: HttpContext) {
    const file = await AttachmentModel.find(params.id)
    if (!file) return response.notFound()
    const chatImage = await AttachmentLinkModel.query()
      .where('attachment_id', file.parentId ?? file.id)
      .where('attachable_type', OrderMessage.table)
      .first()
    if (chatImage) return response.notFound()

    const attachments = await app.container.make('jrmc.attachment')
    response.header('content-type', file.mimeType)
    return response.send(await attachments.read(file.toAttachment()))
  }
}
