import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class SellerMiddleware {
  async handle({ bouncer }: HttpContext, next: NextFn) {
    await bouncer.with('SellerAccessPolicy').authorize('access')
    return next()
  }
}
