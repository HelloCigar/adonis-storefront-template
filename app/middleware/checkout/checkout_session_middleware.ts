import { randomUUID } from 'node:crypto'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import checkout from '#config/checkout'

type Store = Pick<HttpContext['session'], 'get' | 'put'>

/**
 * Typed access to the guest checkout state kept in the session: the active cart token,
 * private order grants, and replay keys for submitted checkouts. The session may be
 * cookie-backed, so the maps keep only the newest entries.
 */
export class CheckoutSession {
  constructor(private store: Store) {}

  /** The active cart token, if this visitor has started a cart. */
  cartToken(): string | undefined {
    const token = this.store.get('store_cart_token')
    return typeof token === 'string' ? token : undefined
  }

  /** The active cart token, created on first use. */
  ensureCartToken(): string {
    const token = this.cartToken()
    if (token) return token
    const created = randomUUID()
    this.store.put('store_cart_token', created)
    return created
  }

  /** Starts a fresh cart after a checkout freezes the current one. */
  rotateCartToken() {
    this.store.put('store_cart_token', randomUUID())
  }

  orderGrant(publicId: string): string | undefined {
    return this.map('store_order_grants')[publicId]
  }

  rememberOrderGrant(publicId: string, token: string) {
    this.remember('store_order_grants', publicId, token)
  }

  /** The cart token a submission key was first used with, so retries replay that order. */
  submissionCart(submissionKey: string): string | undefined {
    return this.map('store_checkout_submissions')[submissionKey]
  }

  rememberSubmission(submissionKey: string, cartToken: string) {
    this.remember('store_checkout_submissions', submissionKey, cartToken)
  }

  private map(key: string): Record<string, string> {
    const value = this.store.get(key)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(
      Object.entries(value).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string'
      )
    )
  }

  /** Moves `entry` to the newest position and keeps the map within the configured limit. */
  private remember(key: string, entry: string, value: string) {
    const next = Object.entries(this.map(key)).filter(([existing]) => existing !== entry)
    next.push([entry, value])
    this.store.put(key, Object.fromEntries(next.slice(-checkout.sessionEntryLimit)))
  }
}

export default class CheckoutSessionMiddleware {
  handle(ctx: HttpContext, next: NextFn) {
    ctx.checkoutSession = new CheckoutSession(ctx.session)
    return next()
  }
}

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    checkoutSession: CheckoutSession
  }
}
