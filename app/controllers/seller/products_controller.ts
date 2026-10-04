import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import Product from '#models/catalog/product'
import SellerProductTransformer from '#transformers/seller/product_transformer'
import SellerCatalogueService from '#services/seller/catalogue_service'
import { productCreateValidator, productUpdateValidator } from '#validators/seller/product'

@inject()
export default class ProductsController {
  constructor(private catalogue: SellerCatalogueService) {}

  async index({ inertia, bouncer }: HttpContext) {
    await bouncer.with('SellerProductPolicy').authorize('viewAny')
    return inertia.render('seller/products', {
      products: SellerProductTransformer.transform(
        await Product.query().preload('variants').orderBy('id', 'desc')
      ),
    })
  }
  async store({ request, response, session, bouncer, auth }: HttpContext) {
    await bouncer.with('SellerProductPolicy').authorize('create')
    const payload = await request.validateUsing(productCreateValidator)
    const product = new Product()
    product.sellerId = auth.getUserOrFail().id
    await this.catalogue.saveProduct(product, payload)
    session.flash('success', 'Product created. Add a variant to set its price and stock.')
    return response.redirect().toRoute('seller.variants.index', { productId: product.id })
  }
  async update({ params, request, response, session, bouncer }: HttpContext) {
    const product = await Product.findOrFail(params.id)
    await bouncer.with('SellerProductPolicy').authorize('update', product)
    const payload = await request.validateUsing(productUpdateValidator, {
      meta: { id: product.id },
    })
    await this.catalogue.saveProduct(product, payload)
    session.flash('success', 'Product updated')
    return response.redirect().toRoute('seller.products.index')
  }
  async destroy({ params, response, session, bouncer }: HttpContext) {
    const product = await Product.findOrFail(params.id)
    await bouncer.with('SellerProductPolicy').authorize('delete', product)
    await this.catalogue.deleteProduct(product)
    session.flash('success', 'Product deleted')
    return response.redirect().toRoute('seller.products.index')
  }
}
