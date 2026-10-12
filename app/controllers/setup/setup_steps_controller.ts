import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import StoreSetting from '#models/settings/store_setting'
import StoreSettingPolicy from '#policies/settings/store_setting_policy'
import ContentService from '#services/content/content_service'
import MoneyService from '#services/checkout/money_service'
import StoreSettingTransformer from '#transformers/settings/store_setting_transformer'
import { storeIdentityValidator, storeShippingValidator } from '#validators/settings/store_setting'
import { storePoliciesValidator } from '#validators/settings/store_policy'

type SetupStep = NonNullable<StoreSetting['nextSetupStep']>

const steps: SetupStep[] = ['identity', 'shipping', 'policies']

@inject()
export default class SetupStepsController {
  constructor(private content: ContentService) {}

  async index({ response, bouncer }: HttpContext) {
    await bouncer.with(StoreSettingPolicy).authorize('setup')
    const settings = await StoreSetting.current()
    const step = settings.nextSetupStep
    if (settings.setupFinished || !step) return response.redirect().toRoute('dashboard')
    return response.redirect().toRoute('setup.show', { step })
  }

  async show({ params, inertia, response, bouncer, session }: HttpContext) {
    await bouncer.with(StoreSettingPolicy).authorize('setup')
    const settings = await StoreSetting.current()
    const step = params.step as SetupStep
    const next = settings.nextSetupStep
    if (settings.setupFinished || !next) return response.redirect().toRoute('dashboard')
    // Saved steps stay open for going back; later steps wait until the earlier ones are saved.
    if (steps.indexOf(step) > steps.indexOf(next)) {
      return response.redirect().toRoute('setup.show', { step: next })
    }
    // Opening the wizard counts as being offered it, so "Skip for now" is not bounced back.
    session.put('storeSetupOffered', true)
    return inertia.render('setup/show', {
      step,
      settings: StoreSettingTransformer.transform(settings).useVariant('forSetup'),
      editablePolicies: step === 'policies' ? await this.content.editablePolicies() : undefined,
    })
  }

  @inject()
  async update({ params, request, response, bouncer, session }: HttpContext, money: MoneyService) {
    await bouncer.with(StoreSettingPolicy).authorize('setup')
    const settings = await StoreSetting.current()
    if (settings.setupFinished) return response.redirect().toRoute('dashboard')

    const step = params.step as SetupStep
    if (step === 'identity') {
      const { storeName, contactEmail } = await request.validateUsing(storeIdentityValidator)
      settings.merge({ storeName, contactEmail, identitySavedAt: DateTime.utc() })
      await settings.save()
      return response.redirect().toRoute('setup.show', { step: 'shipping' })
    }

    if (step === 'shipping') {
      const { shippingFee } = await request.validateUsing(storeShippingValidator)
      settings.merge({ shippingMinor: money.toMinor(shippingFee), shippingSavedAt: DateTime.utc() })
      await settings.save()
      return response.redirect().toRoute('setup.show', { step: 'policies' })
    }

    const { policies } = await request.validateUsing(storePoliciesValidator)
    // The policies and the finished stamp commit together, so setup never ends half-saved.
    await db.transaction(async (trx) => {
      await this.content.savePolicies(policies, trx)
      const locked = await StoreSetting.findOrFail(1, { client: trx })
      const now = DateTime.utc()
      locked.merge({ policiesSavedAt: now, setupCompletedAt: now })
      await locked.save()
    })
    session.flash('success', 'Your store is set up.')
    return response.redirect().toRoute('dashboard')
  }
}
