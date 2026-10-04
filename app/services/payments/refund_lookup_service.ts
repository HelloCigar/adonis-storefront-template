import { createHash, randomUUID } from 'node:crypto'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import RefundLookup from '#models/payments/refund_lookup'
import WorkflowOutbox from '#models/checkout/workflow_outbox'
import PaymentService, { type PaymentReference } from '#services/payments/payment_service'
import RefundService from '#services/payments/refund_service'
import OutboxService from '#services/checkout/outbox_service'
import { affectedRows } from '#models/shared/affected_rows'
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
      if (row.state === 'resolved') {
        row.state = 'pending'
        await row.save()
      }
      if (row.state !== 'review_required')
        await this.outbox.record(trx, { key, kind: 'lookup_refund', entityId: row.id })
      return row
    })
  }

  async run(id: number) {
    const token = randomUUID()
    const changed = await RefundLookup.query()
      .where('id', id)
      .where('state', 'pending')
      .where((query) =>
        query.whereNull('claim_expires_at_ms').orWhere('claim_expires_at_ms', '<', Date.now())
      )
      .update({ claimToken: token, claimExpiresAtMs: Date.now() + 120_000 })
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
        .update({ state: 'resolved', claimToken: null, claimExpiresAtMs: null, lastError: null })
    } catch {
      await RefundLookup.query()
        .where('id', id)
        .where('claim_token', token)
        .update({ claimToken: null, claimExpiresAtMs: null, lastError: 'E_REFUND_LOOKUP' })
      throw new Error('Refund resource lookup failed')
    }
  }

  async review(id: number) {
    await RefundLookup.query().where('id', id).whereNot('state', 'resolved').update({
      state: 'review_required',
      claimToken: null,
      claimExpiresAtMs: null,
      lastError: 'E_REFUND_LOOKUP_RETRIES_EXHAUSTED',
    })
    logger.error({ lookupId: id }, 'Refund lookup requires operator review')
  }

  async sweep() {
    const rows = await RefundLookup.query()
      .where('state', 'pending')
      .where(
        'updated_at',
        '<',
        DateTime.utc().minus({ minutes: 1 }).toSQL({ includeOffset: false })!
      )
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
      if ((row.claimExpiresAtMs ?? 0) > Date.now())
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
