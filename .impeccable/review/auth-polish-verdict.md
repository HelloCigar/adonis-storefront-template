# Authentication polish review — 2026-10-05

Scope: login, signup, and their shared layout. User-confirmed neutral identity: **Your store** until a final store name is chosen. This is a refinement of the incumbent design system.

## Initial fresh review

Disposition: **fix**. Persistence, Fidelity, Ceiling, Material fixes, and Keep were returned. Identity, typography, surfaces, responsive composition, and interaction matched the scoped polish. One material finding remained: light submit text measured 3.45:1 against the existing orange background.

## Verdict pass

Disposition: **ship** at the single-fix scope. Both submit buttons now use `text-highlighted dark:text-inverted`. The reviewer scored the contrast finding **resolved**: 4.90:1 default, approximately 6.35:1 hover. Keyboard focus retained its 3px outline and passing text contrast. Dark styling remained intact, and all seven recaptures were valid with no visible regression attributable to the fix. This verdict scores the listed fix rather than reopening the whole surface.

## Verification

- `node ace test browser --files=auth`: 2 passed. Real sign-in and corrected signup succeed; password visibility preserves values; validation preserves email and blocks invalid signup.
- `npm run typecheck`: passed.
- Scoped ESLint for the auth layout, pages, password component, app entry, and browser spec: passed.
- Impeccable detector: no findings, run once on the auth UI targets.
- Light/dark, 390px mobile, 1024px intermediate, and 1280px desktop were inspected. Browser console errors: none observed.

Final captures in this directory: `auth-login-desktop.png`, `auth-login-mobile.png`, `auth-signup-desktop.png`, `auth-signup-mobile.png`, `auth-login-dark.png`, `auth-signup-dark.png`, and `auth-signup-1024.png`. Captures are QA evidence, not shipping assets. Superseded and malformed captures were replaced or removed. No raster assets were introduced or replaced in the app.
