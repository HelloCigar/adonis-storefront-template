import { createHash, randomUUID } from 'node:crypto'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import type { Infer } from '@vinejs/vine/types'
import { checkoutValidator } from '#validators/checkout/checkout'
import Cart from '#models/checkout/cart'
import Order from '#models/checkout/order'
import Attempt from '#models/payments/attempt'
import { affectedRows } from '#models/shared/affected_rows'
import QuoteService from '#services/checkout/quote_service'
import MoneyService from '#services/checkout/money_service'
import OrderAccessService from '#services/checkout/order_access_service'
import OutboxService from '#services/checkout/outbox_service'
import ActivityService from '#services/checkout/activity_service'
import InventoryService from '#services/catalog/inventory_service'
import PaymentService from '#services/payments/payment_service'
import CheckoutException from '#exceptions/checkout_exception'
import checkout from '#config/checkout'

export type CheckoutPayload = Infer<typeof checkoutValidator>

@inject()
export default class CheckoutService {
  constructor(
    private quotes: QuoteService,
    private money: MoneyService,
    private access: OrderAccessService,
    private outbox: OutboxService,
    private activities: ActivityService,
    private inventory: InventoryService,
    private payments: PaymentService
  ) {}

  async submit(cartToken: string, userId: number | undefined, input: CheckoutPayload) {
    const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex')
    const replay = await this.replay(cartToken, input.submissionKey, fingerprint)
    if (replay) return replay
    const provider = this.payments.getProvider()
    const publicUrl = this.publicUrl()
    try {
      return await db.transaction(async (trx) => {
        const cart = await Cart.query({ client: trx }).where('token', cartToken).firstOrFail()
        if (cart.submissionKey !== input.submissionKey || cart.version !== input.cartVersion) {
          throw new CheckoutException(
            'Your cart changed. Review it before paying.',
            'E_CART_CHANGED'
          )
        }
        const changed = await Cart.query({ client: trx })
          .where('id', cart.id)
          .where('status', 'active')
          .where('version', input.cartVersion)
          .update({ status: 'submitted', version: input.cartVersion + 1 })
        if (affectedRows(changed) !== 1)
          throw new CheckoutException('Your cart changed', 'E_CART_CHANGED')
        // The database cart is frozen; quote the original in-memory version in this transaction.
        const quote = await this.quotes.quote(cart, trx)
        if (quote.fingerprint !== input.quoteFingerprint) {
          throw new CheckoutException(
            'Prices or availability changed. Review the updated quote.',
            'E_QUOTE_CHANGED'
          )
        }
        const publicId = randomUUID()
        const attemptPublicId = randomUUID()
        const now = DateTime.utc()
        const deadline = Date.now() + checkout.reservationTtlMs
        const order = await Order.create(
          {
            publicId,
            number: `MB-${publicId.replaceAll('-', '').slice(0, 16).toUpperCase()}`,
            cartId: cart.id,
            userId: userId ?? null,
            submissionKey: input.submissionKey,
            inputFingerprint: fingerprint,
            source: 'online',
            lifecycleState: 'pending_payment',
            version: 0,
            email: input.email,
            phoneNumber: input.shipping.phoneNumber,
            currencyCode: quote.currency,
            financialStatus: 'pending',
            fulfillmentStatus: 'unfulfilled',
            subtotalMinor: quote.subtotalMinor,
            shippingMinor: quote.shippingMinor,
            totalMinor: quote.totalMinor,
            subtotalAmount: Number(this.money.toMajor(quote.subtotalMinor)),
            shippingAmount: Number(this.money.toMajor(quote.shippingMinor)),
            totalAmount: Number(this.money.toMajor(quote.totalMinor)),
            discountAmount: 0,
            taxAmount: 0,
            processedAt: now,
            note: input.note ?? null,
          },
          { client: trx }
        )
        for (const [type, address] of Object.entries({
          shipping: input.shipping,
          billing: input.billing ?? input.shipping,
        })) {
          await order
            .related('addresses')
            .create({ ...address, address2: address.address2 ?? null, type })
        }
        await order.related('lineItems').createMany(
          quote.lines.map((line) => ({
            productId: line.productId,
            productVariantId: line.variantId,
            title: line.title,
            variantTitle: line.variantTitle,
            sku: line.sku,
            options: line.options,
            quantity: line.quantity,
            unitPriceMinor: line.unitAmount,
            totalMinor: line.totalAmount,
            unitPriceAmount: Number(this.money.toMajor(line.unitAmount)),
            totalAmount: Number(this.money.toMajor(line.totalAmount)),
            discountAmount: 0,
            currencyCode: quote.currency,
          }))
        )
        await this.inventory.reserve(trx, order.id, quote.lines, deadline)
        const idempotencyKey = randomUUID()
        const attempt = await Attempt.create(
          {
            publicId: attemptPublicId,
            orderId: order.id,
            provider: provider.provider,
            liveMode: provider.liveMode,
            amountMinor: quote.totalMinor,
            currency: quote.currency,
            state: 'creating',
            version: 0,
            idempotencyKey,
            expiresAtMs: deadline,
            replayScope: provider.idempotencyScope,
            needsReview: false,
            requestSnapshot: {
              reference: publicId,
              currency: quote.currency,
              idempotencyKey,
              items: [
                ...quote.lines.map((line) => ({
                  name: `${line.title} — ${line.variantTitle}`,
                  unitAmount: line.unitAmount,
                  quantity: line.quantity,
                })),
                { name: 'Shipping', unitAmount: quote.shippingMinor, quantity: 1 },
              ],
              successUrl: `${publicUrl}/checkout/orders/${publicId}`,
              cancelUrl: `${publicUrl}/checkout/orders/${publicId}`,
              customer: {
                email: input.email,
                name: `${input.shipping.firstName} ${input.shipping.lastName}`,
                phone: input.shipping.phoneNumber,
              },
              metadata: { attemptId: attemptPublicId, orderId: publicId },
            },
          },
          { client: trx }
        )
        await this.outbox.record(trx, {
          key: `create:${attempt.id}`,
          kind: 'create_checkout',
          entityId: attempt.id,
        })
        await this.outbox.record(trx, {
          key: `expire:${attempt.id}`,
          kind: 'expire_checkout',
          entityId: attempt.id,
          availableAtMs: deadline,
        })
        await this.activities.record(trx, order.id, 'order.submitted', {
          attemptId: attempt.id,
          amountMinor: quote.totalMinor,
        })
        const token = await this.access.issue(order.id, trx)
        return { order, token }
      })
    } catch (error) {
      const existing = await this.replay(cartToken, input.submissionKey, fingerprint)
      if (existing) return existing
      throw error
    }
  }

  private async replay(cartToken: string, key: string, fingerprint: string) {
    const order = await Order.query()
      .where('submission_key', key)
      .whereHas('cart', (query) => query.where('token', cartToken))
      .first()
    if (!order) return null
    if (order.inputFingerprint !== fingerprint) {
      throw new CheckoutException(
        'This submission was already used with different details',
        'E_CHECKOUT_REPLAY'
      )
    }
    return { order, token: await this.access.issue(order.id) }
  }

  publicUrl() {
    try {
      const url = new URL(checkout.publicUrl ?? '')
      if (
        !['https:', 'http:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash
      )
        throw new Error()
      return url.origin
    } catch {
      throw new CheckoutException('Checkout URL is not configured', 'E_CHECKOUT_CONFIG', 503)
    }
  }
}
