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
import BalanceService from '#services/payments/balance_service'
import PaymentException from '#exceptions/payment_exception'
import CheckoutException from '#exceptions/checkout_exception'
import { affectedRows } from '#models/shared/affected_rows'
import { isLeased, leaseFor, leaseMs, leaseReleased, unleased } from '#models/shared/lease'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

@inject()
export default class RefundService {
  constructor(
    private payments: PaymentService,
    private states: StateService,
    private money: MoneyService,
    private outbox: OutboxService,
    private activities: ActivityService,
    private balances: BalanceService
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
    CheckoutException.assertStaff(actor, 'E_REFUND_ACCESS')
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
    const balance = await this.balances.forPayment(trx, payment)
    if (balance.currencyMismatch) {
      throw new CheckoutException(
        'A provider refund currency does not match this payment. Reconcile it before requesting another refund.',
        'E_REFUND_ASSOCIATION'
      )
    }
    if (balance.pending) {
      throw new CheckoutException(
        'A provider refund is still pending. Reconcile it before requesting another refund.',
        'E_REFUND_PENDING'
      )
    }
    const amountMinor = payment.amountMinor - balance.refundedMinor
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
        .where(unleased)
        .update(leaseFor(token, leaseMs.operation))
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
          ...leaseReleased(),
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
    const reconcile = await db.transaction(async (trx) => {
      // Provider facts and their financial effect commit together, including refunds
      // initiated outside this application that have no local operation to retry.
      const observation = await RefundObservation.firstOrCreate(
        { provider: result.provider, liveMode: result.liveMode, externalId: result.id },
        {
          externalPaymentId: result.paymentId,
          amountMinor: result.amount,
          currency: result.currency,
          state: result.status,
        },
        { client: trx }
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
      await RefundObservation.query({ client: trx })
        .where('id', observation.id)
        .whereNot('state', 'succeeded')
        .update({ state: result.status })
      await observation.refresh()
      const query = RefundOperation.query({ client: trx })
        .where('provider', result.provider)
        .where('live_mode', result.liveMode)
      if (expectedId) query.where('id', expectedId)
      else query.where('external_id', result.id)
      const candidate = await query.first()
      const observedPayment = await Payment.query({ client: trx })
        .where({
          provider: result.provider,
          liveMode: result.liveMode,
          externalId: result.paymentId,
        })
        .first()
      if (observedPayment?.orderId) {
        await Order.query({ client: trx })
          .where('id', observedPayment.orderId)
          .increment('version', 1)
        // Provider facts affect their own payment independently of operation ownership.
        await this.balance(trx, observedPayment.orderId)
      }
      if (!candidate) {
        // Do not guess a local refund from amount alone. Replay/lookup discovers its original reference.
        return true
      }
      if (candidate.orderId !== observedPayment?.orderId) {
        await Order.query({ client: trx }).where('id', candidate.orderId).increment('version', 1)
      }
      const refund = await RefundOperation.findOrFail(candidate.id, { client: trx })
      const payment = await Payment.findOrFail(refund.paymentId, { client: trx })
      const associated =
        result.paymentId === payment.externalId &&
        result.provider === payment.provider &&
        result.liveMode === payment.liveMode &&
        result.currency === payment.currency &&
        result.amount === refund.amountMinor &&
        (!refund.externalId || result.id === refund.externalId)
      if (token && refund.claimToken !== token) {
        return false
      }
      if (!associated) {
        refund.needsReview = true
        refund.lastError = 'E_REFUND_ASSOCIATION'
        refund.merge(leaseReleased())
        await refund.save()
        await this.activities.record(trx, refund.orderId, 'refund.review_required', {
          refundId: refund.id,
        })
        return false
      }
      if (
        refund.state === 'succeeded' ||
        (refund.state === 'failed' && observation.state !== 'succeeded')
      ) {
        return false
      }
      // A verified success wins over an earlier failed/out-of-order notification.
      refund.state = observation.state
      refund.externalId = result.id
      refund.merge(leaseReleased())
      refund.lastError = null
      refund.needsReview = false
      await refund.save()
      observation.refundOperationId = refund.id
      await observation.save()
      await this.activities.record(trx, refund.orderId, `refund.${refund.state}`, {
        refundId: refund.id,
        amountMinor: refund.amountMinor,
      })
      return false
    })
    if (reconcile) await this.reconcilePayment(result.provider, result.paymentId, result.liveMode)
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
    CheckoutException.assertStaff(actor, 'E_REFUND_ACCESS')
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
      if (isLeased(refund))
        throw new CheckoutException('This operation is still running', 'E_REFUND_BUSY')
      if (observation) refund.externalId = observation.id
      refund.needsReview = false
      refund.lastError = null
      refund.merge(leaseReleased())
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
      ...leaseReleased(),
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
    const payments = await Payment.query({ client: trx }).where('order_id', orderId)
    const balances = await this.balances.forPayments(trx, payments)
    const currencyMismatch = payments.some((payment) => balances.get(payment)!.currencyMismatch)
    const accepted = payments.find((payment) => payment.disposition === 'accepted')
    if (!accepted) {
      if (currencyMismatch) {
        order.lifecycleState = 'review_required'
        order.reviewReason = 'A provider refund currency does not match its captured payment.'
        await order.save()
      }
      return
    }
    const balance = balances.get(accepted)!
    if (balance.overRefunded) {
      order.lifecycleState = 'review_required'
      order.reviewReason = 'Refund observations exceed captured payment.'
      await order.save()
      return
    }
    order.financialStatus = this.states.financial(accepted.amountMinor, balance.refundedMinor)
    if (currencyMismatch) {
      order.lifecycleState = 'review_required'
      order.reviewReason = 'A provider refund currency does not match its captured payment.'
      await order.save()
      return
    }
    if (order.lifecycleState === 'review_required' && order.financialStatus === 'paid') {
      const others = payments.filter((payment) => payment.id !== accepted.id)
      // Extra captures are resolved only once each is confirmed fully refunded.
      const resolved =
        others.length > 0 &&
        others.every((other) => balances.get(other)!.refundedMinor === other.amountMinor)
      if (resolved) {
        order.lifecycleState = 'confirmed'
        order.reviewReason = null
        await order
          .related('attempts')
          .query()
          .where('state', 'paid')
          .update({ needsReview: false })
        await this.activities.record(trx, orderId, 'payment.review_resolved')
      }
    }
    await order.save()
  }
}
