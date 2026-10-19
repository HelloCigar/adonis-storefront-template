import { BaseTransformer } from '@adonisjs/core/transformers'
import type StoreSetting from '#models/settings/store_setting'
import checkout from '#config/checkout'
import { toMajor } from '#models/shared/money'

const currency = new Intl.NumberFormat('en-PH', { style: 'currency', currency: checkout.currency })

export default class StoreSettingTransformer extends BaseTransformer<StoreSetting> {
  #assistantConfigured: boolean

  /** `assistantConfigured`: whether the deployment has an AI key for the shopping assistant. */
  constructor(resource: StoreSetting, options: { assistantConfigured?: boolean } = {}) {
    super(resource)
    this.#assistantConfigured = options.assistantConfigured ?? false
  }

  /** Values the admin sees, with deployment defaults standing in for anything not saved yet. */
  toObject() {
    const fee = toMajor(this.resource.shippingFeeMinor)
    return {
      storeName: this.resource.effectiveStoreName,
      contactEmail: this.resource.effectiveContactEmail,
      shippingFee: { raw: fee, formatted: currency.format(fee) },
      shoppingAssistant: {
        enabled: this.resource.shoppingAssistantEnabled,
        configured: this.#assistantConfigured,
      },
      // One AI key serves both assistants.
      dashboardCopilot: {
        enabled: this.resource.dashboardCopilotEnabled,
        configured: this.#assistantConfigured,
      },
    }
  }

  forSetup() {
    return {
      ...this.toObject(),
      progress: {
        identity: Boolean(this.resource.identitySavedAt),
        shipping: Boolean(this.resource.shippingSavedAt),
        policies: Boolean(this.resource.policiesSavedAt),
      },
      nextStep: this.resource.nextSetupStep,
    }
  }
}
