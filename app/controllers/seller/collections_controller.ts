import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import Collection from '#models/catalog/collection'
import Product from '#models/catalog/product'
import SellerCollectionTransformer from '#transformers/seller/collection_transformer'
import SellerProductTransformer from '#transformers/seller/product_transformer'
import SellerCatalogueService from '#services/seller/catalogue_service'
import { collectionCreateValidator, collectionUpdateValidator } from '#validators/seller/collection'

@inject()
export default class CollectionsController {
  constructor(private catalogue: SellerCatalogueService) {}

  async index({ inertia, bouncer, auth }: HttpContext) {
    await bouncer.with('SellerCollectionPolicy').authorize('viewAny')
    return inertia.render('seller/collections', {
      collections: SellerCollectionTransformer.transform(
        await Collection.query()
          .withScopes((scopes) => scopes.forSeller(auth.getUserOrFail()))
          .preload('products', (query) =>
            query.withScopes((scopes) => scopes.forSeller(auth.getUserOrFail()))
          )
          .orderBy('id', 'desc')
      ),
      products: SellerProductTransformer.transform(
        await Product.query()
          .withScopes((scopes) => scopes.forSeller(auth.getUserOrFail()))
          .orderBy('title')
      ),
    })
  }
  async store({ request, response, session, bouncer, auth }: HttpContext) {
    await bouncer.with('SellerCollectionPolicy').authorize('create')
    const payload = await request.validateUsing(collectionCreateValidator)
    const collection = new Collection()
    collection.sellerId = auth.getUserOrFail().id
    const products = await Product.query().whereIn('id', payload.productIds)
    await bouncer.with('SellerCollectionPolicy').authorize('attachProducts', collection, products)
    await this.catalogue.saveCollection(collection, payload)
    session.flash('success', 'Collection created')
    return response.redirect().toRoute('seller.collections.index')
  }
  async update({ params, request, response, session, bouncer }: HttpContext) {
    const collection = await Collection.findOrFail(params.id)
    await bouncer.with('SellerCollectionPolicy').authorize('update', collection)
    const payload = await request.validateUsing(collectionUpdateValidator, {
      meta: { id: collection.id },
    })
    const products = await Product.query().whereIn('id', payload.productIds)
    await bouncer.with('SellerCollectionPolicy').authorize('attachProducts', collection, products)
    await this.catalogue.saveCollection(collection, payload)
    session.flash('success', 'Collection updated')
    return response.redirect().toRoute('seller.collections.index')
  }
  async destroy({ params, response, session, bouncer }: HttpContext) {
    const collection = await Collection.findOrFail(params.id)
    await bouncer.with('SellerCollectionPolicy').authorize('delete', collection)
    await collection.delete()
    session.flash('success', 'Collection deleted')
    return response.redirect().toRoute('seller.collections.index')
  }
}
