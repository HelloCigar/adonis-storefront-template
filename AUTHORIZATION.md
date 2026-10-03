# Single-store authorization

This application operates one store with a shared catalogue. Products, variants, images, collections, and orders are available to every staff member and administrator.

| Capability                                                      | Customer | Staff | Admin |
| --------------------------------------------------------------- | -------- | ----- | ----- |
| Shop and manage their own account, addresses, and order history | Yes      | Yes   | Yes   |
| Open the store dashboard and inbox                              | No       | Yes   | Yes   |
| Manage the shared catalogue and store orders                    | No       | Yes   | Yes   |
| Manage user accounts and assign roles                           | No       | No    | Yes   |

Public signup always creates a customer. Customer login opens `/account`; staff and admin login opens `/dashboard`. Store routes enforce the staff middleware and Bouncer policies. Inertia shares `permissions.manageStore` and `permissions.manageUsers` for navigation; resource actions come from policy-backed transformer permissions.

Personal account routes require ownership for every role, including admins. Administrators manage other accounts through the user management area, not another customer's personal account routes. An admin can edit their own profile but cannot demote or delete their own account through user management.

## Granting access

Register an account first, then run one of these commands from the application host:

```sh
node ace user:make-admin your-email@example.com
node ace user:make-staff staff-email@example.com
```

The admin command bootstraps the first administrator using an existing account. Subsequent role assignments are available under **Users**. The staff command preserves an existing admin role. `user:make-seller` remains a compatibility alias for `user:make-staff`.

Run `node ace migration:run` when deploying this change. The role migration converts existing `seller` accounts to `staff`, preserving customers and admins. It does not reset passwords or delete catalogue data.

## Compatibility names

The `/seller` URLs, `seller.*` named routes, and `seller/` source folders remain to preserve existing links and generated contracts. They represent shared store management. Historical `sellerId` fields record creator attribution only and never restrict access. Null or mixed creator attribution does not hide products, collections, or orders from staff.

Authorization regressions are covered by the account/store policy tests, `tests/functional/authorization.spec.ts`, `tests/functional/seller_ownership.spec.ts`, and the store browser tests.
