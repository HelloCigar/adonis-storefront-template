# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Confirmed scope: this is a custom template for an in-house store.

The current implementation serves shoppers, store staff, and administrators. The intended customer audience and merchandise are open decisions for each store adopting the template.

## Product Purpose

Provide a reusable foundation for an in-house store, with a storefront and shared store operations that can be customized for the adopting business.

Store-specific success measures and customer positioning are undecided. Do not treat the demo catalogue as the intended merchandise.

## Operating Context

Repository evidence establishes the current baseline:

- One shared store and catalogue. Customer, staff, and admin are the supported roles.
- Shoppers browse collections and products, choose variants, manage a cart, and check out as guests or with an account.
- Customers manage their profile, saved addresses, their own order history, and reviews of products they received.
- Staff manage the shared catalogue and orders, including packing, shipment tracking, delivery confirmation, cancellation, refunds, payment review, and product review moderation. Administrators additionally manage users and roles.

## Capabilities and Constraints

The following are implemented defaults, not independently confirmed business requirements:

- AdonisJS backend with Vue, Inertia, Nuxt UI, Tailwind CSS, and Lucid/SQLite.
- PHP prices, an en-PH locale, and a frozen PHP 100 shipping fee per order.
- PayMongo hosted checkout and a development-only local payment simulator.
- Staff-managed discount codes (percentage or fixed amount off merchandise, never shipping) with optional minimum spend, schedule, usage limit and one use per customer email.
- Staff-written blog posts in the Nuxt UI rich text editor, saved as drafts, published, or scheduled. The server renders each post's HTML from the editor's document and keeps only known formatting and safe links.
- Customers review products from their own delivered orders: one review per product, rated 1 to 5 stars with an optional title and text. Reviews stay pending until staff approve or hide them. Only approved reviews appear on the product page and count toward its rating, and editing a review returns it to pending.
- Payment confirmation requires verified provider evidence. A browser return alone cannot mark an order paid.
- Private guest order access and ownership checks protect personal account data.
- One staff-managed shipment per order. Partial shipments, returns, and post-shipment refunds are outside the documented rollout.
- The `seller/` URLs and source names are compatibility names for shared store management. They do not imply multiple stores, independent sellers, teams, or ownership-based catalogue access.

Keep the current behavior unless a subsequent task explicitly changes it. Deployment target, launch scope, product-specific accessibility requirements, and any store-specific variations remain open.

Approved catalogue workflow: staff define up to three shared product options, edit unique variant combinations, assign images from the same product, and generate only missing combinations within a 100-combination limit using explicit starting details. Generation preserves existing variant IDs, prices, SKUs, stock, and images. Staff may remove an option dimension when the remaining combinations stay distinct; conflicting saves name affected variants and never merge or delete their records. Legacy inconsistencies are flagged and pause generation; additive option expansion can provide repair choices while invalid historical selections remain unchanged until explicit edits. Shoppers select available combinations, and the cart uses the selected variant's image.

Stock adjustments: staff open a tracked variant's stock page to add received or returned units, remove damaged or lost units, or set a counted total, with a required reason and an optional note. On hand never drops below zero or below units held by pending orders, and an adjustment never changes whether the variant is available for sale. Every staff stock change is logged with who made it, including stock set through the variant form or variant generation. Order reservations, sales, and cancellation restocks stay in the order workflow and are not part of this log.

## Brand Commitments

The final product and store name are undecided. MediaBunny appears in mail configuration, while Nuxt Shopify and Nuxt UI demo copy remain in the storefront. These are existing implementation references, not a confirmed brand commitment.

Authentication uses the user-approved neutral label "Your store" until a final store name is chosen. It replaces framework branding and is also the default document-title suffix when `VITE_APP_NAME` is unset.

No store-specific voice, approved marketing claims, or binding visual constraints have been supplied.

## Evidence on Hand

- `AUTHORIZATION.md`: single-store roles, permissions, and compatibility constraints.
- `PAYMENTS.md`, `docs/checkout-process.md`, and `docs/checkout-operations.md`: implemented checkout, payment, fulfillment, and recovery behavior.
- `docs/product-reviews.md`: product review eligibility, moderation, and display rules.
- `database/seeders/main_seeder.ts`: development/test catalogue examples for everyday essentials, home goods, and workspace items. These are demo content.
- `config/storefront.ts`: authored content slots for pages and policies; currently empty in the checked-in configuration. Blog posts live in the `blog_posts` table and appear at `/blog`.
- `inertia/`: existing storefront, account, and store-management interface.

No approved customer testimonials, business metrics, store policies, or launch claims have been supplied. Future work must not invent them.

## Product Principles

- Make store-specific customization possible without treating demo content as business truth.
- Support the full shopping and store-operations journey within one shared store.
- Preserve clear role boundaries and private customer access.
- Keep order and payment status grounded in verified backend state.
