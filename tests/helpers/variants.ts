import User from '#models/account/user'
import Product from '#models/catalog/product'

export const staff = () =>
  User.create({ email: 'variants-staff@example.com', password: 'secret-password', role: 'staff' })

export const product = (optionDefinitions: Product['optionDefinitions'] = []) =>
  Product.create({
    title: 'Options product',
    handle: 'options-product',
    status: 'draft',
    optionDefinitions,
  })

export const defaults = {
  priceAmount: 250,
  compareAtPriceAmount: null,
  currencyCode: 'PHP',
  inventoryQuantity: 8,
  availableForSale: true,
}

export const payload = (options: { name: string; value: string }[] = []) => ({
  ...defaults,
  title: 'Variant',
  sku: null,
  featuredMediaId: null,
  options,
})
