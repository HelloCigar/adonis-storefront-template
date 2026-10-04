import { DateTime } from 'luxon'
import ProductVariant from '#models/catalog/product_variant'
import StockReservation from '#models/checkout/stock_reservation'
import CheckoutException from '#exceptions/checkout_exception'
import { affectedRows } from '#models/shared/affected_rows'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

/** All methods participate in the caller's short business transaction. */
export default class InventoryService {
  async reserve(
    trx: TransactionClientContract,
    orderId: number,
    items: { variantId: number; quantity: number }[],
    expiresAtMs: number
  ) {
    const combined = new Map<number, number>()
    for (const item of items) {
      if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) this.unavailable()
      const quantity = (combined.get(item.variantId) ?? 0) + item.quantity
      if (!Number.isSafeInteger(quantity)) this.unavailable()
      combined.set(item.variantId, quantity)
    }
    for (const [variantId, quantity] of combined) {
      const variant = await ProductVariant.findOrFail(variantId, { client: trx })
      if (!variant.availableForSale) this.unavailable()
      if (variant.inventoryQuantity === null) continue
      const changed = await trx
        .from('product_variants')
        .where('id', variantId)
        .whereRaw('inventory_quantity - inventory_reserved_quantity >= ?', [quantity])
        .increment('inventory_reserved_quantity', quantity)
      if (affectedRows(changed) !== 1) this.unavailable()
      await StockReservation.create(
        { orderId, productVariantId: variantId, quantity, expiresAtMs, state: 'reserved' },
        { client: trx }
      )
    }
  }

  async consume(trx: TransactionClientContract, orderId: number) {
    for (const row of await StockReservation.query({ client: trx }).where('orderId', orderId)) {
      if (row.state === 'consumed') continue
      if (row.state !== 'reserved' || row.productVariantId === null) this.unavailable()
      const claimed = await StockReservation.query({ client: trx })
        .where('id', row.id)
        .where('state', 'reserved')
        .update({ state: 'consumed', settledAt: DateTime.utc().toSQL({ includeOffset: false }) })
      if (affectedRows(claimed) !== 1) this.unavailable()
      const changed = await trx
        .from('product_variants')
        .where('id', row.productVariantId)
        .where('inventory_reserved_quantity', '>=', row.quantity)
        .where('inventory_quantity', '>=', row.quantity)
        .update({
          inventory_quantity: trx.raw('inventory_quantity - ?', [row.quantity]),
          inventory_reserved_quantity: trx.raw('inventory_reserved_quantity - ?', [row.quantity]),
        })
      if (affectedRows(changed) !== 1) this.unavailable()
    }
  }

  async release(trx: TransactionClientContract, orderId: number) {
    for (const row of await StockReservation.query({ client: trx })
      .where('orderId', orderId)
      .where('state', 'reserved')) {
      const claimed = await StockReservation.query({ client: trx })
        .where('id', row.id)
        .where('state', 'reserved')
        .update({ state: 'released', settledAt: DateTime.utc().toSQL({ includeOffset: false }) })
      if (affectedRows(claimed) !== 1) continue
      const changed = await trx
        .from('product_variants')
        .where('id', row.productVariantId!)
        .where('inventory_reserved_quantity', '>=', row.quantity)
        .decrement('inventory_reserved_quantity', row.quantity)
      if (affectedRows(changed) !== 1) this.unavailable()
    }
  }

  async restock(trx: TransactionClientContract, orderId: number) {
    for (const row of await StockReservation.query({ client: trx })
      .where('orderId', orderId)
      .where('state', 'consumed')
      .whereNull('restockedAt')) {
      const claimed = await StockReservation.query({ client: trx })
        .where('id', row.id)
        .whereNull('restockedAt')
        .update({ restockedAt: DateTime.utc().toSQL({ includeOffset: false }) })
      if (affectedRows(claimed) === 1 && row.productVariantId !== null)
        await trx
          .from('product_variants')
          .where('id', row.productVariantId)
          .increment('inventory_quantity', row.quantity)
    }
  }

  private unavailable(): never {
    throw new CheckoutException('The requested stock is no longer available.', 'E_CHECKOUT_STOCK')
  }
}
