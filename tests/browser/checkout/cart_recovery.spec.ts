import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { cartRecoveryUrl, idleCart } from '#tests/helpers/cart_reminders'

// Recovery links carry a signature, so these tests visit signed URLs instead of route().
test.group('Cart recovery links', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('opening the link restores the cart and opens it', async ({ visit, route }) => {
    const { cart, lineTitle } = await idleCart(5)

    const page = await visit(cartRecoveryUrl(cart.id))

    await page.assertPath(route('home'))
    const drawer = page.getByRole('dialog', { name: 'Your cart', exact: true })
    await page.assertVisible(drawer)
    await page.assertVisible(drawer.getByText(lineTitle, { exact: true }))
  })

  test('a tampered link is refused', async ({ visit }) => {
    const { cart } = await idleCart(5)

    const page = await visit(`${cartRecoveryUrl(cart.id)}x`)

    await page.assertVisible(page.getByText('This cart link has expired.', { exact: true }))
  })

  test('a link for a checked-out cart says the cart is gone', async ({ visit }) => {
    const { cart } = await idleCart(5, { cart: { status: 'completed', expiresAt: null } })

    const page = await visit(cartRecoveryUrl(cart.id))

    await page.assertVisible(page.getByText('This cart is no longer available.', { exact: true }))
  })
})
