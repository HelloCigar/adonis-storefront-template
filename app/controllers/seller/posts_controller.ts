import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import BlogPost from '#models/content/blog_post'
import SellerPostTransformer from '#transformers/seller/post_transformer'
import SellerPostService from '#services/seller/post_service'
import { postValidator } from '#validators/seller/post'

@inject()
export default class PostsController {
  constructor(private posts: SellerPostService) {}

  async index({ inertia, bouncer }: HttpContext) {
    await bouncer.with('SellerPostPolicy').authorize('viewAny')
    const posts = await BlogPost.query().preload('author').orderBy('updated_at', 'desc')
    return inertia.render('seller/posts', { posts: SellerPostTransformer.transform(posts) })
  }

  async create({ inertia, bouncer }: HttpContext) {
    await bouncer.with('SellerPostPolicy').authorize('create')
    return inertia.render('seller/post', { post: null })
  }

  async store({ request, response, session, bouncer, auth }: HttpContext) {
    await bouncer.with('SellerPostPolicy').authorize('create')
    const payload = await request.validateUsing(postValidator)
    const post = await this.posts.save(new BlogPost(), payload, auth.getUserOrFail().id)
    session.flash('success', 'Post created')
    return response.redirect().toRoute('seller.posts.edit', { id: post.id })
  }

  async edit({ params, inertia, bouncer }: HttpContext) {
    const post = await BlogPost.query().where('id', params.id).preload('author').firstOrFail()
    await bouncer.with('SellerPostPolicy').authorize('update', post)
    return inertia.render('seller/post', {
      post: SellerPostTransformer.transform(post).useVariant('forEditor'),
    })
  }

  async update({ params, request, response, session, bouncer, auth }: HttpContext) {
    const post = await BlogPost.findOrFail(params.id)
    await bouncer.with('SellerPostPolicy').authorize('update', post)
    const payload = await request.validateUsing(postValidator, { meta: { id: post.id } })
    await this.posts.save(post, payload, auth.getUserOrFail().id)
    session.flash('success', 'Post saved')
    return response.redirect().toRoute('seller.posts.edit', { id: post.id })
  }

  async destroy({ params, response, session, bouncer }: HttpContext) {
    const post = await BlogPost.findOrFail(params.id)
    await bouncer.with('SellerPostPolicy').authorize('delete', post)
    await post.delete()
    session.flash('success', 'Post deleted')
    return response.redirect().toRoute('seller.posts.index')
  }
}
