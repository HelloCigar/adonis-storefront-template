import { randomUUID } from 'node:crypto'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import mail from '@adonisjs/mail/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
import { urlFor } from '@adonisjs/core/services/url_builder'
import Cart from '#models/checkout/cart'
import CartReminder from '#mails/checkout/cart_reminder'
import { UserFactory } from '#database/factories/user_factory'
import { sellable } from '#tests/helpers/checkout_discounts'
import SweepCartReminders from '#jobs/checkout/sweep_cart_reminders'
import { sqlDateTime } from '#models/shared/sql_datetime'
import { runQueue } from '#tests/helpers/queue'
import {
  idleCart,
  recoveryLinkIn,
  signedLinkExpiry,
  sweepCartReminders,
} from '#tests/helpers/cart_reminders'

test.group('Cart reminders', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('a customer gets one reminder for a cart left idle for four hours', async ({ assert }) => {
    using fake = mail.fake()
    const { user, cart, variant } = await idleCart(5)

    await sweepCartReminders()

    fake.mails.assertSent(CartReminder, ({ message }) => {
      message.assertHtmlIncludes(variant.product.title)
      message.assertHtmlIncludes('Return to your cart')
      return message.hasTo(user.email) && message.hasSubject('You left something in your cart')
    })
    await cart.refresh()
    assert.isNotNull(cart.reminderSentAt)

    await sweepCartReminders()
    fake.mails.assertSentCount(CartReminder, 1)
  })

  test('the cart link keeps working for as long as the cart does', async ({ assert }) => {
    using fake = mail.fake()
    const { cart } = await idleCart(5)

    await sweepCartReminders()

    const [sent] = fake.mails.sent((reminder) => reminder instanceof CartReminder)
    const expiry = signedLinkExpiry(recoveryLinkIn(sent as CartReminder))
    assert.isNotNull(expiry)
    assert.closeTo(expiry!.toMillis(), cart.expiresAt!.toMillis(), 60_000)
  })

  test('a cart touched after the sweep is not reminded until it goes idle again', async ({
    assert,
  }) => {
    using fake = mail.fake()
    const { cart } = await idleCart(5)
    await SweepCartReminders.dispatch({})
    await runQueue(['maintenance'])
    await Cart.query().where('id', cart.id).update({ updatedAt: sqlDateTime() })

    await runQueue(['notifications'])

    fake.mails.assertNoneSent()
    await cart.refresh()
    assert.isNull(cart.reminderSentAt)
  })

  test('no reminder for {title}')
    .with([
      { title: 'a cart idle for two hours', setup: () => idleCart(2) },
      {
        title: 'a guest cart',
        setup: async () => {
          const { cart } = await idleCart(5)
          await Cart.query().where('id', cart.id).update({ userId: null })
        },
      },
      {
        title: 'a customer who opted out',
        setup: async () =>
          idleCart(5, {
            user: await UserFactory.merge({ cartRemindersOptedOutAt: DateTime.utc() })
              .apply('verified')
              .create(),
          }),
      },
      {
        title: 'an unverified account',
        setup: async () => idleCart(5, { user: await UserFactory.apply('unverified').create() }),
      },
      {
        title: 'a cart already reminded',
        setup: () => idleCart(5, { cart: { reminderSentAt: DateTime.utc().minus({ hours: 1 }) } }),
      },
      { title: 'a cart idle for eight days', setup: () => idleCart(8 * 24) },
      {
        title: 'a submitted cart',
        setup: () => idleCart(5, { cart: { status: 'completed', expiresAt: null } }),
      },
      {
        title: 'a cart whose only item can no longer be bought',
        setup: async () => {
          const { variant } = await idleCart(5)
          variant.availableForSale = false
          await variant.save()
        },
      },
    ])
    .run(async (_ctx, row) => {
      using fake = mail.fake()
      await row.setup()

      await sweepCartReminders()

      fake.mails.assertNoneSent()
    })

  test('only the newest of a customer’s carts is reminded', async ({ assert }) => {
    using fake = mail.fake()
    const { user, cart: older } = await idleCart(30)
    const { cart: newer } = await idleCart(6, { user })

    await sweepCartReminders()

    fake.mails.assertSentCount(CartReminder, 1)
    await older.refresh()
    await newer.refresh()
    assert.isNull(older.reminderSentAt)
    assert.isNotNull(newer.reminderSentAt)
  })

  test('a guest cart becomes the customer’s once they add to it signed in', async ({
    assert,
    client,
  }) => {
    const token = randomUUID()
    const customer = await UserFactory.apply('verified').create()
    const first = await sellable(100)
    const second = await sellable(200)
    await client
      .post(urlFor('cart.add'))
      .withSession({ store_cart_token: token })
      .withCsrfToken()
      .form({ variantId: first.id, quantity: 1 })
      .redirects(0)
    const guestCart = await Cart.findByOrFail('token', token)
    assert.isNull(guestCart.userId)

    await client
      .post(urlFor('cart.add'))
      .withSession({ store_cart_token: token })
      .withCsrfToken()
      .loginAs(customer)
      .form({ variantId: second.id, quantity: 1 })
      .redirects(0)

    await guestCart.refresh()
    assert.equal(guestCart.userId, customer.id)
  })

  test('changing a quantity counts as cart activity', async ({ assert, client }) => {
    const { user, cart } = await idleCart(5)
    await cart.load('lines')

    await client
      .patch(urlFor('cart.update', { id: cart.lines[0].id }))
      .withSession({ store_cart_token: cart.token })
      .withCsrfToken()
      .loginAs(user)
      .form({ quantity: 2 })
      .redirects(0)

    await cart.refresh()
    assert.isAbove(cart.updatedAt!.toMillis(), DateTime.utc().minus({ minutes: 1 }).toMillis())
  })
})
