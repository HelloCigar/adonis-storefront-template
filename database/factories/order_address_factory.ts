import factory from '@adonisjs/lucid/factories'
import OrderAddress from '#models/checkout/order_address'
import { OrderFactory } from './order_factory.js'

export const OrderAddressFactory = factory
  .define(OrderAddress, ({ faker }) => ({
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    address1: faker.location.streetAddress(),
    city: 'Manila',
    countryCode: 'PH',
    postalCode: '1000',
    zoneCode: 'Metro Manila',
  }))
  .state('billing', (address) => {
    address.type = 'billing'
  })
  .before('create', async (_builder, address, ctx) => {
    if (!address.orderId) {
      const order = await OrderFactory.useCtx(ctx).create()
      address.orderId = order.id
    }
    if (!address.type) {
      const shipping = await OrderAddress.query({ client: ctx.$trx })
        .where('order_id', address.orderId)
        .where('type', 'shipping')
        .first()
      address.type = shipping ? 'billing' : 'shipping'
    }
  })
  .build()
