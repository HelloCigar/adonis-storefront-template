---
version: 1
slug: "resources-views-emails-order-notification-edge"
primary_target: "resources/views/emails/order_notification.edge"
related_targets: ["resources/views/emails/order_notification_text.edge","app/mails/checkout/order_notification.ts","app/services/checkout/notification_service.ts","config/mail.ts"]
---

# Order notification emails

Mode: Operate. Scope: the receipt and shipment emails sent by the durable notification job (HTML and plain-text views).
A customer opening the email needs to know what happened to their order, what they bought, where it is going, and how to open the private order page or track the parcel. Keep the existing subjects, Message-ID, 30-day private-link copy, and plain-text alternative. No invented claims, policies, or support channels.

Decisions (2026-10-07, user): full order summary (items, totals, delivery address) loaded by the notification job; the wordmark and sender name both come from MAIL_FROM_NAME.

Email constraints: table layout, inline styles with a head style block only for dark mode and narrow screens, hex colors converted from DESIGN.md OKLCH tokens, Bricolage Grotesque linked with a system sans fallback, no images (line-item images are relative and often SVG, which Gmail blocks), bulletproof button.

## Direction contract

THESIS: A counter receipt handed across the store: one status statement, the order exactly as bought, one action. It refuses the marketing-email arrangement of banner image, promo blocks, and social footer.

OWN-WORLD: Taupe 50 canvas, a single subtle card (taupe 100 tint, 1px taupe 200 ring, 20px corners), Bricolage Grotesque in taupe 900 headings and taupe 700 body, tabular figures, orange 700 primary button with 15px corners; dark mode on taupe 900 with orange 400 actions.

STORY: The reader sees the status in the inbox preview, confirms the amount or tracking number, checks items and address, then opens the order or tracks the parcel.

FIRST VIEWPORT: Store wordmark left with the order number right on one line; a 30px bold status headline; one plain sentence with the paid total or carrier; the primary button directly below; the summary card begins within the first screen on mobile.

FORM: Precisely specified single-artifact surface, shaped directly from the request; no concept-seed. Code-led. Signature moment: the shipment email leads with the tracking number set large in tabular figures as the thing to copy. Motion: none (email).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Finish verification — 2026-10-07

Outcome: existing-system alignment. Ordinary surface extension of "The Warm Store Counter"; DESIGN.md and .impeccable/design.json unchanged (no durable system change requested or approved).

Build against the direction contract: taupe 50 canvas (#fbfaf9); one card at #f7f5f5 (card-subtle approximation: taupe 100 at 50% over taupe 50) with a 1px taupe 200 ring (#e8e4e3) and 20px corners (rounded.lg); taupe 900 headings (#1d1816), taupe 700 body (#473c39), taupe 500 muted (#7c6d67); Bricolage Grotesque with a Helvetica/Arial fallback; tabular figures on order number, amounts, quantities, and tracking number; wordmark left and order number right; 30px/700 status headline (24px under 620px); primary button with 15px corners (rounded.md) and the 30% primary-tinted medium shadow (Selective Lift Rule); tracking number at 24px/700 tabular as the shipment signature; no images; dark mode on taupe 900 with taupe 800 card, orange 400 (#ff8904) actions, and the button shadow removed.

Email-medium adaptations (surface-local, not system tokens): hex conversions of DESIGN.md OKLCH; orange 700 (#ca3500) as the light action fill and link for contrast (white on orange 600 is about 3.4:1; same exception as the order page); button label 16px with 12px 22px padding (touch target); table layout, inline styles, bgcolor plus mso-padding-alt bulletproof button; hidden preheader; dark card ring uses taupe 700 so it stays visible on the taupe 800 fill; card padding 24px, 20px 16px on narrow screens. Type sizes 14/16/18/20/24/30 sit on the DESIGN.md ramp.

Finish review: first disposition "fix" with four material fixes (parcel heading truthfulness, shipment fallback-link wording, stale secondary line, Outlook button fill/padding). One batch; verdict pass scored all four resolved, no regressions, disposition "ship" (scope: the four scored fixes). Outlook checked in markup only; no Outlook capture exists.

Captures (synthetic demo data; QA evidence, not shipping rasters): .impeccable/review/email-{receipt,shipment}-{desktop,mobile,desktop-dark,mobile-dark}.png. No shipping raster added, so no raster provenance is owed.

Contrast: muted on canvas 4.75:1, on card 4.56:1; link/button 5.01:1; dark muted 6.90:1 / 5.98:1; dark button/link 7.39:1.

Detector: type-scale advisories fixed. Remaining findings accepted: hidden preheader (1px tight leading, intentional for inbox preview) and the light-only button shadow flagged as dark-glow (dark mode removes it).

Validation: npm run typecheck passed; scoped ESLint and Prettier passed; tests/functional/checkout/workflow.spec.ts 33/33 passed (money assertion updated to "₱1,098.00").

Not canonized: orange 700 action fill and email button sizing stay surface-local exceptions; no kickers, glyph icons, or offset shadows present. Open: no rendered Outlook capture.
