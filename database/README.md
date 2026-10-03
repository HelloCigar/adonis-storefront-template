# Demo data and factories

Apply the migrations, then seed initial data:

```sh
node ace migration:run
node ace db:seed
```

`main_seeder.ts` runs only in development/testing. It inserts missing demo records without truncating tables, resetting passwords, or overwriting existing products/orders. It also restores the three demo color variants when an existing demo product has no variants, preserving any product that already has variants. Rerunning it does not duplicate records or attachments.

The seed includes 18 published products (3 color variants each, with discounted and sold-out examples), 3 collections, local attachment images, a customer with a default address, an example cart, and 2 paid orders with address/line-item snapshots. Images are offline SVG fixtures, not product photography.

Demo login: `demo@example.com` / `demo-password`. This is a regular customer, not an administrator.

For staff/admin access and the single-store permission model, see [Authorization](../AUTHORIZATION.md).

Factories cover all 10 application models. Examples:

```ts
await ProductFactory.apply('published', 'withMedia').with('variants', 3).create()
await CollectionFactory.apply('published', 'withImage')
  .with('products', 6, (products) => products.apply('published').with('variants', 1))
  .create()
await UserFactory.with('addresses', 2).create()
await CartFactory.with('lines', 2).create()
await OrderFactory.apply('paid').with('addresses', 2).with('lineItems', 3).create()
```

Dependent factories create missing parents in the same transaction. Use `.merge({ productId, userId, cartId, orderId, ... })` to reuse existing records. Variant positions and shipping/billing address types are allocated per parent. Order totals are calculated from factory-created line items.

Media is opt-in through `withMedia` / `withImage`; ordinary factories do not download or write files. Keep test data in the test database. The application database is not seeded automatically on startup.
