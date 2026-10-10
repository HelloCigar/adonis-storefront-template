import { defineConfig } from '@adonisjs/inertia'

/**
 * Public pages that crawlers and link previews read. Everything else (account,
 * checkout, staff dashboard, settings, auth) boots on the client as usual.
 */
const SERVER_RENDERED_PAGES =
  /^(index|(product|collection|blog|pages|policies)\/.+|collections\/index)$/

const inertiaConfig = defineConfig({
  /**
   * Server-side rendering options.
   */
  ssr: {
    /**
     * Toggle SSR mode for Inertia pages.
     */
    enabled: true,

    /**
     * Entry file used by the SSR server build. Also listed under
     * `serverEntryPoints` in vite.config.ts so production builds bundle it.
     */
    entrypoint: 'inertia/ssr.ts',

    /**
     * Only the public storefront and content pages render on the server.
     */
    pages: (_ctx, page) => SERVER_RENDERED_PAGES.test(page),
  },
})

export default inertiaConfig
