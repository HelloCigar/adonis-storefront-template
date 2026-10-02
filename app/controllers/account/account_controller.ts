import { inject } from '@adonisjs/core'
import AccountService from '#services/account/account_service'
import CatalogueService from '#services/catalog/catalogue_service'
import OrderTransformer from '#transformers/checkout/order_transformer'
import ProductTransformer from '#transformers/catalog/product_transformer'
import UserTransformer from '#transformers/account/user_transformer'
import type User from '#models/account/user'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class AccountController {
  constructor(
    private accountService: AccountService,
    private catalogueService: CatalogueService
  ) {}

  show({ auth, inertia }: HttpContext) {
    let customerPromise: Promise<User> | undefined
    const loadCustomer = () =>
      (customerPromise ??= this.accountService.loadCustomer(auth.getUserOrFail().id))
    return inertia.render('account/index', {
      customer: async () => UserTransformer.transform(await loadCustomer()),
      recentOrders: async () => {
        const customer = await loadCustomer()
        return OrderTransformer.transform(customer.orders)
      },
      recommendedProducts: async () =>
        ProductTransformer.transform(await this.catalogueService.newestProducts(8)),
    })
  }
}
