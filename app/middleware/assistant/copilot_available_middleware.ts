import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import AssistantModelProvider from '#assistant/model_provider'
import AssistantUnavailableException from '#exceptions/assistant_unavailable_exception'
import StoreSetting from '#models/settings/store_setting'

/** Refuses every copilot request, sending and applying alike, while it is off or has no AI key. */
@inject()
export default class CopilotAvailableMiddleware {
  constructor(private models: AssistantModelProvider) {}

  async handle(_ctx: HttpContext, next: NextFn) {
    const settings = await StoreSetting.current()
    if (!settings.dashboardCopilotEnabled) {
      throw new AssistantUnavailableException('The copilot has been switched off.')
    }
    if (!this.models.isConfigured()) {
      throw new AssistantUnavailableException(
        "The copilot isn't available right now. Please try again in a moment."
      )
    }
    return next()
  }
}
