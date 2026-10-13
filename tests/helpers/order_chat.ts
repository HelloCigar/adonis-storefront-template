import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import User from '#models/account/user'
import type Order from '#models/checkout/order'
import OrderMessage from '#models/chat/order_message'
import { OrderFactory } from '#database/factories/order_factory'
import type { GroupChatServer } from '#tests/helpers/types'
import type { ApiClient } from '@japa/api-client'

export function chatMessage(order: Order, sender: User, body: string, minutesAgo = 0) {
  return OrderMessage.create({
    publicId: randomUUID(),
    orderId: order.id,
    senderId: sender.id,
    senderRole: sender.id === order.userId ? 'customer' : 'staff',
    senderName: sender.fullName ?? sender.email,
    body,
    createdAt: DateTime.now().minus({ minutes: minutesAgo }),
  })
}

export async function inboxPeople() {
  const staff = await User.create({
    email: 'staff@example.com',
    fullName: 'Sam Staff',
    password: 'x',
    role: 'staff',
  })
  const customer = await User.create({
    email: 'buyer@example.com',
    fullName: 'Casey Customer',
    password: 'x',
    role: 'customer',
  })
  return { staff, customer }
}

export async function orderChatPeople(lifecycleState: 'confirmed' | 'cancelled' = 'confirmed') {
  const customer = await User.create({
    email: 'buyer@example.com',
    fullName: 'Casey Customer',
    password: 'secret-password',
    role: 'customer',
  })
  const staff = await User.create({
    email: 'staff@example.com',
    fullName: 'Sam Staff',
    password: 'secret-password',
    role: 'staff',
  })
  const order = await OrderFactory.merge({ userId: customer.id, lifecycleState }).create()
  return { customer, staff, order }
}

/** A customer and staff member logged in and connected to a confirmed order's room. */
export async function roomScenario(chat: GroupChatServer, client: ApiClient) {
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

export function customerMessage(order: Order, body: string, readAt: DateTime | null = null) {
  return OrderMessage.create({
    publicId: randomUUID(),
    orderId: order.id,
    senderId: order.userId,
    senderRole: 'customer',
    senderName: 'Casey Customer',
    body,
    readAt,
  })
}
