import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import Product from '#models/catalog/product'
import SellerVariantService from '#services/seller/variant_service'
import { variantGenerationValidator } from '#validators/seller/variant_generation'

@inject()
export default class VariantGenerationController {
  constructor(private variants: SellerVariantService) {}

  async store({ params, request, response, session, bouncer, auth }: HttpContext) {
    const product = await Product.findOrFail(params.productId)
    await bouncer.with('SellerVariantPolicy').authorize('create', product)
    const count = await this.variants.generateVariants(
      product,
      await request.validateUsing(variantGenerationValidator),
      auth.user!.id
    )
    session.flash(
      'success',
      count ? `${count} variants created` : 'All option combinations already exist'
    )
    return response.redirect().toRoute('seller.variants.index', { productId: product.id })
  }
}
