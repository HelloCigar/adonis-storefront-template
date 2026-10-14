import { inject } from '@adonisjs/core'
import AccountService from '#services/account/account_service'
import CustomerAddressService from '#services/account/customer_address_service'
import UserTransformer from '#transformers/account/user_transformer'
import { addressValidator } from '#validators/account/address'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class AddressesController {
  constructor(
    private addressService: CustomerAddressService,
    private accountService: AccountService
  ) {}

  async index({ auth, inertia, bouncer }: HttpContext) {
    const user = auth.getUserOrFail()
    await bouncer.with('AccountUserPolicy').authorize('view', user)
    const customer = await this.accountService.loadCustomer(user.id)

    return inertia.render('account/addresses', {
      customer: UserTransformer.transform(customer),
    })
  }

  async store({ auth, request, response, bouncer }: HttpContext) {
    const user = auth.getUserOrFail()
    await bouncer.with('AccountAddressPolicy').authorize('create', user)
    const data = await request.validateUsing(addressValidator)
    await this.addressService.create(user, data)
    return response.redirect().back('/account/addresses')
  }

  async update({ auth, params, request, response, bouncer }: HttpContext) {
    const user = auth.getUserOrFail()
    const address = await user.related('addresses').query().where('id', params.id).firstOrFail()
    await bouncer.with('AccountAddressPolicy').authorize('update', address)
    const data = await request.validateUsing(addressValidator)
    await this.addressService.update(user, address, data)
    return response.redirect().back('/account/addresses')
  }

  async destroy({ auth, params, response, bouncer }: HttpContext) {
    const user = auth.getUserOrFail()
    const address = await user.related('addresses').query().where('id', params.id).firstOrFail()
    await bouncer.with('AccountAddressPolicy').authorize('delete', address)
    await this.addressService.delete(user, address)
    return response.redirect().back('/account/addresses')
  }
}
