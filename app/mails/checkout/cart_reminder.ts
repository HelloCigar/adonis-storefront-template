import { BaseMail } from '@adonisjs/mail'
import { DateTime } from 'luxon'
import { signedUrlFor } from '@adonisjs/core/services/url_builder'
import { appUrl } from '#config/app'
import { storeEmail } from '#config/mail'
import StoreSetting from '#models/settings/store_setting'
import type Cart from '#models/checkout/cart'
import type User from '#models/account/user'

/** Matches the storefront's en-PH number and currency formatting. */
const locale = 'en-PH'

/**
 * One reminder about a cart left idle. Lists the lines that can still be bought at their
 * current price, so `cart.lines` must be preloaded with `variant.product` and already filtered.
 */
export default class CartReminder extends BaseMail {
  subject = 'You left something in your cart'

  constructor(
    private cart: Cart,
    private user: User
  ) {
    super()
  }

  async prepare() {
    const settings = await StoreSetting.current()
    // Overrides the mailer's deployment-wide brandName with the name the store saved.
    const view = { ...this.viewData(), brandName: settings.effectiveStoreName }
    this.message
      .from(storeEmail, settings.effectiveStoreName)
      .replyTo(settings.effectiveContactEmail)
      .to(this.user.email)
      .subject(this.subject)
      .messageId(`cart-reminder-${this.cart.id}@${new URL(appUrl).hostname}`)
      .htmlView('emails/cart_reminder', view)
      .textView('emails/cart_reminder_text', view)
  }

  /** Both views receive display-ready values, so templates hold no formatting rules. */
  private viewData() {
    const money = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.cart.currencyCode,
    })
    const items = this.cart.lines.map((line) => ({
      title: line.variant.product.title,
      variant: line.variant.title && line.variant.title !== 'Default' ? line.variant.title : null,
      quantity: line.quantity,
      unitPrice: money.format(line.variant.priceAmount),
      total: money.format(line.variant.priceAmount * line.quantity),
    }))
    const subtotal = this.cart.lines.reduce(
      (sum, line) => sum + line.variant.priceAmount * line.quantity,
      0
    )
    // The cart link lasts as long as the cart; the unsubscribe link outlives the reminder.
    // A numeric expiresIn is read as milliseconds.
    const cartLifetime = this.cart.expiresAt
      ? Math.max(Math.floor(this.cart.expiresAt.diff(DateTime.utc()).as('milliseconds')), 60_000)
      : '7 days'

    return {
      firstName: this.user.firstName,
      items,
      subtotal: money.format(subtotal),
      recoverUrl: signedUrlFor(
        'cart.recover',
        { id: this.cart.id },
        { expiresIn: cartLifetime, prefixUrl: appUrl }
      ),
      unsubscribeUrl: signedUrlFor(
        'cart_reminders.unsubscribe.show',
        { id: this.user.id },
        { expiresIn: '30 days', prefixUrl: appUrl }
      ),
    }
  }
}
