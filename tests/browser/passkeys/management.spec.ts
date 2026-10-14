import { test } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'
import { createPasskey } from '#tests/helpers/passkeys'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import PasskeyChangedNotification from '#mails/auth/passkey_changed_notification'
import { urlFor } from '@adonisjs/core/services/url_builder'

test.group('Passkey Management', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('lists the passkeys of the user', async ({ visit, route, browserContext }) => {
    const user = await UserFactory.apply('verified').create()
    await createPasskey(user, 'Work laptop')
    await browserContext.loginAs(user)

    const page = await visit(route('account.security.show'))
    const list = page.getByRole('list', { name: 'Passkeys', exact: true })

    await page.assertVisible(list.getByText('Work laptop', { exact: true }))
    await page.assertVisible(list.getByText('Synced', { exact: true }))
    await page.assertVisible(list.getByText('Never used', { exact: false }))
  })

  test('can rename a passkey', async ({ visit, route, browserContext }) => {
    const user = await UserFactory.apply('verified').create()
    await createPasskey(user, 'Passkey')
    await browserContext.loginAs(user)

    using mailFake = mail.fake()

    const page = await visit(route('account.security.show'))
    await page.getByRole('button', { name: 'Rename', exact: true }).click()
    await page.getByLabel('Passkey name', { exact: true }).fill('Personal phone')
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    await page.assertVisible(page.getByText('Passkey renamed', { exact: true }))
    await page.assertVisible(
      page
        .getByRole('list', { name: 'Passkeys', exact: true })
        .getByText('Personal phone', { exact: true })
    )

    /**
     * Renaming is cosmetic, so the owner is not emailed
     */
    mailFake.mails.assertNoneQueued()
  })

  test('rejects an empty name', async ({ visit, route, browserContext }) => {
    const user = await UserFactory.apply('verified').create()
    await createPasskey(user, 'Passkey')
    await browserContext.loginAs(user)

    const page = await visit(route('account.security.show'))
    await page.getByRole('button', { name: 'Rename', exact: true }).click()
    await page.getByLabel('Passkey name', { exact: true }).fill('')
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    await page.assertVisible(page.getByText('The name field must be defined', { exact: true }))
  })

  test('can remove a passkey', async ({ visit, route, browserContext }) => {
    const user = await UserFactory.apply('verified').create()
    await createPasskey(user, 'Work laptop')
    await browserContext.loginAs(user)

    using mailFake = mail.fake()

    const page = await visit(route('account.security.show'))
    await page.getByRole('button', { name: 'Remove', exact: true }).click()

    await page.assertVisible(page.getByText('Passkey removed', { exact: true }))
    await page.assertVisible(
      page.getByText('You have not added any passkeys yet.', { exact: true })
    )
    mailFake.mails.assertQueued(PasskeyChangedNotification, (message) => {
      return message.event === 'removed' && message.passkeyName === 'Work laptop'
    })
  })

  test('cannot rename or remove the passkey of another user', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const [user, otherUser] = await UserFactory.apply('verified').createMany(2)
    const otherPasskey = await createPasskey(otherUser, 'Passkey')
    await browserContext.loginAs(user)

    const page = await visit(route('account.security.show'))

    /**
     * Requests share the browser's cookies, so the session and CSRF
     * token of the signed-in user are valid
     */
    const cookies = await browserContext.cookies()
    const xsrfToken = decodeURIComponent(cookies.find((c) => c.name === 'XSRF-TOKEN')!.value)
    const headers = { 'X-XSRF-TOKEN': xsrfToken }

    const url = urlFor('passkeys.update', { id: String(otherPasskey.identifier) })
    const rename = await page.request.put(url, { headers, data: { name: 'Hijacked' } })
    const remove = await page.request.delete(url, { headers })

    assert.deepEqual([rename.status(), remove.status()], [404, 404])
  })

  test('emails the owner once when a passkey is removed twice in parallel', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const user = await UserFactory.apply('verified').create()
    const passkey = await createPasskey(user, 'Work laptop')
    await browserContext.loginAs(user)

    using mailFake = mail.fake()

    const page = await visit(route('account.security.show'))

    const cookies = await browserContext.cookies()
    const xsrfToken = decodeURIComponent(cookies.find((c) => c.name === 'XSRF-TOKEN')!.value)
    const headers = { 'X-XSRF-TOKEN': xsrfToken }

    /**
     * A double click, sent as two parallel requests. Redirects are not
     * followed, so the statuses show which request removed the row.
     */
    const url = urlFor('passkeys.destroy', { id: String(passkey.identifier) })
    const responses = await Promise.all([
      page.request.delete(url, { headers, maxRedirects: 0 }),
      page.request.delete(url, { headers, maxRedirects: 0 }),
    ])

    assert.sameMembers(
      responses.map((response) => response.status()),
      [302, 404]
    )
    assert.lengthOf(mailFake.mails.queued(), 1)
  })
})
