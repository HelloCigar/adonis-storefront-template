import vine from '@vinejs/vine'
import { manualStockReasons } from '#models/catalog/stock_adjustment'

/** Matches the variant form's stock limit. */
export const stockQuantityLimit = 100000000
export const stockAdjustmentModes = ['add', 'remove', 'set'] as const

export const stockAdjustmentValidator = vine.create({
  mode: vine.enum(stockAdjustmentModes),
  quantity: vine.number().withoutDecimals().min(0).max(stockQuantityLimit),
  reason: vine.enum(manualStockReasons),
  note: vine.string().trim().maxLength(500).nullable().optional(),
})
