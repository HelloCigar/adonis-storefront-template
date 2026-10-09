# Product reviews

Customers who received a product rate and review it. Staff moderate every review before shoppers see it.

## Rules

- **Eligibility.** A signed-in account may review a product when it owns an order (`orders.user_id`) that has a line item for the product (`order_line_items.product_id`) and a shipment in the `delivered` state. Guests claim their order first through the existing order claim flow. Staff and admins follow the same rule for their own purchases.
- **One review per account per product.** A second submission is refused; the customer edits the existing review instead. The database enforces `unique(product_id, user_id)`.
- **Content.** A whole-number `rating` from 1 to 5 is required. `title` (up to 120 characters) and `body` (up to 2000 characters) are optional; values are trimmed and an empty value is stored as `null`.
- **Moderation.** A new review is `pending`. Staff set it to `approved` or `hidden`, recording who moderated it and when. Staff cannot change review text or delete a review. Shoppers see only `approved` reviews, and only approved reviews count toward the rating summary.
- **Customer changes.** The author may edit or delete their own review in any status. An edit returns the review to `pending` and clears the moderation fields. Ownership is required for every role, including admins.
- **Privacy.** Public reviews show the author as first name plus last initial (`Maria S.`), falling back to the first word of the full name, then `Customer`. Email addresses never appear in public props.
- **Product visibility.** Reviews are submitted only for published products (`Product.published` scope); other products return 404.
- Deleting a product or user deletes their reviews. Deleting an order keeps the review and clears `order_id`.

## Data

Table `product_reviews`, model `#models/catalog/product_review` (`ProductReview`):

| Column            | Type                               | Notes                                         |
| ----------------- | ---------------------------------- | --------------------------------------------- |
| `id`              | increments                         |                                               |
| `product_id`      | FK `products`, not null, cascade   |                                               |
| `user_id`         | FK `users`, not null, cascade      | Author                                        |
| `order_id`        | FK `orders`, nullable, set null    | Delivered order that made the author eligible |
| `rating`          | integer, not null, check 1-5       |                                               |
| `title`           | string(120), nullable              |                                               |
| `body`            | text, nullable                     |                                               |
| `status`          | enum `pending`/`approved`/`hidden` | default `pending`                             |
| `moderated_by_id` | FK `users`, nullable, set null     |                                               |
| `moderated_at`    | timestamp, nullable                |                                               |
| `created_at`      | timestamp, not null                |                                               |
| `updated_at`      | timestamp, nullable                |                                               |

Indexes: `unique(product_id, user_id)`, `(product_id, status)`.

The model exports `reviewStatuses = ['pending', 'approved', 'hidden'] as const` and `type ReviewStatus`, plus relations `product`, `user` (author), `order`, and `moderatedBy`. `Product` has `reviews` (hasMany).

## Customer routes

All require authentication (`middleware.auth()`); guests are redirected to `/login`.

| Method   | URL                            | Name              | Controller                       |
| -------- | ------------------------------ | ----------------- | -------------------------------- |
| `POST`   | `/products/:productId/reviews` | `reviews.store`   | `controllers.storefront.Reviews` |
| `PATCH`  | `/reviews/:id`                 | `reviews.update`  | `controllers.storefront.Reviews` |
| `DELETE` | `/reviews/:id`                 | `reviews.destroy` | `controllers.storefront.Reviews` |

Payload for store and update: `{ rating: number, title?: string | null, body?: string | null }` (`#validators/catalog/review`, `reviewValidator`). Invalid input returns 422 with field errors for JSON requests.

- `store`: 404 for a missing or unpublished product. 403 (`CatalogReviewPolicy.create`) when the account is not eligible or already reviewed the product. On success it creates a `pending` review with `order_id` set to the most recent eligible delivered order, flashes `success` = `Thanks for your review. It will appear once the store approves it.`, and redirects to `products.show` for the product.
- `update`: 404 for a missing review; 403 (`CatalogReviewPolicy.update`) unless the signed-in user is the author. Saves the content, sets `status = 'pending'`, clears `moderated_by_id` and `moderated_at`, flashes `Review updated. It will appear again once the store approves it.`, and redirects to the product page.
- `destroy`: 404 for a missing review; 403 (`CatalogReviewPolicy.delete`) unless the author. Deletes the review, flashes `Review deleted`, and redirects to the product page.

