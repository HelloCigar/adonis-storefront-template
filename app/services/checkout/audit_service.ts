import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { sqlDateTime } from '#models/shared/sql_datetime'
import MoneyService from '#services/checkout/money_service'
import { unleased } from '#models/shared/lease'
import Payment from '#models/payments/payment'
import Attempt from '#models/payments/attempt'
import RefundOperation from '#models/payments/refund_operation'

@inject()
export default class AuditService {
  constructor(private money: MoneyService) {}
  async read() {
    const staleAt = sqlDateTime(DateTime.utc().minus({ minutes: 2 }))
    return db.transaction(async (trx) => {
      const variants = await trx
        .from('product_variants')
        .select('id', 'price_amount', 'inventory_quantity', 'inventory_reserved_quantity')
      const reservations = await trx
        .from('stock_reservations')
        .where('state', 'reserved')
        .select('product_variant_id')
        .sum('quantity as quantity')
        .groupBy('product_variant_id')
      const holds = new Map(
        reservations.map((row) => [Number(row.product_variant_id), Number(row.quantity)])
      )
      const invalidPrices: number[] = []
      const invalidStock: number[] = []
      for (const row of variants) {
        try {
          this.money.toMinor(row.price_amount)
        } catch {
          invalidPrices.push(row.id)
        }
        const reserved = Number(row.inventory_reserved_quantity)
        if (
          reserved !== (holds.get(row.id) ?? 0) ||
          reserved < 0 ||
          (row.inventory_quantity !== null && reserved > Number(row.inventory_quantity))
        )
          invalidStock.push(row.id)
      }
      const outbox = await trx
        .from('workflow_outbox')
        .whereNull('published_at')
        .select('id', 'created_at')
      const staleAttempts = await trx
        .from('payment_attempts')
        .whereIn('state', [...Attempt.recoverableStates])
        .where('updated_at', '<', staleAt)
        .where(unleased)
        .select('id')
      const reviewAttempts = await trx
        .from('payment_attempts')
        .where('needs_review', true)
        .select('id')
      const unresolvedPayments = await Payment.query({ client: trx })
        .where((query) =>
          query
            .whereNull('order_id')
            .orWhereHas('order', (order) => order.where('lifecycle_state', 'review_required'))
        )
        .select('id')
      const reviewOrders = await trx
        .from('orders')
        .where('source', 'online')
        .where('lifecycle_state', 'review_required')
        .select('id')
      const refunds = await trx
        .from('refund_operations')
        .where((query) =>
          query
            .where('needs_review', true)
            .orWhere((q) =>
              q
                .whereIn('state', [...RefundOperation.inFlightStates])
                .where('updated_at', '<', staleAt)
            )
        )
        .select('id')
      const lookups = await trx
        .from('refund_lookups')
        .where((query) =>
          query
            .where('state', 'review_required')
            .orWhere((q) => q.where('state', 'pending').where('updated_at', '<', staleAt))
        )
        .select('id')
      const notifications = await trx
        .from('order_notifications')
        .where((query) =>
          query
            .where('state', 'failed')
            .orWhere((q) => q.where('state', 'pending').where('updated_at', '<', staleAt))
        )
        .select('id')
      const queue = await trx
        .from('queue_jobs')
        .select('queue', 'status')
        .count('* as count')
        .groupBy('queue', 'status')
      const schedules = await trx
        .from('queue_schedules')
        .select('id', 'status', 'run_count', 'last_run_at', 'next_run_at')
      const missingSchedules = ['checkout-outbox-relay', 'payment-operation-recovery'].filter(
        (id) => !schedules.some((row) => row.id === id && row.status === 'active')
      )
      const issues = {
        missingSchedules,
        invalidPrices,
        invalidStock,
        unpublishedOutbox: outbox.map((row) => row.id),
        staleAttempts: staleAttempts.map((row) => row.id),
        reviewAttempts: reviewAttempts.map((row) => row.id),
        reviewOrders: reviewOrders.map((row) => row.id),
        unresolvedPayments: unresolvedPayments.map((row) => row.id),
        refunds: refunds.map((row) => row.id),
        refundLookups: lookups.map((row) => row.id),
        notifications: notifications.map((row) => row.id),
      }
      return {
        issues,
        queue,
        schedules,
        unpublishedOutboxOldestAt: outbox.length
          ? outbox.map((row) => String(row.created_at)).sort()[0]
          : null,
      }
    })
  }
}
