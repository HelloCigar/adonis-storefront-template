import factory from '@adonisjs/lucid/factories'
import Order from '#models/checkout/order'
import { DateTime } from 'luxon'
import { OrderAddressFactory } from './order_address_factory.js'
import { OrderLineItemFactory } from './order_line_item_factory.js'

export const OrderFactory = factory
  .define(Order, ({ faker }) => ({
    number: 'ORDER-' + faker.string.uuid(),
    email: faker.string.uuid() + '@example.com',
    currencyCode: 'PHP',
    financialStatus: 'pending',
    fulfillmentStatus: 'unfulfilled',
    subtotalAmount: 0,
    discountAmount: 0,
    shippingAmount: 0,
    taxAmount: 0,
    totalAmount: 0,
    processedAt: DateTime.utc(),
  }))
  .state('paid', (order) => {
    order.financialStatus = 'paid'
  })
  .state('fulfilled', (order) => {
    order.fulfillmentStatus = 'fulfilled'
  })
  .state('cancelled', (order) => {
    order.cancelledAt = DateTime.utc()
  })
  .relation('addresses', () => OrderAddressFactory)
  .relation('lineItems', () => OrderLineItemFactory)
  .after('create', async (_builder, order) => {
    const lines = await order.related('lineItems').query()
    if (!lines.length) return
    const subtotal = lines.reduce(
      (total, line) => total + Math.round(line.unitPriceAmount * 100) * line.quantity,
      0
    )
    const discount = lines.reduce((total, line) => total + Math.round(line.discountAmount * 100), 0)
    order.subtotalAmount = subtotal / 100
    order.discountAmount = discount / 100
    order.totalAmount =
      (subtotal -
        discount +
        Math.round(order.shippingAmount * 100) +
        Math.round(order.taxAmount * 100)) /
      100
    await order.save()
  })
  .build()
