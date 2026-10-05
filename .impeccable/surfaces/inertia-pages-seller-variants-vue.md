---
version: 1
slug: "inertia-pages-seller-variants-vue"
primary_target: "inertia/pages/seller/variants.vue"
related_targets: ["inertia/components/seller/variants/Table.vue","inertia/components/seller/variants/EditModal.vue","inertia/components/seller/variants/OptionsEditor.vue","inertia/components/seller/variants/GenerateModal.vue","inertia/components/product/Configurator.vue","inertia/components/product/option/Group.vue","inertia/components/cart/LineItem.vue"]
---

# Product variants

Mode: Operate. Extend the existing product-variant management page in the incumbent Warm Store Counter system. The user approved shared product options, unique combinations, generation, and explicit image assignment; build code-first.

## Direction contract

THESIS: Make variants understandable as combinations of a product's shared options, with their price, stock, and image visible together.

OWN-WORLD: Inherit Bricolage Grotesque, warm taupe surfaces, semantic orange actions, Nuxt UI controls, restrained borders, and the existing dashboard shell. No global token changes.

STORY: Staff define options and values, preview missing combinations, create them with explicit defaults, then assign product images and edit individual details. Legacy inconsistencies remain visible for repair.

FIRST VIEWPORT: Keep the dashboard navbar and Products return link. Place product title and shared option summaries above a searchable variant table. Show thumbnails beside variant names and keep price, SKU, stock, availability, and edit actions in the same row. Options expand inline; the generation preview protects a focused batch creation task.

FORM: Precisely scoped extension, no concept seed. Signature interaction: adding an option value updates the generation preview; creating missing combinations preserves existing variants. Image selection previews the assigned photograph. Responsive controls wrap, and the table scrolls within its own region.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Finished interface

The page retains the dashboard shell, product return link, compact search/status/display toolbar, and operational table. Shared option names and value chips sit between the product heading and table. The option editor expands in place; its names, tag inputs, labels, errors, and processing state use the incumbent Nuxt UI controls. Action rows wrap on small screens, while the table scrolls inside its own region.

Staff can define up to three shared option dimensions and assign one allowed value from each to a unique variant combination. Names in use stay read-only, and selected values cannot be removed without repairing those selections. Removing an option dimension clears it from each variant when the remaining combinations stay distinct. A conflicting save identifies the affected variants and stays unsaved; no variants are merged or deleted. Removing the final option from a single variant yields the default combination. Adding a dimension to a consistent product assigns its first value to existing variants, with that behavior disclosed before saving. Existing IDs, prices, SKUs, stock, and images remain intact.

The generation dialog previews only missing combinations within the 100-combination limit. Staff set starting price, compare-at price, stock, and availability before creating them; currency follows existing variants when present. Generated SKUs and images start empty. Existing variants retain their details, and repeating generation creates no duplicates.

Square thumbnail buttons open the variant editor. Image assignment uses keyboard-accessible radio choices from the same product, including an explicit No image choice; multiple variants may share a photograph. Product configuration resolves available variant combinations, and the cart displays the chosen variant's image or the existing semantic fallback.

Legacy configuration, invalid selection, and duplicate-combination warnings remain visible on the page and affected rows. Generation pauses until they are resolved. Additive option expansion may provide repair choices without rewriting invalid historical selections; those remain for explicit variant edits. Products with more than three legacy dimensions expose a guided per-variant repair path.

## Finish evidence

Fresh independent review disposition: ship. The THESIS, OWN-WORLD, STORY, FIRST VIEWPORT, and FORM contract sections remain valid, with no material visual fixes requested.

Inspected captures: `.impeccable/review/variants-desktop.png` (1280 × 900), `variants-mobile.png` (390 × 844), `variants-generation.png` (1280 × 900), and `variants-image-picker.png` (1280 × 900). They show the completed table, wrapped mobile controls, missing-combination preview, and selected/focused image choice. The source and captures retain semantic orange actions, warm taupe surfaces, Bricolage Grotesque, inherited corners, restrained table borders, and selective primary/overlay lift.

The scoped detector result at `.impeccable/review/variants-detect.json` is `[]`. Coordinator verification reports two passing product-variant browser tests and four passing product-option regression tests, including editing, generation, keyboard image selection, cart image propagation, mobile document containment, and duplicate rejection. Application verification and final backend results are reported by the coordinator.

This is an ordinary extension of the existing Warm Store Counter system. `DESIGN.md` and `.impeccable/design.json` remain unchanged. No shipping raster assets were created; product photographs are existing catalogue media, and review screenshots are evidence only. No new visual rule or defect was canonized.

## Option-removal refinement evidence

Fresh independent review disposition for the removal fix: ship. The scoped review confirmed the two requested corrections: the collision alert uses highlighted semantic text, with reviewer-measured contrast above 14:1 in both error captures, and this brief plus `PRODUCT.md` describe removal based on distinct remaining combinations. Normal and error states were inspected at desktop and mobile sizes in `.impeccable/review/variants-desktop.png`, `variants-mobile.png`, `variants-removal-error-desktop.png`, and `variants-removal-error-mobile.png`. The latter captures show the affected variant names and the unsaved editor after a conflicting removal.

The scoped detector result at `.impeccable/review/variant-removal-detect.json` is `[]`. Coordinator verification reports 16 passing functional tests and two passing browser tests, including final-option removal and preservation of raw legacy selections during additions and removal plus addition. Final build, typecheck, scoped ESLint, and whitespace checks passed. The existing development server on port 3333 was reused and left running. This refinement introduces no design-system change or shipping raster.
