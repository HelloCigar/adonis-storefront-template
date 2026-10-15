import app from '@adonisjs/core/services/app'
import PublishWorkflowOutbox from '#jobs/checkout/publish_workflow_outbox'
import SweepPaymentOperations from '#jobs/payments/sweep_payment_operations'
import PurgeAssistantConversations from '#jobs/assistant/purge_assistant_conversations'

// Persisted schedules are processed by queue workers, including after web/worker restarts.
if (!app.inTest) {
  await PublishWorkflowOutbox.schedule({}).id('checkout-outbox-relay').every('5s').run()
  await SweepPaymentOperations.schedule({}).id('payment-operation-recovery').every('1m').run()
  await PurgeAssistantConversations.schedule({})
    .id('assistant-conversation-retention')
    .every('1h')
    .run()
}
