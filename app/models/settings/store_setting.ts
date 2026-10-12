import { StoreSettingSchema } from '#database/schema'
import db from '@adonisjs/lucid/services/db'
import { sqlDateTime } from '#models/shared/sql_datetime'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import checkout from '#config/checkout'
import { defaultStoreName, storeEmail } from '#config/mail'

export default class StoreSetting extends StoreSettingSchema {
  static table = 'store_settings'

  /**
   * The store's one settings row, recreated with every value blank if it is missing. Several
   * lookups in one request can find it missing at once, so the insert ignores a lost race.
   */
  static async current(client?: TransactionClientContract) {
    const existing = await this.find(1, { client })
    if (existing) return existing
    await (client ?? db)
      .insertQuery()
      .table(this.table)
      .insert({ id: 1, created_at: sqlDateTime() })
      .knexQuery.onConflict('id')
      .ignore()
    return this.findOrFail(1, { client })
  }

  get setupFinished() {
    return Boolean(this.setupCompletedAt)
  }

  /** The first wizard step not saved yet, or null once every step is saved. */
  get nextSetupStep(): 'identity' | 'shipping' | 'policies' | null {
    if (!this.identitySavedAt) return 'identity'
    if (!this.shippingSavedAt) return 'shipping'
    if (!this.policiesSavedAt) return 'policies'
    return null
  }

  get checklistVisible() {
    return (
      this.setupFinished &&
      !this.checklistDismissedAt &&
      [this.productTickedAt, this.staffTickedAt, this.policiesTickedAt].some((at) => !at)
    )
  }

  /** The saved store name, or the deployment's default until an admin saves one. */
  get effectiveStoreName() {
    return this.storeName ?? defaultStoreName
  }

  /** The saved contact email, or the deployment's sending address until one is saved. */
  get effectiveContactEmail() {
    return this.contactEmail ?? storeEmail
  }

  /** The saved flat shipping fee in centavos, or the deployment's default. */
  get shippingFeeMinor() {
    return this.shippingMinor ?? checkout.flatShippingAmountMinor
  }
}
