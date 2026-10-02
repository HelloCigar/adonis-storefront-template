import User from '#models/account/user'
import { signupValidator } from '#validators/auth/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class NewAccountController {
  async create({ inertia }: HttpContext) {
    return inertia.render('auth/signup', {})
  }

  async store({ request, response, auth, session }: HttpContext) {
    const { fullName, email, password } = await request.validateUsing(signupValidator)
    const user = await User.create({ fullName, email, password })

    await auth.use('web').login(user)
    session.flash('success', 'Account created successfully')
    response.redirect().toRoute('dashboard')
  }
}
