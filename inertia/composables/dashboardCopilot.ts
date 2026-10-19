import {
  computed,
  inject,
  onMounted,
  provide,
  ref,
  shallowRef,
  watch,
  type InjectionKey,
} from 'vue'
import { router, usePage } from '@inertiajs/vue3'
import { HttpResponseError } from '@inertiajs/core'
import { useHttp } from '@adonisjs/inertia/vue'
import { Chat } from '@ai-sdk/vue'
import { APICallError, DefaultChatTransport, validateUIMessages, type UIMessage } from 'ai'
import type { Data } from '@generated/data'
import { urlFor } from '~/client'

/** The record on screen, so "this" in a question needs no explaining. */
export type CopilotPage = {
  type: 'order' | 'product' | 'customer' | 'discount' | 'collection' | 'review' | 'post'
  id: string
}

/** An order as the order queue lists it. */
type CopilotOrderRow = { id: string; number: string }

/** The copilot tools' outputs the thread renders, as the browser receives them. */
type CopilotTools = {
  getOrder: {
    input: { orderNumber: string }
    output: { found: false } | { found: true; order: CopilotOrderRow }
  }
  searchOrders: { input: { query?: string; stage?: string }; output: CopilotOrderRow[] }
  offerSuggestions: { input: Record<string, never>; output: { offered: true } }
  proposeChange: {
    input: {
      action: string
      summary: string
      items: { recordId: string | null; changes: Record<string, unknown> }[]
    }
    output: { proposalId: string } | { error: string }
  }
}

export type CopilotUIMessage = UIMessage<unknown, Record<string, never>, CopilotTools>

/** Three questions per kind of page; the intro and a declining reply both offer them. */
const suggestedQuestions = {
  order: ["What's holding this order up?", 'Has this order been paid?', 'Summarize this order'],
  product: [
    'How much stock is left?',
    'How is this product selling?',
    'What do reviews say about it?',
  ],
  customer: [
    'What has this customer ordered?',
    'Does this customer have open orders?',
    'How can I reach this customer?',
  ],
  discount: [
    'How often has this code been used?',
    'When does this discount end?',
    'Who can use this code?',
  ],
  other: [
    'What needs my attention today?',
    'Which products are low on stock?',
    'How were sales this week?',
  ],
} as const

/** Dashboard pages whose main record the copilot can read, by the prop that holds it. */
const pageRecords: Record<string, { type: CopilotPage['type']; prop: string }> = {
  'seller/order': { type: 'order', prop: 'order' },
  'seller/product': { type: 'product', prop: 'product' },
  'seller/post': { type: 'post', prop: 'post' },
}

const unavailable = "The copilot isn't available right now. Please try again in a moment."

const copilotKey: InjectionKey<ReturnType<typeof createDashboardCopilot>> =
  Symbol('dashboard-copilot')

/** The CSRF token shield exposes for scripted requests. */
const xsrfToken = () => {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : ''
}

/** The server's `{ message }` for a refused request, with the brief's wording as fallback. */
const serverMessage = (body: unknown) => {
  try {
    const parsed: unknown = typeof body === 'string' ? JSON.parse(body) : body
    if (
      parsed &&
      typeof parsed === 'object' &&
      'message' in parsed &&
      typeof parsed.message === 'string'
    )
      return parsed.message
  } catch {}
  return unavailable
}

