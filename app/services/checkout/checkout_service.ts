import { createHash, randomUUID } from 'node:crypto'
import { inject } from '@adonisjs/core'
import { urlFor } from '@adonisjs/core/services/url_builder'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import type { Infer } from '@vinejs/vine/types'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { checkoutValidator } from '#validators/checkout/checkout'
import Cart from '#models/checkout/cart'
import Order from '#models/checkout/order'
import Attempt from '#models/payments/attempt'
import { affectedRows } from '#models/shared/affected_rows'
import QuoteService from '#services/checkout/quote_service'
import OrderAccessService from '#services/checkout/order_access_service'
import OutboxService from '#services/checkout/outbox_service'
import ActivityService from '#services/checkout/activity_service'
import DiscountService from '#services/checkout/discount_service'
import InventoryService from '#services/catalog/inventory_service'
import PaymentService from '#services/payments/payment_service'
import CheckoutException from '#exceptions/checkout_exception'
import checkout from '#config/checkout'

export type CheckoutPayload = Infer<typeof checkoutValidator>
type Quote = Awaited<ReturnType<QuoteService['quote']>>

@inject()
export default class CheckoutService {
  constructor(
    private quotes: QuoteService,
    private access: OrderAccessService,
    private outbox: OutboxService,
    private activities: ActivityService,
    private inventory: InventoryService,
    private discounts: DiscountService,
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
        const cart = await this.freezeCart(trx, cartToken, input)
        // The database cart is frozen; quote the original in-memory version in this transaction.
        const quote = await this.quotes.quote(cart, trx)
        if (quote.fingerprint !== input.quoteFingerprint) {
          throw new CheckoutException(
            'Prices or availability changed. Review the updated quote.',
            'E_QUOTE_CHANGED'
          )
        }
        const deadline = Date.now() + checkout.reservationTtlMs
        const order = await this.createOrder(trx, { cart, userId, input, quote, fingerprint })
        await this.inventory.reserve(trx, order.id, quote.lines, deadline)
        if (quote.discount) await this.discounts.redeem(trx, order, quote.discount, input.email)
        const attempt = await this.createAttempt(trx, {
          order,
          input,
          quote,
          provider,
          deadline,
          orderUrl: urlFor(
            'checkout.orders.show',
            { publicId: order.publicId! },
            { prefixUrl: publicUrl }
          ),
        })
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

  /** Claims the active cart at the version the shopper reviewed; any concurrent change wins. */
  private async freezeCart(
    trx: TransactionClientContract,
    cartToken: string,
    input: CheckoutPayload
  ) {
    const cart = await Cart.query({ client: trx }).where('token', cartToken).firstOrFail()
    if (cart.submissionKey !== input.submissionKey || cart.version !== input.cartVersion) {
      throw new CheckoutException('Your cart changed. Review it before paying.', 'E_CART_CHANGED')
    }
    const changed = await Cart.query({ client: trx })
      .where('id', cart.id)
      .where('status', 'active')
      .where('version', input.cartVersion)
      .update({ status: 'submitted', version: input.cartVersion + 1 })
    if (affectedRows(changed) !== 1)
      throw new CheckoutException('Your cart changed', 'E_CART_CHANGED')
    return cart
  }

  /** Snapshots the quote, addresses and line items; later catalogue edits never change them. */
  private async createOrder(
    trx: TransactionClientContract,
    {
      cart,
      userId,
      input,
      quote,
      fingerprint,
    }: { cart: Cart; userId?: number; input: CheckoutPayload; quote: Quote; fingerprint: string }
  ) {
    const publicId = randomUUID()
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
        discountMinor: quote.discountMinor,
        discountCode: quote.discount?.code ?? null,
        taxMinor: 0,
        processedAt: DateTime.utc(),
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
        discountMinor: line.discountAmount,
        currencyCode: quote.currency,
      }))
    )
    return order
  }

  /** Freezes the exact provider request so retries replay it with the same idempotency key. */
  private async createAttempt(
    trx: TransactionClientContract,
    {
      order,
      input,
      quote,
      provider,
      deadline,
      orderUrl,
    }: {
      order: Order
      input: CheckoutPayload
      quote: Quote
      provider: ReturnType<PaymentService['getProvider']>
      deadline: number
      orderUrl: string
    }
  ) {
    const publicId = randomUUID()
    const idempotencyKey = randomUUID()
    return Attempt.create(
      {
        publicId,
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
          reference: order.publicId!,
          currency: quote.currency,
          idempotencyKey,
          items: [
            ...this.providerLines(quote),
            { name: 'Shipping', unitAmount: quote.shippingMinor, quantity: 1 },
          ],
          successUrl: orderUrl,
          cancelUrl: orderUrl,
          customer: {
            email: input.email,
            name: `${input.shipping.firstName} ${input.shipping.lastName}`,
            phone: input.shipping.phoneNumber,
          },
          metadata: { attemptId: publicId, orderId: order.publicId! },
        },
      },
      { client: trx }
    )
  }

  /**
   * Provider line items must sum to the frozen total and carry positive amounts. A discounted
   * line keeps its quantity when the discount divides evenly per unit; otherwise it is sent as
   * one line at its discounted total. A fully discounted line is left out.
   */
  private providerLines(quote: Quote) {
    return quote.lines.flatMap((line) => {
      const name = `${line.title} — ${line.variantTitle}`
      const net = line.totalAmount - line.discountAmount
      if (net <= 0) return []
      if (net % line.quantity === 0)
        return [{ name, unitAmount: net / line.quantity, quantity: line.quantity }]
      return [{ name: `${name} × ${line.quantity}`, unitAmount: net, quantity: 1 }]
    })
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
