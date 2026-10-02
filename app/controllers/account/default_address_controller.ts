import { inject } from '@adonisjs/core'
import CustomerAddressService from '#services/account/customer_address_service'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class DefaultAddressController {
  constructor(private addressService: CustomerAddressService) {}

  async update({ auth, params, response, bouncer }: HttpContext) {
    const address = await auth
      .getUserOrFail()
      .related('addresses')
      .query()
      .where('id', params.id)
      .firstOrFail()
    await bouncer.with('AccountAddressPolicy').authorize('setDefault', address)
    await this.addressService.setDefault(auth.getUserOrFail(), params.id)
    return response.redirect().toRoute('account.show')
  }
}
