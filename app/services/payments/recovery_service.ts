import { randomUUID } from 'node:crypto'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import Attempt from '#models/payments/attempt'
import Order from '#models/checkout/order'
import Cart from '#models/checkout/cart'
import User from '#models/account/user'
import { affectedRows } from '#models/shared/affected_rows'
import PaymentException from '#exceptions/payment_exception'
import CheckoutException from '#exceptions/checkout_exception'
import PaymentService, { type CheckoutSession } from '#services/payments/payment_service'
import SettlementService from '#services/payments/settlement_service'
import InventoryService from '#services/catalog/inventory_service'
import StateService from '#services/checkout/state_service'
import OutboxService from '#services/checkout/outbox_service'
import ActivityService from '#services/checkout/activity_service'

@inject()
export default class RecoveryService {
  constructor(
    private payments: PaymentService,
    private settlement: SettlementService,
    private inventory: InventoryService,
    private states: StateService,
    private outbox: OutboxService,
    private activities: ActivityService
  ) {}

  async run(id: number, expire = false) {
    const claim = await this.claim(id, expire)
    if (!claim) return
    const { attempt, token, firstSubmission } = claim
    try {
      let checkout: CheckoutSession
      if (attempt.externalId) {
        checkout = await this.payments.getCheckout({
          provider: attempt.provider,
          id: attempt.externalId,
        })
      } else {
        const provider = this.payments.getProvider(attempt.provider)
        if (
          provider.liveMode !== attempt.liveMode ||
          provider.idempotencyScope !== attempt.replayScope ||
          (!firstSubmission &&
            (attempt.replayUntilMs === null || attempt.replayUntilMs <= Date.now()))
        ) {
          await this.review(id, 'E_PAYMENT_REPLAY_UNSAFE', token)
          return
        }
        checkout = await this.payments.createCheckout(attempt.requestSnapshot, attempt.provider)
      }
      await this.validate(attempt, checkout)
      await this.saveReference(attempt, checkout, token)
      if (checkout.payments.some((payment) => payment.status === 'paid')) {
        await this.settlement.apply(checkout, attempt.id)
        return
      }
      const close = expire || attempt.closeReason || attempt.expiresAtMs <= Date.now()
      if (close && checkout.status !== 'expired') {
        checkout = await this.payments.expireCheckout(
          { provider: attempt.provider, id: checkout.id },
          `${attempt.idempotencyKey}:close`
        )
        await this.validate(attempt, checkout)
        if (checkout.payments.some((payment) => payment.status === 'paid')) {
          await this.settlement.apply(checkout, attempt.id)
          return
        }
      }
      if (checkout.status === 'expired') await this.closed(attempt.id, token)
      else
        await Attempt.query()
          .where('id', id)
          .where('claim_token', token)
          .whereNot('state', 'paid')
          .update({ state: 'pending', claimToken: null, claimExpiresAtMs: null, lastError: null })
    } catch (error) {
      const code =
        error instanceof PaymentException || error instanceof CheckoutException
          ? error.code
          : 'E_PAYMENT_OPERATION'
      const knownRejection =
        error instanceof PaymentException && error.outcome !== 'unknown' && !attempt.externalId
      const changed = await Attempt.query()
        .where('id', id)
        .where('claim_token', token)
        .whereNot('state', 'paid')
        .update({
          state: knownRejection ? 'failed' : 'unknown',
          claimToken: null,
          claimExpiresAtMs: null,
          lastError: code,
        })
      if (affectedRows(changed) !== 1) return
      if (error instanceof PaymentException && !error.retryable) {
        if (knownRejection) await this.closeRejected(id)
        else await this.review(id, code)
        return
      }
      throw error
    }
  }

  async requestReconciliation(attempt: Attempt) {
    if (['paid', 'expired'].includes(attempt.state) || attempt.needsReview) return
    await db.transaction((trx) =>
      this.outbox.record(trx, {
        key: `reconcile:${attempt.id}:${Math.floor(Date.now() / 30_000)}`,
        kind: 'reconcile_checkout',
        entityId: attempt.id,
      })
    )
  }

