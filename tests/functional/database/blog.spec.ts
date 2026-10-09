import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import BlogPost from '#models/content/blog_post'
import RichTextService from '#services/content/rich_text_service'
import { BlogPostFactory } from '#database/factories/blog_post_factory'
import BlogSeeder from '#database/seeders/blog_seeder'

test.group('Blog factory and seeder', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('factory posts carry a document and the HTML rendered from it', async ({ assert }) => {
    const richText = new RichTextService()
    const [draft, published, scheduled] = await Promise.all([
      BlogPostFactory.create(),
      BlogPostFactory.apply('published').with('author').create(),
      BlogPostFactory.apply('scheduled').create(),
    ])

    for (const post of [draft, published, scheduled]) {
      await post.refresh()
      assert.isTrue(richText.hasContent(post.content))
      assert.equal(post.contentHtml, richText.toHtml(await richText.normalize(post.content)))
      assert.match(post.handle, /^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    }
    assert.equal(draft.status, 'draft')
    assert.isNull(draft.publishedAt)
    assert.isNotNull(published.authorId)

    const live = await BlogPost.query().withScopes((scopes) => scopes.published())
    assert.deepEqual(
      live.map((post) => post.id),
      [published.id]
    )
  })

  test('seeds demo posts twice without duplicating or overwriting them', async ({ assert }) => {
    const seeder = new BlogSeeder(db.connection())
    await seeder.run()

    const posts = await BlogPost.query().orderBy('handle')
    assert.lengthOf(posts, 6)
    assert.sameMembers(
      posts.map((post) => post.status),
      ['published', 'published', 'published', 'published', 'published', 'draft']
    )
    const live = await BlogPost.query().withScopes((scopes) => scopes.published())
    assert.lengthOf(live, 4, 'one published post is scheduled for next week')
    assert.isTrue(posts.every((post) => post.contentHtml.startsWith('<p>')))
    assert.isTrue(posts.filter((post) => post.status === 'published').every((post) => !!post.badge))

    const edited = posts[0]
    edited.title = 'Edited by staff'
    await edited.save()
    await seeder.run()

    assert.lengthOf(await BlogPost.all(), 6)
    await edited.refresh()
    assert.equal(edited.title, 'Edited by staff')
  })
})
