import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import User from '#models/account/user'
import BlogPost from '#models/content/blog_post'

const staff = () =>
  User.create({
    fullName: 'Store Staff',
    email: 'staff@example.com',
    password: 'secret-password',
    role: 'staff',
  })
const paragraph = (value: string) => ({
  type: 'paragraph',
  content: [{ type: 'text', text: value }],
})
const draftPayload = {
  title: 'Spring arrivals',
  handle: 'spring-arrivals',
  excerpt: 'What is new this season',
  badge: 'Release',
  content: { type: 'doc', content: [paragraph('Fresh stock is here.')] },
  status: 'draft',
  publishedAt: null as string | null,
}
/** The editor sends its document as a JSON string; see app/validators/seller/post.ts. */
const body = <T extends { content: unknown }>(payload: T) => ({
  ...payload,
  content: JSON.stringify(payload.content),
})
const emptyContent = { type: 'doc', content: [{ type: 'paragraph' }] }
const countPosts = async () => {
  const posts = await BlogPost.all()
  return posts.length
}
const createPost = (attrs: Partial<BlogPost> & { handle: string }) =>
  BlogPost.create({
    title: attrs.handle,
    content: { type: 'doc', content: [] },
    contentHtml: '',
    status: 'draft',
    ...attrs,
  })

