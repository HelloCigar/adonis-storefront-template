import { DateTime } from 'luxon'
import { signedUrlFor } from '@adonisjs/core/services/url_builder'
import Cart from '#models/checkout/cart'
import type User from '#models/account/user'
import SweepCartReminders from '#jobs/checkout/sweep_cart_reminders'
import type CartReminder from '#mails/checkout/cart_reminder'
import { CartFactory } from '#database/factories/cart_factory'
import { CartLineFactory } from '#database/factories/cart_line_factory'
import { UserFactory } from '#database/factories/user_factory'
import { sqlDateTime } from '#models/shared/sql_datetime'
import { sellable } from '#tests/helpers/checkout_discounts'
import { runQueue } from '#tests/helpers/queue'

/** A verified customer's cart holding one sellable line, last touched `idleHours` ago. */
export async function idleCart(
  idleHours: number,
  { user, cart: values = {} }: { user?: User; cart?: Partial<Cart> } = {}
) {
  const owner = user ?? (await UserFactory.apply('verified').create())
  const cart = await CartFactory.merge({ userId: owner.id, ...values }).create()
  const variant = await sellable(250)
  await variant.load('product')
  await CartLineFactory.merge({ cartId: cart.id, productVariantId: variant.id }).create()
  // Saves stamp updated_at with the current time, so the idle period is written directly.
  await Cart.query()
    .where('id', cart.id)
    .update({ updatedAt: sqlDateTime(DateTime.utc().minus({ hours: idleHours })) })
  return { user: owner, cart, variant, lineTitle: `${variant.product.title} - ${variant.title}` }
}

/** Runs one reminder sweep and the reminder deliveries it queues. */
export async function sweepCartReminders() {
  await SweepCartReminders.dispatch({})
  await runQueue(['maintenance', 'notifications'])
}

/** The sent reminder's "Return to your cart" link. */
export function recoveryLinkIn(sent: CartReminder) {
  const html = String(sent.message.toJSON().message.html ?? '')
  const href = html.match(/href="([^"]*\/store\/cart\/recover\/[^"]*)"/)?.[1]
  if (!href) throw new Error('The reminder has no cart link')
  return new URL(href.replaceAll('&amp;', '&'))
}

/** When a signed link stops working, read from the expiry its signature carries. */
export function signedLinkExpiry(url: URL) {
  const [payload] = (url.searchParams.get('signature') ?? '').split('.')
  const { expiryDate } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  return expiryDate ? DateTime.fromISO(expiryDate) : null
}

/** The signed links a cart reminder carries, relative so browser tests can visit them. */
export const cartRecoveryUrl = (cartId: string) => signedUrlFor('cart.recover', { id: cartId })
export const cartReminderUnsubscribeUrl = (userId: string) =>
  signedUrlFor('cart_reminders.unsubscribe.show', { id: userId })
