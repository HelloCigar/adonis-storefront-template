import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import Product from '#models/catalog/product'
import SellerMediaService from '#services/seller/media_service'
import { productImagesValidator } from '#validators/seller/images'

@inject()
export default class ImagesController {
  constructor(private media: SellerMediaService) {}

  async store({ params, request, response, session }: HttpContext) {
    const product = await Product.findOrFail(params.productId)
    await this.media.store(product, await request.validateUsing(productImagesValidator))
    session.flash('success', 'Product images added')
    return response.redirect().toRoute('seller.variants.index', { productId: product.id })
  }
  async destroy({ params, response, session }: HttpContext) {
    const product = await Product.findOrFail(params.productId)
    await this.media.destroy(product, params.id)
    session.flash('success', 'Product image removed')
    return response.redirect().toRoute('seller.variants.index', { productId: product.id })
  }
}
