import BlogPost from '#models/content/blog_post'

export default class BlogService {
  /** Newest published posts first (the scope's order); ids keep ties stable across pages. */
  publishedPosts(page: number, perPage = 10) {
    return this.published().orderBy('id', 'desc').paginate(page, perPage)
  }

  findPublishedOrFail(handle: string) {
    return this.published().where('handle', handle).firstOrFail()
  }

  private published() {
    return BlogPost.query()
      .withScopes((scopes) => scopes.published())
      .preload('author')
  }
}
