import { BaseTransformer } from '@adonisjs/core/transformers'
import type SummaryService from '#services/dashboard/summary_service'

export default class SummaryTransformer extends BaseTransformer<
  Awaited<ReturnType<SummaryService['summarize']>>
> {
  toObject() {
    return this.resource
  }
}
