import { randomUUID } from 'node:crypto'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import User from '#models/account/user'
import Order from '#models/checkout/order'
import Payment from '#models/payments/payment'
import RefundOperation from '#models/payments/refund_operation'
import RefundObservation from '#models/payments/refund_observation'
import Shipment from '#models/checkout/shipment'
import PaymentService, { type PaymentRefund } from '#services/payments/payment_service'
import StateService from '#services/checkout/state_service'
import MoneyService from '#services/checkout/money_service'
import OutboxService from '#services/checkout/outbox_service'
import ActivityService from '#services/checkout/activity_service'
import PaymentException from '#exceptions/payment_exception'
import CheckoutException from '#exceptions/checkout_exception'
import { affectedRows } from '#models/shared/affected_rows'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

@inject()
export default class RefundService {
  constructor(
    private payments: PaymentService,
    private states: StateService,
    private money: MoneyService,
    private outbox: OutboxService,
    private activities: ActivityService
  ) {}

  async requestFull(orderId: number, actor: User, paymentId?: number) {
    return db.transaction((trx) => this.requestFullWithin(trx, orderId, actor, paymentId))
  }

  async requestFullWithin(
    trx: TransactionClientContract,
    orderId: number,
    actor: User,
    paymentId?: number
  ) {
    if (!actor.isStoreStaff) throw new CheckoutException('Access denied', 'E_REFUND_ACCESS', 403)
    await Order.query({ client: trx }).where('id', orderId).increment('version', 1)
    const order = await Order.findOrFail(orderId, { client: trx })
    const shipped = await Shipment.query({ client: trx })
      .where('order_id', order.id)
      .where('state', 'shipped')
      .first()
    if (order.source !== 'online' || shipped)
      throw new CheckoutException(
        'Only unshipped online payments can be refunded here',
        'E_REFUND_STATE'
      )
    const query = Payment.query({ client: trx }).where('order_id', orderId)
    if (paymentId) query.where('id', paymentId)
    else query.where('disposition', 'accepted')
    const payment = await query.firstOrFail()
    const existing = await RefundOperation.query({ client: trx })
      .where('payment_id', payment.id)
      .whereIn('state', ['requested', 'pending', 'unknown'])
      .first()
    if (existing) return existing
    const observations = await RefundObservation.query({ client: trx })
      .where({
        provider: payment.provider,
        liveMode: payment.liveMode,
        externalPaymentId: payment.externalId,
      })
      .where('state', 'succeeded')
    const refunded = observations.reduce((total, row) => this.money.add(total, row.amountMinor), 0)
    const amountMinor = payment.amountMinor - refunded
    this.money.assertMinor(amountMinor)
    if (amountMinor === 0)
      throw new CheckoutException('This payment is already refunded', 'E_REFUND_BALANCE')
    const provider = this.payments.getProvider(payment.provider)
    if (provider.liveMode !== payment.liveMode)
      throw new CheckoutException('Original payment mode is unavailable', 'E_REFUND_MODE')
    const refund = await RefundOperation.create(
      {
        orderId,
        paymentId: payment.id,
        provider: payment.provider,
        liveMode: payment.liveMode,
        amountMinor,
        reason: 'requested_by_customer',
        idempotencyKey: randomUUID(),
        state: 'requested',
        actorId: actor.id,
        replayScope: provider.idempotencyScope,
        needsReview: false,
      },
      { client: trx }
    )
    await this.outbox.record(trx, {
      key: `refund:${refund.id}`,
      kind: 'submit_refund',
      entityId: refund.id,
    })
    await this.activities.record(
      trx,
      orderId,
      'refund.requested',
      { refundId: refund.id, amountMinor },
      actor.id
    )
    return refund
  }

