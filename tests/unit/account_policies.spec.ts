import { test } from '@japa/runner'
import { Bouncer } from '@adonisjs/bouncer'
import User, { type UserRole } from '#models/account/user'
import CustomerAddress from '#models/account/customer_address'
import Order from '#models/checkout/order'
import UserPolicy from '#policies/account/user_policy'
import AddressPolicy from '#policies/account/address_policy'
import OrderPolicy from '#policies/account/order_policy'

function actor(id: number, role: UserRole) {
  const user = new User()
  user.id = id
  user.role = role
  return user
}

test.group('Account ownership policies', () => {
  test('owners can access their resources, other users cannot, and admins pass before hooks', async ({
    assert,
  }) => {
    const account = actor(1, 'customer')
    const address = new CustomerAddress()
    address.userId = account.id
    const order = new Order()
    order.userId = account.id

    for (const user of [
      null,
      account,
      actor(2, 'customer'),
      actor(3, 'seller'),
      actor(4, 'admin'),
    ]) {
      const bouncer = new Bouncer<User>(user)
      const allowed = user?.id === account.id || user?.role === 'admin'
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
        assert.equal(result, allowed, `${user?.role || 'guest'}: ${action}`)
      }
    }
  })
})
