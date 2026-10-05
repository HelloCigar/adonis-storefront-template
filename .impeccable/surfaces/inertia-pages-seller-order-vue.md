---
version: 1
slug: 'inertia-pages-seller-order-vue'
primary_target: 'inertia/pages/seller/order.vue'
related_targets:
  [
    'inertia/components/seller/orders/WorkflowPanel.vue',
    'inertia/components/seller/orders/PickList.vue',
    'inertia/components/seller/orders/ShippingAddress.vue',
    'inertia/components/seller/orders/CancellationSection.vue',
    'inertia/components/seller/orders/ReconcileCheckoutForm.vue',
  ]
---

# Order operations

Mode: Operate. Scope: /seller/orders/:id and its order-domain components.
Staff need to see what happened, what prevents progress, and which existing trigger to run next. Keep typed Inertia forms, legacy manual controls, backend guards, real order data, and the incumbent design system.

## Direction contract

THESIS: State-driven order operations; record fields support the workflow rather than leading it.

OWN-WORLD: Bricolage Grotesque, Warm Taupe semantic surfaces, orange actions, existing Nuxt UI controls and shared corners.

STORY: Read payment and fulfillment progress, identify exceptions, perform the valid action, then inspect its activity and customer notification.

FIRST VIEWPORT: Order identity and statuses above a compact three-stage fulfillment strip (Payment, Packing, Dispatch). A wide next-action section owns the left column and carries the working information for its step: the pick list while packing; the ship-to address, parcel contents, and tracking form while dispatching; one root-cause issue and its fix while blocked. Customer updates and history occupy the right; customer updates sit outside the strip, with a summary badge on their section only when there are two or more updates. Recovery appears with its financial records. Customer, items, totals, and notes follow.

Approved deviations (2026-10-05): the user approved the three-stage strip in place of the original four stages, with customer updates moved out of the strip, and packing/dispatch working information placed inside the next-action card.

FORM: Precisely scoped operational restructuring, directly shaped from the request; no concept-seed is required. Code-first. Signature interaction: the next-action section changes from packing to tracked dispatch or an explicit blocked state after an Inertia response. Motion: brief control transitions only.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Finish verification — 2026-10-04

Documenter outcome: **existing-system alignment**. Source comparison of `order.vue`, `WorkflowPanel.vue`, and `StatusForm.vue` against `PRODUCT.md`, `DESIGN.md`, the design sidecar, `inertia/assets/main.css`, and `vite.config.ts` confirms the incumbent Bricolage Grotesque family, semantic orange/taupe roles, shared corners, tonal grouping, and Nuxt UI controls. The action-first packing/dispatch/blocker hierarchy, payment/refund recovery, separate customer updates, and supporting record details implement the direction contract. Typed forms retain processing and validation states; manual orders retain their status controls.

This is an ordinary, code-first surface extension. No durable system change was approved or required; `DESIGN.md` and `.impeccable/design.json` are preserved. No new system drift was found in the scoped targets. Previously documented unresolved font-heading/animation utilities and incomplete custom-motion audit remain pre-existing limitations outside this scope.

Fresh finish review: **ship**, with Persistence, Fidelity, Ceiling, Material fixes, and Keep recorded in [the verdict](../review/order-operations-verdict.md); no material fixes remain. Verified captures are [desktop](../review/desktop.png), [mobile](../review/mobile.png), [recovery desktop](../review/recovery-desktop.png), and [recovery mobile](../review/recovery-mobile.png), plus [lower order details](../review/details-desktop.png). These contain synthetic browser-test data and are QA evidence, not shipping raster assets; no shipping raster was introduced or replaced.

Recorded validation: typecheck and scoped ESLint passed; checkout browser tests passed (3), the focused legacy manual-order browser test passed (1), the detector returned no findings on changed targets, and `git diff --check` passed.

## Hardening verification — 2026-10-05

The order page now consumes action availability from a consistent backend snapshot and shares dispatch prerequisites with fulfillment mutations. Provider-only refunds, stock that was released/restocked, review states, and cancellation/refund prerequisites produce explicit blockers. Existing refund-operation replay remains available to cancellation; unpaid checkout closure remains asynchronous.

Typed forms share a processing lock and retain validation input. Lost responses and HTTP exceptions retain a visible recovery message and lock further mutations until a successful status refresh. Refund and cancellation controls require acknowledgement. Product/variant/SKU details remain readable within the three-column desktop table and the mobile item list. Payment, local refund, and provider-refund records display their original currencies; historical tracking links accept only HTTP(S). Dates explicitly use Philippine time.

Fresh finish review initially returned **fix** for light-theme action contrast. A scoped existing-palette adjustment uses orange 700 for light actions and 800 on hover; dark 400 and the shared system remain intact. The final verdict is **ship** for the scored contrast fix, with recovery-link contrast **4.84:1**, packing-label contrast **5.01:1**, and no material regressions. All ten required captures passed validity. The full review and scored verdict are recorded in [order-hardening-verdict.md](../review/order-hardening-verdict.md).

