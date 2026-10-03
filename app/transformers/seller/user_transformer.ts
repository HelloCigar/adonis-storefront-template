import { BaseTransformer } from '@adonisjs/core/transformers'
import type User from '#models/account/user'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'

export default class SellerUserTransformer extends BaseTransformer<User> {
  @inject()
  async toObject({ bouncer }: HttpContext) {
    return {
      ...this.pick(this.resource, ['id', 'fullName', 'email', 'role', 'createdAt']),
      can: {
        edit: await bouncer.with('SellerUserPolicy').allows('update', this.resource),
        delete: await bouncer.with('SellerUserPolicy').allows('delete', this.resource),
      },
    }
  }
}
