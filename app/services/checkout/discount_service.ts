import { DateTime } from 'luxon'
import DiscountCode from '#models/checkout/discount_code'
import DiscountRedemption from '#models/checkout/discount_redemption'
import type Order from '#models/checkout/order'
import CheckoutException from '#exceptions/checkout_exception'
import { affectedRows } from '#models/shared/affected_rows'
import { sqlDateTime } from '#models/shared/sql_datetime'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export interface AppliedDiscount {
  code: string
  kind: DiscountCode['kind']
  amountMinor: number
}

export type DiscountEvaluation = { discount: AppliedDiscount } | { error: string }

const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })

/**
 * Discount codes reduce the merchandise subtotal only; shipping is never discounted. Amounts
 * are exact centavos: percentages round half up once on the subtotal, and the result is spread
 * across lines by largest remainder so line discounts always sum to the order discount.
 */
export default class DiscountService {
  async find(code: string, trx?: TransactionClientContract) {
    return DiscountCode.query({ client: trx })
      .withScopes((scopes) => scopes.byCode(code))
      .first()
  }

  /** Whether the code applies to this subtotal now, and for how much. */
  evaluate(
    code: DiscountCode | null,
    subtotalMinor: number,
    at = DateTime.utc()
  ): DiscountEvaluation {
    if (!code || !code.active) return { error: 'This code isn’t valid.' }
    if (code.startsAt && code.startsAt > at) return { error: 'This code isn’t active yet.' }
    if (code.endsAt && code.endsAt <= at) return { error: 'This code has expired.' }
    if (code.usageLimit !== null && code.timesUsed >= code.usageLimit)
      return { error: 'This code has reached its usage limit.' }
    if (subtotalMinor < code.minimumSubtotalMinor)
      return {
        error: `Spend at least ${money.format(code.minimumSubtotalMinor / 100)} to use this code.`,
      }
    const amountMinor = this.amountFor(code, subtotalMinor)
    if (amountMinor < 1) return { error: 'This code doesn’t apply to your cart.' }
    return { discount: { code: code.code, kind: code.kind, amountMinor } }
  }

  amountFor(code: Pick<DiscountCode, 'kind' | 'percentOff' | 'amountOffMinor'>, subtotal: number) {
    if (code.kind === 'fixed') return Math.min(code.amountOffMinor ?? 0, subtotal)
    const percent = BigInt(code.percentOff ?? 0)
    return Number((BigInt(subtotal) * percent + 50n) / 100n)
  }

  /** Splits a discount across line totals in proportion, by largest remainder. */
  allocate(amountMinor: number, lineTotals: number[]) {
    const subtotal = lineTotals.reduce((sum, total) => sum + BigInt(total), 0n)
    if (amountMinor === 0 || subtotal === 0n) return lineTotals.map(() => 0)
    const amount = BigInt(amountMinor)
    const shares = lineTotals.map((total, index) => {
      const exact = amount * BigInt(total)
      return { index, value: exact / subtotal, remainder: exact % subtotal }
    })
    let left = amount - shares.reduce((sum, share) => sum + share.value, 0n)
    const byRemainder = [...shares].sort((a, b) =>
      a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1
    )
    for (const share of byRemainder) {
      if (left === 0n) break
      share.value++
      left--
    }
    return shares.map((share) => Number(share.value))
  }

  /**
   * Counts one use of the quoted code for a new order. The conditional update rechecks the
   * code's state, so concurrent checkouts cannot exceed its usage limit.
   */
  async redeem(
    trx: TransactionClientContract,
    order: Order,
    discount: AppliedDiscount,
    email: string
  ) {
    const now = sqlDateTime()
    const changed = await DiscountCode.query({ client: trx })
      .where('code', discount.code)
      .where('active', true)
      .where((query) => query.whereNull('starts_at').orWhere('starts_at', '<=', now))
      .where((query) => query.whereNull('ends_at').orWhere('ends_at', '>', now))
      .where((query) => query.whereNull('usage_limit').orWhereRaw('times_used < usage_limit'))
      .increment('timesUsed', 1)
    if (affectedRows(changed) !== 1)
      throw new CheckoutException(
        'This discount code is no longer available. Review the updated quote.',
        'E_DISCOUNT_UNAVAILABLE'
      )
    const code = await DiscountCode.findByOrFail('code', discount.code, { client: trx })
    const customerKey = code.oncePerCustomer ? email.trim().toLowerCase() : null
    if (customerKey) {
      const used = await code
        .related('redemptions')
        .query()
        .where('customer_key', customerKey)
        .first()
      if (used) this.alreadyUsed()
    }
    try {
      await code.related('redemptions').create({
        orderId: order.id,
        customerKey,
        amountMinor: discount.amountMinor,
        releasedAt: null,
      })
    } catch (error) {
      if ((error as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') this.alreadyUsed()
      throw error
    }
  }

  /** Returns an order's use of its code once, when the order closes unpaid or is cancelled. */
  async release(trx: TransactionClientContract, orderId: string) {
    const redemption = await DiscountRedemption.query({ client: trx })
      .where('order_id', orderId)
      .whereNull('released_at')
      .first()
    if (!redemption) return
    const claimed = await DiscountRedemption.query({ client: trx })
      .where('id', redemption.id)
      .whereNull('released_at')
      .update({ releasedAt: sqlDateTime(), customerKey: null })
    if (affectedRows(claimed) !== 1) return
    await DiscountCode.query({ client: trx })
      .where('id', redemption.discountCodeId)
      .where('times_used', '>', 0)
      .decrement('timesUsed', 1)
  }

  private alreadyUsed(): never {
    throw new CheckoutException(
      'This discount code was already used with this email address.',
      'E_DISCOUNT_USED'
    )
  }
}
