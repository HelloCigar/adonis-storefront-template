# Project coordination and subagent delegation

## Project context

This is one shared in-house store built with AdonisJS, Lucid/SQLite, Vue, Inertia, Nuxt UI, and Tailwind CSS. Roles are `customer`, `staff`, and `admin`. The `seller/` directories and URLs are compatibility names for store management, not independent sellers or a marketplace.

Read the applicable local guide before work: [backend conventions](app/AGENTS.md) for `app/` and [frontend conventions](inertia/AGENTS.md) for `inertia/`. These supplement this root guide. Use [PRODUCT.md](PRODUCT.md) for product scope, [DESIGN.md](DESIGN.md) for the existing visual system, [AUTHORIZATION.md](AUTHORIZATION.md) for access boundaries, and [PAYMENTS.md](PAYMENTS.md) plus [checkout operations](docs/checkout-operations.md) for money and fulfillment workflows.

## When to delegate

- Use subagents when a task has independent, bounded work that benefits from parallel implementation, investigation, or a fresh review. Handle small, isolated changes directly.
- The coordinating agent states the plan, defines ownership, integrates results, verifies the combined change, and reports to the user. Delegation does not transfer responsibility for completion.
- Split by domain or a concrete deliverable, not by arbitrary file counts. A cohesive change can belong to one agent across a controller, service, transformer, and its tests.
- Parallelize work only when write sets and dependencies are independent. Sequence a backend contract change before a frontend implementation that consumes it.
- Use the available subagent mechanism for internal work. Create a separate user-visible chat only when the user asks for one.
- Respect the harness's concurrency limit. Start with the smallest useful team; do not delegate a task just to fill available slots.

## Project ownership map

The paths below are candidate boundaries, not blanket permission to edit every matching file. Give each assignment an explicit file list or a narrow directory scope. Tests and shared configuration need their own named owner.

| Area / suggested agent                      | Primary source boundaries                                                                                                                                                                                                                                                               | Skills and important dependencies                                                                                                                                                                                 |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public catalog and storefront               | `app/controllers/storefront/`, `app/services/catalog/`, `app/models/catalog/`, `app/transformers/catalog/`, `app/validators/catalog/`; related product, collection, search, and filter UI in `inertia/`                                                                                 | AdonisJS and Lucid for backend; Inertia Vue and Nuxt UI for frontend. Coordinate inventory changes with checkout.                                                                                                 |
| Staff catalog and media                     | Named product, variant, collection, and image files in `app/controllers/seller/`, `app/services/seller/`, `app/validators/seller/`, `app/transformers/seller/`, `app/policies/seller/`; corresponding `inertia/components/seller/` and pages                                            | AdonisJS, Lucid, Inertia Vue, Nuxt UI; attachment skills for uploads or media processing. Catalog models are shared with storefront.                                                                              |
| Cart, checkout, stock, and fulfillment      | `app/controllers/checkout/`, `app/services/checkout/`, `app/models/checkout/`, `app/transformers/checkout/`, `app/validators/checkout/`; named staff order, packing, shipment, and cancellation controllers                                                                             | AdonisJS and Lucid. Read the checkout process and operations docs. Coordinate payment settlement, inventory, outbox, and notification boundaries.                                                                 |
| Payments and refunds                        | `app/services/payments/`, `app/models/payments/`, `app/jobs/payments/`, `app/controllers/payments/`, `app/validators/payments/`, `app/transformers/payments/`, `providers/payment_provider.ts`, `providers/payments/`, `config/payment.ts`; named staff refund and recovery controllers | AdonisJS and Lucid. Application workflows use `PaymentService`; concrete provider adapters and simulator fixtures stay in provider wiring. Coordinate checkout state changes before editing overlapping services. |
| Staff order operations UI                   | `inertia/pages/seller/order.vue`, `inertia/pages/seller/orders.vue`, `inertia/components/seller/orders/`; `app/transformers/seller/order_transformer.ts` only if assigned                                                                                                               | Inertia Vue, Nuxt UI, and Impeccable for interface work. Use backend-generated data and existing actions; backend services decide whether packing, shipping, cancellation, or refunds are valid.                  |
| Authentication, accounts, and authorization | `app/controllers/auth/`, `app/controllers/account/`, `app/controllers/settings/`, corresponding services/models/validators/transformers; `app/policies/`, `app/abilities/`, auth and staff middleware; related account/auth/settings UI                                                 | AdonisJS, Lucid, Inertia Vue as needed. Coordinate shared User model and policy changes. Preserve private account ownership for all roles, including admins.                                                      |
| Content and notifications                   | `app/controllers/content/`, `app/services/content/`, `app/transformers/content/`, `config/storefront.ts`, related content pages; notification services, `app/mails/checkout/`, `resources/views/emails/`, and named checkout jobs/listeners/events                                      | AdonisJS; Inertia Vue for pages. Treat content and notification delivery as separate assignments when independent. Notification failure must not reverse payment or fulfillment.                                  |
| Shared frontend and design                  | `inertia/layouts/`, shared `inertia/components/`, `inertia/composables/`, `inertia/assets/main.css`, `inertia/css/app.css`, `vite.config.ts`                                                                                                                                            | Inertia Vue, Nuxt UI, Impeccable. Shared layout, theme, and token edits affect every page; assign one owner and coordinate with domain UI agents.                                                                 |
| Database, migrations, and fixtures          | `database/migrations/`, `database/factories/`, `database/seeders/`, `database/schema_rules.ts`, `config/database.ts`; relevant domain models                                                                                                                                            | Lucid and Japa. One migration/schema owner per change. Follow Lucid schema generation; do not hand-patch generated schema output. Coordinate model and transformer consumers.                                     |
| Tests and independent review                | Assigned specs in `tests/{unit,functional,browser}/<domain>/` (domains mirror `app/`), and helpers in `tests/helpers/`                                                                                                                                                                  | Japa and the relevant domain skill. Reviewers are read-only unless explicitly assigned fixes. Test helper and bootstrap changes need a shared owner.                                                              |
| Runtime and integration                     | `start/`, `config/`, `providers/`, `commands/`, `adonisrc.ts`, `package.json`, lockfile, `tests/bootstrap.ts`                                                                                                                                                                           | Usually retained by the coordinator or one explicitly assigned integration agent. These are shared files, not automatically owned by every domain agent.                                                          |

