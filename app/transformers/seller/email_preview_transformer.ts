import { BaseTransformer } from '@adonisjs/core/transformers'
import type { EmailPreview } from '#services/checkout/email_preview_service'

export default class SellerEmailPreviewTransformer extends BaseTransformer<EmailPreview> {
  toObject() {
    return this.pick(this.resource, ['key', 'name', 'description', 'subject', 'from', 'to'])
  }

  forPreview() {
    return {
      ...this.toObject(),
      html: this.resource.html ?? '',
      text: this.resource.text ?? '',
    }
  }
}
