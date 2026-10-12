import env from '#start/env'
import User from '#models/account/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import { addVirtualAuthenticator, recordPasskeySignals } from '#tests/helpers/passkeys'

const rpId = env.get('PASSKEY_RP_ID')

test.group('Passkey Login', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('can sign in with a passkey', async ({ visit, route }) => {
    const user = await UserFactory.apply('verified').create()
    const page = await visit(route('session.create'))
    const authenticator = await addVirtualAuthenticator(page)
    await authenticator.addPasskey(user)

    await page.getByRole('button', { name: 'Sign in with a passkey', exact: true }).click()
    await page.assertPath(route('account.show'))
  })

  test('writes the last_login_method cookie', async ({ visit, route, browserContext, assert }) => {
    const user = await UserFactory.apply('verified').create()
    const page = await visit(route('session.create'))
    const authenticator = await addVirtualAuthenticator(page)
    await authenticator.addPasskey(user)

    await page.getByRole('button', { name: 'Sign in with a passkey', exact: true }).click()
    await page.assertPath(route('account.show'))

    const lastLoginMethod = await browserContext.getPlainCookie('last_login_method')
    assert.equal(lastLoginMethod, 'passkey')
  })

  test('re-syncs the passkey provider after signing in with a passkey', async ({
    visit,
    route,
    assert,
  }) => {
    const user = await UserFactory.apply('verified').create()
    const page = await visit(route('session.create'))
    const authenticator = await addVirtualAuthenticator(page)
    const passkey = await authenticator.addPasskey(user)
    const signals = await recordPasskeySignals(page)

    await page.getByRole('button', { name: 'Sign in with a passkey', exact: true }).click()
    await page.assertPath(route('account.show'))

    assert.deepEqual(await signals.waitFor(2), [
      {
        name: 'signalAllAcceptedCredentials',
        options: {
          rpId,
          userId: user.webauthnUserHandle,
          allAcceptedCredentialIds: [passkey.credentialId],
        },
      },
      {
        name: 'signalCurrentUserDetails',
        options: {
          rpId,
          userId: user.webauthnUserHandle,
          name: user.email,
          displayName: user.fullName,
        },
      },
    ])
  })

  test('re-syncs the passkey provider after signing in with a password', async ({
    visit,
    route,
    assert,
  }) => {
    const user = await UserFactory.apply('verified').create()
    const page = await visit(route('session.create'))
    const authenticator = await addVirtualAuthenticator(page)
    const passkey = await authenticator.addPasskey(user)
    const signals = await recordPasskeySignals(page)

    await page.getByLabel('Email', { exact: true }).fill(user.email)
    await page.getByLabel('Password', { exact: true }).fill('demo-password')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.assertPath(route('account.show'))

    const [allAccepted] = await signals.waitFor(2)
    assert.equal(allAccepted.name, 'signalAllAcceptedCredentials')
    assert.deepEqual(allAccepted.options.allAcceptedCredentialIds, [passkey.credentialId])
  })

  test('refuses a passkey that was removed on the server', async ({ visit, route, assert }) => {
    const user = await UserFactory.apply('verified').create()
    const page = await visit(route('session.create'))
    const authenticator = await addVirtualAuthenticator(page)
    const passkey = await authenticator.addPasskey(user)
    await User.passkeys.delete(user, passkey.identifier)
    const signals = await recordPasskeySignals(page)

    await page.getByRole('button', { name: 'Sign in with a passkey', exact: true }).click()
    await page.assertVisible(
      page.getByText('Unable to verify the passkey. Please try again', { exact: true })
    )
    await page.assertPath(route('session.create'))

    /**
     * Lets the passkey provider remove the passkey from the device
     */
    assert.deepEqual(await signals.waitFor(1), [
      {
        name: 'signalUnknownCredential',
        options: { rpId, credentialId: passkey.credentialId },
      },
    ])
  })

  test('throttles sign-in challenge requests per IP', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const page = await visit(route('session.create'))

    const cookies = await browserContext.cookies()
    const xsrfToken = decodeURIComponent(cookies.find((c) => c.name === 'XSRF-TOKEN')!.value)
    const headers = { 'X-XSRF-TOKEN': xsrfToken }

    const statuses: number[] = []
    for (let attempt = 0; attempt < 11; attempt++) {
      const response = await page.request.post('/login/passkey/challenge', { headers })
      statuses.push(response.status())
    }

    assert.deepEqual(statuses, [...Array(10).fill(200), 429])
  })
})
