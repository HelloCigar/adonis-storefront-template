import { inject } from '@adonisjs/core'
import BlogService from '#services/content/blog_service'
import BlogPostTransformer from '#transformers/content/blog_post_transformer'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class BlogPostsController {
  constructor(private blog: BlogService) {}

  index({ request, inertia }: HttpContext) {
    const page = Math.max(1, Number.parseInt(request.input('page', '1'), 10) || 1)
    return inertia.render('blog/index', {
      posts: inertia.scroll(async () => {
        const posts = await this.blog.publishedPosts(page)
        return BlogPostTransformer.paginate(posts.all(), posts.getMeta())
      }),
    })
  }

  async show({ params, inertia }: HttpContext) {
    const post = await this.blog.findPublishedOrFail(params.handle)
    return inertia.render('blog/[handle]', {
      post: BlogPostTransformer.transform(post).useVariant('forDetailedView'),
    })
  }
}
