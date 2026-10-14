import User from '#models/account/user'

export default class AccountService {
  loadCustomer(userId: string) {
    return User.query()
      .where('id', userId)
      .preload('defaultAddress')
      .preload('addresses', (query) => query.orderBy('created_at', 'asc'))
      .preload('orders', (query) => {
        query.preload('lineItems').preload('addresses').orderBy('processed_at', 'desc').limit(1)
      })
      .firstOrFail()
  }
}
