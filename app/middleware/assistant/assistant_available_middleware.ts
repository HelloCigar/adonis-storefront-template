import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import AssistantModelProvider from '#assistant/model_provider'
import AssistantUnavailableException from '#exceptions/assistant_unavailable_exception'
import StoreSetting from '#models/settings/store_setting'

/** Refuses every shopping assistant request while it is switched off or has no AI key. */
@inject()
export default class AssistantAvailableMiddleware {
  constructor(private models: AssistantModelProvider) {}

  async handle(_ctx: HttpContext, next: NextFn) {
    const settings = await StoreSetting.current()
    if (!settings.shoppingAssistantEnabled || !this.models.isConfigured()) {
      throw new AssistantUnavailableException(
        `The assistant isn't available right now. You can reach us at ${settings.effectiveContactEmail}.`
      )
    }
    return next()
  }
}
