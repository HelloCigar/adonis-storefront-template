# Wire AdonisJS routes to Inertia Vue pages

Use this when adding or repairing navigation in an AdonisJS v7 + `@adonisjs/inertia` v5 + Vue application. Backend details belong to the `adonisjs` skill. The [official Inertia guide](https://docs.adonisjs.com/guides/frontend/inertia) defines the integration; the [v5 release post](https://adonisjs.com/blog/adonisjs-inertia-5) covers migration differences.

1. Inspect the current URL, route name, controller, rendered page name, and `inertia/pages/` file for each destination. Decide whether the destination needs a controller. Use `renderInertia()` directly for a static page, or `inertia.render()` in a controller when server behavior or data belongs there. Apply auth middleware to protected route groups.
2. Keep the dev server/codegen running while changing backend contracts. Create routes and controllers at source; wait for generated controller and route registries before using their types. Do not edit `.adonisjs/**`.
3. Resolve each page to its Vue component in `inertia/app.ts` (and the SSR entrypoint when enabled). Inertia persistent layouts use layout components or arrays of components. A layout renders its page through `<slot />`; `<RouterView />` is for Vue Router and does not render Inertia pages.
4. Wire navigation. Use `<Link route="name">` for ordinary links, `useRouter().visit({ route: 'name' })` for programmatic visits, and the typed `urlFor('name')` output for UI components whose link prop is a URL string. Confirm those components use Nuxt UI's Inertia mode if Nuxt UI is installed.
5. Type page props with `defineProps` and generated `Data.*` types when server props exist. For a form, use `<Form route="name">`; `:params` is the Vue component prop for route parameters. Validate its request on the server so the body and error fields are inferred.
6. Verify that protected URLs redirect guests, authenticated visits render the intended component, links send `X-Inertia` visits instead of doing full reloads, page content appears inside the expected layout, and typecheck/build pass. Stop a temporary dev server if the user asked to keep it stopped.

For flash messages, preserve middleware `share()`, `flash()`, and `handle()`. Read global data from `usePage().props` and one-time messages from `usePage().flash`.
