---
version: 1
slug: "inertia-pages-seller-order-vue"
primary_target: "inertia/pages/seller/order.vue"
related_targets: ["inertia/components/seller/orders/WorkflowPanel.vue"]
---

# Order operations

Mode: Operate. Scope: /seller/orders/:id and its order-domain components.
Staff need to see what happened, what prevents progress, and which existing trigger to run next. Keep typed Inertia forms, legacy manual controls, backend guards, real order data, and the incumbent design system.

## Direction contract

THESIS: State-driven order operations; record fields support the workflow rather than leading it.

OWN-WORLD: Bricolage Grotesque, Warm Taupe semantic surfaces, orange actions, existing Nuxt UI controls and shared corners.

STORY: Read payment and fulfillment progress, identify exceptions, perform the valid action, then inspect its activity and customer notification.

FIRST VIEWPORT: Order identity and statuses above a compact four-stage workflow. A wide next-action section owns the left column; notifications and history occupy the right. Recovery appears with its financial records. Customer, items, totals, and notes follow.

FORM: Precisely scoped operational restructuring, directly shaped from the request; no concept-seed is required. Code-first. Signature interaction: the next-action section changes from packing to tracked dispatch or an explicit blocked state after an Inertia response. Motion: brief control transitions only.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Finish verification — 2026-10-04

Documenter outcome: **existing-system alignment**. Source comparison of `order.vue`, `WorkflowPanel.vue`, and `StatusForm.vue` against `PRODUCT.md`, `DESIGN.md`, the design sidecar, `inertia/assets/main.css`, and `vite.config.ts` confirms the incumbent Bricolage Grotesque family, semantic orange/taupe roles, shared corners, tonal grouping, and Nuxt UI controls. The action-first packing/dispatch/blocker hierarchy, payment/refund recovery, separate customer updates, and supporting record details implement the direction contract. Typed forms retain processing and validation states; manual orders retain their status controls.

This is an ordinary, code-first surface extension. No durable system change was approved or required; `DESIGN.md` and `.impeccable/design.json` are preserved. No new system drift was found in the scoped targets. Previously documented unresolved font-heading/animation utilities and incomplete custom-motion audit remain pre-existing limitations outside this scope.

Fresh finish review: **ship**, with Persistence, Fidelity, Ceiling, Material fixes, and Keep recorded in [the verdict](../review/order-operations-verdict.md); no material fixes remain. Verified captures are [desktop](../review/desktop.png), [mobile](../review/mobile.png), [recovery desktop](../review/recovery-desktop.png), and [recovery mobile](../review/recovery-mobile.png), plus [lower order details](../review/details-desktop.png). These contain synthetic browser-test data and are QA evidence, not shipping raster assets; no shipping raster was introduced or replaced.

Recorded validation: typecheck and scoped ESLint passed; checkout browser tests passed (3), the focused legacy manual-order browser test passed (1), the detector returned no findings on changed targets, and `git diff --check` passed.
