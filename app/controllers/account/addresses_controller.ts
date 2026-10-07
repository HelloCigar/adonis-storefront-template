import { inject } from '@adonisjs/core'
import CustomerAddressService from '#services/account/customer_address_service'
import { addressValidator } from '#validators/account/address'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class AddressesController {
  constructor(private addressService: CustomerAddressService) {}

  async store({ auth, request, response, bouncer }: HttpContext) {
    const user = auth.getUserOrFail()
    await bouncer.with('AccountAddressPolicy').authorize('create', user)
    const data = await request.validateUsing(addressValidator)
    await this.addressService.create(user, data)
    return response.redirect().toRoute('account.show')
  }

  async update({ auth, params, request, response, bouncer }: HttpContext) {
    const user = auth.getUserOrFail()
    const address = await user.related('addresses').query().where('id', params.id).firstOrFail()
    await bouncer.with('AccountAddressPolicy').authorize('update', address)
    const data = await request.validateUsing(addressValidator)
    await this.addressService.update(user, address, data)
    return response.redirect().toRoute('account.show')
  }

  async destroy({ auth, params, response, bouncer }: HttpContext) {
    const user = auth.getUserOrFail()
    const address = await user.related('addresses').query().where('id', params.id).firstOrFail()
    await bouncer.with('AccountAddressPolicy').authorize('delete', address)
    await this.addressService.delete(user, address)
    return response.redirect().toRoute('account.show')
  }
}
