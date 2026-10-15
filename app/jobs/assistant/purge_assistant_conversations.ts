import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import AssistantConversation from '#models/assistant/assistant_conversation'

/**
 * Removes conversations whose last message is older than the retention period. A bulk delete:
 * no model hooks need to run, and messages and proposals go with them through the cascade.
 */
export default class PurgeAssistantConversations extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'maintenance',
    timeout: '45s',
    maxRetries: 2,
    removeOnFail: { age: '30d', count: 1000 },
  }

  async execute() {
    for (;;) {
      const expired = await AssistantConversation.query()
        .withScopes((scopes) => scopes.expired())
        .select('id')
        .limit(500)
      if (!expired.length) return
      await AssistantConversation.query()
        .whereIn(
          'id',
          expired.map((conversation) => conversation.id)
        )
        .delete()
    }
  }
}
