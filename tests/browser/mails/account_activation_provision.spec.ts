import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import mail from '@adonisjs/mail/services/main'
import AccountActivationProvision from '#mails/auth/account_activation_provision'
import { savedStoreSettings } from '#tests/helpers/store_setup'

test.group('Sign-up emails carry the saved store details', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('the sign-up confirmation email is sent under the saved store name', async ({
    visit,
    route,
  }) => {
    using fake = mail.fake()
    await savedStoreSettings({ storeName: 'Lantern Goods', contactEmail: 'hello@lantern.test' })

    const page = await visit(route('new_account.create'))
    await page.getByLabel('Full name', { exact: true }).fill('Jane Shopper')
    await page.getByLabel('Email', { exact: true }).fill('jane@example.com')
    await page.getByLabel('Password', { exact: true }).fill('Corr3ct-Horse-Battery-Staple!')
    await page.getByLabel('Confirm password', { exact: true }).fill('Corr3ct-Horse-Battery-Staple!')
    await page.getByRole('button', { name: 'Create account', exact: true }).click()

    await page.assertPath(route('email_verifications.create'))
    fake.mails.assertQueued(AccountActivationProvision, ({ message }) =>
      message.hasFrom('store@example.com', 'Lantern Goods')
    )
  })

  test('the sign-up confirmation email names the saved store in its HTML and text', async ({
    visit,
    route,
  }) => {
    using fake = mail.fake()
    await savedStoreSettings({ storeName: 'Lantern Goods', contactEmail: 'hello@lantern.test' })

    const page = await visit(route('new_account.create'))
    await page.getByLabel('Full name', { exact: true }).fill('Jane Shopper')
    await page.getByLabel('Email', { exact: true }).fill('jane@example.com')
    await page.getByLabel('Password', { exact: true }).fill('Corr3ct-Horse-Battery-Staple!')
    await page.getByLabel('Confirm password', { exact: true }).fill('Corr3ct-Horse-Battery-Staple!')
    await page.getByRole('button', { name: 'Create account', exact: true }).click()

    await page.assertPath(route('email_verifications.create'))
    fake.mails.assertQueued(AccountActivationProvision, ({ message }) => {
      message.assertHtmlIncludes('Welcome to Lantern Goods - just one more step!')
      message.assertTextIncludes('Welcome to Lantern Goods - just one more step!')
      message.assertTextIncludes('/email-verifications/')
      return true
    })
  })

  test('replies to the sign-up confirmation go to the contact email', async ({ visit, route }) => {
    using fake = mail.fake()
    await savedStoreSettings({ storeName: 'Lantern Goods', contactEmail: 'hello@lantern.test' })

    const page = await visit(route('new_account.create'))
    await page.getByLabel('Full name', { exact: true }).fill('Jane Shopper')
    await page.getByLabel('Email', { exact: true }).fill('jane@example.com')
    await page.getByLabel('Password', { exact: true }).fill('Corr3ct-Horse-Battery-Staple!')
    await page.getByLabel('Confirm password', { exact: true }).fill('Corr3ct-Horse-Battery-Staple!')
    await page.getByRole('button', { name: 'Create account', exact: true }).click()

    await page.assertPath(route('email_verifications.create'))
    fake.mails.assertQueued(AccountActivationProvision, ({ message }) =>
      message.hasReplyTo('hello@lantern.test')
    )
  })
})
