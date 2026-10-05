import { type PersistenceAdapter } from '@ravex/server'

interface Message {
  id: string
  roomId: string
  senderId: string
  senderName: string
  content: string
  type: 'image' | 'system' | 'file' | 'text' | 'audio' | 'video'
  chatType: 'group' | 'personal'
  replyTo?: string | undefined
  attachments?:
    | {
        id: string
        name: string
        url: string
        mimeType: string
        size: number
      }[]
    | undefined
  reactions?:
    | {
        [x: string]: string[]
      }
    | undefined
  deliveryStatus: 'sent' | 'delivered' | 'read'
  editedAt?: Date | undefined
  deletedAt?: Date | undefined
  metadata?:
    | {
        [x: string]: unknown
      }
    | undefined
  createdAt: Date
}

export class ChatSaver implements PersistenceAdapter {
  saveMessage(message: Message): Promise<void> {
    throw new Error('Method not implemented.')
  }
  getMessages(roomId: string, limit?: number, before?: Date): Promise<Message[]> {
    throw new Error('Method not implemented.')
  }
  updateMessage(messageId: string, updates: Partial<Message>): Promise<void> {
    throw new Error('Method not implemented.')
  }
  deleteMessage(messageId: string): Promise<void> {
    throw new Error('Method not implemented.')
  }
}
