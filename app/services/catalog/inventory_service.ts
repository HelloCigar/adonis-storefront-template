import { sqlDateTime } from '#models/shared/sql_datetime'
import ProductVariant from '#models/catalog/product_variant'
import StockReservation from '#models/checkout/stock_reservation'
import OrderLineItem from '#models/checkout/order_line_item'
import StockAdjustment, { type StockAdjustmentReason } from '#models/catalog/stock_adjustment'
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
      const changed = await ProductVariant.query({ client: trx })
        .where('id', variant.id)
        .whereRaw('inventory_quantity - inventory_reserved_quantity >= ?', [quantity])
        .increment('inventoryReservedQuantity', quantity)
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
        .update({ state: 'consumed', settledAt: sqlDateTime() })
      if (affectedRows(claimed) !== 1) this.unavailable()
      const changed = await row
        .related('variant')
        .query()
        .where('inventory_reserved_quantity', '>=', row.quantity)
        .where('inventory_quantity', '>=', row.quantity)
        .update({
          inventoryQuantity: trx.raw('inventory_quantity - ?', [row.quantity]),
          inventoryReservedQuantity: trx.raw('inventory_reserved_quantity - ?', [row.quantity]),
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
        .update({ state: 'released', settledAt: sqlDateTime() })
      if (affectedRows(claimed) !== 1) continue
      if (row.productVariantId === null) this.unavailable()
      const changed = await row
        .related('variant')
        .query()
        .where('inventory_reserved_quantity', '>=', row.quantity)
        .decrement('inventoryReservedQuantity', row.quantity)
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
        .update({ restockedAt: sqlDateTime() })
      if (affectedRows(claimed) === 1 && row.productVariantId !== null)
        await row.related('variant').query().increment('inventoryQuantity', row.quantity)
    }
  }

  /**
   * Sets tracked on-hand stock from a staff adjustment and logs it. Returns null, without
   * writing, when stock moved since `variant` was read or would fall below held reservations.
   */
  async adjust(
    trx: TransactionClientContract,
    variant: ProductVariant,
    quantityAfter: number,
    entry: { reason: StockAdjustmentReason; note: string | null; actorId: number | null }
  ) {
    if (variant.inventoryQuantity === null || !Number.isSafeInteger(quantityAfter)) return null
    const changed = await ProductVariant.query({ client: trx })
      .where('id', variant.id)
      .where('inventory_quantity', variant.inventoryQuantity)
      .where('inventory_reserved_quantity', '<=', quantityAfter)
      .update({ inventoryQuantity: quantityAfter })
    if (affectedRows(changed) !== 1) return null
    return this.record(trx, variant.id, variant.inventoryQuantity, quantityAfter, entry)
  }

  /** Logs a staff stock change that the caller already wrote. Unchanged stock is not logged. */
  async record(
    trx: TransactionClientContract,
    variantId: number,
    quantityBefore: number | null,
    quantityAfter: number | null,
    entry: { reason: StockAdjustmentReason; note?: string | null; actorId: number | null }
  ) {
    if (quantityBefore === quantityAfter) return null
    return StockAdjustment.create(
      {
        productVariantId: variantId,
        actorId: entry.actorId,
        reason: entry.reason,
        quantityBefore,
        quantityAfter,
        note: entry.note ?? null,
      },
      { client: trx }
    )
  }

  /** Whether an unpaid online checkout still references this variant or product. */
  async hasPendingCheckout(
    trx: TransactionClientContract,
    target: { variantId: number } | { productId: number }
  ) {
    const query = OrderLineItem.query({ client: trx }).whereHas('order', (order) =>
      order.where('source', 'online').where('lifecycle_state', 'pending_payment')
    )
    if ('variantId' in target) query.where('product_variant_id', target.variantId)
    else query.where('product_id', target.productId)
    return !!(await query.first())
  }

  private unavailable(): never {
    throw new CheckoutException('The requested stock is no longer available.', 'E_CHECKOUT_STOCK')
  }
}
