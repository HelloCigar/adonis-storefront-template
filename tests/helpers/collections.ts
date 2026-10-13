import Collection from '#models/catalog/collection'
import Product from '#models/catalog/product'
import ProductVariant from '#models/catalog/product_variant'
import { DateTime } from 'luxon'

export async function createProduct(
  handle: string,
  vendor: string,
  prices: number[],
  available = true,
  attributes: Partial<Product> = {}
) {
  const product = await Product.create({
    title: handle,
    handle,
    vendor,
    status: 'active',
    publishedAt: DateTime.utc(),
    optionDefinitions: [
      { name: 'Edition', values: prices.map((_, position) => `Edition ${position + 1}`) },
    ],
    ...attributes,
  })
  await ProductVariant.createMany(
    prices.map((priceAmount, position) => ({
      productId: product.id,
      title: `Variant ${position}`,
      options: { Edition: `Edition ${position + 1}` },
      priceAmount,
      currencyCode: 'PHP',
      availableForSale: available,
      position,
    }))
  )
  return product
}

export async function createCollection(products: Product[]) {
  const collection = await Collection.create({
    title: 'Filtered collection',
    handle: 'filtered',
    publishedAt: DateTime.utc(),
  })
  await collection
    .related('products')
    .attach(Object.fromEntries(products.map((product, position) => [product.id, { position }])))
  return collection
}
