# Demo data and factories

Apply the migrations, then seed initial data:

```sh
node ace migration:run
node ace db:seed
```

`main_seeder.ts` runs only in development/testing. It inserts missing demo records without truncating tables, resetting passwords, or overwriting existing products/orders. It also restores the three demo color variants when an existing demo product has no variants, preserving any product that already has variants. Rerunning it does not duplicate records or attachments.

The seed includes 18 published products (3 color variants each, with discounted and sold-out examples), 3 collections, local attachment images, a customer with a default address, an example cart, and 2 paid orders with address/line-item snapshots. Images are offline SVG fixtures, not product photography.

`blog_seeder.ts` adds 6 demo blog posts with editor content and the HTML rendered from it: 4 published over the past weeks, 1 scheduled for next week, and 1 draft, each with a badge. It inserts missing posts by handle only and never changes posts staff have edited.

Demo login: `demo@example.com` / `demo-password`. This is a regular customer, not an administrator.

For staff/admin access and the single-store permission model, see [Authorization](../AUTHORIZATION.md).

Factories cover the application models, including blog posts. Examples:

```ts
await ProductFactory.apply('published', 'withMedia').with('variants', 3).create()
await CollectionFactory.apply('published', 'withImage')
  .with('products', 6, (products) => products.apply('published').with('variants', 1))
  .create()
await UserFactory.with('addresses', 2).create()
await CartFactory.with('lines', 2).create()
await OrderFactory.apply('paid').with('addresses', 2).with('lineItems', 3).create()
await BlogPostFactory.apply('published').with('author').create() // or 'scheduled'; drafts by default
```

Dependent factories create missing parents in the same transaction. Use `.merge({ productId, userId, cartId, orderId, ... })` to reuse existing records. Variant positions and shipping/billing address types are allocated per parent. Order totals are calculated from factory-created line items.

Media is opt-in through `withMedia` / `withImage`; ordinary factories do not download or write files. Keep test data in the test database. The application database is not seeded automatically on startup.
