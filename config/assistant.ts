import env from '#start/env'

const provider = env.get('ASSISTANT_PROVIDER', 'gateway')

const assistantConfig = {
  /**
   * `gateway` routes through the Vercel AI Gateway, so any `provider/model` id works (for example
   * `openai/gpt-4o-mini` or `anthropic/claude-sonnet-4`). `openai` calls OpenAI directly.
   */
  provider,
  model: env.get('ASSISTANT_MODEL', provider === 'gateway' ? 'openai/gpt-4o-mini' : 'gpt-4o-mini'),
  /** The chosen provider's key; without one the shopping assistant can't be switched on. */
  apiKey:
    provider === 'gateway'
      ? env.get('AI_GATEWAY_API_KEY')?.release()
      : env.get('OPENAI_API_KEY')?.release(),
}

export default assistantConfig
