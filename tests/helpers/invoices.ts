import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import OrderAccessService from '#services/checkout/order_access_service'
import { OrderFactory } from '#database/factories/order_factory'

export async function order(paidAt: DateTime | null = DateTime.utc()) {
  const publicId = randomUUID()
  const created = await OrderFactory.merge({
    publicId,
    number: `MB-${publicId.replaceAll('-', '').slice(0, 16).toUpperCase()}`,
    email: 'guest@example.com',
    source: 'online',
    lifecycleState: paidAt ? 'confirmed' : 'pending_payment',
    financialStatus: paidAt ? 'paid' : 'pending',
    paidAt,
  })
    .with('lineItems', 2)
    .with('addresses', 1)
    .create()
  const access = await app.container.make(OrderAccessService)
  const grant = await access.issue(created.id)
  return { order: created, grant }
}

/** Uncompressed text is enough to tell a real PDF from an error page. */
export function isPdf(body: Buffer) {
  return body.subarray(0, 5).toString() === '%PDF-' && body.includes('%%EOF')
}
