import User from '#models/user'
import type { Infer } from '@vinejs/vine/types'
import type { storefrontProfileValidator } from '#validators/storefront'

export default class AccountService {
  loadCustomer(userId: number) {
    return User.query()
      .where('id', userId)
      .preload('defaultAddress')
      .preload('addresses', (query) => query.orderBy('created_at', 'asc'))
      .preload('orders', (query) => {
        query.preload('lineItems').preload('addresses').orderBy('processed_at', 'desc').limit(1)
      })
      .firstOrFail()
  }

  async updateProfile(user: User, data: Infer<typeof storefrontProfileValidator>) {
    user.merge({ firstName: data.firstName ?? null, lastName: data.lastName ?? null })
    user.fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || null
    await user.save()
  }
}
