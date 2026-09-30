import { inject } from '@adonisjs/core'
import AccountService from '#services/account_service'
import { storefrontProfileValidator } from '#validators/storefront'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class ProfileController {
  constructor(private accountService: AccountService) {}

  async update({ auth, request, response }: HttpContext) {
    const data = await request.validateUsing(storefrontProfileValidator)
    await this.accountService.updateProfile(auth.getUserOrFail(), data)
    return response.redirect().toRoute('account.show')
  }
}
