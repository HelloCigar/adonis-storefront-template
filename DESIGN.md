---
"name": "In-house Store Template"
"description": "The Warm Store Counter: friendly, expressive storefronts and straightforward store operations."
"colors":
  "primary": "oklch(64.6% 0.222 41.116)"
  "primary-dark": "oklch(75% 0.183 55.934)"
  "secondary": "oklch(79.5% 0.184 86.047)"
  "secondary-dark": "oklch(85.2% 0.199 91.936)"
  "taupe-50": "oklch(98.6% 0.002 67.8)"
  "taupe-100": "oklch(96% 0.002 17.2)"
  "taupe-200": "oklch(92.2% 0.005 34.3)"
  "taupe-300": "oklch(86.8% 0.007 39.5)"
  "taupe-400": "oklch(71.4% 0.014 41.2)"
  "taupe-500": "oklch(54.7% 0.021 43.1)"
  "taupe-700": "oklch(36.7% 0.016 35.7)"
  "taupe-800": "oklch(26.8% 0.011 36.5)"
  "taupe-900": "oklch(21.4% 0.009 43.1)"
"typography":
  "display":
    "fontFamily": "Bricolage Grotesque, sans-serif"
    "fontSize": "3rem"
    "fontWeight": 800
    "lineHeight": "1"
  "display-small":
    "fontFamily": "Bricolage Grotesque, sans-serif"
    "fontSize": "2.25rem"
    "fontWeight": 800
    "lineHeight": "2.5rem"
  "headline":
    "fontFamily": "Bricolage Grotesque, sans-serif"
    "fontSize": "2.25rem"
    "fontWeight": 700
    "lineHeight": "2.5rem"
  "headline-small":
    "fontFamily": "Bricolage Grotesque, sans-serif"
    "fontSize": "1.875rem"
    "fontWeight": 700
    "lineHeight": "2.25rem"
  "title":
    "fontFamily": "Bricolage Grotesque, sans-serif"
    "fontSize": "1.5rem"
    "fontWeight": 600
    "lineHeight": "2rem"
  "product-title":
    "fontFamily": "Bricolage Grotesque, sans-serif"
    "fontSize": "1.25rem"
    "fontWeight": 400
    "lineHeight": "1.75rem"
  "body":
    "fontFamily": "Bricolage Grotesque, sans-serif"
    "fontSize": "1rem"
    "fontWeight": 400
    "lineHeight": "1.5rem"
  "body-large":
    "fontFamily": "Bricolage Grotesque, sans-serif"
    "fontSize": "1.125rem"
    "fontWeight": 400
    "lineHeight": "1.75rem"
  "label":
    "fontFamily": "Bricolage Grotesque, sans-serif"
    "fontSize": "0.875rem"
    "fontWeight": 500
    "lineHeight": "1.25rem"
  "caption":
    "fontFamily": "Bricolage Grotesque, sans-serif"
    "fontSize": "0.75rem"
    "fontWeight": 400
    "lineHeight": "1rem"
"rounded":
  "base": "0.625rem"
  "xs": "0.3125rem"
  "sm": "0.625rem"
  "md": "0.9375rem"
  "lg": "1.25rem"
  "full": "9999px"
  "none": "0px"
"spacing":
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "6": "1.5rem"
  "8": "2rem"
  "12": "3rem"
  "16": "4rem"
  "unit": "0.25rem"
  "1.5": "0.375rem"
  "2.5": "0.625rem"
