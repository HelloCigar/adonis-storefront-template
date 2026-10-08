# Checkout process

This is the implemented flow for one shared store: guest checkout with an optional account, PHP prices, a frozen PHP 100 shipping fee, and one staff-managed shipment. Solid arrows show execution; dotted arrows show asynchronous triggers or status observations.

## Cart to shipment

```mermaid
flowchart TD
  cart["Customer edits cart"] --> quote["Server quotes current prices, stock and any discount code<br/>Items less discount plus PHP 100 shipping"]
  quote --> submit["Customer submits contact and shipping details"]
  submit --> valid{"Quote, cart version<br/>and stock still valid?"}
  valid -->|No| quote
  valid -->|Yes| freeze["Checkout transaction<br/>Freeze cart and order snapshots<br/>Reserve stock and save payment attempt<br/>Count discount code use<br/>Save private access grant, activity and outbox work"]
  freeze --> committed["Commit: order awaits payment"]
  committed -.-> create["Queued checkout creation"]
  create --> service["Unified PaymentService<br/>Routes the saved provider and mode"]
  service --> hosted["PayMongo hosted checkout"]
  hosted --> pay["Customer pays"]
  pay -.-> observation["Signed webhook or verified provider lookup"]
  observation --> eligible{"Capture matches the frozen order<br/>and the order is eligible?"}
  eligible -->|Yes| settle["Settlement transaction<br/>Save captured facts and consume reserved stock once<br/>Confirm order and save receipt intent"]
  eligible -->|Mismatch, extra or late capture| paymentReview["Preserve captured facts for staff review<br/>Block fulfillment"]
  settle --> confirmed["Confirmed order"]
  confirmed --> shippable{"Payment, refund, review<br/>and stock guards allow fulfillment?"}
  shippable -->|Yes| pack["Staff packs order"]
  pack --> ship["Shipping transaction<br/>Recheck guards, save tracking and mark fulfilled<br/>Save activity and shipping notification intent"]
  shippable -->|No| review["Staff resolves payment or refund review"]
  review --> shippable
  ship --> shipped["Shipped order"]
  shipped --> deliver["Delivery transaction<br/>Staff confirm the carrier delivered it<br/>Save activity and delivery notification intent"]
  deliver --> delivered["Delivered order"]
  settle -.-> receipt["Queued receipt email"]
  ship -.-> notice["Queued shipping email"]
  deliver -.-> deliveryNotice["Queued delivery email"]
  hosted -.-> return["Browser return: private order status page"]
  receipt -.-> return
  notice -.-> return
  deliveryNotice -.-> return
  shipped -.-> return
  delivered -.-> return
```

The return page reads saved status; payment confirmation comes from a verified provider observation. Duplicate captures do not consume stock again. Mismatched totals, extra captures, or a payment arriving after stock release require review before fulfillment. Guest links use hashed capabilities; linking an optional account requires valid order access.

Delivery is a staff confirmation after dispatch, not a carrier integration. Only a shipped shipment moves to `delivered`; repeating the action returns the saved delivery without a second activity or email. A delivered order keeps every shipped-order guard, so it cannot be cancelled or refunded through these actions.

## Events and durable work

```mermaid
flowchart TD
  changes["Business transaction writes order changes<br/>and uniquely keyed WorkflowOutbox rows"] --> commit{"Transaction commits?"}
  commit -->|No| rollback["Roll back business changes and outbox<br/>No publication event"]
  commit -->|Yes| records[("Committed outbox records")]
  records -.-> ready["One WorkflowOutboxReady event<br/>after commit, across service instances"]
  ready --> listener["DI publication listener<br/>Bounded pass of 10 operations"]
  listener --> publisher["OutboxPublisherService<br/>Claim unpublished records"]
  relay["Persisted relay schedule<br/>Every five seconds"] --> publisher
  records --> publisher
  publisher --> accepted{"Queue accepts the job<br/>with delay and deduplication key?"}
  accepted -->|No| pending["Leave outbox unpublished<br/>Record failure and publication backoff"]
  pending -.-> relay
  accepted -->|Yes| published["Record publication acknowledgement"]
  accepted -->|Yes| queues["Durable database queue"]
  queues --> payment["Payments worker<br/>Create, reconcile or close checkout<br/>Submit, reconcile or look up refund"]
  queues --> notification["Notifications worker<br/>Await SMTP delivery, then record sent"]
  queues --> maintenance["Maintenance worker<br/>Publish outbox and sweep stale operations"]
  payment --> domain["Idempotent domain services<br/>Transaction and operation-owner guards"]
  notification --> retry["Failed or interrupted jobs retry<br/>Exhausted work becomes visible for review"]
  payment --> retry
  sweep["Persisted recovery schedule<br/>Every minute"] --> maintenance
  maintenance --> intent["Save reconciliation or closure<br/>intent in a new transaction"]
  intent --> changes
```

The event is an in-memory wake-up. A crash after commit or a listener failure leaves work in the outbox for the relay. A crash after queue acceptance but before the acknowledgement can publish a job again; domain guards make repeated execution safe. Notification delivery can repeat if SMTP accepts a message before its acknowledgement is lost.

## Cancellation and uncertain outcomes

```mermaid
flowchart TD
  unpaid["Unpaid order: cancellation or hold deadline"] --> close["Queue closure of original hosted checkout"]
  close --> result{"Verified provider outcome?"}
  result -->|Captured payment| settle["Apply verified settlement<br/>Late captures require review"]
  result -->|Closed unpaid| release["Transaction releases stock and discount use once<br/>Order becomes cancelled or expired"]
  result -->|Unknown| hold["Keep stock holds and saved operation<br/>Reconcile original resource"]
  hold -.-> reconcile["Recovery sweep or authorized staff retry"]
  reconcile --> result
  hold --> unsafe["Replay window elapsed, account changed<br/>or retries exhausted: staff review"]

  paid["Paid, unshipped order"] --> cancel["Staff cancellation transaction<br/>Serialize with shipping and refund creation<br/>Restock and release discount use once, cancel order and shipment<br/>Save outstanding full-refund intents"]
  cancel -.-> refund["Queued refund through unified PaymentService<br/>Use original provider, mode and stable key"]
  refund --> outcome{"Verified refund outcome?"}
  outcome -->|Succeeded| refunded["Save confirmed refund observation<br/>Update financial balance"]
  outcome -->|Pending or unknown| refundPending["Funds remain captured<br/>Reconcile saved refund operation"]
  refundPending -.-> outcome
  outcome -->|Failed or unsafe to replay| refundReview["Staff refund review"]
```

Cancellation restores goods and requests refunds atomically; financial status changes only when refund success is confirmed. A refund requested without cancellation does not restock goods. Shipped and delivered orders cannot use these cancellation or refund actions. Pending refunds and unresolved payment/refund review block shipment.

See [payment contracts](../PAYMENTS.md), [operations and recovery](checkout-operations.md), and the [technical plan](plans/2026-10-03-cart-to-shipping.md).
