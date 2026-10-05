import { BaseTransformer } from '@adonisjs/core/transformers'
import type { OrderOperations } from '#services/checkout/order_operations_service'

export default class OrderOperationsTransformer extends BaseTransformer<OrderOperations> {
  toObject() {
    return this.resource
  }
}
