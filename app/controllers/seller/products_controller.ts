import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import Product from '#models/catalog/product'
import SellerProductTransformer from '#transformers/seller/product_transformer'
import MediaTransformer from '#transformers/shared/media_transformer'
import SellerCatalogueService from '#services/seller/catalogue_service'
import SellerMediaService from '#services/seller/media_service'
import { productCreateValidator, productUpdateValidator } from '#validators/seller/product'

@inject()
export default class ProductsController {
  constructor(
    private catalogue: SellerCatalogueService,
    private media: SellerMediaService
  ) {}

  async index({ inertia, bouncer }: HttpContext) {
    await bouncer.with('SellerProductPolicy').authorize('viewAny')
    const products = await Product.query().preload('variants').orderBy('id', 'desc')
    return inertia.render('seller/products', {
      products: SellerProductTransformer.transform(products, await this.media.covers(products)),
    })
  }
  async show({ params, inertia, bouncer }: HttpContext) {
    const product = await Product.query()
      .where('id', params.id)
      .preload('variants', (query) => query.orderBy('position'))
      .firstOrFail()
    await bouncer.with('SellerProductPolicy').authorize('view', product)
    return inertia.render('seller/product', {
      product: SellerProductTransformer.transform(product),
      images: MediaTransformer.transform(await product.media.all()),
    })
  }
  async store({ request, response, session, bouncer, auth }: HttpContext) {
    await bouncer.with('SellerProductPolicy').authorize('create')
    const payload = await request.validateUsing(productCreateValidator)
    const product = new Product()
    product.sellerId = auth.getUserOrFail().id
    await this.catalogue.saveProduct(product, payload)
    session.flash('success', 'Product created. Add a variant to set its price and stock.')
    return response.redirect().toRoute('seller.products.show', { id: product.id })
  }
  async update({ params, request, response, session, bouncer }: HttpContext) {
    const product = await Product.findOrFail(params.id)
    await bouncer.with('SellerProductPolicy').authorize('update', product)
    const payload = await request.validateUsing(productUpdateValidator, {
      meta: { id: product.id },
    })
    await this.catalogue.saveProduct(product, payload)
    session.flash('success', 'Product updated')
    return response.redirect().toRoute('seller.products.show', { id: product.id })
  }
  async destroy({ params, response, session, bouncer }: HttpContext) {
    const product = await Product.findOrFail(params.id)
    await bouncer.with('SellerProductPolicy').authorize('delete', product)
    await this.catalogue.deleteProduct(product)
    session.flash('success', 'Product deleted')
    return response.redirect().toRoute('seller.products.index')
  }
}
