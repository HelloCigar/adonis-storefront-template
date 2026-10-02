import type { HttpContext } from '@adonisjs/core/http'

export default class CustomersController {
  index({ response }: HttpContext) {
    return response.redirect().toRoute('seller.users.index')
  }
}
