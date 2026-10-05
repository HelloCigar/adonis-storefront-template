# Order hardening finish review — 2026-10-05

Scope: `inertia/pages/seller/order.vue` and its order-domain components. This is an ordinary code-led refinement of the incumbent system. Captures use synthetic browser-test records.

## Fresh review

Disposition: **fix**.

### Persistence

PRODUCT.md exists, the configured build path is code, and the surface contract supports a scoped refinement without a comp or concept seed. DESIGN.md matches the incumbent world. The prior finish record predates this build.

### Fidelity

| Element           | Verdict                      | Evidence                                                                                           |
| ----------------- | ---------------------------- | -------------------------------------------------------------------------------------------------- |
| Type              | Match                        | Bricolage Grotesque hierarchy across desktop, tablet, mobile, and dark captures.                   |
| Material          | Match                        | Tonal surfaces, thin dividers, library icons, and selective action shadows.                        |
| Ground            | Match                        | Light and dark Warm Taupe agree with the surface contract.                                         |
| Workflow          | Match                        | Four stages precede packing, blockers, payment records, customer updates, and activity.            |
| First viewport    | Adaptation                   | Wide views retain two columns; narrow views stack within available width.                          |
| Forms and states  | Match                        | Backend availability, typed forms, shared locking, validation retention, and uncertainty recovery. |
| Long records      | Match                        | Multilingual titles, variants, SKUs, customer references, and addresses wrap.                      |
| Light action text | Contradicted in first review | Bright orange normal-size links and primary labels fell below 4.5:1.                               |

### Ceiling

Reached for this incumbent-system refinement. All ten required captures passed validity. Additional ornament, imagery, and animation are outside the contract.

### Material fixes

Raise light-theme action/link contrast to at least 4.5:1 while preserving orange actions and the dark theme. The initial recovery link measured about 3.32:1; the packing label measured about 3.58:1.

### Keep

Preserve backend-driven availability, uncertainty recovery, action-first hierarchy, separate updates/history, dark treatment, and long-record wrapping.

## Post-fix verdict

**Resolved.** Final captures show the existing orange-700 shade (`#ca3500`) on light actions. The reviewer measured recovery-link contrast at **4.84:1** and packing-label contrast at **5.01:1**. Dark treatment remains intact. All ten required captures are valid, with no material regressions from this fix batch.

Remaining: **clear**.

Disposition: **ship**. The verdict covers the scored contrast fix; the original review's other scoped checks passed.

## Fresh documentation handoff

No changes. The documenter checked PRODUCT.md, DESIGN.md, `.impeccable/design.json`, shared stylesheet/configuration, the surface contract, and the five frontend sources. The incumbent semantic palette, Bricolage Grotesque family, operational hierarchy, Nuxt UI controls, and shared geometry remain aligned. The light-action contrast correction remains scoped to this page; no shared-system change was approved. Previously documented unresolved font-heading/animation utilities and incomplete custom-motion coverage were reported and left outside scope.

## Evidence

Captures: `desktop.png`, `mobile.png`, `tablet.png`, `dark-desktop.png`, `recovery-desktop.png`, `recovery-mobile.png`, `details-desktop.png`, `details-tablet.png`, `details-mobile.png`, and `error-mobile.png` in this directory. Main captures show the document top; `details-*` deliberately show scrolled order records. These are QA artifacts, not shipping raster assets.

The detector ran once on the five changed frontend targets and returned no findings; see `order-hardening-detector.json`. Final browser hardening tests verify rendered primary-label and link contrast, lost-response locking and refresh recovery, retained validation input, refund acknowledgement/repeated clicks, manual empty states, safe tracking links, and original-currency capture/refund amounts.

Validation: 45 functional tests passed before the cancellation availability follow-up; all 5 availability tests then passed, bringing unique verified functional coverage to 46. Checkout browser tests passed (3), final hardening browser tests passed (5), and the existing manual-order edit regression passed (1). Vue typecheck, scoped ESLint, Prettier, and whitespace checks passed. Backend TypeScript passed with only the unused-parameter check disabled to isolate the existing untracked chat-adapter errors. Full typecheck and application build remain blocked by those pre-existing TS6133 errors; production frontend assets built successfully before the final contrast correction.
