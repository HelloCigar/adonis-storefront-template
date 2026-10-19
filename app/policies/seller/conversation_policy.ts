import { BasePolicy } from '@adonisjs/bouncer'
import type User from '#models/account/user'
import type AssistantConversation from '#models/assistant/assistant_conversation'

/** Admins review every conversation of both assistants; staff never can. */
export default class ConversationPolicy extends BasePolicy {
  viewAny(user: User) {
    return user.role === 'admin'
  }

  view(user: User, _conversation: AssistantConversation) {
    return user.role === 'admin'
  }
}
