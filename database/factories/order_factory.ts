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
    subtotalMinor: 0,
    discountMinor: 0,
    shippingMinor: 0,
    taxMinor: 0,
    totalMinor: 0,
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
    order.subtotalMinor = lines.reduce(
      (total, line) => total + line.unitPriceMinor * line.quantity,
      0
    )
    order.discountMinor = lines.reduce((total, line) => total + line.discountMinor, 0)
    order.totalMinor =
      order.subtotalMinor - order.discountMinor + order.shippingMinor + order.taxMinor
    await order.save()
  })
  .build()
