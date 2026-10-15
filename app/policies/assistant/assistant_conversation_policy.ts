import type User from '#models/account/user'
import type AssistantConversation from '#models/assistant/assistant_conversation'
import { allowGuest, AuthorizationResponse, BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'

/**
 * A conversation with an owner belongs only to that shopper; one without is reachable only
 * through the session holding its id. Anything else is answered as if it didn't exist.
 */
export default class AssistantConversationPolicy extends BasePolicy {
  /** Any signed-in shopper can list their own past conversations. */
  viewAny(_user: User): AuthorizerResponse {
    return true
  }

  @allowGuest()
  view(
    user: User | null,
    conversation: AssistantConversation,
    sessionConversationId: string | undefined
  ): AuthorizerResponse {
    return reachable(user, conversation, sessionConversationId)
  }

  @allowGuest()
  send(
    user: User | null,
    conversation: AssistantConversation,
    sessionConversationId: string | undefined
  ): AuthorizerResponse {
    return reachable(user, conversation, sessionConversationId)
  }

  /** Only signed-in shoppers have a list to delete from, so ownerless conversations can't be. */
  delete(user: User, conversation: AssistantConversation): AuthorizerResponse {
    return conversation.userId === user.id ? true : notFound()
  }
}

function reachable(
  user: User | null,
  conversation: AssistantConversation,
  sessionConversationId: string | undefined
) {
  if (conversation.userId !== null) return user?.id === conversation.userId ? true : notFound()
  return conversation.id === sessionConversationId ? true : notFound()
}

function notFound() {
  return AuthorizationResponse.deny('Conversation not found', 404)
}
