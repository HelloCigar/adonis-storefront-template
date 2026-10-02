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

  async index({ inertia }: HttpContext) {
    return inertia.render('seller/collections', {
      collections: SellerCollectionTransformer.transform(
        await Collection.query().preload('products').orderBy('id', 'desc')
      ),
      products: SellerProductTransformer.transform(await Product.query().orderBy('title')),
    })
  }
  async store({ request, response, session }: HttpContext) {
    await this.catalogue.saveCollection(
      new Collection(),
      await request.validateUsing(collectionCreateValidator)
    )
    session.flash('success', 'Collection created')
    return response.redirect().toRoute('seller.collections.index')
  }
  async update({ params, request, response, session }: HttpContext) {
    const collection = await Collection.findOrFail(params.id)
    await this.catalogue.saveCollection(
      collection,
      await request.validateUsing(collectionUpdateValidator, { meta: { id: collection.id } })
    )
    session.flash('success', 'Collection updated')
    return response.redirect().toRoute('seller.collections.index')
  }
  async destroy({ params, response, session }: HttpContext) {
    const collection = await Collection.findOrFail(params.id)
    await collection.delete()
    session.flash('success', 'Collection deleted')
    return response.redirect().toRoute('seller.collections.index')
  }
}
