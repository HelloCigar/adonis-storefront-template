import { createHash, randomUUID } from 'node:crypto'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import { sqlDateTime } from '#models/shared/sql_datetime'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import RefundLookup from '#models/payments/refund_lookup'
import WorkflowOutbox from '#models/checkout/workflow_outbox'
import PaymentService, { type PaymentReference } from '#services/payments/payment_service'
import RefundService from '#services/payments/refund_service'
import OutboxService from '#services/checkout/outbox_service'
import { affectedRows } from '#models/shared/affected_rows'
import { isLeased, leaseFor, leaseMs, leaseReleased, unleased } from '#models/shared/lease'
import CheckoutException from '#exceptions/checkout_exception'

@inject()
export default class RefundLookupService {
  constructor(
    private payments: PaymentService,
    private refunds: RefundService,
    private outbox: OutboxService
  ) {}

  async request(reference: PaymentReference, liveMode: boolean, eventId: string | null) {
    return db.transaction(async (trx) => {
      const row = await RefundLookup.firstOrCreate(
        { provider: reference.provider, externalId: reference.id, liveMode },
        { state: 'pending' },
        { client: trx }
      )
      const eventKey = eventId
        ? createHash('sha256').update(eventId).digest('hex')
        : Math.floor(Date.now() / 60_000)
      const key = `refund-lookup:${row.id}:${eventKey}`
      if (await WorkflowOutbox.query({ client: trx }).where('operation_key', key).first())
        return row
      if (row.state !== 'review_required') {
        // A new notification supersedes an in-flight lookup's completion. Its queued
        // job can claim immediately; the old token can no longer resolve this work.
        await RefundLookup.query({ client: trx })
          .where('id', row.id)
          .update({
            state: 'pending',
            ...leaseReleased(),
            lastError: null,
          })
        await row.refresh()
        await this.outbox.record(trx, { key, kind: 'lookup_refund', entityId: row.id })
      }
      return row
    })
  }

  async run(id: number) {
    const token = randomUUID()
    const changed = await RefundLookup.query()
      .where('id', id)
      .where('state', 'pending')
      .where(unleased)
      .update(leaseFor(token, leaseMs.operation))
    if (affectedRows(changed) !== 1) return
    try {
      const row = await RefundLookup.findOrFail(id)
      const result = await this.payments.getRefund({ provider: row.provider, id: row.externalId })
      if (
        result.provider !== row.provider ||
        result.id !== row.externalId ||
        result.liveMode !== row.liveMode
      )
        throw new CheckoutException(
          'Refund lookup association mismatch',
          'E_REFUND_LOOKUP_ASSOCIATION'
        )
      await this.refunds.apply(result)
      await RefundLookup.query()
        .where('id', id)
        .where('claim_token', token)
        .update({
          state: result.status === 'pending' ? 'pending' : 'resolved',
          ...leaseReleased(),
          lastError: null,
        })
    } catch {
      const released = await RefundLookup.query()
        .where('id', id)
        .where('claim_token', token)
        .update({ ...leaseReleased(), lastError: 'E_REFUND_LOOKUP' })
      if (affectedRows(released) !== 1) return
      throw new Error('Refund resource lookup failed')
    }
  }

  async review(id: number) {
    await RefundLookup.query()
      .where('id', id)
      .whereNot('state', 'resolved')
      .update({
        state: 'review_required',
        ...leaseReleased(),
        lastError: 'E_REFUND_LOOKUP_RETRIES_EXHAUSTED',
      })
    logger.error({ lookupId: id }, 'Refund lookup requires operator review')
  }

  async sweep() {
    const rows = await RefundLookup.query()
      .where('state', 'pending')
      .where('updated_at', '<', sqlDateTime(DateTime.utc().minus({ minutes: 1 })))
      .limit(100)
    for (const row of rows)
      await db.transaction((trx) =>
        this.outbox.record(trx, {
          key: `refund-lookup-sweep:${row.id}:${Math.floor(Date.now() / 60_000)}`,
          kind: 'lookup_refund',
          entityId: row.id,
        })
      )
  }

  async retry(id: number) {
    await db.transaction(async (trx) => {
      const row = await RefundLookup.findOrFail(id, { client: trx })
      if (row.state === 'resolved') return
      if (isLeased(row))
        throw new CheckoutException('Lookup is still running', 'E_REFUND_LOOKUP_BUSY')
      row.state = 'pending'
      row.lastError = null
      await row.save()
      await this.outbox.record(trx, {
        key: `refund-lookup-retry:${id}:${randomUUID()}`,
        kind: 'lookup_refund',
        entityId: id,
      })
    })
  }
}
