import { BlogPostFactory } from '#database/factories/blog_post_factory'
import { UserFactory } from '#database/factories/user_factory'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

test.group('Content / blog', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('lists only published posts, newest first, without article bodies', async ({
    client,
    assert,
  }) => {
    const now = DateTime.utc()
    await BlogPostFactory.merge({
      handle: 'oldest',
      status: 'published',
      publishedAt: now.minus({ days: 3 }),
    }).create()
    await BlogPostFactory.merge({
      handle: 'newest',
      status: 'published',
      publishedAt: now.minus({ hours: 1 }),
    }).create()
    await BlogPostFactory.merge({
      handle: 'middle',
      status: 'published',
      publishedAt: now.minus({ days: 1 }),
    }).create()
    await BlogPostFactory.merge({ handle: 'draft', publishedAt: null }).create()
    await BlogPostFactory.merge({
      handle: 'scheduled',
      status: 'published',
      publishedAt: now.plus({ days: 1 }),
    }).create()

    const response = await client.get('/blog').withInertia()
    response.assertStatus(200)
    response.assertInertiaComponent('blog/index')

    const posts = response.inertiaProps.posts.data
    assert.deepEqual(
      posts.map((post: { handle: string }) => post.handle),
      ['newest', 'middle', 'oldest']
    )
    for (const post of posts) {
      assert.notProperty(post, 'contentHtml')
    }
  })

  test('shows the author display name only, never the author email', async ({ client, assert }) => {
    const author = await UserFactory.merge({
      fullName: 'Mina Bunny',
      email: 'mina-author@example.com',
    }).create()
    const anonymous = await UserFactory.merge({
      fullName: null,
      email: 'nameless-author@example.com',
    }).create()
    const now = DateTime.utc()
    await BlogPostFactory.merge({
      handle: 'named',
      authorId: author.id,
      status: 'published',
      publishedAt: now.minus({ hours: 1 }),
    }).create()
    await BlogPostFactory.merge({
      handle: 'nameless',
      authorId: anonymous.id,
      status: 'published',
      publishedAt: now.minus({ hours: 2 }),
    }).create()
    await BlogPostFactory.merge({
      handle: 'orphan',
      authorId: null,
      status: 'published',
      publishedAt: now.minus({ hours: 3 }),
    }).create()

    const response = await client.get('/blog').withInertia()
    response.assertStatus(200)
    const byHandle = Object.fromEntries(
      response.inertiaProps.posts.data.map((post: { handle: string }) => [post.handle, post])
    )
    assert.equal(byHandle.named.authorName, 'Mina Bunny')
    assert.isNull(byHandle.nameless.authorName)
    assert.isNull(byHandle.orphan.authorName)

    const serialized = JSON.stringify(response.inertiaProps)
    assert.notInclude(serialized, 'mina-author@example.com')
    assert.notInclude(serialized, 'nameless-author@example.com')

    const detail = await client.get('/blog/named').withInertia()
    detail.assertStatus(200)
    assert.equal(detail.inertiaProps.post.authorName, 'Mina Bunny')
    assert.notInclude(JSON.stringify(detail.inertiaProps), 'mina-author@example.com')
  })

  test('paginates ten posts per page using the page query string', async ({ client, assert }) => {
    const now = DateTime.utc()
    for (let index = 0; index < 12; index++) {
      await BlogPostFactory.merge({
        handle: `post-${index}`,
        status: 'published',
        publishedAt: now.minus({ hours: index + 1 }),
      }).create()
    }

    const first = await client.get('/blog').withInertia()
    first.assertStatus(200)
    first.assertInertiaComponent('blog/index')
    assert.lengthOf(first.inertiaProps.posts.data, 10)
    assert.equal(first.inertiaProps.posts.data[0].handle, 'post-0')

    const second = await client.get('/blog?page=2').withInertia()
    second.assertStatus(200)
    second.assertInertiaComponent('blog/index')
    assert.deepEqual(
      second.inertiaProps.posts.data.map((post: { handle: string }) => post.handle),
      ['post-10', 'post-11']
    )
  })

  test('renders an empty list when nothing is published', async ({ client, assert }) => {
    await BlogPostFactory.merge({ handle: 'only-draft', publishedAt: null }).create()

    const response = await client.get('/blog').withInertia()
    response.assertStatus(200)
    response.assertInertiaComponent('blog/index')
    assert.deepEqual(response.inertiaProps.posts.data, [])
  })

  test('renders a published post with its title and content', async ({ client, assert }) => {
    await BlogPostFactory.merge({
      handle: 'hello-world',
      title: 'Hello world',
      contentHtml: '<p>Hello there.</p>',
    })
      .apply('published')
      .create()

    const response = await client.get('/blog/hello-world').withInertia()
    response.assertStatus(200)
    response.assertInertiaComponent('blog/[handle]')
    assert.equal(response.inertiaProps.post.title, 'Hello world')
    assert.equal(response.inertiaProps.post.handle, 'hello-world')
    assert.equal(response.inertiaProps.post.contentHtml, '<p>Hello there.</p>')
  })

  test('returns 404 for drafts, scheduled posts, and unknown handles', async ({ client }) => {
    await BlogPostFactory.merge({ handle: 'secret-draft', publishedAt: null }).create()
    await BlogPostFactory.merge({
      handle: 'coming-soon',
      status: 'published',
      publishedAt: DateTime.utc().plus({ days: 1 }),
    }).create()

    for (const handle of ['secret-draft', 'coming-soon', 'does-not-exist']) {
      const response = await client.get(`/blog/${handle}`).withInertia()
      response.assertStatus(404)
    }
  })
})
