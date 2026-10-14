import { DateTime } from 'luxon'
import type User from '#models/account/user'
import type Product from '#models/catalog/product'
import ProductReview from '#models/catalog/product_review'
import Shipment from '#models/checkout/shipment'
import type { ShipmentState } from '#services/checkout/state_service'
import { OrderFactory } from '#database/factories/order_factory'
import { OrderLineItemFactory } from '#database/factories/order_line_item_factory'
import { ProductFactory } from '#database/factories/product_factory'
import { UserFactory } from '#database/factories/user_factory'
import { urlFor } from '@adonisjs/core/services/url_builder'

export const publishedProduct = (values: Partial<Product> = {}) =>
  ProductFactory.apply('published').merge(values).create()

export const account = (values: Partial<User> = {}) => UserFactory.merge(values).create()

/**
 * An order with one line for the product and a shipment in the given state. A null user is a
 * guest order that has not been claimed.
 */
export async function purchase(
  user: User | null,
  product: Product,
  state: ShipmentState = 'delivered',
  placedAt: DateTime = DateTime.utc(),
  email?: string
) {
  const order = await OrderFactory.merge({
    userId: user?.id ?? null,
    processedAt: placedAt,
    createdAt: placedAt,
    ...(email ? { email } : {}),
  }).create()
  await OrderLineItemFactory.merge({ orderId: order.id, productId: product.id }).create()
  await Shipment.create({ orderId: order.id, state })
  return order
}

/** A stored review, written by a fresh account unless `userId` is given. */
export async function review(product: Product, values: Partial<ProductReview> = {}) {
  const author = values.userId ? null : await account()
  return ProductReview.create({
    rating: 5,
    title: null,
    body: null,
    status: 'approved',
    ...values,
    productId: product.id,
    userId: author?.id ?? values.userId,
  })
}

export const countReviews = async () => {
  const rows = await ProductReview.all()
  return rows.length
}

export const storeUrl = (product: Product) => urlFor('reviews.store', { productId: product.id })

export const reviewUrl = (row: ProductReview | { id: string }) =>
  urlFor('reviews.update', { id: row.id })

export const productPath = (product: Product) => urlFor('products.show', { handle: product.handle })

export const errorFields = (body: { errors?: { field: string }[] }) =>
  (body.errors ?? []).map((error) => error.field)