## Product page props

`GET /product/:handle` (`storefront/ProductsController.show`, page `product/[handle]`) adds:

- `reviewSummary`: `{ average: number | null, count: number, distribution: { 1: n, 2: n, 3: n, 4: n, 5: n } }` from approved reviews only. `average` is rounded to one decimal place and is `null` when `count` is 0.
- `reviews`: approved reviews, newest first (`created_at desc`, then `id desc`), 10 per page, using the `reviewsPage` query parameter. It is serialized with `ReviewTransformer.paginate`, giving `{ data: Data.Catalog.Review[], metadata }`.
- `viewerReview`: the signed-in user's own review of this product in any status, or `null` (always `null` for guests).
- `canReview`: `true` only when signed in, eligible, and without an existing review.

`Data.Catalog.Review` (`app/transformers/catalog/review_transformer.ts`): `id`, `rating`, `title`, `body`, `status`, `authorName`, `createdAt`, `updatedAt`. It has no email, user id, or order id.

## Staff moderation

Under the `/seller` group (auth + staff middleware). Guests are redirected to `/login`; customers get 403.

| Method  | URL                   | Name                    | Controller                   |
| ------- | --------------------- | ----------------------- | ---------------------------- |
| `GET`   | `/seller/reviews`     | `seller.reviews.index`  | `controllers.seller.Reviews` |
| `PATCH` | `/seller/reviews/:id` | `seller.reviews.update` | `controllers.seller.Reviews` |

- `index` (page `seller/reviews`, `SellerReviewPolicy.viewAny`): query `status` is `pending` (default), `approved`, `hidden`, or `all`, and `page` is 25 per page, newest first. Props:
  - `reviews`: `SellerReviewTransformer.paginate` giving `{ data: Data.Seller.Review[], metadata }`. Each item has `id`, `rating`, `title`, `body`, `status`, `authorName`, `customerEmail`, `product` (`{ id, title, handle }`), `orderId`, `moderatedAt`, `createdAt`, `updatedAt`.
  - `filters`: `{ status }`.
  - `counts`: `{ pending, approved, hidden }` across all reviews.
- `update` (`SellerReviewPolicy.update`): payload `{ status: 'approved' | 'hidden' }` (`#validators/seller/review`, `reviewModerationValidator`). Sets `moderated_by_id` to the staff user and `moderated_at` to now. Review text is unchanged. Flashes `Review approved` or `Review hidden` and redirects back.

## Interface

- **Product page.** A "Reviews" section (`id="reviews"`) below the product details shows the average as stars with the count (`4.5 · 12 reviews`). It lists approved reviews with stars, title, body, author name, and date, and has pagination when there is more than one page. Without approved reviews it reads `No reviews yet.`
  - When `canReview` is true, a "Write a review" button opens the form. Rating is a radio group with options labelled `1 star` to `5 stars`; the form also has Title and Review fields and a "Submit review" button.
  - When `viewerReview` exists, the section shows "Your review" with its status: pending shows `Waiting for approval`, hidden shows `Hidden by the store`, approved shows no note. It has "Edit review", which opens the same form with a "Save review" button, and "Delete review", which asks for confirmation.
  - Guests see `Sign in to review products you've received.`, linking to the login page.
  - Signed-in shoppers who are not eligible and have no review see `You can review this product once an order with it has been delivered to you.`
- **Store management.** A "Reviews" entry (icon `i-lucide-star`) sits in the store navigation after Discounts. The `seller/reviews` page has status tabs (Pending, Approved, Hidden, All) with counts and a table showing product, customer, rating, review, status, and date. Each row has Approve and Hide actions, except the action matching its current status.
