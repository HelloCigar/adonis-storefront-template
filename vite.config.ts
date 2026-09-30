import ui from '@nuxt/ui/vite'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import adonisjs from '@adonisjs/vite/client'

export default defineConfig({
  plugins: [
    vue(),
    ui({
      router: 'inertia',
      components: {
        dirs: ['inertia/components'],
        directoryAsNamespace: true,
        collapseSamePrefixes: true,
      },
      ui: {
        colors: {
          primary: 'green',
          secondary: 'yellow',
          neutral: 'slate',
        },
      },
    }),
    adonisjs({
      entryPoints: ['inertia/app.ts'],
      reload: ['resources/views/**/*.edge'],
    }),
  ],

  resolve: {
    alias: {
      '~/': `${import.meta.dirname}/inertia/`,
      '@generated': `${import.meta.dirname}/.adonisjs/client/`,
    },
  },

  server: {
    watch: {
      ignored: ['**/storage/**', '**/tmp/**'],
    },
  },
})
