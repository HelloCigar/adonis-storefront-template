import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import User from '#models/account/user'
import Product from '#models/catalog/product'
import type StoreSetting from '#models/settings/store_setting'
import ContentService from '#services/content/content_service'

/**
 * The launch checklist ticks itself as the store gains a product for sale, a second team
 * member, and a published policy. A tick, once stamped, is never cleared.
 */
@inject()
export default class LaunchChecklistService {
  constructor(private content: ContentService) {}

  async review(settings: StoreSetting) {
    const now = DateTime.utc()
    if (!settings.productTickedAt && (await this.#hasProductForSale())) {
      settings.productTickedAt = now
    }
    if (!settings.staffTickedAt && (await this.#hasSecondTeamMember())) {
      settings.staffTickedAt = now
    }
    if (!settings.policiesTickedAt) {
      const policies = await this.content.policies()
      if (policies.length > 0) settings.policiesTickedAt = now
    }
    if (settings.$isDirty) await settings.save()

    return {
      product: Boolean(settings.productTickedAt),
      staff: Boolean(settings.staffTickedAt),
      policies: Boolean(settings.policiesTickedAt),
    }
  }

  async #hasProductForSale() {
    const product = await Product.query()
      .withScopes((scopes) => scopes.published())
      .whereHas('variants', (variants) => variants.where('available_for_sale', true))
      .first()
    return product !== null
  }

  async #hasSecondTeamMember() {
    const team = await User.query().whereIn('role', ['staff', 'admin']).count('* as total')
    return Number(team[0].$extras.total) >= 2
  }
}
