import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import database from '@adonisjs/lucid/services/db'
import Product from '#models/catalog/product'
import ProductVariant from '#models/catalog/product_variant'
import CopilotProposal from '#models/assistant/copilot_proposal'
import { storeStaff } from '#tests/helpers/accounts'
import Payment from '#models/payments/payment'
import {
  copilotOn,
  copilotProposalConversation,
  deskLamp,
  sendCopilotMessage,
} from '#tests/helpers/copilot'
import { paidOrder, tracking } from '#tests/helpers/delivery'
import { product as stockProduct, variant as stockVariant } from '#tests/helpers/stock_adjustments'

test.group('Copilot applying proposals', (group) => {
  // truncate() empties the tables when its cleanup runs after each test. A trigger refuses to
  // delete variants that still hold reservations, so release them first.
  group.each.setup(async () => {
    const truncate = await testUtils.db().truncate()
    return async () => {
      await database.from('product_variants').update({ inventory_reserved_quantity: 0 })
      await truncate()
    }
  })

  test("Apply changes the product's price and the proposal shows Applied", async ({
    visit,
    route,
    browserContext,
    db,
    assert,
  }) => {
    const staff = await storeStaff()
    const { variant } = await deskLamp()
    await copilotOn()
    const { proposal } = await copilotProposalConversation({
      owner: staff,
      action: 'variant_update',
      items: [
        {
          recordId: variant.id,
          label: 'Desk Lamp',
          before: { price: 1200 },
          after: { price: 999 },
        },
      ],
    })
    await browserContext.loginAs(staff)

    const page = await visit(route('dashboard'))
    await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
    const card = page.getByTestId('copilot-proposal')
    await card.getByRole('button', { name: 'Apply', exact: true }).click()

    await page.assertVisible(card.getByText('Applied', { exact: true }))
    await page.assertVisible(card.getByRole('link', { name: 'Desk Lamp', exact: true }))
    await page.assertPath(route('dashboard'))
    await db.assertHas('product_variants', { id: variant.id, price_amount: 999 })
    await proposal.refresh()
    assert.isNotNull(proposal.appliedAt)
  })

  test('the page underneath shows the new price after Apply', async ({
    visit,
    route,
    browserContext,
  }) => {
    const staff = await storeStaff()
    const { lamp, variant } = await deskLamp()
    await copilotOn()
    await copilotProposalConversation({
      owner: staff,
      action: 'variant_update',
      items: [
        {
          recordId: variant.id,
          label: 'Desk Lamp',
          before: { price: 1200 },
          after: { price: 999 },
        },
      ],
    })
    await browserContext.loginAs(staff)

    const url = route('seller.products.show', { id: lamp.id })
    const page = await visit(url)
    await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
    const card = page.getByTestId('copilot-proposal')
    await card.getByRole('button', { name: 'Apply', exact: true }).click()
    await page.assertVisible(card.getByText('Applied', { exact: true }))

    await page.assertPath(url)
    await page.assertVisible(page.getByRole('cell', { name: '₱999.00', exact: true }))
  })

  test('Apply on a multi-record proposal changes every record', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const staff = await storeStaff()
    const sizes = ['S', 'M', 'L']
    const shirt = await Product.create({
      title: 'Shirt',
      handle: 'shirt',
      status: 'draft',
      optionDefinitions: [{ name: 'Size', values: sizes }],
    })
    const variants = await Promise.all(
      sizes.map((size, position) =>
        shirt.related('variants').create({
          title: size,
          priceAmount: 100 * (position + 1),
          currencyCode: 'PHP',
          inventoryQuantity: 10,
          availableForSale: true,
          options: { Size: size },
          position,
        })
      )
    )
    await copilotOn()
    await copilotProposalConversation({
      owner: staff,
      action: 'variant_update',
      summary: 'Lower every shirt price by ₱10',
      items: variants.map((variant, position) => ({
        recordId: variant.id,
        label: `Shirt — ${variant.title}`,
        before: { price: 100 * (position + 1) },
        after: { price: 100 * (position + 1) - 10 },
      })),
    })
    await browserContext.loginAs(staff)

    const page = await visit(route('dashboard'))
    await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
    const card = page.getByTestId('copilot-proposal')
    await card.getByRole('button', { name: 'Apply', exact: true }).click()

    await page.assertVisible(card.getByText('Applied', { exact: true }))
    await page.assertPath(route('dashboard'))
    const prices = await ProductVariant.query().where('product_id', shirt.id).orderBy('position')
    assert.deepEqual(
      prices.map((variant) => Number(variant.priceAmount)),
      [90, 190, 290]
    )
  })

  test('Apply is refused when {reason}')
    .with([
      { reason: 'a teammate changed the price', stale: true },
      { reason: 'the proposal is 31 minutes old', stale: false },
    ])
    .run(async ({ visit, route, browserContext, assert }, row) => {
      const staff = await storeStaff()
      const { variant } = await deskLamp()
      await copilotOn()
      const { proposal } = await copilotProposalConversation({
        owner: staff,
        action: 'variant_update',
        items: [
          {
            recordId: variant.id,
            label: 'Desk Lamp',
            before: { price: 1200 },
            after: { price: 999 },
          },
        ],
        expiresAt: row.stale ? undefined : DateTime.now().minus({ minutes: 1 }),
      })
      if (row.stale) {
        variant.priceAmount = 1100
        await variant.save()
      }
      const priceBefore = Number(variant.priceAmount)
      await browserContext.loginAs(staff)

      const page = await visit(route('dashboard'))
      await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
      const card = page.getByTestId('copilot-proposal')
      // An expired proposal already offers no Apply; a stale one is refused when applied.
      if (row.stale) await card.getByRole('button', { name: 'Apply', exact: true }).click()

      await page.assertVisible(
        card.getByText('This changed since it was proposed — ask again', { exact: true })
      )
      await page.assertNotExists(card.getByRole('button', { name: 'Apply', exact: true }))
      await page.assertPath(route('dashboard'))
      await variant.refresh()
      assert.equal(Number(variant.priceAmount), priceBefore)
      if (row.stale) {
        const refused = await CopilotProposal.findOrFail(proposal.id)
        assert.isNotNull(refused.refusedAt)
      }
    })

  test('a later record that breaks a dashboard rule leaves every record unchanged', async ({
    visit,
    route,
    browserContext,
    db,
    assert,
  }) => {
    const staff = await storeStaff()
    const first = await stockVariant(await stockProduct('blue-lamp'), { inventoryQuantity: 10 })
    // Five of the second variant's ten are held by a pending order.
    const second = await stockVariant(await stockProduct('red-lamp'), {
      inventoryQuantity: 10,
      inventoryReservedQuantity: 5,
    })
    await copilotOn()
    await copilotProposalConversation({
      owner: staff,
      action: 'stock_adjust',
      summary: 'Recount stock',
      items: [
        { recordId: first.id, label: 'Blue lamp', before: { stock: 10 }, after: { stock: 12 } },
        { recordId: second.id, label: 'Red lamp', before: { stock: 10 }, after: { stock: 3 } },
      ],
    })
    await browserContext.loginAs(staff)

    const page = await visit(route('dashboard'))
    await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
    const card = page.getByTestId('copilot-proposal')
    await card.getByRole('button', { name: 'Apply', exact: true }).click()

    await page.assertVisible(
      card.getByText('5 on hand are held by pending orders. Keep at least 5.', { exact: true })
    )
    await page.assertPath(route('dashboard'))
    await first.refresh()
    await second.refresh()
    assert.equal(first.inventoryQuantity, 10)
    assert.equal(second.inventoryQuantity, 10)
    await db.assertCount('stock_adjustments', 0)
  })

  test('a rolled-back apply queues no customer email', async ({
    visit,
    route,
    browserContext,
    db,
  }) => {
    const staff = await storeStaff()
    const { order, staff: packer, fulfillment } = await paidOrder()
    await fulfillment.pack(order.id, packer)
    // A second order whose payment was never captured: the dashboard won't ship it.
    const { order: unpaid } = await paidOrder()
    await Payment.query().where('order_id', unpaid.id).delete()
    await copilotOn()
    await copilotProposalConversation({
      owner: staff,
      action: 'order_ship',
      summary: 'Ship both orders',
      items: [order, unpaid].map((row) => ({
        recordId: row.id,
        label: `Order ${row.number}`,
        before: { shipmentState: row === order ? 'packing' : 'pending' },
        after: { shipmentState: 'shipped', ...tracking },
      })),
    })
    await browserContext.loginAs(staff)

    const page = await visit(route('dashboard'))
    await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
    const card = page.getByTestId('copilot-proposal')
    await card.getByRole('button', { name: 'Apply', exact: true }).click()
    await page.assertNotExists(card.getByRole('button', { name: 'Apply', exact: true }))

    await page.assertPath(route('dashboard'))
    await db.assertMissing('order_notifications', { order_id: order.id, kind: 'shipment' })
    await db.assertMissing('shipments', { order_id: order.id, state: 'shipped' })
  })

  test("applying a shipment queues the customer's shipment email", async ({
    visit,
    route,
    browserContext,
    db,
  }) => {
    const staff = await storeStaff()
    const { order, staff: packer, fulfillment } = await paidOrder()
    await fulfillment.pack(order.id, packer)
    await copilotOn()
    await copilotProposalConversation({
      owner: staff,
      action: 'order_ship',
      summary: 'Ship the order',
      emailsCustomer: true,
      items: [
        {
          recordId: order.id,
          label: `Order ${order.number}`,
          before: { shipmentState: 'packing' },
          after: { shipmentState: 'shipped', ...tracking },
        },
      ],
    })
    await browserContext.loginAs(staff)

    const page = await visit(route('dashboard'))
    await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
    const card = page.getByTestId('copilot-proposal')
    await card.getByRole('button', { name: 'Apply', exact: true }).click()

    await page.assertVisible(card.getByText('Applied', { exact: true }))
    await page.assertPath(route('dashboard'))
    await db.assertHas('shipments', {
      order_id: order.id,
      state: 'shipped',
      carrier: tracking.carrier,
      tracking_number: tracking.trackingNumber,
    })
    await db.assertHas(
      'order_notifications',
      { order_id: order.id, kind: 'shipment', state: 'pending' },
      1
    )
  })

  test('double-clicking Apply applies once', async ({
    visit,
    route,
    browserContext,
    db,
    assert,
  }) => {
    const staff = await storeStaff()
    const { variant } = await deskLamp()
    await copilotOn()
    await copilotProposalConversation({
      owner: staff,
      action: 'stock_adjust',
      summary: 'Add 5 lamps',
      items: [
        { recordId: variant.id, label: 'Desk Lamp', before: { stock: 10 }, after: { stock: 15 } },
      ],
    })
    await browserContext.loginAs(staff)

    const page = await visit(route('dashboard'))
    await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
    const card = page.getByTestId('copilot-proposal')
    await card.getByRole('button', { name: 'Apply', exact: true }).dblclick()

    await page.assertVisible(card.getByText('Applied', { exact: true }))
    await page.assertPath(route('dashboard'))
    await variant.refresh()
    assert.equal(variant.inventoryQuantity, 15)
    await db.assertCount('stock_adjustments', 1)
  })

  test('a person who lost staff access gets nothing changed', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const staff = await storeStaff()
    const { variant } = await deskLamp()
    await copilotOn()
    const { proposal } = await copilotProposalConversation({
      owner: staff,
      action: 'variant_update',
      items: [
        {
          recordId: variant.id,
          label: 'Desk Lamp',
          before: { price: 1200 },
          after: { price: 999 },
        },
      ],
    })
    await browserContext.loginAs(staff)

    const page = await visit(route('dashboard'))
    await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
    const apply = page.getByTestId('copilot-proposal').getByRole('button', {
      name: 'Apply',
      exact: true,
    })
    await apply.waitFor()
    staff.role = 'customer'
    await staff.save()
    await Promise.all([
      page.waitForResponse((response) => response.url().includes('/copilot/proposals/')),
      apply.click(),
    ])

    await variant.refresh()
    assert.equal(Number(variant.priceAmount), 1200)
    await proposal.refresh()
    assert.isNull(proposal.appliedAt)
  })

  test('Not now leaves the record alone', async ({ visit, route, browserContext, assert }) => {
    const staff = await storeStaff()
    const { variant } = await deskLamp()
    await copilotOn()
    const { proposal } = await copilotProposalConversation({
      owner: staff,
      action: 'variant_update',
      items: [
        {
          recordId: variant.id,
          label: 'Desk Lamp',
          before: { price: 1200 },
          after: { price: 999 },
        },
      ],
    })
    await browserContext.loginAs(staff)

    const page = await visit(route('dashboard'))
    await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
    const card = page.getByTestId('copilot-proposal')
    await card.getByRole('button', { name: 'Not now', exact: true }).click()

    await page.assertVisible(card.getByText('Not applied', { exact: true }))
    await page.assertNotExists(card.getByRole('button', { name: 'Apply', exact: true }))
    await page.assertPath(route('dashboard'))
    await variant.refresh()
    assert.equal(Number(variant.priceAmount), 1200)
    await proposal.refresh()
    assert.isNotNull(proposal.dismissedAt)
  })

  test('a proposal can still be applied while the AI service is failing', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const staff = await storeStaff()
    const { variant } = await deskLamp()
    const { model } = await copilotOn()
    model.failNext()
    await copilotProposalConversation({
      owner: staff,
      action: 'variant_update',
      items: [
        {
          recordId: variant.id,
          label: 'Desk Lamp',
          before: { price: 1200 },
          after: { price: 999 },
        },
      ],
    })
    await browserContext.loginAs(staff)

    const page = await visit(route('dashboard'))
    await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
    const card = page.getByTestId('copilot-proposal')
    await card.waitFor()
    await sendCopilotMessage(page, 'hi')
    await page.assertVisible(
      page.getByText("The copilot isn't available right now. Please try again in a moment.", {
        exact: true,
      })
    )
    await card.getByRole('button', { name: 'Apply', exact: true }).click()

    await page.assertVisible(card.getByText('Applied', { exact: true }))
    await page.assertPath(route('dashboard'))
    await variant.refresh()
    assert.equal(Number(variant.priceAmount), 999)
  })
})
