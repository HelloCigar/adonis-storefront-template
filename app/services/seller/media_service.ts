import Product from '#models/catalog/product'
import { attachmentManager } from '@jrmc/adonis-attachment'
import { AttachmentLinkModel } from '@jrmc/adonis-attachment/lucid'
import type { Infer } from '@vinejs/vine/types'
import type { productImagesValidator } from '#validators/seller/images'
import { Exception } from '@adonisjs/core/exceptions'

export default class SellerMediaService {
  async store(product: Product, { images }: Infer<typeof productImagesValidator>) {
    product.media.addMany(await attachmentManager.createFromFiles(images))
    await product.save()
  }

  /** Each product's first image, the storefront cover, loaded in one query for a list. */
  async covers(products: Product[]) {
    const covers = new Map<string, AttachmentLinkModel>()
    if (!products.length) return covers
    const links = await AttachmentLinkModel.query()
      .where('attachable_type', Product.table)
      .where('field', 'media')
      .whereIn(
        'attachable_id',
        products.map((product) => product.id)
      )
      .preload('attachment')
      .orderBy('position', 'asc')
      .orderBy('id', 'asc')
    for (const link of links) {
      const productId = link.attachableId
      if (!covers.has(productId) && link.attachment.mimeType.startsWith('image/'))
        covers.set(productId, link)
    }
    return covers
  }

  async destroy(product: Product, id: string) {
    const links = await product.media.all()
    if (!links.some((link) => link.id === id))
      throw new Exception('Image not found', { status: 404 })
    product.media.remove(id)
    await product.save()
  }
}
