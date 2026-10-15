import { randomUUID } from 'node:crypto'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

type Store = Pick<HttpContext['session'], 'get' | 'put' | 'forget'>

/** Session keys; tests use them to start a browser mid-conversation. */
export const assistantSessionKeys = {
  conversation: 'assistant_conversation_id',
  visitor: 'assistant_visitor_token',
} as const

/**
 * Typed access to the shopping assistant state kept in the session: the browser's current
 * conversation, and a random visitor token that rate-limits signed-out shoppers per browser.
 */
export class AssistantSession {
  constructor(private store: Store) {}

  /** The conversation this browser has open, if any. Whether it may still be opened is the policy's call. */
  currentConversationId(): string | undefined {
    const id = this.store.get(assistantSessionKeys.conversation)
    return typeof id === 'string' ? id : undefined
  }

  rememberConversation(id: string) {
    this.store.put(assistantSessionKeys.conversation, id)
  }

  /** Forgets the conversation only when it is the one this browser has open. */
  forgetConversation(id: string) {
    if (this.currentConversationId() === id) this.store.forget(assistantSessionKeys.conversation)
  }

  /** This browser's visitor token, created on first use. */
  visitorToken(): string {
    const token = this.store.get(assistantSessionKeys.visitor)
    if (typeof token === 'string') return token
    const created = randomUUID()
    this.store.put(assistantSessionKeys.visitor, created)
    return created
  }
}

export default class AssistantSessionMiddleware {
  handle(ctx: HttpContext, next: NextFn) {
    ctx.assistantSession = new AssistantSession(ctx.session)
    return next()
  }
}

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    assistantSession: AssistantSession
  }
}
