import type Product from '#models/catalog/product'
import type Collection from '#models/catalog/collection'
import ProductVariant from '#models/catalog/product_variant'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { errors } from '@vinejs/vine'
import type { Infer } from '@vinejs/vine/types'
import type { productCreateValidator } from '#validators/seller/product'
import type { variantCreateValidator } from '#validators/seller/variant'
import type { collectionCreateValidator } from '#validators/seller/collection'

export default class SellerCatalogueService {
  async saveProduct(product: Product, payload: Infer<typeof productCreateValidator>) {
    const hasVariants =
      product.$isPersisted && !!(await product.related('variants').query().first())
    product.merge({
      ...payload,
      descriptionHtml: null,
      publishedAt:
        payload.status === 'active' && hasVariants ? product.publishedAt || DateTime.utc() : null,
    })
    await product.save()
    return product
  }

  async saveCollection(
    collection: Collection,
    { published, productIds, ...payload }: Infer<typeof collectionCreateValidator>
  ) {
    return db.transaction(async (trx) => {
      collection.useTransaction(trx)
      collection.merge({
        ...payload,
        descriptionHtml: null,
        publishedAt: published ? collection.publishedAt || DateTime.utc() : null,
      })
      await collection.save()
      const memberships = Object.fromEntries(
        [...new Set(productIds)].map((id, position) => [id, { position }])
      )
      await collection.related('products').sync(memberships)
      return collection
    })
  }

  async saveVariant(
    product: Product,
    variant: ProductVariant,
    { options, ...payload }: Infer<typeof variantCreateValidator>
  ) {
    if (
      payload.compareAtPriceAmount !== null &&
      payload.compareAtPriceAmount < payload.priceAmount
    ) {
      throw new errors.E_VALIDATION_ERROR([
        {
          field: 'compareAtPriceAmount',
          rule: 'price',
          message: 'Compare-at price must be at least the selling price.',
        },
      ])
    }
    if (new Set(options.map((option) => option.name.toLowerCase())).size !== options.length) {
      throw new errors.E_VALIDATION_ERROR([
        { field: 'options', rule: 'unique', message: 'Option names must be unique.' },
      ])
    }
    return db.transaction(async (trx) => {
      if (variant.$isPersisted) {
        const current = await ProductVariant.findOrFail(variant.id, { client: trx })
        const held = current.inventoryReservedQuantity
        const pending = await trx
          .from('order_line_items')
          .join('orders', 'orders.id', 'order_line_items.order_id')
          .where('product_variant_id', variant.id)
          .where('orders.source', 'online')
          .where('orders.lifecycle_state', 'pending_payment')
          .first()
        if (
          (held > 0 && (payload.inventoryQuantity === null || payload.inventoryQuantity < held)) ||
          (pending && (current.inventoryQuantity === null) !== (payload.inventoryQuantity === null))
        ) {
          throw new errors.E_VALIDATION_ERROR([
            {
              field: 'inventoryQuantity',
              rule: 'reserved',
              message:
                'Stock is held by pending orders. Keep at least the reserved quantity and its tracking mode.',
            },
          ])
        }
      }
      const currencies = await ProductVariant.query({ client: trx })
        .where('productId', product.id)
        .whereNot('id', variant.id || 0)
      if (currencies.some((item) => item.currencyCode !== payload.currencyCode)) {
        throw new errors.E_VALIDATION_ERROR([
          {
            field: 'currencyCode',
            rule: 'currency',
            message: 'Use the same currency for all variants of this product.',
          },
        ])
      }
      variant.useTransaction(trx)
      if (!variant.$isPersisted)
        variant.position = Math.max(-1, ...currencies.map((item) => item.position)) + 1
      variant.merge({
        ...payload,
        availableForSale: payload.availableForSale && payload.inventoryQuantity !== 0,
        productId: product.id,
        options: Object.fromEntries(options.map((option) => [option.name, option.value])),
      })
      await variant.save()
      if (product.status === 'active' && !product.publishedAt) {
        product.useTransaction(trx)
        product.publishedAt = DateTime.utc()
        await product.save()
      }
      return variant
    })
  }

  async deleteVariant(product: Product, variant: ProductVariant) {
    return db.transaction(async (trx) => {
      const current = await ProductVariant.findOrFail(variant.id, { client: trx })
      const pending = await trx
        .from('order_line_items')
        .join('orders', 'orders.id', 'order_line_items.order_id')
        .where('product_variant_id', variant.id)
        .where('orders.source', 'online')
        .where('orders.lifecycle_state', 'pending_payment')
        .first()
      if (current.inventoryReservedQuantity > 0 || pending) {
        throw new errors.E_VALIDATION_ERROR([
          {
            field: 'delete',
            rule: 'reserved',
            message: 'This variant has stock held by pending orders.',
          },
        ])
      }
      const variants = await product.related('variants').query().useTransaction(trx)
      if (product.status === 'active' && variants.length <= 1) {
        throw new errors.E_VALIDATION_ERROR([
          {
            field: 'delete',
            rule: 'lastVariant',
            message:
              'An active product needs a variant. Set the product to draft before deleting its last variant.',
          },
        ])
      }
      variant.useTransaction(trx)
      await variant.delete()
    })
  }

  async deleteProduct(product: Product) {
    return db.transaction(async (trx) => {
      const held = await ProductVariant.query({ client: trx })
        .where('productId', product.id)
        .where('inventoryReservedQuantity', '>', 0)
        .first()
      const pending = await trx
        .from('order_line_items')
        .join('orders', 'orders.id', 'order_line_items.order_id')
        .where('product_id', product.id)
        .where('orders.source', 'online')
        .where('orders.lifecycle_state', 'pending_payment')
        .first()
      if (held || pending)
        throw new errors.E_VALIDATION_ERROR([
          { field: 'delete', rule: 'reserved', message: 'This product has pending orders.' },
        ])
      product.useTransaction(trx)
      await product.delete()
    })
  }
}
