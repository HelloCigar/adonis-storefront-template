import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { newUlid } from '#models/shared/with_ulid_primary_key'
import { storeStaff } from '#tests/helpers/accounts'
import { copilotOn, deskLamp, sendCopilotMessage } from '#tests/helpers/copilot'
import { paidOrder, tracking } from '#tests/helpers/delivery'

test.group('Copilot proposing changes', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('a proposal shows each record with its link, the changes as before → after, and Apply and Not now', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const staff = await storeStaff()
    const { lamp, variant } = await deskLamp()
    const { model } = await copilotOn()
    model.callTool(
      'proposeChange',
      {
        action: 'variant_update',
        summary: 'Lower the lamp price',
        items: [{ recordId: variant.id, changes: { price: 999 } }],
      },
      'Shall I apply it?'
    )
    await browserContext.loginAs(staff)

    const page = await visit(route('dashboard'))
    await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
    await sendCopilotMessage(page, 'Make the lamp ₱999')

    await page.assertPath(route('dashboard'))
    const card = page.getByTestId('copilot-proposal')
    const link = card.getByRole('link', { name: 'Desk Lamp', exact: true })
    await page.assertVisible(link)
    assert.equal(await link.getAttribute('href'), route('seller.products.show', { id: lamp.id }))
    await page.assertVisible(card.getByText('Price: ₱1,200.00 → ₱999.00', { exact: true }))
    await page.assertVisible(card.getByRole('button', { name: 'Apply', exact: true }))
    await page.assertVisible(card.getByRole('button', { name: 'Not now', exact: true }))
  })

  test('a shipping proposal says the customer will be emailed', async ({
    visit,
    route,
    browserContext,
  }) => {
    const staff = await storeStaff()
    const { order } = await paidOrder()
    const { model } = await copilotOn()
    model.callTool(
      'proposeChange',
      {
        action: 'order_ship',
        summary: 'Ship the order',
        items: [{ recordId: order.id, changes: tracking }],
      },
      'Shall I ship it?'
    )
    await browserContext.loginAs(staff)

    const page = await visit(route('dashboard'))
    await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
    await sendCopilotMessage(page, `Ship order ${order.number}`)

    await page.assertPath(route('dashboard'))
    await page.assertVisible(
      page
        .getByTestId('copilot-proposal')
        .getByText('The customer will be emailed.', { exact: true })
    )
  })

  test('no proposal is made when {reason}')
    .with([
      { reason: 'it covers 26 records' },
      { reason: 'a price is below zero' },
      { reason: 'the action is a refund' },
    ] as const)
    .run(async ({ visit, route, browserContext, db, assert }, row) => {
      const staff = await storeStaff()
      const { variant } = await deskLamp()
      const { model } = await copilotOn()
      const input =
        row.reason === 'it covers 26 records'
          ? {
              action: 'variant_update',
              summary: 'Lower every price',
              items: Array.from({ length: 26 }, () => ({
                recordId: newUlid(),
                changes: { price: 10 },
              })),
            }
          : row.reason === 'a price is below zero'
            ? {
                action: 'variant_update',
                summary: 'Make it negative',
                items: [{ recordId: variant.id, changes: { price: -1 } }],
              }
            : {
                action: 'refund',
                summary: 'Refund the order',
                items: [{ recordId: variant.id, changes: { amount: 100 } }],
              }
      model.callTool('proposeChange', input, 'Done.')
      await browserContext.loginAs(staff)

      const page = await visit(route('dashboard'))
      await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
      await sendCopilotMessage(page, 'Do it')

      await page.assertPath(route('dashboard'))
      await page.assertNotExists(page.getByRole('button', { name: 'Apply', exact: true }))
      await db.assertCount('copilot_proposals', 0)
      const result = model.calls[1].prompt.find((message) => message.role === 'tool')
      assert.match(JSON.stringify(result), /error/i)
    })
})
