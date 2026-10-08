import factory from '@adonisjs/lucid/factories'
import BlogPost from '#models/content/blog_post'
import { DateTime } from 'luxon'

export const BlogPostFactory = factory
  .define(BlogPost, ({ faker }) => {
    const title = faker.lorem.sentence({ min: 3, max: 6 }).replace(/\.$/, '')
    const paragraph = faker.lorem.paragraph()
    return {
      title,
      handle: faker.helpers.slugify(title).toLowerCase() + '-' + faker.string.alphanumeric(8),
      excerpt: faker.lorem.sentence(),
      content: {
        type: 'doc' as const,
        content: [{ type: 'paragraph', content: [{ type: 'text', text: paragraph }] }],
      },
      contentHtml: `<p>${paragraph}</p>`,
      status: 'draft' as const,
      publishedAt: null,
    }
  })
  .state('published', (post) => {
    post.status = 'published'
    post.publishedAt = DateTime.utc().minus({ minutes: 1 })
  })
  .build()
