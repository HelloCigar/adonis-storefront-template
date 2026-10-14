import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import { OrderFactory } from '#database/factories/order_factory'
import { UserFactory } from '#database/factories/user_factory'
import { customerMessage } from '#tests/helpers/order_chat'

test.group('Seller order page chat link', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('an account order reports its unread customer messages', async ({
    client,
    assert,
    route,
  }) => {
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    const customer = await UserFactory.merge({ role: 'customer' }).create()
    const order = await OrderFactory.merge({
      userId: customer.id,
      lifecycleState: 'confirmed',
      source: 'online',
    }).create()
    await customerMessage(order, 'Where is my parcel?')
    await customerMessage(order, 'Hello?')
    await customerMessage(order, 'Already handled', DateTime.now())

    const page = await client
      .get(route('seller.orders.show', { id: order.id }))
      .loginAs(staff)
      .withInertia()
    page.assertStatus(200)
    assert.deepEqual(page.inertiaProps.chat, { unreadCount: 2 })
  })

  test('a guest order has no chat', async ({ client, assert, route }) => {
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    const guest = await OrderFactory.merge({
      lifecycleState: 'confirmed',
      source: 'online',
    }).create()

    const page = await client
      .get(route('seller.orders.show', { id: guest.id }))
      .loginAs(staff)
      .withInertia()
    page.assertStatus(200)
    assert.isNull(page.inertiaProps.chat)
  })
})
