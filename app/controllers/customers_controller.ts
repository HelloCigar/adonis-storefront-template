import type { HttpContext } from '@adonisjs/core/http'

export default class CustomersController {
  index({ inertia }: HttpContext) {
    return inertia.render('customers', {})
  }
}
