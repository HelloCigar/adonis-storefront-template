import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import app from '@adonisjs/core/services/app'
import { AttachmentLinkModel, AttachmentModel } from '@jrmc/adonis-attachment/lucid'
import User from '#models/account/user'
import OrderMessage from '#models/chat/order_message'
import { OrderFactory } from '#database/factories/order_factory'
import { nextEvent, request, useChatServer } from '#tests/helpers/chat_socket'
import { urlFor } from '@adonisjs/core/services/url_builder'
import type { ChatImageMessage } from '#tests/helpers/types'
import { orderChatPeople } from '#tests/helpers/order_chat'

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/vXcAAAAASUVORK5CYII=',
  'base64'
)

test.group('Order chat images', (group) => {
  const chat = useChatServer(group)
  group.each.setup(() => testUtils.db().truncate())

  test('a photo with a caption is stored and broadcast to the room', async ({
    client,
    assert,
    route,
  }) => {
    const { customer, staff, order } = await orderChatPeople()
    const { cookie } = await chat.login(client, staff)
    const staffSocket = await chat.connected(cookie)
    const roomKey = `order:${order.id}`
    const joined = await request(staffSocket, 'order:join', { roomKey })
    assert.isTrue(joined.ok)
    const delivered = nextEvent<ChatImageMessage>(staffSocket, 'message:new', 2000)

    const response = await client
      .post(urlFor('chat.messages.store', { orderId: order.id }))
      .loginAs(customer)
      .withCsrfToken()
      .header('referer', route('orders.show', { id: order.id }))
      .redirects(0)
      .field('body', '  The box arrived crushed  ')
      .file('images[]', png, { filename: 'parcel.png', contentType: 'image/png' })
    response.assertStatus(302)
    response.assertHeader('location', route('orders.show', { id: order.id }))

    const message = await OrderMessage.findByOrFail('order_id', order.id)
    assert.equal(message.body, 'The box arrived crushed')
    assert.equal(message.senderRole, 'customer')
    const [link] = await message.images.all()
    const attachments = await app.container.make('jrmc.attachment')
    assert.deepEqual(Buffer.from(await attachments.read(link.attachment.toAttachment())), png)

    const received = await delivered
    assert.equal(received?.id, message.publicId)
    assert.equal(received?.body, 'The box arrived crushed')
    assert.deepEqual(
      received?.images.map((image) => [image.id, image.url, image.name, image.mimeType]),
      [
        [
          link.attachmentId,
          route('chat.images.show', { orderId: order.id, id: link.attachmentId }),
          'parcel.png',
          'image/png',
        ],
      ]
    )

    const inbox = await client
      .get(route('inbox', [], { qs: { order: order.id } }))
      .loginAs(staff)
      .withInertia()
    assert.deepEqual(
      inbox.inertiaProps.conversation.messages.map((item: ChatImageMessage) => item.images.length),
      [1]
    )
    const thread = await request<{ messages: ChatImageMessage[] }>(staffSocket, 'order:join', {
      roomKey,
    })
    assert.isTrue(thread.ok && thread.data.messages[0].images[0].id === link.attachmentId)
  })

  test('chat photos are served only to the order holder and staff', async ({
    client,
    assert,
    route,
  }) => {
    const { customer, staff, order } = await orderChatPeople()
    const stranger = await User.create({
      email: 'stranger@example.com',
      password: 'secret-password',
      role: 'customer',
    })
    await client
      .post(urlFor('chat.messages.store', { orderId: order.id }))
      .loginAs(customer)
      .withCsrfToken()
      .redirects(0)
      .file('images[]', png, { filename: 'parcel.png', contentType: 'image/png' })
    const message = await OrderMessage.findByOrFail('order_id', order.id)
    assert.equal(message.body, '')
    const [link] = await message.images.all()
    const url = route('chat.images.show', { orderId: order.id, id: link.attachmentId })

    for (const viewer of [customer, staff]) {
      const response = await client.get(url).loginAs(viewer)
      response.assertStatus(200)
      response.assertHeader('content-type', 'image/png')
      response.assertHeader('cache-control', 'private, max-age=86400')
      assert.deepEqual(Buffer.from(response.response.body), png)
    }
    const strangerResponse = await client.get(url).loginAs(stranger)
    strangerResponse.assertStatus(403)
    const guestResponse = await client.get(url).redirects(0)
    guestResponse.assertStatus(302)

    // Another order's id, or the public attachment route, never reaches the photo.
    const otherOrder = await OrderFactory.merge({
      userId: stranger.id,
      lifecycleState: 'confirmed',
    }).create()
    const elsewhere = route('chat.images.show', { orderId: otherOrder.id, id: link.attachmentId })
    const wrongOrder = await client.get(elsewhere).loginAs(stranger)
    wrongOrder.assertStatus(404)
    const publicRoute = await client.get(
      route('attachments.show', { id: link.attachmentId, name: 'parcel.png' })
    )
    publicRoute.assertStatus(404)
  })

  test('rejects uploads that are not photos, too many, or on closed orders', async ({
    client,
    assert,
  }) => {
    const { customer, order } = await orderChatPeople()
    const upload = (orderId: string) =>
      client
        .post(urlFor('chat.messages.store', { orderId }))
        .loginAs(customer)
        .withCsrfToken()
        .redirects(0)

    const text = await upload(order.id)
      .field('body', 'see attached')
      .file('images[]', Buffer.from('not an image'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      })
    text.assertStatus(302)
    const noPhoto = await upload(order.id).field('body', 'no photo')
    noPhoto.assertStatus(302)

    let tooMany = upload(order.id)
    for (let index = 0; index < 5; index++) {
      tooMany = tooMany.file('images[]', png, {
        filename: `${index}.png`,
        contentType: 'image/png',
      })
    }
    const tooManyResponse = await tooMany
    tooManyResponse.assertStatus(302)
    assert.lengthOf(await OrderMessage.all(), 0)
    assert.lengthOf(await AttachmentModel.all(), 0)

    const closed = await OrderFactory.merge({
      userId: customer.id,
      lifecycleState: 'cancelled',
    }).create()
    const response = await upload(closed.id).file('images[]', png, {
      filename: 'parcel.png',
      contentType: 'image/png',
    })
    // Bouncer answers a denied form post by redirecting back with a flash message.
    response.assertStatus(302)
    assert.lengthOf(await OrderMessage.all(), 0)
    assert.lengthOf(await AttachmentLinkModel.all(), 0)
  })
})
