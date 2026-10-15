import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { ProductFactory } from '#database/factories/product_factory'
import { assistantOn, awaitReply, sendMessage } from '#tests/helpers/assistant'

test.group('Shopping assistant messages', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test("clicking a suggested question sends it and shows the assistant's reply", async ({
    visit,
    route,
  }) => {
    const { model } = await assistantOn()
    model.replyWith('Shipping is ₱150.00 per order.')

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Shopping assistant', exact: true })
    await awaitReply(page, () =>
      dialog.getByRole('button', { name: 'How much is shipping?', exact: true }).click()
    )

    await page.assertVisible(dialog.getByText('How much is shipping?', { exact: true }))
    await page.assertVisible(dialog.getByText('Shipping is ₱150.00 per order.', { exact: true }))
  })

  test("a product search shows a card with the product's image, name, price and stock", async ({
    visit,
    route,
  }) => {
    await ProductFactory.apply('published', 'withMedia')
      .merge({ title: 'Brass Lamp', handle: 'brass-lamp' })
      .with('variants', 1, (variant) => variant.merge({ priceAmount: 1250, inventoryQuantity: 7 }))
      .create()
    const { model } = await assistantOn()
    model.callTool('searchProducts', { query: 'lamp' }, 'Here is what I found.')

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    await sendMessage(page, 'Do you have lamps?')

    const dialog = page.getByRole('dialog', { name: 'Shopping assistant', exact: true })
    await page.assertVisible(dialog.getByText('Here is what I found.', { exact: true }))
    const card = dialog.getByTestId('assistant-product-card')
    await page.assertVisible(card.getByRole('img', { name: 'Brass Lamp', exact: true }))
    await page.assertVisible(card.getByRole('link', { name: 'Brass Lamp', exact: true }))
    await page.assertVisible(card.getByText('₱1,250.00', { exact: true }))
    await page.assertVisible(card.getByText('In stock', { exact: true }))
    await page.assertNotExists(dialog.getByText('7', { exact: true }))
  })

  test("a product card opens that product's page", async ({ visit, route }) => {
    await ProductFactory.apply('published', 'withMedia')
      .merge({ title: 'Brass Lamp', handle: 'brass-lamp' })
      .with('variants', 1, (variant) => variant.merge({ priceAmount: 1250, inventoryQuantity: 7 }))
      .create()
    const { model } = await assistantOn()
    model.callTool('searchProducts', { query: 'lamp' }, 'Here is what I found.')

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    await sendMessage(page, 'Do you have lamps?')
    await page
      .getByTestId('assistant-product-card')
      .getByRole('link', { name: 'Brass Lamp', exact: true })
      .click()

    await page.assertPath(route('products.show', { handle: 'brass-lamp' }))
  })

  test('a draft product never shows up in search results', async ({ visit, route }) => {
    await ProductFactory.apply('published', 'withMedia')
      .merge({ title: 'Brass Lamp', handle: 'brass-lamp' })
      .with('variants', 1)
      .create()
    await ProductFactory.merge({ title: 'Brass Lantern' }).with('variants', 1).create()
    const { model } = await assistantOn()
    model.callTool('searchProducts', { query: 'brass' }, 'Here is what I found.')

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    await sendMessage(page, 'Anything in brass?')

    const dialog = page.getByRole('dialog', { name: 'Shopping assistant', exact: true })
    await page.assertVisible(
      dialog
        .getByTestId('assistant-product-card')
        .getByRole('link', { name: 'Brass Lamp', exact: true })
    )
    await page.assertNotExists(dialog.getByText('Brass Lantern', { exact: true }))
  })

  test('on a product page, the assistant is told which product the shopper is looking at', async ({
    visit,
    route,
    assert,
  }) => {
    await ProductFactory.apply('published')
      .merge({ title: 'Brass Lamp', handle: 'brass-lamp' })
      .with('variants', 1)
      .create()
    const { model } = await assistantOn()
    model.replyWith('Yes, it comes in blue.')

    const page = await visit(route('products.show', { handle: 'brass-lamp' }))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    await sendMessage(page, 'Does this come in blue?')

    const dialog = page.getByRole('dialog', { name: 'Shopping assistant', exact: true })
    await page.assertVisible(dialog.getByText('Yes, it comes in blue.', { exact: true }))
    assert.isTrue(model.instructionsInclude('Brass Lamp'))
  })

  test('a reply that declines an off-topic request offers the suggested questions again', async ({
    visit,
    route,
  }) => {
    const { model } = await assistantOn()
    model.callTool(
      'offerSuggestions',
      {},
      "I can only help with this store's products, orders, shipping and policies."
    )

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    await sendMessage(page, 'Write my essay')

    const dialog = page.getByRole('dialog', { name: 'Shopping assistant', exact: true })
    await page.assertVisible(
      dialog.getByText(
        "I can only help with this store's products, orders, shipping and policies.",
        {
          exact: true,
        }
      )
    )
    await page.assertNotVisible(
      dialog.getByText('Conversations may be reviewed by the store.', { exact: true })
    )
    const suggestions = dialog.getByRole('group', { name: 'Suggested questions', exact: true })
    await page.assertVisible(
      suggestions.getByRole('button', { name: 'How much is shipping?', exact: true })
    )
  })

  test('a product the assistant looks up is shown as a card', async ({ visit, route }) => {
    await ProductFactory.apply('published', 'withMedia')
      .merge({ title: 'Brass Lamp', handle: 'brass-lamp' })
      .with('variants', 1, (variant) => variant.merge({ priceAmount: 1250 }))
      .create()
    const { model } = await assistantOn()
    model.callTool('getProduct', { handle: 'brass-lamp' }, 'It is made of solid brass.')

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    await sendMessage(page, 'Tell me about the brass lamp')

    const card = page.getByTestId('assistant-product-card')
    await page.assertVisible(card.getByRole('link', { name: 'Brass Lamp', exact: true }))
    await page.assertVisible(card.getByText('₱1,250.00', { exact: true }))
  })
})
