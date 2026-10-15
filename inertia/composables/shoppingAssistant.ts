import { computed, inject, onMounted, provide, ref, shallowRef, type InjectionKey } from 'vue'
import { router, usePage } from '@inertiajs/vue3'
import { HttpResponseError } from '@inertiajs/core'
import { useHttp } from '@adonisjs/inertia/vue'
import { Chat } from '@ai-sdk/vue'
import { APICallError, DefaultChatTransport, validateUIMessages, type UIMessage } from 'ai'
import type { Data } from '@generated/data'
import { urlFor } from '~/client'

/** An order as its order page shows it, with the shipment's tracking. */
export type AssistantOrder = Data.Checkout.Order & {
  tracking: {
    carrier: string | null
    trackingNumber: string | null
    trackingUrl: string | null
  } | null
}

/** The shopping tools' inputs and outputs as the browser receives them. */
type AssistantTools = {
  searchProducts: {
    input: { query: string; collection?: string }
    output: Data.Assistant.AssistantProduct[]
  }
  getProduct: {
    input: { handle: string }
    output:
      | { found: false }
      | { found: true; product: Data.Assistant.AssistantProduct.Variants['forDetail'] }
  }
  offerSuggestions: { input: Record<string, never>; output: { offered: true } }
  listMyOrders: {
    input: Record<string, never>
    output: { signInRequired: true } | { orders: AssistantOrder[] }
  }
  proposeAddToCart: {
    input: { variantId: string; quantity: number }
    output: Data.Assistant.AssistantProposal | { unavailable: true }
  }
  getMyOrder: {
    input: { orderNumber: string }
    output: { signInRequired: true } | { found: false } | { found: true; order: AssistantOrder }
  }
}

/** Data parts the server adds itself; `checkout` follows a confirmed add. */
type AssistantDataParts = { checkout: Record<string, never> }

export type AssistantUIMessage = UIMessage<unknown, AssistantDataParts, AssistantTools>

export type AssistantPage = { type: 'product' | 'collection'; handle: string }

/** Three questions per kind of page; the intro and a declining reply both offer them. */
const suggestedQuestions = {
  product: [
    'What sizes are in stock?',
    'Does this come in other colours?',
    'How much is shipping?',
  ],
  collection: [
    "What's popular in this collection?",
    'What is in stock under ₱1,000?',
    'How much is shipping?',
  ],
  other: ['How much is shipping?', 'What is your refund policy?', 'Where is my order?'],
} as const

const assistantKey: InjectionKey<ReturnType<typeof createShoppingAssistant>> =
  Symbol('shopping-assistant')

/** The request body for the next send; the server owns the conversation's history. */
type SendBody = { kind: 'message'; text: string } | { kind: 'follow_up'; proposalId: string }

/** The CSRF token shield exposes for scripted requests. */
const xsrfToken = () => {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : ''
}

