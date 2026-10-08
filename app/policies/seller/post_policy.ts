import { BasePolicy } from '@adonisjs/bouncer'
import type User from '#models/account/user'
import type BlogPost from '#models/content/blog_post'

export default class PostPolicy extends BasePolicy {
  viewAny(user: User) {
    return user.isStoreStaff
  }

  create(user: User) {
    return user.isStoreStaff
  }

  update(user: User, _post: BlogPost) {
    return user.isStoreStaff
  }

  delete(user: User, _post: BlogPost) {
    return user.isStoreStaff
  }
}
