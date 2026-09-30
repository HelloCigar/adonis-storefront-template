import { addressValidator, storefrontProfileValidator } from '#validators/storefront'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Product from '#models/product'
import OrderTransformer from '#transformers/order_transformer'
import ProductTransformer from '#transformers/product_transformer'
import UserTransformer from '#transformers/user_transformer'
import type { HttpContext } from '@adonisjs/core/http'

export default class AccountController {
  async show({ auth, inertia }: HttpContext) {
    let customerPromise: Promise<User> | undefined
    const loadCustomer = () =>
      (customerPromise ??= User.query()
        .where('id', auth.user!.id)
        .preload('defaultAddress')
        .preload('addresses', (query) => query.orderBy('created_at', 'asc'))
        .preload('orders', (query) => {
          query.preload('lineItems').preload('addresses').orderBy('processed_at', 'desc').limit(1)
        })
        .firstOrFail())

    return inertia.render('account/index', {
      customer: async () => UserTransformer.transform(await loadCustomer()),
      recentOrders: async () => {
        const customer = await loadCustomer()
        return OrderTransformer.transform(customer.orders)
      },
      recommendedProducts: async () =>
        ProductTransformer.transform(
          await Product.query()
            .where('status', 'active')
            .whereNotNull('published_at')
            .preload('variants', (query) => query.orderBy('position', 'asc'))
            .orderBy('published_at', 'desc')
            .limit(8)
        ),
    })
  }

  logout({ inertia }: HttpContext) {
    return inertia.render('account/logout', {})
  }

  async updateProfile({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(storefrontProfileValidator)
    const user = auth.user!
    user.merge({ firstName: data.firstName ?? null, lastName: data.lastName ?? null })
    user.fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || null
    await user.save()
    return response.redirect().toRoute('account.show')
  }

  async createAddress({ auth, request, response }: HttpContext) {
    const { defaultAddress, zip, territoryCode, ...data } =
      await request.validateUsing(addressValidator)
    const user = auth.user!
    await db.transaction(async (trx) => {
      user.useTransaction(trx)
      const created = await user
        .related('addresses')
        .create({ ...data, postalCode: zip, countryCode: territoryCode.toUpperCase() })
      if (defaultAddress || !user.defaultAddressId) {
        user.defaultAddressId = created.id
        await user.save()
      }
    })
    return response.redirect().toRoute('account.show')
  }

  async updateAddress({ auth, params, request, response }: HttpContext) {
    const { defaultAddress, zip, territoryCode, ...data } =
      await request.validateUsing(addressValidator)
    const user = auth.user!
    const address = await user.related('addresses').query().where('id', params.id).firstOrFail()
    await db.transaction(async (trx) => {
      address
        .useTransaction(trx)
        .merge({ ...data, postalCode: zip, countryCode: territoryCode.toUpperCase() })
      await address.save()
      if (defaultAddress) {
        user.useTransaction(trx)
        user.defaultAddressId = address.id
        await user.save()
      }
    })
    return response.redirect().toRoute('account.show')
  }

  async defaultAddress({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const address = await user.related('addresses').query().where('id', params.id).firstOrFail()
    user.defaultAddressId = address.id
    await user.save()
    return response.redirect().toRoute('account.show')
  }

  async deleteAddress({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const address = await user.related('addresses').query().where('id', params.id).firstOrFail()
    await db.transaction(async (trx) => {
      user.useTransaction(trx)
      address.useTransaction(trx)
      if (user.defaultAddressId === address.id) {
        user.defaultAddressId = null
        await user.save()
      }
      await address.delete()
    })
    return response.redirect().toRoute('account.show')
  }
}
