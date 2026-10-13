import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/account/user'
import OrderMessage from '#models/chat/order_message'
import { OrderFactory } from '#database/factories/order_factory'
import { nextEvent, request, useChatServer } from '#tests/helpers/chat_socket'
import type { ChatRoomMessage } from '#tests/helpers/types'
import { roomScenario } from '#tests/helpers/order_chat'

test.group('Order chat rooms', (group) => {
  const chat = useChatServer(group)
  group.each.setup(() => testUtils.db().truncate())

  test('customer and staff exchange stored messages on a confirmed order', async ({
    client,
    assert,
  }) => {
    const { customer, staff, order, customerSocket, staffSocket, roomKey } = await roomScenario(
      chat,
      client
    )
    const customerJoin = await request<{ roomKey: string }>(customerSocket, 'order:join', {
      roomKey,
    })
    const staffJoin = await request<{ roomKey: string }>(staffSocket, 'order:join', { roomKey })
    assert.isTrue(customerJoin.ok && staffJoin.ok)

    const delivered = nextEvent<ChatRoomMessage>(staffSocket, 'message:new', 2000)
    const sent = await request<ChatRoomMessage>(customerSocket, 'message:send', {
      roomKey,
      body: '  Where is my parcel?  ',
      senderRole: 'staff',
      senderName: 'Store Owner',
      attachments: [{ url: 'https://evil.example' }],
    })
    assert.isTrue(sent.ok)
    if (!sent.ok) return
    assert.equal(sent.data.body, 'Where is my parcel?')
    assert.equal(sent.data.senderRole, 'customer')
    assert.equal(sent.data.senderName, customer.user.fullName)
    assert.isFalse(sent.data.automated)
    assert.notProperty(sent.data, 'attachments')
    const received = await delivered
    assert.equal(received?.id, sent.data.id)

    const reply = await request<ChatRoomMessage>(staffSocket, 'message:send', {
      roomKey,
      body: 'It ships today.',
    })
    assert.isTrue(reply.ok)

    const stored = await OrderMessage.query().where('order_id', order.id).orderBy('id')
    assert.deepEqual(
      stored.map((message) => [
        message.publicId,
        message.senderRole,
        message.senderId,
        message.body,
      ]),
      [
        [sent.data.id, 'customer', customer.user.id, 'Where is my parcel?'],
        [reply.ok ? reply.data.id : '', 'staff', staff.user.id, 'It ships today.'],
      ]
    )
  })

  test('nobody joins an order they cannot see, and guest orders have no thread', async ({
    client,
    assert,
  }) => {
    const { customerSocket, staffSocket } = await roomScenario(chat, client)
    const stranger = await User.create({
      email: 'other@example.com',
      password: 'secret-password',
      role: 'customer',
    })
    const theirs = await OrderFactory.merge({
      userId: stranger.id,
      lifecycleState: 'confirmed',
    }).create()
    const guest = await OrderFactory.merge({ lifecycleState: 'confirmed' }).create()

    for (const roomKey of [
      `order:${theirs.id}`,
      `order:${guest.id}`,
      'order:01ARZ3NDEKTSV4RRFFQ69G5FAV',
      'lobby',
    ]) {
      const joined = await request(customerSocket, 'order:join', { roomKey })
      assert.isFalse(joined.ok, roomKey)
      if (!joined.ok) assert.equal(joined.error.code, 'NOT_FOUND')
    }
    const staffGuest = await request(staffSocket, 'order:join', { roomKey: `order:${guest.id}` })
    assert.isFalse(staffGuest.ok)
  })

  test('a room key is not enough to read or write without joining', async ({ client, assert }) => {
    const { staffSocket, roomKey } = await roomScenario(chat, client)
    await request(staffSocket, 'order:join', { roomKey })
    await request(staffSocket, 'message:send', { roomKey, body: 'Private note' })

    const outsider = await chat.login(
      client,
      await User.create({ email: 'outsider@example.com', password: 'x', role: 'customer' })
    )
    const socket = await chat.connected(outsider.cookie)
    const overheard = nextEvent(socket, 'message:new')
    const send = await request(socket, 'message:send', { roomKey, body: 'Hi' })
    const read = await request(socket, 'message:read', { roomKey })
    const join = await request(socket, 'order:join', { roomKey })
    assert.isFalse(send.ok)
    assert.isFalse(read.ok)
    assert.isFalse(join.ok)
    await request(staffSocket, 'message:send', { roomKey, body: 'Second note' })
    assert.isUndefined(await overheard)
    assert.lengthOf(await OrderMessage.query().where('body', 'Hi'), 0)
  })

  test('messages close when the order leaves the confirmed state', async ({ client, assert }) => {
    const { order, customerSocket, staffSocket, roomKey } = await roomScenario(chat, client)
    await request(customerSocket, 'order:join', { roomKey })
    await request(staffSocket, 'order:join', { roomKey })

    await order.merge({ lifecycleState: 'cancelled' }).save()
    const delivered = nextEvent(staffSocket, 'message:new')
    const sent = await request(customerSocket, 'message:send', {
      roomKey,
      body: 'Can I still change it?',
    })
    assert.isFalse(sent.ok)
    if (!sent.ok) assert.equal(sent.error.code, 'FORBIDDEN')
    assert.isUndefined(await delivered)
    assert.lengthOf(await OrderMessage.all(), 0)

    // The account holder can still open the existing thread.
    const rejoin = await request(customerSocket, 'order:join', { roomKey })
    assert.isTrue(rejoin.ok)
  })

  test('messages must have text within the length limit', async ({ client, assert }) => {
    const { customerSocket, roomKey } = await roomScenario(chat, client)
    await request(customerSocket, 'order:join', { roomKey })
    for (const body of ['   ', 42, 'x'.repeat(2001)]) {
      const sent = await request(customerSocket, 'message:send', { roomKey, body })
      assert.isFalse(sent.ok)
      if (!sent.ok) assert.equal(sent.error.code, 'VALIDATION')
    }
    assert.lengthOf(await OrderMessage.all(), 0)
  })

  test('joining returns the stored thread and reading marks the other side read', async ({
    client,
    assert,
  }) => {
    const { order, customerSocket, staffSocket, roomKey } = await roomScenario(chat, client)
    await request(customerSocket, 'order:join', { roomKey })
    for (const body of ['First', 'Second'])
      await request(customerSocket, 'message:send', { roomKey, body })

    const joined = await request<{ messages: ChatRoomMessage[] }>(staffSocket, 'order:join', {
      roomKey,
    })
    assert.isTrue(joined.ok)
    if (!joined.ok) return
    assert.deepEqual(
      joined.data.messages.map((message) => [message.body, message.senderRole, message.read]),
      [
        ['First', 'customer', false],
        ['Second', 'customer', false],
      ]
    )

    const receipt = nextEvent<{ roomKey: string; side: string }>(customerSocket, 'message:read')
    const read = await request(staffSocket, 'message:read', { roomKey })
    assert.isTrue(read.ok)
    assert.deepEqual(await receipt, { roomKey, side: 'staff' })
    const rows = await OrderMessage.query().where('order_id', order.id)
    assert.isTrue(rows.every((message) => message.readAt !== null))
  })

  test('typing reaches the other side without identifying the account', async ({
    client,
    assert,
  }) => {
    const { customerSocket, staffSocket, roomKey } = await roomScenario(chat, client)
    await request(customerSocket, 'order:join', { roomKey })
    await request(staffSocket, 'order:join', { roomKey })

    const typing = nextEvent(customerSocket, 'typing:start', 1000)
    staffSocket.emit('typing:start', { roomKey })
    assert.deepEqual(await typing, { roomKey, side: 'staff' })
  })
})
