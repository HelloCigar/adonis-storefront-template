import User from '#models/account/user'
import Product from '#models/catalog/product'
import type ProductVariant from '#models/catalog/product_variant'
import { urlFor } from '@adonisjs/core/services/url_builder'

export const staff = () =>
  User.create({ email: 'stock-staff@example.com', password: 'secret-password', role: 'staff' })

export const product = (handle = 'stock-product') =>
  Product.create({ title: 'Stock product', handle, status: 'draft' })

export const variant = (item: Product, values: Partial<ProductVariant> = {}) =>
  item.related('variants').create({
    title: 'Default',
    priceAmount: 250,
    currencyCode: 'PHP',
    inventoryQuantity: 10,
    availableForSale: true,
    position: 0,
    ...values,
  })

export const stockUrl = (item: Product, row: ProductVariant) =>
  urlFor('seller.stock_adjustments.index', { productId: item.id, variantId: row.id })
