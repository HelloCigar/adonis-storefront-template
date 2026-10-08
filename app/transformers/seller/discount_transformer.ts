import { BaseTransformer } from '@adonisjs/core/transformers'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import type DiscountCode from '#models/checkout/discount_code'

export default class SellerDiscountTransformer extends BaseTransformer<DiscountCode> {
  @inject()
  async toObject({ bouncer }: HttpContext) {
    return {
      ...this.pick(this.resource, [
        'id',
        'code',
        'description',
        'kind',
        'percentOff',
        'amountOffMinor',
        'minimumSubtotalMinor',
        'usageLimit',
        'timesUsed',
        'oncePerCustomer',
        'active',
        'startsAt',
        'endsAt',
        'createdAt',
      ]),
      can: {
        delete: await bouncer.with('SellerDiscountPolicy').allows('delete', this.resource),
      },
    }
  }
}
