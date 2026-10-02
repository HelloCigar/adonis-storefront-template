import type Product from '#models/catalog/product'
import { attachmentManager } from '@jrmc/adonis-attachment'
import type { Infer } from '@vinejs/vine/types'
import type { productImagesValidator } from '#validators/seller/images'
import { Exception } from '@adonisjs/core/exceptions'

export default class SellerMediaService {
  async store(product: Product, { images }: Infer<typeof productImagesValidator>) {
    product.media.addMany(await attachmentManager.createFromFiles(images))
    await product.save()
  }

  async destroy(product: Product, id: string) {
    const links = await product.media.all()
    if (!links.some((link) => link.id === id))
      throw new Exception('Image not found', { status: 404 })
    product.media.remove(id)
    await product.save()
  }
}
