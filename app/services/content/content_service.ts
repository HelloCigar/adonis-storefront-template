import storefront from '#config/storefront'

export default class ContentService {
  findPage(handle: string) {
    return storefront.pages.find((item) => item.handle === handle)
  }

  policies() {
    return storefront.policies
  }

  findPolicy(handle: string) {
    return storefront.policies.find((item) => item.handle === handle)
  }

  findBlog(handle: string) {
    return storefront.blogs.find((item) => item.handle === handle)
  }

  findArticle(handle: string, articleHandle: string) {
    const blog = this.findBlog(handle)
    const article = blog?.articles.find((item) => item.handle === articleHandle)
    if (!blog || !article) return null
    return { blog, article }
  }
}
