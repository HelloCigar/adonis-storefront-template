import { test } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import { addPasskey, addVirtualAuthenticator } from '#tests/helpers/passkeys'
import PasskeyChangedNotification from '#mails/auth/passkey_changed_notification'

test.group('Passkey Registration', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('can add a passkey', async ({ visit, route, browserContext }) => {
    const user = await UserFactory.apply('verified').create()
    await browserContext.loginAs(user)

    using mailFake = mail.fake()

    const page = await visit(route('settings.security'))
    await addVirtualAuthenticator(page)
    await addPasskey(page)

    await page.assertVisible(page.getByText('Passkey added', { exact: true }))
    const list = page.getByRole('list', { name: 'Passkeys', exact: true })
    await page.assertVisible(list.getByText('Passkey', { exact: true }))
    mailFake.mails.assertQueued(PasskeyChangedNotification, (queued) => {
      queued.message.assertHtmlIncludes('A passkey was added')
      queued.message.assertTextIncludes('A passkey was added')
      queued.message.assertTextIncludes('your account may be compromised')
      return queued.event === 'added' && queued.passkeyName === 'Passkey'
    })
  })

  test('refuses a second passkey from the same authenticator', async ({
    visit,
    route,
    browserContext,
  }) => {
    const user = await UserFactory.apply('verified').create()
    await browserContext.loginAs(user)

    using mailFake = mail.fake()

    const page = await visit(route('settings.security'))
    await addVirtualAuthenticator(page)
    await addPasskey(page)

    await page.getByRole('button', { name: 'Add a passkey', exact: true }).click()
    await page.assertVisible(
      page.getByText('This device already has a passkey for your account', { exact: true })
    )

    /**
     * Only the first passkey was added
     */
    mailFake.mails.assertQueuedCount(PasskeyChangedNotification, 1)
  })
})
