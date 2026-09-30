# Backend conventions

- Use the AdonisJS skill for framework changes, Lucid for database work, and Japa for tests.
- Public controller actions use `index`, `create`, `store`, `show`, `edit`, `update`, or `destroy`. Model a custom action as a focused resource controller using one of those methods.
- Group related controllers in domain folders (`account/`, `auth/`, `content/`, `settings/`). Use names local to the folder, such as `settings/members_controller.ts`, and reference the automatically generated nested barrel (`controllers.settings.Members`) in routes.
- Controllers own request validation, authorization, HTTP/session concerns, transformer calls, and responses. A simple model lookup/list is fine inline.
- Move workflows beyond simple model loading into default-exported service classes in `app/services/*_service.ts`: multi-model queries, transactions, business rules, and coordinated writes.
- Resolve application services through constructor injection with `@inject()` on the consuming controller, middleware, or service. Import injected classes as runtime values. Do not instantiate them manually, export service instances, or introduce a provider when automatic class resolution suffices.
- Services take explicit domain inputs (models, IDs, tokens, validated payloads), not `HttpContext`, requests, responses, or sessions. Keep request state out of shared service instances and serialize through transformers at the HTTP boundary.
- Preserve user/session ownership constraints and transaction boundaries when moving logic. Keep Inertia loaders lazy so partial reloads do not trigger unrelated queries.
- Preserve established route names and URLs during structural refactors. Change routes/controllers at the source and let the running dev server regenerate `.adonisjs`; never edit generated files manually.
- Verify behavior with focused functional tests and typecheck/lint. Test real database behavior for ownership, transaction, and relationship changes.
