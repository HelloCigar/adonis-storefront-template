import factory from '@adonisjs/lucid/factories'
import Cart from '#models/checkout/cart'
import { DateTime } from 'luxon'
import { CartLineFactory } from './cart_line_factory.js'

export const CartFactory = factory
  .define(Cart, ({ faker }) => ({
    token: faker.string.uuid(),
    currencyCode: 'PHP',
    status: 'active',
    expiresAt: DateTime.utc().plus({ days: 10 }),
  }))
  .state('completed', (cart) => {
    cart.status = 'completed'
    cart.completedAt = DateTime.utc()
    cart.expiresAt = null
  })
  .relation('lines', () => CartLineFactory)
  .build()
