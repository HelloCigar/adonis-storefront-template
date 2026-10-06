import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import type { ApiClient } from '@japa/api-client'
import User from '#models/account/user'
import OrderMessage from '#models/chat/order_message'
import { OrderFactory } from '#database/factories/order_factory'
import { nextEvent, request, startChatServer, type ChatServer } from '#tests/helpers/chat_socket'

interface Message {
  id: string
  roomId: string
  content: string
  type: string
  senderName: string
  attachments: unknown[]
  metadata: Record<string, unknown>
}

test.group('Order chat rooms', (group) => {
  let chat: ChatServer

  group.setup(async () => {
    chat = await startChatServer()
  })
  group.teardown(() => chat.close())
  group.each.setup(() => testUtils.db().truncate())
  group.each.teardown(() => chat.disconnectAll())

  async function scenario(client: ApiClient) {
    const customer = await chat.login(client, 'customer')
    const staff = await chat.login(client, 'staff')
    const order = await OrderFactory.merge({
      userId: customer.user.id,
      lifecycleState: 'confirmed',
    }).create()
    const customerSocket = await chat.connected(customer.cookie)
    const staffSocket = await chat.connected(staff.cookie)
    return { customer, staff, order, customerSocket, staffSocket, roomKey: `order:${order.id}` }
  }

  test('customer and staff exchange stored messages on a confirmed order', async ({
    client,
    assert,
  }) => {
    const { customer, staff, order, customerSocket, staffSocket, roomKey } = await scenario(client)
    const customerRoom = await request<{ id: string }>(customerSocket, 'room:join', {
      roomId: roomKey,
    })
    const staffRoom = await request<{ id: string }>(staffSocket, 'room:join', { roomId: roomKey })
    assert.isTrue(customerRoom.ok && staffRoom.ok)
    if (!customerRoom.ok || !staffRoom.ok) return
    assert.equal(customerRoom.data.id, staffRoom.data.id)
    assert.notEqual(customerRoom.data.id, roomKey)

    const delivered = nextEvent<Message>(staffSocket, 'message:new', 2000)
    const sent = await request<Message>(customerSocket, 'message:send', {
      roomId: customerRoom.data.id,
      content: '  Where is my parcel?  ',
      type: 'system',
      attachments: [{ id: 'x', name: 'invoice.pdf', url: 'https://evil.example', size: 1 }],
      metadata: { senderRole: 'staff' },
    })
    assert.isTrue(sent.ok)
    if (!sent.ok) return
    assert.equal(sent.data.content, 'Where is my parcel?')
    assert.equal(sent.data.type, 'text')
    assert.deepEqual(sent.data.attachments, [])
    assert.deepEqual(sent.data.metadata, { senderRole: 'customer' })
    assert.equal(sent.data.senderName, customer.user.fullName)
    const received = await delivered
    assert.equal(received?.id, sent.data.id)

    const reply = await request<Message>(staffSocket, 'message:send', {
      roomId: staffRoom.data.id,
      content: 'It ships today.',
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
    const { customerSocket, staffSocket } = await scenario(client)
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

    for (const roomId of [`order:${theirs.id}`, `order:${guest.id}`, 'order:999999', 'lobby']) {
      const joined = await request(customerSocket, 'room:join', { roomId })
      assert.isFalse(joined.ok, roomId)
      if (!joined.ok) assert.equal(joined.error.code, 'ROOM_NOT_FOUND')
    }
    const staffGuest = await request(staffSocket, 'room:join', { roomId: `order:${guest.id}` })
    assert.isFalse(staffGuest.ok)
  })

  test('a known room id is not enough to read or write another order', async ({
    client,
    assert,
  }) => {
    const { staffSocket, roomKey } = await scenario(client)
    const room = await request<{ id: string }>(staffSocket, 'room:join', { roomId: roomKey })
    assert.isTrue(room.ok)
    if (!room.ok) return
    await request(staffSocket, 'message:send', { roomId: room.data.id, content: 'Private note' })

    const outsider = await chat.login(
      client,
      await User.create({ email: 'outsider@example.com', password: 'x', role: 'customer' })
    )
    const socket = await chat.connected(outsider.cookie)
    const history = await request(socket, 'message:history', { roomId: room.data.id })
    const send = await request(socket, 'message:send', { roomId: room.data.id, content: 'Hi' })
    const join = await request(socket, 'room:join', { roomId: room.data.id })
    assert.isFalse(history.ok)
    assert.isFalse(send.ok)
    assert.isFalse(join.ok)
    assert.lengthOf(await OrderMessage.query().where('body', 'Hi'), 0)
  })

  test('messages close when the order leaves the confirmed state', async ({ client, assert }) => {
    const { order, customerSocket, staffSocket, roomKey } = await scenario(client)
    const room = await request<{ id: string }>(customerSocket, 'room:join', { roomId: roomKey })
    await request(staffSocket, 'room:join', { roomId: roomKey })
    assert.isTrue(room.ok)
    if (!room.ok) return

    await order.merge({ lifecycleState: 'cancelled' }).save()
    const delivered = nextEvent(staffSocket, 'message:new')
    const sent = await request(customerSocket, 'message:send', {
      roomId: room.data.id,
      content: 'Can I still change it?',
    })
    assert.isFalse(sent.ok)
    if (!sent.ok) assert.equal(sent.error.code, 'FORBIDDEN')
    assert.isUndefined(await delivered)
    assert.lengthOf(await OrderMessage.all(), 0)

    // Reading the existing thread stays available to the account holder.
    const history = await request(customerSocket, 'message:history', { roomId: room.data.id })
    assert.isTrue(history.ok)
  })

  test('clients cannot create, delete, edit, or react in rooms', async ({ client, assert }) => {
    const { customerSocket, roomKey } = await scenario(client)
    const room = await request<{ id: string }>(customerSocket, 'room:join', { roomId: roomKey })
    assert.isTrue(room.ok)
    if (!room.ok) return
    const before = chat.engine.getRoom(room.data.id)?.members.length

    const created = await request(customerSocket, 'room:create', {
      type: 'personal',
      members: ['1'],
    })
    assert.isFalse(created.ok)
    for (const [event, payload] of [
      ['room:delete', { roomId: room.data.id }],
      ['message:react', { roomId: room.data.id, messageId: 'x', emoji: '👍' }],
      ['message:edit', { roomId: room.data.id, messageId: 'x', content: 'changed' }],
      ['message:delete', { roomId: room.data.id, messageId: 'x' }],
    ] as const) {
      const response = await request(customerSocket, event, payload)
      assert.isFalse(response.ok, event)
    }
    assert.exists(chat.engine.getRoom(room.data.id))
    assert.equal(chat.engine.getRoom(room.data.id)?.members.length, before)
    const listed = await request<unknown[]>(customerSocket, 'room:list')
    assert.isTrue(listed.ok && listed.data.length === 1)
  })

  test('history comes from stored messages and reading marks the thread read', async ({
    client,
    assert,
  }) => {
    const { order, customerSocket, staffSocket, roomKey } = await scenario(client)
    const room = await request<{ id: string }>(customerSocket, 'room:join', { roomId: roomKey })
    await request(staffSocket, 'room:join', { roomId: roomKey })
    assert.isTrue(room.ok)
    if (!room.ok) return
    for (const content of ['First', 'Second'])
      await request(customerSocket, 'message:send', { roomId: room.data.id, content })

    const history = await request<Message[]>(staffSocket, 'message:history', {
      roomId: room.data.id,
    })
    assert.isTrue(history.ok)
    if (!history.ok) return
    assert.deepEqual(
      history.data.map((message) => [message.content, message.metadata.senderRole]),
      [
        ['First', 'customer'],
        ['Second', 'customer'],
      ]
    )

    staffSocket.emit('message:read', { roomId: room.data.id, messageId: history.data[1].id })
    for (let attempt = 0; attempt < 20; attempt++) {
      const unread = await OrderMessage.query().where('order_id', order.id).whereNull('read_at')
      if (!unread.length) break
      await new Promise((resolve) => setTimeout(resolve, 25))
    }
    const rows = await OrderMessage.query().where('order_id', order.id)
    assert.isTrue(rows.every((message) => message.readAt !== null))
  })
})
