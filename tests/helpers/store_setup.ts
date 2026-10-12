import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import { getActiveTestOrFail } from '@japa/runner'
import storefront from '#config/storefront'
import StorePolicy from '#models/settings/store_policy'
import StoreSetting from '#models/settings/store_setting'
import RichTextService from '#services/content/rich_text_service'
import type { StorePolicyHandle } from '#values/store_policy_handle'

type SetupStep = NonNullable<StoreSetting['nextSetupStep']>

type StoreSettingsOptions = {
  storeName?: string
  contactEmail?: string
  shippingMinor?: number
  savedSteps?: SetupStep[]
}

const stampColumn = {
  identity: 'identitySavedAt',
  shipping: 'shippingSavedAt',
  policies: 'policiesSavedAt',
} as const

/** A store whose settings were saved, with the chosen wizard steps already done. */
export async function savedStoreSettings(options: StoreSettingsOptions = {}) {
  const settings = await StoreSetting.current()
  const now = DateTime.utc()
  if (options.storeName !== undefined) settings.storeName = options.storeName
  if (options.contactEmail !== undefined) settings.contactEmail = options.contactEmail
  if (options.shippingMinor !== undefined) settings.shippingMinor = options.shippingMinor
  for (const step of options.savedSteps ?? []) settings[stampColumn[step]] = now
  await settings.save()
  return settings
}

/** A store whose setup an admin has finished. */
export async function finishedStoreSetup(options: Omit<StoreSettingsOptions, 'savedSteps'> = {}) {
  const settings = await savedStoreSettings({
    ...options,
    savedSteps: ['identity', 'shipping', 'policies'],
  })
  settings.setupCompletedAt = DateTime.utc()
  await settings.save()
  return settings
}

/** A policy an admin has saved, written as one paragraph. */
export async function savedStorePolicy(handle: StorePolicyHandle, text: string) {
  const richText = await app.container.make(RichTextService)
  const content = richText.normalize({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  })
  return StorePolicy.updateOrCreate(
    { handle },
    { content, contentHtml: richText.hasContent(content) ? richText.toHtml(content) : '' }
  )
}

/** A policy supplied with the deployment's storefront configuration, removed when the test ends. */
export function deployedStorePolicy(handle: string, title: string, body: string) {
  const policy = { id: handle, handle, title, body }
  storefront.policies.push(policy)
  getActiveTestOrFail().cleanup(() => {
    const index = storefront.policies.indexOf(policy)
    if (index !== -1) storefront.policies.splice(index, 1)
  })
  return policy
}
