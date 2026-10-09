# Checkout operations

The [process graph](checkout-process.md) shows the implemented business flow and the event/outbox/queue recovery path.

The rollout supports one shared store, optional customer accounts, PHP checkout, a frozen PHP 100 delivery fee, a 15-minute target stock hold, and one manually dispatched shipment. Hold duration and shipping amount are configured in `config/checkout.ts`. Unknown provider outcomes keep their holds until reconciliation proves the checkout closed unpaid; queue delay can extend the hold beyond its target.

## Deployment

1. Back up the existing SQLite database. Run `npm ci` and `node ace migration:run` before starting the updated web application. Five workflow/queue migrations preserve legacy orders and add durable operations, stock guards and queue tables. Audit catalogue prices with more than two decimal places before enabling checkout.
2. Configure `APP_URL`, the test/live PayMongo API key and endpoint webhook secret, enabled payment methods, `QUEUE_DRIVER=database`, and SMTP sender/transport. Missing payment credentials block new checkout. Local mail defaults to Mailpit-compatible `localhost:1025`; a real SMTP transport is required for launch.
3. Start the web application. Its web-only `start/scheduler.ts` preload upserts the stable schedules `checkout-outbox-relay` and `payment-operation-recovery`. Migration/console commands do not register them.
4. Run a separately supervised worker against the **same SQLite database** as the web process:

   ```sh
   node ace queue:work --queue=maintenance,payments,notifications --concurrency=1
   ```

   In the compiled deployment, run the same Ace command from the `build` directory. On Railway, see [Deploying on Railway](deploy-railway.md). Start all three queues. Initial concurrency is one for SQLite. Configure graceful termination/restart with enough time for the 90-second payment jobs to settle or become recoverable.

5. Configure the public PayMongo webhook at `/payments/webhooks/paymongo` and verify checkout-paid/refund events with the endpoint's signing secret. Route request bodies without rewriting them. Avoid access logs that retain receipt-link query tokens.
6. Run `node ace checkout:audit`, exercise a test-mode payment and pre-shipment refund, inspect the receipt and shipping notification, then restart web/worker processes and verify schedule `run_count` and queue progression. Production account activation, real credentials, SMTP delivery and provider-dashboard tests remain deployment tasks.

The queue and mail packages are pinned to `@adonisjs/queue@0.6.2` and `@adonisjs/mail@10.4.0`. Upgrade the experimental queue package deliberately and rerun real adapter/worker tests. Completed jobs are removed; failed history retains up to 1,000 entries per queue for 30 days, pruned during subsequent failures. Domain records/outbox/activity remain the durable business history.

## Health and recovery

The `start/events.ts` preload registers a publisher listener in web, worker and console environments. Transactions recording workflow intents emit one `WorkflowOutboxReady` event after commit for prompt publication. The five-second relay remains necessary: missed events and listener failures leave committed outbox rows recoverable. Monitor both publication errors and unpublished age.

```sh
node ace checkout:audit
node ace checkout:publish
node ace checkout:retry-refund-lookup <local-lookup-id>
```

`checkout:audit` is read-only. It reports price precision, stock counter/reservation mismatches, unpublished outbox age, stale/review payment operations, review orders, unresolved captured payments, refund/lookup/notification problems, queue counts and persisted schedules. Output contains local IDs and counts, without guest addresses, capability tokens or raw provider errors. Exit code 1 means an issue needs inspection; recent unpublished work may be normal while publication catches up. Use it with your existing monitoring to alert on sustained age/depth/failures; logger errors also identify exhausted operations. It does not replace worker/process health monitoring.

`checkout:publish` performs one bounded publication pass; it is not a second job executor. A queue outage preserves unpublished work for later publication. Do not delete outbox rows or stock holds to make a failed operation appear healthy.

For an existing order, staff use its management page to reconcile the saved checkout/refund or retry a failed notification. Verify the original provider resource in the original account/mode. If the mutation replay window has elapsed or the credential scope changed, provide the original reference; repeating an uncertain mutation with a new key can charge/refund again. A failed lookup leaves an operation needing review, not a reason to release stock. Resolve a late payment or overpayment through the recorded captured payment's full-refund action before fulfillment.

