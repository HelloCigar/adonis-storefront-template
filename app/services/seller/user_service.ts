import db from '@adonisjs/lucid/services/db'
import type User from '#models/account/user'
import AssistantConversation from '#models/assistant/assistant_conversation'
import { errors } from '@vinejs/vine'
import type { Infer } from '@vinejs/vine/types'
import type { userUpdateValidator } from '#validators/seller/user'

export default class SellerUserService {
  async update(actor: User, user: User, payload: Infer<typeof userUpdateValidator>) {
    if (actor.id === user.id && payload.role !== actor.role) {
      throw new errors.E_VALIDATION_ERROR([
        {
          field: 'role',
          rule: 'self',
          message: `You cannot remove your own ${actor.role} access.`,
        },
      ])
    }
    await user.merge(payload).save()
  }

  async destroy(actor: User, user: User) {
    if (actor.id === user.id) {
      throw new errors.E_VALIDATION_ERROR([
        { field: 'delete', rule: 'self', message: 'You cannot delete your own account.' },
      ])
    }
    // Shoppers' chats go with them; copilot conversations stay for review, their user link nulled.
    await db.transaction(async (trx) => {
      await AssistantConversation.query({ client: trx })
        .where('user_id', user.id)
        .withScopes((scopes) => scopes.ofAssistant('shopping'))
        .delete()
      user.useTransaction(trx)
      await user.delete()
    })
  }
}
