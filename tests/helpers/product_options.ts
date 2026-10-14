import Product from '#models/catalog/product'
import { DateTime } from 'luxon'

export async function createProductOptions() {
  const product = await Product.create({
    title: 'Option test',
    handle: 'option-test',
    optionDefinitions: [
      { name: 'Color', values: ['Red', 'Blue', 'Green'] },
      { name: 'Size', values: ['Small', 'Large'] },
    ],
    status: 'active',
    publishedAt: DateTime.utc(),
  })
  const variants = await product.related('variants').createMany(
    [
      { title: 'Red / Small', options: { Color: 'Red', Size: 'Small' }, availableForSale: true },
      { title: 'Red / Large', options: { Color: 'Red', Size: 'Large' }, availableForSale: false },
      { title: 'Blue / Small', options: { Color: 'Blue', Size: 'Small' }, availableForSale: false },
      { title: 'Blue / Large', options: { Color: 'Blue', Size: 'Large' }, availableForSale: true },
      {
        title: 'Green / Small',
        options: { Color: 'Green', Size: 'Small' },
        availableForSale: false,
      },
      {
        title: 'Green / Large',
        options: { Color: 'Green', Size: 'Large' },
        availableForSale: false,
      },
    ].map((variant, position) => ({ ...variant, position, priceAmount: 49, currencyCode: 'PHP' }))
  )
  return { product, variants }
}
