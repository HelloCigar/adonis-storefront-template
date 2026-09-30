/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  home: typeof routes['home']
  collections: {
    index: typeof routes['collections.index']
    show: typeof routes['collections.show']
  }
  products: {
    show: typeof routes['products.show']
  }
  pages: {
    show: typeof routes['pages.show']
  }
  policies: {
    index: typeof routes['policies.index']
    show: typeof routes['policies.show']
  }
  blogs: {
    show: typeof routes['blogs.show']
  }
  articles: {
    show: typeof routes['articles.show']
  }
  cart: {
    add: typeof routes['cart.add']
    update: typeof routes['cart.update']
    remove: typeof routes['cart.remove']
  }
  newAccount: {
    create: typeof routes['new_account.create']
    store: typeof routes['new_account.store']
  }
  session: {
    create: typeof routes['session.create']
    store: typeof routes['session.store']
    destroy: typeof routes['session.destroy']
  }
  account: {
    show: typeof routes['account.show']
    logout: typeof routes['account.logout']
    profile: {
      update: typeof routes['account.profile.update']
    }
    addresses: {
      create: typeof routes['account.addresses.create']
      update: typeof routes['account.addresses.update']
      default: typeof routes['account.addresses.default']
      delete: typeof routes['account.addresses.delete']
    }
  }
  orders: {
    index: typeof routes['orders.index']
    show: typeof routes['orders.show']
  }
  dashboard: typeof routes['dashboard']
  inbox: typeof routes['inbox']
  customers: typeof routes['customers']
  settings: typeof routes['settings'] & {
    update: typeof routes['settings.update']
    avatar: {
      destroy: typeof routes['settings.avatar.destroy']
    }
    members: typeof routes['settings.members']
    notifications: typeof routes['settings.notifications']
    security: typeof routes['settings.security']
    password: {
      update: typeof routes['settings.password.update']
    }
  }
}
