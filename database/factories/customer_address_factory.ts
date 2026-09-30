import factory from '@adonisjs/lucid/factories'
import CustomerAddress from '#models/customer_address'
import { UserFactory } from './user_factory.js'

export const CustomerAddressFactory = factory
  .define(CustomerAddress, ({ faker }) => ({
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    address1: faker.location.streetAddress(),
    city: 'Manila',
    zoneCode: 'Metro Manila',
    countryCode: 'PH',
    postalCode: '1000',
  }))
  .before('create', async (_builder, address, ctx) => {
    if (!address.userId) {
      const user = await UserFactory.useCtx(ctx).create()
      address.userId = user.id
    }
  })
  .build()
