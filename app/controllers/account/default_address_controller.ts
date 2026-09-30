import { inject } from '@adonisjs/core'
import CustomerAddressService from '#services/customer_address_service'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class DefaultAddressController {
  constructor(private addressService: CustomerAddressService) {}

  async update({ auth, params, response }: HttpContext) {
    await this.addressService.setDefault(auth.getUserOrFail(), params.id)
    return response.redirect().toRoute('account.show')
  }
}
