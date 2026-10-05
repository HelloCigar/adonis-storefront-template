import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import SimulationService from '#services/payments/simulation_service'
import FakePayMongoService from '#providers/payments/fake_paymongo_service'
import { simulationValidator } from '#validators/payments/simulation'
import SimulationTransformer from '#transformers/payments/simulation_transformer'

/** HTTP controls belonging to the development adapter, outside application payment workflows. */
@inject()
export default class FakePayMongoController {
  constructor(
    private simulations: SimulationService,
    private gateway: FakePayMongoService
  ) {}

  async show({ params, inertia, response }: HttpContext) {
    this.gateway.assertEnabled()
    response.header('Cache-Control', 'private, no-store')
    response.header('Referrer-Policy', 'no-referrer')
    return inertia.render('payments/simulation', {
      simulation: SimulationTransformer.transform(
        await this.simulations.show({ provider: this.gateway.provider, id: params.id })
      ),
    })
  }

  async store({ params, request, response }: HttpContext) {
    this.gateway.assertEnabled()
    const { outcome } = await request.validateUsing(simulationValidator)
    const checkout = await this.gateway.changeCheckout(
      params.id,
      outcome === 'paid_without_notification' ? 'paid' : outcome
    )
    if (outcome !== 'paid_without_notification' && checkout.status !== 'pending')
      await this.simulations.update({ provider: checkout.provider, id: checkout.id })
    return checkout.status === 'pending'
      ? response.redirect().toRoute('payments.simulations.show', { id: checkout.id })
      : response.redirect().toRoute('checkout.orders.show', { publicId: checkout.reference! })
  }
}
