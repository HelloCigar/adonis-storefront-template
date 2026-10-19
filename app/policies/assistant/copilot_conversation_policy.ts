import type User from '#models/account/user'
import type AssistantConversation from '#models/assistant/assistant_conversation'
import { AuthorizationResponse, BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'

/**
 * A copilot conversation belongs only to the staff member or admin who started it. Copilot
 * conversations are never reachable through a session, so one whose user was deleted matches
 * nobody; anything else is answered as if it didn't exist.
 */
export default class CopilotConversationPolicy extends BasePolicy {
  viewAny(user: User): AuthorizerResponse {
    return user.isStoreStaff
  }

  create(user: User): AuthorizerResponse {
    return user.isStoreStaff
  }

  view(user: User, conversation: AssistantConversation): AuthorizerResponse {
    return ownConversation(user, conversation)
  }

  send(user: User, conversation: AssistantConversation): AuthorizerResponse {
    return ownConversation(user, conversation)
  }
}

function ownConversation(user: User, conversation: AssistantConversation) {
  const owned =
    conversation.assistant === 'copilot' && conversation.userId === user.id && user.isStoreStaff
  return owned ? true : AuthorizationResponse.deny('Conversation not found', 404)
}
