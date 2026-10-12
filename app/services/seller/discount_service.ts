import { inject } from '@adonisjs/core'
import { errors } from '@vinejs/vine'
import type { Infer } from '@vinejs/vine/types'
import DiscountCode from '#models/checkout/discount_code'
import MoneyService from '#services/checkout/money_service'
import type { discountValidator } from '#validators/seller/discount'

export type DiscountPayload = Infer<typeof discountValidator>

/**
 * Staff edits never change orders that already used a code: each order keeps its own
 * discount amount and code snapshot.
 */
@inject()
export default class SellerDiscountService {
  constructor(private money: MoneyService) {}

  async save(discount: DiscountCode, payload: DiscountPayload, actorId: string) {
    const startsAt = payload.startsAt?.toUTC() ?? null
    const endsAt = payload.endsAt?.toUTC() ?? null
    if (startsAt && endsAt && endsAt <= startsAt)
      throw new errors.E_VALIDATION_ERROR([
        { field: 'endsAt', rule: 'after', message: 'The end must be after the start' },
      ])
    const percentage = payload.kind === 'percentage'
    discount.merge({
      code: payload.code,
      description: payload.description || null,
      kind: payload.kind,
      percentOff: percentage ? payload.percentOff! : null,
      amountOffMinor: percentage ? null : this.money.toMinor(payload.amountOff!),
      minimumSubtotalMinor: this.money.toMinor(payload.minimumSubtotal),
      usageLimit: payload.usageLimit,
      oncePerCustomer: payload.oncePerCustomer,
      active: payload.active,
      startsAt,
      endsAt,
    })
    if (!discount.$isPersisted) discount.createdById = actorId
    await discount.save()
    return discount
  }
}