/** All of the shopping assistant's client state; it lives in the storefront layout. */
const createShoppingAssistant = () => {
  const page = usePage()
  const open = ref(false)
  const available = computed(() => page.props.assistant?.available ?? false)
  const conversationId = ref<string | null>(page.props.assistant?.conversationId ?? null)
  const chat = shallowRef<Chat<AssistantUIMessage> | null>(null)
  const creating = useHttp({ route: 'assistant.conversations.store' })
  const loading = useHttp<
    Record<string, never>,
    { data: Data.Assistant.AssistantConversation.Variants['forThread'] }
  >()
  const listing = useHttp({ route: 'assistant.conversations.index' })
  const deleting = useHttp<Record<string, never>, { id: string }>()
  const deciding = useHttp<
    { decision: 'add' | 'dismiss' },
    {
      data: {
        proposal: Data.Assistant.AssistantProposal
        message?: Data.Assistant.AssistantMessage
        cartCount?: number
      }
    }
  >({ decision: 'add' })
  const showingHistory = ref(false)
  const pastConversations = ref<Data.Assistant.AssistantConversation[]>([])
  /** A message shown in the thread, such as the storefront's reason an add was refused. */
  const notice = ref<string | null>(null)
  /** Set once the assistant has been switched off; nothing more can be sent. */
  const blocked = ref(false)
  let nextBody: SendBody | null = null

  // Never offered while the shopper is paying.
  const hidden = computed(
    () =>
      !available.value ||
      page.component === 'checkout/index' ||
      page.component.startsWith('payments/')
  )

  /** The product or collection the shopper is looking at, so "this" needs no explaining. */
  const pageContext = computed<AssistantPage | null>(() => {
    const props = page.props as { product?: { handle?: string }; collection?: { handle?: string } }
    if (page.component === 'product/[handle]' && props.product?.handle)
      return { type: 'product', handle: props.product.handle }
    if (page.component === 'collection/[handle]' && props.collection?.handle)
      return { type: 'collection', handle: props.collection.handle }
    return null
  })

  const suggestions = computed(() => suggestedQuestions[pageContext.value?.type ?? 'other'])
  const messages = computed(() => chat.value?.messages ?? [])
  const status = computed(() => chat.value?.status ?? 'ready')
  const busy = computed(
    () => blocked.value || status.value === 'submitted' || status.value === 'streaming'
  )

  /** The server's `{ message }` for a switched-off assistant, with the brief's wording as fallback. */
  const unavailableMessage = (body: string | undefined) => {
    try {
      const parsed: unknown = JSON.parse(body ?? '')
      if (
        parsed &&
        typeof parsed === 'object' &&
        'message' in parsed &&
        typeof parsed.message === 'string'
      )
        return parsed.message
    } catch {}
    return `The assistant isn't available right now. You can reach us at ${page.props.storeContactEmail}.`
  }

  // Built after mounting so server rendering never touches the browser-only transport.
  onMounted(() => {
    chat.value = new Chat<AssistantUIMessage>({
      onError: (error) => {
        if (APICallError.isInstance(error) && error.statusCode === 429) {
          notice.value = `You've sent a lot of messages. Please try again in a little while, or reach us at ${page.props.storeContactEmail}.`
          return
        }
        if (APICallError.isInstance(error) && error.statusCode === 503) {
          blocked.value = true
          notice.value = unavailableMessage(error.responseBody)
          return
        }
        // A failed reply streams the server's own message; the shopper can send again.
        notice.value = error.message
      },
      transport: new DefaultChatTransport({
        prepareSendMessagesRequest: () => ({
          api: urlFor('assistant.conversations.messages.store', {
            conversationId: conversationId.value!,
          }),
          headers: { 'Accept': 'application/json', 'X-XSRF-TOKEN': xsrfToken() },
          body: { ...nextBody, page: pageContext.value },
        }),
      }),
    })
    if (conversationId.value) load(conversationId.value)
  })

  /** Reopens a conversation; one this browser may no longer open just leaves the intro. */
  const load = async (id: string) => {
    try {
      const { data } = await loading.get(urlFor('assistant.conversations.show', { id }))
      conversationId.value = data.id
      const loaded = data.messages?.length
        ? await validateUIMessages<AssistantUIMessage>({ messages: data.messages })
        : []
      if (chat.value) chat.value.messages = loaded
    } catch {
      conversationId.value = null
      if (chat.value) chat.value.messages = []
    }
  }

  const ensureConversation = async () => {
    if (!conversationId.value) {
      const created = await creating.submit()
      conversationId.value = created.data.id
    }
    return conversationId.value
  }

  /** Shows the signed-in shopper's past conversations. */
  const history = async () => {
    const { data } = await listing.submit()
    pastConversations.value = data
    showingHistory.value = true
  }

  /** Reopens one of the signed-in shopper's past conversations. */
  const openPast = async (id: string) => {
    await load(id)
    showingHistory.value = false
  }

  /** Deletes a past conversation for good. */
  const remove = async (id: string) => {
    await deleting.delete(urlFor('assistant.conversations.destroy', { id }))
    pastConversations.value = pastConversations.value.filter((item) => item.id !== id)
    if (conversationId.value === id) {
      conversationId.value = null
      if (chat.value) chat.value.messages = []
    }
  }

  /** Add or Not now on a proposal; an add refreshes the header's cart. */
  const decide = async (proposalId: string, decision: 'add' | 'dismiss') => {
    deciding.decision = decision
    notice.value = null
    let data
    try {
      ;({ data } = await deciding.patch(urlFor('assistant.proposals.update', { id: proposalId })))
    } catch {
      // The storefront's own message, e.g. "This variant is unavailable."
      notice.value = Object.values(deciding.errors).find(Boolean) ?? 'Something went wrong.'
      if (decision === 'add' && chat.value) {
        // The assistant answers the failure with in-stock alternatives.
        nextBody = { kind: 'follow_up', proposalId }
        await chat.value.sendMessage()
      }
      return
    }
    if (!chat.value) return
    // Old messages carry the proposal as it was; show its new state in place.
    const updated = chat.value.messages.map((message) => ({
      ...message,
      parts: message.parts.map((part) =>
        part.type === 'tool-proposeAddToCart' &&
        part.state === 'output-available' &&
        'id' in part.output &&
        part.output.id === data.proposal.id
          ? { ...part, output: data.proposal }
          : part
      ),
    }))
    const confirmation = data.message
      ? await validateUIMessages<AssistantUIMessage>({ messages: [data.message] })
      : []
    chat.value.messages = [...updated, ...confirmation]
    if (decision === 'add') router.reload({ only: ['cart'] })
  }

  /** Starts an empty conversation; the intro shows again. */
  const startNew = async () => {
    if (busy.value) return
    const created = await creating.submit()
    conversationId.value = created.data.id
    showingHistory.value = false
    if (chat.value) chat.value.messages = []
  }

  /** Sends the shopper's message and streams the reply into the thread. */
  const send = async (text: string) => {
    const message = text.trim()
    if (!message || busy.value || !chat.value) return
    try {
      await ensureConversation()
    } catch (error) {
      // Switched off since the page loaded: say so and stop sending.
      if (error instanceof HttpResponseError && error.response.status === 503) {
        blocked.value = true
        notice.value = unavailableMessage(error.response.data)
        return
      }
      throw error
    }
    notice.value = null
    nextBody = { kind: 'message', text: message }
    await chat.value.sendMessage({ text: message })
  }

  return {
    open,
    hidden,
    pageContext,
    suggestions,
    messages,
    status,
    busy,
    send,
    startNew,
    history,
    openPast,
    remove,
    decide,
    notice,
    blocked,
    showingHistory,
    pastConversations,
  }
}

export const provideShoppingAssistant = () => provide(assistantKey, createShoppingAssistant())

export const useShoppingAssistant = () => {
  const assistant = inject(assistantKey)
  if (!assistant) throw new Error('Shopping assistant components require the storefront layout.')
  return assistant
}
