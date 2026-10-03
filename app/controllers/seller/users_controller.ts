import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import User from '#models/account/user'
import SellerUserTransformer from '#transformers/seller/user_transformer'
import SellerUserService from '#services/seller/user_service'
import { userCreateValidator, userUpdateValidator } from '#validators/seller/user'

@inject()
export default class UsersController {
  constructor(private users: SellerUserService) {}

  async index({ inertia, auth, bouncer }: HttpContext) {
    await bouncer.with('SellerUserPolicy').authorize('viewAny')
    return inertia.render('seller/users', {
      users: SellerUserTransformer.transform(await User.query().orderBy('id', 'desc')),
      currentUserId: auth.user!.id,
      canAssignAdmin: await bouncer.with('SellerUserPolicy').allows('assignRole', 'admin'),
    })
  }
  async store({ request, response, session, bouncer }: HttpContext) {
    await bouncer.with('SellerUserPolicy').authorize('create')
    const payload = await request.validateUsing(userCreateValidator)
    await bouncer.with('SellerUserPolicy').authorize('assignRole', payload.role)
    await User.create(payload)
    session.flash('success', 'User created')
    return response.redirect().toRoute('seller.users.index')
  }
  async update({ params, auth, request, response, session, bouncer }: HttpContext) {
    const user = await User.findOrFail(params.id)
    await bouncer.with('SellerUserPolicy').authorize('update', user)
    const payload = await request.validateUsing(userUpdateValidator, { meta: { id: user.id } })
    await bouncer.with('SellerUserPolicy').authorize('assignRole', payload.role, user)
    await this.users.update(auth.user!, user, payload)
    session.flash('success', 'User updated')
    return response.redirect().toRoute('seller.users.index')
  }
  async destroy({ params, auth, response, session, bouncer }: HttpContext) {
    const user = await User.findOrFail(params.id)
    await bouncer.with('SellerUserPolicy').authorize('delete', user)
    await this.users.destroy(auth.user!, user)
    session.flash('success', 'User deleted')
    return response.redirect().toRoute('seller.users.index')
  }
}
