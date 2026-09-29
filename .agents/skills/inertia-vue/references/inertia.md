# AdonisJS Inertia v5 / Inertia v3 reference for Vue

Source of truth: [AdonisJS Inertia guide](https://docs.adonisjs.com/guides/frontend/inertia) and [v5 release and migration notes](https://adonisjs.com/blog/adonisjs-inertia-5). Check installed package declarations for details that differ between releases.

## Rendering and generated contracts

`inertia.render('posts/index', { posts })` in a controller resolves `inertia/pages/posts/index.vue`. Pages without controller behavior can use `router.on('/about').renderInertia('about')`. Use controllers when page-specific server behavior or props belong there.

`indexPages({ framework: 'vue3' })` and `generateRegistry()` belong in `adonisrc.ts` `hooks.init`. Page names and props are generated into `.adonisjs`; do not edit generated files. After changing a page, controller, route, validator, transformer, or middleware, wait for codegen before consuming its types.

```vue
<script setup lang="ts">
import type { Data } from '@generated/data'

defineProps<{ posts: Data.Post[] }>()
</script>
```

## Navigation and forms

For Vue, the AdonisJS wrappers live at `@adonisjs/inertia/vue`. Use them when named routes and generated types are desired:

```vue
<script setup lang="ts">
import { Form, Link, useRouter } from '@adonisjs/inertia/vue'

defineProps<{ post: { id: number; title: string } }>()
const router = useRouter()
const openPost = (id: number) => router.visit({ route: 'posts.show', routeParams: { id } })
</script>

<template>
  <Link route="posts.show" :params="{ id: post.id }">Open</Link>
  <Form route="posts.update" :params="{ id: post.id }" v-slot="{ errors, processing }">
    <input name="title" :value="post.title" />
    <p v-if="errors.title">{{ errors.title }}</p>
    <button type="submit" :disabled="processing">Save</button>
  </Form>
</template>
```

The Vue `Link` and `Form` components call their parameter prop `params`; the programmatic router object calls it `routeParams`. `Form` derives action and method from the named route. A validator used by the route determines its typed body and error fields. `errorBag` isolates multiple forms' errors without nesting the errors object under the bag name. Native input `name` attributes remain strings; do not claim they are statically checked.

Use `useRouter().visit({ route: '...' })` for shortcuts and other programmatic visits. A direct `{ href: '/...' }` is allowed but skips named-route validation. When a component library accepts only a `to` URL, use `urlFor` from the generated Tuyau client and check that the component navigates through Inertia rather than Vue Router. For non-navigation JSON requests, use the route-aware `useHttp` wrapper.

## Shared props and flash

The Inertia middleware extends `BaseInertiaMiddleware`. Preserve `share()`, `flash()`, and `handle()` when changing it. `share()` may run before other middleware, so guard access to optional context values. Put validation errors and persistent global data in `share()`; use `inertia.always()` if they must be returned on partial reloads. Put one-time messages in `flash()`.

```ts
// Server-side module augmentation in the middleware file
import type { InferSharedProps } from '@adonisjs/inertia/types'

declare module '@adonisjs/inertia/types' {
  type MiddlewareSharedProps = InferSharedProps<InertiaMiddleware>
  export interface SharedProps extends MiddlewareSharedProps {}
}
```

```ts
// inertia/types.ts: frontend type bridge
import type { Data } from '@generated/data'
import type { InferFlashData } from '@adonisjs/inertia/types'
import type InertiaMiddleware from '#middleware/inertia_middleware'

declare module '@inertiajs/core' {
  interface InertiaConfig {
    sharedPageProps: Data.SharedProps
    flashDataType: InferFlashData<InertiaMiddleware>
  }
}
```

On the client, `usePage().props.user` is shared data and `usePage().flash.success` is one-time flash data. Flash is no longer nested under `props` in v5. Standard Inertia features such as `usePage`, `Head`, and `Deferred` may be imported from `@inertiajs/vue3`.

## Data and response patterns

- `inertia.optional(fn)` computes a prop only when explicitly requested by a partial reload.
- `inertia.always(fn)` includes a prop even when the partial reload did not request it.
- `inertia.defer(fn, group?)` loads after the first render; `<Deferred data="prop">` provides fallback and optional rescue slots.
- `inertia.once(fn, options?)` avoids recomputing and resending data on normal subsequent visits until invalidated.
- `inertia.merge(value)`, `.deepMerge()`, and `.prepend()` support incremental props. Helpers must be at the top level of the props object.
- After a mutation, redirect with `response.redirect().toRoute(...)`. For an external origin, use `inertia.location(url)`. Use `inertia.clearHistory()` for sign-out and `inertia.encryptHistory()` for sensitive page data when appropriate.

## Version 5 migration details

For Vue, Inertia v3 needs `@inertiajs/vue3` 3.4+, Vue and `@vue/server-renderer` 3.5+, Vite 8, `@vitejs/plugin-vue` 6, and `@adonisjs/vite` 6. Vite owns the client and optional SSR entrypoints through `adonisjs({ entryPoints: ['inertia/app.ts'], serverEntryPoints: ['inertia/ssr.ts'] })`; omit `serverEntryPoints` when SSR is disabled. Remove the old `@adonisjs/inertia/vite` plugin and any `ssr.bundle` setting. Preserve the application's existing SSR choice and unrelated config.

Inertia v3 also changes event names, removes old progress exports, replaces `router.cancel()` with `router.cancelAll()`, and requires arrow functions for persistent layout callbacks. Verify a migration with typecheck and production build.
