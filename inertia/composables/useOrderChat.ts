import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { io, type Socket } from 'socket.io-client'
import type { Data } from '@generated/data'

type Side = Data.Chat.Message['senderRole']
type Ack<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } }

/** The parts of a Ravex message the chat needs; the server fixes sender details. */
interface LiveMessage {
  id: string
  roomId: string
  senderId: string
  senderName: string
  content: string
  deliveryStatus: 'sent' | 'delivered' | 'read'
  metadata?: { senderRole?: Side }
  createdAt: string
}

export type ChatConnection = 'connecting' | 'live' | 'offline'

const typingThrottleMs = 1500
const typingTimeoutMs = 4000

/**
 * Live order chat over the store's Socket.IO engine. Loaded messages come from the page;
 * the socket adds new ones, and every (re)join refills anything sent in between.
 */
export function useOrderChat(
  conversation: Ref<Data.Chat.Conversation>,
  options: { side: Side; viewerId: Ref<number | undefined> }
) {
  const messages = ref<Data.Chat.Message[]>([...conversation.value.messages])
  const connection = ref<ChatConnection>('connecting')
  const error = ref<string | null>(null)
  const typingUserId = ref<string | null>(null)
  const sending = ref(false)

  let socket: Socket | undefined
  let roomId: string | undefined
  let typingTimer: ReturnType<typeof setTimeout> | undefined
  let lastTypingAt = 0

  const viewer = () => String(options.viewerId.value ?? '')

  function fromLive(message: LiveMessage): Data.Chat.Message {
    const mine = message.senderId === viewer()
    const otherSide: Side = options.side === 'staff' ? 'customer' : 'staff'
    return {
      id: message.id,
      body: message.content,
      senderName: message.senderName,
      senderRole: message.metadata?.senderRole ?? (mine ? options.side : otherSide),
      createdAt: new Date(message.createdAt).toISOString(),
      read: message.deliveryStatus === 'read',
    }
  }

  /** Keeps arrival order; a known id is updated in place. */
  function merge(incoming: Data.Chat.Message[]) {
    const next = [...messages.value]
    for (const message of incoming) {
      const index = next.findIndex((known) => known.id === message.id)
      if (index === -1) next.push(message)
      else next[index] = message
    }
    messages.value = next
  }

  /** Server history is authoritative; anything newer that arrived meanwhile stays after it. */
  function replaceWith(history: Data.Chat.Message[]) {
    const ids = new Set(history.map((message) => message.id))
    messages.value = [...history, ...messages.value.filter((message) => !ids.has(message.id))]
  }

  function join() {
    if (!socket) return
    const roomKey = conversation.value.roomKey
    socket.emit('room:join', { roomId: roomKey }, (response: Ack<{ id: string }>) => {
      if (roomKey !== conversation.value.roomKey) return
      if (!response.ok) {
        connection.value = 'offline'
        error.value = response.error.message
        return
      }
      roomId = response.data.id
      connection.value = 'live'
      error.value = null
      // The page's copy may be stale after a reconnect or a reopened thread.
      refill()
    })
  }

  function refill() {
    const current = roomId
    socket?.emit('message:history', { roomId: current }, (response: Ack<LiveMessage[]>) => {
      if (response.ok && current === roomId) replaceWith(response.data.map(fromLive))
    })
  }

  function markRead(messageId: string) {
    if (roomId && document.visibilityState === 'visible') {
      socket?.emit('message:read', { roomId, messageId })
    }
  }

  function send(content: string) {
    const body = content.trim()
    if (!body || !socket?.connected || !roomId || sending.value) return Promise.resolve(false)
    sending.value = true
    stopTyping()
    return new Promise<boolean>((resolve) => {
      socket!
        .timeout(10_000)
        .emit(
          'message:send',
          { roomId, content: body },
          (timeout: Error | null, response?: Ack<LiveMessage>) => {
            sending.value = false
            if (timeout || !response) {
              error.value = 'The message could not be sent. Check your connection and try again.'
              return resolve(false)
            }
            if (!response.ok) {
              error.value = response.error.message
              return resolve(false)
            }
            error.value = null
            merge([fromLive(response.data)])
            resolve(true)
          }
        )
    })
  }

  function notifyTyping() {
    const now = Date.now()
    if (!roomId || now - lastTypingAt < typingThrottleMs) return
    lastTypingAt = now
    socket?.emit('typing:start', { roomId })
  }

  function stopTyping() {
    if (!roomId || !lastTypingAt) return
    lastTypingAt = 0
    socket?.emit('typing:stop', { roomId })
  }

  function clearTyping() {
    typingUserId.value = null
    if (typingTimer) clearTimeout(typingTimer)
  }

  onMounted(() => {
    socket = io({ withCredentials: true })
    socket.on('connect', join)
    socket.on('disconnect', () => {
      connection.value = 'connecting'
      clearTyping()
    })
    socket.on('connect_error', () => {
      connection.value = socket?.active ? 'connecting' : 'offline'
    })
    socket.on('message:new', (live: LiveMessage) => {
      if (live.roomId !== roomId) return
      merge([fromLive(live)])
      if (live.senderId !== viewer()) {
        clearTyping()
        markRead(live.id)
      }
    })
    socket.on('message:read_receipt', (receipt: { roomId: string; readBy: string }) => {
      if (receipt.roomId !== roomId || receipt.readBy === viewer()) return
      messages.value = messages.value.map((message) =>
        message.senderRole === options.side ? { ...message, read: true } : message
      )
    })
    socket.on('typing:start', (event: { roomId: string; userId: string }) => {
      if (event.roomId !== roomId || event.userId === viewer()) return
      typingUserId.value = event.userId
      if (typingTimer) clearTimeout(typingTimer)
      typingTimer = setTimeout(clearTyping, typingTimeoutMs)
    })
    socket.on('typing:stop', (event: { roomId: string; userId: string }) => {
      if (event.roomId === roomId && event.userId === typingUserId.value) clearTyping()
    })
  })

  onBeforeUnmount(() => {
    clearTyping()
    socket?.disconnect()
    socket = undefined
  })

  // Staff switch threads in place: leave the old room, then join the new one.
  watch(
    () => conversation.value,
    (next, previous) => {
      if (next.roomKey === previous.roomKey) return merge(next.messages)
      if (roomId) socket?.emit('room:leave', { roomId }, () => {})
      roomId = undefined
      clearTyping()
      error.value = null
      messages.value = [...next.messages]
      if (socket?.connected) {
        connection.value = 'connecting'
        join()
      }
    }
  )

  return { messages, connection, error, typingUserId, sending, send, notifyTyping, stopTyping }
}
