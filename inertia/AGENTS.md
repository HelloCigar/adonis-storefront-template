# Frontend conventions

- Group seller components by domain under `components/seller/products/`, `variants/`, `collections/`, `users/`, and `orders/`. Keep pages focused on composing those components and opening their dialogs.
- Prefer concrete domain tables and forms over generic CRUD wrappers configured with fields, routes, or action callbacks. Each component owns its domain's behavior and uses generated `Data.*` types.
- Use the typed `Form` from `@adonisjs/inertia/vue` for standalone submissions, including deletes, uploads, and order status updates. Use `useForm` when a create/edit dialog needs mutable state, prefilled values, or dynamic fields.
- This is a single shared store. Show store management using the backend manageStore permission and global user/staff management using manageUsers. Roles are customer, staff, and admin. seller/ route and generated type names are retained for compatibility. Do not introduce team/member/owner roles or cosmetic team switching.
