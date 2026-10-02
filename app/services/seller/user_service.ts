import type User from '#models/account/user'
import { errors } from '@vinejs/vine'
import type { Infer } from '@vinejs/vine/types'
import type { userUpdateValidator } from '#validators/seller/user'

export default class SellerUserService {
  async update(actor: User, user: User, payload: Infer<typeof userUpdateValidator>) {
    if (actor.id === user.id && payload.role !== 'seller') {
      throw new errors.E_VALIDATION_ERROR([
        { field: 'role', rule: 'self', message: 'You cannot remove your own seller access.' },
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
    await user.delete()
  }
}
