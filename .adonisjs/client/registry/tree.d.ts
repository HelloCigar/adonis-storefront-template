/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  newAccount: {
    create: typeof routes['new_account.create']
    store: typeof routes['new_account.store']
  }
  session: {
    create: typeof routes['session.create']
    store: typeof routes['session.store']
    destroy: typeof routes['session.destroy']
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
