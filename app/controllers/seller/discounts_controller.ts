import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import DiscountCode from '#models/checkout/discount_code'
import SellerDiscountTransformer from '#transformers/seller/discount_transformer'
import SellerDiscountService from '#services/seller/discount_service'
import { discountValidator } from '#validators/seller/discount'

@inject()
export default class DiscountsController {
  constructor(private discounts: SellerDiscountService) {}

  async index({ inertia, bouncer }: HttpContext) {
    await bouncer.with('SellerDiscountPolicy').authorize('viewAny')
    return inertia.render('seller/discounts', {
      discounts: SellerDiscountTransformer.transform(
        await DiscountCode.query().orderBy('id', 'desc')
      ),
    })
  }

  async store({ request, response, session, bouncer, auth }: HttpContext) {
    await bouncer.with('SellerDiscountPolicy').authorize('create')
    const payload = await request.validateUsing(discountValidator)
    await this.discounts.save(new DiscountCode(), payload, auth.getUserOrFail().id)
    session.flash('success', 'Discount code created')
    return response.redirect().toRoute('seller.discounts.index')
  }

  async update({ params, request, response, session, bouncer, auth }: HttpContext) {
    const discount = await DiscountCode.findOrFail(params.id)
    await bouncer.with('SellerDiscountPolicy').authorize('update', discount)
    const payload = await request.validateUsing(discountValidator, { meta: { id: discount.id } })
    await this.discounts.save(discount, payload, auth.getUserOrFail().id)
    session.flash('success', 'Discount code updated')
    return response.redirect().toRoute('seller.discounts.index')
  }

  async destroy({ params, response, session, bouncer }: HttpContext) {
    const discount = await DiscountCode.findOrFail(params.id)
    await bouncer.with('SellerDiscountPolicy').authorize('delete', discount)
    await discount.delete()
    session.flash('success', 'Discount code deleted')
    return response.redirect().toRoute('seller.discounts.index')
  }
}
