import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import Product from '#models/catalog/product'
import SellerVariantService from '#services/seller/variant_service'
import { optionsUpdateValidator } from '#validators/seller/options'

@inject()
export default class OptionsController {
  constructor(private variants: SellerVariantService) {}

  async update({ params, request, response, session, bouncer }: HttpContext) {
    const product = await Product.findOrFail(params.productId)
    await bouncer.with('SellerProductPolicy').authorize('update', product)
    await this.variants.saveOptions(product, await request.validateUsing(optionsUpdateValidator))
    session.flash('success', 'Product options updated')
    return response.redirect().toRoute('seller.products.show', { id: product.id })
  }
}