"components":
  "button-primary":
    "backgroundColor": "{colors.primary}"
    "textColor": "{colors.taupe-50}"
    "rounded": "{rounded.md}"
    "padding": "0.375rem 0.625rem"
    "typography": "{typography.label}"
  "button-primary-dark":
    "backgroundColor": "{colors.primary-dark}"
    "textColor": "{colors.taupe-900}"
    "rounded": "{rounded.md}"
    "padding": "0.375rem 0.625rem"
    "typography": "{typography.label}"
  "button-outline-neutral":
    "backgroundColor": "transparent"
    "textColor": "{colors.taupe-700}"
    "rounded": "{rounded.md}"
    "padding": "0.375rem 0.625rem"
    "typography": "{typography.label}"
  "button-ghost-neutral":
    "backgroundColor": "transparent"
    "textColor": "{colors.taupe-700}"
    "rounded": "{rounded.md}"
    "padding": "0.375rem 0.625rem"
    "typography": "{typography.label}"
  "button-soft-primary":
    "backgroundColor": "color-mix(in oklab, oklch(64.6% 0.222 41.116) 10%, transparent)"
    "textColor": "{colors.primary}"
    "rounded": "{rounded.md}"
    "padding": "0.375rem 0.625rem"
    "typography": "{typography.label}"
  "input-outline":
    "backgroundColor": "{colors.taupe-50}"
    "textColor": "{colors.taupe-900}"
    "rounded": "{rounded.md}"
    "padding": "0.375rem 0.625rem"
  "badge-primary":
    "backgroundColor": "{colors.primary}"
    "textColor": "{colors.taupe-50}"
    "rounded": "{rounded.md}"
    "padding": "0.25rem 0.5rem"
  "card-subtle":
    "backgroundColor": "color-mix(in oklab, oklch(96% 0.002 17.2) 50%, transparent)"
    "rounded": "{rounded.lg}"
    "padding": "1rem"
  "nav-active":
    "textColor": "{colors.primary}"
    "rounded": "{rounded.md}"
    "padding": "0.375rem 0.625rem"
    "typography": "{typography.label}"
---

# Design System: In-house Store Template

## Overview

**Creative North Star: "The Warm Store Counter"**

The Warm Store Counter brings approachable commerce together with practical store operations. The confirmed voice is friendly and expressive: distinctive typography gives the interface character, while straightforward interactions keep shopping and management easy to follow.

Warm Taupe surfaces support Burnt Orange actions and a configured Golden Yellow secondary accent. Large storefront headings and generous section spacing coexist with compact forms, navigation, and operational tables. Softly lifted actions and overlays add warmth; tonal surfaces and thin dividers carry most of the structure.

This is a record of the incumbent interface, not a replacement identity. Evidence comes from the current source, generated Nuxt UI themes, and computed styles on the running storefront and login page in light and dark mode. Store-management patterns were inspected in source. No visual anti-reference or separate component-character phrase was confirmed. The template's final brand remains open in PRODUCT.md.

**Key Characteristics:**

- Friendly, expressive typography with direct interaction labels.
- Warm neutral surfaces with orange primary actions.
- Soft corners, tonal grouping, and selective shadows.
- Generous storefront spacing and compact operational controls.
- Semantic colors and geometry shared across light and dark themes.

## Colors

The palette combines energetic orange, supporting yellow, and lightly warm neutral surfaces. The frontmatter preserves the project's canonical OKLCH values. Unqualified component tokens describe the light theme; the sidecar previews inherit live semantic variables and adapt to the active theme.

### Primary

- **Burnt Orange:** primary actions, active navigation, focus treatments, logo accents, and the route-progress indicator. Light mode uses orange 600; dark mode uses orange 400, captured as primary-dark.

### Secondary

- **Golden Yellow:** the configured secondary role uses yellow 500 in light mode and yellow 400 in dark mode. It is available to components but is not a dominant recurring surface color in the inspected screens.

### Neutral

- **Warm Taupe:** the source scale supplies surfaces, copy, outlines, and dividers. Light mode uses taupe 50 for the canvas and inverted action text, 100 for muted/elevated surfaces, 200 for default borders, 300 for accented outlines, 700 for body text, and 900 for headings.
- **Dark Warm Taupe:** dark mode uses taupe 900 for the canvas and inverted action text, 800 for muted/elevated surfaces and default borders, 700 for accented borders, 200 for body text, and 50 for headings. Muted copy changes from taupe 500 to 400; dimmed copy changes from 400 to 500.
- **Status roles:** retain Nuxt UI success, info, warning, and error tokens for status badges, alerts, and validation. Error remains a status role, not a new brand accent. Their values are dependency defaults rather than app-specific palette overrides.

