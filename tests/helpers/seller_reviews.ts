import type User from '#models/account/user'
import type Product from '#models/catalog/product'
import ProductReview from '#models/catalog/product_review'
import Shipment from '#models/checkout/shipment'
import { OrderFactory } from '#database/factories/order_factory'
import { OrderLineItemFactory } from '#database/factories/order_line_item_factory'
import { ProductFactory } from '#database/factories/product_factory'
import { UserFactory } from '#database/factories/user_factory'
import { urlFor } from '@adonisjs/core/services/url_builder'

export const account = (values: Partial<User> = {}) => UserFactory.merge(values).create()

export const staffMember = () => account({ role: 'staff' })

export const publishedProduct = (values: Partial<Product> = {}) =>
  ProductFactory.apply('published').merge(values).create()

/** A stored review, written by a fresh account unless `userId` is given. */
export async function review(product: Product, values: Partial<ProductReview> = {}) {
  const author = values.userId ? null : await account()
  return ProductReview.create({
    rating: 4,
    title: 'Nice',
    body: 'Does the job.',
    status: 'pending',
    ...values,
    productId: product.id,
    userId: author?.id ?? values.userId,
  })
}

export async function deliveredOrder(user: User, product: Product) {
  const order = await OrderFactory.merge({ userId: user.id }).create()
  await OrderLineItemFactory.merge({ orderId: order.id, productId: product.id }).create()
  await Shipment.create({ orderId: order.id, state: 'delivered' })
  return order
}

export const reviewUrl = (row: ProductReview | { id: string }) =>
  urlFor('seller.reviews.update', { id: row.id })

export const ids = (items: { id: string }[]) => items.map((item) => item.id)
