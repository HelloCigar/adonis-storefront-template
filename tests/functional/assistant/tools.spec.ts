import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import storefront from '#config/storefront'
import ProductReview from '#models/catalog/product_review'
import { BlogPostFactory } from '#database/factories/blog_post_factory'
import { CollectionFactory } from '#database/factories/collection_factory'
import { ProductFactory } from '#database/factories/product_factory'
import { UserFactory } from '#database/factories/user_factory'
import { askAssistant, assistantOn } from '#tests/helpers/assistant'
import { savedStorePolicy } from '#tests/helpers/store_setup'

test.group('Shopping assistant tools', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test("getProduct gives a published product's variants, stock and reviews, never a count", async ({
    client,
    assert,
  }) => {
    const product = await ProductFactory.apply('published')
      .merge({ title: 'Brass Lamp', handle: 'brass-lamp' })
      .with('variants', 1, (variant) =>
        variant.merge({
          title: 'Small',
          options: { Size: 'Small' },
          priceAmount: 1000,
          inventoryQuantity: 7,
          position: 0,
        })
      )
      .with('variants', 1, (variant) =>
        variant
          .apply('soldOut')
          .merge({ title: 'Large', options: { Size: 'Large' }, priceAmount: 1250, position: 1 })
      )
      .create()
    const reviewer = await UserFactory.create()
    await ProductReview.create({
      productId: product.id,
      userId: reviewer.id,
      rating: 4,
      title: 'Nice',
      body: 'Lovely warm light.',
      status: 'approved',
    })
    const { model } = await assistantOn()
    model.callTool('getProduct', { handle: 'brass-lamp' }, 'It comes in Small and Large.')

    await askAssistant(client, 'Tell me about the brass lamp')

    const result = model.toolResult('getProduct')
    assert.containSubset(result, {
      found: true,
      product: {
        title: 'Brass Lamp',
        variants: [
          { title: 'Small', availability: 'in_stock', price: { formatted: '₱1,000.00' } },
          { title: 'Large', availability: 'out_of_stock' },
        ],
        reviews: { count: 1, average: 4, top: [{ rating: 4, body: 'Lovely warm light.' }] },
      },
    })
    assert.notInclude(JSON.stringify(result), 'inventory')
  })

  test('getProduct finds no draft product', async ({ client, assert }) => {
    await ProductFactory.merge({ handle: 'secret-lamp' }).with('variants', 1).create()
    const { model } = await assistantOn()
    model.callTool('getProduct', { handle: 'secret-lamp' }, "I couldn't find that product.")

    await askAssistant(client, 'Tell me about the secret lamp')

    assert.deepEqual(model.toolResult('getProduct'), { found: false })
  })

  test('listCollections lists only published collections', async ({ client, assert }) => {
    await CollectionFactory.apply('published').merge({ title: 'Lamps', handle: 'lamps' }).create()
    await CollectionFactory.merge({ title: 'Hidden', handle: 'hidden' }).create()
    const { model } = await assistantOn()
    model.callTool('listCollections', {}, 'We have Lamps.')

    await askAssistant(client, 'What collections do you have?')

    const result = model.toolResult('listCollections') as { collections: { title: string }[] }
    assert.deepEqual(
      result.collections.map((collection) => collection.title),
      ['Lamps']
    )
  })

  test("getStoreInfo gives the shipping fee, contact email and the store's policies", async ({
    client,
    assert,
  }) => {
    const { model } = await assistantOn({
      contactEmail: 'hello@lantern.test',
      shippingMinor: 15000,
    })
    await savedStorePolicy('refund-policy', 'Returns within 30 days.')
    model.callTool('getStoreInfo', {}, 'Shipping is ₱150.00.')

    await askAssistant(client, 'How much is shipping?')

    assert.containSubset(model.toolResult('getStoreInfo'), {
      contactEmail: 'hello@lantern.test',
      shippingFee: { formatted: '₱150.00' },
      policies: [{ handle: 'refund-policy', title: 'Refund policy' }],
    })
  })

  test('readPolicy gives the text of one policy, and nothing for an unknown one', async ({
    client,
    assert,
  }) => {
    const { model } = await assistantOn()
    await savedStorePolicy('refund-policy', 'Returns within 30 days.')
    model.callTool(
      'readPolicy',
      [{ handle: 'refund-policy' }, { handle: 'made-up-policy' }],
      'You can return items within 30 days.'
    )

    await askAssistant(client, 'What is your refund policy?')

    const [refund, unknown] = model.toolResults('readPolicy')
    assert.containSubset(refund, { found: true, policy: { title: 'Refund policy' } })
    assert.include(JSON.stringify(refund), 'Returns within 30 days.')
    assert.deepEqual(unknown, { found: false })
  })

  test('searchContent finds published posts and pages, never drafts', async ({
    client,
    assert,
    cleanup,
  }) => {
    await BlogPostFactory.apply('published').merge({ title: 'Lamp care guide' }).create()
    await BlogPostFactory.merge({ title: 'Lamp secrets' }).create()
    storefront.pages.push({
      id: 'lamps',
      handle: 'lamps',
      title: 'About our lamps',
      body: '<p>Hi</p>',
    })
    cleanup(() => {
      storefront.pages.splice(0)
    })
    const { model } = await assistantOn()
    model.callTool('searchContent', { query: 'lamp' }, 'Here is our lamp care guide.')

    await askAssistant(client, 'How do I care for a lamp?')

    const result = model.toolResult('searchContent') as {
      posts: { title: string }[]
      pages: { title: string }[]
    }
    assert.deepEqual(
      result.posts.map((post) => post.title),
      ['Lamp care guide']
    )
    assert.deepEqual(
      result.pages.map((page) => page.title),
      ['About our lamps']
    )
  })

  test('readContent gives the text of a published post or page', async ({
    client,
    assert,
    cleanup,
  }) => {
    await BlogPostFactory.apply('published')
      .merge({ title: 'Lamp care guide', handle: 'lamp-care', contentHtml: '<p>Dust weekly.</p>' })
      .create()
    storefront.pages.push({
      id: 'about',
      handle: 'about',
      title: 'About us',
      body: '<p>We make lamps.</p>',
    })
    cleanup(() => {
      storefront.pages.splice(0)
    })
    const { model } = await assistantOn()
    model.callTool(
      'readContent',
      [
        { kind: 'blog_post', handle: 'lamp-care' },
        { kind: 'page', handle: 'about' },
      ],
      'Dust it weekly.'
    )

    await askAssistant(client, 'How do I clean my lamp?')

    const [post, page] = model.toolResults('readContent')
    assert.include(JSON.stringify(post), 'Dust weekly.')
    assert.include(JSON.stringify(page), 'We make lamps.')
  })
})
