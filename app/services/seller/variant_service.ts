import Product from '#models/catalog/product'
import ProductVariant from '#models/catalog/product_variant'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { errors } from '@vinejs/vine'
import type { Infer } from '@vinejs/vine/types'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { variantCreateValidator } from '#validators/seller/variant'
import type { optionsUpdateValidator } from '#validators/seller/options'
import type { variantGenerationValidator } from '#validators/seller/variant_generation'
import OptionsService, { optionCombinationKey } from '#services/catalog/options_service'
import InventoryService from '#services/catalog/inventory_service'
import { inject } from '@adonisjs/core'

/** Store management for a product's variants and the option definitions that key them. */
@inject()
export default class SellerVariantService {
  constructor(
    private options: OptionsService,
    private inventory: InventoryService
  ) {}

  async saveVariant(
    product: Product,
    variant: ProductVariant,
    { options, featuredMediaId, ...payload }: Infer<typeof variantCreateValidator>
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
      // Acquire SQLite's write lock before reading the schema or combinations.
      await this.lockProduct(trx, product.id)
      const currentProduct = await Product.findOrFail(product.id, { client: trx })
      const combination = Object.fromEntries(options.map((option) => [option.name, option.value]))
      const key = this.options.validateCombination(
        currentProduct.optionDefinitions,
        combination,
        variant.$isPersisted
      )
      if (variant.$isPersisted) {
        const current = await ProductVariant.findOrFail(variant.id, { client: trx })
        const held = current.inventoryReservedQuantity
        const pending = await this.inventory.hasPendingCheckout(trx, { variantId: variant.id })
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
      if (currencies.some((item) => optionCombinationKey(item.options) === key))
        this.options.fail('options', 'A variant with this option combination already exists.')
      if (featuredMediaId !== undefined && featuredMediaId !== null) {
        const media = await currentProduct.media.all()
        const image = media.find((item) => item.id === featuredMediaId)
        if (!image || !image.attachment.mimeType.startsWith('image/'))
          this.options.fail('featuredMediaId', 'Choose an image belonging to this product.')
      }
      variant.useTransaction(trx)
      if (!variant.$isPersisted)
        variant.position = Math.max(-1, ...currencies.map((item) => item.position)) + 1
      variant.merge({
        ...payload,
        availableForSale: payload.availableForSale && payload.inventoryQuantity !== 0,
        productId: product.id,
        options: combination,
        optionCombinationKey: key,
        ...(featuredMediaId !== undefined ? { featuredMediaId } : {}),
      })
      await variant.save()
      if (currentProduct.status === 'active' && !currentProduct.publishedAt) {
        currentProduct.publishedAt = DateTime.utc()
        await currentProduct.save()
      }
      return variant
    })
  }

  async saveOptions(product: Product, { optionDefinitions }: Infer<typeof optionsUpdateValidator>) {
    this.options.validateDefinitions(optionDefinitions)
    return db.transaction(async (trx) => {
      await this.lockProduct(trx, product.id)
      const current = await Product.findOrFail(product.id, { client: trx })
      const variants = await current.related('variants').query().orderBy('position').orderBy('id')
      const oldDefinitions = current.optionDefinitions
      const removed = oldDefinitions.filter(
        (definition) => !optionDefinitions.some((next) => next.name === definition.name)
      )
      const removedNames = new Set(removed.map((definition) => definition.name))
      const added = optionDefinitions.filter(
        (definition) => !oldDefinitions.some((old) => old.name === definition.name)
      )
      const nextOptionsFor = (variant: ProductVariant) => {
        // Invalid raw data must stay invalid until an explicit variant repair.
        if (variant.hasInvalidOptions) return variant.options
        return {
          ...Object.fromEntries(
            Object.entries(variant.options ?? {}).filter(([name]) => !removedNames.has(name))
          ),
          ...Object.fromEntries(
            added
              .filter((definition) => !Object.hasOwn(variant.options ?? {}, definition.name))
              .map((definition) => [definition.name, definition.values[0]])
          ),
        }
      }
      const hasInvalidVariants = variants.some(
        (variant) => !this.options.matches(oldDefinitions, variant.options)
      )
      if (hasInvalidVariants) {
        const isAdditive = oldDefinitions.every((definition) =>
          optionDefinitions.some(
            (next) =>
              next.name === definition.name &&
              definition.values.every((value) => next.values.includes(value))
          )
        )
        if (isAdditive) {
          // Repair capacity may expand, but invalid historical tuples and keys stay untouched.
          current.optionDefinitions = optionDefinitions
          await current.save()
          return current
        }
        if (
          variants.some(
            (variant) => !this.options.matches(optionDefinitions, nextOptionsFor(variant))
          )
        )
          this.options.fail(
            'optionDefinitions',
            'Keep every existing option name and value while legacy variants need repair. Add values, then repair each affected variant.'
          )
      }
      const combinations = variants.map((variant) => {
        const options = nextOptionsFor(variant)
        if (!this.options.matches(optionDefinitions, options))
          this.options.fail(
            'optionDefinitions',
            `Variant #${variant.id} would have invalid options. Keep its existing values or repair that variant first.`
          )
        return { variant, options, key: optionCombinationKey(options)! }
      })
      const projected = new Map<string, (typeof combinations)[number]>()
      for (const combination of combinations) {
        const previous = projected.get(combination.key)
        if (
          previous &&
          optionCombinationKey(previous.variant.options) !==
            optionCombinationKey(combination.variant.options)
        )
          this.options.fail(
            'optionDefinitions',
            `${removed.length ? `Removing ${removed.map((definition) => definition.name).join(', ')}` : 'Updating product options'} would give "${previous.variant.title}" (#${previous.variant.id}) and "${combination.variant.title}" (#${combination.variant.id}) the same ${Object.values(combination.options ?? {}).join(' / ') || 'Default'} combination. Keep one of these variants or change their remaining option values before saving.`
          )
        if (!previous) projected.set(combination.key, combination)
      }
      // Clear and rebuild keys atomically; existing duplicate rows stay unkeyed.
      await current.related('variants').query().update({ optionCombinationKey: null })
      const seen = new Set<string>()
      for (const { variant, options, key } of combinations) {
        await trx
          .from('product_variants')
          .where('id', variant.id)
          .update({
            options: JSON.stringify(options),
            option_combination_key: seen.has(key) ? null : key,
          })
        seen.add(key)
      }
      current.optionDefinitions = optionDefinitions
      await current.save()
      return current
    })
  }

  async generateVariants(product: Product, payload: Infer<typeof variantGenerationValidator>) {
    if (payload.compareAtPriceAmount !== null && payload.compareAtPriceAmount < payload.priceAmount)
      this.options.fail(
        'compareAtPriceAmount',
        'Compare-at price must be at least the selling price.'
      )
    return db.transaction(async (trx) => {
      await this.lockProduct(trx, product.id)
      const current = await Product.findOrFail(product.id, { client: trx })
      const variants = await current.related('variants').query()
      if (this.options.issues(current.optionDefinitions, variants).length)
        this.options.fail(
          'optionDefinitions',
          'Repair the existing variant options and duplicate combinations before generating variants.'
        )
      if (variants.some((variant) => variant.currencyCode !== payload.currencyCode))
        this.options.fail('currencyCode', 'Use the same currency for all variants of this product.')
      const seen = new Set(variants.map((variant) => optionCombinationKey(variant.options)))
      const missing = this.options
        .combinations(current.optionDefinitions)
        .filter((options) => !seen.has(optionCombinationKey(options)))
      let position = Math.max(-1, ...variants.map((variant) => variant.position)) + 1
      for (const options of missing) {
        await current.related('variants').create({
          ...payload,
          title: (Object.values(options).join(' / ') || 'Default').slice(0, 255),
          options,
          optionCombinationKey: optionCombinationKey(options),
          sku: null,
          featuredMediaId: null,
          availableForSale: payload.availableForSale && payload.inventoryQuantity !== 0,
          position: position++,
        })
      }
      if (missing.length && current.status === 'active' && !current.publishedAt) {
        current.publishedAt = DateTime.utc()
        await current.save()
      }
      return missing.length
    })
  }

  async deleteVariant(product: Product, variant: ProductVariant) {
    return db.transaction(async (trx) => {
      const current = await ProductVariant.findOrFail(variant.id, { client: trx })
      const pending = await this.inventory.hasPendingCheckout(trx, { variantId: variant.id })
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

  /** Takes SQLite's write lock before reading the product's options or variant combinations. */
  private async lockProduct(trx: TransactionClientContract, productId: number) {
    await trx.from('products').where('id', productId).update({ id: productId })
  }
}
