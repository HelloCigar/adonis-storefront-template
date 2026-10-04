import { BaseTransformer } from '@adonisjs/core/transformers'
import type SimulationService from '#services/payments/simulation_service'

export default class SimulationTransformer extends BaseTransformer<
  Awaited<ReturnType<SimulationService['show']>>
> {
  toObject() {
    return this.pick(this.resource, ['id', 'reference', 'status', 'items', 'amountMinor', 'failed'])
  }
}