  async retry(id: number, actor: User, externalId?: string) {
    if (!actor.isStoreStaff)
      throw new CheckoutException('Access denied', 'E_PAYMENT_RETRY_ACCESS', 403)
    const original = await Attempt.findOrFail(id)
    if (original.state === 'paid' || original.state === 'expired')
      throw new CheckoutException('Review captured funds using refunds', 'E_PAYMENT_RETRY_STATE')
    let observation: CheckoutSession | undefined
    if (externalId) {
      observation = await this.payments.getCheckout({ provider: original.provider, id: externalId })
      await this.validate(original, observation)
    }
    await db.transaction(async (trx) => {
      await Order.query({ client: trx }).where('id', original.orderId).increment('version', 1)
      const attempt = await Attempt.findOrFail(id, { client: trx })
      if ((attempt.claimExpiresAtMs ?? 0) > Date.now())
        throw new CheckoutException('This operation is still running', 'E_PAYMENT_BUSY')
      if (['paid', 'expired'].includes(attempt.state))
        throw new CheckoutException('Payment state changed', 'E_PAYMENT_RETRY_STATE')
      if (observation) {
        attempt.externalId = observation.id
        attempt.checkoutUrl = observation.url
      }
      attempt.needsReview = false
      attempt.lastError = null
      attempt.claimToken = null
      attempt.claimExpiresAtMs = null
      await attempt.save()
      await this.outbox.record(trx, {
        key: `staff-retry:${id}:${randomUUID()}`,
        kind: 'reconcile_checkout',
        entityId: id,
      })
      await this.activities.record(
        trx,
        attempt.orderId,
        'payment.retry_requested',
        { attemptId: id },
        actor.id
      )
    })
  }

  async requestCancel(orderId: number) {
    await db.transaction(async (trx) => {
      await Order.query({ client: trx }).where('id', orderId).increment('version', 1)
      const order = await Order.findOrFail(orderId, { client: trx })
      if (order.source !== 'online' || order.lifecycleState !== 'pending_payment') {
        throw new CheckoutException('Only unpaid orders can be cancelled here', 'E_ORDER_CANCEL')
      }
      const attempt = await Attempt.query({ client: trx })
        .where('order_id', orderId)
        .orderBy('id', 'desc')
        .firstOrFail()
      attempt.closeReason = 'cancelled'
      await attempt.save()
      await this.outbox.record(trx, {
        key: `cancel:${attempt.id}`,
        kind: 'expire_checkout',
        entityId: attempt.id,
      })
      await this.activities.record(trx, orderId, 'order.cancellation_requested')
    })
  }

  async sweep() {
    const stale = await Attempt.query()
      .whereIn('state', ['creating', 'pending', 'closing', 'unknown', 'failed'])
      .where('needs_review', false)
      .where((q) =>
        q.whereNull('claim_expires_at_ms').orWhere('claim_expires_at_ms', '<', Date.now())
      )
      .where(
        'updated_at',
        '<',
        DateTime.utc().minus({ minutes: 1 }).toSQL({ includeOffset: false })!
      )
      .orderBy('id')
      .limit(100)
    for (const attempt of stale)
      await db.transaction((trx) =>
        this.outbox.record(trx, {
          key: `sweep:${attempt.id}:${Math.floor(Date.now() / 60_000)}`,
          kind:
            attempt.expiresAtMs <= Date.now() || attempt.closeReason
              ? 'expire_checkout'
              : 'reconcile_checkout',
          entityId: attempt.id,
        })
      )
  }

  async review(id: number, code = 'E_PAYMENT_RETRIES_EXHAUSTED', token?: string) {
    await db.transaction(async (trx) => {
      const query = Attempt.query({ client: trx }).where('id', id).whereNot('state', 'paid')
      if (token) query.where('claim_token', token)
      const changed = await query.update({
        needsReview: true,
        lastError: code,
        claimToken: null,
        claimExpiresAtMs: null,
      })
      if (affectedRows(changed) !== 1) return
      const attempt = await Attempt.findOrFail(id, { client: trx })
      await this.activities.record(trx, attempt.orderId, 'payment.operation_requires_review', {
        attemptId: id,
        code,
      })
      logger.error({ attemptId: id, code }, 'Payment operation requires staff review')
    })
  }