## Assignment contract

Send a self-contained task packet. Include relevant user decisions instead of assuming the agent knows the entire conversation.

```text
Goal: The concrete behavior or investigation result to deliver.
Mode: Implement / investigate / read-only review / documentation.
Write ownership: Exact files or narrow directories this agent may change.
Read context: Relevant guides, source files, product/design decisions, and docs.
Constraints: Existing behavior to preserve and explicitly excluded work.
Dependencies: Contract or artifact to wait for; who owns it; notification point.
Acceptance: Observable conditions that make the assignment complete.
Verification: Focused commands or evidence required; who runs shared tests.
Return: Changed files, behavior, commands/results, assumptions, and open issues.
```

For example, a checkout UI assignment can own `inertia/pages/checkout/index.vue` and `inertia/components/checkout/AddressFields.vue`, consume the current generated quote type, and leave routes, settlement, and shared styles with their existing owners. A separate reviewer can inspect the completed diff and supplied desktop/mobile captures without editing those files.

## Working safely in the shared workspace

1. Check the current worktree and identify pre-existing changes before assigning work. Preserve unrelated work and local configuration.
2. Give each file one active writer. Agents may read outside their write scope; they must report a required out-of-scope edit to the coordinator before changing it.
3. If two tasks require the same file, serialize them or give that file to the coordinator. This applies especially to `start/routes.ts`, shared models/services, layouts, config, migrations, test helpers, and the lockfile.
4. Changes are already visible in the shared directory. Do not copy files back, reset the worktree, or cherry-pick shared-workspace edits. Check the actual diff before integrating.
5. Tell the coordinator when a contract changes or a dependency becomes ready. Do not silently broaden a task or duplicate another agent's work.
6. Subagents report completion and blockers to the coordinator. The coordinator decides the next assignment and sends the final user response. Avoid nested delegation unless the coordinator explicitly assigns it.
7. Commit, push, PR creation, merges, and deployments remain with the coordinator unless separately assigned and authorized by the user. Stage explicit paths; never use `git add .` or `git add -A`.

## Backend-to-frontend handoff

For a change that affects data or routes, use this sequence:

```text
Migration/schema -> model/service -> validator/policy/controller/transformer
  -> dev server code generation -> typed frontend -> integrated tests
```

- The coordinator or one runtime agent owns the dev server. Check for an existing server first; use `npm run dev` when one is needed. Do not start duplicate watchers.
- Keep it running while source contracts change, wait for successful regeneration, and tell frontend agents which routes and `Data.*` types are ready.
- Never edit `.adonisjs/**`, `@generated/*`, or `#generated/*` by hand. Correct source code and regenerate.
- Frontend agents use generated types and named routes with the typed `Form` from `@adonisjs/inertia/vue`; follow the local frontend guide for dialog state.
- UI work must preserve backend authorization and state guards. Do not infer payment success from a browser return or manufacture a client-side state transition.
- Keep payment, refund, inventory, and outbox transaction changes together when they enforce the same invariant. Splitting these across simultaneous writers is not useful parallelism.

## Verification and review

- Use Japa for tests and choose the narrowest meaningful suite/spec. Typical commands are `node ace test unit --files=<spec>`, `node ace test functional --files=<spec>`, and `node ace test browser --files=<spec>`.
- Test runs share `tmp/test.sqlite3`; the test bootstrap migrates it and suites can truncate records. Assign one test runner and serialize test processes, including unit runs that invoke the shared bootstrap. Never run reset/migration commands against the development database as a substitute.
- Browser tests start the application HTTP server. Assign an unused test port if necessary; do not stop an unrelated application to free the default port.
- Independent read-only inspection may run while code is being built, but final review must use the completed diff and current evidence. A test writer can work in parallel only with a separate write set and agreed behavior contract.
- Run `npm run typecheck`, scoped ESLint, and `git diff --check` after integration when relevant. Run broader tests or `npm run build` when the change affects shared behavior or build/runtime configuration. Documentation-only changes need path/content and whitespace checks, not application test reruns.
- For UI changes, verify relevant states and viewport sizes. Pass the reviewer the actual screenshot paths, source files, direction, and test evidence. When Impeccable is used, follow its required fresh reviewer/documenter handoffs.
- Require exact commands and outcomes in agent reports. A claimed pass without output, no tests selected, or a partial run is not successful verification. Resolve integration failures before reporting completion.

## Completion report

Each subagent returns a concise report containing its result, changed files, verification evidence, and remaining dependencies or limitations. The coordinator checks these against the acceptance criteria and the combined diff, then reports the completed behavior, validation, and any material outstanding issue to the user. Report whether a dev server was reused, left running, stopped, or blocked when one was involved.
