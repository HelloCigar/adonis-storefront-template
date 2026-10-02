import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class SellerMiddleware {
  async handle({ auth, response }: HttpContext, next: NextFn) {
    if (auth.user?.role !== 'seller') return response.forbidden('Seller access required')
    return next()
  }
}
