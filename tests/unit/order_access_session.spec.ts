import { test } from '@japa/runner'
import OrderAccessService from '#services/checkout/order_access_service'
import checkout from '#config/checkout'

test.group('Order access session entries', () => {
  test('keeps only the newest entries and refreshes reused keys', ({ assert }) => {
    const access = new OrderAccessService()
    let grants: Record<string, string> = {}
    for (let index = 0; index < checkout.sessionEntryLimit + 3; index++) {
      grants = access.remember(grants, `order-${index}`, `token-${index}`)
    }
    assert.lengthOf(Object.keys(grants), checkout.sessionEntryLimit)
    assert.notProperty(grants, 'order-0')

    const oldest = Object.keys(grants)[0]
    grants = access.remember(grants, oldest, 'reopened')
    grants = access.remember(grants, 'order-new', 'token-new')
    assert.equal(grants[oldest], 'reopened')
    assert.lengthOf(Object.keys(grants), checkout.sessionEntryLimit)
  })

  test('a full session stays well under the 4 KB cookie limit', ({ assert }) => {
    const access = new OrderAccessService()
    let grants: Record<string, string> = {}
    let submissions: Record<string, string> = {}
    for (let index = 0; index < 50; index++) {
      grants = access.remember(grants, crypto.randomUUID(), 'x'.repeat(43))
      submissions = access.remember(submissions, crypto.randomUUID(), crypto.randomUUID())
    }
    const raw = JSON.stringify({
      store_order_grants: grants,
      store_checkout_submissions: submissions,
    })
    // Encryption and base64 add roughly 40%; the session also holds auth and cart state.
    assert.isBelow(raw.length * 1.4, 2048)
  })
})
