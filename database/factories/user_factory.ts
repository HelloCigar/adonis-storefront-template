import factory from '@adonisjs/lucid/factories'
import User from '#models/user'
import { CustomerAddressFactory } from './customer_address_factory.js'
import { CartFactory } from './cart_factory.js'
import { OrderFactory } from './order_factory.js'

export const UserFactory = factory
  .define(User, ({ faker }) => {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    return {
      firstName,
      lastName,
      fullName: firstName + ' ' + lastName,
      email: faker.string.uuid() + '@example.com',
      password: 'demo-password',
      acceptsMarketing: false,
    }
  })
  .relation('addresses', () => CustomerAddressFactory)
  .relation('carts', () => CartFactory)
  .relation('orders', () => OrderFactory)
  .build()
