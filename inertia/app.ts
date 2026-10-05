import './css/app.css'
import ui from '@nuxt/ui/vue-plugin'
import { client } from '~/client'
import UApp from '@nuxt/ui/components/App.vue'
import { createInertiaApp } from '@inertiajs/vue3'
import { TuyauProvider } from '@adonisjs/inertia/vue'
import { createApp, type DefineComponent, h } from 'vue'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import { resolveLayout } from './layouts/resolve'

const appName = import.meta.env.VITE_APP_NAME || 'Your store'

createInertiaApp({
  title: (title) => (title ? `${title} - ${appName}` : appName),
  resolve: (name) => {
    return resolvePageComponent(
      `./pages/${name}.vue`,
      import.meta.glob<DefineComponent>('./pages/**/*.vue'),
      resolveLayout(name)
    )
  },
  setup({ el, App, props, plugin }) {
    createApp({
      render: () => h(UApp, () => h(TuyauProvider, { client }, { default: () => h(App, props) })),
    })
      .use(plugin)
      .use(ui)
      .mount(el)
  },
  progress: {
    color: 'var(--ui-primary)',
  },
})
