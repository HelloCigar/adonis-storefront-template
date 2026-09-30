import type Cart from '#models/cart'
import type CartLine from '#models/cart_line'
import CartLineTransformer from '#transformers/cart_line_transformer'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class CartTransformer extends BaseTransformer<Cart> {
  toObject() {
    const lines = (this.resource.$preloaded.lines as CartLine[] | undefined) ?? []
    const totalQuantity = lines.reduce((total, line) => total + line.quantity, 0)
    const totalAmount = lines.reduce(
      (total, line) => total + line.unitPriceAmount * line.quantity,
      0
    )

    return {
      ...this.pick(this.resource, [
        'id',
        'email',
        'currencyCode',
        'status',
        'expiresAt',
        'completedAt',
        'createdAt',
        'updatedAt',
      ]),
      totalQuantity: lines.length ? totalQuantity : undefined,
      cost: lines.length
        ? {
            subtotalAmount: {
              amount: totalAmount,
              currencyCode: this.resource.currencyCode,
            },
            totalAmount: {
              amount: totalAmount,
              currencyCode: this.resource.currencyCode,
            },
          }
        : undefined,
      lines: this.resource.$preloaded.lines
        ? CartLineTransformer.transform(lines).depth(4)
        : undefined,
    }
  }
}
