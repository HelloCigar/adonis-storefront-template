import './css/app.css'
import { client } from '~/client'
import ui from '@nuxt/ui/vue-plugin'
import UApp from '@nuxt/ui/components/App.vue'
import { createInertiaApp } from '@inertiajs/vue3'
import { TuyauProvider } from '@adonisjs/inertia/vue'
import { renderToString } from '@vue/server-renderer'
import { createSSRApp, h, type DefineComponent } from 'vue'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import { resolveLayout } from './layouts/resolve'

const appName = import.meta.env.VITE_APP_NAME || 'Your store'

export default function render(page: any) {
  // The saved store name ends every page title, falling back to the build-time name.
  const siteName: string = page.props?.storeName || appName
  return createInertiaApp({
    // Props reach this function before JSON serialization (Luxon dates, models with toJSON).
    // Render from the same plain data the browser hydrates with so the markup matches.
    page: JSON.parse(JSON.stringify(page)),
    render: renderToString,
    title: (title) => (title ? `${title} - ${siteName}` : siteName),
    resolve: (name) => {
      return resolvePageComponent(
        `./pages/${name}.vue`,
        // Lazy, so a page module (and dependencies like the chat socket client) only loads on the
        // server when config/inertia.ts actually server-renders that page.
        import.meta.glob<DefineComponent>('./pages/**/*.vue'),
        resolveLayout(name)
      )
    },
    setup: ({ App, props, plugin }) => {
      return createSSRApp({
        render: () => h(UApp, () => h(TuyauProvider, { client }, { default: () => h(App, props) })),
      })
        .use(plugin)
        .use(ui)
    },
  })
}
