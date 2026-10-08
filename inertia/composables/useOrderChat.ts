import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { io, type Socket } from 'socket.io-client'
import { useRouter } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'

type Side = Data.Chat.Message['senderRole']
type Reply<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } }
type LiveMessage = Data.Chat.Message & { roomKey: string }
interface RoomEvent {
  roomKey: string
  side: Side
}

export type ChatConnection = 'connecting' | 'live' | 'offline'

const typingThrottleMs = 1500
const typingTimeoutMs = 4000

/**
 * Live order chat over the store's Socket.IO server. Loaded messages come from the page;
 * every (re)join returns the stored thread, so anything sent while away is filled in.
 * Photos are uploaded over HTTP; the server broadcasts them to the room like any message.
 */
export function useOrderChat(conversation: Ref<Data.Chat.Conversation>, options: { side: Side }) {
  const messages = ref<Data.Chat.Message[]>([...conversation.value.messages])
  const connection = ref<ChatConnection>('connecting')
  const error = ref<string | null>(null)
  const typing = ref(false)
  const sending = ref(false)
  const router = useRouter()

  let socket: Socket | undefined
  let joinedRoom: string | undefined
  let typingTimer: ReturnType<typeof setTimeout> | undefined
  let lastTypingAt = 0

  const fromOtherSide = (event: { side?: Side; senderRole?: Side }) =>
    (event.side ?? event.senderRole) !== options.side

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

  /** The stored thread is authoritative; anything newer that arrived meanwhile stays after it. */
  function replaceWith(history: Data.Chat.Message[]) {
    const ids = new Set(history.map((message) => message.id))
    messages.value = [...history, ...messages.value.filter((message) => !ids.has(message.id))]
  }

  function join() {
    if (!socket) return
    const roomKey = conversation.value.roomKey
    socket.emit(
      'order:join',
      { roomKey },
      (reply: Reply<{ roomKey: string; messages: Data.Chat.Message[] }>) => {
        if (roomKey !== conversation.value.roomKey) return
        if (!reply.ok) {
          connection.value = 'offline'
          error.value = reply.error.message
          return
        }
        joinedRoom = roomKey
        connection.value = 'live'
        error.value = null
        replaceWith(reply.data.messages)
        markRead()
      }
    )
  }

  function markRead() {
    if (joinedRoom && document.visibilityState === 'visible') {
      socket?.emit('message:read', { roomKey: joinedRoom }, () => {})
    }
  }

  function send(content: string) {
    const body = content.trim()
    if (!body || !socket?.connected || !joinedRoom || sending.value) return Promise.resolve(false)
    sending.value = true
    stopTyping()
    return new Promise<boolean>((resolve) => {
      socket!
        .timeout(10_000)
        .emit(
          'message:send',
          { roomKey: joinedRoom, body },
          (timeout: Error | null, reply?: Reply<LiveMessage>) => {
            sending.value = false
            if (timeout || !reply) {
              error.value = 'The message could not be sent. Check your connection and try again.'
              return resolve(false)
            }
            if (!reply.ok) {
              error.value = reply.error.message
              return resolve(false)
            }
            error.value = null
            merge([reply.data])
            resolve(true)
          }
        )
    })
  }

  /** Uploads photos with an optional caption, then reloads the stored thread. */
  function sendImages(images: File[], caption: string) {
    if (!images.length || sending.value) return Promise.resolve(false)
    sending.value = true
    stopTyping()
    return new Promise<boolean>((resolve) => {
      let sent = false
      router.post(
        { route: 'chat.messages.store', routeParams: { orderId: conversation.value.orderId } },
        { body: caption.trim() || undefined, images },
        {
          forceFormData: true,
          only: ['conversation'],
          preserveState: true,
          preserveScroll: true,
          onSuccess: () => {
            sent = true
            error.value = null
          },
          onError: (errors: Record<string, string | string[]>) => {
            error.value = Object.values(errors).flat().join(' ')
          },
          onFinish: () => {
            sending.value = false
            resolve(sent)
          },
        }
      )
    })
  }

  function notifyTyping() {
    const now = Date.now()
    if (!joinedRoom || now - lastTypingAt < typingThrottleMs) return
    lastTypingAt = now
    socket?.emit('typing:start', { roomKey: joinedRoom })
  }

  function stopTyping() {
    if (!joinedRoom || !lastTypingAt) return
    lastTypingAt = 0
    socket?.emit('typing:stop', { roomKey: joinedRoom })
  }

  function clearTyping() {
    typing.value = false
    if (typingTimer) clearTimeout(typingTimer)
  }

  onMounted(() => {
    socket = io({ withCredentials: true })
    socket.on('connect', join)
    socket.on('disconnect', () => {
      joinedRoom = undefined
      connection.value = 'connecting'
      clearTyping()
    })
    socket.on('connect_error', () => {
      connection.value = socket?.active ? 'connecting' : 'offline'
    })
    socket.on('message:new', (message: LiveMessage) => {
      if (message.roomKey !== joinedRoom) return
      merge([message])
      if (fromOtherSide(message)) {
        clearTyping()
        markRead()
      }
    })
    socket.on('message:read', (event: RoomEvent) => {
      if (event.roomKey !== joinedRoom || !fromOtherSide(event)) return
      messages.value = messages.value.map((message) =>
        message.senderRole === options.side ? { ...message, read: true } : message
      )
    })
    socket.on('typing:start', (event: RoomEvent) => {
      if (event.roomKey !== joinedRoom || !fromOtherSide(event)) return
      typing.value = true
      if (typingTimer) clearTimeout(typingTimer)
      typingTimer = setTimeout(clearTyping, typingTimeoutMs)
    })
    socket.on('typing:stop', (event: RoomEvent) => {
      if (event.roomKey === joinedRoom && fromOtherSide(event)) clearTyping()
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
      if (joinedRoom) socket?.emit('order:leave', { roomKey: joinedRoom }, () => {})
      joinedRoom = undefined
      clearTyping()
      error.value = null
      messages.value = [...next.messages]
      if (socket?.connected) {
        connection.value = 'connecting'
        join()
      }
    }
  )

  return {
    messages,
    connection,
    error,
    typing,
    sending,
    send,
    sendImages,
    notifyTyping,
    stopTyping,
  }
}
