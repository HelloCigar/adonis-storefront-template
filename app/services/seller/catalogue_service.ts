import type Product from '#models/catalog/product'
import type Collection from '#models/catalog/collection'
import ProductVariant from '#models/catalog/product_variant'
import db from '@adonisjs/lucid/services/db'
import { inTransaction } from '#models/shared/in_transaction'
import { DateTime } from 'luxon'
import { errors } from '@vinejs/vine'
import type { Infer } from '@vinejs/vine/types'
import type { productCreateValidator } from '#validators/seller/product'
import type { collectionCreateValidator } from '#validators/seller/collection'
import InventoryService from '#services/catalog/inventory_service'
import { inject } from '@adonisjs/core'
import type { WriteOptions } from '../../../types/write_options.js'

/** Store management for products and collections. Variant and option changes live in SellerVariantService. */
@inject()
export default class SellerCatalogueService {
  constructor(private inventory: InventoryService) {}

  async saveProduct(
    product: Product,
    payload: Infer<typeof productCreateValidator>,
    options: WriteOptions = {}
  ) {
    if (options.client) product.useTransaction(options.client)
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
    { published, productIds, ...payload }: Infer<typeof collectionCreateValidator>,
    options: WriteOptions = {}
  ) {
    return inTransaction(options.client, async (trx) => {
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

  async deleteProduct(product: Product) {
    return db.transaction(async (trx) => {
      const held = await ProductVariant.query({ client: trx })
        .where('productId', product.id)
        .where('inventoryReservedQuantity', '>', 0)
        .first()
      const pending = await this.inventory.hasPendingCheckout(trx, { productId: product.id })
      if (held || pending)
        throw new errors.E_VALIDATION_ERROR([
          { field: 'delete', rule: 'reserved', message: 'This product has pending orders.' },
        ])
      product.useTransaction(trx)
      await product.delete()
    })
  }
}
