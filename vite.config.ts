import ui from '@nuxt/ui/vite'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import adonisjs from '@adonisjs/vite/client'

export default defineConfig({
  plugins: [
    vue(),
    ui({
      router: 'inertia',
      // Bundle every icon the pages use instead of fetching them from the Iconify API at runtime.
      icon: {
        clientBundle: {
          scan: { globInclude: ['inertia/**/*.vue'] },
        },
      },
      components: {
        dirs: ['inertia/components'],
        directoryAsNamespace: true,
        collapseSamePrefixes: true,
      },
      ui: {
        colors: {
          primary: 'orange',
          secondary: 'yellow',
          neutral: 'taupe',
        },
        card: {
          defaultVariants: {
            variant: 'subtle',
          },
        },
        alert: {
          defaultVariants: {
            variant: 'subtle',
          },
        },
        empty: {
          defaultVariants: {
            variant: 'subtle',
          },
        },
        button: {
          compoundVariants: [
            {
              color: 'primary',
              variant: 'solid',
              class: 'shadow-md shadow-primary/30',
            },
          ],
        },
      },
    }),
    adonisjs({
      entryPoints: ['inertia/app.ts'],
      serverEntryPoints: ['inertia/ssr.ts'],
      reload: ['resources/views/**/*.edge'],
    }),
  ],

  resolve: {
    alias: {
      '~/': `${import.meta.dirname}/inertia/`,
      '@generated': `${import.meta.dirname}/.adonisjs/client/`,
    },
  },

  optimizeDeps: {
    // The startup scan misses these dashboard dependencies, so Vite finds them on the first
    // dashboard visit and force-reloads the page, dropping any flash message mid-test.
    include: ['@unovis/vue', '@internationalized/date'],
  },

  ssr: {
    // Nuxt UI resolves its virtual `#imports` through the Vite plugin, so the SSR bundle has to include it.
    noExternal: ['@nuxt/ui'],
  },

  server: {
    allowedHosts: ['vbns3m5x-3333.asse.devtunnels.ms'],
    watch: {
      ignored: ['**/storage/**', '**/tmp/**'],
    },
  },
})
