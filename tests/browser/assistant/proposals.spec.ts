import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import AssistantProposal from '#models/assistant/assistant_proposal'
import { ProductFactory } from '#database/factories/product_factory'
import { ProductVariantFactory } from '#database/factories/product_variant_factory'
import { DateTime } from 'luxon'
import {
  assistantOn,
  assistantSessionFor,
  awaitSettled,
  proposalConversation,
  sendMessage,
} from '#tests/helpers/assistant'

test.group('Shopping assistant proposals', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('a proposal shows what will be added, with Add and Not now', async ({
    visit,
    route,
    db,
  }) => {
    const product = await ProductFactory.apply('published', 'withMedia')
      .merge({ title: 'Brass Lamp' })
      .with('variants', 1, (variant) =>
        variant.merge({ title: 'Large', priceAmount: 1250, inventoryQuantity: 5 })
      )
      .create()
    const variant = product.variants[0]
    const { model } = await assistantOn()
    model.callTool('proposeAddToCart', { variantId: variant.id, quantity: 2 }, 'Shall I add it?')

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    await sendMessage(page, 'Add two large lamps')

    const proposal = page.getByTestId('assistant-proposal')
    await page.assertVisible(proposal.getByRole('img', { name: 'Brass Lamp', exact: true }))
    await page.assertVisible(proposal.getByText('Brass Lamp', { exact: true }))
    await page.assertVisible(proposal.getByText('Large', { exact: true }))
    await page.assertVisible(proposal.getByText('Qty 2', { exact: true }))
    await page.assertVisible(proposal.getByText('₱2,500.00', { exact: true }))
    await page.assertVisible(proposal.getByRole('button', { name: 'Add', exact: true }))
    await page.assertVisible(proposal.getByRole('button', { name: 'Not now', exact: true }))
    await db.assertHas('assistant_proposals', {
      product_variant_id: variant.id,
      quantity: 2,
      unit_price_amount: 1250,
    })
  })

  test('choosing Add puts the item in the cart', async ({ visit, route, db }) => {
    const product = await ProductFactory.apply('published', 'withMedia')
      .merge({ title: 'Brass Lamp' })
      .with('variants', 1, (variant) =>
        variant.merge({ title: 'Large', priceAmount: 1250, inventoryQuantity: 5 })
      )
      .create()
    const variant = product.variants[0]
    const { model } = await assistantOn()
    model.callTool('proposeAddToCart', { variantId: variant.id, quantity: 2 }, 'Shall I add it?')

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    await sendMessage(page, 'Add two large lamps')
    await page
      .getByTestId('assistant-proposal')
      .getByRole('button', { name: 'Add', exact: true })
      .click()

    const cartButton = page.getByRole('button', { name: 'Open cart', exact: true })
    await page.assertVisible(cartButton.locator('xpath=..').getByText('2', { exact: true }))
    await db.assertHas('cart_lines', { product_variant_id: variant.id, quantity: 2 }, 1)
  })

  test('the thread confirms an added item and offers checkout', async ({ visit, route }) => {
    const product = await ProductFactory.apply('published', 'withMedia')
      .merge({ title: 'Brass Lamp' })
      .with('variants', 1, (variant) =>
        variant.merge({ title: 'Large', priceAmount: 1250, inventoryQuantity: 5 })
      )
      .create()
    const { model } = await assistantOn()
    model.callTool(
      'proposeAddToCart',
      { variantId: product.variants[0].id, quantity: 2 },
      'Shall I add it?'
    )

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    await sendMessage(page, 'Add two large lamps')
    const proposal = page.getByTestId('assistant-proposal')
    await proposal.getByRole('button', { name: 'Add', exact: true }).click()

    const dialog = page.getByRole('dialog', { name: 'Shopping assistant', exact: true })
    await page.assertVisible(proposal.getByText('Added to cart', { exact: true }))
    await page.assertVisible(
      dialog.getByText('Added Brass Lamp (Large) × 2 to your cart. Your cart now has 2 items.', {
        exact: true,
      })
    )
    await page.assertVisible(dialog.getByRole('link', { name: 'Checkout', exact: true }))
  })

  test('double-clicking Add adds the item only once', async ({ visit, route, db }) => {
    const product = await ProductFactory.apply('published', 'withMedia')
      .merge({ title: 'Brass Lamp' })
      .with('variants', 1, (variant) =>
        variant.merge({ title: 'Large', priceAmount: 1250, inventoryQuantity: 5 })
      )
      .create()
    const variant = product.variants[0]
    const { model } = await assistantOn()
    model.callTool('proposeAddToCart', { variantId: variant.id, quantity: 2 }, 'Shall I add it?')

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    await sendMessage(page, 'Add two large lamps')
    const proposal = page.getByTestId('assistant-proposal')
    await proposal.getByRole('button', { name: 'Add', exact: true }).dblclick()

    await page.assertVisible(proposal.getByText('Added to cart', { exact: true }))
    await db.assertHas('cart_lines', { product_variant_id: variant.id, quantity: 2 }, 1)
    await db.assertMissing('cart_lines', { product_variant_id: variant.id, quantity: 4 })
  })

  test('choosing Not now leaves the cart alone', async ({ visit, route, db }) => {
    const product = await ProductFactory.apply('published', 'withMedia')
      .merge({ title: 'Brass Lamp' })
      .with('variants', 1, (variant) =>
        variant.merge({ title: 'Large', priceAmount: 1250, inventoryQuantity: 5 })
      )
      .create()
    const { model } = await assistantOn()
    model.callTool(
      'proposeAddToCart',
      { variantId: product.variants[0].id, quantity: 2 },
      'Shall I add it?'
    )

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    await sendMessage(page, 'Add two large lamps')
    const proposal = page.getByTestId('assistant-proposal')
    await proposal.getByRole('button', { name: 'Not now', exact: true }).click()

    await page.assertVisible(proposal.getByText('Not added', { exact: true }))
    await db.assertEmpty('cart_lines')
  })

  test("Add is refused with the storefront's message when {reason}")
    .with([
      {
        reason: 'sold out',
        change: { availableForSale: false, inventoryQuantity: 0 },
        message: 'This variant is unavailable.',
      },
      {
        reason: 'quantity',
        change: { inventoryQuantity: 1 },
        message: 'The requested quantity is not available.',
      },
    ] as const)
    .run(async ({ visit, route, db }, row) => {
      const product = await ProductFactory.apply('published', 'withMedia')
        .merge({ title: 'Brass Lamp' })
        .with('variants', 1, (variant) =>
          variant.merge({ title: 'Large', priceAmount: 1250, inventoryQuantity: 5 })
        )
        .create()
      const variant = product.variants[0]
      const { model } = await assistantOn()
      model
        .callTool('proposeAddToCart', { variantId: variant.id, quantity: 2 }, 'Shall I add it?')
        .replyWith('Here are some in-stock options.')

      const page = await visit(route('home'))
      await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
      await sendMessage(page, 'Add two large lamps')
      const proposal = page.getByTestId('assistant-proposal')
      await proposal.getByRole('button', { name: 'Add', exact: true }).waitFor()
      await variant.merge(row.change).save()
      await proposal.getByRole('button', { name: 'Add', exact: true }).click()

      const dialog = page.getByRole('dialog', { name: 'Shopping assistant', exact: true })
      await page.assertVisible(dialog.getByText(row.message, { exact: true }))
      await db.assertEmpty('cart_lines')
    })

  test('after a failed Add, the assistant suggests something in stock', async ({
    visit,
    route,
    assert,
  }) => {
    const product = await ProductFactory.apply('published', 'withMedia')
      .merge({ title: 'Brass Lamp' })
      .with('variants', 1, (variant) =>
        variant.merge({ title: 'Large', priceAmount: 1250, inventoryQuantity: 5 })
      )
      .create()
    const variant = product.variants[0]
    const { model } = await assistantOn()
    model
      .callTool('proposeAddToCart', { variantId: variant.id, quantity: 2 }, 'Shall I add it?')
      .replyWith('The Brass Lamp in Small is in stock.')

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    await sendMessage(page, 'Add two large lamps')
    const proposal = page.getByTestId('assistant-proposal')
    await proposal.getByRole('button', { name: 'Add', exact: true }).waitFor()
    await variant.merge({ availableForSale: false, inventoryQuantity: 0 }).save()
    await proposal.getByRole('button', { name: 'Add', exact: true }).click()

    const dialog = page.getByRole('dialog', { name: 'Shopping assistant', exact: true })
    await page.assertVisible(
      dialog.getByText('The Brass Lamp in Small is in stock.', { exact: true })
    )
    await awaitSettled(page)
    assert.isTrue(model.lastCallIncludes('This variant is unavailable.'))
  })

  test("a failed Add doesn't leave the proposal marked as added", async ({ visit, route, db }) => {
    const product = await ProductFactory.apply('published', 'withMedia')
      .merge({ title: 'Brass Lamp' })
      .with('variants', 1, (variant) =>
        variant.merge({ title: 'Large', priceAmount: 1250, inventoryQuantity: 5 })
      )
      .create()
    const variant = product.variants[0]
    const { model } = await assistantOn()
    model
      .callTool('proposeAddToCart', { variantId: variant.id, quantity: 2 }, 'Shall I add it?')
      .replyWith('Here are some in-stock options.')

    const home = await visit(route('home'))
    await home.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    await sendMessage(home, 'Add two large lamps')
    const offered = home.getByTestId('assistant-proposal')
    await offered.getByRole('button', { name: 'Add', exact: true }).waitFor()
    await variant.merge({ availableForSale: false, inventoryQuantity: 0 }).save()
    await offered.getByRole('button', { name: 'Add', exact: true }).click()
    await home.getByText('This variant is unavailable.', { exact: true }).waitFor()
    await awaitSettled(home)

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()

    const proposal = page.getByTestId('assistant-proposal')
    await page.assertVisible(proposal.getByRole('button', { name: 'Add', exact: true }))
    await page.assertVisible(proposal.getByRole('button', { name: 'Not now', exact: true }))
    await page.assertNotExists(proposal.getByText('Added to cart', { exact: true }))
    const { id } = await AssistantProposal.firstOrFail()
    await db.assertHas('assistant_proposals', { id, added_at: null })
  })

  test("a stale proposal can't be added")
    .with([{ reason: 'older than 30 minutes' }, { reason: 'the price changed' }] as const)
    .run(async ({ visit, route, browserContext }, row) => {
      const product = await ProductFactory.apply('published', 'withMedia')
        .merge({ title: 'Brass Lamp' })
        .with('variants', 1, (variant) =>
          variant.merge({ title: 'Large', priceAmount: 1250, inventoryQuantity: 5 })
        )
        .create()
      const variant = product.variants[0]
      const { conversation } = await proposalConversation(
        row.reason === 'older than 30 minutes'
          ? { variant, quantity: 1, expiresAt: DateTime.now().minus({ minutes: 1 }) }
          : { variant, quantity: 1, unitPriceAmount: 1000 }
      )
      await assistantOn()
      await browserContext.setSession(assistantSessionFor(conversation))

      const page = await visit(route('home'))
      await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()

      const proposal = page.getByTestId('assistant-proposal')
      await page.assertVisible(
        proposal.getByText('No longer available — ask again', { exact: true })
      )
      await page.assertNotExists(proposal.getByRole('button', { name: 'Add', exact: true }))
    })

  test('Add on a proposal that went stale while on screen is refused', async ({
    visit,
    route,
    browserContext,
    db,
  }) => {
    const product = await ProductFactory.apply('published', 'withMedia')
      .merge({ title: 'Brass Lamp' })
      .with('variants', 1, (variant) =>
        variant.merge({ title: 'Large', priceAmount: 1250, inventoryQuantity: 5 })
      )
      .create()
    const variant = product.variants[0]
    const { conversation } = await proposalConversation({ variant, quantity: 1 })
    const { model } = await assistantOn()
    model.replyWith('Here are some in-stock options.')
    await browserContext.setSession(assistantSessionFor(conversation))

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    const add = page
      .getByTestId('assistant-proposal')
      .getByRole('button', { name: 'Add', exact: true })
    await add.waitFor()
    await variant.merge({ priceAmount: 1500 }).save()
    await add.click()

    await page.assertVisible(
      page.getByText('No longer available — ask again', { exact: true }).first()
    )
    await awaitSettled(page)
    await db.assertEmpty('cart_lines')
  })

  test("the assistant can't propose a variant that can't be sold", async ({ visit, route, db }) => {
    const variant = await ProductVariantFactory.apply('soldOut').create()
    const { model } = await assistantOn()
    model.callTool(
      'proposeAddToCart',
      { variantId: variant.id, quantity: 1 },
      'That one is sold out.'
    )

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    await sendMessage(page, 'Add the lamp')

    const dialog = page.getByRole('dialog', { name: 'Shopping assistant', exact: true })
    await page.assertVisible(dialog.getByText('That one is sold out.', { exact: true }))
    await page.assertNotExists(dialog.getByTestId('assistant-proposal'))
    await db.assertEmpty('assistant_proposals')
  })
})
