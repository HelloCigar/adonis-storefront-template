import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import Product from '#models/catalog/product'
import ProductVariant from '#models/catalog/product_variant'
import SellerProductTransformer from '#transformers/seller/product_transformer'
import MediaTransformer from '#transformers/shared/media_transformer'
import SellerCatalogueService from '#services/seller/catalogue_service'
import { variantCreateValidator, variantUpdateValidator } from '#validators/seller/variant'

@inject()
export default class VariantsController {
  constructor(private catalogue: SellerCatalogueService) {}

  async index({ params, inertia }: HttpContext) {
    const product = await Product.query()
      .where('id', params.productId)
      .preload('variants', (query) => query.orderBy('position'))
      .firstOrFail()
    return inertia.render('seller/variants', {
      product: SellerProductTransformer.transform(product),
      images: MediaTransformer.transform(await product.media.all()),
    })
  }
  async store({ params, request, response, session }: HttpContext) {
    const product = await Product.findOrFail(params.productId)
    await this.catalogue.saveVariant(
      product,
      new ProductVariant(),
      await request.validateUsing(variantCreateValidator)
    )
    session.flash('success', 'Variant created')
    return response.redirect().toRoute('seller.variants.index', { productId: product.id })
  }
  async update({ params, request, response, session }: HttpContext) {
    const product = await Product.findOrFail(params.productId)
    const variant = await product.related('variants').query().where('id', params.id).firstOrFail()
    await this.catalogue.saveVariant(
      product,
      variant,
      await request.validateUsing(variantUpdateValidator, { meta: { id: variant.id } })
    )
    session.flash('success', 'Variant updated')
    return response.redirect().toRoute('seller.variants.index', { productId: product.id })
  }
  async destroy({ params, response, session }: HttpContext) {
    const product = await Product.findOrFail(params.productId)
    const variant = await product.related('variants').query().where('id', params.id).firstOrFail()
    await this.catalogue.deleteVariant(product, variant)
    session.flash('success', 'Variant deleted')
    return response.redirect().toRoute('seller.variants.index', { productId: product.id })
  }
}
