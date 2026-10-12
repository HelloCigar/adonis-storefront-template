import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import WorkflowOutboxReady from '#events/checkout/workflow_outbox_ready'
import OutboxService from '#services/checkout/outbox_service'
import WorkflowOutbox from '#models/checkout/workflow_outbox'
import {
  failQueuePublishing,
  passRetryDelay,
  queuedJobNames,
  queuedJobs,
} from '#tests/helpers/queue'
import {
  awaitingPayment,
  resetCheckoutState,
  runOutboxRelay,
  useFakeProvider,
} from '#tests/helpers/payments'

test.group('Workflow outbox events', (group) => {
  group.each.setup(() => resetCheckoutState())

  test('emits once after commit across service instances and emits separately for each transaction', async ({
    assert,
  }) => {
    using events = emitter.fake([WorkflowOutboxReady])
    const first = await app.container.make(OutboxService)
    const second = await app.container.make(OutboxService)
    assert.notStrictEqual(first, second)
    await db.transaction(async (trx) => {
      await first.record(trx, {
        key: 'first',
        kind: 'create_checkout',
        entityId: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
      })
      await second.record(trx, {
        key: 'second',
        kind: 'expire_checkout',
        entityId: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
      })
      await first.record(trx, {
        key: 'first',
        kind: 'create_checkout',
        entityId: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
      })
      events.assertNotEmitted(WorkflowOutboxReady)
    })
    events.assertEmittedCount(WorkflowOutboxReady, 1)
    assert.lengthOf(await WorkflowOutbox.all(), 2)
    await db.transaction((trx) =>
      first.record(trx, {
        key: 'first',
        kind: 'create_checkout',
        entityId: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
      })
    )
    events.assertEmittedCount(WorkflowOutboxReady, 2)
  })

  test('committed checkout work is published to the queue once', async ({ assert }) => {
    useFakeProvider()
    await awaitingPayment()

    await runOutboxRelay()

    assert.deepEqual(await queuedJobNames('payments'), ['CreateCheckout', 'ExpireCheckout'])
  })

  test('when the queue is unavailable, outbox work is kept for later', async ({ assert }) => {
    useFakeProvider()
    const queue = failQueuePublishing()
    await awaitingPayment()
    assert.isEmpty(await queuedJobs('payments'))

    queue.restore()
    passRetryDelay()
    await runOutboxRelay()

    assert.deepEqual(await queuedJobNames('payments'), ['CreateCheckout', 'ExpireCheckout'])
  })

  test('the scheduled relay publishes persisted work when the post-commit event is missed', async ({
    assert,
  }) => {
    useFakeProvider()
    {
      // Suppress the wake-up to model a process exiting between commit and event dispatch.
      using events = emitter.fake([WorkflowOutboxReady])
      await awaitingPayment()
      events.assertEmittedCount(WorkflowOutboxReady, 1)
    }
    assert.isEmpty(await queuedJobs('payments'))

    await runOutboxRelay()

    assert.deepEqual(await queuedJobNames('payments'), ['CreateCheckout', 'ExpireCheckout'])
  })
})
