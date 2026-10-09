import { BaseSeeder } from '@adonisjs/lucid/seeders'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import BlogPost, { type BlogPostStatus } from '#models/content/blog_post'
import RichTextService, { type RichTextNode } from '#services/content/rich_text_service'
import { BlogPostFactory } from '../factories/blog_post_factory.js'

type Inline = string | { text: string; bold?: boolean; italic?: boolean; href?: string }

const inline = (parts: Inline[]): RichTextNode[] =>
  parts.map((part) => {
    if (typeof part === 'string') return { type: 'text', text: part }
    const marks = [
      ...(part.bold ? [{ type: 'bold' }] : []),
      ...(part.italic ? [{ type: 'italic' }] : []),
      ...(part.href ? [{ type: 'link', attrs: { href: part.href } }] : []),
    ]
    return { type: 'text', text: part.text, marks }
  })
const p = (...parts: Inline[]): RichTextNode => ({ type: 'paragraph', content: inline(parts) })
const h2 = (title: string): RichTextNode => ({
  type: 'heading',
  attrs: { level: 2 },
  content: inline([title]),
})
const list = (type: 'bulletList' | 'orderedList', items: Inline[][]): RichTextNode => ({
  type,
  content: items.map((item) => ({ type: 'listItem', content: [p(...item)] })),
})
const quote = (...parts: Inline[]): RichTextNode => ({ type: 'blockquote', content: [p(...parts)] })

type DemoPost = {
  handle: string
  title: string
  excerpt: string
  badge: string | null
  status: BlogPostStatus
  /** Days from now; negative is in the past. Null for drafts. */
  publishedInDays: number | null
  content: RichTextNode[]
}

