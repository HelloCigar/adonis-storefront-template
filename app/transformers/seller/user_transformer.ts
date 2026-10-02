import { BaseTransformer } from '@adonisjs/core/transformers'
import type User from '#models/account/user'

export default class SellerUserTransformer extends BaseTransformer<User> {
  toObject() {
    return this.pick(this.resource, ['id', 'fullName', 'email', 'role', 'createdAt'])
  }
}
