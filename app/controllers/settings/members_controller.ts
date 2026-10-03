import type { HttpContext } from '@adonisjs/core/http'

export default class MembersController {
  async index({ response, bouncer }: HttpContext) {
    await bouncer.with('SellerUserPolicy').authorize('viewAny')
    return response.redirect().toRoute('seller.users.index')
  }
}
