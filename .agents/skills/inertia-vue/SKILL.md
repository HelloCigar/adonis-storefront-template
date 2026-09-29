---
name: inertia-vue
description: Build or debug the Vue frontend of an AdonisJS v7 application using @adonisjs/inertia v5 and Inertia v3. Use for page resolution, layouts, typed props, named-route navigation, forms, shared data, flash, and Inertia visits. Use the adonisjs skill for controllers, routes, middleware, and other backend code.
---

# AdonisJS Inertia v5 with Vue

AdonisJS owns URLs, middleware, validation, and data. Vue renders the page returned by `inertia.render()`. Do not introduce Vue Router for Inertia page navigation.

## Core decisions

- Put routable components in `inertia/pages/`. A controller's `inertia.render('posts/index', props)` resolves `inertia/pages/posts/index.vue`; a simple route can use `renderInertia()` directly.
- Use `Link`, `Form`, `useRouter`, and `useHttp` from `@adonisjs/inertia/vue` when their route-aware APIs are needed. These read generated route names, parameters, HTTP methods, and request bodies. Use `usePage`, `Head`, and `Deferred` from `@inertiajs/vue3` for standard Inertia features.
- Use `<Link route="posts.index">` for named-route navigation. In a component library that accepts a URL string, generate it from the typed client (`urlFor` from `~/client`) and confirm that the library renders an Inertia link. For programmatic navigation use `useRouter().visit({ route: 'posts.index' })`. Use `{ href: url }` only for a direct URL.
- Use `<Form route="posts.store" v-slot="{ errors, processing }">` for mutations. The route determines the method and action. For Vue route parameters pass `:params="{ id: post.id }"` to `Link` or `Form`; `useRouter().visit()` uses `routeParams` inside its route object. The errors slot is scoped by `errorBag` when one is set.
- Type page-specific props with `defineProps<{ posts: Data.Post[] }>()` and `import type { Data } from '@generated/data'`. Generated `InertiaPages` checks page names and controller props. Keep shared props in `InertiaMiddleware.share()` and one-time messages in `flash()`. `usePage().props` and `usePage().flash` are different fields in v5.
- Do not use a transformer type such as `defineProps<Data.User>()` as the whole Vue props object. Generated transformer types can contain conditional types that Vue's SFC compiler cannot turn into runtime prop declarations. Wrap an actual page prop in a plain object (`defineProps<{ user: Data.User }>()`); read middleware-shared `user` with `usePage().props.user` instead.
- Keep the existing middleware's `share()`, `flash()`, and `handle()` methods when changing it. Use `InferSharedProps` for the server augmentation and register `Data.SharedProps` plus `InferFlashData<InertiaMiddleware>` in `@inertiajs/core`'s `InertiaConfig` so `usePage()` is typed without a local generic.
- Treat `.adonisjs/**` as generated output. Change controllers, routes, validators, middleware, or pages at the source and let codegen regenerate types. For a Vue client, `adonisrc.ts` uses `indexPages({ framework: 'vue3' })` in `hooks.init` alongside route registry generation.

## Read when relevant

- [Current v5 patterns and migration notes](references/inertia.md) for configuration, type generation, flash, data loading, and version changes.
- [Vue page setup runbook](runbooks/inertia.md) when wiring pages, navigation, forms, and layouts in an application.

Sources: [AdonisJS Inertia guide](https://docs.adonisjs.com/guides/frontend/inertia) and [Inertia v3 / AdonisJS Inertia v5 announcement](https://adonisjs.com/blog/adonisjs-inertia-5). Recheck these sources and installed package types when an API detail affects correctness.