**The Semantic Theme Rule.** Use the semantic Nuxt UI color roles; let the current theme choose their palette step. Do not fix a light-theme color into a shared control.

## Typography

**Display and Body Font:** Bricolage Grotesque, with a generic sans-serif fallback. Google Fonts supplies the application font; there is no confirmed second display face.

**Character:** expressive large headings give the storefront personality; the same family keeps forms, tables, and navigation direct and consistent. The size system follows Tailwind's stepped scale rather than one constant ratio.

### Hierarchy

- **Display:** storefront title uses display-small on small screens and display at the large breakpoint.
- **Headline:** storefront section headings use headline-small, increasing to headline at the large breakpoint.
- **Title:** authentication headings use title. Checkout uses the larger headline-small size with semibold weight rather than the storefront's bold section treatment.
- **Product title:** product-title is regular weight and sits alongside price and cart controls.
- **Body:** body is the default; storefront introductions become body-large at the large breakpoint.
- **Label:** medium-weight label text is used for default buttons and navigation. Field input text is regular weight, 16px on smaller screens and 14px from the medium breakpoint, with a 20px line height.
- **Caption:** compact order hints and helper copy use caption. Small badges use their own component size variants.

**The Single Family Rule.** Bricolage Grotesque supplies both headings and interface text. The Source Sans 3 link in the HTML shell is not the active application font.

## Layout

The shared storefront container is centered, full width up to 80rem (1280px at the usual 16px root), with side gutters of 16px, 24px from the small breakpoint, and 32px from the large breakpoint. Spacing is based on a 4px unit; recurring gaps and padding use the scale captured in frontmatter.

Storefront sections commonly use 48px vertical spacing, increasing to 64px on large screens. Checkout and order status pages start at 32px vertical padding, increasing to 48px, inside a 72rem container. From the large breakpoint the form or status column sits beside a 22rem summary column (24rem from extra-large) that sticks below the header. On smaller screens checkout opens with a collapsible summary showing the total, and the payment button follows the form. Collection listing grids progress from one to two to three columns; filter controls move into a sidebar where space permits. Product details use a twelve-column desktop grid, then stack for small screens.

Operational pages use dashboard panels, a collapsible/resizable sidebar, compact table toolbars, and search fields capped at the small container width. Settings content uses a centered two-extra-large content column. Authentication uses a compact form capped at 24rem, with a second contextual column shown only on large screens.

Breakpoints are the existing Tailwind defaults: small 40rem, medium 48rem, large 64rem, extra-large 80rem, and double-extra-large 96rem. These measurements describe existing behavior, not a new responsive specification.

## Elevation & Depth

**Philosophy: softly lifted.** Shadows add warmth without defining the whole layout. Muted/elevated tones, one-pixel rings, and dividers provide most grouping. Solid primary buttons receive an orange-tinted medium shadow; modal and navigation overlays use the larger library shadow.

### Shadow Vocabulary

- **Primary action lift:** the medium two-layer shadow, recolored to the current primary at 30% opacity. Exact CSS is stored in the sidecar and resolves through the live primary token.
- **Overlay lift:** the library's large neutral shadow under dialogs and navigation popovers.
- **Structural rings:** one-pixel default or accented rings define cards and fields without directional lift.

**The Selective Lift Rule.** Keep the primary-button tint and overlay shadows; ordinary content grouping uses tonal surfaces and borders.

Motion is brief and state-driven: color transitions typically run for 150ms, navigation/selector rotations for 200ms, and expandable cart-action labels for 300ms. Nuxt UI includes reduced-motion handling for several overlay and navigation transitions; custom transitions have not been audited for complete reduced-motion coverage. A product image references animate-pop-up without a corresponding definition in the inspected project; it is not an established motion token.

## Shapes

The shared base radius is 10px at a 16px root. Nuxt UI multiplies it: small corners retain the base, medium control/media corners become 15px, and large card/dialog corners become 20px. Small arrow geometry uses a half-base corner. Circular cart controls, avatars, and color swatches use fully rounded geometry.