  async run(id: number) {
    const token = randomUUID()
    const claim = await db.transaction(async (trx) => {
      const changed = await RefundOperation.query({ client: trx })
        .where('id', id)
        .whereIn('state', ['requested', 'unknown', 'pending'])
        .where('needs_review', false)
        .where((q) =>
          q.whereNull('claim_expires_at_ms').orWhere('claim_expires_at_ms', '<', Date.now())
        )
        .update({ claimToken: token, claimExpiresAtMs: Date.now() + 120_000 })
      if (affectedRows(changed) !== 1) return null
      const refund = await RefundOperation.findOrFail(id, { client: trx })
      const firstSubmission = refund.state === 'requested'
      if (firstSubmission) {
        const provider = this.payments.getProvider(refund.provider)
        refund.replayUntilMs = Date.now() + provider.mutationReplayWindowMs
        refund.state = 'unknown'
        await refund.save()
      }
      return { refund, firstSubmission }
    })
    if (!claim) return
    const { refund, firstSubmission } = claim
    try {
      const payment = await Payment.findOrFail(refund.paymentId)
      let result: PaymentRefund
      if (refund.externalId)
        result = await this.payments.getRefund({ provider: refund.provider, id: refund.externalId })
      else {
        const provider = this.payments.getProvider(refund.provider)
        if (
          provider.liveMode !== refund.liveMode ||
          provider.idempotencyScope !== refund.replayScope ||
          (!firstSubmission &&
            (refund.replayUntilMs === null || refund.replayUntilMs <= Date.now()))
        ) {
          await this.review(id, 'E_REFUND_REPLAY_UNSAFE', token)
          return
        }
        result = await this.payments.refund({
          payment: { provider: payment.provider, id: payment.externalId },
          amount: refund.amountMinor,
          currency: payment.currency,
          reason: refund.reason,
          idempotencyKey: refund.idempotencyKey,
        })
      }
      await this.apply(result, id, token)
    } catch (error) {
      const code =
        error instanceof PaymentException || error instanceof CheckoutException
          ? error.code
          : 'E_REFUND_OPERATION'
      const rejected =
        error instanceof PaymentException && error.outcome !== 'unknown' && !refund.externalId
      const retryableRejection = rejected && error instanceof PaymentException && error.retryable
      const changed = await RefundOperation.query()
        .where('id', id)
        .where('claim_token', token)
        .whereNot('state', 'succeeded')
        .update({
          state: retryableRejection ? 'requested' : rejected ? 'failed' : 'unknown',
          lastError: code,
          claimToken: null,
          claimExpiresAtMs: null,
        })
      if (affectedRows(changed) !== 1) return
      if (error instanceof PaymentException && !error.retryable) {
        if (!rejected) await this.review(id, code)
        return
      }
      throw error
    }
  }

  async apply(result: PaymentRefund, expectedId?: number, token?: string): Promise<void> {
    this.money.assertMinor(result.amount)
    const observation = await RefundObservation.firstOrCreate(
      { provider: result.provider, liveMode: result.liveMode, externalId: result.id },
      {
        externalPaymentId: result.paymentId,
        amountMinor: result.amount,
        currency: result.currency,
        state: result.status,
      }
    )
    if (
      observation.externalPaymentId !== result.paymentId ||
      observation.amountMinor !== result.amount ||
      observation.currency !== result.currency
    ) {
      throw new CheckoutException(
        'Refund resource facts changed',
        'E_REFUND_OBSERVATION_CONFLICT',
        422
      )
    }
    if (observation.state !== 'succeeded') {
      observation.state = result.status
      await observation.save()
    }
    const query = RefundOperation.query()
      .where('provider', result.provider)
      .where('live_mode', result.liveMode)
    if (expectedId) query.where('id', expectedId)
    else query.where('external_id', result.id)
    const candidate = await query.first()
    if (!candidate) {
      // Do not guess a local refund from amount alone. Replay/lookup discovers its original reference.
      const payment = await Payment.query()
        .where({
          provider: result.provider,
          liveMode: result.liveMode,
          externalId: result.paymentId,
        })
        .first()
      if (payment?.orderId)
        await db.transaction(async (trx) => {
          await Order.query({ client: trx }).where('id', payment.orderId!).increment('version', 1)
          await this.balance(trx, payment.orderId!)
        })
      await this.reconcilePayment(result.provider, result.paymentId, result.liveMode)
      return
    }
    await db.transaction(async (trx) => {
      await Order.query({ client: trx }).where('id', candidate.orderId).increment('version', 1)
      const refund = await RefundOperation.findOrFail(candidate.id, { client: trx })
      const payment = await Payment.findOrFail(refund.paymentId, { client: trx })
      if (token && refund.claimToken !== token) return
      if (
        result.paymentId !== payment.externalId ||
        result.provider !== payment.provider ||
        result.liveMode !== payment.liveMode ||
        result.currency !== payment.currency ||
        result.amount !== refund.amountMinor ||
        (refund.externalId && result.id !== refund.externalId)
      ) {
        refund.needsReview = true
        refund.lastError = 'E_REFUND_ASSOCIATION'
        refund.claimToken = null
        refund.claimExpiresAtMs = null
        await refund.save()
        await this.activities.record(trx, refund.orderId, 'refund.review_required', {
          refundId: refund.id,
        })
        return
      }
      if (
        refund.state === 'succeeded' ||
        (refund.state === 'failed' && result.status !== 'succeeded')
      )
        return
      // A verified success wins over an earlier failed/out-of-order notification.
      refund.state = result.status
      refund.externalId = result.id
      refund.claimToken = null
      refund.claimExpiresAtMs = null
      refund.lastError = null
      refund.needsReview = false
      await refund.save()
      observation.useTransaction(trx)
      observation.refundOperationId = refund.id
      await observation.save()
      await this.balance(trx, refund.orderId)
      await this.activities.record(trx, refund.orderId, `refund.${result.status}`, {
        refundId: refund.id,
        amountMinor: refund.amountMinor,
      })
    })
  }

  async reconcilePayment(provider: string, externalPaymentId: string, liveMode: boolean) {
    const payment = await Payment.query()
      .where({ provider, externalId: externalPaymentId, liveMode })
      .first()
    if (!payment) return
    const refunds = await RefundOperation.query()
      .where('payment_id', payment.id)
      .whereIn('state', ['requested', 'pending', 'unknown'])
    for (const refund of refunds) await this.enqueue(refund.id)
  }

