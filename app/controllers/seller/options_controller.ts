import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import Product from '#models/catalog/product'
import SellerCatalogueService from '#services/seller/catalogue_service'
import { optionsUpdateValidator } from '#validators/seller/options'

@inject()
export default class OptionsController {
  constructor(private catalogue: SellerCatalogueService) {}

  async update({ params, request, response, session, bouncer }: HttpContext) {
    const product = await Product.findOrFail(params.productId)
    await bouncer.with('SellerProductPolicy').authorize('update', product)
    await this.catalogue.saveOptions(product, await request.validateUsing(optionsUpdateValidator))
    session.flash('success', 'Product options updated')
    return response.redirect().toRoute('seller.variants.index', { productId: product.id })
  }
}