Product cards deliberately remove outer rounding and surface fill, leaving rounding on the square image wrapper. Operational table headers round their outer ends while preserving straight interior dividers. Do not replace these observed exceptions with a universal card silhouette.

## Components

### Buttons

Direct labels and rounded silhouettes share one family with navigation and fields. The default primary button uses medium corners, medium-weight label text, and 6px vertical/10px horizontal padding. Icons are usually 20px. Primary solid actions use inverted text, a tinted shadow, and a 75% primary hover/active fill. Keyboard focus uses a 3px outline at 25% of the action color. Disabled controls use 75% opacity and a blocked cursor; processing controls expose a loading spinner.

Neutral outline and ghost buttons support secondary actions, menus, and utility controls. Primary soft buttons use a 10% tint, increasing to 15% on interaction. Larger button variants increase padding; round cart controls override the default with 10px all-around padding.

### Chips and Status Badges

Compact medium badges use medium corners, 12px text, and 4px vertical/8px horizontal padding. Solid primary badges identify supported product types; neutral solid badges communicate sold-out state; error soft badges communicate discounts. Operational status colors come from domain status mappings, with text labels retained.

### Cards / Containers

The app config makes subtle cards the default: an elevated surface at half opacity, a one-pixel default ring, internal dividers, and large corners. Body padding is 16px, becoming 24px at the small breakpoint. Card headings use semibold highlighted text and descriptions use muted small text. Transparent product wrappers are an explicit exception.

### Inputs / Fields

Outline fields use the default canvas, highlighted text, dimmed placeholders, an accented inset ring, and medium corners. Default padding is 6px vertical/10px horizontal. Focus changes the ring to primary and adds the 3px quarter-opacity outline. Labels, helper text, required markers, and error messages remain separate form-field elements. Validation can change the semantic color to error; disabled state follows the library.

### Navigation

Medium-weight small text and 20px icons form a compact navigation rhythm. Active entries receive primary text with a rounded tonal highlight; inactive entries use muted copy and a tonal hover surface. The storefront header switches to a vertical mobile menu. Store operations use the same navigation primitive vertically in a collapsible sidebar, with labels becoming tooltips when collapsed.

### Product Cards and Operational Tables

Product cards place square media above title/price and a round cart action, with badges anchored over media. Desktop hover may reveal a second product image or carousel arrows; variant selection opens a larger dialog. Preserve real media and loading/availability states without turning demo assets into a brand requirement.

Operational tables share a gently rounded, tonal header, horizontal row dividers, a search/filter toolbar, row-action menus, and a count/pagination footer. Empty states use a small icon, a highlighted explanation, and muted guidance that changes with the current filters.

## Do's and Don'ts

### Do:

- **Do** use semantic surface, text, border, and action roles in both themes.
- **Do** derive control and card corners from the shared base radius.
- **Do** preserve the difference between generous storefront sections and compact operational controls.
- **Do** keep focus, processing, disabled, validation, and selected states supplied by the component library.
- **Do** retain square product media, readable price hierarchy, and transparent product-card wrappers.

### Don't:

- **Don't** substitute Tailwind's unmodified corner defaults for Nuxt UI's radius multipliers.
- **Don't** turn the configured secondary yellow into an established dominant color; its actual usage is sparse.
- **Don't** make every card glow or lift; the implemented orange shadow belongs to solid primary buttons.
- **Don't** document Source Sans 3 or the unresolved font-headings utility as a second active font family.
- **Don't** treat demo logos, sample product imagery, missing media, or placeholder copy as binding brand assets.

Source authority: inertia/assets/main.css, vite.config.ts, the generated Nuxt UI component themes, and the relevant layouts/components. The document follows the [DESIGN.md format](https://raw.githubusercontent.com/google-labs-code/design.md/main/docs/spec.md). Re-extract tokens after a theme or dependency change; this record does not claim a visual or accessibility audit.
