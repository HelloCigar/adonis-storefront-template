import { Exception } from '@adonisjs/core/exceptions'

export type PaymentOutcome = 'not_submitted' | 'rejected' | 'unknown'

/** Safe to report: upstream bodies, credentials, and transport errors are excluded. */
export default class PaymentException extends Exception {
  readonly outcome: PaymentOutcome
  readonly retryable: boolean

  constructor(
    message: string,
    options: { code: string; status: number; outcome?: PaymentOutcome; retryable?: boolean },
    public readonly providerStatus?: number
  ) {
    super(message, options)
    this.outcome = options.outcome ?? 'not_submitted'
    this.retryable = options.retryable ?? false
  }
}
