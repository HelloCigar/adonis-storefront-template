import { ProductVariantSchema } from '#database/schema'
import CartLine from '#models/checkout/cart_line'
import OrderLineItem from '#models/checkout/order_line_item'
import Product from '#models/catalog/product'
import StockAdjustment from '#models/catalog/stock_adjustment'
import {
  hasInvalidOptionData,
  optionCombinationKey,
  safeOptionRecord,
} from '#services/catalog/options_service'
import { AttachmentLinkModel } from '@jrmc/adonis-attachment/lucid'
import { beforeSave, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

/** Tracked variants with this many sellable units or fewer are flagged as running low. */
export const lowStockThreshold = 5

export type StockLevel = 'untracked' | 'out' | 'low' | 'in_stock'

export default class ProductVariant extends ProductVariantSchema {
  @beforeSave()
  static setCombinationKey(variant: ProductVariant) {
    if (!variant.$isPersisted || Object.hasOwn(variant.$dirty, 'options'))
      variant.optionCombinationKey = optionCombinationKey(variant.options)
  }

  get quantityAvailable() {
    return this.inventoryQuantity === null
      ? null
      : this.inventoryQuantity - (this.inventoryReservedQuantity ?? 0)
  }

  /** Units held by pending orders count as unavailable, matching the dashboard's out of stock. */
  get stockLevel(): StockLevel {
    const available = this.quantityAvailable
    if (available === null) return 'untracked'
    if (available <= 0) return 'out'
    return available <= lowStockThreshold ? 'low' : 'in_stock'
  }

  get isSellable() {
    return (
      !this.hasInvalidOptions &&
      this.availableForSale &&
      (this.quantityAvailable === null || this.quantityAvailable > 0)
    )
  }

  get safeOptions() {
    return safeOptionRecord(this.options)
  }

  get hasInvalidOptions() {
    return hasInvalidOptionData(this.options)
  }
  @column({
    prepare: (value) => (value === null ? null : JSON.stringify(value)),
    consume: (value) => {
      if (typeof value !== 'string') return value
      try {
        return JSON.parse(value)
      } catch {
        // Preserve the raw value so issue detection cannot mistake it for a default tuple.
        return value
      }
    },
  })
  declare options: Record<string, string> | null

  @belongsTo(() => Product, { foreignKey: 'productId' })
  declare product: BelongsTo<typeof Product>

  @belongsTo(() => AttachmentLinkModel, { foreignKey: 'featuredMediaId' })
  declare featuredMedia: BelongsTo<typeof AttachmentLinkModel>

  @hasMany(() => CartLine, { foreignKey: 'productVariantId' })
  declare cartLines: HasMany<typeof CartLine>

  @hasMany(() => OrderLineItem, { foreignKey: 'productVariantId' })
  declare orderLineItems: HasMany<typeof OrderLineItem>

  @hasMany(() => StockAdjustment, { foreignKey: 'productVariantId' })
  declare stockAdjustments: HasMany<typeof StockAdjustment>
}
