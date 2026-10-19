import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import checkout from '#config/checkout'
import Cart from '#models/checkout/cart'
import CartReminder from '#mails/checkout/cart_reminder'
import { affectedRows } from '#models/shared/affected_rows'
import { sqlDateTime } from '#models/shared/sql_datetime'

/**
 * Reminds signed-in customers about carts they left behind, once per cart. A cart is claimed
 * before its reminder is queued, so a lost delivery means a missed reminder, never a second one.
 */
export default class CartReminderService {
  /** Stamps due carts as reminded and returns the ones this call claimed. */
  async claimDue(limit = 200) {
    const due = await Cart.query()
      .withScopes((scopes) => scopes.awaitingReminder())
      .select('carts.id')
      .orderBy('carts.updated_at')
      .limit(limit)
    const claimed: string[] = []
    for (const { id } of due) {
      const changed = await Cart.query()
        .where('id', id)
        .whereNull('reminder_sent_at')
        .update({ reminderSentAt: sqlDateTime() })
      if (affectedRows(changed) === 1) claimed.push(id)
    }
    return claimed
  }

  /** Sends the reminder unless the cart or its customer stopped qualifying since the claim. */
  async remind(cartId: string) {
    const cart = await Cart.query()
      .where('id', cartId)
      .where('status', 'active')
      .preload('user')
      .preload('lines', (lines) =>
        lines.orderBy('id').preload('variant', (variant) => variant.preload('product'))
      )
      .first()
    if (!cart?.user || !cart.user.receivesCartReminders || cart.user.hasInactiveAccount) return
    // The customer came back after the claim: release it so the next idle spell is reminded.
    const idleSince = DateTime.utc().minus(checkout.cartReminderDelayMs)
    if (cart.updatedAt && cart.updatedAt > idleSince) {
      await Cart.query()
        .where('id', cart.id)
        .whereNotNull('reminder_sent_at')
        .update({ reminderSentAt: null })
      return
    }
    const sellable = cart.lines.filter(
      (line) =>
        line.variant.isSellable &&
        line.variant.product.status === 'active' &&
        line.variant.product.publishedAt !== null
    )
    if (!sellable.length) return
    cart.$setRelated('lines', sellable)
    // This runs inside the durable SendCartReminder job. Await delivery before acknowledging it.
    await mail.send(new CartReminder(cart, cart.user))
  }
}
