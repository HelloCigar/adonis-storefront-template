import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { InferSharedProps as InferMiddlewareSharedProps } from '@adonisjs/inertia/types'
import UserTransformer from '#transformers/account/user_transformer'
import ContentTransformer from '#transformers/content/content_transformer'
import ContentService from '#services/content/content_service'
import { inject } from '@adonisjs/core'
import CartService from '#services/checkout/cart_service'
import CatalogueService from '#services/catalog/catalogue_service'
import CartTransformer from '#transformers/checkout/cart_transformer'
import SearchResultTransformer from '#transformers/catalog/search_result_transformer'
import { searchValidator } from '#validators/catalog/search'
import BaseInertiaMiddleware from '@adonisjs/inertia/inertia_middleware'
import StoreSetting from '#models/settings/store_setting'
import StoreSettingPolicy from '#policies/settings/store_setting_policy'
import type { PasskeySignal } from '@adonisplus/persona/passkeys/types'

@inject()
export default class InertiaMiddleware extends BaseInertiaMiddleware {
  constructor(
    private cartService: CartService,
    private catalogueService: CatalogueService,
    private contentService: ContentService
  ) {
    super()
  }

  share(ctx: HttpContext) {
    const { auth } = ctx as Partial<HttpContext>

    /**
     * Data shared with all Inertia pages. Make sure you are using
     * transformers for rich data-types like Models.
     */
    return {
      storeName: async () => {
        const settings = await StoreSetting.current()
        return settings.effectiveStoreName
      },
      storeContactEmail: async () => {
        const settings = await StoreSetting.current()
        return settings.effectiveContactEmail
      },
      errors: ctx.inertia.always(this.getValidationErrors(ctx)),
      user: ctx.inertia.always(auth?.user ? UserTransformer.transform(auth.user) : undefined),
      permissions: async () => ({
        manageStore: ctx.bouncer
          ? await ctx.bouncer.with('SellerAccessPolicy').allows('access')
          : false,
        manageUsers: ctx.bouncer
          ? await ctx.bouncer.with('SellerUserPolicy').allows('viewAny')
          : false,
        manageStoreSettings: ctx.bouncer
          ? await ctx.bouncer.with(StoreSettingPolicy).allows('update')
          : false,
      }),
      policies: async () => ContentTransformer.transform(await this.contentService.policies()),
      cart: async () => {
        const cart = await this.cartService.load(ctx.checkoutSession?.cartToken())
        return cart ? CartTransformer.transform(cart).depth(4) : null
      },
      searchResults: ctx.inertia.optional(async () => {
        const { search } = await ctx.request.validateUsing(searchValidator)
        return SearchResultTransformer.transform(await this.catalogueService.search(search)).depth(
          4
        )
      }),
    }
  }

  flash(ctx: HttpContext) {
    const { session } = ctx as Partial<HttpContext>

    return {
      success: session?.flashMessages.get('success') as string | undefined,
      error: session?.flashMessages.get('error') as string | undefined,
      passkeySignals: session?.flashMessages.get('passkeySignals') as PasskeySignal[] | undefined,
    }
  }

  async handle(ctx: HttpContext, next: NextFn) {
    await this.init(ctx)

    const output = await next()
    this.dispose(ctx)

    return output
  }
}

declare module '@adonisjs/inertia/types' {
  type MiddlewareSharedProps = InferMiddlewareSharedProps<InertiaMiddleware>
  export interface SharedProps extends MiddlewareSharedProps {}
}
