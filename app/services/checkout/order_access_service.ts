import { createHash, randomBytes } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import AccessGrant from '#models/checkout/access_grant'
import Order from '#models/checkout/order'
import CheckoutException from '#exceptions/checkout_exception'
import { affectedRows } from '#models/shared/affected_rows'
import checkout from '#config/checkout'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export default class OrderAccessService {
  async issue(orderId: number, trx?: TransactionClientContract) {
    const token = randomBytes(32).toString('base64url')
    await AccessGrant.create(
      { orderId, tokenHash: this.hash(token), expiresAtMs: Date.now() + 30 * 24 * 60 * 60 * 1000 },
      { client: trx }
    )
    return token
  }

  async canAccess(order: Order, userId?: number, token?: string) {
    if (userId && order.userId === userId) return true
    if (!token || token.length > 128) return false
    return !!(await AccessGrant.query()
      .where('order_id', order.id)
      .where('token_hash', this.hash(token))
      .whereNull('revoked_at')
      .where('expires_at_ms', '>', Date.now())
      .first())
  }

  async authorize(publicId: string, userId?: number, token?: string) {
    const order = await Order.findBy('publicId', publicId)
    if (!order || !(await this.canAccess(order, userId, token))) {
      throw new CheckoutException('Order not found', 'E_ORDER_NOT_FOUND', 404)
    }
    return order
  }

  async claim(order: Order, userId: number, token?: string) {
    if (!(await this.canAccess(order, undefined, token))) {
      throw new CheckoutException('Order not found', 'E_ORDER_NOT_FOUND', 404)
    }
    return db.transaction(async (trx) => {
      const changed = await Order.query({ client: trx })
        .where('id', order.id)
        .where((query) => query.whereNull('user_id').orWhere('user_id', userId))
        .update({ userId })
      if (affectedRows(changed) !== 1) {
        throw new CheckoutException('This order belongs to another account', 'E_ORDER_OWNERSHIP')
      }
      return Order.findOrFail(order.id, { client: trx })
    })
  }

  /** Moves `key` to the newest position and keeps the session map within the configured limit. */
  remember(entries: Record<string, string>, key: string, value: string) {
    const next = Object.entries(entries).filter(([existing]) => existing !== key)
    next.push([key, value])
    return Object.fromEntries(next.slice(-checkout.sessionEntryLimit))
  }

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex')
  }
}
