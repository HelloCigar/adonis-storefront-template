import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { sqlDateTime } from '#models/shared/sql_datetime'
import Order from '#models/checkout/order'
import Cart from '#models/checkout/cart'
import Attempt from '#models/payments/attempt'
import Payment from '#models/payments/payment'
import Shipment from '#models/checkout/shipment'
import InventoryService from '#services/catalog/inventory_service'
import MoneyService from '#services/checkout/money_service'
import StateService from '#services/checkout/state_service'
import ActivityService from '#services/checkout/activity_service'
import NotificationIntentService from '#services/checkout/notification_intent_service'
import BalanceService from '#services/payments/balance_service'
import type { CheckoutSession } from '#services/payments/payment_service'
import CheckoutException from '#exceptions/checkout_exception'
import { affectedRows } from '#models/shared/affected_rows'
import { leaseReleased } from '#models/shared/lease'

@inject()
export default class SettlementService {
  constructor(
    private inventory: InventoryService,
    private money: MoneyService,
    private states: StateService,
    private activities: ActivityService,
    private notifications: NotificationIntentService,
    private balances: BalanceService
  ) {}

  async apply(checkout: CheckoutSession, expectedAttemptId?: number) {
    const query = Attempt.query()
      .where('provider', checkout.provider)
      .where('live_mode', checkout.liveMode)
    if (expectedAttemptId) query.where('id', expectedAttemptId)
    else
      query.where((q) => {
        q.where('external_id', checkout.id)
        if (checkout.metadata.attemptId) q.orWhere('public_id', checkout.metadata.attemptId)
      })
    const candidate = await query.first()
    return db.transaction(async (trx) => {
      let attempt: Attempt | null = null
      let order: Order | null = null
      if (candidate) {
        const updated = await Order.query({ client: trx })
          .where('id', candidate.orderId)
          .increment('version', 1)
        if (affectedRows(updated) !== 1)
          throw new CheckoutException('Order not found', 'E_ORDER_NOT_FOUND', 404)
        order = await Order.findOrFail(candidate.orderId, { client: trx })
        attempt = await Attempt.findOrFail(candidate.id, { client: trx })
      }
      const associated = !!(
        order &&
        attempt &&
        order.source === 'online' &&
        checkout.reference === order.publicId &&
        (!attempt.externalId || attempt.externalId === checkout.id) &&
        (!checkout.metadata.attemptId || checkout.metadata.attemptId === attempt.publicId)
      )
      const captured = checkout.payments.filter((payment) => payment.status === 'paid')
      let accepted = order
        ? await order.related('payments').query().where('disposition', 'accepted').first()
        : null
      let review = false
      let refundCurrencyReview = false
      for (const observation of captured) {
        this.money.assertMinor(observation.amount)
        if (!observation.amount || !observation.id)
          throw new CheckoutException('Invalid payment observation', 'E_PAYMENT_OBSERVATION', 422)
        const { currencyMismatch, refundedMinor: refunded } = await this.balances.forPayment(trx, {
          provider: checkout.provider,
          liveMode: checkout.liveMode,
          externalId: observation.id,
          amountMinor: observation.amount,
          currency: observation.currency,
        })
        if (currencyMismatch) {
          review = true
          refundCurrencyReview = true
        }
        const existing = await Payment.query({ client: trx })
          .where({
            provider: checkout.provider,
            liveMode: checkout.liveMode,
            externalId: observation.id,
          })
          .first()
        if (existing) {
          if (
            existing.amountMinor !== observation.amount ||
            existing.currency !== observation.currency
          )
            throw new CheckoutException(
              'Payment resource facts changed',
              'E_PAYMENT_OBSERVATION_CONFLICT',
              422
            )
          // An earlier webhook may have arrived before its local checkout reference was saved.
          // Bind that captured fact only after lookup verifies the original checkout association.
          if (existing.orderId !== null || !associated) {
            if (order && (existing.orderId !== order.id || existing.disposition !== 'accepted'))
              review = true
            continue
          }
        }
        const matches =
          associated &&
          observation.currency === attempt!.currency &&
          observation.amount === attempt!.amountMinor &&
          order!.totalMinor === attempt!.amountMinor
        const canAccept =
          !currencyMismatch &&
          refunded <= observation.amount &&
          matches &&
          !accepted &&
          order!.lifecycleState === 'pending_payment' &&
          !attempt!.needsReview &&
          !attempt!.closeReason &&
          attempt!.state !== 'expired'
        const facts = {
          provider: checkout.provider,
          liveMode: checkout.liveMode,
          externalId: observation.id,
          orderId: order?.id ?? null,
          attemptId: attempt?.id ?? null,
          amountMinor: observation.amount,
          currency: observation.currency,
          disposition: canAccept
            ? 'accepted'
            : accepted && matches
              ? 'overpayment'
              : 'review_required',
        } as const
        let payment: Payment
        if (existing) {
          existing.merge(facts)
          await existing.save()
          payment = existing
        } else
          payment = await Payment.create({ ...facts, capturedAt: DateTime.utc() }, { client: trx })
        if (!canAccept) {
          review = true
          if (order)
            await this.activities.record(trx, order.id, 'payment.review_required', {
              paymentId: payment.id,
            })
          continue
        }
        await this.inventory.consume(trx, order!.id)
        accepted = payment
        order!.lifecycleState = this.states.transition('order', order!.lifecycleState, 'confirmed')
        order!.financialStatus = this.states.financial(payment.amountMinor, refunded)
        order!.paidAt = DateTime.utc()
        attempt!.state = this.states.transition('attempt', attempt!.state, 'paid')
        attempt!.externalId = checkout.id
        attempt!.merge(leaseReleased())
        attempt!.lastError = null
        attempt!.version++
        await attempt!.save()
        if (order!.cartId)
          await Cart.query({ client: trx })
            .where('id', order!.cartId)
            .where('status', 'submitted')
            .update({
              status: 'completed',
              completedAt: sqlDateTime(),
            })
        await Shipment.firstOrCreate({ orderId: order!.id }, { state: 'pending' }, { client: trx })
        await this.activities.record(trx, order!.id, 'payment.accepted', {
          paymentId: payment.id,
          amountMinor: payment.amountMinor,
        })
        await this.notifications.record(trx, order!.id, 'receipt')
      }
      if (order && review) {
        order.lifecycleState = this.states.transition(
          'order',
          order.lifecycleState,
          'review_required'
        )
        order.reviewReason = refundCurrencyReview
          ? 'A provider refund currency does not match its captured payment.'
          : 'Payment requires reconciliation; fulfillment is blocked.'
        if (attempt) {
          attempt.needsReview = true
          attempt.lastError = 'E_PAYMENT_REVIEW'
          if (associated && checkout.status === 'paid' && captured.length) {
            attempt.state = 'paid'
            attempt.externalId = checkout.id
            attempt.merge(leaseReleased())
          }
          await attempt.save()
        }
      }
      if (order) await order.save()
      return order
    })
  }
}
