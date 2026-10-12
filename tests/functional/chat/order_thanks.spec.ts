import { test } from '@japa/runner'
import emitter from '@adonisjs/core/services/emitter'
import OrderMessagePosted from '#events/chat/order_message_posted'
import OrderMessage from '#models/chat/order_message'
import { UserFactory } from '#database/factories/user_factory'
import {
  paidOrder,
  resetCheckoutState,
  sendWebhook,
  useFakeProvider,
} from '#tests/helpers/payments'
import { savedStoreSettings } from '#tests/helpers/store_setup'

test.group('Order chat thank-you', (group) => {
  group.each.setup(() => resetCheckoutState())

  test('a paid account order gets one thank-you from the store in its chat', async ({
    client,
    assert,
  }) => {
    using events = emitter.fake([OrderMessagePosted])
    await savedStoreSettings({ storeName: 'Lantern Goods' })
    const provider = useFakeProvider()
    const customer = await UserFactory.merge({
      firstName: 'Casey',
      fullName: 'Casey Cruz',
    }).create()

    const { order } = await paidOrder(client, provider, { customer })

    const messages = await OrderMessage.query().where('order_id', order.id)
    assert.lengthOf(messages, 1)
    const [thanks] = messages
    assert.isNull(thanks.senderId)
    assert.equal(thanks.senderRole, 'staff')
    assert.equal(thanks.senderName, 'Lantern Goods')
    assert.isNull(thanks.readAt)
    assert.include(thanks.body, 'Thanks for ordering, Casey!')
    assert.include(thanks.body, order.number)
    events.assertEmittedCount(OrderMessagePosted, 1)
  })

  test('a repeated paid webhook leaves the single thank-you alone', async ({ client, assert }) => {
    const provider = useFakeProvider()
    const customer = await UserFactory.create()
    const { order, checkoutId } = await paidOrder(client, provider, { customer })

    await sendWebhook(client, provider, { id: 'evt_paid', type: 'checkout.paid', checkoutId })

    assert.lengthOf(await OrderMessage.query().where('order_id', order.id), 1)
  })

  test('the customer sees the thank-you on their order page', async ({ client, assert }) => {
    await savedStoreSettings({ storeName: 'Lantern Goods' })
    const provider = useFakeProvider()
    const customer = await UserFactory.merge({ firstName: 'Casey' }).create()
    const { order } = await paidOrder(client, provider, { customer })

    const page = await client
      .get(`/checkout/orders/${order.publicId}`)
      .loginAs(customer)
      .withInertia()

    page.assertStatus(200)
    const messages = page.inertiaProps.conversation.messages as {
      senderName: string
      senderRole: string
      automated: boolean
      body: string
    }[]
    assert.lengthOf(messages, 1)
    assert.equal(messages[0].senderName, 'Lantern Goods')
    assert.equal(messages[0].senderRole, 'staff')
    assert.isTrue(messages[0].automated)
    assert.include(messages[0].body, 'Thanks for ordering, Casey!')
  })

  test('guest orders have no chat, so nothing is posted', async ({ client, assert }) => {
    const provider = useFakeProvider()

    const { order } = await paidOrder(client, provider)

    assert.equal(order.lifecycleState, 'confirmed')
    assert.isEmpty(await OrderMessage.all())
  })
})
