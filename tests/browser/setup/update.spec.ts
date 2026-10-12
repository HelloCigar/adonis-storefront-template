import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import StoreSetting from '#models/settings/store_setting'
import { deployedStorePolicy, savedStoreSettings } from '#tests/helpers/store_setup'

test.group('Store setup saving', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('saving the identity step moves on to shipping', async ({
    visit,
    route,
    browserContext,
    db,
    assert,
  }) => {
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    await browserContext.loginAs(admin)

    const page = await visit(route('setup.show', { step: 'identity' }))
    await page.getByLabel('Store name', { exact: true }).fill('Lantern Goods')
    await page.getByLabel('Contact email', { exact: true }).fill('hello@lantern.test')
    await page.getByRole('button', { name: 'Continue', exact: true }).click()

    await page.getByLabel('Shipping fee', { exact: true }).waitFor()
    await page.assertPath(route('setup.show', { step: 'shipping' }))
    await db.assertHas('store_settings', {
      id: 1,
      store_name: 'Lantern Goods',
      contact_email: 'hello@lantern.test',
    })
    const settings = await StoreSetting.current()
    assert.isOk(settings.identitySavedAt)
  })

  test("the identity step rejects invalid input with the brief's message: {message}")
    .with([
      { name: '', email: 'hello@lantern.test', message: 'Enter your store name.' },
      {
        name: 'L',
        email: 'hello@lantern.test',
        message: 'Store name must be at least 2 characters.',
      },
      {
        name: 'L'.repeat(61),
        email: 'hello@lantern.test',
        message: 'Store name must be 60 characters or fewer.',
      },
      { name: 'Lantern Goods', email: '', message: 'Enter a contact email.' },
      { name: 'Lantern Goods', email: 'not-an-email', message: 'Enter a valid email address.' },
    ])
    .run(async ({ visit, route, browserContext, assert }, row) => {
      const admin = await UserFactory.merge({ role: 'admin' }).create()
      await browserContext.loginAs(admin)

      const page = await visit(route('setup.show', { step: 'identity' }))
      await page.getByLabel('Store name', { exact: true }).fill(row.name)
      await page.getByLabel('Contact email', { exact: true }).fill(row.email)
      await page.getByRole('button', { name: 'Continue', exact: true }).click()

      await page.assertVisible(page.getByText(row.message, { exact: true }))
      await page.assertPath(route('setup.show', { step: 'identity' }))
      const settings = await StoreSetting.current()
      assert.isNotOk(settings.identitySavedAt)
    })

  test('saving the shipping step moves on to policies', async ({
    visit,
    route,
    browserContext,
    db,
    assert,
  }) => {
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    await savedStoreSettings({ savedSteps: ['identity'] })
    await browserContext.loginAs(admin)

    const page = await visit(route('setup.show', { step: 'shipping' }))
    await page.getByLabel('Shipping fee', { exact: true }).fill('150')
    await page.getByRole('button', { name: 'Continue', exact: true }).click()

    await page.assertPath(route('setup.show', { step: 'policies' }))
    await db.assertHas('store_settings', { id: 1, shipping_minor: 15000 })
    const settings = await StoreSetting.current()
    assert.isOk(settings.shippingSavedAt)
  })

  test("the shipping step rejects invalid fees with the brief's message: {message}")
    .with([
      { fee: '', message: 'Enter a shipping fee.' },
      { fee: '-1', message: "Shipping fee can't be negative." },
      { fee: '100000.01', message: "Shipping fee can't be more than ₱100,000." },
      { fee: '10.555', message: 'Shipping fee can have at most 2 decimal places.' },
    ])
    .run(async ({ visit, route, browserContext, assert }, row) => {
      const admin = await UserFactory.merge({ role: 'admin' }).create()
      await savedStoreSettings({ savedSteps: ['identity'] })
      await browserContext.loginAs(admin)

      const page = await visit(route('setup.show', { step: 'shipping' }))
      await page.getByLabel('Shipping fee', { exact: true }).fill(row.fee)
      await page.getByRole('button', { name: 'Continue', exact: true }).click()

      await page.assertVisible(page.getByText(row.message, { exact: true }))
      await page.assertPath(route('setup.show', { step: 'shipping' }))
      const settings = await StoreSetting.current()
      assert.isNotOk(settings.shippingSavedAt)
    })

  test('finishing with every policy blank completes setup', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    await savedStoreSettings({ savedSteps: ['identity', 'shipping'] })
    await browserContext.loginAs(admin)

    const page = await visit(route('setup.show', { step: 'policies' }))
    await page.getByRole('button', { name: 'Finish setup', exact: true }).click()

    // The toast and its aria-live mirror both carry the text.
    const flash = page.getByText('Your store is set up.', { exact: true }).first()
    await flash.waitFor()
    await page.assertPath(route('dashboard'))
    await page.assertVisible(flash)
    const settings = await StoreSetting.current()
    assert.isOk(settings.setupCompletedAt)
  })

  test('a refund policy written during setup is published on the storefront', async ({
    visit,
    route,
    browserContext,
  }) => {
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    await savedStoreSettings({ savedSteps: ['identity', 'shipping'] })
    await browserContext.loginAs(admin)

    const page = await visit(route('setup.show', { step: 'policies' }))
    await page
      .getByRole('textbox', { name: 'Refund policy', exact: true })
      .fill('Returns accepted within 30 days.')
    await page.getByRole('button', { name: 'Finish setup', exact: true }).click()
    await page.getByText('Your store is set up.', { exact: true }).first().waitFor()

    const policies = await visit(route('policies.index'))
    await policies.assertVisible(
      policies.getByRole('link', { name: 'Refund policy', exact: true }).first()
    )
  })

  test('a policy left blank during setup is not published', async ({
    visit,
    route,
    browserContext,
  }) => {
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    await savedStoreSettings({ savedSteps: ['identity', 'shipping'] })
    await browserContext.loginAs(admin)

    const page = await visit(route('setup.show', { step: 'policies' }))
    await page
      .getByRole('textbox', { name: 'Refund policy', exact: true })
      .fill('Returns accepted within 30 days.')
    await page.getByRole('button', { name: 'Finish setup', exact: true }).click()
    await page.getByText('Your store is set up.', { exact: true }).first().waitFor()

    const policies = await visit(route('policies.index'))
    await policies.assertNotExists(
      policies.getByRole('link', { name: 'Privacy policy', exact: true })
    )
  })

  test("the admin's version replaces the deployed text", async ({
    visit,
    route,
    browserContext,
  }) => {
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    await savedStoreSettings({ savedSteps: ['identity', 'shipping'] })
    deployedStorePolicy('refund-policy', 'Refund policy', '<p>Returns accepted within 7 days.</p>')
    await browserContext.loginAs(admin)

    const page = await visit(route('setup.show', { step: 'policies' }))
    await page
      .getByRole('textbox', { name: 'Refund policy', exact: true })
      .fill('Returns accepted within 30 days.')
    await page.getByRole('button', { name: 'Finish setup', exact: true }).click()
    await page.getByText('Your store is set up.', { exact: true }).first().waitFor()

    const policy = await visit(route('policies.show', { handle: 'refund-policy' }))
    await policy.assertVisible(
      policy.getByText('Returns accepted within 30 days.', { exact: true })
    )
    await policy.assertNotExists(
      policy.getByText('Returns accepted within 7 days.', { exact: true })
    )
  })
})
