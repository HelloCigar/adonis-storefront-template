import { createGateway, type LanguageModel } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import assistantConfig from '#config/assistant'

/**
 * The deployment's AI model for the shopping assistant, through the Vercel AI Gateway or OpenAI
 * directly (config/assistant.ts). Resolved from the container so tests can swap in a scripted
 * model; without the provider's key the assistant can't be switched on.
 */
export default class AssistantModelProvider {
  isConfigured(): boolean {
    return Boolean(assistantConfig.apiKey)
  }

  languageModel(): LanguageModel {
    const { provider, model, apiKey } = assistantConfig
    return provider === 'gateway'
      ? createGateway({ apiKey })(model)
      : createOpenAI({ apiKey })(model)
  }
}
