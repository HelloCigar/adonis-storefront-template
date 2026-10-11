import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import Product from '#models/catalog/product'
import ProductVariant from '#models/catalog/product_variant'
import SellerVariantService from '#services/seller/variant_service'
import { variantCreateValidator, variantUpdateValidator } from '#validators/seller/variant'

@inject()
export default class VariantsController {
  constructor(private variants: SellerVariantService) {}

  /** Variants live on the product page now; keep old links and bookmarks working. */
  async index({ params, response }: HttpContext) {
    return response.redirect().toRoute('seller.products.show', { id: params.productId })
  }
  async store({ params, request, response, session, bouncer, auth }: HttpContext) {
    const product = await Product.findOrFail(params.productId)
    await bouncer.with('SellerVariantPolicy').authorize('create', product)
    await this.variants.saveVariant(
      product,
      new ProductVariant(),
      await request.validateUsing(variantCreateValidator),
      auth.user!.id
    )
    session.flash('success', 'Variant created')
    return response.redirect().toRoute('seller.products.show', { id: product.id })
  }
  async update({ params, request, response, session, bouncer, auth }: HttpContext) {
    const product = await Product.findOrFail(params.productId)
    const variant = await product.related('variants').query().where('id', params.id).firstOrFail()
    await bouncer.with('SellerVariantPolicy').authorize('update', variant, product)
    await this.variants.saveVariant(
      product,
      variant,
      await request.validateUsing(variantUpdateValidator, { meta: { id: variant.id } }),
      auth.user!.id
    )
    session.flash('success', 'Variant updated')
    return response.redirect().toRoute('seller.products.show', { id: product.id })
  }
  async destroy({ params, response, session, bouncer }: HttpContext) {
    const product = await Product.findOrFail(params.productId)
    const variant = await product.related('variants').query().where('id', params.id).firstOrFail()
    await bouncer.with('SellerVariantPolicy').authorize('delete', variant, product)
    await this.variants.deleteVariant(product, variant)
    session.flash('success', 'Variant deleted')
    return response.redirect().toRoute('seller.products.show', { id: product.id })
  }
}
