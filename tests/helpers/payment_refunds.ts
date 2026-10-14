import { randomUUID } from 'node:crypto'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import Payment from '#models/payments/payment'
import Attempt from '#models/payments/attempt'
import Shipment from '#models/checkout/shipment'
import InventoryService from '#services/catalog/inventory_service'
import { type CheckoutSession, type PaymentRefund } from '#services/payments/payment_service'
import { OrderFactory } from '#database/factories/order_factory'
import { UserFactory } from '#database/factories/user_factory'
import { ProductVariantFactory } from '#database/factories/product_variant_factory'

export async function paidOrder(provider: string) {
  const order = await OrderFactory.merge({
    source: 'online',
    lifecycleState: 'confirmed',
    financialStatus: 'paid',
    totalMinor: 109800,
  }).create()
  const payment = await Payment.create({
    orderId: order.id,
    attemptId: null,
    provider,
    liveMode: false,
    externalId: randomUUID(),
    amountMinor: order.totalMinor!,
    currency: 'PHP',
    disposition: 'accepted',
    capturedAt: DateTime.utc(),
  })
  await Shipment.create({ orderId: order.id, state: 'pending' })
  const staff = await UserFactory.merge({ role: 'staff' }).create()
  const result: PaymentRefund = {
    provider,
    liveMode: false,
    id: randomUUID(),
    paymentId: payment.externalId,
    amount: payment.amountMinor,
    currency: payment.currency,
    status: 'succeeded',
  }
  return { order, payment, staff, result }
}

export async function pendingOrder(provider: string) {
  const order = await OrderFactory.merge({
    publicId: randomUUID(),
    source: 'online',
    lifecycleState: 'pending_payment',
    financialStatus: 'pending',
    totalMinor: 109800,
  }).create()
  const variant = await ProductVariantFactory.merge({
    availableForSale: true,
    inventoryQuantity: 2,
  }).create()
  const deadline = Date.now() + 900000
  const inventory = await app.container.make(InventoryService)
  await db.transaction((trx) =>
    inventory.reserve(trx, order.id, [{ variantId: variant.id, quantity: 2 }], deadline)
  )
  const idempotencyKey = randomUUID()
  const attempt = await Attempt.create({
    publicId: randomUUID(),
    orderId: order.id,
    provider,
    liveMode: false,
    amountMinor: order.totalMinor!,
    currency: 'PHP',
    state: 'pending',
    version: 0,
    idempotencyKey,
    externalId: randomUUID(),
    expiresAtMs: deadline,
    needsReview: false,
    requestSnapshot: {
      reference: order.publicId!,
      currency: 'PHP',
      items: [{ name: 'Order', unitAmount: order.totalMinor!, quantity: 1 }],
      successUrl: 'https://store.example/order',
      cancelUrl: 'https://store.example/order',
      idempotencyKey,
    },
  })
  const captureId = randomUUID()
  const checkout: CheckoutSession = {
    provider,
    id: attempt.externalId!,
    liveMode: false,
    reference: order.publicId,
    url: 'https://payments.example/checkout',
    metadata: { attemptId: attempt.publicId },
    status: 'paid',
    payments: [{ id: captureId, amount: order.totalMinor!, currency: 'PHP', status: 'paid' }],
  }
  const result: PaymentRefund = {
    provider,
    liveMode: false,
    id: randomUUID(),
    paymentId: captureId,
    amount: order.totalMinor!,
    currency: 'PHP',
    status: 'succeeded',
  }
  const staff = await UserFactory.merge({ role: 'staff' }).create()
  return { order, variant, attempt, checkout, result, staff }
}
