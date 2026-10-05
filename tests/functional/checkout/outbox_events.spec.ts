import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import emitter from '@adonisjs/core/services/emitter'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { QueueManager } from '@adonisjs/queue'
import WorkflowOutboxReady from '#events/checkout/workflow_outbox_ready'
import OutboxService from '#services/checkout/outbox_service'
import OutboxPublisherService from '#services/checkout/outbox_publisher_service'
import WorkflowOutbox from '#models/checkout/workflow_outbox'
import Order from '#models/checkout/order'
import PublishWorkflowOutbox from '#jobs/checkout/publish_workflow_outbox'
import CreateCheckout from '#jobs/payments/create_checkout'
import { OrderFactory } from '#database/factories/order_factory'

test.group('Workflow outbox events', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('emits once after commit across service instances and emits separately for each transaction', async ({
    assert,
  }) => {
    using events = emitter.fake([WorkflowOutboxReady])
    const first = await app.container.make(OutboxService)
    const second = await app.container.make(OutboxService)
    assert.notStrictEqual(first, second)
    await db.transaction(async (trx) => {
      await first.record(trx, { key: 'first', kind: 'create_checkout', entityId: 42 })
      await second.record(trx, { key: 'second', kind: 'expire_checkout', entityId: 42 })
      await first.record(trx, { key: 'first', kind: 'create_checkout', entityId: 42 })
      events.assertNotEmitted(WorkflowOutboxReady)
    })
    events.assertEmittedCount(WorkflowOutboxReady, 1)
    assert.lengthOf(await WorkflowOutbox.all(), 2)
    await db.transaction((trx) =>
      first.record(trx, { key: 'first', kind: 'create_checkout', entityId: 42 })
    )
    events.assertEmittedCount(WorkflowOutboxReady, 2)
  })

  test('a failed publication listener preserves the committed business change for the relay', async ({
    assert,
    cleanup,
  }) => {
    using queue = QueueManager.fake()
    app.container.swap(
      OutboxPublisherService,
      () =>
        new (class extends OutboxPublisherService {
          async publish() {
            throw new Error('Publisher unavailable')
          }
        })()
    )
    cleanup(() => app.container.restore(OutboxPublisherService))
    const order = await OrderFactory.create()
    await order.refresh()
    const originalVersion = order.version
    const outbox = await app.container.make(OutboxService)
    await db.transaction(async (trx) => {
      await Order.query({ client: trx }).where('id', order.id).increment('version', 1)
      await outbox.record(trx, { key: 'listener-failure', kind: 'create_checkout', entityId: 42 })
    })
    await order.refresh()
    assert.equal(order.version, originalVersion + 1)
    const row = await WorkflowOutbox.firstOrFail()
    assert.isNull(row.publishedAt)
    queue.assertPushedCount(0)

    app.container.restore(OutboxPublisherService)
    const relay = await app.container.make(PublishWorkflowOutbox)
    await relay.execute()
    await row.refresh()
    assert.isNotNull(row.publishedAt)
    queue.assertPushedCount(1)
  })

  test('the scheduled relay publishes persisted work when the post-commit event is missed', async ({
    assert,
  }) => {
    using queue = QueueManager.fake()
    {
      // Suppress the wake-up to model a process exiting between commit and event dispatch.
      using events = emitter.fake([WorkflowOutboxReady])
      const outbox = await app.container.make(OutboxService)
      await db.transaction((trx) =>
        outbox.record(trx, { key: 'missed-event', kind: 'create_checkout', entityId: 42 })
      )
      events.assertEmittedCount(WorkflowOutboxReady, 1)
      queue.assertPushedCount(0)
      const row = await WorkflowOutbox.firstOrFail()
      assert.isNull(row.publishedAt)
    }
    const relay = await app.container.make(PublishWorkflowOutbox)
    await relay.execute()
    queue.assertPushed(CreateCheckout.name, { payload: { entityId: 42 } })
    queue.assertPushedCount(1)
    assert.isEmpty(await WorkflowOutbox.query().whereNull('published_at'))
  })
})