The fresh documenter returned **No changes / existing-system alignment** after checking PRODUCT.md, DESIGN.md, `.impeccable/design.json`, shared stylesheet/configuration, this surface contract, and the five order-domain frontend sources. Semantic Theme, Single Family, and Selective Lift remain aligned. This is an ordinary refinement, so DESIGN.md and the sidecar are preserved; the contrast adjustment remains a surface-specific exception. Previously documented unresolved font-heading/animation utilities and incomplete custom-motion coverage remain outside scope.

Validation: **46 unique functional tests** passed across the checkout, refund-durability, and availability runs; **9 unique browser tests** passed across checkout (3), final hardening (5), and the existing manual-order edit flow (1). Vue typecheck, scoped ESLint, Prettier, and `git diff --check` passed. Backend TypeScript passed with the unused-parameter check disabled to isolate pre-existing untracked chat-adapter TS6133 errors. Full typecheck and application build remain blocked by those errors; the frontend production asset build completed before the final contrast correction.

The detector ran once and returned no findings. Final synthetic QA captures in `.impeccable/review/` are desktop, tablet, mobile, dark desktop, recovery desktop/mobile, scrolled details on all three widths, and validation-error mobile. No shipping raster asset was added. The development server was started for generation and remains running at `http://localhost:3333`; test servers and database setup were isolated.

## Critique remediation verification — 2026-10-05

The order page now leads with one actionable state. The navbar reads "Order details". Header badges for online orders show only lifecycle states the strip cannot express (review required, cancelled, expired); manual orders keep payment and fulfillment badges. The three-stage strip marks done, current, attention, upcoming, and closed states. Current uses primary icon and text with `aria-current="step"`; attention uses a warning triangle and warning text. The next-action card names one root-cause issue and its fix (reconcile form, refund or payment-record link, per-product stock link, or admin note), followed by an "Also blocking fulfillment" list. While packing, it shows the pick list. While dispatching, it shows the ship-to address with copy, collapsible parcel contents, and the recipient-email line beside the tracking form. That layout uses container queries: two columns at `@3xl` and a carrier/tracking split at `@lg`. Cancellation uses a backend-supplied preview under an error-colored "Cancel order" disclosure. Refund and cancel labels state exact amounts. Zero discount and tax rows are hidden. One polite status region announces outcomes. Validation focuses the first invalid field without a top alert. When a state change removes the focused control, focus moves to Carrier or the next-action heading. The page-scoped light-mode contrast correction now covers warning and error as well as primary (700 light, 400 dark).

The fresh finish review initially returned **fix** with six material items. All six were applied: container-query dispatch layout, badge vocabulary, card body following the next action, reconcile form reachable in Payments for closed or shipped orders, conditional shipment-email copy, and an optional pick-list heading.

The fresh documenter returned **No changes / existing-system alignment**. It checked DESIGN.md, `.impeccable/design.json`, this contract, `order.vue`, `WorkflowPanel.vue`, and the four new order-domain components. All color uses semantic Nuxt UI roles, headings and labels stay in the single family, icons are Lucide, and grouping is tonal without new shadows. Semantic Theme, Single Family, and Selective Lift remain aligned. Container queries appear only in `WorkflowPanel.vue` and stay a surface layout technique. The warning/error contrast extension remains a surface-specific exception, like the earlier primary correction. DESIGN.md and the sidecar are preserved. Previously documented unresolved font-heading/animation utilities and incomplete custom-motion coverage remain outside scope.

Validation: vue-tsc passed. Backend tsc passed except pre-existing unused-parameter errors in `app/models/adapters/chat_adapter.ts`. Scoped ESLint and `git diff --check` passed. The detector on `order.vue` and `components/seller/orders` returned `[]`, exit 0. `node ace test unit functional` passed **161/161**; it ran after the backend changes, and later edits were frontend or test only. Browser checkout and order-hardening specs passed **8/8** on the final code. They include assertions for focus moving to Carrier after Start packing, the status announcement, validation focus without an alert, and amount-stating refund labels.

Final synthetic QA captures in `.impeccable/review/`: [desktop](../review/desktop.png), [tablet](../review/tablet.png), [mobile](../review/mobile.png), [dark desktop](../review/dark-desktop.png), [recovery desktop](../review/recovery-desktop.png), [recovery mobile](../review/recovery-mobile.png), [dispatch desktop](../review/dispatch-desktop.png), [details desktop](../review/details-desktop.png), [details tablet](../review/details-tablet.png), [details mobile](../review/details-mobile.png), and [validation-error mobile](../review/error-mobile.png). Known capture artifact: the next-action shield icon had not loaded when recovery-desktop.png was taken; recovery-mobile.png from the same run shows it. These are QA evidence, not shipping rasters; no shipping raster was added or replaced.
