import { BaseTransformer } from '@adonisjs/core/transformers'
import type QuoteService from '#services/checkout/quote_service'

export default class QuoteTransformer extends BaseTransformer<
  Awaited<ReturnType<QuoteService['quote']>>
> {
  toObject() {
    return this.resource
  }
}
