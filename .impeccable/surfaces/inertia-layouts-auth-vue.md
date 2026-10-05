---
version: 1
slug: "inertia-layouts-auth-vue"
primary_target: "inertia/layouts/auth.vue"
related_targets: ["inertia/pages/auth/login.vue","inertia/pages/auth/signup.vue","inertia/components/auth/PasswordInput.vue"]
---

# Authentication

Mode: Operate. Scope: `/login`, `/signup`, the shared authentication layout, and its password control.

Shoppers need to sign in or create a customer account, understand the account's practical value, and return to shopping. Use the user-confirmed temporary identity **Your store** until a final store name is chosen; PRODUCT.md also records the document-title fallback. Account context is limited to real order history, shipment details, and saved addresses. Guest shopping and checkout remain visible options.

## Direction contract

THESIS: A clear customer account entry that keeps the existing split composition and replaces framework/demo context with truthful store-account guidance.

OWN-WORLD: Inherit The Warm Store Counter: Bricolage Grotesque, semantic warm taupe surfaces, orange primary actions, shared Nuxt UI geometry, and brief control transitions.

STORY: Recognize the store, understand orders and saved addresses, complete the form, or return to shopping.

FIRST VIEWPORT: Brand and theme control sit above a centered compact form; its full-width submit follows the fields. Desktop adds a tonal account-benefits column; mobile keeps the theme control beside the brand and the complete form in one column.

FORM: Precisely scoped, code-first polish of the incumbent surface; no concept seed is required. Signature interaction: keyboard-accessible password reveal preserves the entered value, and validation supports correction without losing the email.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Finish alignment — 2026-10-05

Documenter outcome: **existing-system alignment with a local accessibility exception**. The shared layout, login and signup pages, password component, app title handling, and HTML shell align with PRODUCT.md and the incumbent DESIGN.md/sidecar. The existing type family, semantic palette, split layout, corners, focus treatments, and component processing/error states remain. Larger auth fields and submit controls, muted placeholders, direct labels, and the mobile theme control serve this Operate task. Auth copy claims only implemented customer capabilities. Full name remains optional; signup password guidance remains 8–32 characters.

The two auth submit buttons locally use highlighted foreground in light mode and inverted foreground in dark mode (`text-highlighted dark:text-inverted`). This resolves the reviewed light-theme contrast defect while retaining the existing orange fill, hover, shadow, and keyboard focus. It is an auth-only exception to the documented default primary-button foreground, not a new global component token. No durable system change was approved or needed; DESIGN.md and `.impeccable/design.json` are preserved byte-for-byte. Pre-existing font and custom-motion limitations in DESIGN.md are outside this scope.

Fresh review initially required one light submit-contrast fix. The [verdict pass](../review/auth-polish-verdict.md) marks that finding resolved and gives **ship at the single-fix scope**: text contrast is 4.90:1 by default and approximately 6.35:1 on hover; the 3px keyboard-focus outline and dark styling remain. The verdict assesses the listed fix and its regressions rather than reopening the entire surface.

Validated captures: [login desktop](../review/auth-login-desktop.png), [login mobile](../review/auth-login-mobile.png), [signup desktop](../review/auth-signup-desktop.png), [signup mobile](../review/auth-signup-mobile.png), [login dark](../review/auth-login-dark.png), [signup dark](../review/auth-signup-dark.png), and [signup at 1024px](../review/auth-signup-1024.png). These are QA evidence only; no shipping raster asset was introduced or replaced.

Recorded coordinator verification: `node ace test browser --files=auth` passed both authentication tests; `npm run typecheck` passed; scoped ESLint passed for the auth layout, pages, password component, app entry, and browser spec. The detector returned `[]` on the auth UI targets. `git diff --check` passed on the integrated tracked files. The tests cover successful sign-in, password-value preservation through reveal, validation with preserved email, and corrected signup as a customer. Light/dark views at 390px, 1024px, and 1280px were inspected with no observed browser console errors. The task's preview server remains running at `http://localhost:62120`.
