import { Exception } from '@adonisjs/core/exceptions'
import storefront from '#config/storefront'

/** Thrown so the exception handler renders the 404 status page, as `firstOrFail` does. */
function notFound(): never {
  throw new Exception('Content not found', { status: 404, code: 'E_CONTENT_NOT_FOUND' })
}

export default class ContentService {
  findPageOrFail(handle: string) {
    return storefront.pages.find((item) => item.handle === handle) ?? notFound()
  }

  policies() {
    return storefront.policies
  }

  findPolicyOrFail(handle: string) {
    return storefront.policies.find((item) => item.handle === handle) ?? notFound()
  }
}
