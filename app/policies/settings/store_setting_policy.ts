import type User from '#models/account/user'
import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'

/** Store setup, the launch checklist, and store settings are for administrators only. */
export default class StoreSettingPolicy extends BasePolicy {
  setup(user: User): AuthorizerResponse {
    return user.role === 'admin'
  }

  update(user: User): AuthorizerResponse {
    return user.role === 'admin'
  }

  updatePolicies(user: User): AuthorizerResponse {
    return user.role === 'admin'
  }

  updateShoppingAssistant(user: User): AuthorizerResponse {
    return user.role === 'admin'
  }

  updateDashboardCopilot(user: User): AuthorizerResponse {
    return user.role === 'admin'
  }

  dismissChecklist(user: User): AuthorizerResponse {
    return user.role === 'admin'
  }

  viewChecklist(user: User): AuthorizerResponse {
    return user.role === 'admin'
  }
}
