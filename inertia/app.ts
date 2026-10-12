import './css/app.css'
import ui from '@nuxt/ui/vue-plugin'
import { client } from '~/client'
import UApp from '@nuxt/ui/components/App.vue'
import { createInertiaApp, router } from '@inertiajs/vue3'
import { TuyauProvider } from '@adonisjs/inertia/vue'
import { createApp, createSSRApp, type DefineComponent, h } from 'vue'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import { resolveLayout } from './layouts/resolve'

const appName = import.meta.env.VITE_APP_NAME || 'Your store'

/** The saved store name ends every page title; it follows the shared prop across visits. */
let siteName = appName
const nameFrom = (props: Record<string, unknown>) =>
  typeof props.storeName === 'string' && props.storeName ? props.storeName : appName
router.on('navigate', (event) => {
  siteName = nameFrom(event.detail.page.props)
})

createInertiaApp({
  title: (title) => (title ? `${title} - ${siteName}` : siteName),
  resolve: (name) => {
    return resolvePageComponent(
      `./pages/${name}.vue`,
      import.meta.glob<DefineComponent>('./pages/**/*.vue'),
      resolveLayout(name)
    )
  },
  setup({ el, App, props, plugin }) {
    siteName = nameFrom(props.initialPage.props)
    // Public pages arrive server-rendered (config/inertia.ts) and hydrate; the rest mount fresh.
    const create = el?.hasAttribute('data-server-rendered') ? createSSRApp : createApp
    create({
      render: () => h(UApp, () => h(TuyauProvider, { client }, { default: () => h(App, props) })),
    })
      .use(plugin)
      .use(ui)
      .mount(el)
  },
  progress: {
    color: 'var(--ui-primary)',
  },
  defaults: {
    // Visits that replace the current history entry update the page in place, like filters.
    visitOptions: (_href, options) => ({ viewTransition: !options.replace }),
  },
})
