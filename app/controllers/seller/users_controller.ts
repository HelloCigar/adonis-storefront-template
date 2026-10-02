import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import User from '#models/account/user'
import SellerUserTransformer from '#transformers/seller/user_transformer'
import SellerUserService from '#services/seller/user_service'
import { userCreateValidator, userUpdateValidator } from '#validators/seller/user'

@inject()
export default class UsersController {
  constructor(private users: SellerUserService) {}

  async index({ inertia, auth }: HttpContext) {
    return inertia.render('seller/users', {
      users: SellerUserTransformer.transform(await User.query().orderBy('id', 'desc')),
      currentUserId: auth.user!.id,
    })
  }
  async store({ request, response, session }: HttpContext) {
    await User.create(await request.validateUsing(userCreateValidator))
    session.flash('success', 'User created')
    return response.redirect().toRoute('seller.users.index')
  }
  async update({ params, auth, request, response, session }: HttpContext) {
    const user = await User.findOrFail(params.id)
    await this.users.update(
      auth.user!,
      user,
      await request.validateUsing(userUpdateValidator, { meta: { id: user.id } })
    )
    session.flash('success', 'User updated')
    return response.redirect().toRoute('seller.users.index')
  }
  async destroy({ params, auth, response, session }: HttpContext) {
    await this.users.destroy(auth.user!, await User.findOrFail(params.id))
    session.flash('success', 'User deleted')
    return response.redirect().toRoute('seller.users.index')
  }
}