Unmatched captures without a local order require investigation using the recorded provider/payment reference and original checkout. An order's verified checkout lookup can bind a previously unassigned captured fact. Sparse refund lookups that exhaust retries are listed by the audit and can be requeued with `checkout:retry-refund-lookup`; the saved provider/resource is retained. This command performs only the original resource lookup through a queued job.

Paid cancellation atomically restores stock once and saves any outstanding full-refund intent. Funds remain paid until confirmed refund observations arrive. Provider-dashboard refunds are recorded and block shipment even without a local refund operation.

After the carrier confirms delivery, staff use **Mark as delivered** on the shipped order. It records `shipment.delivered`, stamps `delivered_at`, and queues the delivery email; it does not change payment or stock. Delivery cannot be recorded before shipment and cannot be undone from the page. A full refund by itself does not restock goods; cancel the unshipped order to restore stock.

## Notification delivery

Receipt, shipment and delivery intents are unique per order/event and are saved in the settlement, shipping or delivery transaction. The durable worker awaits SMTP delivery before recording `sent`; retries never repeat payment settlement or dispatch. Emails contain a private order link valid for 30 days, which exchanges the token into a session and redirects to a clean URL. Account claims require that capability, not just the same email.

SMTP can accept a message before a worker loses its acknowledgement. Delivery can therefore repeat despite a deterministic Message-ID; no exactly-once email guarantee is claimed. Failed notifications are visible to staff and can be retried after the transport is restored. A notification still `pending` two minutes after its last queue publication, for example because the queue dropped a stalled job, is re-queued by the `payment-operation-recovery` sweep; failed notifications are left for staff. Mail failure never reverses payment or shipment.

Staff can review every customer email under **Emails** in store management (`/seller/emails`). Each email has its own link and renders the real templates with in-memory sample order data, as HTML at desktop or mobile width and as plain text. Previews never send mail, grant order access or write to the database.

## Local verification

### Local payment simulation

1. Set `NODE_ENV=development`, `PAYMENT_PROVIDER=fake_paymongo`, `QUEUE_DRIVER=database`, and `APP_URL` to the origin you use in the browser in `.env`. Leave PayMongo credentials empty. Run `node ace migration:run` to add the persistent simulator resource table.
2. Run `npm run dev`. It uses `concurrently` to start the web server and a worker for `maintenance,payments,notifications` against the same environment/database. Stopping the dev command stops both processes. `npm run dev:web` and `npm run dev:worker` are available when separate terminals are needed. Email delivery uses the configured SMTP transport.
3. Add an in-stock product, submit guest checkout, wait for the payment job, and click **Pay now**. The local simulator offers **Simulate successful payment**, **Simulate failed payment**, **Expire checkout**, and **Pay without notification**. A failed payment keeps the stock hold and allows another try. Expiry closes the checkout and releases the hold. A successful payment consumes stock once and creates a receipt intent; paying without notification is recovered by the normal payment lookup.
4. Sign in as staff to pack and ship a paid order, then mark it delivered. To test refunds, cancel a separate paid, unshipped order; the worker confirms its fake refund and the normal order balance updates. Simulator data survives web/worker restarts. Switching the provider affects new orders; older simulated orders continue to use `fake_paymongo` for their controls, reconciliation and refunds in development/tests.
5. Run Mailpit on `localhost:1025` (or configure another local SMTP sink) to inspect receipt, shipment and delivery emails. Payment simulation does not fake mail delivery. Without SMTP, notification jobs retry independently while payments and fulfillment continue.

Production rejects `PAYMENT_PROVIDER=fake_paymongo` at startup, and simulator endpoints return 404 outside development/tests. Set `PAYMENT_PROVIDER=paymongo` to exercise the real provider's test mode. Fake controls belong to the provider fixture; application confirmation looks up the saved checkout through `PaymentService` and normal recovery. Provider HTTP requests and webhook signatures are covered separately by adapter tests and PayMongo test mode.

```sh
node ace test unit functional
node ace test browser
npm run typecheck
npm run lint
npm run build
```

If the default test port 3333 is occupied, set `PORT` for the test command to an unused port (PowerShell: `$env:PORT = '64907'`) without stopping another running application. Browser tests require Chromium process-launch permission. Queue tests use the real SQLite adapter for persisted schedules, interrupted workers, timeouts, delayed expiry and retry review. Test transports prevent external charges/email delivery.
