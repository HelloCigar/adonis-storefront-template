---
target: the order detail page
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\user\\Desktop\\mediabunny\\inertia\\pages\\seller\\order.vue"
target_fingerprint: "sha256:1bd03d9bf8583a9f60aaad00f933a12939c6e9d6c28a28474bd91702561859c3"
target_path: "C:\\Users\\user\\Desktop\\mediabunny\\inertia\\pages\\seller\\order.vue"
timestamp: 2026-10-05T14-18-55Z
slug: inertia-pages-seller-order-vue
closed: true
---
Method: dual-agent (A: design review · B: detector + capture evidence). Live page requires staff login (no seed credentials); visual evidence = fresh browser-test captures in .impeccable/review/. In-page overlay not run.

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Strip attention/current stage near-invisible; no notification timestamps or last-refreshed |
| 2 | Match System / Real World | 2 | Reconcile, Accepted, held/consumed stock, Staff #1, raw JSON, status slugs |
| 3 | User Control and Freedom | 2 | Pack/dispatch irreversible; tracking uneditable; no next/prev order |
| 4 | Consistency and Standards | 2 | Payment status x3; Unfulfilled vs Not dispatched; Queued vs Pending; refund neutral vs cancel red |
| 5 | Error Prevention | 3 | Good guards; dispatch emails without review; cancel never states refund amount |
| 6 | Recognition Rather Than Recall | 2 | Blockers far from fixes; items/address far from pack/ship forms |
| 7 | Flexibility and Efficiency | 1 | No next-to-pack, copy buttons, or auto-refresh |
| 8 | Aesthetic and Minimalist Design | 3 | Calm happy path; 5 amber blockers in recovery; zero Discount/Tax rows |
| 9 | Error Recovery | 2 | Lost-response great; validation offers Refresh; E_ codes collapsed; dead-end "stock records" |
| 10 | Help and Documentation | 2 | Inline consequence copy; no runbook links |
| Total | | 22/40 | Acceptable |

## Design Specificity
Copy and state logic specific to store order operations; composition is stock Nuxt UI dashboard (badges, icon strip, tinted card, dot timeline, UTable). Pick list and address buried as record.
Detector: 0 findings (order.vue, components/seller/orders). Measurement-only findings: light "Cancel this order" text-error 3.65:1 (WorkflowPanel.vue:567); navbar order number clipped without ellipsis on mobile/tablet. Prior 4.84:1 / 5.01:1 contrast fixes still hold; dark mode >= 6.45:1.

## Priority Issues
- [P1] Blockers flat list detached from fixes (WorkflowPanel.vue:224-240): structured blockers {code,message,fixTarget}, root cause first, <=3 causes, Reconcile form inside next-action card, per-cause targets. clarify -> distill
- [P1] Packing/dispatch hide pick list and address (order.vue:177-307): show compact pick list + shipping address with copy beside next-action when canPack/canShip. layout
- [P1] Focus lost when pack button unmounts / ship form mounts (WorkflowPanel.vue:241-309); only heading aria-live. Move focus to Carrier or heading, announce result, focus first invalid field on error. harden
- [P2] Money/customer actions lack concrete consequences: "Request full refund" vs "remaining" (:441-455); generic cancel copy + checkbox w/o amount, no heading, 3.65:1; dispatch doesn't show recipient email. Backend cancellation preview; "Request refund of PHP X"; cancel h2 + error 700 light; show email. clarify
- [P2] Status in three vocabularies; strip cannot show trouble or current stage; Customer updates inside ordered strip; truncated duplicate navbar title. distill -> colorize

## Persona Red Flags
Alex: no next order/copy buttons/polling; duplicate Refresh status; 6-option slug select.
Sam: focus loss; no headings on cancellation/payments; positional refund checkbox label; raw JSON read aloud; generic validation alert; cancel contrast.
Riley: partial refund label contradiction; only attempts[0]/shipments[0]; untimestamped retries; alert shifts ship form ~170px; stale-tab note save rejected with misleading message (server guards, no rollback).

## Minor Observations
Zero Discount/Tax rows; Staff #1; unlabeled provider slug/external id; toast covers address; below xl Customer updates drops below Payments; tablet h1 squeezes "Online checkout"; Q-glyph tail not an underline.

## Questions
Pick list last while packing? One cause one fix vs five blockers? Confirm refund without amount/recipient? What makes this Warm Store Counter vs dashboard template?