  async sweep() {
    const rows = await RefundOperation.query()
      .whereIn('state', ['requested', 'pending', 'unknown'])
      .where('needs_review', false)
      .where(
        'updated_at',
        '<',
        DateTime.utc().minus({ minutes: 1 }).toSQL({ includeOffset: false })!
      )
      .limit(100)
    for (const row of rows) await this.enqueue(row.id)
  }

  async retry(id: number, actor: User, externalId?: string) {
    if (!actor.isStoreStaff) throw new CheckoutException('Access denied', 'E_REFUND_ACCESS', 403)
    const original = await RefundOperation.findOrFail(id)
    const payment = await Payment.findOrFail(original.paymentId)
    let observation: PaymentRefund | undefined
    if (externalId) {
      observation = await this.payments.getRefund({ provider: original.provider, id: externalId })
      if (
        observation.paymentId !== payment.externalId ||
        observation.amount !== original.amountMinor ||
        observation.currency !== payment.currency ||
        observation.liveMode !== original.liveMode ||
        (original.externalId && original.externalId !== observation.id)
      )
        throw new CheckoutException(
          'Refund does not match the original payment',
          'E_REFUND_ASSOCIATION'
        )
    }
    await db.transaction(async (trx) => {
      await Order.query({ client: trx }).where('id', original.orderId).increment('version', 1)
      const refund = await RefundOperation.findOrFail(id, { client: trx })
      if (['succeeded', 'failed'].includes(refund.state))
        throw new CheckoutException('This refund is already resolved', 'E_REFUND_RETRY_STATE')
      if ((refund.claimExpiresAtMs ?? 0) > Date.now())
        throw new CheckoutException('This operation is still running', 'E_REFUND_BUSY')
      if (observation) refund.externalId = observation.id
      refund.needsReview = false
      refund.lastError = null
      refund.claimToken = null
      refund.claimExpiresAtMs = null
      await refund.save()
      await this.outbox.record(trx, {
        key: `staff-refund-retry:${id}:${randomUUID()}`,
        kind: 'reconcile_refund',
        entityId: id,
      })
      await this.activities.record(
        trx,
        refund.orderId,
        'refund.retry_requested',
        { refundId: id },
        actor.id
      )
    })
  }

  async review(id: number, code = 'E_REFUND_RETRIES_EXHAUSTED', token?: string) {
    const query = RefundOperation.query().where('id', id).whereNot('state', 'succeeded')
    if (token) query.where('claim_token', token)
    await query.update({
      needsReview: true,
      lastError: code,
      claimToken: null,
      claimExpiresAtMs: null,
    })
    logger.error({ refundId: id, code }, 'Refund operation requires staff review')
  }

  private async enqueue(id: number) {
    await db.transaction((trx) =>
      this.outbox.record(trx, {
        key: `refund-reconcile:${id}:${Math.floor(Date.now() / 60_000)}`,
        kind: 'reconcile_refund',
        entityId: id,
      })
    )
  }

  private async balance(trx: TransactionClientContract, orderId: number) {
    const order = await Order.findOrFail(orderId, { client: trx })
    const accepted = await Payment.query({ client: trx })
      .where('order_id', orderId)
      .where('disposition', 'accepted')
      .first()
    if (!accepted) return
    const refunds = await RefundObservation.query({ client: trx })
      .where({
        provider: accepted.provider,
        liveMode: accepted.liveMode,
        externalPaymentId: accepted.externalId,
      })
      .where('state', 'succeeded')
    const amount = refunds.reduce((total, row) => this.money.add(total, row.amountMinor), 0)
    if (amount > accepted.amountMinor) {
      order.lifecycleState = 'review_required'
      order.reviewReason = 'Refund observations exceed captured payment.'
      await order.save()
      return
    }
    order.financialStatus = this.states.financial(accepted.amountMinor, amount)
    if (order.lifecycleState === 'review_required' && order.financialStatus === 'paid') {
      const others = await Payment.query({ client: trx })
        .where('order_id', orderId)
        .whereNot('id', accepted.id)
      let resolved = others.length > 0
      for (const other of others) {
        const confirmed = await RefundObservation.query({ client: trx })
          .where({
            provider: other.provider,
            liveMode: other.liveMode,
            externalPaymentId: other.externalId,
          })
          .where('state', 'succeeded')
        if (
          confirmed.reduce((total, row) => this.money.add(total, row.amountMinor), 0) !==
          other.amountMinor
        )
          resolved = false
      }
      if (resolved) {
        order.lifecycleState = 'confirmed'
        order.reviewReason = null
        await trx
          .from('payment_attempts')
          .where('order_id', orderId)
          .where('state', 'paid')
          .update({ needs_review: false })
        await this.activities.record(trx, orderId, 'payment.review_resolved')
      }
    }
    await order.save()
  }
}
