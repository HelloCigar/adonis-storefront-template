import { test } from '@japa/runner'
import checkout from '#config/checkout'
import { CheckoutSession } from '#middleware/checkout/checkout_session_middleware'

function memorySession() {
  const values: Record<string, unknown> = {}
  return {
    values,
    store: {
      get: (key: string) => values[key],
      put: (key: string, value: unknown) => {
        values[key] = value
      },
    } as ConstructorParameters<typeof CheckoutSession>[0],
  }
}

test.group('Checkout session', () => {
  test('keeps only the newest grants and refreshes a reopened order', ({ assert }) => {
    const { store, values } = memorySession()
    const session = new CheckoutSession(store)
    for (let index = 0; index < checkout.sessionEntryLimit + 3; index++) {
      session.rememberOrderGrant(`order-${index}`, `token-${index}`)
    }
    const grants = values.store_order_grants as Record<string, string>
    assert.lengthOf(Object.keys(grants), checkout.sessionEntryLimit)
    assert.isUndefined(session.orderGrant('order-0'))

    const oldest = Object.keys(grants)[0]
    session.rememberOrderGrant(oldest, 'reopened')
    session.rememberOrderGrant('order-new', 'token-new')
    assert.equal(session.orderGrant(oldest), 'reopened')
    assert.lengthOf(Object.keys(values.store_order_grants as object), checkout.sessionEntryLimit)
  })

  test('creates, reuses and rotates the cart token', ({ assert }) => {
    const { store } = memorySession()
    const session = new CheckoutSession(store)
    assert.isUndefined(session.cartToken())
    const token = session.ensureCartToken()
    assert.equal(session.ensureCartToken(), token)
    session.rememberSubmission('submission', token)
    session.rotateCartToken()
    assert.notEqual(session.cartToken(), token)
    assert.equal(session.submissionCart('submission'), token)
  })

  test('ignores malformed session values', ({ assert }) => {
    const { store, values } = memorySession()
    values.store_cart_token = 42
    values.store_order_grants = ['not', 'a', 'map']
    values.store_checkout_submissions = { valid: 'cart', invalid: 7 }
    const session = new CheckoutSession(store)
    assert.isUndefined(session.cartToken())
    assert.isUndefined(session.orderGrant('0'))
    assert.equal(session.submissionCart('valid'), 'cart')
    assert.isUndefined(session.submissionCart('invalid'))
  })

  test('a full session stays well under the 4 KB cookie limit', ({ assert }) => {
    const { store, values } = memorySession()
    const session = new CheckoutSession(store)
    for (let index = 0; index < 50; index++) {
      session.rememberOrderGrant(crypto.randomUUID(), 'x'.repeat(43))
      session.rememberSubmission(crypto.randomUUID(), crypto.randomUUID())
    }
    // Encryption and base64 add roughly 40%; the session also holds auth and cart state.
    assert.isBelow(JSON.stringify(values).length * 1.4, 2048)
  })
})
