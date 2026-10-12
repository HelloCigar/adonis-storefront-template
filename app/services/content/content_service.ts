import { inject } from '@adonisjs/core'
import { Exception } from '@adonisjs/core/exceptions'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import storefront, { type StoreContent } from '#config/storefront'
import StorePolicy from '#models/settings/store_policy'
import RichTextService, { type RichTextDocument } from '#services/content/rich_text_service'
import {
  storePolicyHandles,
  storePolicyTitles,
  type StorePolicyHandle,
} from '#values/store_policy_handle'

/** Thrown so the exception handler renders the 404 status page, as `firstOrFail` does. */
function notFound(): never {
  throw new Exception('Content not found', { status: 404, code: 'E_CONTENT_NOT_FOUND' })
}

const managed = new Set<string>(storePolicyHandles)

@inject()
export default class ContentService {
  constructor(private richText: RichTextService) {}

  findPageOrFail(handle: string) {
    return storefront.pages.find((item) => item.handle === handle) ?? notFound()
  }

  /**
   * The four managed policies, each the admin's saved version when one exists and the
   * deployed one otherwise, followed by any other deployed policies. Empty ones are left out.
   */
  async policies(): Promise<StoreContent[]> {
    const rows = await StorePolicy.query()
    const saved = new Map(rows.map((policy) => [policy.handle, policy] as const))
    const deployed = new Map(storefront.policies.map((item) => [item.handle, item] as const))
    const own = storePolicyHandles.flatMap((handle): StoreContent[] => {
      const policy = saved.get(handle)
      if (policy) {
        return policy.contentHtml
          ? [{ id: handle, handle, title: storePolicyTitles[handle], body: policy.contentHtml }]
          : []
      }
      const fallback = deployed.get(handle)
      return fallback ? [fallback] : []
    })
    return [...own, ...storefront.policies.filter((item) => !managed.has(item.handle))]
  }

  async findPolicyOrFail(handle: string) {
    const policies = await this.policies()
    return policies.find((item) => item.handle === handle) ?? notFound()
  }

  /** The four policies as the editors open them: saved document, else deployed HTML, else blank. */
  async editablePolicies() {
    const rows = await StorePolicy.query()
    const saved = new Map(rows.map((policy) => [policy.handle, policy] as const))
    return storePolicyHandles.map((handle) => {
      const policy = saved.get(handle)
      const deployed = storefront.policies.find((item) => item.handle === handle)
      return {
        handle,
        title: storePolicyTitles[handle],
        content: policy ? policy.content : null,
        html: policy ? null : (deployed?.body ?? deployed?.contentHtml ?? null),
      }
    })
  }

  /** Saves all four policies as the admin wrote them; an empty one is kept but hidden. */
  async savePolicies(
    input: Partial<Record<StorePolicyHandle, unknown>>,
    trx?: TransactionClientContract
  ) {
    const rows = storePolicyHandles.map((handle) => {
      const content: RichTextDocument = this.richText.normalize(input[handle])
      return {
        handle,
        content,
        contentHtml: this.richText.hasContent(content) ? this.richText.toHtml(content) : '',
      }
    })
    const write = (client: TransactionClientContract) =>
      StorePolicy.updateOrCreateMany('handle', rows, { client })
    await (trx ? write(trx) : db.transaction(write))
  }
}