const posts: DemoPost[] = [
  {
    handle: 'demo-welcome-to-the-shop',
    title: 'Welcome to the shop',
    excerpt: 'Who we are, what we make, and what to expect from this blog.',
    badge: 'Update',
    status: 'published',
    publishedInDays: -45,
    content: [
      p(
        'We started this shop to sell a small range of things we use every day: bags, homeware, and a few desk pieces. ',
        { text: 'Everything is chosen to last', bold: true },
        ', and we would rather carry fewer things done well than a long list of maybes.'
      ),
      h2('What you will find here'),
      list('bulletList', [
        ['Notes on new arrivals and restocks'],
        ['Care guides for the materials we sell'],
        ['The occasional look behind the scenes at how we pack and ship'],
      ]),
      p(
        'If there is something you would like us to write about, reply to any order email and tell us.'
      ),
    ],
  },
  {
    handle: 'demo-caring-for-canvas-and-linen',
    title: 'Caring for canvas and linen',
    excerpt: 'Simple habits that keep natural fabrics looking good for years.',
    badge: 'Guide',
    status: 'published',
    publishedInDays: -30,
    content: [
      p(
        'Canvas and linen get better with use, but a little care goes a long way. These steps work for our ',
        { text: 'Canvas Tote', href: '/product/demo-canvas-tote' },
        ' and ',
        { text: 'Linen Cushion', href: '/product/demo-linen-cushion' },
        '.'
      ),
      h2('Washing'),
      list('orderedList', [
        ['Spot clean first. Most marks lift with cold water and a mild soap.'],
        ['For a full wash, turn the item inside out and use a cold, gentle cycle.'],
        [
          { text: 'Never tumble dry.', bold: true },
          ' Reshape while damp and dry flat in the shade.',
        ],
      ]),
      h2('Storage'),
      p('Keep pieces somewhere dry and out of direct sun, which fades natural dyes over time.'),
      quote({
        text: 'Creases in linen are part of its character. Iron it only if you want to.',
        italic: true,
      }),
    ],
  },
  {
    handle: 'demo-new-in-the-workspace-range',
    title: 'New in the workspace range',
    excerpt: 'A desk lamp, a book stand, and a cable organizer join the range.',
    badge: 'New arrivals',
    status: 'published',
    publishedInDays: -12,
    content: [
      p('Three new pieces for the desk landed this month, each chosen to clear a little clutter.'),
      list('bulletList', [
        [
          { text: 'Desk Lamp', href: '/product/demo-desk-lamp' },
          ': a warm, dimmable light with a weighted base.',
        ],
        [
          { text: 'Book Stand', href: '/product/demo-book-stand' },
          ': holds a cookbook or a laptop at a comfortable angle.',
        ],
        [
          { text: 'Cable Organizer', href: '/product/demo-cable-organizer' },
          ': keeps chargers in one place instead of across the floor.',
        ],
      ]),
      p(
        'All three come in our usual ',
        { text: 'Natural, Slate, and Olive', bold: true },
        ' finishes.'
      ),
    ],
  },
  {
    handle: 'demo-how-we-pack-your-order',
    title: 'How we pack your order',
    excerpt: 'From the shelf to your door: what happens after you check out.',
    badge: 'Behind the scenes',
    status: 'published',
    publishedInDays: -3,
    content: [
      p(
        'Every order is picked and packed by hand, usually the same day it is paid. Here is what happens in between.'
      ),
      h2('Packing'),
      p(
        'We reuse boxes where we can and fill gaps with paper, never plastic. Fragile pieces like the ',
        { text: 'Ceramic Mug', href: '/product/demo-ceramic-mug' },
        ' get an extra wrap.'
      ),
      h2('Shipping'),
      p(
        'Once your parcel is handed to the courier, you get an email with tracking details. You can also follow it from ',
        { text: 'your account', href: '/account/orders' },
        '.'
      ),
      { type: 'horizontalRule' },
      p({
        text: 'Questions about an order? Message us from the order page and we will reply there.',
        italic: true,
      }),
    ],
  },
  {
    handle: 'demo-autumn-restock',
    title: 'Autumn restock',
    excerpt: 'The Weekend Bag and Woven Throw are coming back.',
    badge: 'New arrivals',
    status: 'published',
    publishedInDays: 7,
    content: [
      p(
        'Two of our most asked-about pieces are back next week: the ',
        { text: 'Weekend Bag', bold: true },
        ' and the ',
        { text: 'Woven Throw', bold: true },
        '.'
      ),
      p('Quantities are limited, so check back on the day.'),
    ],
  },
  {
    handle: 'demo-gift-guide-draft',
    title: 'Gift guide (draft)',
    excerpt: 'Ideas for every budget.',
    badge: 'Guide',
    status: 'draft',
    publishedInDays: null,
    content: [
      p('Working list, not ready to publish yet.'),
      list('bulletList', [['Under ₱500'], ['Under ₱1,000'], ['For the desk']]),
    ],
  },
]

/**
 * Demo blog posts for the public timeline and the staff editor: published posts across the past
 * weeks, one scheduled for next week, and one draft. Inserts missing posts by handle only; never
 * changes or deletes existing posts.
 */
export default class BlogSeeder extends BaseSeeder {
  static environment = ['development', 'test']

  async run() {
    if (!BlogSeeder.environment.includes(app.nodeEnvironment)) return
    const richText = new RichTextService()

    await this.client.transaction(async (trx) => {
      const existing = await BlogPost.query({ client: trx })
        .whereIn(
          'handle',
          posts.map((post) => post.handle)
        )
        .select('handle')
      const seeded = new Set(existing.map((post) => post.handle))

      for (const post of posts) {
        if (seeded.has(post.handle)) continue
        const content = await richText.normalize({ type: 'doc', content: post.content })
        await BlogPostFactory.client(trx)
          .merge({
            handle: post.handle,
            title: post.title,
            excerpt: post.excerpt,
            badge: post.badge,
            content,
            contentHtml: richText.toHtml(content),
            status: post.status,
            publishedAt:
              post.publishedInDays === null
                ? null
                : DateTime.utc().plus({ days: post.publishedInDays }).startOf('hour'),
          })
          .create()
      }
    })
  }
}
