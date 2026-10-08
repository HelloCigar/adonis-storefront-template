import factory from '@adonisjs/lucid/factories'
import { DateTime } from 'luxon'
import BlogPost from '#models/content/blog_post'
import RichTextService, { type RichTextNode } from '#services/content/rich_text_service'
import { UserFactory } from './user_factory.js'

const badges = ['New arrivals', 'Guide', 'Update', 'Behind the scenes']
const richText = new RichTextService()
const text = (value: string, marks?: string[]): RichTextNode =>
  marks
    ? { type: 'text', text: value, marks: marks.map((type) => ({ type })) }
    : { type: 'text', text: value }

/**
 * Posts carry an editor document and the HTML rendered from it, as staff-saved posts do.
 * Merging `content` alone leaves the generated `contentHtml`; merge both to keep them in step.
 */
export const BlogPostFactory = factory
  .define(BlogPost, ({ faker }) => {
    const title = faker.lorem.sentence({ min: 3, max: 6 }).replace(/\.$/, '')
    const content = richText.normalize({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [text(faker.lorem.paragraph())] },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [text(faker.lorem.words({ min: 2, max: 4 }))],
        },
        {
          type: 'paragraph',
          content: [
            text(faker.lorem.sentence() + ' '),
            text(faker.lorem.words(3), ['bold']),
            text(' ' + faker.lorem.sentence()),
          ],
        },
        {
          type: 'bulletList',
          content: faker.helpers.multiple(
            () => ({
              type: 'listItem',
              content: [{ type: 'paragraph', content: [text(faker.lorem.sentence())] }],
            }),
            { count: 3 }
          ),
        },
      ],
    })
    return {
      title,
      handle:
        faker.helpers.slugify(title).toLowerCase() +
        '-' +
        faker.string.alphanumeric(8).toLowerCase(),
      excerpt: faker.lorem.sentence(),
      badge: faker.helpers.maybe(() => faker.helpers.arrayElement(badges)) ?? null,
      content,
      contentHtml: richText.toHtml(content),
      status: 'draft' as const,
      publishedAt: null,
    }
  })
  .state('published', (post) => {
    post.status = 'published'
    post.publishedAt = DateTime.utc().minus({ minutes: 1 })
  })
  .state('scheduled', (post) => {
    post.status = 'published'
    post.publishedAt = DateTime.utc().plus({ days: 7 })
  })
  .relation('author', () => UserFactory)
  .build()