  private async claim(id: number, expire: boolean) {
    const token = randomUUID()
    return db.transaction(async (trx) => {
      const changed = await Attempt.query({ client: trx })
        .where('id', id)
        .whereNotIn('state', ['paid', 'expired'])
        .where('needs_review', false)
        .where((q) =>
          q.whereNull('claim_expires_at_ms').orWhere('claim_expires_at_ms', '<', Date.now())
        )
        .update({ claimToken: token, claimExpiresAtMs: Date.now() + 120_000 })
      if (affectedRows(changed) !== 1) return null
      const attempt = await Attempt.findOrFail(id, { client: trx })
      const firstSubmission = !attempt.externalId && ['creating', 'failed'].includes(attempt.state)
      if (expire && attempt.expiresAtMs > Date.now() && !attempt.closeReason) {
        attempt.claimToken = null
        attempt.claimExpiresAtMs = null
        await attempt.save()
        return null
      }
      if (
        !attempt.externalId &&
        ['creating', 'failed'].includes(attempt.state) &&
        (expire || attempt.closeReason)
      ) {
        // No uncertain request is in flight: safe to close a never-submitted/rejected attempt.
        await this.finishClosed(attempt, trx)
        return null
      }
      if (!attempt.externalId && attempt.state === 'creating') {
        const provider = this.payments.getProvider(attempt.provider)
        attempt.replayUntilMs = Date.now() + provider.mutationReplayWindowMs
        attempt.state = this.states.transition('attempt', attempt.state, 'unknown')
      } else if (!attempt.externalId && attempt.state === 'failed') {
        attempt.state = this.states.transition('attempt', attempt.state, 'creating')
        const provider = this.payments.getProvider(attempt.provider)
        attempt.replayUntilMs = Date.now() + provider.mutationReplayWindowMs
        attempt.state = this.states.transition('attempt', attempt.state, 'unknown')
      }
      attempt.version++
      await attempt.save()
      return { attempt, token, firstSubmission }
    })
  }

  private async validate(attempt: Attempt, checkout: CheckoutSession) {
    if (
      checkout.provider !== attempt.provider ||
      checkout.liveMode !== attempt.liveMode ||
      checkout.reference !== attempt.requestSnapshot.reference ||
      (attempt.externalId && checkout.id !== attempt.externalId)
    ) {
      throw new CheckoutException('Payment checkout association mismatch', 'E_PAYMENT_ASSOCIATION')
    }
  }

  private async saveReference(attempt: Attempt, checkout: CheckoutSession, token: string) {
    await Attempt.query()
      .where('id', attempt.id)
      .where('claim_token', token)
      .whereNot('state', 'paid')
      .update({ externalId: checkout.id, checkoutUrl: checkout.url, lastError: null })
    attempt.externalId = checkout.id
  }

  private async closed(id: number, token: string) {
    await db.transaction(async (trx) => {
      const changed = await Attempt.query({ client: trx })
        .where('id', id)
        .where('claim_token', token)
        .whereNot('state', 'paid')
        .update({ state: 'closing' })
      if (affectedRows(changed) !== 1) return
      const attempt = await Attempt.findOrFail(id, { client: trx })
      await this.finishClosed(attempt, trx)
    })
  }

  private async closeRejected(id: number) {
    await db.transaction(async (trx) => {
      const attempt = await Attempt.findOrFail(id, { client: trx })
      if (attempt.state !== 'failed') return
      await this.finishClosed(attempt, trx)
    })
  }

  private async finishClosed(
    attempt: Attempt,
    trx: import('@adonisjs/lucid/types/database').TransactionClientContract
  ) {
    await Order.query({ client: trx }).where('id', attempt.orderId).increment('version', 1)
    const order = await Order.findOrFail(attempt.orderId, { client: trx })
    if (order.lifecycleState !== 'pending_payment') return
    await this.inventory.release(trx, order.id)
    attempt.state = 'expired'
    attempt.claimToken = null
    attempt.claimExpiresAtMs = null
    attempt.checkoutUrl = null
    attempt.version++
    await attempt.save()
    order.lifecycleState = this.states.transition(
      'order',
      order.lifecycleState,
      attempt.closeReason === 'cancelled' ? 'cancelled' : 'expired'
    )
    order.financialStatus = this.states.financial(0, 0, true)
    if (order.lifecycleState === 'cancelled') order.cancelledAt = DateTime.utc()
    await order.save()
    if (order.cartId)
      await Cart.query({ client: trx })
        .where('id', order.cartId)
        .where('status', 'submitted')
        .update({ status: 'abandoned' })
    await this.activities.record(trx, order.id, `order.${order.lifecycleState}`, {
      attemptId: attempt.id,
    })
  }
}
