import type { PersistenceAdapter } from '@ravex/server'
import type OrderMessage from '#models/chat/order_message'
import type OrderChatService from '#services/chat/order_chat_service'

export type ChatMessage = Parameters<PersistenceAdapter['saveMessage']>[0]

/**
 * Reads order chat history for Ravex. Messages are written by the order room guard before
 * they are broadcast, so a failed write never shows up as a delivered message.
 * Edits, deletes, and reactions are disabled or blocked, so updates have nothing to store.
 */
export class ChatSaver implements PersistenceAdapter {
  constructor(
    private chat: OrderChatService,
    private orderIdFor: (roomId: string) => number | null
  ) {}

  async saveMessage(message: ChatMessage) {
    if (!(await this.chat.findByPublicId(message.id))) {
      throw new Error(`Chat message ${message.id} was broadcast without being stored`)
    }
  }

  async getMessages(roomId: string, limit?: number, before?: Date) {
    const orderId = this.orderIdFor(roomId)
    if (!orderId) return []
    const messages = await this.chat.messages(orderId, { limit, before })
    return messages.map((message) => this.toChatMessage(roomId, message))
  }

  async updateMessage() {}

  async deleteMessage() {}

  private toChatMessage(roomId: string, message: OrderMessage): ChatMessage {
    return {
      id: message.publicId,
      roomId,
      senderId: message.senderId === null ? '' : String(message.senderId),
      senderName: message.senderName,
      content: message.body,
      type: 'text',
      chatType: 'group',
      deliveryStatus: message.readAt ? 'read' : 'sent',
      metadata: { senderRole: message.senderRole },
      createdAt: message.createdAt.toJSDate(),
    }
  }
}
