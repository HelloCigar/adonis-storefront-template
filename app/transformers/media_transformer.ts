import { BaseTransformer } from '@adonisjs/core/transformers'
import type { AttachmentLinkModel } from '@jrmc/adonis-attachment/lucid'

export default class MediaTransformer extends BaseTransformer<AttachmentLinkModel> {
  toObject() {
    const attachment = this.resource.attachment
    const url =
      attachment.url ??
      `/attachments/${encodeURIComponent(attachment.id)}/${encodeURIComponent(attachment.name)}`
    const altText = attachment.originalName
    const width = attachment.metadata?.dimension?.width
    const height = attachment.metadata?.dimension?.height
    const isImage = attachment.mimeType.startsWith('image/')
    const isVideo = attachment.mimeType.startsWith('video/')
    const image = isImage
      ? {
          id: attachment.id,
          url,
          altText,
          width,
          height,
        }
      : null

    return {
      id: this.resource.id,
      attachmentId: this.resource.attachmentId,
      position: this.resource.position,
      url,
      name: attachment.name,
      originalName: attachment.originalName,
      alt: altText,
      altText,
      mimeType: attachment.mimeType,
      size: attachment.size,
      width,
      height,
      blurhash: attachment.blurhash,
      metadata: attachment.metadata,
      isImage,
      isVideo,
      __typename: isImage
        ? ('MediaImage' as const)
        : isVideo
          ? ('Video' as const)
          : ('File' as const),
      image,
      previewImage: image,
      sources: isVideo ? [{ url, mimeType: attachment.mimeType }] : [],
    }
  }
}
