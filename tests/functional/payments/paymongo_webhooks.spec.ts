import { test } from '@japa/runner'
import { awaitingPayment, resetCheckoutState } from '#tests/helpers/payments'
import { paidCheckoutEvent, sendPayMongoWebhook, usePayMongo } from '#tests/helpers/paymongo'

test.group('PayMongo webhooks', (group) => {
  group.each.setup(() => resetCheckoutState())

  test('rejects a webhook with an invalid signature', async ({ client, db }) => {
    usePayMongo()
    const { order, attempt } = await awaitingPayment()

    const response = await sendPayMongoWebhook(client, paidCheckoutEvent(order, attempt), 'invalid')

    response.assertStatus(401)
    await db.assertEmpty('payments')
  })

  test('settles a signed paid event without a browser return or a call to PayMongo', async ({
    client,
    assert,
  }) => {
    const network = usePayMongo()
    const { order, attempt, variant } = await awaitingPayment()

    const response = await sendPayMongoWebhook(client, paidCheckoutEvent(order, attempt))

    response.assertStatus(200)
    await order.refresh()
    await variant.refresh()
    assert.equal(order.financialStatus, 'paid')
    assert.equal(variant.inventoryQuantity, 0)
    assert.equal(network.requests, 0)
  })

  test('queues a refund lookup for a sparse refund event without a call to PayMongo', async ({
    client,
    assert,
    db,
  }) => {
    const network = usePayMongo()

    const response = await sendPayMongoWebhook(client, {
      data: {
        id: 'evt_refund',
        type: 'payment.refund.updated',
        livemode: false,
        data: { id: 'ref_fixture', type: 'refund', attributes: {} },
      },
    })

    response.assertStatus(200)
    await db.assertHas('refund_lookups', { external_id: 'ref_fixture', state: 'pending' })
    assert.equal(network.requests, 0)
  })
})
