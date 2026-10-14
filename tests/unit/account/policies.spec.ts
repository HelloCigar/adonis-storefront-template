import { test } from '@japa/runner'
import { Bouncer } from '@adonisjs/bouncer'
import type User from '#models/account/user'
import CustomerAddress from '#models/account/customer_address'
import Order from '#models/checkout/order'
import UserPolicy from '#policies/account/user_policy'
import AddressPolicy from '#policies/account/address_policy'
import OrderPolicy from '#policies/account/order_policy'
import { actor } from '#tests/helpers/policies'

test.group('Account ownership policies', () => {
  test('self-service requires ownership for customers, staff, and admins', async ({ assert }) => {
    const address = new CustomerAddress()
    address.userId = '1'
    const order = new Order()
    order.userId = '1'

    for (const role of ['customer', 'staff', 'admin'] as const) {
      const account = actor(role, '1')
      for (const user of [
        null,
        account,
        actor('customer', '2'),
        actor('staff', '3'),
        actor('admin', '4'),
      ]) {
        const bouncer = new Bouncer<User>(user)
        const allowed = user?.id === account.id
        const checks = {
          viewAccount: await bouncer.with(UserPolicy).allows('view', account),
          updateAccount: await bouncer.with(UserPolicy).allows('update', account),
          createAddress: await bouncer.with(AddressPolicy).allows('create', account),
          updateAddress: await bouncer.with(AddressPolicy).allows('update', address),
          deleteAddress: await bouncer.with(AddressPolicy).allows('delete', address),
          setDefaultAddress: await bouncer.with(AddressPolicy).allows('setDefault', address),
          listOrders: await bouncer.with(OrderPolicy).allows('viewAny', account),
          viewOrder: await bouncer.with(OrderPolicy).allows('view', order),
        }
        for (const [action, result] of Object.entries(checks)) {
          assert.equal(result, allowed, `${user?.role || 'guest'}: ${action} for ${role}`)
        }
      }
    }
  })
})
