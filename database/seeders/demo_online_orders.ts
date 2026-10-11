import { createHash, randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Activity from '#models/checkout/activity'
import Attempt from '#models/payments/attempt'
import Order from '#models/checkout/order'
import Payment from '#models/payments/payment'
import ProductVariant from '#models/catalog/product_variant'
import Shipment from '#models/checkout/shipment'
import StockReservation from '#models/checkout/stock_reservation'
import User from '#models/account/user'
import { sqlDateTime } from '#models/shared/sql_datetime'
import { OrderFactory } from '../factories/order_factory.js'
import { UserFactory } from '../factories/user_factory.js'
import { CustomerAddressFactory } from '../factories/customer_address_factory.js'

/** Where a demo online order sits in the staff fulfillment queue. */
type Stage =
  'to_pack' | 'to_ship' | 'in_transit' | 'delivered' | 'payment_review' | 'awaiting_payment'

interface DemoCustomer {
  email: string
  firstName: string
  lastName: string
  address1: string
  city: string
  zoneCode: string
  postalCode: string
}

/** Extra demo customers; the original demo customer (demo@example.com) is passed in. */
const extraCustomers: DemoCustomer[] = [
  {
    email: 'andrea.delacruz@example.com',
    firstName: 'Andrea',
    lastName: 'Dela Cruz',
    address1: '24 Maginhawa Street, Teachers Village',
    city: 'Quezon City',
    zoneCode: 'Metro Manila',
    postalCode: '1101',
  },
  {
    email: 'rafael.bautista@example.com',
    firstName: 'Rafael',
    lastName: 'Bautista',
    address1: '88 Osmena Boulevard',
    city: 'Cebu City',
    zoneCode: 'Central Visayas',
    postalCode: '6000',
  },
  {
    email: 'katrina.villanueva@example.com',
    firstName: 'Katrina',
    lastName: 'Villanueva',
    address1: '5 Roxas Avenue',
    city: 'Davao City',
    zoneCode: 'Davao Region',
    postalCode: '8000',
  },
]

/** `ago` is how long before now each milestone happened, so queue waiting times differ. */
interface DemoOrder {
  number: string
  stage: Stage
  customer: string
  paid?: { hours: number }
  packing?: { hours: number }
  shipped?: { hours: number }
  delivered?: { hours: number }
  /** Order placed this long ago. */
  placed: { hours: number }
  /** [variant offset, quantity] pairs. */
  lines: [number, number][]
}

const demoOrders: DemoOrder[] = [
  {
    number: 'DEMO-1003',
    stage: 'to_pack',
    customer: 'andrea.delacruz@example.com',
    placed: { hours: 53 },
    paid: { hours: 52 },
    lines: [
      [0, 1],
      [5, 2],
    ],
  },
  {
    number: 'DEMO-1004',
    stage: 'to_pack',
    customer: 'rafael.bautista@example.com',
    placed: { hours: 3.2 },
    paid: { hours: 3 },
    lines: [[2, 1]],
  },
  {
    number: 'DEMO-1005',
    stage: 'to_ship',
    customer: 'katrina.villanueva@example.com',
    placed: { hours: 30 },
    paid: { hours: 29 },
    packing: { hours: 5 },
    lines: [
      [7, 1],
      [9, 1],
    ],
  },
  {
    number: 'DEMO-1006',
    stage: 'in_transit',
    customer: 'demo@example.com',
    placed: { hours: 76 },
    paid: { hours: 75 },
    packing: { hours: 52 },
    shipped: { hours: 49 },
    lines: [[4, 2]],
  },
  {
    number: 'DEMO-1007',
    stage: 'delivered',
    customer: 'rafael.bautista@example.com',
    placed: { hours: 130 },
    paid: { hours: 129 },
    packing: { hours: 120 },
    shipped: { hours: 110 },
    delivered: { hours: 26 },
    lines: [
      [1, 1],
      [8, 1],
    ],
  },
  {
    number: 'DEMO-1008',
    stage: 'payment_review',
    customer: 'andrea.delacruz@example.com',
    placed: { hours: 8 },
    lines: [[3, 1]],
  },
  {
    number: 'DEMO-1009',
    stage: 'awaiting_payment',
    customer: 'katrina.villanueva@example.com',
    placed: { hours: 0.1 },
    lines: [[6, 1]],
  },
]

/** Distant enough that the dev payment sweep never expires a demo checkout. */
const holdExpiresAtMs = () => Date.now() + 5 * 365 * 24 * 60 * 60 * 1000

const ago = (when: { hours: number }) => DateTime.utc().minus({ minutes: when.hours * 60 })

/**
 * Inserts one demo online order per fulfillment queue stage, shaped like real checkouts: a paid
 * order has an accepted payment, a paid attempt, consumed stock, and one shipment; an unpaid or
 * uncertain one has an open attempt and a held reservation instead. Existing numbers are skipped
 * and nothing is updated or removed.
 */
export async function seedDemoOnlineOrders(
  trx: TransactionClientContract,
  demo: { customer: User; variants: ProductVariant[] }
) {
  if (!demo.variants.length) return
  const pending = []
  for (const order of demoOrders)
    if (!(await Order.query({ client: trx }).where('number', order.number).first()))
      pending.push(order)
  if (!pending.length) return

  const customers = new Map<string, { user: User; address: DemoCustomer }>()
  const home = demo.customer
  customers.set(home.email, {
    user: home,
    address: {
      email: home.email,
      firstName: home.firstName ?? '',
      lastName: home.lastName ?? '',
      address1: '10 Demo Street',
      city: 'Manila',
      zoneCode: 'Metro Manila',
      postalCode: '1000',
    },
  })
  for (const profile of extraCustomers) {
    let user = await User.query({ client: trx }).where('email', profile.email).first()
    if (!user) {
      user = await UserFactory.client(trx)
        .merge({
          email: profile.email,
          password: 'demo-password',
          firstName: profile.firstName,
          lastName: profile.lastName,
          fullName: profile.firstName + ' ' + profile.lastName,
        })
        .create()
      user.useTransaction(trx)
    }
    let address = await user
      .related('addresses')
      .query()
      .where('address1', profile.address1)
      .first()
    if (!address)
      address = await CustomerAddressFactory.client(trx)
        .merge({
          userId: user.id,
          firstName: profile.firstName,
          lastName: profile.lastName,
          address1: profile.address1,
          city: profile.city,
          zoneCode: profile.zoneCode,
          postalCode: profile.postalCode,
          countryCode: 'PH',
        })
        .create()
    if (!user.defaultAddressId) {
      user.defaultAddressId = address.id
      await user.save()
    }
    customers.set(profile.email, { user, address: profile })
  }

  const staff = await User.query({ client: trx }).whereIn('role', ['staff', 'admin']).first()

  for (const demoOrder of pending) {
    const { user, address } = customers.get(demoOrder.customer)!
    const publicId = randomUUID()
    const placedAt = ago(demoOrder.placed)
    const paidAt = demoOrder.paid ? ago(demoOrder.paid) : null
    const lines = demoOrder.lines.map(([offset, quantity]) => ({
      variant: demo.variants[offset % demo.variants.length],
      quantity,
    }))
    const review = demoOrder.stage === 'payment_review'
    const unpaid = review || demoOrder.stage === 'awaiting_payment'

    const order = await OrderFactory.client(trx)
      .merge({
        number: demoOrder.number,
        publicId,
        source: 'online',
        lifecycleState: review ? 'review_required' : unpaid ? 'pending_payment' : 'confirmed',
        reviewReason: review ? 'Payment requires reconciliation; fulfillment is blocked.' : null,
        financialStatus: unpaid ? 'pending' : 'paid',
        fulfillmentStatus: demoOrder.shipped || demoOrder.delivered ? 'fulfilled' : 'unfulfilled',
        userId: user.id,
        email: user.email,
        phoneNumber: '+639171234567',
        shippingMinor: 10_000,
        processedAt: placedAt,
        createdAt: placedAt,
        paidAt,
        version: 0,
      })
      .with('addresses', 2, (addresses) =>
        addresses.merge(
          ['shipping', 'billing'].map((type) => ({
            type,
            firstName: address.firstName,
            lastName: address.lastName,
            address1: address.address1,
            city: address.city,
            zoneCode: address.zoneCode,
            postalCode: address.postalCode,
            countryCode: 'PH',
            phoneNumber: '+639171234567',
          }))
        )
      )
      .with('lineItems', lines.length, (items) =>
        items.merge(
          lines.map(({ variant, quantity }) => ({
            productVariantId: variant.id,
            quantity,
          }))
        )
      )
      .create()

    // Stock: a settled checkout consumed its hold; an unpaid or uncertain one still holds it.
    // Consumed holds leave inventory as seeded, so the seeder never lowers existing stock.
    const expiresAtMs = holdExpiresAtMs()
    for (const { variant, quantity } of lines) {
      await StockReservation.create(
        {
          orderId: order.id,
          productVariantId: variant.id,
          quantity,
          expiresAtMs,
          state: unpaid ? 'reserved' : 'consumed',
          settledAt: unpaid ? null : paidAt,
        },
        { client: trx }
      )
      if (unpaid)
        await ProductVariant.query({ client: trx })
          .where('id', variant.id)
          .increment('inventoryReservedQuantity', quantity)
    }

    // The checkout the customer was sent to, as the checkout service freezes it.
    const attemptId = randomUUID()
    const idempotencyKey = randomUUID()
    const providerId = randomUUID()
    const origin = new URL(process.env.APP_URL || 'http://localhost:3333').origin
    const orderUrl = origin + '/orders/' + publicId
    const request = {
      reference: publicId,
      currency: 'PHP',
      idempotencyKey,
      items: [
        ...lines.map(({ variant, quantity }) => ({
          name: variant.title,
          unitAmount: Math.round(variant.priceAmount * 100),
          quantity,
        })),
        { name: 'Shipping', unitAmount: order.shippingMinor, quantity: 1 },
      ],
      successUrl: orderUrl,
      cancelUrl: orderUrl,
      customer: { email: user.email, name: user.fullName ?? undefined },
      metadata: { attemptId, orderId: publicId },
    }
    const attempt = await Attempt.create(
      {
        publicId: attemptId,
        orderId: order.id,
        provider: 'fake_paymongo',
        liveMode: false,
        amountMinor: order.totalMinor,
        currency: 'PHP',
        state: review ? 'unknown' : unpaid ? 'pending' : 'paid',
        version: 0,
        idempotencyKey,
        expiresAtMs: unpaid ? expiresAtMs : (paidAt ?? placedAt).toMillis() + 15 * 60_000,
        replayScope: 'local-fake-paymongo-v1',
        needsReview: review,
        lastError: review ? 'E_PAYMENT_REVIEW' : null,
        externalId: providerId,
        checkoutUrl: unpaid ? origin + '/payments/simulations/' + providerId : null,
        requestSnapshot: request as never,
      },
      { client: trx }
    )

    // Unpaid checkouts stay payable in the local simulator, so recovery finds their resource.
    if (unpaid)
      await trx.table('dev_payment_resources').insert({
        id: providerId,
        kind: 'checkout',
        idempotency_key: idempotencyKey,
        input_hash: createHash('sha256').update(JSON.stringify(request)).digest('hex'),
        payload: JSON.stringify({
          input: request,
          session: {
            provider: 'fake_paymongo',
            id: providerId,
            url: attempt.checkoutUrl,
            reference: publicId,
            status: 'pending',
            liveMode: false,
            metadata: request.metadata,
            payments: [],
          },
        }),
      })

    const activity = (event: string, at: DateTime, details = {}, actorId?: number) =>
      Activity.create(
        {
          orderId: order.id,
          event,
          details,
          actorId: actorId ?? null,
          source: actorId ? 'staff' : 'system',
          createdAt: at,
        },
        { client: trx }
      )
    if (review) {
      // The queue shows how long a review has waited, which is the order's last update.
      const flagged = ago({ hours: 7 })
      await trx
        .from('orders')
        .where('id', order.id)
        .update({ updated_at: sqlDateTime(flagged) })
      await activity('payment.operation_requires_review', flagged)
    }
    if (unpaid || !paidAt) continue

    const payment = await Payment.create(
      {
        provider: 'fake_paymongo',
        liveMode: false,
        externalId: 'pay_demo_' + demoOrder.number.toLowerCase().replace('demo-', ''),
        orderId: order.id,
        attemptId: attempt.id,
        amountMinor: order.totalMinor,
        currency: 'PHP',
        disposition: 'accepted',
        capturedAt: paidAt,
      },
      { client: trx }
    )
    await activity('payment.accepted', paidAt, {
      paymentId: payment.id,
      amountMinor: payment.amountMinor,
    })

    // Exactly the shipment row the settlement creates, then the staff steps taken so far.
    const shipment = await Shipment.create(
      { orderId: order.id, state: 'pending', createdAt: paidAt },
      { client: trx }
    )
    if (demoOrder.packing) {
      shipment.merge({
        state: 'packing',
        actorId: staff?.id ?? null,
        packingAt: ago(demoOrder.packing),
      })
      await activity('shipment.packing', shipment.packingAt!, {}, staff?.id)
    }
    if (demoOrder.shipped) {
      shipment.merge({
        state: 'shipped',
        carrier: 'LBC Express',
        trackingNumber: 'LBC' + (1_000_000_000 + order.id * 7919),
        trackingUrl: null,
        shippedAt: ago(demoOrder.shipped),
      })
      await activity(
        'shipment.shipped',
        shipment.shippedAt!,
        { shipmentId: shipment.id },
        staff?.id
      )
    }
    if (demoOrder.delivered) {
      shipment.merge({ state: 'delivered', deliveredAt: ago(demoOrder.delivered) })
      await activity(
        'shipment.delivered',
        shipment.deliveredAt!,
        { shipmentId: shipment.id },
        staff?.id
      )
    }
    await shipment.save()
  }
}
