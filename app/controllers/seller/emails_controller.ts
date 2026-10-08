import { inject } from '@adonisjs/core'
import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'
import checkout from '#config/checkout'
import EmailPreviewService from '#services/checkout/email_preview_service'
import SellerEmailPreviewTransformer from '#transformers/seller/email_preview_transformer'

/** Staff-only previews of transactional emails rendered with sample data. Nothing is sent. */
@inject()
export default class EmailsController {
  constructor(private previews: EmailPreviewService) {}

  index(ctx: HttpContext) {
    return this.render(ctx, 'receipt')
  }

  show(ctx: HttpContext) {
    return this.render(ctx, ctx.params.email)
  }

  private async render({ request, inertia, bouncer }: HttpContext, key: string) {
    await bouncer.with('SellerOrderPolicy').authorize('viewAny')
    if (!this.previews.isKey(key)) {
      throw new Exception('Email preview not found', { status: 404, code: 'E_NOT_FOUND' })
    }
    // Links in the preview point at the same origin real emails use.
    const origin = new URL(checkout.publicUrl ?? request.completeUrl()).origin
    return inertia.render('seller/emails', {
      emails: SellerEmailPreviewTransformer.transform(await this.previews.list(origin)),
      preview: SellerEmailPreviewTransformer.transform(
        await this.previews.render(key, origin)
      ).useVariant('forPreview'),
    })
  }
}
