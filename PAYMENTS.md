# Payments

See the [process graph](docs/checkout-process.md) for checkout, event publication, fulfillment, cancellation and recovery.

Application workflows inject the abstract `PaymentService`. `PaymentProvider` binds it to a singleton `DispatcherService`, which registers `PayMongoService` as the first adapter. Checkout, inventory, settlement, refunds and jobs use normalized contracts; provider request formats, ID validation and webhook signatures stay in the adapter.

## References and provider routing

New attempts save the configured provider, test/live mode, immutable request, amount, currency and idempotency key. Lookups, expiry and refunds route by `{ provider, id }`. Changing `PAYMENT_PROVIDER` affects new orders; keep the original adapter and account credentials available to reconcile existing ones.

```ts
import { inject } from '@adonisjs/core'
import PaymentService from '#services/payments/payment_service'

@inject()
export default class PaymentLookupService {
  constructor(private payments: PaymentService) {}

  async lookup(provider: string, id: string) {
    return this.payments.getCheckout({ provider, id })
  }
}
```

Amounts are integer minor units: PHP 499 is `49_900` centavos. `MoneyService` converts trusted catalogue prices exactly and rejects unsupported precision or overflow. Each order snapshots PHP 100 shipping once. Products stay in this application; [PayMongo Hosted Checkout](https://docs.paymongo.com/docs/payment-channels-hosted-checkout) accepts line items without a synchronized provider catalogue.

To add a provider, implement `PaymentAdapter` and register it in `providers/payment_provider.ts`. Supply normalized captured payments, refund resources, webhook events, mode, and conservative `mutationReplayWindowMs`/`idempotencyScope` capabilities. An adapter without a replay guarantee defaults to zero: uncertain mutation replay then requires staff review or the original resource reference. Test its contract using a different ID format; domain code must not inspect provider ID prefixes.

## Configuration

Use `.env.example` as the configuration reference:

- `APP_URL`: the externally reachable HTTP(S) origin used for return and private receipt links. Use HTTPS in production.
- `PAYMENT_PROVIDER=paymongo` and `QUEUE_DRIVER=database`.
- `PAYMONGO_SECRET_KEY`: server secret API key; never expose it to the browser.
- `PAYMONGO_WEBHOOK_SECRET`: signing secret for this endpoint and mode.
- `PAYMONGO_PAYMENT_METHODS=card,gcash,qrph`: configure only methods enabled for the account.
- `PAYMONGO_TIMEOUT_MS=15000`, `PAYMONGO_WEBHOOK_TOLERANCE_SECONDS=300`.

Credentials use Adonis `Secret` values. Missing credentials permit application boot but block new checkout with a sanitized configuration error. The adapter creates v2 checkout sessions and uses the documented v1 lookup/expiry/refund endpoints. An active hosted session becomes normalized `paid` only when it contains a captured payment.

## Local payment simulator

Set `PAYMENT_PROVIDER=fake_paymongo` with `NODE_ENV=development`, run `node ace migration:run`, and restart both the web server and queue worker. Keep `APP_URL` set to the origin you open in the browser. No PayMongo keys or external webhook tunnel are needed. The worker command and full walkthrough are in [checkout operations](docs/checkout-operations.md#local-payment-simulation).

“Pay now” opens a local Fake PayMongo page where you can simulate a successful payment, a failed payment followed by a retry, expiry, or payment without a notification. The page's controls belong to the fake provider fixture. Application confirmation uses the existing recovery workflow to look up the saved reference through `PaymentService`; missed notifications use the same path. Guest cancellation and staff fulfillment/refunds retain their normal authorization and transaction guards. Fake refund requests succeed through the normal queued refund operation.

Simulator resources and idempotency keys live in `dev_payment_resources`, shared by the web and worker processes and preserved across restarts. The adapter uses its own `fake_paymongo` provider identity and never contacts PayMongo. Its page requires the unguessable checkout reference, retains CSRF protection, and exposes neither customer data nor operation keys. It returns 404 outside development/tests; selecting it in production prevents application startup. Changing the default provider affects new orders while saved simulated checkouts and refunds remain available in development/tests. The simulator does not reproduce PayMongo's HTTP payloads, signature validation, account rules, or bank/network behavior; use PayMongo test mode to verify that integration before release.

## Mutation and settlement rules

Payment HTTP calls happen outside database transactions. Before a mutation, a durable operation records an unknown outcome and a lease. Successful processing checks the operation owner and commits domain changes atomically. A browser return never marks an order paid.

`PaymentException` distinguishes `not_submitted`, `rejected`, and `unknown`; transport failures, ambiguous responses and timeouts remain unknown. The adapter does not automatically retry HTTP mutations. Jobs reuse the frozen request and saved key only within the adapter's replay window and original credential scope. PayMongo is configured conservatively at 23 hours against its [documented 24-hour key lifetime](https://docs.paymongo.com/reference/idempotent-requests). Rotating account credentials disables uncertain replay until the original reference can be verified. Never create a fresh checkout/refund key to bypass an uncertain operation.

Settlement verifies provider, mode, checkout association, captured currency and exact frozen total. Captured payment IDs are unique per provider/mode. Duplicate observations do not consume stock again. Unmatched payments are preserved for review; verified lookup can later bind an unassigned fact. Distinct extra captures and late payments block fulfillment and have a full-refund path. The initial late-payment policy requires review/refund, without automatically reacquiring released inventory.

Refund requests remain pending until normalized success is confirmed. Provider-side refund observations are stored independently of local operations; matching by amount alone is prohibited. Confirmed success wins over an older failed/pending event. Packing/shipping, cancellation and refund creation serialize through the order transaction, so a pending refund prevents dispatch. Staff can cancel/refund unshipped orders; partial shipments, returns and post-shipment refunds are outside this rollout.

## Webhooks

Configure **`POST /payments/webhooks/paymongo`** on the public application origin. This is the only payment CSRF exemption. The controller passes the exact raw body and headers to `parseWebhook`, which verifies timestamped signatures before parsing and Vine validation, and rejects the other test/live mode.

Normalized events are `checkout.paid`, `refund.updated`, `refund.reconcile`, `payment.refunds_changed`, or `ignored`. Full observations settle in a short transaction before acknowledgement. A sparse refund event saves a `RefundLookup` and an outbox intent; a queued job fetches its original resource. Webhook acknowledgement never waits for SMTP or an external payment lookup. Subscribe to checkout-paid and refund-update events supported by the enabled PayMongo API; test each subscribed envelope before release.

Confirmed refund success is preserved by a conditional database update, including concurrent stale notifications. A new sparse refund notification invalidates an older lookup's claim so that its completion cannot consume the newer work. Processing refunds remain eligible for scheduled lookup until a terminal observation arrives.

## Background work and private access

Each transaction that records outbox work dispatches one `WorkflowOutboxReady` event after commit. Its DI listener performs a bounded publication pass in web, worker and console environments. Event/publication failure is logged and leaves persisted work for the scheduled relay. Receipt/shipment intents and required business writes remain inside their original transactions.

Business transactions save uniquely keyed `WorkflowOutbox` rows. Publication records success only after the database queue accepts the job. Queue deduplication reduces repeats; domain guards handle at-least-once delivery and crashes after dispatch. Durable jobs perform checkout creation, reconciliation, closure, refunds, sparse refund lookup and notifications. Stable persisted schedules publish outbox work every five seconds and sweep stale payment/refund work every minute.

Guest access uses random, hashed capabilities, a private session grant and 30-day receipt links. Email address equality does not grant access. A signed-in customer can claim an order only with a valid guest capability. Public order responses omit provider operation keys and access tokens and disable caching/referrer disclosure.

See [checkout operations](docs/checkout-operations.md) for migrations, workers, mail, recovery commands and launch checks. `StateService` evaluates explicit scalar transitions; XState is deferred.

## Verification

`node ace test unit functional` runs exact-money, adapter, stock, authorization, settlement and real database queue recovery checks. `node ace test browser` covers customer checkout and store fulfillment alongside existing frontend regressions. Tests use fake transports/adapters and locally signed webhook payloads; they make no live charges or customer email sends.
