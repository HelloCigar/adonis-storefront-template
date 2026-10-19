import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import Product from '#models/catalog/product'
import { manualStockReasons } from '#models/catalog/stock_adjustment'
import SellerProductTransformer from '#transformers/seller/product_transformer'
import SellerVariantTransformer from '#transformers/seller/variant_transformer'
import SellerStockAdjustmentTransformer from '#transformers/seller/stock_adjustment_transformer'
import SellerVariantService from '#services/seller/variant_service'
import { stockAdjustmentValidator } from '#validators/seller/stock_adjustment'

@inject()
export default class StockAdjustmentsController {
  constructor(private variants: SellerVariantService) {}

  async index({ params, request, inertia, bouncer }: HttpContext) {
    const product = await Product.findOrFail(params.productId)
    const variant = await product
      .related('variants')
      .query()
      .where('id', params.variantId)
      .firstOrFail()
    await bouncer.with('SellerVariantPolicy').authorize('adjustStock', variant, product)
    const page = Math.max(1, Number.parseInt(request.input('page', '1'), 10) || 1)
    const adjustments = await variant
      .related('stockAdjustments')
      .query()
      .preload('actor')
      .preload('copilotProposal')
      .orderBy('id', 'desc')
      .paginate(page, 25)
    return inertia.render('seller/stock', {
      product: SellerProductTransformer.transform(product),
      variant: SellerVariantTransformer.transform(variant),
      reasons: [...manualStockReasons],
      adjustments: SellerStockAdjustmentTransformer.paginate(
        adjustments.all(),
        adjustments.getMeta()
      ),
    })
  }

  async store({ params, request, response, session, bouncer, auth }: HttpContext) {
    const product = await Product.findOrFail(params.productId)
    const variant = await product
      .related('variants')
      .query()
      .where('id', params.variantId)
      .firstOrFail()
    await bouncer.with('SellerVariantPolicy').authorize('adjustStock', variant, product)
    const adjustment = await this.variants.adjustStock(
      product,
      variant,
      await request.validateUsing(stockAdjustmentValidator),
      auth.user!.id
    )
    session.flash('success', `Stock updated to ${adjustment.quantityAfter}`)
    return response.redirect().toRoute('seller.stock_adjustments.index', {
      productId: product.id,
      variantId: variant.id,
    })
  }
}
