import { inject } from '@adonisjs/core'
import CustomerAddressService from '#services/account/customer_address_service'
import { addressValidator } from '#validators/account/address'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class AddressesController {
  constructor(private addressService: CustomerAddressService) {}

  async store({ auth, request, response, bouncer }: HttpContext) {
    await bouncer.with('AccountAddressPolicy').authorize('create', auth.getUserOrFail())
    const data = await request.validateUsing(addressValidator)
    await this.addressService.create(auth.getUserOrFail(), data)
    return response.redirect().toRoute('account.show')
  }

  async update({ auth, params, request, response, bouncer }: HttpContext) {
    const address = await auth
      .getUserOrFail()
      .related('addresses')
      .query()
      .where('id', params.id)
      .firstOrFail()
    await bouncer.with('AccountAddressPolicy').authorize('update', address)
    const data = await request.validateUsing(addressValidator)
    await this.addressService.update(auth.getUserOrFail(), params.id, data)
    return response.redirect().toRoute('account.show')
  }

  async destroy({ auth, params, response, bouncer }: HttpContext) {
    const address = await auth
      .getUserOrFail()
      .related('addresses')
      .query()
      .where('id', params.id)
      .firstOrFail()
    await bouncer.with('AccountAddressPolicy').authorize('delete', address)
    await this.addressService.delete(auth.getUserOrFail(), params.id)
    return response.redirect().toRoute('account.show')
  }
}