test.group('Seller posts', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('only staff can view and manage posts', async ({ client, assert }) => {
    const customer = await User.create({
      email: 'customer@example.com',
      password: 'secret-password',
    })
    const owner = await staff()

    const guest = await client.get('/seller/posts').redirects(0)
    guest.assertStatus(302)
    guest.assertHeader('location', '/login')

    const deniedGet = await client.get('/seller/posts').loginAs(customer).accept('json')
    deniedGet.assertStatus(403)

    const deniedPost = await client
      .post('/seller/posts')
      .loginAs(customer)
      .withCsrfToken()
      .accept('json')
      .json(body(draftPayload))
    deniedPost.assertStatus(403)
    assert.equal(await countPosts(), 0)

    const page = await client.get('/seller/posts').loginAs(owner).withInertia()
    page.assertStatus(200)
    page.assertInertiaComponent('seller/posts')
    assert.deepEqual(page.inertiaProps.posts, [])
  })

  test('staff see the create page with no post', async ({ client, assert }) => {
    const owner = await staff()
    const page = await client.get('/seller/posts/create').loginAs(owner).withInertia()
    page.assertStatus(200)
    page.assertInertiaComponent('seller/post')
    assert.isNull(page.inertiaProps.post)
  })

  test('staff create a draft with normalized content and rendered html', async ({
    client,
    assert,
  }) => {
    const owner = await staff()
    const response = await client
      .post('/seller/posts')
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json(
        body({
          ...draftPayload,
          content: {
            type: 'doc',
            content: [
              {
                type: 'heading',
                attrs: { level: 9, id: 'x' },
                content: [{ type: 'text', text: 'Hi' }],
              },
              { type: 'script', content: [{ type: 'text', text: 'alert(1)' }] },
              {
                type: 'paragraph',
                attrs: { class: 'danger' },
                content: [{ type: 'text', text: '<b>bold</b>' }],
              },
            ],
          },
        })
      )

    const post = await BlogPost.findByOrFail('handle', 'spring-arrivals')
    response.assertRedirectsTo(`/seller/posts/${post.id}/edit`)
    assert.equal(post.title, 'Spring arrivals')
    assert.equal(post.excerpt, 'What is new this season')
    assert.equal(post.status, 'draft')
    assert.isNull(post.publishedAt)
    assert.equal(post.authorId, owner.id)
    assert.equal(post.badge, 'Release')
    assert.deepEqual(post.content, {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Hi' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '<b>bold</b>' }] },
      ],
    })
    assert.equal(post.contentHtml, '<h2>Hi</h2><p>&lt;b&gt;bold&lt;/b&gt;</p>')
  })

  test('publishing without a date publishes now and later edits keep the date', async ({
    client,
    assert,
  }) => {
    const owner = await staff()
    const before = DateTime.utc().minus({ seconds: 5 })
    await client
      .post('/seller/posts')
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json(body({ ...draftPayload, status: 'published' }))
      .then((response) => response.assertStatus(200))

    const post = await BlogPost.findByOrFail('handle', 'spring-arrivals')
    assert.equal(post.status, 'published')
    assert.isNotNull(post.publishedAt)
    const firstPublishedAt = post.publishedAt!
    assert.isAtLeast(firstPublishedAt.toMillis(), before.toMillis())
    assert.isAtMost(firstPublishedAt.toMillis(), DateTime.utc().plus({ seconds: 5 }).toMillis())

    const edited = await client
      .patch(`/seller/posts/${post.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json(body({ ...draftPayload, title: 'Spring arrivals (updated)', status: 'published' }))
    edited.assertRedirectsTo(`/seller/posts/${post.id}/edit`)
    await post.refresh()
    assert.equal(post.title, 'Spring arrivals (updated)')
    assert.equal(post.publishedAt!.toMillis(), firstPublishedAt.toMillis())
  })

  test('an explicit publish date is stored as given', async ({ client, assert }) => {
    const owner = await staff()
    await client
      .post('/seller/posts')
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json(body({ ...draftPayload, status: 'published', publishedAt: '2030-01-02T03:04:05.000Z' }))
    const post = await BlogPost.findByOrFail('handle', 'spring-arrivals')
    assert.equal(post.publishedAt!.toUTC().toISO(), '2030-01-02T03:04:05.000Z')
  })

  test('publishing an empty document fails validation and creates nothing', async ({
    client,
    assert,
  }) => {
    const owner = await staff()
    const response = await client
      .post('/seller/posts')
      .loginAs(owner)
      .withCsrfToken()
      .header('referer', '/seller/posts/create')
      .redirects(0)
      .json(body({ ...draftPayload, content: emptyContent, status: 'published' }))
    response.assertStatus(302)
    assert.property(response.flashMessages().inputErrorsBag, 'content')
    assert.equal(await countPosts(), 0)

    const draft = await client
      .post('/seller/posts')
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json(body({ ...draftPayload, content: emptyContent }))
    draft.assertStatus(200)
    assert.equal(await countPosts(), 1)
  })

  test('rejects a duplicate handle', async ({ client, assert }) => {
    const owner = await staff()
    await createPost({ handle: 'spring-arrivals' })

    const duplicate = await client
      .post('/seller/posts')
      .loginAs(owner)
      .withCsrfToken()
      .header('referer', '/seller/posts/create')
      .redirects(0)
      .json(body(draftPayload))
    duplicate.assertStatus(302)
    assert.property(duplicate.flashMessages().inputErrorsBag, 'handle')
    assert.equal(await countPosts(), 1)
  })

  test('a javascript: link in content never reaches the stored html', async ({
    client,
    assert,
  }) => {
    const owner = await staff()
    await client
      .post('/seller/posts')
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json(
        body({
          ...draftPayload,
          content: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: 'bad',
                    marks: [{ type: 'link', attrs: { href: ' JavaScript:alert(1)' } }],
                  },
                  {
                    type: 'text',
                    text: 'good',
                    marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
                  },
                ],
              },
            ],
          },
        })
      )
    const post = await BlogPost.findByOrFail('handle', 'spring-arrivals')
    assert.notMatch(post.contentHtml, /javascript/i)
    assert.notInclude(JSON.stringify(post.content).toLowerCase(), 'javascript')
    assert.include(post.contentHtml, 'bad')
    assert.include(post.contentHtml, '<a href="https://example.com"')
  })

  test('the edit page returns the post with its content', async ({ client, assert }) => {
    const owner = await staff()
    const content = { type: 'doc', content: [paragraph('Stored text')] }
    const post = await createPost({
      handle: 'stored-post',
      title: 'Stored post',
      content: content as BlogPost['content'],
      contentHtml: '<p>Stored text</p>',
      authorId: owner.id,
    })

    const page = await client.get(`/seller/posts/${post.id}/edit`).loginAs(owner).withInertia()
    page.assertStatus(200)
    page.assertInertiaComponent('seller/post')
    assert.equal(page.inertiaProps.post.id, post.id)
    assert.equal(page.inertiaProps.post.handle, 'stored-post')
    assert.deepEqual(page.inertiaProps.post.content, content)

    const list = await client.get('/seller/posts').loginAs(owner).withInertia()
    assert.lengthOf(list.inertiaProps.posts, 1)
    assert.equal(list.inertiaProps.posts[0].authorName, 'Store Staff')
  })

  test('staff update and delete a post', async ({ client, assert }) => {
    const owner = await staff()
    const post = await createPost({ handle: 'old-handle', authorId: owner.id })

    const updated = await client
      .patch(`/seller/posts/${post.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json(
        body({
          ...draftPayload,
          handle: 'new-handle',
          content: { type: 'doc', content: [paragraph('Rewritten')] },
        })
      )
    updated.assertRedirectsTo(`/seller/posts/${post.id}/edit`)
    await post.refresh()
    assert.equal(post.handle, 'new-handle')
    assert.equal(post.contentHtml, '<p>Rewritten</p>')
    assert.equal(post.authorId, owner.id)

    const deleted = await client.delete(`/seller/posts/${post.id}`).loginAs(owner).withCsrfToken()
    deleted.assertRedirectsTo('/seller/posts')
    assert.isNull(await BlogPost.find(post.id))
  })

  test('spaces around formatted text survive the round trip', async ({ client, assert }) => {
    const owner = await staff()
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Roasted ' },
            { type: 'text', text: 'this week', marks: [{ type: 'bold' }] },
            { type: 'text', text: ' only.' },
          ],
        },
      ],
    }
    const response = await client
      .post('/seller/posts')
      .loginAs(owner)
      .withCsrfToken()
      .redirects(0)
      .json(body({ ...draftPayload, content }))
    response.assertStatus(302)

    const post = await BlogPost.findByOrFail('handle', draftPayload.handle)
    assert.deepEqual(post.content, content)
    assert.equal(post.contentHtml, '<p>Roasted <strong>this week</strong> only.</p>')
  })

  test('content that is not a Tiptap document is rejected', async ({ client, assert }) => {
    const owner = await staff()
    for (const content of ['not json', '{"type":"paragraph"}', '[]']) {
      const response = await client
        .post('/seller/posts')
        .loginAs(owner)
        .withCsrfToken()
        .header('referer', '/seller/posts/create')
        .redirects(0)
        .json({ ...draftPayload, content })
      response.assertStatus(302)
      assert.property(response.flashMessages().inputErrorsBag, 'content')
    }
    assert.equal(await countPosts(), 0)
  })

  test('the published scope returns only live posts, newest first', async ({ assert }) => {
    const now = DateTime.utc()
    await createPost({ handle: 'draft', status: 'draft' })
    await createPost({
      handle: 'scheduled',
      status: 'published',
      publishedAt: now.plus({ days: 2 }),
    })
    await createPost({
      handle: 'older',
      status: 'published',
      publishedAt: now.minus({ days: 3 }),
    })
    await createPost({
      handle: 'newer',
      status: 'published',
      publishedAt: now.minus({ hours: 1 }),
    })

    const posts = await BlogPost.query().apply((scopes) => scopes.published())
    assert.deepEqual(
      posts.map((post) => post.handle),
      ['newer', 'older']
    )
  })
})
