import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import SimulationService from '#services/payments/simulation_service'
import FakePayMongoService from '#services/payments/fake_paymongo_service'
import { simulationValidator } from '#validators/payments/simulation'
import SimulationTransformer from '#transformers/payments/simulation_transformer'

@inject()
export default class SimulationsController {
  constructor(
    private simulations: SimulationService,
    private gateway: FakePayMongoService
  ) {}

  async show({ params, inertia, response }: HttpContext) {
    response.header('Cache-Control', 'private, no-store')
    response.header('Referrer-Policy', 'no-referrer')
    return inertia.render('payments/simulation', {
      simulation: SimulationTransformer.transform(await this.simulations.show(params.id)),
    })
  }

  async store({ params, request, response }: HttpContext) {
    this.gateway.assertEnabled()
    const { outcome } = await request.validateUsing(simulationValidator)
    const checkout = await this.simulations.update(params.id, outcome)
    return checkout.status === 'pending'
      ? response.redirect().toRoute('payments.simulations.show', { id: checkout.id })
      : response.redirect().toRoute('checkout.orders.show', { publicId: checkout.reference! })
  }
}