/** All of the dashboard copilot's client state; it lives in the dashboard layout. */
const createDashboardCopilot = () => {
  const page = usePage()
  const open = ref(false)
  const available = computed(() => page.props.copilot?.available ?? false)
  const conversationId = ref<string | null>(null)
  const chat = shallowRef<Chat<CopilotUIMessage> | null>(null)
  const creating = useHttp({ route: 'copilot.conversations.store' })
  const loading = useHttp<
    Record<string, never>,
    { data: Data.Assistant.CopilotConversation.Variants['forThread'] }
  >()
  const listing = useHttp({ route: 'copilot.conversations.index' })
  const deciding = useHttp<
    { decision: 'apply' | 'dismiss' },
    {
      data: {
        proposal: Data.Assistant.CopilotProposal
        message?: Data.Assistant.AssistantMessage
      }
    }
  >({ decision: 'apply' })
  const showingHistory = ref(false)
  const pastConversations = ref<Data.Assistant.CopilotConversation[]>([])
  /** Every proposal in the open conversation, as it stands now; tool parts carry only the id. */
  const proposals = ref(new Map<string, Data.Assistant.CopilotProposal>())
  let resumed = false
  /** A message shown in the thread, such as why a send was refused. */
  const notice = ref<string | null>(null)
  /** Set once the copilot has been switched off; nothing more can be sent. */
  const blocked = ref(false)
  let nextText = ''

  /** What the person has open, read from the page's own props; no dashboard page changes. */
  const pageContext = computed<CopilotPage | null>(() => {
    const record = pageRecords[page.component]
    if (!record) return null
    const value = (page.props as Record<string, unknown>)[record.prop]
    if (!value || typeof value !== 'object' || !('id' in value) || typeof value.id !== 'string')
      return null
    return { type: record.type, id: value.id }
  })

  const suggestions = computed(() => {
    const type = pageContext.value?.type
    return type && type in suggestedQuestions
      ? suggestedQuestions[type as keyof typeof suggestedQuestions]
      : suggestedQuestions.other
  })

  const messages = computed(() => chat.value?.messages ?? [])
  const status = computed(() => chat.value?.status ?? 'ready')
  const busy = computed(
    () => blocked.value || status.value === 'submitted' || status.value === 'streaming'
  )

  /** A refused request: switched off stops sending for good; the rest can be retried. */
  const refused = (statusCode: number, body: unknown) => {
    if (statusCode === 429) {
      notice.value = "You've sent a lot of messages. Please try again in a little while."
      return
    }
    if (statusCode === 503) {
      const message = serverMessage(body)
      if (message === 'The copilot has been switched off.') blocked.value = true
      notice.value = message
      return
    }
    notice.value = unavailable
  }

  /** Reopens a conversation with its messages and proposals. */
  const load = async (id: string, options: { proposalsOnly?: boolean } = {}) => {
    const { data } = await loading.get(urlFor('copilot.conversations.show', { id }))
    proposals.value = new Map((data.proposals ?? []).map((proposal) => [proposal.id, proposal]))
    if (options.proposalsOnly) return
    conversationId.value = data.id
    const loaded = data.messages?.length
      ? await validateUIMessages<CopilotUIMessage>({ messages: data.messages })
      : []
    if (chat.value) chat.value.messages = loaded
  }

  // Built after mounting so server rendering never touches the browser-only transport.
  onMounted(() => {
    chat.value = new Chat<CopilotUIMessage>({
      // A reply that proposed a change: fetch the proposal so its card can show.
      onFinish: async ({ message }) => {
        const proposed = message.parts.some(
          (part) =>
            part.type === 'tool-proposeChange' &&
            part.state === 'output-available' &&
            'proposalId' in part.output &&
            !proposals.value.has(part.output.proposalId)
        )
        if (proposed && conversationId.value)
          await load(conversationId.value, { proposalsOnly: true })
      },
      onError: (error) => {
        if (APICallError.isInstance(error) && error.statusCode)
          return refused(error.statusCode, error.responseBody)
        // A failed reply streams the server's own message; the person can send again.
        notice.value = error.message
      },
      transport: new DefaultChatTransport({
        prepareSendMessagesRequest: () => ({
          api: urlFor('copilot.conversations.messages.store', {
            conversationId: conversationId.value!,
          }),
          headers: { 'Accept': 'application/json', 'X-XSRF-TOKEN': xsrfToken() },
          body: { text: nextText, page: pageContext.value },
        }),
      }),
    })
  })

  const ensureConversation = async () => {
    if (!conversationId.value) {
      const created = await creating.submit()
      conversationId.value = created.data.id
    }
    return conversationId.value
  }

  /** Sends the person's message and streams the reply into the thread. */
  const send = async (text: string) => {
    const message = text.trim()
    if (!message || busy.value || !chat.value) return
    try {
      await ensureConversation()
    } catch (error) {
      if (error instanceof HttpResponseError)
        return refused(error.response.status, error.response.data)
      throw error
    }
    notice.value = null
    nextText = message
    await chat.value.sendMessage({ text: message })
  }

  /**
   * The first time the panel opens on a page, it picks up the person's most recent conversation,
   * so a conversation follows them from page to page.
   */
  watch(open, async (isOpen) => {
    if (!isOpen || resumed || conversationId.value) return
    resumed = true
    try {
      const { data } = await listing.submit()
      if (data[0] && !conversationId.value) await load(data[0].id)
    } catch {
      // Nothing to resume: the intro shows.
    }
  })

  /** Shows the person's past conversations; they can be reopened, never deleted. */
  const history = async () => {
    const { data } = await listing.submit()
    pastConversations.value = data
    showingHistory.value = true
  }

  const openPast = async (id: string) => {
    await load(id)
    showingHistory.value = false
  }

  /** Starts an empty conversation; the intro shows again. */
  const startNew = async () => {
    if (busy.value) return
    try {
      const created = await creating.submit()
      conversationId.value = created.data.id
    } catch (error) {
      if (error instanceof HttpResponseError)
        return refused(error.response.status, error.response.data)
      throw error
    }
    proposals.value = new Map()
    notice.value = null
    showingHistory.value = false
    if (chat.value) chat.value.messages = []
  }

  /** Apply or Not now on a proposal; after an apply the page underneath shows the new values. */
  const decide = async (proposalId: string, decision: 'apply' | 'dismiss') => {
    deciding.decision = decision
    notice.value = null
    let data
    try {
      ;({ data } = await deciding.patch(urlFor('copilot.proposals.update', { id: proposalId })))
    } catch (error) {
      if (error instanceof HttpResponseError && error.response.status === 503)
        return refused(503, error.response.data)
      // A refusal is stamped on the proposal; reload it so the card says why.
      if (conversationId.value)
        await load(conversationId.value, { proposalsOnly: true }).catch(() => {})
      return
    }
    proposals.value = new Map(proposals.value).set(data.proposal.id, data.proposal)
    if (data.message && chat.value) {
      const confirmation = await validateUIMessages<CopilotUIMessage>({ messages: [data.message] })
      chat.value.messages = [...chat.value.messages, ...confirmation]
    }
    if (decision === 'apply') router.reload()
  }

  return {
    open,
    available,
    pageContext,
    suggestions,
    messages,
    status,
    busy,
    send,
    notice,
    blocked,
    proposals,
    decide,
    history,
    openPast,
    startNew,
    showingHistory,
    pastConversations,
  }
}

export const provideDashboardCopilot = () => provide(copilotKey, createDashboardCopilot())

export const useDashboardCopilot = () => {
  const copilot = inject(copilotKey)
  if (!copilot) throw new Error('Copilot components require the dashboard layout.')
  return copilot
}
